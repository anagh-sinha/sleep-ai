import os
from flask import Flask, render_template, request, jsonify, session, make_response
from dotenv import load_dotenv
from openai import OpenAI
import json
import time
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import uuid
import hashlib

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)  # Session expires after 7 days

# Add CORS headers
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# In-memory storage (replace with a database in production)
user_sessions = {}

@dataclass
class SleepPattern:
    bedtime: str = None
    wake_time: str = None
    sleep_quality: int = None  # 1-5 scale
    sleep_notes: str = ""
    created_at: str = datetime.now().isoformat()

@dataclass
class UserSession:
    session_id: str
    conversation_history: list
    sleep_pattern: SleepPattern = None
    user_preferences: dict = None
    created_at: str = datetime.now().isoformat()
    last_active: str = datetime.now().isoformat()

    def to_dict(self):
        return {
            'session_id': self.session_id,
            'conversation_history': self.conversation_history,
            'sleep_pattern': asdict(self.sleep_pattern) if self.sleep_pattern else None,
            'user_preferences': self.user_preferences or {},
            'created_at': self.created_at,
            'last_active': self.last_active
        }

def get_or_create_session(session_id=None):
    if not session_id or session_id not in user_sessions:
        session_id = str(uuid.uuid4())
        user_sessions[session_id] = UserSession(
            session_id=session_id,
            conversation_history=[
                {
                    "role": "system",
                    "content": """You are Somni, an expert sleep assistant with deep knowledge of sleep science and wellness. 
                    Your role is to provide personalized, evidence-based sleep advice and support.
                    Be empathetic, supportive, and non-judgmental. Ask clarifying questions when needed.
                    Focus on sustainable, healthy sleep habits and provide practical, actionable advice."""
                }
            ],
            user_preferences={
                'name': None,
                'sleep_goal': None,
                'preferred_wake_time': None,
                'preferred_bedtime': None,
                'sleep_issues': []
            }
        )
    
    # Update last active time
    user_session = user_sessions[session_id]
    user_session.last_active = datetime.now().isoformat()
    
    return user_session, session_id

def update_conversation(session_id, role, content):
    if session_id in user_sessions:
        user_sessions[session_id].conversation_history.append({"role": role, "content": content})
        # Keep conversation history manageable
        if len(user_sessions[session_id].conversation_history) > 20:  # Keep last 10 exchanges
            user_sessions[session_id].conversation_history = \
                [user_sessions[session_id].conversation_history[0]] + user_sessions[session_id].conversation_history[-19:]
        return True
    return False

def get_sleep_analysis(sleep_pattern):
    """Generate sleep analysis based on collected sleep patterns"""
    if not sleep_pattern or not sleep_pattern.bedtime or not sleep_pattern.wake_time:
        return None
        
    bedtime = datetime.fromisoformat(sleep_pattern.bedtime)
    wake_time = datetime.fromisoformat(sleep_pattern.wake_time)
    sleep_duration = (wake_time - bedtime).total_seconds() / 3600  # in hours
    
    analysis = {
        'sleep_duration': round(sleep_duration, 1),
        'recommendations': []
    }
    
    if sleep_duration < 7:
        analysis['recommendations'].append("Aim for 7-9 hours of sleep for optimal health.")
    
    if sleep_pattern.sleep_quality and sleep_pattern.sleep_quality < 3:
        analysis['recommendations'].append("Consider establishing a relaxing bedtime routine.")
    
    return analysis

# Configure OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Store conversation history
conversation_history = [
    {"role": "system", "content": "You are a soothing sleep assistant. Help the user relax and fall asleep with calming words, guided meditations, or bedtime stories. Speak in a gentle, peaceful tone."}
]

@app.route('/')
def home():
    # Initialize or retrieve user session
    session_id = session.get('session_id')
    user_session, session_id = get_or_create_session(session_id)
    session['session_id'] = session_id
    
    # Pass initial data to the template
    return render_template('index.html', session_id=session_id)

@app.route('/transcribe_audio', methods=['POST'])
def transcribe_audio():
    audio_path = None
    try:
        # Get session ID from form data or create a new session if none exists
        session_id = request.form.get('session_id')
        
        # Debug log the incoming session ID
        print(f"Incoming session ID: {session_id}")
        print(f"Existing sessions: {list(user_sessions.keys())}")
        
        # Get or create session
        user_session, session_id = get_or_create_session(session_id)
        print(f"Using session ID: {session_id}")
        
        # Log the session details for debugging
        print(f"Session details: {user_session.to_dict() if hasattr(user_session, 'to_dict') else 'No session details'}")
            
        # Get the audio file from the request
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided', 'success': False}), 400
            
        audio_file = request.files['audio']
        if not audio_file.filename:
            return jsonify({'error': 'No audio file selected', 'success': False}), 400
        
        # Get file extension
        file_ext = os.path.splitext(audio_file.filename)[1].lower()
        if file_ext not in ['.wav', '.webm', '.mp3', '.m4a']:
            return jsonify({'error': 'Unsupported audio format', 'success': False}), 400
        
        # Save the audio file temporarily with session ID
        audio_path = f'temp_audio_{session_id}{file_ext}'
        audio_file.save(audio_path)
        
        # Check file size (max 25MB for Whisper API)
        file_size = os.path.getsize(audio_path)
        if file_size > 25 * 1024 * 1024:  # 25MB in bytes
            return jsonify({
                'error': 'File too large. Maximum size is 25MB',
                'success': False
            }), 400
        
        try:
            # Transcribe the audio using Whisper
            with open(audio_path, 'rb') as f:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=f
                )
            
            if not transcript.text:
                return jsonify({
                    'error': 'No speech detected in audio',
                    'success': False
                }), 400
            
            # Add user message to conversation history
            update_conversation(session_id, "user", transcript.text)
            
            return jsonify({
                'text': transcript.text,
                'session_id': session_id,
                'success': True
            })
            
        except Exception as e:
            print(f"Transcription error: {str(e)}")
            return jsonify({
                'error': f'Failed to transcribe audio: {str(e)}',
                'success': False
            }), 500
            
        finally:
            # Clean up the temporary file
            if audio_path and os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                except Exception as e:
                    print(f"Error removing temp file {audio_path}: {str(e)}")
                    
    except Exception as e:
        print(f"Error in transcribe_audio: {str(e)}")
        return jsonify({
            'error': f'An unexpected error occurred: {str(e)}',
            'success': False
        }), 500

@app.route('/process_message', methods=['POST'])
def process_message():
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        session_id = data.get('session_id')
        generate_audio = data.get('generate_audio', False)
        
        if not session_id or session_id not in user_sessions:
            return jsonify({'error': 'Invalid session', 'success': False}), 400
            
        if not user_message:
            return jsonify({'error': 'No message provided', 'success': False}), 400
            
        user_session = user_sessions[session_id]
        
        # Add user message to conversation history
        update_conversation(session_id, "user", user_message)
        
        # Prepare messages for GPT-4 with context
        messages = user_session.conversation_history.copy()
        
        # Add sleep data context if available
        if user_session.sleep_pattern:
            sleep_context = {
                "role": "system",
                "content": f"""
                User's sleep pattern data:
                - Bedtime: {user_session.sleep_pattern.bedtime or 'Not specified'}
                - Wake time: {user_session.sleep_pattern.wake_time or 'Not specified'}
                - Sleep quality: {user_session.sleep_pattern.sleep_quality or 'Not rated'}
                - Notes: {user_session.sleep_pattern.sleep_notes or 'No additional notes'}
                """
            }
            messages.insert(1, sleep_context)
        
        # Get response from GPT-4
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.7,
            max_tokens=500,
            stream=False
        )
        
        # Get the assistant's response
        assistant_response = response.choices[0].message.content
        
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
                tts_response = client.audio.speech.create(
                    model="tts-1",
                    voice="alloy",
                    input=assistant_response,
                    speed=1.0
                )
                
                # Ensure audio directory exists
                os.makedirs('static/audio', exist_ok=True)
                output_audio_path = f"static/audio/response_{session_id}_{int(time.time())}.mp3"
                tts_response.stream_to_file(output_audio_path)
                
                response_data['audio_url'] = f'/{output_audio_path}'
                
            except Exception as tts_error:
                print(f"TTS Error: {str(tts_error)}")
                response_data['error'] = 'Could not generate audio'
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error in process_message: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/sleep_data', methods=['POST'])
def update_sleep_data():
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id or session_id not in user_sessions:
            return jsonify({'error': 'Invalid session', 'success': False}), 400
            
        user_session = user_sessions[session_id]
        
        # Initialize sleep pattern if it doesn't exist
        if not user_session.sleep_pattern:
            user_session.sleep_pattern = SleepPattern()
        
        # Update sleep pattern fields if provided
        if 'bedtime' in data:
            user_session.sleep_pattern.bedtime = data['bedtime']
        if 'wake_time' in data:
            user_session.sleep_pattern.wake_time = data['wake_time']
        if 'sleep_quality' in data:
            user_session.sleep_pattern.sleep_quality = int(data['sleep_quality'])
        if 'sleep_notes' in data:
            user_session.sleep_pattern.sleep_notes = data['sleep_notes']
        
        # Update last modified time
        user_session.sleep_pattern.created_at = datetime.now().isoformat()
        
        return jsonify({
            'success': True,
            'sleep_data': asdict(user_session.sleep_pattern)
        })
        
    except Exception as e:
        print(f"Error updating sleep data: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/sleep_analysis', methods=['GET'])
def get_sleep_analysis():
    try:
        session_id = request.args.get('session_id')
        
        if not session_id or session_id not in user_sessions:
            return jsonify({'error': 'Invalid session', 'success': False}), 400
            
        user_session = user_sessions[session_id]
        
        if not user_session.sleep_pattern:
            return jsonify({
                'success': True,
                'has_data': False,
                'message': 'No sleep data available for analysis'
            })
        
        analysis = get_sleep_analysis(user_session.sleep_pattern)
        
        return jsonify({
            'success': True,
            'has_data': True,
            'analysis': analysis
        })
        
    except Exception as e:
        print(f"Error in sleep analysis: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

if __name__ == '__main__':
    # Create necessary directories if they don't exist
    os.makedirs('static/audio', exist_ok=True)
    
    # Get port from environment variable or default to 5000
    port = int(os.environ.get('PORT', 5000))
    
    # Run the app
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_ENV') != 'production')
