from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from groq import Groq
import os
import json
from dotenv import load_dotenv

# ================= LOAD ENV =================
load_dotenv()

# ================= CREATE APP =================
app = Flask(__name__)
CORS(app)

# ================= GROQ SETUP =================
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
GROQ_MODEL = "llama-3.1-8b-instant"

# ================= PATHS =================
BASE_DIR = os.path.dirname(__file__)
SFX_DIR = os.path.join(BASE_DIR, "sfx")

# ================= SERVE STATIC FILES =================

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory('images', filename)

@app.route('/audio/<path:filename>')
def serve_audio(filename):
    return send_from_directory('audio', filename)

@app.route("/sfx/<filename>")
def serve_sfx(filename):
    path = os.path.join(SFX_DIR, filename)

    if not os.path.exists(path):
        return jsonify({"error": "SFX not found"}), 404

    return send_file(path, mimetype="audio/mpeg")

# ================= SFX MAP =================

SFX_MAP = {
    "happy": "assistant_giggle.mp3",
    "blush": "assistant_blush.mp3",
    "sad": "assistant_sad.mp3",
    "angry": "assistant_angry.mp3",
    "surprised": "assistant_surprised.mp3",
    "laughing": "assistant_laugh.mp3",
}

# ================= MEMORY =================

user_conversations = {}

# ================= CHAT ROUTE =================

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()
        user_id = data.get("user_id", "default")

        if not user_message:
            return jsonify({"error": "No message provided"}), 400

        if user_id not in user_conversations:
            user_conversations[user_id] = []

        user_conversations[user_id].append({
            "role": "user",
            "content": user_message
        })

        messages = [
            {
                "role": "system",
                "content": (
                    "You are Aira, a 2D anime virtual assistant. "
                    "You are elegant, intelligent, warm, and playful. "
                    "Always respond in English.\n\n"
                    "Respond ONLY in JSON format:\n"
                    "{\n"
                    ' "emotion": "<emotion>",\n'
                    ' "reply": "<response>"\n'
                    "}\n\n"
                    "Valid emotions:\n"
                    "neutral, happy, blush, sad, angry, surprised, laughing"
                )
            }
        ] + user_conversations[user_id]

        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            max_tokens=200,
            temperature=0.8
        )

        raw = response.choices[0].message.content.strip()

        try:
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]

            parsed = json.loads(raw.strip())

            emotion = parsed.get("emotion", "neutral")
            reply = parsed.get("reply", "")

        except json.JSONDecodeError:
            emotion = "neutral"
            reply = raw

        valid_emotions = [
            "neutral", "happy", "blush",
            "sad", "angry", "surprised", "laughing"
        ]

        if emotion not in valid_emotions:
            emotion = "neutral"

        user_conversations[user_id].append({
            "role": "assistant",
            "content": reply
        })

        # limit memory
        if len(user_conversations[user_id]) > 20:
            user_conversations[user_id] = user_conversations[user_id][-20:]

        sfx_file = SFX_MAP.get(emotion)
        sfx_url = f"/sfx/{sfx_file}" if sfx_file else None

        return jsonify({
            "reply": reply,
            "emotion": emotion,
            "sfx": sfx_url
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ================= RUN SERVER =================

if __name__ == "__main__":
    app.run(debug=True)