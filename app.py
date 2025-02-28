from flask import Flask, render_template, request, jsonify
import random
import os

app = Flask(__name__)

# List to store topics and their time allocations
topics = []
total_time = 0

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit_topics', methods=['POST'])
def submit_topics():
    global topics, total_time
    
    data = request.get_json()
    topic_names = data.get('topics', [])
    total_time = int(data.get('totalTime', 0))
    
    # Calculate time per topic (divide total time equally among topics)
    if len(topic_names) > 0:
        time_per_topic = total_time / len(topic_names)
    else:
        time_per_topic = 0
    
    # Create topics list with names and time
    topics = [{"name": name, "time": time_per_topic} for name in topic_names]
    
    return jsonify({"success": True, "message": "Topics saved successfully"})

@app.route('/get_random_topic', methods=['GET'])
def get_random_topic():
    if not topics:
        return jsonify({"success": False, "message": "No topics available"})
    
    # Get the last topic name from request query parameter
    last_topic = request.args.get('last_topic', None)
    
    # If only one topic is left, return it
    if len(topics) == 1:
        return jsonify({
            "success": True,
            "topic": topics[0]["name"],
            "time": topics[0]["time"]
        })
    
    # Filter out the last topic to avoid repetition
    available_topics = [topic for topic in topics if topic["name"] != last_topic]
    
    # If all topics have been used and only the last topic remains, reset and use all topics
    if not available_topics and last_topic:
        available_topics = topics
    
    # Select a random topic from available ones
    random_topic = random.choice(available_topics)
    
    return jsonify({
        "success": True,
        "topic": random_topic["name"],
        "time": random_topic["time"]
    })

@app.route('/get_all_topics', methods=['GET'])
def get_all_topics():
    return jsonify({
        "success": True,
        "topics": topics,
        "totalTime": total_time
    })

if __name__ == '__main__':
    app.run(debug=True)