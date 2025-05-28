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
        audio.pause();
        updateButtonState('paused');
    }

    function resumeAudio() {
        audio.play();
        updateButtonState('playing');
    }

    function playAudio() {
        audio.play();
        updateButtonState('playing');
    }

    function updateButtonState(state) {
        currentState = state;
        switch (state) {
            case 'idle':
                controlButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mic-icon">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" x2="12" y1="19" y2="22"></line>
                    </svg>
                `;
                break;
            case 'recording':
                controlButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mic-icon">
                        <circle cx="12" cy="12" r="3"></circle>
                        <circle cx="12" cy="12" r="10" style="fill:none"></circle>
                    </svg>
                `;
                break;
            case 'playing':
                controlButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mic-icon">
                        <path d="M5 4v7h6V4H5z"></path>
                        <path d="M19 4v7h-6V4h6z"></path>
                    </svg>
                `;
                break;
            case 'paused':
                controlButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mic-icon">
                        <path d="M5 4h6v7H5V4z"></path>
                        <path d="M19 4h-6v7h6V4z"></path>
                    </svg>
                `;
                break;
            case 'play':
                controlButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mic-icon">
                        <path d="M5 4v7h6V4H5z"></path>
                        <path d="M19 4v7h-6V4h6z"></path>
                    </svg>
                `;
                break;
            case 'processing':
                controlButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mic-icon">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" x2="12" y1="12" y2="12"></line>
                    </svg>
                `;
                break;
        }
    }

    async function processAudio() {
        try {
            // Create FormData and append the audio blob
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');

            // Send the audio to the server for processing
            const response = await fetch('/process_audio', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Update UI with assistant's response
            addMessage('assistant', data.text);
            
            // Set up the audio response
            responseAudio.src = data.audio_url;
            playButton.disabled = false;
            
            // Auto-play the response
            responseAudio.play();
            
            statusElement.textContent = 'Ready';
            
        } catch (error) {
            console.error('Error:', error);
            statusElement.textContent = 'Error: ' + (error.message || 'Something went wrong');
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
    }
    
    // Initialize the media recorder when the page loads
    initMediaRecorder();
});
