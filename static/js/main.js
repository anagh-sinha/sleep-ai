// Global variables
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let audioBlob = null;
let audioUrl = '';
let audio = new Audio();
let isPlaying = false;
let currentState = 'idle'; // 'idle', 'recording', 'playing', 'paused'
let sessionId = null;
let conversationHistory = [];

// DOM elements
let controlButton, statusElement, conversationElement, micPermissionGranted = false;

// Initialize audio context for better iOS compatibility
const initializeAudioContext = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
        const audioContext = new AudioContext();
        // Create empty buffer and play it to unlock audio on iOS
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
        // Resume the audio context in case it was suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
};

// Initialize microphone access
const initializeMicrophone = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in your browser.');
    }

    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // iOS requires specific MIME types and constraints
    const mimeType = isIOS ? 'audio/mp4' : 
        (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 
            'audio/webm;codecs=opus' : 'audio/webm');
    
    // Prepare constraints based on platform
    const constraints = {
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000,
            // iOS specific constraints
            ...(isIOS && {
                mandatory: {
                    googEchoCancellation: 'false',
                    googAutoGainControl: 'false',
                    googNoiseSuppression: 'false',
                    googHighpassFilter: 'false'
                },
                optional: []
            })
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Successfully got media stream');
        return { stream, mimeType };
    } catch (error) {
        console.error('Error accessing microphone:', error);
        throw error;
    }
};

// Set up media recorder with the provided stream
function setupMediaRecorder(stream, mimeType) {
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    
    mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
            audioChunks.push(e.data);
        }
    };

    mediaRecorder.onstop = async () => {
        // Use the same MIME type that was used for recording
        const recordedMimeType = mediaRecorder.mimeType || 'audio/webm';
        audioBlob = new Blob(audioChunks, { type: recordedMimeType });
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
}

// Handle microphone errors
function handleMicrophoneError(error) {
    console.error('Microphone error:', error);
    let errorMessage = 'Error accessing microphone';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone access was denied. Please allow microphone access in your browser settings.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No microphone found. Please check your device settings.';
    } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is already in use by another application.';
    } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'The requested microphone configuration is not supported.';
    } else if (error.name === 'SecurityError') {
        errorMessage = 'Microphone access is not allowed in this context. Please use HTTPS.';
    }
    
    statusElement.textContent = errorMessage;
    updateButtonState('error');
    
    // Show a more prominent error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = errorMessage;
    errorDiv.style.cssText = 'color: #ff4444; margin-top: 10px; padding: 10px; border: 1px solid #ff4444; border-radius: 4px; background-color: #ffeeee;';
    
    // Insert after the record button
    const buttonContainer = document.querySelector('.button-container');
    if (buttonContainer) {
        buttonContainer.appendChild(errorDiv);
        
        // Remove error message after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 10000);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DOM elements
    controlButton = document.getElementById('controlButton');
    statusElement = document.getElementById('status');
    conversationElement = document.getElementById('conversation');
    
    // Initialize session
    initializeSession();

    // Initialize audio context on user interaction
    document.body.addEventListener('touchstart', initializeAudioContext, { once: true });
    document.body.addEventListener('touchend', initializeAudioContext, { once: true });
    
    // Show loading state
    statusElement.textContent = 'Initializing microphone...';
    controlButton.disabled = true;

    try {
        // Initialize microphone
        const { stream, mimeType } = await initializeMicrophone();
        micPermissionGranted = true;
        
        // Set up media recorder
        setupMediaRecorder(stream, mimeType);
        
        // Enable the control button
        controlButton.disabled = false;
        statusElement.textContent = 'Tap the button to start speaking';
    } catch (error) {
        handleMicrophoneError(error);
    }

    // Set up audio element
    const responseAudio = document.getElementById('responseAudio');
    
    // Set up audio element events for the response audio
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

    // Add click event listener for the control button
    controlButton.addEventListener('click', handleControlButtonClick);
});

// Add event listeners for keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Space bar to toggle recording/playback
    if (e.code === 'Space' && !e.target.matches('input, textarea, button, select')) {
        e.preventDefault();
        handleControlButtonClick();
    }
});

// Initialize or retrieve user session
async function initializeSession() {
    try {
        // Try to get session ID from local storage or URL
        const urlParams = new URLSearchParams(window.location.search);
        sessionId = urlParams.get('session_id') || localStorage.getItem('sleep_ai_session_id');
        
        // If no session ID exists, we'll get one from the server on first interaction
        if (!sessionId) {
            console.log('No existing session found. A new one will be created on first interaction.');
        } else {
            console.log('Resuming session:', sessionId);
            // Load any existing conversation history from the server if needed
            // await loadConversationHistory();
        }
    } catch (error) {
        console.error('Error initializing session:', error);
    }
}

// Update the session ID and save it
function updateSession(newSessionId) {
    if (newSessionId && newSessionId !== sessionId) {
        sessionId = newSessionId;
        localStorage.setItem('sleep_ai_session_id', sessionId);
        
        // Update URL without page reload
        const url = new URL(window.location);
        url.searchParams.set('session_id', sessionId);
        window.history.replaceState({}, '', url);
        
        console.log('Updated session ID:', sessionId);
    }
}

// Handle control button click
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
            // Do nothing while processing
            break;
    }
}

// Start audio recording
function startRecording() {
    audioChunks = [];
    mediaRecorder.start();
    isRecording = true;
    updateButtonState('recording');
    statusElement.textContent = 'Listening...';
}

// Stop audio recording
function stopRecording() {
    if (!isRecording) return;

    mediaRecorder.stop();
    isRecording = false;
    updateButtonState('processing');
    statusElement.textContent = 'Processing...';
}

// Pause audio playback
function pauseAudio() {
    const responseAudio = document.getElementById('responseAudio');
    if (!responseAudio.paused) {
        responseAudio.pause();
        updateButtonState('paused');
        statusElement.textContent = 'Paused';
    }
}

// Resume audio playback
function resumeAudio() {
    const responseAudio = document.getElementById('responseAudio');
    responseAudio.play().then(() => {
        updateButtonState('playing');
        statusElement.textContent = 'Playing...';
    }).catch(e => {
        console.error('Error resuming audio:', e);
        updateButtonState('play');
    });
}

// Play audio response
function playAudio() {
    const responseAudio = document.getElementById('responseAudio');
    if (!responseAudio.src) {
        console.error('No audio source to play');
        return;
    }
    
    responseAudio.play().then(() => {
        updateButtonState('playing');
        statusElement.textContent = 'Playing...';
    }).catch(e => {
        console.error('Playback failed:', e);
        statusElement.textContent = 'Playback failed. Tap to try again.';
        updateButtonState('play');
    });
}

// Update button UI based on current state
function updateButtonState(state) {
    currentState = state;
    const buttonText = controlButton.querySelector('.button-text');
    const micIcon = controlButton.querySelector('.mic-icon');
    
    if (!buttonText || !micIcon) {
        console.error('Button elements not found');
        return;
    }
    
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

// Process audio recording
async function processAudio() {
    if (!audioBlob) {
        console.error('No audio data to process');
        statusElement.textContent = 'Error: No audio recorded';
        updateButtonState('idle');
        return;
    }
    
    const formData = new FormData();
    // Use the correct MIME type and file extension
    const fileExt = audioBlob.type.includes('webm') ? '.webm' : 
                   audioBlob.type.includes('wav') ? '.wav' : '.webm';
    const fileName = `recording_${Date.now()}${fileExt}`;
    
    formData.append('audio', audioBlob, fileName);
    if (sessionId) {
        formData.append('session_id', sessionId);
    }
    
    // Debug logging
    console.log('Audio Blob Info:', {
        size: audioBlob.size,
        type: audioBlob.type,
        fileName: fileName
    });
    
    // Log form data keys (won't show file contents)
    for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + (pair[1] instanceof Blob ? 
            `[Blob, size=${pair[1].size}, type=${pair[1].type}]` : pair[1]));
    }

    try {
        // Show processing state
        updateButtonState('processing');
        statusElement.textContent = 'Processing your message...';
        
        // First, transcribe the audio
        const response = await fetch('/transcribe_audio', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'  // Ensure we expect JSON back
            }
        });

        // Clone the response to read it multiple times if needed
        const responseClone = response.clone();
        let data;
        
        try {
            const responseData = await response.json();
            
            if (!response.ok) {
                console.error('Server error details:', responseData);
                throw new Error(responseData.error || `Failed to transcribe audio (${response.status})`);
            }
            
            // If we get here, the response was successful
            data = responseData;
            
            // Update session if we got a new one
            if (data.session_id) {
                updateSession(data.session_id);
            }

            // Add user message to conversation
            addMessage('user', data.text);
            
            // Process the message with the backend
            const processResponse = await fetch('/process_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: data.text,
                    session_id: sessionId,
                    generate_audio: true
                })
            });

            if (!processResponse.ok) {
                throw new Error('Error processing message');
            }

            const processData = await processResponse.json();
            
            // Update session again in case it changed during processing
            if (processData.session_id) {
                updateSession(processData.session_id);
            }

            // Add assistant's response to conversation
            addMessage('assistant', processData.text);

            // Play the audio response if available
            if (processData.audio_url) {
                const responseAudio = document.getElementById('responseAudio');
                responseAudio.src = processData.audio_url;
                responseAudio.play().catch(e => {
                    console.error('Error playing audio:', e);
                    updateButtonState('play');
                });
            } else {
                updateButtonState('idle');
            }
            
            // Update status
            statusElement.textContent = 'Tap to speak again';
            
        } catch (error) {
            console.error('Error processing response:', error);
            // If we have a clone of the response, try to use it for error details
            if (responseClone) {
                try {
                    const errorData = await responseClone.json();
                    console.error('Response error details:', errorData);
                } catch (e) {
                    console.error('Could not parse error response:', e);
                }
            }
            throw error; // Re-throw to be caught by the outer catch
        }
        
    } catch (error) {
        console.error('Error:', error);
        statusElement.textContent = 'Error: ' + (error.message || 'Failed to process your request');
        updateButtonState('idle');
        
        // Add error message to conversation
        addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    }
}

// Add a message to the conversation
function addMessage(sender, text) {
    if (!conversationElement) {
        console.error('Conversation element not found');
        return null;
    }
    
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

// Update an existing message
function updateMessage(messageElement, newText) {
    if (!messageElement) return;
    
    const contentDiv = messageElement.querySelector('.message-content');
    if (contentDiv) {
        contentDiv.textContent = newText;
        if (conversationElement) {
            conversationElement.scrollTop = conversationElement.scrollHeight;
        }
    }
}
