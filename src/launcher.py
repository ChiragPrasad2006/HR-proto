import os
import subprocess
import webbrowser
import time
import base64

# --- CONFIG ---
XAMPP_PATH = r"C:/xampp"
KEY_PATH   = "C:/xampp/htdocs/hr-proto/src/keys/aes_key.b64"
APP_URL    = "http://192.168.1.24/hr-proto/src/login.html"  #change to your server's IP
# --------------

def generate_aes_key():
    if not os.path.exists(KEY_PATH):
        print("🔑 No AES key found. Generating new key...")
        os.makedirs(os.path.dirname(KEY_PATH), exist_ok=True)
        key = os.urandom(32)  # 256-bit AES key
        with open(KEY_PATH, "wb") as f:
            f.write(base64.b64encode(key))
        print("AES key generated and saved to", KEY_PATH)
    else:
        print("AES key already exists.")

def start_apache():
    apache_start = os.path.join(XAMPP_PATH, "apache_start.bat")
    if not os.path.exists(apache_start):
        print("Apache start script not found at", apache_start)
        return
    print("starting Apache server...")
    subprocess.Popen(["cmd", "/c", apache_start], creationflags=subprocess.CREATE_NEW_CONSOLE)
    time.sleep(3)

def open_browser():
    print("Opening browser:", APP_URL)
    webbrowser.open(APP_URL)

if __name__ == "__main__":
    generate_aes_key()
    start_apache()
    open_browser()
    print("All done. Close this window to stop.")
