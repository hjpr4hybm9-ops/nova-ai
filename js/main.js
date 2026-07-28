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
  const deleteChatBtn = document.getElementById("deleteChatBtn");
  const chatsBtn = document.getElementById("chatsBtn");
  const chatsOverlay = document.getElementById("chatsOverlay");
  const chatsList = document.getElementById("chatsList");
  const newChatBtn = document.getElementById("newChatBtn");
  const newChatQuickBtn = document.getElementById("newChatQuickBtn");
  const closeChatsBtn = document.getElementById("closeChatsBtn");
  const toast = document.getElementById("toast");
  const heroTryBtn = document.getElementById("heroTryBtn");
  const authBtn = document.getElementById("authBtn");

  const GREETING = "Merhaba! Ben Nova AI 👋 Yazabilir, mikrofonla konuşabilir ya da kamerayla fotoğraf gösterebilirsin.";
  const STORE_KEY = "nova_ai_chats_v1";
  const OLD_STORAGE_KEY = "nova_ai_chat_v1";

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

  // ---- Multi-chat persistence ----
  function makeId() {
    return "chat_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function makeChat(initialMessages) {
    return {
      id: makeId(),
      title: "",
      messages: initialMessages || [{ role: "ai", text: GREETING }],
      updatedAt: Date.now()
    };
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && Array.isArray(parsed.chats) && parsed.chats.length) return parsed;
    } catch {
      /* bozuk veri, yok say */
    }

    // Önceki tek-sohbet formatından geçiş
    try {
      const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
      const oldMessages = oldRaw ? JSON.parse(oldRaw) : null;
      if (Array.isArray(oldMessages) && oldMessages.length) {
        const firstUser = oldMessages.find(m => m.role === "user");
        const chat = makeChat(oldMessages);
        chat.title = firstUser ? firstUser.text.slice(0, 40) : "";
        localStorage.removeItem(OLD_STORAGE_KEY);
        return { activeId: chat.id, chats: [chat] };
      }
    } catch {
      /* bozuk veri, yok say */
    }

    return null;
  }

  function saveStore() {
    try {
      store.chats.sort((a, b) => b.updatedAt - a.updatedAt);
      if (store.chats.length > 20) store.chats = store.chats.slice(0, 20);
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      /* depolama dolu ya da kullanılamıyor, sessizce geç */
    }
  }

  function getActiveChat() {
    return store.chats.find(c => c.id === store.activeId) || store.chats[0];
  }

  let store = loadStore();
  if (!store) {
    const chat = makeChat();
    store = { activeId: chat.id, chats: [chat] };
  }
  let activeChat = getActiveChat();

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

  function renderActiveChat() {
    demoChat.innerHTML = "";
    activeChat.messages.forEach(m => addBubble(m.role, m.text));
  }

  function pushMessage(role, displayText, imageDataURL) {
    addBubble(role, displayText, imageDataURL);

    const storedText = imageDataURL
      ? `[📷 Fotoğraf gönderildi] ${displayText || ""}`.trim()
      : displayText;

    activeChat.messages.push({ role, text: storedText });
    if (activeChat.messages.length > 40) activeChat.messages = activeChat.messages.slice(-40);

    if (!activeChat.title && role === "user" && storedText) {
      activeChat.title = storedText.length > 40 ? storedText.slice(0, 40) + "…" : storedText;
    }

    activeChat.updatedAt = Date.now();
    saveStore();
  }

  function buildApiHistory() {
    return activeChat.messages
      .filter(m => m.role === "user" || m.role === "ai")
      .slice(-20)
      .map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
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

  async function getReply() {
    if (typeof puter === "undefined" || !puter.ai || typeof puter.ai.chat !== "function") {
      throw new Error("AI motoru yüklenemedi.");
    }

    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...buildApiHistory()
    ];

    const response = await puter.ai.chat(apiMessages);
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

    pushMessage("user", text, imageDataURL);
    isThinking = true;
    demoSend.disabled = true;
    demoInput.disabled = true;
    demoHint.textContent = "Nova düşünüyor...";

    const typingRow = addTyping();

    try {
      const reply = imageDataURL
        ? await getVisionReply(text, imageDataURL)
        : await getReply();

      typingRow.remove();
      pushMessage("ai", reply);
      speak(reply);
      demoHint.textContent = "Bu demo, tarayıcınızda çalışan canlı bir yapay zekâ modelini kullanır.";
    } catch (error) {
      console.error(error);
      typingRow.remove();
      pushMessage("ai", "Şu anda bağlanırken bir sorun oluştu. Lütfen tekrar deneyin.");
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

  // ---- Delete current chat ----
  function switchToChat(id) {
    store.activeId = id;
    activeChat = getActiveChat();
    renderActiveChat();
  }

  deleteChatBtn.addEventListener("click", () => {
    if (isThinking) {
      showToast("Nova düşünürken sohbet silinemez, biraz bekle.");
      return;
    }

    store.chats = store.chats.filter(c => c.id !== activeChat.id);

    if (store.chats.length === 0) {
      const chat = makeChat();
      store.chats.push(chat);
      store.activeId = chat.id;
    } else {
      store.chats.sort((a, b) => b.updatedAt - a.updatedAt);
      store.activeId = store.chats[0].id;
    }

    activeChat = getActiveChat();
    saveStore();
    renderActiveChat();
    showToast("🗑️ Sohbet silindi");
  });

  // ---- Past chats browser ----
  function formatChatTime(ts) {
    return new Date(ts).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function renderChatsList() {
    chatsList.innerHTML = "";

    const sorted = [...store.chats].sort((a, b) => b.updatedAt - a.updatedAt);

    sorted.forEach(chat => {
      const row = document.createElement("div");
      row.className = "chat-row" + (chat.id === activeChat.id ? " active" : "");

      const main = document.createElement("div");
      main.className = "chat-row-main";

      const title = document.createElement("div");
      title.className = "chat-row-title";
      title.textContent = chat.title || "Yeni Sohbet";

      const time = document.createElement("div");
      time.className = "chat-row-time";
      time.textContent = formatChatTime(chat.updatedAt);

      main.appendChild(title);
      main.appendChild(time);
      main.addEventListener("click", () => {
        switchToChat(chat.id);
        chatsOverlay.classList.add("hidden");
      });

      const del = document.createElement("button");
      del.type = "button";
      del.className = "chat-row-delete";
      del.title = "Bu sohbeti sil";
      del.textContent = "✕";
      del.addEventListener("click", (e) => {
        e.stopPropagation();

        store.chats = store.chats.filter(c => c.id !== chat.id);

        if (store.chats.length === 0) {
          const fresh = makeChat();
          store.chats.push(fresh);
          store.activeId = fresh.id;
        } else if (chat.id === activeChat.id) {
          store.chats.sort((a, b) => b.updatedAt - a.updatedAt);
          store.activeId = store.chats[0].id;
        }

        activeChat = getActiveChat();
        saveStore();
        renderActiveChat();
        renderChatsList();
      });

      row.appendChild(main);
      row.appendChild(del);
      chatsList.appendChild(row);
    });
  }

  chatsBtn.addEventListener("click", () => {
    renderChatsList();
    chatsOverlay.classList.remove("hidden");
  });

  closeChatsBtn.addEventListener("click", () => {
    chatsOverlay.classList.add("hidden");
  });

  function startNewChat() {
    if (isThinking) {
      showToast("Nova düşünürken yeni sohbet açılamaz, biraz bekle.");
      return;
    }

    const chat = makeChat();
    store.chats.push(chat);
    switchToChat(chat.id);
    saveStore();
    chatsOverlay.classList.add("hidden");
    showToast("🆕 Yeni sohbet başlatıldı");
  }

  newChatBtn.addEventListener("click", startNewChat);
  newChatQuickBtn.addEventListener("click", startNewChat);

  // ---- Hero "Ücretsiz Deneyin" only shows before the first try ----
  if (heroTryBtn) {
    if (localStorage.getItem("nova_tried_free") === "1") {
      heroTryBtn.classList.add("hidden");
    } else {
      heroTryBtn.addEventListener("click", () => {
        localStorage.setItem("nova_tried_free", "1");
      });
    }
  }

  // ---- Auth (Puter'ın hazır giriş sistemi) ----
  const VISITED_KEY = "nova_visited";
  const isReturningVisitor = localStorage.getItem(VISITED_KEY) === "1";
  localStorage.setItem(VISITED_KEY, "1");

  async function refreshAuthUI() {
    if (typeof puter !== "undefined" && puter.auth && typeof puter.auth.isSignedIn === "function" && puter.auth.isSignedIn()) {
      let label = "👤 Hesabım";
      try {
        const user = await puter.auth.getUser();
        if (user && user.username) label = "👤 " + user.username;
      } catch {
        /* kullanıcı bilgisi alınamadı, varsayılan etiketi kullan */
      }
      authBtn.textContent = label;
      authBtn.dataset.mode = "signed-in";
      return;
    }

    if (isReturningVisitor) {
      authBtn.textContent = "Giriş Yap";
      authBtn.dataset.mode = "signin";
    } else {
      authBtn.textContent = "Kaydol";
      authBtn.dataset.mode = "signup";
    }
  }

  authBtn.addEventListener("click", async () => {
    if (typeof puter === "undefined" || !puter.auth || typeof puter.auth.signIn !== "function") {
      showToast("Giriş sistemi yüklenemedi. Lütfen tekrar dene.", 4000);
      return;
    }

    if (authBtn.dataset.mode === "signed-in") {
      try {
        await puter.auth.signOut();
        showToast("Çıkış yapıldı.");
      } catch {
        /* yoksay */
      }
      refreshAuthUI();
      return;
    }

    try {
      await puter.auth.signIn();
      showToast("🎉 Hoş geldin!");
      refreshAuthUI();
    } catch (error) {
      console.error(error);
      showToast("Giriş yapılamadı, tekrar dene.", 4000);
    }
  });

  refreshAuthUI();

  // ---- Init ----
  renderActiveChat();
  saveStore();
})();
