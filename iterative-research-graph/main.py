import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env.local
print("Loading dotenv...")
load_dotenv(dotenv_path=".env.local")
from backend.server import create_app

app = create_app(static_folder="../dist")

if __name__ == "__main__":
    print("Starting app...")
    app.run(host="0.0.0.0", port=3000)
