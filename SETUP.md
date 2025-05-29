# 🌙 Somni Sleep Assistant - Setup Guide

## Quick Start

### 1. Install Python Dependencies

```bash
# Install required packages
pip install flask openai python-dotenv

# Or use pip3 if you have multiple Python versions
pip3 install flask openai python-dotenv
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root with your OpenAI API key:

```bash
OPENAI_API_KEY=your_openai_api_key_here
FLASK_SECRET_KEY=your_secret_key_here
```

### 3. Run the Application

```bash
# Start the development server
python3 app.py

# Or if python3 doesn't work, try:
python app.py
```

The app will be available at: `http://localhost:5000`

## Environment Requirements

- **Python 3.8+**
- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **HTTPS or localhost** (required for microphone access)
- **OpenAI API key** (get one at https://platform.openai.com/)

## Troubleshooting

### Microphone Issues

1. **Permission Denied**: Allow microphone access in your browser
2. **HTTPS Required**: Use `localhost` for development or deploy with HTTPS
3. **No Audio Device**: Check your system's audio settings

### Installation Issues

```bash
# If pip is not found, install it:
python3 -m ensurepip --upgrade

# If you get permission errors, use:
pip3 install --user flask openai python-dotenv

# For virtual environment (recommended):
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install flask openai python-dotenv
```

### OpenAI API Issues

1. **Invalid API Key**: Check your `.env` file
2. **Rate Limits**: Wait a moment and try again
3. **Billing**: Ensure your OpenAI account has credits

## Features Included

✅ **Voice-to-Voice Interaction**
- Real-time speech recognition
- Natural AI responses
- High-quality text-to-speech

✅ **Beautiful UI**
- Modern, sleep-themed design
- Responsive layout for all devices
- Smooth animations and transitions

✅ **Sleep-Focused Features**
- Meditation guidance
- Bedtime stories
- Breathing exercises
- Calming conversation

✅ **Cross-Platform Compatibility**
- Works on desktop, tablet, and mobile
- Progressive Web App capabilities
- Offline-friendly design

## Development Mode

For development with auto-reload:

```bash
export FLASK_ENV=development  # On Windows: set FLASK_ENV=development
python3 app.py
```

## Production Deployment

The app is ready for deployment on platforms like:
- Render.com
- Heroku
- Vercel
- Railway

See `render.yaml` and `Procfile` for deployment configuration.

## File Structure

```
Sleep-AI/
├── app.py              # Main Flask application
├── requirements.txt    # Python dependencies
├── .env               # Environment variables (create this)
├── static/
│   ├── css/style.css  # Styles
│   ├── js/main.js     # JavaScript
│   └── images/        # Images and icons
├── templates/
│   └── index.html     # Main HTML template
└── SETUP.md          # This file
```

## Support

If you encounter any issues:

1. Check the browser console for JavaScript errors
2. Check the terminal for Python errors
3. Ensure your OpenAI API key is valid
4. Try a different browser or device

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables for all secrets
- Consider using HTTPS in production
- Regularly rotate your API keys