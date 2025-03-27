from flask import Flask, request, jsonify
import tensorflow as tf
import numpy as np
from tensorflow.lite.python.interpreter import Interpreter
from tensorflow.keras.preprocessing.image import load_img, img_to_array
import io
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Database connection
client = MongoClient("mongodb+srv://deep:1234@farmerapp.hlgpgzu.mongodb.net/farmerApp?retryWrites=true&w=majority&appName=FarmerApp")
db = client["farmerApp"]
collection = db["solutions"]

# Load labels
with open('labels.txt', 'r') as f:
    labels = [line.strip() for line in f.readlines()]

# Function to get solution from database

def get_disease_solution(disease_name):
    formatted_disease_name = disease_name.title()
    result = collection.find_one(
        {"disease": formatted_disease_name},
        {"_id": 0, "management": 1, "fungicides": 1, "fertilizers": 1, "pesticides": 1}
    )
    
    if result:
        return result  # Return dictionary (Flask will jsonify it automatically)
    
    return {"error": "Solution not found."}  # Return dictionary (not Response)



# Load the TFLite model
interpreter = Interpreter(model_path='model.tflite')
interpreter.allocate_tensors()

# Get input and output details
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Function to preprocess the image
def preprocess_image(image_data):
    image = load_img(io.BytesIO(image_data), target_size=(200, 200))  # Load image from bytes
    image = img_to_array(image) / 255.0  # Normalize
    image = np.expand_dims(image, axis=0).astype(np.float32)  # Add batch dimension
    return image

# Predict function
def predict_disease(image_data):
    img = preprocess_image(image_data)
    interpreter.set_tensor(input_details[0]['index'], img)
    interpreter.invoke()
    predictions = interpreter.get_tensor(output_details[0]['index'])
    class_idx = np.argmax(predictions)
    disease_name = labels[class_idx]  # Get predicted disease name
    solution = get_disease_solution(disease_name)  # Fetch solution from database
    return {"disease": disease_name, "solution": solution}

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file'].read()  # Read image data
    result = predict_disease(file)
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
