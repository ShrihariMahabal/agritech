from flask import Flask, request, jsonify
import tensorflow as tf
import numpy as np
from tensorflow.lite.python.interpreter import Interpreter
from tensorflow.keras.preprocessing.image import load_img, img_to_array
import io
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import requests
load_dotenv()
API_KEY = os.getenv("OPENWEATHER_API_KEY")

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
import os
import requests
from flask import Flask, jsonify
from dotenv import load_dotenv

# Load API key from .env file
load_dotenv()
WEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")  # Changed variable name

app = Flask(__name__)
@app.route("/soil", methods=["GET"])
def get_soil_data():
    try:
        # Hardcoded Polygon ID
        polyid = "67e5cfb66ceee5f587c2066a"

        if not API_KEY:
            return jsonify({"error": "API key is missing"}), 500

        url = f"http://api.agromonitoring.com/agro/1.0/soil?polyid={polyid}&appid={API_KEY}"
        response = requests.get(url)
        data = response.json()

        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch soil data", "details": data}), 500

        return jsonify({
            "surface_temperature": data["t0"],
            "temperature_10cm_depth": data["t10"],
            "soil_moisture": data["moisture"],
            "timestamp": data["dt"]
        })

    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

NPK_THRESHOLDS = {
    "N": {"low": 0, "normal": 50, "high": 100},
    "P": {"low": 0, "normal": 30, "high": 60},
    "K": {"low": 0, "normal": 40, "high": 80}
}

# Example soil test values
soil_npk_levels = {
    "N": 40,  # Low
    "P": 45,  # Normal
    "K": 30   # Low
}

# Function to classify NPK levels
def classify_npk_level(value, nutrient):
    thresholds = NPK_THRESHOLDS[nutrient]
    if value < thresholds["normal"]:
        return "low"
    elif value < thresholds["high"]:
        return "normal"
    else:
        return "high"

# Crop-wise ideal NPK needs
crop_npk_db = {
    "Wheat": {"N": "high", "P": "medium", "K": "medium"},
    "Tomato": {"N": "medium", "P": "medium", "K": "high"},
    "Rice": {"N": "high", "P": "medium", "K": "low"},
    "Potato": {"N": "medium", "P": "high", "K": "medium"},
    "Sugarcane": {"N": "medium", "P": "medium", "K": "high"},
    "Corn": {"N": "high", "P": "medium", "K": "medium"},
    "Soybean": {"N": "medium", "P": "high", "K": "medium"},
    "Cotton": {"N": "medium", "P": "medium", "K": "high"},
    "Peanut": {"N": "low", "P": "high", "K": "medium"},
    "Barley": {"N": "medium", "P": "medium", "K": "medium"}
}

# Fertilizer recommendations database
fertilizer_advice_db = {
    "N": {
        "low": "Apply Urea, Ammonium Nitrate, or Organic Manure to improve nitrogen levels.",
        "normal": "Maintain nitrogen levels with balanced fertilization.",
        "high": "Excess nitrogen may cause excessive leaf growth. Reduce nitrogen fertilizers."
    },
    "P": {
        "low": "Apply DAP (Diammonium Phosphate) or Superphosphate to enhance root growth.",
        "normal": "Maintain phosphorus balance with controlled fertilization.",
        "high": "Excess phosphorus can hinder micronutrient absorption. Reduce phosphorus fertilizers."
    },
    "K": {
        "low": "Apply Potassium Sulfate or Potash-based fertilizers to strengthen plant resistance.",
        "normal": "Maintain potassium balance with organic matter.",
        "high": "Excess potassium may lead to nutrient imbalance. Reduce potassium fertilizers."
    }
}

@app.route("/fertilizer-advice", methods=["POST"])
def get_fertilizer_advice():
    try:
        data = request.json
        farmer_crops = data.get("crops", [])  # List of crops provided by the farmer

        if not farmer_crops:
            return jsonify({"error": "No crops provided"}), 400

        # Classify soil NPK levels
        classified_npk_levels = {
            nutrient: classify_npk_level(soil_npk_levels[nutrient], nutrient)
            for nutrient in ["N", "P", "K"]
        }

        message = (f"Your soil NPK levels: Nitrogen ({soil_npk_levels['N']} - {classified_npk_levels['N']}), "
                   f"Phosphorus ({soil_npk_levels['P']} - {classified_npk_levels['P']}), "
                   f"Potassium ({soil_npk_levels['K']} - {classified_npk_levels['K']}).\n"
                   f"Below is the optimal fertilization advice for your selected crops: {', '.join(farmer_crops)}.")

        advice = {}
        
        for crop in farmer_crops:
            if crop in crop_npk_db:
                npk_needs = crop_npk_db[crop]
                crop_advice = []

                for nutrient in ["N", "P", "K"]:
                    level = classified_npk_levels[nutrient]
                    needed_level = npk_needs[nutrient]
                    
                    # General advice based on soil level, even if no immediate action is needed
                    general_advice = fertilizer_advice_db[nutrient][level]
                    
                    # If the soil is deficient and the crop requires that nutrient
                    if level == "low" and needed_level in ["high", "medium"]:
                        crop_advice.append(fertilizer_advice_db[nutrient]["low"])
                    else:
                        crop_advice.append(f"Your {nutrient} levels are {level}. {general_advice}")

                advice[crop] = crop_advice
            else:
                advice[crop] = ["No crop-specific data found. Please consult an agricultural expert."]

        return jsonify({
            "message": message,
            "soil_npk_levels": soil_npk_levels,
            "classified_levels": classified_npk_levels,
            "fertilizer_advice": advice
        })
    
    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
@app.route("/weather", methods=["GET"])
def get_weather():
    try:
        lat = 19.085643531658434
        lon = 72.94097742326917

        if not WEATHER_API_KEY:  # Use the correct API key variable
            return jsonify({"error": "API key is missing"}), 500

        url = f"https://api.agromonitoring.com/agro/1.0/weather?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}"
        response = requests.get(url)
        data = response.json()

        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch weather data", "details": data}), 500

        return jsonify({
            "temperature": data["main"]["temp"],
            "feels_like": data["main"]["feels_like"],
            "humidity": data["main"]["humidity"],
            "pressure": data["main"]["pressure"],
            "weather": data["weather"][0]["description"]
        })

    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
