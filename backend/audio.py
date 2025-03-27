from flask import Flask, request, jsonify
import whisper
import os

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load Whisper model
model = whisper.load_model("small")

# Dictionary to store file paths
file_store = {}

@app.route("/upload", methods=["POST"])
def upload_audio():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files["audio"]
    file_path = os.path.join(UPLOAD_FOLDER, audio_file.filename)
    audio_file.save(file_path)
    
    # Store the file path for later transcription
    file_store[audio_file.filename] = file_path
    
    return jsonify({"message": "File uploaded successfully", "filename": audio_file.filename})

@app.route("/transcribe", methods=["GET"])
def transcribe_audio():
    filename = request.args.get("filename")
    
    if not filename or filename not in file_store:
        return jsonify({"error": "Invalid or missing filename"}), 400
    
    file_path = file_store[filename]
    
    # Transcribe the audio
    result = model.transcribe(file_path)
    transcript = result["text"]
    
    return jsonify({"filename": filename, "transcript": transcript})

if __name__ == "__main__":
    app.run(debug=True)
