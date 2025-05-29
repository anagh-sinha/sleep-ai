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
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showError('Your browser doesn\'t support audio recording.');
            this.voiceBtn.disabled = true;
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
            // Check permissions first
            if (!this.checkMicrophoneSupport()) return;
            
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
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Find best supported audio format
            const mimeType = this.getBestAudioFormat();
            
            // Create MediaRecorder with optimal settings
            const options = {
                mimeType: mimeType,
                audioBitsPerSecond: 128000
            };
            
            try {
                this.mediaRecorder = new MediaRecorder(this.stream, options);
            } catch (e) {
                // Fallback without options
                this.mediaRecorder = new MediaRecorder(this.stream);
            }
            
            this.audioChunks = [];
            this.recordingStartTime = Date.now();
            
            // Set up MediaRecorder event handlers
            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            });
            
            this.mediaRecorder.addEventListener('stop', () => {
                this.processRecording();
            });
            
            this.mediaRecorder.addEventListener('error', (event) => {
                console.error('MediaRecorder error:', event);
                this.showError('Recording error occurred');
                this.resetUI();
            });
            
            // Start recording with timeslice for better memory management
            this.mediaRecorder.start(100);
            this.isRecording = true;
            
            // Update UI
            this.updateRecordingUI(true);
            
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
        const formats = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/mpeg',
            'audio/wav'
        ];
        
        // iOS specific handling
        if (isIOS) {
            formats.unshift('audio/mp4', 'audio/mpeg');
        }
        
        for (const format of formats) {
            if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(format)) {
                return format;
            }
        }
        
        return ''; // Let browser choose default
    }
    
    stopRecording() {
        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
        }
        
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            try {
                this.mediaRecorder.stop();
                this.isRecording = false;
                
                // Stop all tracks
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }
                
                // Update UI immediately
                this.updateRecordingUI(false);
                
            } catch (error) {
                console.error('Error stopping recording:', error);
                this.resetUI();
            }
        }
    }
    
    async processRecording() {
        // Check recording duration
        const duration = Date.now() - this.recordingStartTime;
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
            // Create blob with detected mime type
            const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(this.audioChunks, { type: mimeType });
            
            if (audioBlob.size === 0) {
                throw new Error('Empty audio recording');
            }
            
            // Show processing state
            this.statusText.textContent = 'Processing your message...';
            this.btnText.textContent = 'Processing...';
            this.micIcon.textContent = '⏳';
            
            // Send to server
            await this.uploadAudio(audioBlob);
            
        } catch (error) {
            console.error('Error processing recording:', error);
            this.showError('Could not process audio. Please try again.');
            this.resetUI();
        }
    }
    
    async uploadAudio(audioBlob) {
        const formData = new FormData();
        const filename = `recording_${Date.now()}.${this.getFileExtension(audioBlob.type)}`;
        formData.append('audio', audioBlob, filename);
        formData.append('session_id', this.sessionId);
        
        try {
            const response = await fetch('/transcribe_audio', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.text) {
                this.addMessage(data.text, 'user');
                this.sessionId = data.session_id || this.sessionId;
                await this.processMessage(data.text);
            } else {
                throw new Error(data.error || 'Transcription failed');
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showError('Could not connect to server. Please check your connection.');
            this.resetUI();
        }
    }
    
    getFileExtension(mimeType) {
        const typeMap = {
            'audio/webm': 'webm',
            'audio/mp4': 'm4a',
            'audio/mpeg': 'mp3',
            'audio/wav': 'wav',
            'audio/ogg': 'ogg'
        };
        return typeMap[mimeType] || 'webm';
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