(() => {
  "use strict";

  const SYSTEM_PROMPT = "Sen J.A.R.V.I.S. adında, bilim kurgu filmlerindeki asistan arayüzlerinden ilham alan kişisel bir yapay zekâ asistanısın. Türkçe konuşursun. Kullanıcıya kibarca ve zaman zaman 'efendim' diyerek hitap edebilirsin, ama abartmadan. Sakin, ölçülü, resmi ve öz bir üslubun var; gereksiz uzatma, gereksiz heyecan gösterme. Yanıtlarında ASLA emoji kullanma — sözlerin sadece düz metin olsun. Gerçek bir akıllı ev veya donanım sistemine bağlı olmadığını, sadece sohbet ve bilgi asistanı olduğunu unutma; fiziksel cihazları kontrol edebileceğini iddia etme.";
  const STORAGE_KEY = "jarvis_chat_v1";
  const VOICE_KEY = "jarvis_voice_enabled";
  const AI_TIMEOUT_MS = 30000;

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const NO_VOICE_INPUT_MSG = IS_IOS
    ? "iOS'taki tarayıcılar (Apple kısıtı nedeniyle) sesli komutu desteklemiyor. Metin kutusuna dokunup klavyenizdeki 🎤 simgesiyle sesli yazabilirsiniz."
    : "Bu tarayıcı sesli komutu desteklemiyor. Lütfen yazın.";

  // iOS Safari, kullanıcı jesti (dokunma) olmadan tetiklenen speechSynthesis
  // çağrılarını sessizce yok sayar. Sayfadaki ilk dokunuşta "sessiz" bir
  // cümle söyleterek konuşma motorunu bir kere açıyoruz; bundan sonra AI
  // yanıtı geldiğinde (dokunuştan bağımsız, asenkron olarak) çağrılan
  // gerçek speak() de artık ses çıkarabiliyor.
  let speechUnlocked = false;
  function unlockSpeechSynthesis() {
    if (speechUnlocked || !("speechSynthesis" in window)) return;
    speechUnlocked = true;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  document.addEventListener("pointerdown", unlockSpeechSynthesis, { once: true, capture: true });

  // ---- PWA olarak yükleme (ana ekrana ekleme) ----
  (function setupInstallPrompt() {
    const installBtn = document.getElementById("installBtn");
    if (!installBtn) return;

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (isStandalone) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    let deferredPrompt = null;

    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.classList.remove("hidden");
    });

    window.addEventListener("appinstalled", () => {
      installBtn.classList.add("hidden");
      deferredPrompt = null;
    });

    if (isIOS) {
      // iOS Safari "beforeinstallprompt" desteklemez; kullanıcıya elle nasıl
      // ekleneceğini gösteren bir buton bırakıyoruz.
      installBtn.classList.remove("hidden");
    }

    installBtn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (e) {}
        deferredPrompt = null;
        installBtn.classList.add("hidden");
        return;
      }
      if (isIOS) {
        showToast("Ana ekrana eklemek için altta/üstte Paylaş 📤 simgesine dokunup \"Ana Ekrana Ekle\"yi seçin.");
      } else {
        showToast("Tarayıcı menüsünden \"Uygulamayı yükle\" seçeneğini kullanabilirsiniz.");
      }
    });
  })();

  // ---- Radar canvas renderer ----
  function createRadar(canvas) {
    if (!canvas || !canvas.getContext) return { setState() {}, stop() {} };
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) / 2 - 4;
    const particles = Array.from({ length: 46 }, () => ({
      r: Math.random() * R * 0.92,
      a: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.3
    }));
    const colors = {
      live: { ring: "rgba(94,255,192,.35)", dot: "rgba(94,255,192,.9)", glow: "rgba(94,255,192,.10)" },
      thinking: { ring: "rgba(255,180,84,.4)", dot: "rgba(255,180,84,.95)", glow: "rgba(255,180,84,.12)" },
      speaking: { ring: "rgba(168,255,224,.5)", dot: "rgba(168,255,224,.95)", glow: "rgba(94,255,192,.14)" },
      paused: { ring: "rgba(150,170,165,.3)", dot: "rgba(150,170,165,.7)", glow: "rgba(150,170,165,.06)" },
      shutdown: { ring: "rgba(255,92,92,.4)", dot: "rgba(255,92,92,.9)", glow: "rgba(255,92,92,.12)" }
    };
    let state = "live";
    let sweep = 0;
    let rafId = null;

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const c = colors[state] || colors.live;

      ctx.strokeStyle = c.ring;
      ctx.lineWidth = 1;
      [0.94, 0.64].forEach(f => {
        ctx.beginPath();
        ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
        ctx.stroke();
      });

      sweep += state === "thinking" ? 0.05 : 0.015;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R * 0.94, sweep, sweep + 0.6);
      ctx.closePath();
      ctx.fillStyle = c.glow;
      ctx.fill();
      ctx.restore();

      particles.forEach(p => {
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.001 * p.speed + p.phase));
        const x = cx + Math.cos(p.a) * p.r;
        const y = cy + Math.sin(p.a) * p.r;
        ctx.beginPath();
        ctx.fillStyle = c.dot;
        ctx.globalAlpha = twinkle;
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.18);
      g.addColorStop(0, c.dot);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.18, 0, Math.PI * 2);
      ctx.fill();

      rafId = requestAnimationFrame(draw);
    }
    rafId = requestAnimationFrame(draw);

    return {
      setState(s) { if (colors[s]) state = s; },
      stop() { if (rafId) cancelAnimationFrame(rafId); }
    };
  }

  const gateRadar = createRadar(document.getElementById("gateRadarCanvas"));
  const bootRadar = createRadar(document.getElementById("bootRadarCanvas"));
  const coreRadar = createRadar(document.getElementById("radarCanvas"));

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
      tryAutoStartListening();
    }, 1400);
  }

  // Tarayıcılar, doğrudan bir kullanıcı dokunuşu olmadan (ör. setTimeout
  // içinden) yapılan mikrofon isteklerini genelde kullanıcıya hiç
  // sormadan "not-allowed" ile reddeder. Bu yüzden izin daha önce
  // verilmişse otomatik başlatıyoruz; verilmemişse kullanıcıdan gerçek
  // bir dokunuş bekliyoruz (mikrofon/LIVE düğmesi) — böylece tarayıcının
  // izin isteği düzgün şekilde görünür.
  async function tryAutoStartListening() {
    if (!recognizer) {
      if (IS_IOS) showToast(NO_VOICE_INPUT_MSG);
      return;
    }
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: "microphone" });
        if (status.state === "granted") {
          startAlwaysListening();
          return;
        }
      } catch (e) {}
    }
    setAppState("paused");
    if (micBtn) micBtn.classList.add("invite-pulse");
    showToast("Sesli dinlemeyi başlatmak için mikrofona ya da LIVE etiketine dokunun.");
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
    if (gateStatus) gateStatus.textContent = message || "DEVAM ETMEK İÇİN GİRİŞ YAPIN";
    if (gateSignInBtn) gateSignInBtn.classList.remove("hidden");
    stopAlwaysListening();
  }

  function initAuthGate() {
    if (typeof puter === "undefined" || !puter.auth || typeof puter.auth.isSignedIn !== "function") {
      if (gateStatus) gateStatus.textContent = "GİRİŞ SİSTEMİ YÜKLENEMEDİ — SAYFAYI YENİLEYİN";
      if (gateSignInBtn) gateSignInBtn.classList.add("hidden");
      return;
    }
    let signedIn = false;
    try { signedIn = puter.auth.isSignedIn(); } catch (e) {}
    if (signedIn) {
      showSite();
    } else {
      showGate("DEVAM ETMEK İÇİN PUTER HESABINIZLA GİRİŞ YAPIN");
    }
  }

  if (gateSignInBtn) {
    gateSignInBtn.addEventListener("click", async () => {
      if (typeof puter === "undefined" || !puter.auth || typeof puter.auth.signIn !== "function") {
        if (gateStatus) gateStatus.textContent = "GİRİŞ SİSTEMİ YÜKLENEMEDİ — SAYFAYI YENİLEYİN";
        return;
      }
      gateSignInBtn.disabled = true;
      if (gateStatus) gateStatus.textContent = "GİRİŞ YAPILIYOR…";
      try {
        await puter.auth.signIn();
        showSite();
      } catch (err) {
        if (gateStatus) gateStatus.textContent = "GİRİŞ YAPILAMADI — TEKRAR DENEYİN";
      } finally {
        gateSignInBtn.disabled = false;
      }
    });
  }

  async function doSignOut() {
    if (typeof puter !== "undefined" && puter.auth && typeof puter.auth.signOut === "function") {
      try { await puter.auth.signOut(); } catch (e) {}
    }
    showGate("ÇIKIŞ YAPILDI — DEVAM ETMEK İÇİN TEKRAR GİRİŞ YAPIN");
  }
  if (signOutBtn) signOutBtn.addEventListener("click", doSignOut);

  initAuthGate();

  // ---- Elements ----
  const demoChat = document.getElementById("demoChat");
  const demoForm = document.getElementById("demoForm");
  const demoInput = document.getElementById("demoInput");
  const demoSend = document.getElementById("demoSend");
  const micBtn = document.getElementById("micBtn");
  if (micBtn && IS_IOS) micBtn.title = "Klavyedeki 🎤 ile sesli yazın";
  const voiceToggle = document.getElementById("voiceToggle");
  const newChatBtn = document.getElementById("newChatBtn");
  const toast = document.getElementById("toast");
  const stateLive = document.getElementById("stateLive");
  const statePaused = document.getElementById("statePaused");
  const stateShutdown = document.getElementById("stateShutdown");

  let toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 3200);
  }

  // ---- App state (radar + pills) ----
  function setAppState(state) {
    coreRadar.setState(state);
    if (stateLive) stateLive.classList.toggle("active", state === "live" || state === "thinking" || state === "speaking");
    if (statePaused) statePaused.classList.toggle("active", state === "paused");
  }
  setAppState("paused");

  if (stateLive) stateLive.addEventListener("click", () => startAlwaysListening());
  if (statePaused) statePaused.addEventListener("click", () => stopAlwaysListening());
  if (stateShutdown) stateShutdown.addEventListener("click", () => doSignOut());

  // ---- Clock ----
  const clockTime = document.getElementById("clockTime");
  const clockDate = document.getElementById("clockDate");
  function tickClock() {
    const now = new Date();
    if (clockTime) clockTime.textContent = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    if (clockDate) clockDate.textContent = now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
  }
  tickClock();
  setInterval(tickClock, 1000 * 15);

  // ---- Weather (Open-Meteo, konum izniyle) ----
  const weatherTemp = document.getElementById("weatherTemp");
  const weatherDesc = document.getElementById("weatherDesc");
  const WEATHER_CODES = {
    0: "Açık", 1: "Az bulutlu", 2: "Parçalı bulutlu", 3: "Kapalı",
    45: "Sisli", 48: "Kırağı sisi", 51: "Çisenti", 53: "Çisenti", 55: "Yoğun çisenti",
    61: "Hafif yağmur", 63: "Yağmurlu", 65: "Şiddetli yağmur",
    71: "Hafif kar", 73: "Karlı", 75: "Yoğun kar",
    80: "Sağanak", 81: "Sağanak", 82: "Kuvvetli sağanak", 95: "Fırtınalı"
  };
  function loadWeather() {
    if (!navigator.geolocation) {
      if (weatherDesc) weatherDesc.textContent = "Konum desteklenmiyor";
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code`)
          .then(r => r.json())
          .then(data => {
            const cur = data && data.current;
            if (!cur) throw new Error("no data");
            if (weatherTemp) weatherTemp.textContent = Math.round(cur.temperature_2m) + "°";
            const desc = WEATHER_CODES[cur.weather_code] || "Bilinmiyor";
            if (weatherDesc) weatherDesc.textContent = `${desc} · nem %${Math.round(cur.relative_humidity_2m)}`;
          })
          .catch(() => { if (weatherDesc) weatherDesc.textContent = "Hava durumu alınamadı"; });
      },
      () => { if (weatherDesc) weatherDesc.textContent = "Konum izni verilmedi"; },
      { timeout: 8000 }
    );
  }
  loadWeather();

  // ---- System status bars ----
  const barSignal = document.getElementById("barSignal");
  const valSignal = document.getElementById("valSignal");
  const barListen = document.getElementById("barListen");
  const valListen = document.getElementById("valListen");
  const barMemory = document.getElementById("barMemory");
  const valMemory = document.getElementById("valMemory");

  function updateSignalBar() {
    const conn = navigator.connection;
    let pct = navigator.onLine ? 70 : 4;
    let label = navigator.onLine ? "ÇEVRİMİÇİ" : "ÇEVRİMDIŞI";
    if (conn && typeof conn.downlink === "number") {
      pct = Math.max(4, Math.min(100, Math.round((conn.downlink / 10) * 100)));
      label = (conn.effectiveType || "").toUpperCase() || label;
    }
    if (barSignal) barSignal.style.width = pct + "%";
    if (valSignal) valSignal.textContent = label;
  }
  updateSignalBar();
  window.addEventListener("online", updateSignalBar);
  window.addEventListener("offline", updateSignalBar);
  if (navigator.connection) navigator.connection.addEventListener("change", updateSignalBar);

  function updateListenBar(active) {
    if (barListen) barListen.style.width = (active ? 92 : 6) + "%";
    if (valListen) valListen.textContent = active ? "AKTİF" : "PASİF";
  }
  updateListenBar(false);

  (function updateMemoryBar() {
    const mem = navigator.deviceMemory;
    if (mem) {
      const pct = Math.min(100, Math.round((mem / 16) * 100));
      if (barMemory) barMemory.style.width = pct + "%";
      if (valMemory) valMemory.textContent = mem + " GB";
    } else {
      if (barMemory) barMemory.style.width = "40%";
      if (valMemory) valMemory.textContent = "—";
    }
  })();

  // ---- Reminder tip rotator ----
  const hudTip = document.getElementById("hudTip");
  const TIPS = IS_IOS ? [
    "iOS'ta sesli yazmak için metin kutusuna dokunup klavyedeki 🎤 simgesini kullanın.",
    "Yanıtları sesli duymak için 🔊 simgesinin açık olduğundan emin olun.",
    "Sesli yanıtın duyulması için sayfada en az bir kez bir yere dokunmuş olmanız gerekir.",
    "Apple, Safari'de sürekli sesli dinlemeye izin vermiyor; bu yüzden yazarak konuşuyoruz."
  ] : [
    "Sesli komut vermek için mikrofona dokunun.",
    "\"LIVE\" durumunda uygulama sizi sürekli dinler.",
    "Yanıtları sesli duymak için sağ üstteki 🔊 simgesini açık tutun.",
    "Sekmeyi arka plana alırsanız dinleme geçici olarak duraklar.",
    "\"PAUSED\" durumuna geçmek için mikrofona ya da PAUSED etiketine dokunun."
  ];
  let tipIndex = 0;
  if (hudTip) {
    hudTip.textContent = TIPS[0];
    setInterval(() => {
      tipIndex = (tipIndex + 1) % TIPS.length;
      hudTip.textContent = TIPS[tipIndex];
    }, 9000);
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

  function addLogLine(role, text, isError) {
    const row = document.createElement("div");
    row.className = "conv-row " + (role === "user" ? "conv-user" : "conv-ai") + (isError ? " conv-error" : "");

    const prefix = document.createElement("span");
    prefix.className = "conv-prefix";
    prefix.textContent = (role === "user" ? "SİZ" : "JARVIS") + ": ";

    const body = document.createElement("span");
    body.className = "conv-text";
    body.textContent = text;

    row.appendChild(prefix);
    row.appendChild(body);
    demoChat.appendChild(row);
    demoChat.scrollTop = demoChat.scrollHeight;
    return row;
  }

  function addTyping() {
    const row = document.createElement("div");
    row.className = "conv-row conv-ai";
    const prefix = document.createElement("span");
    prefix.className = "conv-prefix";
    prefix.textContent = "JARVIS: ";
    row.appendChild(prefix);
    row.insertAdjacentHTML("beforeend", '<span class="conv-typing"><span></span><span></span><span></span></span>');
    demoChat.appendChild(row);
    demoChat.scrollTop = demoChat.scrollHeight;
    return row;
  }

  function renderStoredMessages() {
    messages.forEach(m => addLogLine(m.role, m.text));
  }
  renderStoredMessages();
  if (messages.length === 0) {
    addLogLine("ai", IS_IOS
      ? "Sistemler çevrimiçi. Merhaba, efendim. Bu cihazda yazarak konuşuyoruz — yazmak için klavyenizdeki 🎤 simgesini de kullanabilirsiniz, ben sesli yanıt veririm."
      : "Sistemler çevrimiçi. Merhaba, efendim. Sizi dinliyorum — dilediğiniz an konuşabilir, ayrıca yazabilirsiniz de.");
  }

  function pushMessage(role, text) {
    addLogLine(role, text);
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
    voiceToggle.title = voiceEnabled ? "Sesli yanıt: Açık" : "Sesli yanıt: Kapalı";
    voiceToggle.textContent = voiceEnabled ? "🔊" : "🔇";
  }
  updateVoiceToggleUI();

  // Emoji ve benzeri sembolleri sesli yanıttan temizle (bazı TTS motorları
  // bunları harfi harfine okumaya/isimlendirmeye çalışıyor).
  const EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{2190}-\u{21FF}]/gu;
  function stripEmoji(text) {
    return text.replace(EMOJI_RE, "").replace(/[ \t]{2,}/g, " ").trim();
  }

  let trVoice = null;
  const MALE_VOICE_HINTS = /ahmet|kerem|cem\b|erkek|male/i;
  const FEMALE_VOICE_HINTS = /female|kadın|yelda|filiz|sevgi/i;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const trVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith("tr"));
    if (!trVoices.length) return null;
    // J.A.R.V.I.S.'e daha yakın, sakin ve resmi bir ton için erkek sesi
    // varsa onu tercih ediyoruz; yoksa bulunan ilk Türkçe sese düşüyoruz.
    const male = trVoices.find(v => MALE_VOICE_HINTS.test(v.name) && !FEMALE_VOICE_HINTS.test(v.name));
    return male || trVoices[0];
  }
  if ("speechSynthesis" in window) {
    trVoice = pickVoice();
    window.speechSynthesis.onvoiceschanged = () => { trVoice = pickVoice(); };
  }

  function resumeListeningAfterSpeech() {
    ttsSpeaking = false;
    setAppState(alwaysListening ? "live" : "paused");
    if (alwaysListening && !recognizing) {
      try { recognizer.start(); } catch (e) {}
    }
  }

  function speak(text) {
    if (!voiceEnabled) return;
    if (!("speechSynthesis" in window)) {
      showToast("Bu tarayıcı sesli yanıtı desteklemiyor.");
      return;
    }
    const spoken = stripEmoji(text);
    if (!spoken) return;
    ttsSpeaking = true;
    setAppState("speaking");
    if (recognizer && recognizing) {
      try { recognizer.stop(); } catch (e) {}
    }
    try { window.speechSynthesis.cancel(); } catch (e) {}
    // Mikrofonun tamamen kapanması ve tarayıcının bazı Android
    // cihazlarda mikrofon aktifken sesi kısması (audio ducking) ihtimaline
    // karşı, konuşmadan önce biraz daha bekliyoruz.
    setTimeout(() => {
      try {
        window.speechSynthesis.resume();
        const utter = new SpeechSynthesisUtterance(spoken);
        utter.lang = "tr-TR";
        if (trVoice) utter.voice = trVoice;
        // Gerçek J.A.R.V.I.S.'teki gibi sakin ve biraz daha derin bir ton.
        utter.rate = 0.96;
        utter.pitch = 0.88;
        utter.onend = resumeListeningAfterSpeech;
        utter.onerror = event => {
          const err = event && event.error;
          if (err && err !== "canceled" && err !== "interrupted") {
            showToast("Sesli yanıt oynatılamadı (" + err + ").");
          }
          resumeListeningAfterSpeech();
        };
        window.speechSynthesis.speak(utter);
      } catch (e) {
        showToast("Sesli yanıt oynatılamadı.");
        resumeListeningAfterSpeech();
      }
    }, 150);
  }

  if (voiceToggle) {
    voiceToggle.addEventListener("click", () => {
      voiceEnabled = !voiceEnabled;
      localStorage.setItem(VOICE_KEY, voiceEnabled ? "1" : "0");
      updateVoiceToggleUI();
      showToast(voiceEnabled ? "🔊 Sesli yanıt açıldı." : "🔇 Sesli yanıt kapatıldı.");
      if (!voiceEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
      else if (voiceEnabled) speak("Sesli yanıt açık, efendim.");
    });
  }

  // ---- Sekme arka plandayken de yanıt: bildirim izni ----
  function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      try { Notification.requestPermission(); } catch (e) {}
    }
  }
  function notifyReply(text) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (document.visibilityState !== "hidden") return;
    try {
      new Notification("J.A.R.V.I.S.", { body: text, icon: "icons/icon-192.png" });
    } catch (e) {}
  }

  // ---- Ekranı uyanık tut ----
  let wakeLock = null;
  async function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } catch (e) {}
  }
  function releaseWakeLock() {
    if (wakeLock) {
      try { wakeLock.release(); } catch (e) {}
      wakeLock = null;
    }
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
    setAppState("thinking");
    const typingRow = addTyping();

    try {
      const reply = await getReply();
      typingRow.remove();
      pushMessage("ai", reply);
      speak(reply);
      notifyReply(reply);
      if (!voiceEnabled) setAppState(alwaysListening ? "live" : "paused");
    } catch (err) {
      typingRow.remove();
      const msg = err && err.message ? err.message : "Bir sorun oluştu.";
      addLogLine("ai", "Üzgünüm efendim, bir sorunla karşılaştım: " + msg, true);
      setAppState(alwaysListening ? "live" : "paused");
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
      addLogLine("ai", "Sohbet temizlendi, efendim. Nasıl yardımcı olabilirim?");
      showToast("Sohbet temizlendi.");
    });
  }

  // ---- Speech recognition (her zaman dinleme) ----
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizing = false;
  let recognizer = null;
  let alwaysListening = false;
  let ttsSpeaking = false;

  function startAlwaysListening() {
    if (!recognizer) {
      showToast(NO_VOICE_INPUT_MSG);
      if (IS_IOS && demoInput) demoInput.focus();
      return;
    }
    alwaysListening = true;
    requestWakeLock();
    requestNotificationPermission();
    setAppState("live");
    if (!recognizing && !ttsSpeaking) {
      try {
        recognizer.start();
      } catch (e) {}
    }
  }

  function stopAlwaysListening() {
    alwaysListening = false;
    releaseWakeLock();
    setAppState("paused");
    if (recognizer && recognizing) {
      try { recognizer.stop(); } catch (e) {}
    }
  }

  function toggleListening() {
    if (!recognizer) {
      showToast(NO_VOICE_INPUT_MSG);
      if (IS_IOS && demoInput) demoInput.focus();
      return;
    }
    if (recognizing) {
      stopAlwaysListening();
      return;
    }
    startAlwaysListening();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && alwaysListening) {
      requestWakeLock();
      if (!recognizing && !ttsSpeaking) {
        try { recognizer && recognizer.start(); } catch (e) {}
      }
    }
  });

  if (SpeechRecognitionCtor && micBtn) {
    recognizer = new SpeechRecognitionCtor();
    recognizer.lang = "tr-TR";
    recognizer.continuous = true;
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;

    recognizer.onstart = () => {
      recognizing = true;
      micBtn.setAttribute("aria-pressed", "true");
      micBtn.classList.remove("invite-pulse");
      updateListenBar(true);
      if (!ttsSpeaking) setAppState("live");
    };

    recognizer.onerror = event => {
      const err = event && event.error;
      if (err === "not-allowed" || err === "service-not-allowed") {
        alwaysListening = false;
        setAppState("paused");
        showToast("Mikrofon izni verilmedi. Adres çubuğundaki kilit/site bilgisi simgesinden Mikrofon iznini \"İzin ver\" yapıp sayfayı yenileyin.");
      }
    };

    recognizer.onend = () => {
      recognizing = false;
      micBtn.setAttribute("aria-pressed", "false");
      updateListenBar(false);
      if (alwaysListening && !ttsSpeaking) {
        try { recognizer.start(); } catch (e) {}
      }
    };

    const WAKE_WORD_RE = /^\s*(hey|hey,|hi)?\s*jarvis[,:.!]?\s*/i;
    recognizer.onresult = event => {
      const result = event.results && event.results[event.results.length - 1];
      if (!result || !result.isFinal) return;
      let transcript = result[0] ? result[0].transcript : "";
      transcript = transcript.replace(WAKE_WORD_RE, "").trim();
      if (transcript) {
        demoInput.value = transcript;
        sendMessage(transcript);
      }
    };

    micBtn.addEventListener("click", toggleListening);
  } else if (micBtn) {
    micBtn.addEventListener("click", () => {
      showToast(NO_VOICE_INPUT_MSG);
      if (demoInput) demoInput.focus();
    });
  }
})();
