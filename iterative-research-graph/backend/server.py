import os
from flask import Flask, request, jsonify, send_from_directory, Blueprint
from flask_cors import CORS
from .graph import graph

# Define Blueprint for routes
api_bp = Blueprint('api', __name__)

@api_bp.route("/api/research", methods=["POST"])
def run_research():
    data = request.json
    file_path = data.get("file_path") or data.get("topic")
    
    if not file_path:
        return jsonify({"error": "File path or topic is required"}), 400

    try:
        initial_state = {
            "file_path": file_path,
            "categories": "1. Administrative Information, 2. Diagnoses, 3. Hospital Course (Clinical Summary), 4. Key Results",
            "research": "",
            "report": "",
            "audit": "",
            "iterations": 0,
            "status": "Starting"
        }
        
        result = graph.invoke(initial_state)
        return jsonify(result)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@api_bp.route("/", defaults={"path": ""})
@api_bp.route("/<path:path>")
def serve(path):
    # This will be registered on the app, so we need access to app.static_folder
    # We can use current_app or just define it in the create_app function.
    # But since it's a catch-all, it's better to keep it in the main app.
    # For now, I'll move it to a dedicated function that create_app can use.
    from flask import current_app
    if path != "" and os.path.exists(current_app.static_folder + "/" + path):
        return send_from_directory(current_app.static_folder, path)
    else:
        return send_from_directory(current_app.static_folder, "index.html")

def create_app(static_folder="../dist"):
    app = Flask(__name__, static_folder=static_folder)
    app.register_blueprint(api_bp)
    CORS(app)
    return app
