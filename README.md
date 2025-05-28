# Sleep AI - Your Personal Sleep Assistant

A web application that helps users improve their sleep quality through AI-powered assistance.

## Features
- Voice-based interaction
- Sleep tracking and analysis
- Personalized sleep recommendations
- Audio responses for a better user experience

## Deployment Instructions

### Prerequisites
- Python 3.9 or higher
- Render account (free tier available)
- OpenAI API key

### Deploying to Render

1. **Create a new Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New" and select "Web Service"
   - Connect your GitHub/GitLab repository or use the Render CLI

2. **Configure Environment Variables**
   - Add your OpenAI API key as an environment variable:
     - `OPENAI_API_KEY`: Your OpenAI API key
   - Set `FLASK_ENV=production`

3. **Build Settings**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`

4. **Deploy**
   - Click "Create Web Service"
   - Wait for the build to complete
   - Your app will be live at the provided URL

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
4. Run the application:
   ```
   python app.py
   ```
5. Open http://localhost:5000 in your browser

## License
MIT
