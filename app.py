import os
from flask import Flask, render_template, request, jsonify, session, make_response
from dotenv import load_dotenv
from openai import OpenAI
import json
import time
import uuid
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

# Add CORS headers for development
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Configure OpenAI client
try:
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    print("[OK] OpenAI client initialized successfully")
except Exception as e:
    print(f"[ERROR] OpenAI client initialization failed: {e}")
    client = None

# In-memory storage for sessions (replace with database in production)
user_sessions = {}

@dataclass
class UserSession:
    session_id: str
    conversation_history: list
    created_at: str = datetime.now().isoformat()
    last_active: str = datetime.now().isoformat()

    def to_dict(self):
        return {
            'session_id': self.session_id,
            'conversation_history': self.conversation_history,
            'created_at': self.created_at,
            'last_active': self.last_active
        }

def get_or_create_session(session_id=None):
    """Get existing session or create a new one"""
    if not session_id or session_id not in user_sessions:
        session_id = str(uuid.uuid4())
        user_sessions[session_id] = UserSession(
            session_id=session_id,
            conversation_history=[
                {
                    "role": "system",
                    "content": """You are Somni, a warm and caring AI sleep assistant. Your purpose is to help users relax, unwind, and achieve better sleep through gentle guidance and support.

Your personality:
- Warm, calming, and empathetic
- Supportive and non-judgmental
- Gentle and soothing tone perfect for bedtime
- Patient and understanding

Your expertise:
- Sleep hygiene and healthy bedtime routines
- Relaxation and meditation techniques
- Breathing exercises for better sleep
- Bedtime stories and guided imagery
- Stress reduction and anxiety management

Your responses should:
- Be concise yet helpful (2-4 sentences typically)
- Use calming, peaceful language
- Provide practical, actionable advice when appropriate
- Ask gentle follow-up questions to better help the user
- Maintain a relaxing atmosphere conducive to sleep

Remember: You're here to help users wind down and prepare for restful sleep."""
                }
            ]
        )
        print(f"[NEW] Created new session: {session_id}")
    else:
        print(f"[RESUME] Resuming existing session: {session_id}")
    
    # Update last active time
    user_sessions[session_id].last_active = datetime.now().isoformat()
    return user_sessions[session_id], session_id

def update_conversation(session_id, role, content):
    """Add a message to the conversation history"""
    if session_id in user_sessions:
        user_sessions[session_id].conversation_history.append({"role": role, "content": content})
        
        # Keep conversation manageable (last 20 messages + system prompt)
        if len(user_sessions[session_id].conversation_history) > 21:
            system_prompt = user_sessions[session_id].conversation_history[0]
            recent_messages = user_sessions[session_id].conversation_history[-20:]
            user_sessions[session_id].conversation_history = [system_prompt] + recent_messages
        
        return True
    return False

@app.route('/')
def home():
    """Main page"""
    print(f"[PAGE] Home page requested")
    return render_template('index.html')

@app.route('/transcribe_audio', methods=['POST'])
def transcribe_audio():
    """Transcribe uploaded audio file"""
    print(f"[AUDIO] Audio transcription requested")
    
    if not client:
        return jsonify({'error': 'OpenAI client not available', 'success': False}), 500
    
    audio_path = None
    try:
        # Get session ID from form data
        session_id = request.form.get('session_id')
        print(f"[SESSION] Session ID: {session_id}")
        
        # Get or create session
        user_session, session_id = get_or_create_session(session_id)
        
        # Get the audio file
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided', 'success': False}), 400
            
        audio_file = request.files['audio']
        if not audio_file.filename:
            return jsonify({'error': 'No audio file selected', 'success': False}), 400
        
        # Get content type and file extension
        content_type = audio_file.content_type
        original_ext = os.path.splitext(audio_file.filename)[1].lower()
        
        # Validate and fix file extension if needed
        valid_extensions = ['.wav', '.webm', '.mp3', '.m4a', '.ogg', '.mpeg', '.mpga', '.mp4', '.oga', '.flac']
        
        # Map MIME types to extensions for OpenAI compatibility
        mime_to_ext = {
            'audio/webm': '.webm',
            'audio/mp4': '.m4a',
            'audio/mpeg': '.mp3',
            'audio/mp3': '.mp3',
            'audio/ogg': '.ogg',
            'audio/wav': '.wav',
            'audio/wave': '.wav',
            'audio/x-wav': '.wav',
            'audio/flac': '.flac',
            'audio/x-flac': '.flac',
        }
        
        # Determine the best extension based on content type and original extension
        if content_type and content_type in mime_to_ext:
            file_ext = mime_to_ext[content_type]
            print(f"Using extension {file_ext} based on content type {content_type}")
        elif original_ext in valid_extensions:
            file_ext = original_ext
            print(f"Using original extension {file_ext}")
        else:
            # Default fallback extension
            file_ext = '.webm'  # Most common format from browsers
            print(f"Using default extension {file_ext} (original: {original_ext}, content-type: {content_type})")
        
        # Save audio file temporarily with appropriate extension
        timestamp = int(time.time())
        audio_path = f'temp_audio_{session_id}_{timestamp}{file_ext}'
        audio_file.save(audio_path)
        
        # Check file size (Whisper API has 25MB limit)
        file_size = os.path.getsize(audio_path)
        if file_size > 25 * 1024 * 1024:
            return jsonify({'error': 'File too large (max 25MB)', 'success': False}), 400
        elif file_size < 100:
            return jsonify({'error': 'Audio file too small or empty', 'success': False}), 400
        
        print(f"[SAVE] Saved audio file: {audio_path} ({file_size} bytes)")
        
        try:
            # Transcribe using Whisper API
            with open(audio_path, 'rb') as f:
                try:
                    transcript = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=f,
                        language="en"  # Specify English for better accuracy
                    )
                    
                    if not transcript.text.strip():
                        return jsonify({'error': 'No speech detected', 'success': False}), 400
                    
                    print(f"[TRANSCRIBE] Transcription: {transcript.text[:100]}...")
                    
                    # Add user message to conversation history
                    update_conversation(session_id, "user", transcript.text)
                    
                    return jsonify({
                        'text': transcript.text,
                        'session_id': session_id,
                        'success': True
                    })
                    
                except Exception as e:
                    error_msg = str(e)
                    print(f"[ERROR] Transcription error: Error code: {getattr(e, 'status_code', 'unknown')} - {error_msg}")
                    
                    # If it's a format error, give detailed information
                    if 'format' in error_msg.lower():
                        return jsonify({
                            'error': f'Invalid audio format: {error_msg}', 
                            'details': {
                                'file_size': file_size,
                                'extension': file_ext,
                                'content_type': content_type
                            },
                            'success': False
                        }), 400
                    
                    return jsonify({'error': f'Transcription failed: {error_msg}', 'success': False}), 500
            
        except Exception as e:
            print(f"[ERROR] File handling error: {str(e)}")
            return jsonify({'error': f'File processing error: {str(e)}', 'success': False}), 500
            
    except Exception as e:
        print(f"[ERROR] General error in transcribe_audio: {str(e)}")
        return jsonify({'error': f'Unexpected error: {str(e)}', 'success': False}), 500
        
    finally:
        # Clean up temporary file
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                print(f"[CLEANUP] Cleaned up: {audio_path}")
            except Exception as e:
                print(f"[WARNING] Failed to remove temp file: {e}")

@app.route('/process_message', methods=['POST'])
def process_message():
    """Process message and generate AI response"""
    print("[AI] Message processing requested")
    
    if not client:
        return jsonify({'error': 'OpenAI client not available', 'success': False}), 500
    
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        session_id = data.get('session_id')
        generate_audio = data.get('generate_audio', False)
        
        print(f"[MSG] Message: {user_message[:100]}...")
        print(f"[SESSION] Session: {session_id}")
        print(f"[AUDIO] Generate audio: {generate_audio}")
        
        if not user_message:
            return jsonify({'error': 'No message provided', 'success': False}), 400
        
        # Get or create session
        user_session, session_id = get_or_create_session(session_id)
        
        # Add user message to conversation history
        update_conversation(session_id, "user", user_message)
        
        # Prepare messages for GPT-4
        messages = user_session.conversation_history.copy()
        
        try:
            # Get response from GPT-4
            response = client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                temperature=0.7,
                max_tokens=400,
                presence_penalty=0.1,
                frequency_penalty=0.1
            )
            
            assistant_response = response.choices[0].message.content
            print(f"[AI] AI Response: {assistant_response[:100]}...")
            
            # Add assistant's response to conversation history
            update_conversation(session_id, "assistant", assistant_response)
            
            # Update last active time
            user_session.last_active = datetime.now().isoformat()
            
            response_data = {
                'text': assistant_response,
                'session_id': session_id,
                'success': True
            }
            
            # Generate TTS if requested
            if generate_audio:
                try:
                    print("[TTS] Generating TTS...")
                    tts_response = client.audio.speech.create(
                        model="tts-1",
                        voice="nova",  # Warmer, more soothing voice
                        input=assistant_response,
                        speed=0.9  # Slightly slower for relaxation
                    )
                    
                    # Ensure audio directory exists
                    os.makedirs('static/audio', exist_ok=True)
                    
                    # Save audio file
                    timestamp = int(time.time())
                    audio_filename = f"response_{session_id}_{timestamp}.mp3"
                    audio_path = f"static/audio/{audio_filename}"
                    
                    tts_response.stream_to_file(audio_path)
                    response_data['audio_url'] = f'/{audio_path}'
                    
                    print(f"[AUDIO] Audio saved: {audio_path}")
                    
                except Exception as tts_error:
                    print(f"[ERROR] TTS Error: {str(tts_error)}")
                    # Don't fail the whole request if TTS fails
                    response_data['audio_error'] = 'Could not generate audio'
            
            return jsonify(response_data)
            
        except Exception as ai_error:
            print(f"[ERROR] AI Error: {str(ai_error)}")
            return jsonify({'error': f'AI processing failed: {str(ai_error)}', 'success': False}), 500
        
    except Exception as e:
        print(f"[ERROR] General error in process_message: {str(e)}")
        return jsonify({'error': f'Unexpected error: {str(e)}', 'success': False}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'openai_available': client is not None,
        'active_sessions': len(user_sessions)
    })


@app.route('/sw.js')
def service_worker():
    return app.send_static_file('sw.js'), 200, {'Content-Type': 'application/javascript'}

@app.route('/manifest.json')
def manifest():
    return app.send_static_file('manifest.json'), 200, {'Content-Type': 'application/json'}

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("[START] Starting Somni Sleep Assistant...")
    
    # Create necessary directories
    os.makedirs('sessions', exist_ok=True)
    os.makedirs('uploads', exist_ok=True)
    
    # Run the app
    try:
        # Use 0.0.0.0 to make it accessible on the network
        # Use a non-standard port to avoid conflicts
        app.run(host='0.0.0.0', port=5000, debug=True, ssl_context='adhoc')
    except Exception as e:
        print(f"[ERROR] Failed to start server: {e}")
        # Fallback to HTTP if HTTPS fails
        print("[INFO] Falling back to HTTP...")
        app.run(host='0.0.0.0', port=5000, debug=True)