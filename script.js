// ================= USER ID =================
let USER_ID = sessionStorage.getItem("aira_user_id");
if (!USER_ID) {
  USER_ID = "user_" + Math.random().toString(36).substr(2, 9);
  sessionStorage.setItem("aira_user_id", USER_ID);
}

// ================= MODE SELECTION =================
let selectedMode = "voice";

function selectMode(mode) {
  selectedMode = mode;
  document.getElementById("voiceBtn").classList.toggle("active", mode === "voice");
  document.getElementById("textBtn").classList.toggle("active",  mode === "text");
}

function switchToChatMode() {
  selectedMode = "text";
  if (recognition) {
    isListening = false;
    try { recognition.abort(); } catch(e) {}
  }
  applyMode();
}

function switchToVoiceMode() {
  selectedMode = "voice";
  applyMode();
  updateMicStatus("🎤 Listening...");
  startContinuousListening();
}

function applyMode() {
  const isVoice = selectedMode === "voice";

  const textInputArea  = document.getElementById("textInputArea");
  const textModeFooter = document.getElementById("textModeFooter");
  const voiceControls  = document.getElementById("voiceControls");
  const indicator      = document.getElementById("modeIndicator");

  if (textInputArea)  textInputArea.style.display  = isVoice ? "none"  : "flex";
  if (textModeFooter) textModeFooter.style.display = isVoice ? "none"  : "flex";
  if (voiceControls)  voiceControls.style.display  = isVoice ? "flex"  : "none";
  if (indicator)      indicator.innerText           = isVoice ? "🎤 Voice" : "⌨️ Text";

  if (!isVoice) {
    setTimeout(() => {
      const input = document.getElementById("userInput");
      if (input) input.focus();
    }, 100);
  }
}

// ================= AVATAR =================
const assistant = document.getElementById("assistant");

function setExpression(mood) {
  if (!assistant) return;
  const img = new Image();
  img.onload  = () => { assistant.src = img.src; };
  img.onerror = () => { assistant.src = "images/assistant_neutral.png"; };
  img.src = `images/assistant_${mood}.png`;
}

function updateMicStatus(text) {
  const el = document.getElementById("micStatus");
  if (el) el.innerText = text;
}

// ================= BROWSER TTS =================
let speaking = false;

function speakWithBrowser(text, onDone) {
  speaking = true;
  const container = document.querySelector(".avatar-container");
  if (container) container.classList.add("avatar-speaking");

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate   = 1.1;
  utter.pitch  = 0.85;
  utter.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.name.includes("Google UK English Female") ||
    v.name.includes("Microsoft Zira")           ||
    v.name.includes("Samantha")                 ||
    v.name.includes("Google US English")
  );
  if (preferred) utter.voice = preferred;

  let lipInterval = setInterval(() => {
    const t = Math.random() > 0.5 ? "talk1" : "talk2";
    if (assistant) assistant.src = `images/assistant_${t}.png`;
  }, 120);

  utter.onend = () => {
    clearInterval(lipInterval);
    speaking = false;
    const container = document.querySelector(".avatar-container");
    if (container) container.classList.remove("avatar-speaking");
    setExpression("neutral");
    if (onDone) onDone();
  };

  utter.onerror = () => {
    clearInterval(lipInterval);
    speaking = false;
    const container = document.querySelector(".avatar-container");
    if (container) container.classList.remove("avatar-speaking");
    setExpression("neutral");
    if (onDone) onDone();
  };

  window.speechSynthesis.speak(utter);
}

// ================= PLAY SFX THEN SPEAK =================
function playSFXThenSpeak(sfxUrl, text, emotion) {
  updateMicStatus("🔊 Speaking...");
  const sfx = new Audio("http://127.0.0.1:5000" + sfxUrl);

  const startSpeaking = () => {
    speakWithBrowser(text, () => {
      setExpression(emotion);
      setTimeout(() => {
        setExpression("neutral");
        if (selectedMode === "voice") restartListening();
      }, 1500);
    });
  };

  sfx.onended = startSpeaking;
  sfx.onerror = startSpeaking;
  sfx.play().catch(startSpeaking);
}

function speakResponse(text, emotion) {
  updateMicStatus("🔊 Speaking...");
  speakWithBrowser(text, () => {
    setExpression(emotion);
    setTimeout(() => {
      setExpression("neutral");
      if (selectedMode === "voice") restartListening();
    }, 1500);
  });
}

// ================= INTRO =================
function animateIntroText() {
  const el = document.getElementById("introText");
  if (!el) return;
  const lines = ["HELLO.", "I AM AIRA.", "YOUR AI COMPANION."];
  let index = 0;
  function showNext() {
    el.style.opacity = 0;
    setTimeout(() => {
      el.innerText     = lines[index];
      el.style.opacity = 0.06;
      index = (index + 1) % lines.length;
    }, 800);
  }
  showNext();
  setInterval(showNext, 4000);
}

function speakIntro(text) {
  speakWithBrowser(text, null);
}

function startBlinking() {
  const introImage = document.querySelector(".intro-img");
  if (!introImage) return;
  function blink() {
    introImage.src = "images/assistant_blink.png";
    setTimeout(() => { introImage.src = "images/assistant_neutral.png"; }, 150);
  }
  function randomBlink() {
    setTimeout(() => { blink(); randomBlink(); }, Math.random() * 4000 + 3000);
  }
  randomBlink();
}

window.addEventListener("DOMContentLoaded", () => {
  animateIntroText();
  startBlinking();
  document.addEventListener("click", () => {
    speakIntro("Hello. I am Aira. Your AI companion.");
  }, { once: true });
});

// ================= AMBIENT SOUND =================
const ambient = document.getElementById("ambientSound");
function startAmbient() {
  if (!ambient) return;
  ambient.volume = 0.3;
  ambient.play().catch(() => {});
}
document.addEventListener("click",     startAmbient, { once: true });
document.addEventListener("mousemove", startAmbient, { once: true });

// ================= SCREEN SWITCH =================
function startChat() {
  const intro = document.getElementById("introScreen");
  const chat  = document.getElementById("chatScreen");

  if (ambient) {
    let fade = setInterval(() => {
      if (ambient.volume > 0.05) ambient.volume -= 0.05;
      else { ambient.volume = 0; ambient.pause(); clearInterval(fade); }
    }, 100);
  }

  intro.classList.add("hidden");
  chat.classList.remove("hidden");

  applyMode();
  if (selectedMode === "voice") startContinuousListening();
}

// ================= RESPONSE PARSER (THE KEY FIX) =================
/*
  Flask may return any of these shapes:
  1. { reply: "Hello!", emotion: "happy", sfx: null }          ← ideal
  2. { reply: '{"reply":"Hello!","emotion":"happy"}', ... }    ← double-encoded
  3. '{"reply":"Hello!","emotion":"happy"}'                    ← raw JSON string
  4. "Hello!"                                                   ← plain string fallback
*/
function parseResponse(raw) {
  // Step 1: if it's already a plain object, try to unwrap double-encoded reply
  if (raw && typeof raw === "object") {
    // Check if reply is itself a JSON string (double-encoded)
    if (typeof raw.reply === "string") {
      try {
        const inner = JSON.parse(raw.reply);
        if (inner && typeof inner === "object" && inner.reply) {
          return {
            reply:   inner.reply,
            emotion: inner.emotion || raw.emotion || "neutral",
            sfx:     inner.sfx     || raw.sfx     || null
          };
        }
      } catch(e) { /* not JSON, use as-is */ }
    }
    // Normal object with reply key
    if (raw.reply) return raw;
  }

  // Step 2: raw is a string — try parsing it as JSON
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        // Might still be double-encoded one more level
        if (typeof parsed.reply === "string") {
          try {
            const inner = JSON.parse(parsed.reply);
            if (inner && inner.reply) return inner;
          } catch(e) {}
        }
        return parsed;
      }
    } catch(e) {}
    // Plain string — treat as reply text
    return { reply: raw, emotion: "neutral", sfx: null };
  }

  return { reply: "I didn't understand that.", emotion: "neutral", sfx: null };
}

// ================= CHAT LOGIC =================
async function processMessage(message) {
  const chatBox = document.getElementById("chatBox");
  if (!message || !message.trim()) return;

  // User bubble
  const userMsg = document.createElement("div");
  userMsg.classList.add("message", "user");
  userMsg.innerText = message;
  chatBox.appendChild(userMsg);
  chatBox.scrollTop = chatBox.scrollHeight;

  setExpression("thinking");
  updateMicStatus("💭 Thinking...");

  // Typing indicator
  const loading = document.createElement("div");
  loading.classList.add("message", "bot");
  loading.innerText = "Aira is thinking...";
  chatBox.appendChild(loading);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await fetch("http://127.0.0.1:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, user_id: USER_ID })
    });

    const raw = await res.json();
    loading.remove();

    const data     = parseResponse(raw);
    const replyText = data.reply   || "I didn't understand that.";
    const emotion   = data.emotion || "neutral";
    const sfx       = data.sfx     || null;

    appendBotMessage(chatBox, replyText);
    setExpression(emotion);

    if (sfx) {
      playSFXThenSpeak(sfx, replyText, emotion);
    } else {
      speakResponse(replyText, emotion);
    }

  } catch(err) {
    loading.remove();
    appendBotMessage(chatBox, "Server error. Is Flask running?");
    setExpression("sad");
    if (selectedMode === "voice") restartListening();
  }
}

function appendBotMessage(chatBox, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", "bot");
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function sendMessage() {
  const inputBox = document.getElementById("userInput");
  if (!inputBox || !inputBox.value.trim()) return;
  const message = inputBox.value.trim();
  inputBox.value = "";
  processMessage(message);
}

// ================= VOICE RECOGNITION =================
let recognition;
let isListening = false;

function startContinuousListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Speech recognition not supported in this browser");
    updateMicStatus("Voice not supported");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang            = "en-IN";
  recognition.continuous      = false;
  recognition.interimResults  = false;

  recognition.start();
  isListening = true;
  updateMicStatus("🎤 Listening...");

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    isListening = false;
    recognition.stop();
    processMessage(transcript);
  };

  recognition.onerror = (event) => {
    console.log("Speech error:", event.error);
    isListening = false;
    if (selectedMode === "voice") restartListening();
  };

  recognition.onend = () => {
    if (selectedMode !== "voice") return;
    if (isListening) restartListening();
  };
}

function restartListening() {
  if (selectedMode !== "voice") return;
  isListening = false;
  updateMicStatus("🎤 Listening...");
  setTimeout(() => {
    if (selectedMode !== "voice") return;
    startContinuousListening();
  }, 600);
}

// ================= PARTICLE BUTTON EFFECT =================
const startBtn    = document.getElementById("startBtn");
const introScreen = document.getElementById("introScreen");
if (startBtn && introScreen) {
  startBtn.addEventListener("mouseenter", () => introScreen.style.setProperty("--particle-opacity", "0.8"));
  startBtn.addEventListener("mouseleave", () => introScreen.style.setProperty("--particle-opacity", "0.4"));
}

// ================= VOICE RING CANVAS =================
const canvas = document.getElementById("voiceRing");
if (canvas) {
  const ctx    = canvas.getContext("2d");
  canvas.width  = 380;
  canvas.height = 380;

  function drawRing() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!speaking) { requestAnimationFrame(drawRing); return; }

    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;
    const radius = 120;

    ctx.beginPath();
    for (let i = 0; i < 360; i += 4) {
      const rad   = i * Math.PI / 180;
      const noise = Math.random() * 10;
      const r     = radius + noise;
      const x     = cx + Math.cos(rad) * r;
      const y     = cy + Math.sin(rad) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(200,140,255,0.7)";
    ctx.lineWidth   = 3;
    ctx.stroke();
    requestAnimationFrame(drawRing);
  }

  drawRing();
}