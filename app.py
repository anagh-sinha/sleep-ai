import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from openai import OpenAI
import json
import time

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Store conversation history
conversation_history = [
    {"role": "system", "content": "You are a soothing sleep assistant. Help the user relax and fall asleep with calming words, guided meditations, or bedtime stories. Speak in a gentle, peaceful tone."}
]

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/transcribe_audio', methods=['POST'])
def transcribe_audio():
    try:
        # Get the audio file from the request
        audio_file = request.files.get('audio')
        
        # Save the audio file temporarily
        audio_path = 'temp_audio.webm'
        audio_file.save(audio_path)
        
        # Transcribe the audio using Whisper
        with open(audio_path, 'rb') as f:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=f
            )
        
        # Clean up the temporary file
        if os.path.exists(audio_path):
            os.remove(audio_path)
        
        return jsonify({
            'text': transcript.text,
            'success': True
        })
        
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/process_audio', methods=['POST'])
def process_audio():
    try:
        # Get the user's message from the request
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Add user message to conversation history
        conversation_history.append({"role": "user", "content": user_message})
        
        # Get response from GPT-3.5-turbo
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=conversation_history,
            temperature=0.7,
            max_tokens=500
        )
        
        # Get the assistant's response
        assistant_response = response.choices[0].message.content
        
        # Add assistant's response to conversation history
        conversation_history.append({"role": "assistant", "content": assistant_response})
        
        # Generate speech from the response using OpenAI's TTS
        tts_response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=assistant_response
        )
        
        # Save the audio response
        output_audio_path = f"static/audio/response_{int(time.time())}.mp3"
        tts_response.stream_to_file(output_audio_path)
        
        return jsonify({
            'text': assistant_response,
            'audio_url': f'/{output_audio_path}'
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Create necessary directories if they don't exist
    os.makedirs('static/audio', exist_ok=True)
    app.run(debug=True, port=5000, host='0.0.0.0')
