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
    print("✅ OpenAI client initialized successfully")
except Exception as e:
    print(f"❌ OpenAI client initialization failed: {e}")
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
        print(f"🆕 Created new session: {session_id}")
    else:
        print(f"♻️ Resuming existing session: {session_id}")
    
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
    print("🏠 Home page requested")
    return render_template('index.html')

@app.route('/transcribe_audio', methods=['POST'])
def transcribe_audio():
    """Transcribe uploaded audio file"""
    print("🎤 Audio transcription requested")
    
    if not client:
        return jsonify({'error': 'OpenAI client not available', 'success': False}), 500
    
    audio_path = None
    try:
        # Get session ID from form data
        session_id = request.form.get('session_id')
        print(f"📝 Session ID: {session_id}")
        
        # Get or create session
        user_session, session_id = get_or_create_session(session_id)
        
        # Get the audio file
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided', 'success': False}), 400
            
        audio_file = request.files['audio']
        if not audio_file.filename:
            return jsonify({'error': 'No audio file selected', 'success': False}), 400
        
        # Validate file extension
        file_ext = os.path.splitext(audio_file.filename)[1].lower()
        if file_ext not in ['.wav', '.webm', '.mp3', '.m4a', '.ogg']:
            return jsonify({'error': 'Unsupported audio format', 'success': False}), 400
        
        # Save audio file temporarily
        audio_path = f'temp_audio_{session_id}{file_ext}'
        audio_file.save(audio_path)
        
        # Check file size (Whisper API has 25MB limit)
        file_size = os.path.getsize(audio_path)
        if file_size > 25 * 1024 * 1024:
            return jsonify({'error': 'File too large (max 25MB)', 'success': False}), 400
        
        print(f"💾 Saved audio file: {audio_path} ({file_size} bytes)")
        
        try:
            # Transcribe using Whisper API
            with open(audio_path, 'rb') as f:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=f,
                    language="en"  # Specify English for better accuracy
                )
            
            if not transcript.text.strip():
                return jsonify({'error': 'No speech detected', 'success': False}), 400
            
            print(f"📝 Transcription: {transcript.text[:100]}...")
            
            # Add user message to conversation history
            update_conversation(session_id, "user", transcript.text)
            
            return jsonify({
                'text': transcript.text,
                'session_id': session_id,
                'success': True
            })
            
        except Exception as e:
            print(f"❌ Transcription error: {str(e)}")
            return jsonify({'error': f'Transcription failed: {str(e)}', 'success': False}), 500
            
    except Exception as e:
        print(f"❌ General error in transcribe_audio: {str(e)}")
        return jsonify({'error': f'Unexpected error: {str(e)}', 'success': False}), 500
        
    finally:
        # Clean up temporary file
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                print(f"🧹 Cleaned up: {audio_path}")
            except Exception as e:
                print(f"⚠️ Failed to remove temp file: {e}")

@app.route('/process_message', methods=['POST'])
def process_message():
    """Process message and generate AI response"""
    print("🤖 Message processing requested")
    
    if not client:
        return jsonify({'error': 'OpenAI client not available', 'success': False}), 500
    
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        session_id = data.get('session_id')
        generate_audio = data.get('generate_audio', False)
        
        print(f"📨 Message: {user_message[:100]}...")
        print(f"📝 Session: {session_id}")
        print(f"🔊 Generate audio: {generate_audio}")
        
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
            print(f"🤖 AI Response: {assistant_response[:100]}...")
            
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
                    print("🗣️ Generating TTS...")
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
                    
                    print(f"🔊 Audio saved: {audio_path}")
                    
                except Exception as tts_error:
                    print(f"❌ TTS Error: {str(tts_error)}")
                    # Don't fail the whole request if TTS fails
                    response_data['audio_error'] = 'Could not generate audio'
            
            return jsonify(response_data)
            
        except Exception as ai_error:
            print(f"❌ AI Error: {str(ai_error)}")
            return jsonify({'error': f'AI processing failed: {str(ai_error)}', 'success': False}), 500
        
    except Exception as e:
        print(f"❌ General error in process_message: {str(e)}")
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

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("🌙 Starting Somni Sleep Assistant...")
    
    # Create necessary directories
    os.makedirs('static/audio', exist_ok=True)
    print("📁 Created audio directory")
    
    # Check environment
    if not os.getenv('OPENAI_API_KEY'):
        print("⚠️ WARNING: OPENAI_API_KEY not found in environment")
    
    # Get port from environment or default to 5000
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_ENV') != 'production'
    
    print(f"🚀 Starting server on port {port}")
    print(f"🔧 Debug mode: {debug_mode}")
    
    # Run the app
    app.run(
        host='0.0.0.0', 
        port=port, 
        debug=debug_mode,
        threaded=True
    )