from flask import Flask, request, jsonify
from flask_cors import CORS
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import threading
import time

app = Flask(__name__)
CORS(app)

class BrowserSession:
    def __init__(self):
        self.driver = None
        self.lock = threading.Lock()

browser_session = BrowserSession()

@app.route('/apply-loan', methods=['POST'])
def apply_loan():
    try:
        data = request.json
        required_fields = ['firstName', 'lastName', 'pincode', 'loanAmount']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"success": False, "message": f"Missing required field: {field}"})
        
        def launch_browser():
            with browser_session.lock:
                if browser_session.driver:
                    try:
                        browser_session.driver.quit()
                    except:
                        pass
                
                options = webdriver.ChromeOptions()
                options.add_argument('--no-sandbox')
                options.add_argument('--disable-dev-shm-usage')
                browser_session.driver = webdriver.Chrome(options=options)
                driver = browser_session.driver
                wait = WebDriverWait(driver, 10)
                
                driver.get("https://www.tvscredit.com/loans/online-personal-loans/apply-now/")
                
                # Fill form fields
                wait.until(EC.presence_of_element_located((By.NAME, "firstname"))).send_keys(data["firstName"])
                wait.until(EC.presence_of_element_located((By.NAME, "lastname"))).send_keys(data["lastName"])
                
                pincode_field = wait.until(EC.presence_of_element_located((By.NAME, "pincode")))
                pincode_field.send_keys(data["pincode"])
                pincode_field.send_keys(Keys.ENTER)
                
                wait.until(EC.presence_of_element_located((By.NAME, "loanamount"))).send_keys(data["loanAmount"])
                
                mobile_field = wait.until(EC.presence_of_element_located((By.NAME, "mobile_number")))
                mobile_field.send_keys("8879628253")
                mobile_field.send_keys(Keys.ENTER)
                
                # Wait for OTP button with multiple strategies
                time.sleep(3)  # Increased wait time
                
                try:
                    # Try normal click first
                    otp_button = wait.until(EC.element_to_be_clickable((By.ID, "getotp")))
                    otp_button.click()
                except:
                    try:
                        # Try JavaScript click if normal click fails
                        otp_button = wait.until(EC.presence_of_element_located((By.ID, "getotp")))
                        driver.execute_script("arguments[0].click();", otp_button)
                    except:
                        # Last resort: force click with JavaScript
                        driver.execute_script("""
                            document.querySelector('#getotp').click();
                        """)
                
                print("Browser launched and ready for OTP")
        
        threading.Thread(target=launch_browser, daemon=True).start()
        time.sleep(3)
        
        return jsonify({"success": True, "message": "Please enter OTP"})
            
    except Exception as e:
        print(f"Apply Loan Error: {str(e)}")
        return jsonify({"success": False, "message": f"Server error: {str(e)}"})

@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    try:
        data = request.json
        if 'otp' not in data or not data['otp']:
            return jsonify({"success": False, "message": "OTP is required"})
        
        with browser_session.lock:
            if not browser_session.driver:
                return jsonify({"success": False, "message": "No active browser session"})
            
            driver = browser_session.driver
            wait = WebDriverWait(driver, 20)  # Increased timeout
            
            try:
                # Wait for OTP field and fill
                otp_field = wait.until(EC.presence_of_element_located((By.ID, "otpfield")))
                driver.execute_script("arguments[0].value = arguments[1];", otp_field, data['otp'])
                driver.execute_script("arguments[0].dispatchEvent(new Event('input', { bubbles: true }));", otp_field)
                
                # Scroll to consent checkbox
                consent_checkbox = wait.until(EC.presence_of_element_located((By.NAME, "consent")))
                driver.execute_script("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", consent_checkbox)
                time.sleep(1)  # Wait for scroll
                
                # Check consent using JavaScript
                if not consent_checkbox.is_selected():
                    driver.execute_script("arguments[0].click();", consent_checkbox)
                time.sleep(1)  # Wait after checkbox
                
                # Find and scroll to submit button
                submit_button = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "button#submit_disbale.green_btn")))
                driver.execute_script("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", submit_button)
                time.sleep(1)  # Wait for scroll
                
                # Click submit using JavaScript
                driver.execute_script("arguments[0].click();", submit_button)
                
                # Wait for submission
                time.sleep(5)
                
            finally:
                # Clean up
                driver.quit()
                browser_session.driver = None
            
            return jsonify({"success": True, "message": "Loan application submitted successfully"})
            
    except Exception as e:
        print(f"Verify OTP Error: {str(e)}")
        # Clean up on error
        try:
            if browser_session.driver:
                browser_session.driver.quit()
                browser_session.driver = None
        except:
            pass
        return jsonify({"success": False, "message": f"Server error: {str(e)}"})

@app.route('/close-browser', methods=['POST'])
def close_browser():
    try:
        with browser_session.lock:
            if browser_session.driver:
                browser_session.driver.quit()
                browser_session.driver = None
        return jsonify({"success": True, "message": "Browser closed successfully"})
    except Exception as e:
        print(f"Error closing browser: {str(e)}")
        return jsonify({"success": False, "message": f"Error closing browser: {str(e)}"})

if __name__ == "__main__":
    app.run(debug=False, host='0.0.0.0', port=5001)  # debug=False for better thread handling