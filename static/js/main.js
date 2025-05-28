document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const controlButton = document.getElementById('controlButton');
    const statusElement = document.getElementById('status');
    const conversationElement = document.getElementById('conversation');

    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let audioBlob = null;
    let audioUrl = '';
    let audio = new Audio();
    let isPlaying = false;
    let currentState = 'idle'; // 'idle', 'recording', 'playing', 'paused'

    // Check if browser supports mediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        statusElement.textContent = 'Audio recording is not supported in your browser.';
        controlButton.disabled = true;
        return;
    }

    // Initialize media recorder
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                audioUrl = URL.createObjectURL(audioBlob);

                // Update UI to show processing state
                updateButtonState('processing');
                statusElement.textContent = 'Processing your request...';

                try {
                    // Send the audio to the server for processing
                    await processAudio();
                    // After processing, switch to play state
                    updateButtonState('play');
                } catch (error) {
                    console.error('Error processing audio:', error);
                    statusElement.textContent = 'Error processing your request. Please try again.';
                    updateButtonState('idle');
                }
            };

            // Set up audio element events
            audio.onplay = () => {
                updateButtonState('playing');
            };

            audio.onpause = () => {
                if (currentState !== 'paused') {
                    updateButtonState('paused');
                }
            };

            audio.onended = () => {
                updateButtonState('idle');
                statusElement.textContent = 'Tap the button to speak again';
            };

            // Set up audio element events for the response audio
            const responseAudio = document.getElementById('responseAudio');
            
            responseAudio.onplay = () => {
                updateButtonState('playing');
                statusElement.textContent = 'Playing...';
            };

            responseAudio.onpause = () => {
                // Only update to paused state if we're not in the middle of another state change
                if (currentState === 'playing') {
                    updateButtonState('paused');
                    statusElement.textContent = 'Paused';
                }
            };

            responseAudio.onended = () => {
                updateButtonState('idle');
                statusElement.textContent = 'Tap the button to speak again';
            };
            
            // Keep the global audio variable for any other audio needs
            audio = responseAudio;

            controlButton.addEventListener('click', handleControlButtonClick);
        })
        .catch(err => {
            console.error('Error accessing microphone:', err);
            statusElement.textContent = 'Error accessing microphone. Please check permissions.';
            controlButton.disabled = true;
        });

    function handleControlButtonClick() {
        switch (currentState) {
            case 'idle':
                startRecording();
                break;
            case 'recording':
                stopRecording();
                break;
            case 'playing':
                pauseAudio();
                break;
            case 'paused':
                resumeAudio();
                break;
            case 'play':
                playAudio();
                break;
            case 'processing':
                // Do nothing
                break;
        }
    }

    function startRecording() {
        audioChunks = [];
        mediaRecorder.start();
        isRecording = true;
        updateButtonState('recording');
        statusElement.textContent = 'Listening...';
    }

    function stopRecording() {
        if (!isRecording) return;

        mediaRecorder.stop();
        isRecording = false;
        updateButtonState('idle');
        statusElement.textContent = 'Processing...';
    }

    function pauseAudio() {
        const responseAudio = document.getElementById('responseAudio');
        if (!responseAudio.paused) {
            responseAudio.pause();
            updateButtonState('paused');
            statusElement.textContent = 'Paused';
        }
    }

    function resumeAudio() {
        const responseAudio = document.getElementById('responseAudio');
        responseAudio.play().then(() => {
            updateButtonState('playing');
            statusElement.textContent = 'Playing...';
        });
    }

    function playAudio() {
        const responseAudio = document.getElementById('responseAudio');
        responseAudio.play().then(() => {
            updateButtonState('playing');
            statusElement.textContent = 'Playing...';
        }).catch(e => {
            console.error('Playback failed:', e);
            statusElement.textContent = 'Playback failed. Tap to try again.';
            updateButtonState('play');
        });
    }

    function updateButtonState(state) {
        currentState = state;
        const buttonText = controlButton.querySelector('.button-text');
        const micIcon = controlButton.querySelector('.mic-icon');
        
        // Reset all classes first
        controlButton.className = 'control-button';
        controlButton.classList.add(state);
        
        // Update button content based on state
        switch (state) {
            case 'idle':
                buttonText.textContent = 'Tap to Speak';
                micIcon.innerHTML = `
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" x2="12" y1="19" y2="22"></line>
                `;
                break;
                
            case 'recording':
                buttonText.textContent = 'Listening...';
                micIcon.innerHTML = `
                    <circle cx="12" cy="12" r="3"></circle>
                    <circle cx="12" cy="12" r="10" style="fill:none"></circle>
                `;
                break;
                
            case 'playing':
                buttonText.textContent = 'Now Playing';
                micIcon.innerHTML = `
                    <path d="M5 4v7h6V4H5z"></path>
                    <path d="M19 4v7h-6V4h6z"></path>
                `;
                break;
                
            case 'paused':
                buttonText.textContent = 'Paused';
                micIcon.innerHTML = `
                    <path d="M5 4h6v7H5V4z"></path>
                    <path d="M19 4h-6v7h6V4z"></path>
                `;
                break;
                
            case 'play':
                buttonText.textContent = 'Play Response';
                micIcon.innerHTML = `
                    <path d="M5 4v7h6V4H5z"></path>
                    <path d="M19 4v7h-6V4h6z"></path>
                `;
                break;
                
            case 'processing':
                buttonText.textContent = 'Processing...';
                micIcon.innerHTML = `
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                `;
                break;
        }
    }

    async function processAudio() {
        try {
            // First, transcribe the audio
            const audioFormData = new FormData();
            audioFormData.append('audio', audioBlob, 'recording.webm');
            
            const transcribeResponse = await fetch('/transcribe_audio', {
                method: 'POST',
                body: audioFormData
            });

            if (!transcribeResponse.ok) {
                throw new Error('Failed to transcribe audio');
            }
            
            const transcribeData = await transcribeResponse.json();
            
            if (!transcribeData.success) {
                throw new Error(transcribeData.error || 'Transcription failed');
            }
            
            const userMessage = transcribeData.text;
            addMessage('user', userMessage);
            
            // Update UI with initial assistant message (shows loading state)
            const assistantMessage = addMessage('assistant', '...');
            
            // Process the response as a stream
            const processResponse = await fetch('/process_audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: userMessage })
            });

            if (!processResponse.ok) {
                throw new Error('Failed to process message');
            }
            
            const processData = await processResponse.json();
            
            if (processData.error) {
                throw new Error(processData.error);
            }
            
            // Update the assistant's message with the full response
            updateMessage(assistantMessage, processData.text);
            
            if (processData.audio_url) {
                // Set up the audio response
                const responseAudio = document.getElementById('responseAudio');
                responseAudio.src = processData.audio_url;
                
                // Auto-play the response
                responseAudio.play().catch(e => {
                    console.error('Auto-play failed:', e);
                    // If autoplay fails, show a play button
                    updateButtonState('play');
                });
                
                // When audio ends, reset the button state
                responseAudio.onended = () => {
                    updateButtonState('idle');
                };
            }
            
            statusElement.textContent = 'Ready';
            
        } catch (error) {
            console.error('Error:', error);
            statusElement.textContent = 'Error: ' + (error.message || 'Something went wrong');
            updateButtonState('idle');
        }
    }
    
    function addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = text;
        
        messageDiv.appendChild(contentDiv);
        conversationElement.appendChild(messageDiv);
        
        // Scroll to bottom
        conversationElement.scrollTop = conversationElement.scrollHeight;
        
        return messageDiv; // Return the message element so it can be updated later
    }
    
    function updateMessage(messageElement, newText) {
        const contentDiv = messageElement.querySelector('.message-content');
        if (contentDiv) {
            contentDiv.textContent = newText;
            conversationElement.scrollTop = conversationElement.scrollHeight;
        }
    }
    
});
