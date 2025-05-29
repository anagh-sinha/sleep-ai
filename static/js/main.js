// ========================================
// Core Sleep Assistant - Fixed & Tested
// ========================================

// Global Variables
let mediaRecorder = null;
let audioChunks = [];
let currentState = 'idle';
let sessionId = null;
let micStream = null;
let micPermissionGranted = false;

// DOM Elements
const elements = {};

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌙 Somni Sleep Assistant starting...');
    
    try {
        bindElements();
        setupEventListeners();
        initializeSession();
        await initializeMicrophone();
        console.log('✅ Somni ready!');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showError('Failed to initialize app');
    }
});

function bindElements() {
    elements.voiceButton = document.getElementById('voiceButton');
    elements.statusText = document.getElementById('statusText');
    elements.statusIndicator = document.getElementById('statusIndicator');
    elements.micIcon = document.getElementById('micIcon');
    elements.btnText = document.getElementById('btnText');
    elements.aiAvatar = document.getElementById('aiAvatar');
    elements.conversation = document.getElementById('conversation');
    elements.responseAudio = document.getElementById('responseAudio');
    elements.meditationBtn = document.getElementById('meditationBtn');
    elements.storyBtn = document.getElementById('storyBtn');
    elements.breathingBtn = document.getElementById('breathingBtn');
    
    console.log('📌 DOM elements bound');
}

function setupEventListeners() {
    // Voice button
    if (elements.voiceButton) {
        elements.voiceButton.addEventListener('click', handleVoiceButtonClick);
    }
    
    // Quick action buttons
    if (elements.meditationBtn) {
        elements.meditationBtn.addEventListener('click', () => sendQuickMessage('meditation'));
    }
    if (elements.storyBtn) {
        elements.storyBtn.addEventListener('click', () => sendQuickMessage('story'));
    }
    if (elements.breathingBtn) {
        elements.breathingBtn.addEventListener('click', () => sendQuickMessage('breathing'));
    }
    
    // Audio events
    if (elements.responseAudio) {
        elements.responseAudio.addEventListener('play', () => {
            setState('playing');
            updateStatus('Playing response...', 'playing');
            setAvatarState('speaking');
        });
        
        elements.responseAudio.addEventListener('ended', () => {
            setState('idle');
            updateStatus('Ready to help you relax', 'idle');
            setAvatarState('idle');
        });
        
        elements.responseAudio.addEventListener('error', (e) => {
            console.error('Audio playback error:', e);
            setState('idle');
            updateStatus('Audio playback failed', 'idle');
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.target.matches('input, textarea, button')) {
            e.preventDefault();
            handleVoiceButtonClick();
        }
    });
    
    console.log('🎧 Event listeners setup complete');
}

// ========================================
// Microphone & Recording
// ========================================
async function initializeMicrophone() {
    updateStatus('Requesting microphone access...', 'processing');
    if (elements.voiceButton) {
        elements.voiceButton.disabled = true;
    }
    
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Microphone access not supported in this browser');
        }
        
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 16000
            }
        });
        
        setupMediaRecorder();
        micPermissionGranted = true;
        
        updateStatus('Ready to help you relax', 'idle');
        if (elements.voiceButton) {
            elements.voiceButton.disabled = false;
        }
        
        console.log('🎤 Microphone access granted');
        
    } catch (error) {
        handleMicrophoneError(error);
    }
}

function setupMediaRecorder() {
    if (!micStream) return;
    
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/wav';
        }
    }
    
    console.log('🎵 Using MIME type:', mimeType);
    
    try {
        mediaRecorder = new MediaRecorder(micStream, { mimeType });
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            await processRecording();
        };
        
        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            showError('Recording error occurred');
            setState('idle');
        };
        
        console.log('📼 MediaRecorder setup complete');
        
    } catch (error) {
        console.error('MediaRecorder setup failed:', error);
        showError('Recording setup failed');
    }
}

function handleMicrophoneError(error) {
    console.error('🚫 Microphone error:', error);
    
    let errorMessage = 'Microphone access failed';
    
    switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
            errorMessage = 'Please allow microphone access to use voice features';
            break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
            errorMessage = 'No microphone found. Please check your device';
            break;
        case 'NotReadableError':
            errorMessage = 'Microphone is being used by another application';
            break;
        case 'SecurityError':
            errorMessage = 'Microphone access requires HTTPS connection';
            break;
    }
    
    updateStatus(errorMessage, 'error');
    if (elements.voiceButton) {
        elements.voiceButton.disabled = true;
    }
    showError(errorMessage);
}

// ========================================
// Voice Control Logic
// ========================================
function handleVoiceButtonClick() {
    console.log('🎯 Voice button clicked, current state:', currentState);
    
    if (!micPermissionGranted) {
        showError('Microphone access required');
        return;
    }
    
    switch (currentState) {
        case 'idle':
            startRecording();
            break;
        case 'recording':
            stopRecording();
            break;
        case 'playing':
            if (elements.responseAudio) {
                elements.responseAudio.pause();
            }
            break;
        case 'processing':
            // Do nothing while processing
            break;
    }
}

function startRecording() {
    if (!mediaRecorder || mediaRecorder.state !== 'inactive') {
        console.error('MediaRecorder not ready');
        return;
    }
    
    try {
        audioChunks = [];
        mediaRecorder.start();
        
        setState('recording');
        updateStatus('Listening... Speak now', 'recording');
        setAvatarState('listening');
        
        console.log('🎤 Recording started');
        
    } catch (error) {
        console.error('Failed to start recording:', error);
        showError('Failed to start recording');
    }
}

function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') {
        console.error('MediaRecorder not recording');
        return;
    }
    
    try {
        mediaRecorder.stop();
        
        setState('processing');
        updateStatus('Processing your message...', 'processing');
        setAvatarState('thinking');
        
        console.log('⏹️ Recording stopped');
        
    } catch (error) {
        console.error('Failed to stop recording:', error);
        showError('Failed to stop recording');
    }
}

async function processRecording() {
    console.log('🔄 Processing recording...');
    
    if (audioChunks.length === 0) {
        showError('No audio recorded');
        setState('idle');
        return;
    }
    
    const mimeType = mediaRecorder.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunks, { type: mimeType });
    
    console.log('📦 Audio blob created:', {
        size: audioBlob.size,
        type: audioBlob.type
    });
    
    const formData = new FormData();
    const fileName = 'recording_' + Date.now() + '.webm';
    formData.append('audio', audioBlob, fileName);
    
    if (sessionId) {
        formData.append('session_id', sessionId);
    }
    
    try {
        console.log('📝 Transcribing audio...');
        const transcriptionResponse = await fetch('/transcribe_audio', {
            method: 'POST',
            body: formData
        });
        
        const transcriptionData = await transcriptionResponse.json();
        console.log('📝 Transcription response:', transcriptionData);
        
        if (!transcriptionResponse.ok) {
            throw new Error(transcriptionData.error || 'Transcription failed');
        }
        
        if (transcriptionData.session_id) {
            updateSession(transcriptionData.session_id);
        }
        
        addMessage('user', transcriptionData.text);
        
        console.log('🤖 Processing with AI...');
        const processResponse = await fetch('/process_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: transcriptionData.text,
                session_id: sessionId,
                generate_audio: true
            })
        });
        
        const processData = await processResponse.json();
        console.log('🤖 AI response:', processData);
        
        if (!processResponse.ok) {
            throw new Error(processData.error || 'AI processing failed');
        }
        
        if (processData.session_id) {
            updateSession(processData.session_id);
        }
        
        addMessage('assistant', processData.text);
        
        if (processData.audio_url && elements.responseAudio) {
            console.log('🔊 Playing audio response...');
            elements.responseAudio.src = processData.audio_url;
            try {
                await elements.responseAudio.play();
            } catch (playError) {
                console.error('Audio play error:', playError);
                setState('idle');
                updateStatus('Ready to help you relax', 'idle');
                setAvatarState('idle');
            }
        } else {
            setState('idle');
            updateStatus('Ready to help you relax', 'idle');
            setAvatarState('idle');
        }
        
    } catch (error) {
        console.error('❌ Processing error:', error);
        showError('Error: ' + error.message);
        addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
        setState('idle');
        setAvatarState('idle');
    }
}

// ========================================
// Quick Actions
// ========================================
async function sendQuickMessage(action) {
    const messages = {
        meditation: 'Please guide me through a short meditation session.',
        story: 'Can you tell me a relaxing bedtime story?',
        breathing: 'Let us do some breathing exercises together.'
    };
    
    const message = messages[action];
    if (!message) return;
    
    console.log('⚡ Quick action:', action);
    
    setState('processing');
    updateStatus('Processing your request...', 'processing');
    setAvatarState('thinking');
    
    addMessage('user', message);
    
    try {
        const response = await fetch('/process_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                session_id: sessionId,
                generate_audio: true
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }
        
        if (data.session_id) {
            updateSession(data.session_id);
        }
        
        addMessage('assistant', data.text);
        
        if (data.audio_url && elements.responseAudio) {
            elements.responseAudio.src = data.audio_url;
            try {
                await elements.responseAudio.play();
            } catch (playError) {
                console.error('Audio play error:', playError);
                setState('idle');
                updateStatus('Ready to help you relax', 'idle');
                setAvatarState('idle');
            }
        } else {
            setState('idle');
            updateStatus('Ready to help you relax', 'idle');
            setAvatarState('idle');
        }
        
    } catch (error) {
        console.error('Quick action error:', error);
        showError('Error: ' + error.message);
        setState('idle');
        setAvatarState('idle');
    }
}

// ========================================
// UI State Management
// ========================================
function setState(newState) {
    currentState = newState;
    updateVoiceButton();
    console.log('🔄 State changed to:', newState);
}

function updateVoiceButton() {
    if (!elements.voiceButton || !elements.micIcon || !elements.btnText) return;
    
    elements.voiceButton.className = 'voice-btn';
    elements.voiceButton.classList.add(currentState);
    
    switch (currentState) {
        case 'idle':
            elements.micIcon.textContent = '🎤';
            elements.btnText.textContent = 'Tap to Speak';
            break;
            
        case 'recording':
            elements.micIcon.textContent = '⏸️';
            elements.btnText.textContent = 'Stop Recording';
            break;
            
        case 'processing':
            elements.micIcon.textContent = '⏳';
            elements.btnText.textContent = 'Processing...';
            break;
            
        case 'playing':
            elements.micIcon.textContent = '⏸️';
            elements.btnText.textContent = 'Pause';
            break;
    }
}

function updateStatus(message, type) {
    if (elements.statusText) {
        elements.statusText.textContent = message;
    }
    
    if (elements.statusIndicator) {
        elements.statusIndicator.className = 'status-indicator';
        if (type) {
            elements.statusIndicator.classList.add(type);
        }
    }
    
    console.log('📊 Status:', message, '(' + type + ')');
}

function setAvatarState(state) {
    if (!elements.aiAvatar) return;
    
    elements.aiAvatar.classList.remove('listening', 'thinking', 'speaking', 'idle');
    elements.aiAvatar.classList.add(state);
    
    console.log('👤 Avatar state:', state);
}

// ========================================
// Conversation Management
// ========================================
function addMessage(sender, text) {
    if (!elements.conversation) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + sender;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    avatarDiv.textContent = sender === 'user' ? '👤' : '🌙';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'text';
    textDiv.textContent = text;
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(textDiv);
    
    elements.conversation.appendChild(messageDiv);
    
    elements.conversation.scrollTop = elements.conversation.scrollHeight;
    
    console.log('💬 Message added (' + sender + '):', text.substring(0, 50) + '...');
}

// ========================================
// Session Management
// ========================================
function initializeSession() {
    const urlParams = new URLSearchParams(window.location.search);
    sessionId = urlParams.get('session_id') || localStorage.getItem('sleep_ai_session_id');
    
    if (sessionId) {
        console.log('📝 Resuming session:', sessionId);
    } else {
        console.log('📝 New session will be created');
    }
}

function updateSession(newSessionId) {
    if (newSessionId && newSessionId !== sessionId) {
        sessionId = newSessionId;
        localStorage.setItem('sleep_ai_session_id', sessionId);
        
        const url = new URL(window.location);
        url.searchParams.set('session_id', sessionId);
        window.history.replaceState({}, '', url);
        
        console.log('📝 Session updated:', sessionId);
    }
}

// ========================================
// Error Handling & Notifications
// ========================================
function showError(message) {
    console.error('❌ Error:', message);
    
    const notification = document.createElement('div');
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 1rem 1.5rem; border-radius: 12px; font-size: 14px; font-weight: 500; z-index: 1000; max-width: 300px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2); transform: translateX(100%); transition: transform 0.3s ease;';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 4000);
}

// ========================================
// Cleanup
// ========================================
window.addEventListener('beforeunload', () => {
    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
    }
    if (elements.responseAudio) {
        elements.responseAudio.pause();
    }
    console.log('🧹 Cleanup completed');
});

// Export for debugging
window.sleepAssistant = {
    currentState: currentState,
    sessionId: sessionId,
    micPermissionGranted: micPermissionGranted,
    handleVoiceButtonClick: handleVoiceButtonClick,
    sendQuickMessage: sendQuickMessage,
    elements: elements
};