import requests
import json
from datetime import datetime, timedelta
import random

def generate_dummy_sleep_data():
    """Generate realistic dummy sleep data for testing."""
    now = datetime.now()
    end_time = now.replace(hour=7, minute=0, second=0, microsecond=0)
    start_time = end_time - timedelta(hours=8)  # 8 hours of sleep
    
    # Generate sleep stages with realistic distribution
    stages = [
        {"stage": "awake", "duration": 30, "count": 3},
        {"stage": "light", "duration": 240, "count": 5},
        {"stage": "deep", "duration": 90, "count": 3},
        {"stage": "rem", "duration": 120, "count": 4}
    ]
    
    sleep_data = []
    current_time = start_time
    
    for stage in stages:
        for _ in range(stage['count']):
            duration = stage['duration'] / stage['count']
            end_segment = current_time + timedelta(minutes=duration)
            sleep_data.append({
                'start': current_time.isoformat(),
                'end': end_segment.isoformat(),
                'stage': stage['stage']
            })
            current_time = end_segment
    
    return {
        'sleep': sleep_data,
        'sleep_score': random.randint(70, 95),
        'resting_heart_rate': random.uniform(50, 70),
        'hrv_rmssd': random.uniform(20, 100),
        'respiratory_rate': random.uniform(12, 20),
        'temperature_deviation': random.uniform(-0.5, 0.5)
    }

def test_sleep_analysis():
    """Test the sleep analysis endpoint with dummy data."""
    url = 'http://localhost:5000/api/process_sleep_data'
    
    # Generate dummy data
    dummy_data = {
        'source': 'apple_health',
        'data': generate_dummy_sleep_data()
    }
    
    try:
        response = requests.post(url, json=dummy_data)
        response.raise_for_status()
        result = response.json()
        
        print("\n=== Sleep Analysis Results ===")
        print(f"Status: {response.status_code}")
        print("\nSummary:")
        print(result.get('summary', 'No summary available'))
        print("\nAnalysis:")
        print(json.dumps(result.get('analysis', {}), indent=2))
        
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        return None

if __name__ == '__main__':
    test_sleep_analysis()
