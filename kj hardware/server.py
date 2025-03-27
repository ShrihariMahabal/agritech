from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/low_moisture', methods=['POST'])
def receive_moisture_data():
    if request.is_json:
        try:
            data = request.get_json()
            moisture_level = data.get('moisture')
            print(f"Received moisture level: {moisture_level}%")

            # Here you would typically perform your backend logic,
            # such as saving the data to a database, triggering notifications, etc.

            return jsonify({"message": "Moisture data received successfully!"}), 200
        except Exception as e:
            return jsonify({"error": "Invalid JSON data"}), 400
    else:
        return jsonify({"error": "Request must be JSON"}), 400

if __name__ == '__main__':
    # In a real deployment, you might want to use a more robust server
    # like Gunicorn or uWSGI. However, for a simple demo, the Flask
    # development server is sufficient.
    app.run(debug=True, host='0.0.0.0', port=8080)