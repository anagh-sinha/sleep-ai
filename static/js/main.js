// Enhanced Sleep AI - Mobile Optimized JavaScript

// Utility Functions
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);

// Prevent iOS bounce
if (isIOS) {
    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('.conversation-container')) return;
        e.preventDefault();
    }, { passive: false });
}

// Enhanced Starfield Animation
class Starfield {
    constructor() {
        this.container = document.getElementById('starfield');
        this.stars = [];
        this.init();
    }
    
    init() {
        const starCount = isMobile ? 100 : 150;
        
        for (let i = 0; i < starCount; i++) {
            const star = this.createStar();
            this.container.appendChild(star);
            this.stars.push(star);
        }
        
        // Shooting stars with reduced frequency on mobile
        const shootingStarInterval = isMobile ? 5000 : 3000;
        setInterval(() => {
            if (Math.random() > 0.7) {
                this.createShootingStar();
            }
        }, shootingStarInterval);
    }
    
    createStar() {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.width = Math.random() * 3 + 1 + 'px';
        star.style.height = star.style.width;
        star.style.setProperty('--duration', Math.random() * 3 + 2 + 's');
        star.style.setProperty('--glow-size', Math.random() * 10 + 5 + 'px');
        star.style.animationDelay = Math.random() * 5 + 's';
        return star;
    }
    
    createShootingStar() {
        const shootingStar = document.createElement('div');
        shootingStar.className = 'shooting-star';
        shootingStar.style.left = Math.random() * 50 + '%';
        shootingStar.style.top = Math.random() * 50 + '%';
        this.container.appendChild(shootingStar);
        
        setTimeout(() => shootingStar.remove(), 3000);
    }
}

// Enhanced Voice Assistant with Mobile Optimizations
class VoiceAssistant {
    constructor() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.sessionId = this.getOrCreateSessionId();
        this.stream = null;
        this.audioContext = null;
        this.recordingStartTime = null;
        
        // DOM Elements
        this.voiceBtn = document.getElementById('voiceButton');
        this.btnText = document.getElementById('btnText');
        this.micIcon = document.getElementById('micIcon');
        this.statusText = document.getElementById('statusText');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.conversation = document.getElementById('conversation');
        this.aiAvatar = document.getElementById('aiAvatar');
        this.responseAudio = document.getElementById('responseAudio');
        
        this.init();
    }
    
    init() {
        this.initializeEventListeners();
        this.checkMicrophoneSupport();
        this.setupAudioContext();
        
        // Request microphone permission early on mobile
        if (isMobile) {
            this.voiceBtn.addEventListener('click', () => {
                if (!this.hasRequestedPermission) {
                    this.requestMicrophonePermission();
                }
            }, { once: true });
        }
    }
    
    setupAudioContext() {
        // Create audio context for better mobile audio handling
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            this.audioContext = new AudioContext();
            
            // Resume audio context on user interaction (iOS requirement)
            document.addEventListener('touchstart', () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            }, { once: true });
        }
    }
    
    getOrCreateSessionId() {
        try {
            let sessionId = localStorage.getItem('somni_session_id');
            if (!sessionId) {
                sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
                localStorage.setItem('somni_session_id', sessionId);
            }
            return sessionId;
        } catch (e) {
            // Fallback for private browsing
            return 'session_' + Date.now();
        }
    }
    
    checkMicrophoneSupport() {
        // On iOS, we need to be in a secure context (HTTPS or localhost)
        const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || 
                              window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1';
        
        if (!isSecureContext) {
            console.warn('Not in a secure context - required for audio recording');
            // Don't show error yet, let the actual recording attempt handle it
        }
        
        // Check for basic getUserMedia support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('getUserMedia not supported on this browser');
            return false;
        }
        
        return true;
    }
    
    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            this.hasRequestedPermission = true;
            return true;
        } catch (error) {
            console.error('Microphone permission denied:', error);
            return false;
        }
    }
    
    initializeEventListeners() {
        // Voice button with touch optimization
        let touchStarted = false;
        
        this.voiceBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchStarted = true;
            this.voiceBtn.classList.add('active');
        });
        
        this.voiceBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (touchStarted) {
                this.toggleRecording();
                touchStarted = false;
                this.voiceBtn.classList.remove('active');
            }
        });
        
        // Fallback for non-touch devices
        this.voiceBtn.addEventListener('click', (e) => {
            if (!touchStarted) {
                e.preventDefault();
                this.toggleRecording();
            }
        });
        
        // Quick action buttons
        this.setupQuickActions();
        
        // AI Avatar interaction
        this.aiAvatar.addEventListener('click', () => {
            this.handleAvatarClick();
        });
        
        // Handle app lifecycle events
        this.setupLifecycleHandlers();
    }
    
    setupQuickActions() {
        const actions = {
            'meditationBtn': 'Guide me through a relaxing meditation for sleep',
            'storyBtn': 'Tell me a calming bedtime story',
            'breathingBtn': 'Lead me through a breathing exercise to help me relax'
        };
        
        Object.entries(actions).forEach(([id, message]) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.sendQuickMessage(message);
                    this.provideHapticFeedback();
                });
            }
        });
    }
    
    setupLifecycleHandlers() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRecording) {
                this.stopRecording();
            }
        });
        
        // Handle iOS audio session interruptions
        if (isIOS) {
            window.addEventListener('blur', () => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            });
        }
    }
    
    provideHapticFeedback() {
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }
    
    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }
    
    async startRecording() {
        try {
            // Check if we're in a secure context (required for iOS)
            const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || 
                                  window.location.hostname === 'localhost' || 
                                  window.location.hostname === '127.0.0.1';
            
            if (!isSecureContext) {
                throw new Error('Audio recording requires a secure connection (HTTPS). Please access this page over HTTPS or localhost.');
            }
            
            // Update UI immediately to show we're starting
            this.isRecording = true;
            this.updateRecordingUI(true);
            
            // Audio constraints optimized for speech
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: isIOS ? 44100 : 48000,
                    channelCount: 1
                }
            };
            
            // On iOS, we need to handle the audio context differently
            if (isIOS && !this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                // Resume the audio context on iOS
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
            }
            
            try {
                this.stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('Successfully got audio stream');
            } catch (err) {
                console.error('Error getting audio stream:', err);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    throw new Error('Microphone access was denied. Please allow microphone access in your browser settings to use voice features.');
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    throw new Error('No microphone found. Please ensure you have a working microphone connected.');
                } else {
                    throw new Error('Could not access microphone. Please check your microphone settings and try again.');
                }
            }
            
            // Reset chunks for new recording
            this.audioChunks = [];
            this.recordingStartTime = Date.now();
            
            // Check if MediaRecorder is available
            if (window.MediaRecorder) {
                // Find best supported audio format
                const mimeType = this.getBestAudioFormat();
                console.log(`Using media format: ${mimeType || 'browser default'}`);
                
                // Create MediaRecorder with optimal settings
                let options = {};
                if (mimeType) {
                    options = {
                        mimeType: mimeType,
                        audioBitsPerSecond: 128000
                    };
                }
                
                try {
                    this.mediaRecorder = new MediaRecorder(this.stream, options);
                } catch (e) {
                    console.warn('Error with specified options, trying without options:', e);
                    try {
                        // Fallback without options
                        this.mediaRecorder = new MediaRecorder(this.stream);
                    } catch (e2) {
                        console.error('MediaRecorder creation failed completely:', e2);
                        this.showError('Your browser cannot record audio. Please try a different browser.');
                        this.stopAllTracks();
                        return;
                    }
                }
                
                // Set up MediaRecorder event handlers
                this.mediaRecorder.addEventListener('dataavailable', (event) => {
                    if (event.data.size > 0) {
                        this.audioChunks.push(event.data);
                        console.log(`Got audio chunk: ${event.data.size} bytes, type: ${event.data.type}`);
                    }
                });
                
                this.mediaRecorder.addEventListener('stop', () => {
                    console.log('MediaRecorder stopped, processing recording...');
                    this.processRecording();
                });
                
                this.mediaRecorder.addEventListener('error', (event) => {
                    console.error('MediaRecorder error:', event);
                    this.showError('Recording error occurred');
                    this.resetUI();
                });
                
                // Start recording with timeslice for better memory management
                // Use larger timeslice for iOS to avoid excessive small chunks
                const timeslice = isIOS ? 1000 : 100;
                this.mediaRecorder.start(timeslice);
                console.log(`MediaRecorder started with timeslice ${timeslice}ms`);
                
            } else {
                // Fallback for browsers without MediaRecorder
                console.warn('MediaRecorder not available, using alternative approach');
                this.showError('Your browser has limited recording support. Audio quality may be reduced.');
                
                // We'll use AudioContext to capture audio
                // This is a placeholder for a more complex AudioContext-based recording solution
                // which would be needed for full compatibility
                this.stopAllTracks();
                return;
            }
            
            // Provide feedback
            this.provideHapticFeedback();
            
            // Auto-stop after 60 seconds to prevent excessive recordings
            this.recordingTimeout = setTimeout(() => {
                if (this.isRecording) {
                    this.stopRecording();
                    this.showError('Recording stopped: Maximum duration reached');
                }
            }, 60000);
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.handleRecordingError(error);
        }
    }
    
    getBestAudioFormat() {
        // Prioritize formats based on browser/platform
        let formats = [];
        
        if (isIOS) {
            // iOS prefers these formats
            formats = [
                'audio/mp4',
                'audio/m4a',
                'audio/aac',
                'audio/mpeg',
                'audio/wav'
            ];
        } else if (navigator.userAgent.indexOf('Chrome') !== -1) {
            // Chrome (including Android Chrome) works best with these
            formats = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/wav'
            ];
        } else {
            // Other browsers - try various formats
            formats = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4',
                'audio/mpeg',
                'audio/wav'
            ];
        }
        
        // Find the first supported format
        for (const format of formats) {
            if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(format)) {
                console.log(`Using audio format: ${format}`);
                return format;
            }
        }
        
        console.log('No specific format supported, using browser default');
        return ''; // Let browser choose default
    }
    
    stopAllTracks() {
        // Helper function to safely stop all media tracks
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                try {
                    track.stop();
                    console.log(`Stopped track: ${track.kind}`);
                } catch (e) {
                    console.error('Error stopping track:', e);
                }
            });
            this.stream = null;
        }
    }
    
    stopRecording() {
        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
        }
        
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            try {
                this.mediaRecorder.stop();
                console.log('MediaRecorder stopped');
                this.isRecording = false;
                
                // Stop all tracks using the helper function
                this.stopAllTracks();
                
                // Update UI immediately
                this.updateRecordingUI(false);
                
            } catch (error) {
                console.error('Error stopping recording:', error);
                this.resetUI();
                // Even if there's an error, try to stop the tracks
                this.stopAllTracks();
            }
        } else {
            // If we don't have a mediaRecorder or it's already inactive
            // still make sure to stop any tracks and update UI
            this.isRecording = false;
            this.stopAllTracks();
            this.updateRecordingUI(false);
        }
    }
    
    async processRecording() {
        // Check recording duration
        const duration = Date.now() - this.recordingStartTime;
        console.log(`Recording duration: ${duration}ms, chunks: ${this.audioChunks.length}`);
        
        if (duration < 500) {
            this.showError('Recording too short. Please hold to speak.');
            this.resetUI();
            return;
        }
        
        if (this.audioChunks.length === 0) {
            this.showError('No audio recorded. Please try again.');
            this.resetUI();
            return;
        }
        
        try {
            // Analyze chunks for debugging
            this.audioChunks.forEach((chunk, index) => {
                console.log(`Chunk ${index}: size=${chunk.size} bytes, type=${chunk.type}`);
            });
            
            // Get the mime type from the MediaRecorder or the first chunk
            let mimeType = 'audio/webm'; // Default fallback
            
            if (this.mediaRecorder && this.mediaRecorder.mimeType) {
                mimeType = this.mediaRecorder.mimeType;
                console.log(`MediaRecorder reported mime type: ${mimeType}`);
            } else if (this.audioChunks.length > 0 && this.audioChunks[0].type) {
                // Use the type from the first chunk if available
                mimeType = this.audioChunks[0].type;
                console.log(`Using mime type from first chunk: ${mimeType}`);
            } else {
                console.log(`Using default mime type: ${mimeType}`);
            }
            
            // Platform-specific handling
            if (isIOS) {
                // For iOS, prefer audio/mp4 format
                if (!mimeType.includes('mp4') && !mimeType.includes('m4a')) {
                    const originalMimeType = mimeType;
                    mimeType = 'audio/mp4';
                    console.log(`iOS: Changed mime type from ${originalMimeType} to ${mimeType}`);
                }
            } else if (isAndroid) {
                // For Android, prefer webm format if available
                if (!mimeType.includes('webm') && MediaRecorder.isTypeSupported('audio/webm')) {
                    const originalMimeType = mimeType;
                    mimeType = 'audio/webm';
                    console.log(`Android: Changed mime type from ${originalMimeType} to ${mimeType}`);
                }
            }
            
            // Create blob with appropriate mime type
            const audioBlob = new Blob(this.audioChunks, { type: mimeType });
            
            console.log(`Created audio blob: size=${audioBlob.size} bytes, type=${audioBlob.type}`);
            
            if (audioBlob.size === 0) {
                throw new Error('Empty audio recording');
            } else if (audioBlob.size < 100) {
                // Very small files are likely corrupt
                throw new Error('Recording too small to process');
            }
            
            // Create audio element for debugging (will be hidden)
            const debugAudio = document.createElement('audio');
            debugAudio.style.display = 'none';
            debugAudio.controls = true;
            const audioURL = URL.createObjectURL(audioBlob);
            debugAudio.src = audioURL;
            document.body.appendChild(debugAudio);
            
            // Validate that the blob is playable
            debugAudio.onloadedmetadata = () => {
                console.log(`Debug audio duration: ${debugAudio.duration}s`);
                if (debugAudio.duration === 0 || isNaN(debugAudio.duration)) {
                    console.warn('Warning: Audio duration is zero or NaN, may indicate corrupt audio');
                }
            };
            
            debugAudio.onerror = (e) => {
                console.error('Debug audio load error:', e);
            };
            
            // Clean up after a few seconds
            setTimeout(() => {
                URL.revokeObjectURL(audioURL);
                debugAudio.remove();
            }, 5000);
            
            // Show processing state
            this.statusText.textContent = 'Processing your message...';
            this.btnText.textContent = 'Processing...';
            this.micIcon.textContent = '⏳';
            
            // Send to server
            await this.uploadAudio(audioBlob);
            
        } catch (error) {
            console.error('Error processing recording:', error);
            this.showError(`Audio processing error: ${error.message || 'Unknown error'}`);
            this.resetUI();
        }
    }
    
    async uploadAudio(audioBlob) {
        try {
            // Force to use a consistently supported format based on platform
            let finalBlob = audioBlob;
            let finalExtension = this.getFileExtension(audioBlob.type);
            
            // Log info for debugging
            console.log(`Original audio blob: type=${audioBlob.type}, size=${audioBlob.size} bytes`);
            
            // Ensure we have a valid file extension that OpenAI accepts
            const validExtensions = ['m4a', 'mp3', 'webm', 'wav', 'ogg'];
            if (!validExtensions.includes(finalExtension)) {
                console.log(`Converting unsafe extension ${finalExtension} to safe format`);
                finalExtension = isIOS ? 'm4a' : 'webm';
            }
            
            // Create FormData with the proper extension
            const formData = new FormData();
            const filename = `recording_${Date.now()}.${finalExtension}`;
            formData.append('audio', finalBlob, filename);
            formData.append('session_id', this.sessionId);
            
            console.log(`Uploading audio as: ${filename}`);
            
            // Show processing state
            this.statusText.textContent = 'Processing your message...';
            this.btnText.textContent = 'Processing...';
            this.micIcon.textContent = '⏳';
            
            // Send to server with explicit timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
            
            const response = await fetch('/transcribe_audio', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error: ${response.status}`, errorText);
                throw new Error(`Server error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Server response:', data);
            
            if (data.success && data.text) {
                // Add user message to the conversation
                this.addMessage(data.text, 'user');
                
                // Save the session ID if provided
                if (data.session_id) {
                    this.sessionId = data.session_id;
                    console.log('Updated session ID:', this.sessionId);
                }
                
                // Process the message to get AI response
                await this.processMessage(data.text);
            } else {
                throw new Error(data.error || 'Transcription failed');
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            if (error.name === 'AbortError') {
                this.showError('Request timed out. Please try again.');
            } else {
                this.showError(error.message || 'Could not process audio. Please try again.');
            }
            this.resetUI();
        }
    }
    
    getFileExtension(mimeType) {
        // More comprehensive mapping of MIME types to file extensions
        const typeMap = {
            'audio/webm': 'webm',
            'audio/webm;codecs=opus': 'webm',
            'audio/mp4': 'm4a',
            'audio/m4a': 'm4a',
            'audio/aac': 'm4a',
            'audio/mpeg': 'mp3',
            'audio/wav': 'wav',
            'audio/ogg': 'ogg',
            'audio/ogg;codecs=opus': 'ogg'
        };
        
        // Default to the safest option for the platform
        if (mimeType in typeMap) {
            return typeMap[mimeType];
        } else {
            console.log(`Unknown MIME type: ${mimeType}, defaulting to safe format`);
            return isIOS ? 'm4a' : 'webm';
        }
    }
    
    async sendQuickMessage(message) {
        this.addMessage(message, 'user');
        await this.processMessage(message);
    }
    
    async processMessage(message) {
        this.statusText.textContent = 'Somni is thinking...';
        this.addTypingIndicator();
        
        try {
            const response = await fetch('/process_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    session_id: this.sessionId,
                    generate_audio: true
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            this.removeTypingIndicator();
            
            if (data.success && data.text) {
                this.addMessage(data.text, 'assistant');
                
                if (data.audio_url && !isMobile) {
                    // Auto-play audio on desktop only
                    this.playAudioResponse(data.audio_url);
                } else if (data.audio_url) {
                    // On mobile, show play button
                    this.showAudioPlayOption(data.audio_url);
                }
                
                this.sessionId = data.session_id || this.sessionId;
            } else {
                throw new Error(data.error || 'Failed to get response');
            }
            
        } catch (error) {
            console.error('Error processing message:', error);
            this.removeTypingIndicator();
            this.showError('Could not get response. Please try again.');
        }
        
        this.resetUI();
    }
    
    updateRecordingUI(isRecording) {
        if (isRecording) {
            this.voiceBtn.classList.add('recording');
            this.btnText.textContent = 'Listening...';
            this.micIcon.textContent = '🔴';
            this.statusText.textContent = 'Listening to you...';
            this.statusIndicator.classList.add('active');
            this.aiAvatar.classList.add('listening');
        } else {
            this.voiceBtn.classList.remove('recording');
            this.btnText.textContent = 'Processing...';
            this.micIcon.textContent = '⏳';
            this.statusText.textContent = 'Processing your message...';
            this.aiAvatar.classList.remove('listening');
        }
    }
    
    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🌙';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'text';
        textDiv.textContent = text;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(textDiv);
        
        this.conversation.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant typing';
        typingDiv.id = 'typingIndicator';
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.textContent = '🌙';
        
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        
        typingDiv.appendChild(avatar);
        typingDiv.appendChild(indicator);
        
        this.conversation.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    scrollToBottom() {
        requestAnimationFrame(() => {
            this.conversation.scrollTop = this.conversation.scrollHeight;
        });
    }
    
    async playAudioResponse(audioUrl) {
        try {
            // Resume audio context if needed (iOS)
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.responseAudio.src = audioUrl;
            
            // Try to play with user gesture handling
            const playPromise = this.responseAudio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log('Auto-play prevented:', e);
                    this.showAudioPlayOption(audioUrl);
                });
            }
        } catch (error) {
            console.error('Audio playback error:', error);
        }
    }
    
    showAudioPlayOption(audioUrl) {
        this.statusText.innerHTML = '🔊 Tap the moon to play response';
        this.responseAudio.src = audioUrl;
    }
    
    handleAvatarClick() {
        if (this.responseAudio.src) {
            if (this.responseAudio.paused) {
                this.responseAudio.play().catch(e => {
                    console.log('Playback failed:', e);
                });
            } else {
                this.responseAudio.pause();
            }
        }
    }
    
    handleRecordingError(error) {
        let message = 'Could not access microphone.';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            message = 'Microphone access denied. Please enable in settings.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            message = 'No microphone found. Please check your device.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            message = 'Microphone is already in use by another app.';
        }
        
        this.showError(message);
        this.resetUI();
    }
    
    showError(message) {
        this.statusText.textContent = message;
        this.statusText.classList.add('error');
        
        setTimeout(() => {
            this.statusText.classList.remove('error');
            this.resetUI();
        }, 3000);
    }
    
    resetUI() {
        this.voiceBtn.classList.remove('recording', 'active');
        this.btnText.textContent = 'Tap to Speak';
        this.micIcon.textContent = '🎤';
        this.statusText.textContent = 'Ready to help you relax';
        this.statusIndicator.classList.remove('active');
        this.aiAvatar.classList.remove('listening');
    }
}

// Progressive Web App Support
class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.init();
    }
    
    init() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
        }
        
        // Handle install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });
    }
    
    async registerServiceWorker() {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }
    
    showInstallButton() {
        // Implementation for install button if needed
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // Create starfield
    const starfield = new Starfield();
    
    // Initialize voice assistant
    const assistant = new VoiceAssistant();
    
    // Initialize PWA manager
    const pwa = new PWAManager();
    
    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
    });
    
    // Performance optimization: Pause animations when not visible
    document.addEventListener('visibilitychange', () => {
        const stars = document.querySelectorAll('.star');
        stars.forEach(star => {
            star.style.animationPlayState = document.hidden ? 'paused' : 'running';
        });
    });
    
    // Debug info
    console.log('Sleep AI initialized', {
        mobile: isMobile,
        iOS: isIOS,
        Android: isAndroid,
        audioSupport: 'mediaDevices' in navigator
    });
});

// Prevent zoom on double tap (iOS)
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);