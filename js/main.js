(() => {
  "use strict";

  document.getElementById("year").textContent = new Date().getFullYear();

  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");

  navToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  mainNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  const SYSTEM_PROMPT = `Sen Nova AI'sın, herkese açık bir yapay zekâ asistanısın.
Türkçe konuş. Sıcak, samimi ve anlaşılır ol. Kısa ve net cevaplar ver, gerektiğinde ayrıntı ekle.
Kullanıcı bir fotoğraf gönderirse, fotoğrafta gördüklerini açıkla ve sorusuna göre yorum yap.`;

  const demoChat = document.getElementById("demoChat");
  const demoForm = document.getElementById("demoForm");
  const demoInput = document.getElementById("demoInput");
  const demoSend = document.getElementById("demoSend");
  const demoHint = document.getElementById("demoHint");
  const voiceToggle = document.getElementById("voiceToggle");
  const micBtn = document.getElementById("micBtn");
  const cameraBtn = document.getElementById("cameraBtn");
  const cameraOverlay = document.getElementById("cameraOverlay");
  const cameraVideo = document.getElementById("cameraVideo");
  const cameraCanvas = document.getElementById("cameraCanvas");
  const captureBtn = document.getElementById("captureBtn");
  const cameraCancelBtn = document.getElementById("cameraCancelBtn");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  const toast = document.getElementById("toast");

  const GREETING = "Merhaba! Ben Nova AI 👋 Yazabilir, mikrofonla konuşabilir ya da kamerayla fotoğraf gösterebilirsin.";

  let history = [];
  let isThinking = false;
  let toastTimer = null;

  function showToast(message, duration = 3000) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.remove("hidden");
    requestAnimationFrame(() => toast.classList.add("show"));
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.classList.add("hidden"), 200);
    }, duration);
  }

  function addBubble(role, text, imageDataURL) {
    const row = document.createElement("div");
    row.className = "demo-row demo-" + role;

    const bubble = document.createElement("div");
    bubble.className = "demo-bubble";

    if (imageDataURL) {
      const img = document.createElement("img");
      img.src = imageDataURL;
      bubble.appendChild(img);
    }

    if (text) {
      const span = document.createElement("span");
      span.textContent = text;
      bubble.appendChild(span);
    }

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

  function extractText(response) {
    if (!response) return "";
    if (typeof response === "string") return response;
    if (response.message && typeof response.message.content === "string") return response.message.content;
    if (typeof response.text === "string") return response.text;
    return String(response);
  }

  async function getReply(userText) {
    if (typeof puter === "undefined" || !puter.ai || typeof puter.ai.chat !== "function") {
      throw new Error("AI motoru yüklenemedi.");
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: userText }
    ];

    const response = await puter.ai.chat(messages);
    const reply = extractText(response).trim();
    if (!reply) throw new Error("Boş yanıt geldi.");
    return reply;
  }

  async function getVisionReply(userText, imageDataURL) {
    if (typeof puter === "undefined" || !puter.ai || typeof puter.ai.chat !== "function") {
      throw new Error("AI motoru yüklenemedi.");
    }

    const instruction = "Fotoğrafta bir soru, problem, alıştırma veya ödev varsa onu çöz ve adım adım, anlaşılır şekilde açıkla; sadece sonucu söyleyip geçme. Fotoğrafta soru yoksa ne olduğunu kısaca anlat.";
    const prompt = userText ? `${userText}\n\n${instruction}` : instruction;

    const response = await puter.ai.chat(prompt, imageDataURL);
    const reply = extractText(response).trim();
    if (!reply) throw new Error("Boş yanıt geldi.");
    return reply;
  }

  // ---- Text-to-speech ----
  let voiceEnabled = localStorage.getItem("nova_voice_enabled") === "1";

  function updateVoiceToggleUI() {
    voiceToggle.setAttribute("aria-pressed", String(voiceEnabled));
    voiceToggle.textContent = voiceEnabled ? "🔊 Sesli yanıt: Açık" : "🔊 Sesli yanıt: Kapalı";
  }
  updateVoiceToggleUI();

  voiceToggle.addEventListener("click", () => {
    voiceEnabled = !voiceEnabled;
    localStorage.setItem("nova_voice_enabled", voiceEnabled ? "1" : "0");
    updateVoiceToggleUI();
    if (!voiceEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  });

  function speak(text) {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "tr-TR";
    window.speechSynthesis.speak(utter);
  }

  // ---- Speech-to-text ----
  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;

  if (SpeechRecognitionImpl) {
    recognition = new SpeechRecognitionImpl();
    recognition.lang = "tr-TR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.addEventListener("start", () => {
      listening = true;
      micBtn.classList.add("active");
      demoHint.textContent = "Dinliyorum...";
    });

    recognition.addEventListener("result", (event) => {
      const said = event.results[0][0].transcript.trim();
      if (said) {
        demoInput.value = said;
        demoForm.requestSubmit();
      }
    });

    recognition.addEventListener("error", (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        showToast("🚫 Mikrofon izni verilmedi. Lütfen tarayıcı izinlerinden mikrofona izin ver.", 5000);
      } else {
        demoHint.textContent = "Ses algılanamadı, tekrar deneyebilirsin.";
      }
    });

    recognition.addEventListener("end", () => {
      listening = false;
      micBtn.classList.remove("active");
    });

    micBtn.addEventListener("click", async () => {
      if (isThinking) return;
      if (listening) {
        recognition.stop();
        return;
      }

      showToast("🎙️ Mikrofon izni isteniyor, lütfen izin ver");

      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: "microphone" });
          if (status.state === "denied") {
            showToast("🚫 Mikrofon izni engellenmiş. Tarayıcı ayarlarından bu site için mikrofona izin ver.", 5000);
            return;
          }
        }
      } catch {
        /* Permissions API mikrofon adını desteklemiyor olabilir, devam et */
      }

      try {
        recognition.start();
      } catch {
        /* zaten dinliyor */
      }
    });
  } else {
    micBtn.addEventListener("click", () => {
      showToast("Bu tarayıcı sesli girişi desteklemiyor. Chrome veya güncel Safari'yi dene.", 4000);
    });
  }

  // ---- Camera capture ----
  let cameraStream = null;

  async function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast("Bu tarayıcı kamera erişimini desteklemiyor.", 4000);
      return;
    }

    showToast("📷 Kamera izni isteniyor, lütfen izin ver");

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      cameraVideo.srcObject = cameraStream;
      cameraOverlay.classList.remove("hidden");
    } catch {
      showToast("🚫 Kameraya erişilemedi. Tarayıcı ayarlarından bu site için kamera iznini kontrol et.", 5000);
    }
  }

  function closeCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    cameraVideo.srcObject = null;
    cameraOverlay.classList.add("hidden");
  }

  cameraBtn.addEventListener("click", openCamera);
  cameraCancelBtn.addEventListener("click", closeCamera);

  captureBtn.addEventListener("click", async () => {
    const width = cameraVideo.videoWidth || 640;
    const height = cameraVideo.videoHeight || 480;
    cameraCanvas.width = width;
    cameraCanvas.height = height;

    const ctx = cameraCanvas.getContext("2d");
    ctx.drawImage(cameraVideo, 0, 0, width, height);
    const dataURL = cameraCanvas.toDataURL("image/jpeg", 0.85);

    const caption = demoInput.value.trim();
    demoInput.value = "";
    closeCamera();

    await ask(caption, dataURL);
  });

  // ---- Core exchange ----
  async function ask(text, imageDataURL) {
    if (isThinking) return;
    if (!text && !imageDataURL) return;

    addBubble("user", text, imageDataURL);
    isThinking = true;
    demoSend.disabled = true;
    demoInput.disabled = true;
    demoHint.textContent = "Nova düşünüyor...";

    const typingRow = addTyping();

    try {
      const reply = imageDataURL
        ? await getVisionReply(text, imageDataURL)
        : await getReply(text);

      history.push({ role: "user", content: imageDataURL ? `[Bir fotoğraf gönderildi] ${text}`.trim() : text });
      history.push({ role: "assistant", content: reply });
      if (history.length > 20) history = history.slice(-20);

      typingRow.remove();
      addBubble("ai", reply);
      speak(reply);
      demoHint.textContent = "Bu demo, tarayıcınızda çalışan canlı bir yapay zekâ modelini kullanır.";
    } catch (error) {
      console.error(error);
      typingRow.remove();
      addBubble("ai", "Şu anda bağlanırken bir sorun oluştu. Lütfen tekrar deneyin.");
      demoHint.textContent = "Bağlantı sorunu yaşandı, tekrar deneyebilirsiniz.";
    } finally {
      isThinking = false;
      demoSend.disabled = false;
      demoInput.disabled = false;
      demoInput.focus();
    }
  }

  demoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = demoInput.value.trim();
    if (!text) return;
    demoInput.value = "";
    ask(text, null);
  });

  clearHistoryBtn.addEventListener("click", () => {
    if (isThinking) {
      showToast("Nova düşünürken geçmiş silinemez, biraz bekle.");
      return;
    }

    history = [];
    demoChat.innerHTML = "";
    addBubble("ai", GREETING);
    showToast("🗑️ Sohbet geçmişi silindi");
  });
})();
