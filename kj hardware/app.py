import serial
import time
import requests

# --- Configuration ---
SERIAL_PORT = '/dev/cu.usbserial-110'  # Replace with your Arduino's serial port
BAUD_RATE = 9600
API_ENDPOINT = 'http://localhost:8080/api/low_moisture'  # Replace with your backend API endpoint
MOISTURE_THRESHOLD = 10
# -----------------------

try:
    arduino_serial = serial.Serial(SERIAL_PORT, BAUD_RATE)
    print(f"Successfully connected to Arduino on port {SERIAL_PORT}")
    time.sleep(2)  # Give the serial port some time to initialize

    while True:
        if arduino_serial.in_waiting > 0:
            line = arduino_serial.readline().decode('utf-8').strip()
            if line.startswith("Moisture Percentage"):
                try:
                    moisture_str = line.split("=")[1].strip().split("%")[0].strip()
                    moisture_level = float(moisture_str)
                    print(f"Current Moisture Level: {moisture_level}%")

                    if moisture_level > MOISTURE_THRESHOLD:
                        print(f"Moisture level above threshold ({MOISTURE_THRESHOLD}%)! Sending API request...")
                        try:
                            response = requests.post(API_ENDPOINT, json={'moisture': moisture_level})  # Or requests.get(), depending on your API
                            response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
                            print(f"API request sent successfully. Response: {response.text}")
                        except requests.exceptions.RequestException as e:
                            print(f"Error sending API request: {e}")
                    time.sleep(1)  # Wait for a bit before checking again
                except (ValueError, IndexError) as e:
                    print(f"Error parsing serial data: {e} - Line: {line}")

except serial.SerialException as e:
    print(f"Could not open serial port {SERIAL_PORT}: {e}")
except KeyboardInterrupt:
    print("Exiting...")
finally:
    if 'arduino_serial' in locals() and arduino_serial.is_open:
        arduino_serial.close()
        print("Serial port closed.")