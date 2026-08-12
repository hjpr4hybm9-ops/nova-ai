(function () {
  "use strict";

  var LS_LINKS = "omrflix.links";
  var LS_THEME = "omrflix.theme";

  var DEFAULT_SECTIONS = [
    { id: "ev", title: "Ev", desc: "Başlangıç ekranın", icon: "home", href: "#top", grad: "linear-gradient(135deg,#1e3a5f,#0b1526)" },
    { id: "oyun", title: "Oyun", desc: "Atari Salonu'na git", icon: "gamepad", href: "../atari-salonu/index.html", grad: "linear-gradient(135deg,#3b1f5f,#0b1526)" },
    { id: "yapayzeka", title: "Yapay Zeka", desc: "Claude, ChatGPT, Gemini...", icon: "ai", href: "#yapayzeka", grad: "linear-gradient(135deg,#1f3d5f,#0b1526)" },
    { id: "kod", title: "Kod", desc: "Geliştirme araçların", icon: "code", href: "#baglantilar", filterCat: "kod", grad: "linear-gradient(135deg,#243a2e,#0b1526)" },
    { id: "gorsel", title: "Görsel Oluşturma", desc: "Yapay zekayla görsel üret", icon: "image", href: "#baglantilar", filterCat: "gorsel", grad: "linear-gradient(135deg,#5f2a1f,#0b1526)" },
    { id: "mikrofon", title: "Mikrofon", desc: "Sesle yaz, soru sor", icon: "mic", action: "mikrofon", grad: "linear-gradient(135deg,#4a1f5f,#0b1526)" },
    { id: "kamera", title: "Kamera", desc: "Anlık fotoğraf çek", icon: "camera", action: "kamera", grad: "linear-gradient(135deg,#1f5f5a,#0b1526)" },
    { id: "video", title: "Video", desc: "İzleme listesi", icon: "video", href: "#baglantilar", grad: "linear-gradient(135deg,#1f5f4a,#0b1526)" },
    { id: "blog", title: "Blog", desc: "Notlar ve yazılar", icon: "pen", href: "#baglantilar", grad: "linear-gradient(135deg,#5f3a1f,#0b1526)" },
    { id: "projeler", title: "Projeler", desc: "Kişisel projelerin", icon: "folder", href: "#baglantilar", grad: "linear-gradient(135deg,#5f1f3d,#0b1526)" }
  ];

  var SC_ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    gamepad: '<rect x="2" y="7" width="20" height="10" rx="4"/><path d="M7 10v4M5 12h4"/><circle cx="16" cy="10.3" r="1"/><circle cx="18.3" cy="13" r="1"/>',
    ai: '<rect x="5" y="8" width="14" height="10" rx="2"/><circle cx="9.5" cy="13" r="1.2"/><circle cx="14.5" cy="13" r="1.2"/><path d="M12 8V4M9 4h6"/><path d="M3 12h2M19 12h2"/>',
    code: '<path d="M8 6l-5 6 5 6M16 6l5 6-5 6"/>',
    image: '<rect x="3" y="4" width="18" height="14" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="M3 15l5-5 4 4 3-3 6 6"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3M9 21h6"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
    video: '<path d="M3 8l3-4h3l-2 4z"/><path d="M9 8l3-4h3l-2 4z"/><path d="M15 8l3-4h3v4z"/><rect x="3" y="8" width="18" height="12" rx="1"/>',
    pen: '<path d="M4 20l1-5 11-11 4 4-11 11-5 1z"/><path d="M13 6l4 4"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>'
  };

  function scIconSvg(key) {
    var inner = SC_ICONS[key] || SC_ICONS.folder;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + inner + "</svg>";
  }

  var CATEGORIES = [
    { id: "all", label: "Hepsi" },
    { id: "genel", label: "Genel" },
    { id: "kod", label: "Kod" },
    { id: "gorsel", label: "Görsel Oluşturma" }
  ];

  var AI_TOOLS = [
    { key: "claude", name: "Claude", url: "https://claude.ai", desc: "Anthropic'in yapay zekâ asistanı" },
    { key: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com", desc: "OpenAI'nin sohbet asistanı" },
    { key: "gemini", name: "Gemini", url: "https://gemini.google.com", desc: "Google'ın yapay zekâ asistanı" },
    { key: "deepseek", name: "DeepSeek", url: "https://chat.deepseek.com", desc: "DeepSeek sohbet asistanı" },
    { key: "kumru", name: "Kumru", url: "https://kumru.ai", desc: "Türkçe yerli yapay zekâ" }
  ];

  var AI_BADGE_DEFS = {
    claude: { from: "#ffb088", to: "#d9622c", mark: '<path d="M20 8v24M8 20h24M12.3 12.3l15.4 15.4M27.7 12.3L12.3 27.7" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>' },
    chatgpt: { from: "#1fcf9d", to: "#0d5f4b", mark: '<circle cx="20" cy="20" r="7" stroke="#fff" stroke-width="2.4" fill="none"/><circle cx="20" cy="10.5" r="3.4" fill="#fff"/><circle cx="28.2" cy="25.2" r="3.4" fill="#fff"/><circle cx="11.8" cy="25.2" r="3.4" fill="#fff"/>' },
    gemini: { from: "#7c9bff", to: "#b57bf0", mark: '<path d="M20 8c0 7-5 12-12 12 7 0 12 5 12 12 0-7 5-12 12-12-7 0-12-5-12-12z" fill="#fff"/>' },
    deepseek: { from: "#5aa9ff", to: "#1450a8", mark: '<path d="M9 24c3-9 8-13 11-13 4 0 6 3 6 3s3-2 6 1c2 2 2 5 1 7-3-2-6-2-8 0-2-3-5-3-7-1-2 2-3 3-3 3s-4-1-6 0z" fill="#fff"/>' },
    kumru: { from: "#f5a6c9", to: "#a86ad9", mark: '<path d="M11 24c3-8 9-12 15-10-2 1-3 2-3 4 3 0 5 1 6 3-3 0-5 1-6 3-3 4-8 5-12 3 2 0 4-1 5-3-3 1-5 1-5 0z" fill="#fff"/><circle cx="24" cy="16.5" r="1.3" fill="#0a0f1a"/>' }
  };
  var aiBadgeCounter = 0;
  function aiBadgeSvg(key) {
    var def = AI_BADGE_DEFS[key];
    if (!def) return "";
    aiBadgeCounter++;
    var gid = "aig" + aiBadgeCounter;
    return '<svg viewBox="0 0 40 40" width="100%" height="100%">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + def.from + '"/><stop offset="1" stop-color="' + def.to + '"/>' +
      '</linearGradient></defs>' +
      '<circle cx="20" cy="20" r="20" fill="url(#' + gid + ')"/>' +
      def.mark +
      "</svg>";
  }

  var DEFAULT_LINKS = [
    { id: "instagram", name: "Instagram", url: "https://instagram.com", icon: "📸", cat: "genel" },
    { id: "youtube", name: "YouTube", url: "https://youtube.com", icon: "▶️", cat: "genel" },
    { id: "google", name: "Google", url: "https://google.com", icon: "🔎", cat: "genel" },
    { id: "donanim", name: "Donanım Haber", url: "https://donanimhaber.com", icon: "💻", cat: "genel" },
    { id: "github", name: "GitHub", url: "https://github.com", icon: "🐙", cat: "kod" },
    { id: "vscode", name: "VS Code Web", url: "https://vscode.dev", icon: "🧩", cat: "kod" }
  ];

  var els = {};
  var state = { links: [], search: "", category: "all" };

  function $(id) { return document.getElementById(id); }

  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function uid() {
    return "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function showToast(msg) {
    var t = els.toast;
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(showToast._tid);
    showToast._tid = setTimeout(function () { t.classList.add("hidden"); }, 2200);
  }

  /* ---------- Theme ---------- */
  function applyThemeUI() {
    var stored = localStorage.getItem(LS_THEME);
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  }
  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme");
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var effective = current || (prefersDark ? "dark" : "light");
    var next = effective === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(LS_THEME, next);
  }

  /* ---------- Sections ---------- */
  function renderSections() {
    var q = state.search.trim().toLowerCase();
    els.sectionsGrid.innerHTML = "";
    DEFAULT_SECTIONS.forEach(function (s) {
      if (q && s.title.toLowerCase().indexOf(q) === -1 && s.desc.toLowerCase().indexOf(q) === -1) return;
      var a = document.createElement("a");
      a.className = "section-card";
      a.href = s.action ? "#" : s.href;
      a.innerHTML =
        '<span class="sc-bg" style="--sc-grad:' + s.grad + '"></span>' +
        '<span class="sc-emoji">' + scIconSvg(s.icon) + "</span>" +
        '<span class="sc-body"><span class="sc-title">' + escapeHtml(s.title) + '</span>' +
        '<span class="sc-desc">' + escapeHtml(s.desc) + "</span></span>";
      a.style.setProperty("--sc-grad", s.grad);
      if (s.action === "mikrofon") {
        a.addEventListener("click", function (e) { e.preventDefault(); openMicModal(); });
      } else if (s.action === "kamera") {
        a.addEventListener("click", function (e) { e.preventDefault(); openCamModal(); });
      } else if (s.filterCat) {
        a.addEventListener("click", function () { setCategory(s.filterCat); });
      }
      els.sectionsGrid.appendChild(a);
    });
  }

  /* ---------- Yapay Zeka bölümü (tek nokta) ---------- */
  function renderAiPortal() {
    els.aiPortalWrap.innerHTML = "";
    var card = document.createElement("button");
    card.type = "button";
    card.className = "ai-portal-card";

    var stack = document.createElement("span");
    stack.className = "ai-portal-stack";
    AI_TOOLS.forEach(function (tool) {
      var badge = document.createElement("span");
      badge.className = "ai-portal-mini";
      badge.innerHTML = aiBadgeSvg(tool.key);
      stack.appendChild(badge);
    });
    card.appendChild(stack);

    var text = document.createElement("span");
    text.className = "ai-portal-text";
    text.innerHTML = '<span class="ai-portal-title">Yapay Zekâlarım</span><span class="ai-portal-sub">' + AI_TOOLS.length + " asistana tek noktadan eriş</span>";
    card.appendChild(text);

    var arrow = document.createElement("span");
    arrow.className = "ai-portal-arrow";
    arrow.textContent = "→";
    card.appendChild(arrow);

    card.addEventListener("click", openAiPicker);
    els.aiPortalWrap.appendChild(card);
  }

  function renderAiPickerGrid() {
    els.aiPickerGrid.innerHTML = "";
    AI_TOOLS.forEach(function (tool) {
      var a = document.createElement("a");
      a.className = "ai-card";
      a.href = tool.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML =
        '<span class="ai-badge">' + aiBadgeSvg(tool.key) + "</span>" +
        '<span class="ai-name">' + escapeHtml(tool.name) + "</span>" +
        '<span class="ai-desc">' + escapeHtml(tool.desc) + "</span>";
      els.aiPickerGrid.appendChild(a);
    });
  }

  function openAiPicker() { els.aiPickerModal.classList.remove("hidden"); }
  function closeAiPicker() { els.aiPickerModal.classList.add("hidden"); }

  /* ---------- Real site logos ---------- */
  function faviconUrl(url) {
    try {
      var host = new URL(url).hostname;
      return "https://www.google.com/s2/favicons?sz=64&domain=" + encodeURIComponent(host);
    } catch (e) {
      return null;
    }
  }

  function makeLogoImg(url, emojiFallback, sizeClass) {
    var favicon = faviconUrl(url);
    var img = document.createElement("img");
    img.className = sizeClass;
    img.alt = "";
    img.loading = "lazy";
    if (!favicon) {
      img.replaceWith(document.createTextNode(emojiFallback || "🔗"));
      return null;
    }
    img.src = favicon;
    img.onerror = function () {
      var span = document.createElement("span");
      span.textContent = emojiFallback || "🔗";
      img.replaceWith(span);
    };
    return img;
  }

  /* ---------- Links ---------- */
  function renderQuicknav() {
    els.quicknav.innerHTML = "";
    var home = document.createElement("a");
    home.className = "qn-item";
    home.href = "#top";
    home.textContent = "🏠 Ana Sayfa";
    els.quicknav.appendChild(home);

    state.links.forEach(function (l) {
      var a = document.createElement("a");
      a.className = "qn-item";
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noopener";
      var logo = makeLogoImg(l.url, l.icon, "qn-logo");
      if (logo) a.appendChild(logo);
      a.appendChild(document.createTextNode(" " + l.name));
      els.quicknav.appendChild(a);
    });
  }

  function renderCatFilters() {
    els.catFilters.innerHTML = "";
    CATEGORIES.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cat-chip" + (state.category === c.id ? " active" : "");
      b.textContent = c.label;
      b.addEventListener("click", function () { setCategory(c.id); });
      els.catFilters.appendChild(b);
    });
  }

  function setCategory(cat) {
    state.category = cat;
    renderCatFilters();
    renderLinks();
    var target = $("baglantilar");
    if (target) target.scrollIntoView({ behavior: "smooth" });
  }

  function renderLinks() {
    var q = state.search.trim().toLowerCase();
    els.linksGrid.innerHTML = "";
    var filtered = state.links.filter(function (l) {
      var matchesCat = state.category === "all" || (l.cat || "genel") === state.category;
      var matchesSearch = !q || l.name.toLowerCase().indexOf(q) !== -1;
      return matchesCat && matchesSearch;
    });
    els.linksEmptyHint.classList.toggle("hidden", filtered.length > 0);

    filtered.forEach(function (l) {
      var a = document.createElement("a");
      a.className = "link-card";
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noopener";

      var iconSpan = document.createElement("span");
      iconSpan.className = "lc-icon";
      var logo = makeLogoImg(l.url, l.icon, "lc-logo");
      if (logo) iconSpan.appendChild(logo);
      else iconSpan.textContent = l.icon || "🔗";
      a.appendChild(iconSpan);

      var nameSpan = document.createElement("span");
      nameSpan.className = "lc-name";
      nameSpan.textContent = l.name;
      a.appendChild(nameSpan);

      var editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "lc-edit";
      editBtn.title = "Düzenle";
      editBtn.textContent = "✏️";
      editBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openLinkModal(l);
      });
      a.appendChild(editBtn);

      els.linksGrid.appendChild(a);
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function openLinkModal(link) {
    $("linkModalTitle").textContent = link ? "Bağlantıyı Düzenle" : "Bağlantı Ekle";
    $("linkId").value = link ? link.id : "";
    $("linkName").value = link ? link.name : "";
    $("linkUrl").value = link ? link.url : "";
    $("linkIcon").value = link ? (link.icon || "") : "";
    $("linkCategory").value = link ? (link.cat || "genel") : (state.category !== "all" ? state.category : "genel");
    $("deleteLinkBtn").classList.toggle("hidden", !link);
    els.linkModal.classList.remove("hidden");
    $("linkName").focus();
  }
  function closeLinkModal() { els.linkModal.classList.add("hidden"); }

  function saveLinks() { saveJSON(LS_LINKS, state.links); }

  function handleLinkSubmit(e) {
    e.preventDefault();
    var id = $("linkId").value;
    var name = $("linkName").value.trim();
    var url = $("linkUrl").value.trim();
    var icon = $("linkIcon").value.trim();
    var cat = $("linkCategory").value;
    if (!name || !url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    if (id) {
      var existing = state.links.find(function (l) { return l.id === id; });
      if (existing) { existing.name = name; existing.url = url; existing.icon = icon; existing.cat = cat; }
    } else {
      state.links.push({ id: uid(), name: name, url: url, icon: icon, cat: cat });
    }
    saveLinks();
    renderLinks();
    renderQuicknav();
    closeLinkModal();
    showToast("Bağlantı kaydedildi.");
  }

  function handleDeleteLink() {
    var id = $("linkId").value;
    if (!id) return;
    state.links = state.links.filter(function (l) { return l.id !== id; });
    saveLinks();
    renderLinks();
    renderQuicknav();
    closeLinkModal();
    showToast("Bağlantı silindi.");
  }

  /* ---------- Mikrofon (ses -> yazı) ---------- */
  var micState = { recognition: null, listening: false, transcript: "" };

  function renderMicAiLinks() {
    els.micAiLinks.innerHTML = "";
    AI_TOOLS.forEach(function (tool) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tool-ai-link";
      b.innerHTML = '<span class="tool-ai-badge">' + aiBadgeSvg(tool.key) + "</span>" + escapeHtml(tool.name);
      b.addEventListener("click", function () {
        var text = micState.transcript.trim();
        if (text && navigator.clipboard) {
          navigator.clipboard.writeText(text).then(function () {
            showToast("Metin kopyalandı — " + tool.name + " içine yapıştırabilirsin.");
          });
        }
        window.open(tool.url, "_blank", "noopener");
      });
      els.micAiLinks.appendChild(b);
    });
  }

  function getSpeechRecognition() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function openMicModal() {
    els.micModal.classList.remove("hidden");
    var SR = getSpeechRecognition();
    if (!SR) {
      $("micHint").textContent = "Tarayıcın sesle yazıya çevirmeyi desteklemiyor. Chrome veya Edge ile dene.";
      $("micToggleBtn").disabled = true;
      return;
    }
    $("micToggleBtn").disabled = false;
  }

  function closeMicModal() {
    stopListening();
    els.micModal.classList.add("hidden");
  }

  function stopListening() {
    if (micState.recognition && micState.listening) {
      micState.recognition.stop();
    }
  }

  function toggleListening() {
    var SR = getSpeechRecognition();
    if (!SR) return;

    if (micState.listening) {
      stopListening();
      return;
    }

    if (!micState.recognition) {
      micState.recognition = new SR();
      micState.recognition.lang = "tr-TR";
      micState.recognition.continuous = true;
      micState.recognition.interimResults = true;

      micState.recognition.onresult = function (e) {
        var finalText = "";
        var interimText = "";
        for (var i = 0; i < e.results.length; i++) {
          var chunk = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += chunk + " ";
          else interimText += chunk;
        }
        micState.transcript = finalText.trim();
        var display = (finalText + interimText).trim() || els.micTranscript.dataset.empty;
        els.micTranscript.textContent = display;
      };
      micState.recognition.onerror = function () {
        showToast("Mikrofon erişimi alınamadı ya da izin verilmedi.");
        setListeningUI(false);
      };
      micState.recognition.onend = function () {
        setListeningUI(false);
      };
    }

    try {
      micState.recognition.start();
      setListeningUI(true);
    } catch (e) {
      showToast("Mikrofon başlatılamadı.");
    }
  }

  function setListeningUI(on) {
    micState.listening = on;
    $("micToggleBtn").textContent = on ? "⏹️ Dinlemeyi Durdur" : "🎙️ Dinlemeye Başla";
  }

  function copyMicTranscript() {
    var text = micState.transcript.trim();
    if (!text) { showToast("Önce bir şey söyle."); return; }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () { showToast("Kopyalandı."); });
    }
  }

  /* ---------- Kamera (fotoğraf çek) ---------- */
  var camState = { stream: null, photoDataUrl: null };

  function openCamModal() {
    els.camModal.classList.remove("hidden");
    resetCamView();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $("camHint").textContent = "Tarayıcın kameraya erişimi desteklemiyor.";
      $("camShootBtn").disabled = true;
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(function (stream) {
        camState.stream = stream;
        els.camVideo.srcObject = stream;
      })
      .catch(function () {
        $("camHint").textContent = "Kameraya erişilemedi ya da izin verilmedi.";
        $("camShootBtn").disabled = true;
      });
  }

  function closeCamModal() {
    stopCamStream();
    els.camModal.classList.add("hidden");
  }

  function stopCamStream() {
    if (camState.stream) {
      camState.stream.getTracks().forEach(function (t) { t.stop(); });
      camState.stream = null;
    }
  }

  function resetCamView() {
    camState.photoDataUrl = null;
    els.camVideo.classList.remove("hidden");
    els.camPhoto.classList.add("hidden");
    $("camShootBtn").classList.remove("hidden");
    $("camRetakeBtn").classList.add("hidden");
    $("camDownloadBtn").classList.add("hidden");
    $("camCopyBtn").classList.add("hidden");
  }

  function shootPhoto() {
    var video = els.camVideo;
    var canvas = els.camCanvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    camState.photoDataUrl = canvas.toDataURL("image/png");

    els.camPhoto.src = camState.photoDataUrl;
    els.camVideo.classList.add("hidden");
    els.camPhoto.classList.remove("hidden");
    $("camShootBtn").classList.add("hidden");
    $("camRetakeBtn").classList.remove("hidden");
    $("camDownloadBtn").classList.remove("hidden");
    $("camCopyBtn").classList.remove("hidden");
  }

  function downloadPhoto() {
    if (!camState.photoDataUrl) return;
    var a = document.createElement("a");
    a.href = camState.photoDataUrl;
    a.download = "fotograf-" + Date.now() + ".png";
    a.click();
  }

  function copyPhoto() {
    if (!camState.photoDataUrl || !navigator.clipboard || !window.ClipboardItem) {
      showToast("Bu tarayıcıda panoya kopyalama desteklenmiyor, indirmeyi dene.");
      return;
    }
    fetch(camState.photoDataUrl)
      .then(function (res) { return res.blob(); })
      .then(function (blob) {
        return navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      })
      .then(function () { showToast("Fotoğraf panoya kopyalandı."); })
      .catch(function () { showToast("Panoya kopyalanamadı."); });
  }

  /* ---------- Search / edit mode / nav ---------- */
  function handleSearch(e) {
    state.search = e.target.value;
    renderSections();
    renderLinks();
  }

  function toggleEditMode() {
    var on = document.body.classList.toggle("edit-mode");
    $("editModeBtn").textContent = on ? "✅ Bitti" : "✏️ Düzenle";
  }

  function toggleNav() {
    var nav = els.quicknav;
    var open = nav.classList.toggle("open");
    $("navToggle").setAttribute("aria-expanded", open ? "true" : "false");
  }

  /* ---------- Init ---------- */
  function init() {
    els.quicknav = $("quicknav");
    els.sectionsGrid = $("sectionsGrid");
    els.aiPortalWrap = $("aiPortalWrap");
    els.aiPickerModal = $("aiPickerModal");
    els.aiPickerGrid = $("aiPickerGrid");
    els.linksGrid = $("linksGrid");
    els.linksEmptyHint = $("linksEmptyHint");
    els.catFilters = $("catFilters");
    els.toast = $("toast");
    els.linkModal = $("linkModal");
    els.micModal = $("micModal");
    els.micTranscript = $("micTranscript");
    els.micAiLinks = $("micAiLinks");
    els.camModal = $("camModal");
    els.camVideo = $("camVideo");
    els.camCanvas = $("camCanvas");
    els.camPhoto = $("camPhoto");

    state.links = loadJSON(LS_LINKS, null) || DEFAULT_LINKS.slice();
    if (!loadJSON(LS_LINKS, null)) saveLinks();

    applyThemeUI();
    renderSections();
    renderAiPortal();
    renderAiPickerGrid();
    renderQuicknav();
    renderCatFilters();
    renderLinks();
    renderMicAiLinks();

    $("themeToggle").addEventListener("click", toggleTheme);
    $("editModeBtn").addEventListener("click", toggleEditMode);
    $("navToggle").addEventListener("click", toggleNav);
    $("searchInput").addEventListener("input", handleSearch);
    $("addLinkBtn").addEventListener("click", function () { openLinkModal(null); });
    $("linkModalCloseBtn").addEventListener("click", closeLinkModal);
    els.linkModal.addEventListener("click", function (e) { if (e.target === els.linkModal) closeLinkModal(); });
    $("linkForm").addEventListener("submit", handleLinkSubmit);
    $("deleteLinkBtn").addEventListener("click", handleDeleteLink);

    $("aiPickerCloseBtn").addEventListener("click", closeAiPicker);
    els.aiPickerModal.addEventListener("click", function (e) { if (e.target === els.aiPickerModal) closeAiPicker(); });

    $("micModalCloseBtn").addEventListener("click", closeMicModal);
    els.micModal.addEventListener("click", function (e) { if (e.target === els.micModal) closeMicModal(); });
    $("micToggleBtn").addEventListener("click", toggleListening);
    $("micCopyBtn").addEventListener("click", copyMicTranscript);

    $("camModalCloseBtn").addEventListener("click", closeCamModal);
    els.camModal.addEventListener("click", function (e) { if (e.target === els.camModal) closeCamModal(); });
    $("camShootBtn").addEventListener("click", shootPhoto);
    $("camRetakeBtn").addEventListener("click", function () { resetCamView(); if (camState.stream) els.camVideo.srcObject = camState.stream; });
    $("camDownloadBtn").addEventListener("click", downloadPhoto);
    $("camCopyBtn").addEventListener("click", copyPhoto);

    $("year").textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
