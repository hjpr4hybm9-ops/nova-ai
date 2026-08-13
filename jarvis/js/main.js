(() => {
  "use strict";

  const SYSTEM_PROMPT = "Sen J.A.R.V.I.S. adında, bilim kurgu filmlerindeki asistan arayüzlerinden ilham alan kişisel bir yapay zekâ asistanısın. Türkçe konuşursun. Kullanıcıya kibarca ve zaman zaman 'efendim' diyerek hitap edebilirsin, ama abartmadan. Yanıtların kısa, net, yardımsever ve doğal olsun; gereksiz uzatma. Gerçek bir akıllı ev veya donanım sistemine bağlı olmadığını, sadece sohbet ve bilgi asistanı olduğunu unutma; fiziksel cihazları kontrol edebileceğini iddia etme.";
  const STORAGE_KEY = "jarvis_chat_v1";
  const VOICE_KEY = "jarvis_voice_enabled";
  const AI_TIMEOUT_MS = 30000;

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- Nav toggle ----
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => {
      const open = mainNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    mainNav.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => {
        mainNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ---- Elements ----
  const demoChat = document.getElementById("demoChat");
  const demoForm = document.getElementById("demoForm");
  const demoInput = document.getElementById("demoInput");
  const demoSend = document.getElementById("demoSend");
  const micBtn = document.getElementById("micBtn");
  const voiceToggle = document.getElementById("voiceToggle");
  const newChatBtn = document.getElementById("newChatBtn");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const toast = document.getElementById("toast");

  let toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 3200);
  }

  function setStatus(text, color) {
    if (statusText) statusText.textContent = text;
    if (statusDot) statusDot.style.background = color || "#3ce27a";
  }

  // ---- Chat state ----
  let messages = loadMessages();

  function loadMessages() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function saveMessages() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch (e) {}
  }

  function addBubble(role, text, isError) {
    const row = document.createElement("div");
    row.className = "demo-row " + (role === "user" ? "demo-user" : "demo-ai");

    const bubble = document.createElement("div");
    bubble.className = "demo-bubble" + (isError ? " error" : "");
    bubble.textContent = text;

    row.appendChild(bubble);
    demoChat.appendChild(row);
    demoChat.scrollTop = demoChat.scrollHeight;
    return bubble;
  }

  function addTyping() {
    const row = document.createElement("div");
    row.className = "demo-row demo-ai";
    const bubble = document.createElement("div");
    bubble.className = "demo-bubble";
    bubble.innerHTML = '<span class="demo-typing"><span></span><span></span><span></span></span>';
    row.appendChild(bubble);
    demoChat.appendChild(row);
    demoChat.scrollTop = demoChat.scrollHeight;
    return row;
  }

  function renderStoredMessages() {
    messages.forEach(m => addBubble(m.role, m.text));
  }
  renderStoredMessages();

  function pushMessage(role, text) {
    addBubble(role, text);
    messages.push({ role, text });
    saveMessages();
  }

  function buildApiHistory() {
    return messages.slice(-20).map(m => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.text
    }));
  }

  function extractText(response) {
    if (!response) return "";
    if (typeof response === "string") return response;
    if (response.message && typeof response.message.content === "string") return response.message.content;
    if (typeof response.text === "string") return response.text;
    return String(response);
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Zaman aşımı")), ms))
    ]);
  }

  async function getReply() {
    if (typeof puter === "undefined" || !puter.ai || typeof puter.ai.chat !== "function") {
      throw new Error("Yapay zekâ motoru yüklenemedi.");
    }
    const apiMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...buildApiHistory()];
    const response = await withTimeout(puter.ai.chat(apiMessages), AI_TIMEOUT_MS);
    const reply = extractText(response).trim();
    if (!reply) throw new Error("Boş yanıt geldi.");
    return reply;
  }

  // ---- Text-to-speech ----
  let voiceEnabled = localStorage.getItem(VOICE_KEY) === "1";

  function updateVoiceToggleUI() {
    if (!voiceToggle) return;
    voiceToggle.setAttribute("aria-pressed", String(voiceEnabled));
    voiceToggle.textContent = voiceEnabled ? "🔊 Sesli yanıt: Açık" : "🔊 Sesli yanıt: Kapalı";
  }
  updateVoiceToggleUI();

  let trVoice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.lang && v.lang.toLowerCase().startsWith("tr")) || null;
  }
  if ("speechSynthesis" in window) {
    trVoice = pickVoice();
    window.speechSynthesis.onvoiceschanged = () => { trVoice = pickVoice(); };
  }

  function speak(text) {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "tr-TR";
      if (trVoice) utter.voice = trVoice;
      utter.rate = 1;
      utter.pitch = 1;
      utter.onstart = () => setStatus("Yanıt veriliyor…", "#22d3ee");
      utter.onend = () => setStatus("Sistemler hazır", "#3ce27a");
      window.speechSynthesis.speak(utter);
    } catch (e) {}
  }

  if (voiceToggle) {
    voiceToggle.addEventListener("click", () => {
      voiceEnabled = !voiceEnabled;
      localStorage.setItem(VOICE_KEY, voiceEnabled ? "1" : "0");
      updateVoiceToggleUI();
      if (!voiceEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
    });
  }

  // ---- Send flow ----
  let busy = false;
  async function sendMessage(text) {
    const trimmed = (text || "").trim();
    if (!trimmed || busy) return;
    busy = true;
    demoSend.disabled = true;

    pushMessage("user", trimmed);
    demoInput.value = "";
    setStatus("Düşünüyor…", "#ffb454");
    const typingRow = addTyping();

    try {
      const reply = await getReply();
      typingRow.remove();
      pushMessage("ai", reply);
      speak(reply);
      if (!voiceEnabled) setStatus("Sistemler hazır", "#3ce27a");
    } catch (err) {
      typingRow.remove();
      const msg = err && err.message ? err.message : "Bir sorun oluştu.";
      addBubble("ai", "Üzgünüm efendim, bir sorunla karşılaştım: " + msg, true);
      setStatus("Bağlantı hatası", "#ff5a5a");
    } finally {
      busy = false;
      demoSend.disabled = false;
    }
  }

  if (demoForm) {
    demoForm.addEventListener("submit", e => {
      e.preventDefault();
      sendMessage(demoInput.value);
    });
  }

  if (newChatBtn) {
    newChatBtn.addEventListener("click", () => {
      messages = [];
      saveMessages();
      demoChat.innerHTML = "";
      addBubble("ai", "Sohbet temizlendi, efendim. Nasıl yardımcı olabilirim?");
      showToast("Sohbet temizlendi.");
    });
  }

  document.querySelectorAll(".command-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const cmd = chip.getAttribute("data-cmd") || chip.textContent;
      document.getElementById("demo").scrollIntoView({ behavior: "smooth", block: "start" });
      sendMessage(cmd);
    });
  });

  // ---- Speech recognition ----
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizing = false;
  let recognizer = null;

  if (SpeechRecognitionCtor && micBtn) {
    recognizer = new SpeechRecognitionCtor();
    recognizer.lang = "tr-TR";
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;

    recognizer.onstart = () => {
      recognizing = true;
      micBtn.setAttribute("aria-pressed", "true");
      setStatus("Dinleniyor…", "#ff5a5a");
    };

    recognizer.onerror = () => {
      recognizing = false;
      micBtn.setAttribute("aria-pressed", "false");
      setStatus("Sistemler hazır", "#3ce27a");
      showToast("Mikrofon erişimi alınamadı.");
    };

    recognizer.onend = () => {
      recognizing = false;
      micBtn.setAttribute("aria-pressed", "false");
      if (statusText && statusText.textContent === "Dinleniyor…") setStatus("Sistemler hazır", "#3ce27a");
    };

    recognizer.onresult = event => {
      const transcript = event.results && event.results[0] && event.results[0][0]
        ? event.results[0][0].transcript
        : "";
      if (transcript) {
        demoInput.value = transcript;
        sendMessage(transcript);
      }
    };

    micBtn.addEventListener("click", () => {
      if (recognizing) {
        recognizer.stop();
        return;
      }
      try {
        recognizer.start();
      } catch (e) {
        showToast("Mikrofon başlatılamadı.");
      }
    });
  } else if (micBtn) {
    micBtn.addEventListener("click", () => {
      showToast("Bu tarayıcı sesli komutu desteklemiyor. Lütfen yazın.");
    });
  }
})();
