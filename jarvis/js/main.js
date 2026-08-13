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

  // ---- Puter authentication gate ----
  const authGate = document.getElementById("authGate");
  const bootScreen = document.getElementById("bootScreen");
  const siteShell = document.getElementById("siteShell");
  const gateStatus = document.getElementById("gateStatus");
  const gateSignInBtn = document.getElementById("gateSignInBtn");
  const signOutBtn = document.getElementById("signOutBtn");

  function runBootSequence() {
    if (bootScreen) bootScreen.classList.remove("hidden");
    setTimeout(() => {
      if (bootScreen) bootScreen.classList.add("hidden");
      if (siteShell) siteShell.classList.remove("hidden");
      if (signOutBtn) signOutBtn.classList.remove("hidden");
      openChatOverlay();
      startAlwaysListening();
    }, 1400);
  }

  function showSite() {
    if (authGate) authGate.classList.add("hidden");
    runBootSequence();
  }

  function showGate(message) {
    if (siteShell) siteShell.classList.add("hidden");
    if (bootScreen) bootScreen.classList.add("hidden");
    if (authGate) authGate.classList.remove("hidden");
    if (signOutBtn) signOutBtn.classList.add("hidden");
    if (gateStatus) gateStatus.textContent = message || "Devam etmek için giriş yapın.";
    if (gateSignInBtn) gateSignInBtn.classList.remove("hidden");
    const openOverlay = document.getElementById("chatOverlay");
    if (openOverlay) openOverlay.classList.add("hidden");
    document.body.style.overflow = "";
    stopAlwaysListening();
  }

  function initAuthGate() {
    if (typeof puter === "undefined" || !puter.auth || typeof puter.auth.isSignedIn !== "function") {
      if (gateStatus) gateStatus.textContent = "Giriş sistemi yüklenemedi. Lütfen sayfayı yenileyin.";
      if (gateSignInBtn) gateSignInBtn.classList.add("hidden");
      return;
    }
    let signedIn = false;
    try { signedIn = puter.auth.isSignedIn(); } catch (e) {}
    if (signedIn) {
      showSite();
    } else {
      showGate("Devam etmek için Puter hesabınızla giriş yapın.");
    }
  }

  if (gateSignInBtn) {
    gateSignInBtn.addEventListener("click", async () => {
      if (typeof puter === "undefined" || !puter.auth || typeof puter.auth.signIn !== "function") {
        if (gateStatus) gateStatus.textContent = "Giriş sistemi yüklenemedi. Lütfen sayfayı yenileyin.";
        return;
      }
      gateSignInBtn.disabled = true;
      if (gateStatus) gateStatus.textContent = "Giriş yapılıyor…";
      try {
        await puter.auth.signIn();
        showSite();
      } catch (err) {
        if (gateStatus) gateStatus.textContent = "Giriş yapılamadı. Tekrar deneyin.";
      } finally {
        gateSignInBtn.disabled = false;
      }
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      if (typeof puter !== "undefined" && puter.auth && typeof puter.auth.signOut === "function") {
        try { await puter.auth.signOut(); } catch (e) {}
      }
      showGate("Çıkış yapıldı. Devam etmek için tekrar giriş yapın.");
    });
  }

  initAuthGate();

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

  // ---- Full-screen chat overlay ----
  const chatOverlay = document.getElementById("chatOverlay");
  const chatFab = document.getElementById("chatFab");
  const chatLauncher = document.getElementById("chatLauncher");
  const closeChatBtn = document.getElementById("closeChatBtn");

  function openChatOverlay() {
    if (!chatOverlay) return;
    chatOverlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    if (demoInput) setTimeout(() => demoInput.focus(), 50);
  }

  function closeChatOverlay() {
    if (!chatOverlay) return;
    chatOverlay.classList.add("hidden");
    document.body.style.overflow = "";
  }

  if (chatLauncher) chatLauncher.addEventListener("click", openChatOverlay);
  if (closeChatBtn) closeChatBtn.addEventListener("click", closeChatOverlay);

  // ---- Draggable voice orb ----
  const FAB_POS_KEY = "jarvis_fab_pos";
  const DRAG_THRESHOLD = 6;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function placeFab(left, top) {
    const size = chatFab.offsetWidth || 88;
    const maxLeft = window.innerWidth - size - 8;
    const maxTop = window.innerHeight - size - 8;
    const clampedLeft = clamp(left, 8, Math.max(8, maxLeft));
    const clampedTop = clamp(top, 8, Math.max(8, maxTop));
    chatFab.style.left = clampedLeft + "px";
    chatFab.style.top = clampedTop + "px";
    chatFab.style.right = "auto";
    chatFab.style.bottom = "auto";
    return { left: clampedLeft, top: clampedTop };
  }

  function restoreFabPosition() {
    try {
      const raw = localStorage.getItem(FAB_POS_KEY);
      if (raw) {
        const pos = JSON.parse(raw);
        if (typeof pos.left === "number" && typeof pos.top === "number") {
          placeFab(pos.left, pos.top);
        }
      }
    } catch (e) {}
  }

  if (chatFab) {
    restoreFabPosition();
    window.addEventListener("resize", () => {
      const rect = chatFab.getBoundingClientRect();
      if (rect.left) placeFab(rect.left, rect.top);
    });

    let dragging = false;
    let moved = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;

    chatFab.addEventListener("pointerdown", e => {
      const rect = chatFab.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      dragging = true;
      moved = false;
      chatFab.setPointerCapture(e.pointerId);
    });

    chatFab.addEventListener("pointermove", e => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        moved = true;
        chatFab.classList.add("dragging");
      }
      if (moved) {
        placeFab(startLeft + dx, startTop + dy);
      }
    });

    chatFab.addEventListener("pointerup", e => {
      if (!dragging) return;
      dragging = false;
      chatFab.classList.remove("dragging");
      if (moved) {
        const rect = chatFab.getBoundingClientRect();
        try {
          localStorage.setItem(FAB_POS_KEY, JSON.stringify({ left: rect.left, top: rect.top }));
        } catch (err) {}
      } else {
        openChatOverlay();
        toggleListening();
      }
      moved = false;
    });
  }

  document.querySelectorAll(".open-chat-btn").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      openChatOverlay();
    });
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && chatOverlay && !chatOverlay.classList.contains("hidden")) {
      closeChatOverlay();
    }
  });

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
  let voiceEnabled = localStorage.getItem(VOICE_KEY) !== "0";

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
      ttsSpeaking = true;
      if (recognizer && recognizing) {
        try { recognizer.stop(); } catch (e) {}
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "tr-TR";
      if (trVoice) utter.voice = trVoice;
      utter.rate = 1;
      utter.pitch = 1;
      utter.onstart = () => setStatus("Yanıt veriliyor…", "#22d3ee");
      utter.onend = () => {
        setStatus("Sistemler hazır", "#3ce27a");
        ttsSpeaking = false;
        if (alwaysListening && !recognizing) {
          try { recognizer.start(); } catch (e) {}
        }
      };
      window.speechSynthesis.speak(utter);
    } catch (e) {
      ttsSpeaking = false;
    }
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
      openChatOverlay();
      sendMessage(cmd);
    });
  });

  // ---- Speech recognition (her zaman dinleme) ----
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizing = false;
  let recognizer = null;
  let alwaysListening = false;
  let ttsSpeaking = false;

  function startAlwaysListening() {
    if (!recognizer) {
      showToast("Bu tarayıcı sesli komutu desteklemiyor. Lütfen yazın.");
      return;
    }
    alwaysListening = true;
    if (!recognizing && !ttsSpeaking) {
      try {
        recognizer.start();
      } catch (e) {}
    }
  }

  function stopAlwaysListening() {
    alwaysListening = false;
    if (recognizer && recognizing) {
      try { recognizer.stop(); } catch (e) {}
    }
  }

  function toggleListening() {
    if (!recognizer) {
      showToast("Bu tarayıcı sesli komutu desteklemiyor. Lütfen yazın.");
      return;
    }
    if (recognizing) {
      stopAlwaysListening();
      return;
    }
    startAlwaysListening();
  }

  if (SpeechRecognitionCtor && micBtn) {
    recognizer = new SpeechRecognitionCtor();
    recognizer.lang = "tr-TR";
    recognizer.continuous = true;
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;

    recognizer.onstart = () => {
      recognizing = true;
      micBtn.setAttribute("aria-pressed", "true");
      if (chatFab) chatFab.classList.add("listening");
      setStatus("Dinleniyor…", "#ff5a5a");
    };

    recognizer.onerror = event => {
      const err = event && event.error;
      if (err === "not-allowed" || err === "service-not-allowed") {
        alwaysListening = false;
        showToast("Mikrofon erişimi reddedildi. Tarayıcı ayarlarından izin verin.");
      }
    };

    recognizer.onend = () => {
      recognizing = false;
      micBtn.setAttribute("aria-pressed", "false");
      if (chatFab) chatFab.classList.remove("listening");
      if (statusText && statusText.textContent === "Dinleniyor…") setStatus("Sistemler hazır", "#3ce27a");
      if (alwaysListening && !ttsSpeaking) {
        try { recognizer.start(); } catch (e) {}
      }
    };

    recognizer.onresult = event => {
      const result = event.results && event.results[event.results.length - 1];
      if (!result || !result.isFinal) return;
      const transcript = result[0] ? result[0].transcript : "";
      if (transcript && transcript.trim()) {
        demoInput.value = transcript;
        sendMessage(transcript);
      }
    };

    micBtn.addEventListener("click", toggleListening);
  } else if (micBtn) {
    micBtn.addEventListener("click", () => {
      showToast("Bu tarayıcı sesli komutu desteklemiyor. Lütfen yazın.");
    });
  }
})();
