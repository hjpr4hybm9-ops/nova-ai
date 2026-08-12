(function () {
  "use strict";

  var LS_LINKS = "ersflix.links";
  var LS_SECTIONS_HIDDEN = "ersflix.sections.hidden";
  var LS_SERVER = "ersflix.server";
  var LS_THEME = "ersflix.theme";

  var DEFAULT_SECTIONS = [
    { id: "ev", title: "Ev", desc: "Başlangıç ekranın", emoji: "🏠", href: "#top", grad: "linear-gradient(135deg,#1e3a5f,#0b1526)" },
    { id: "oyun", title: "Oyun", desc: "Atari Salonu'na git", emoji: "🕹️", href: "../atari-salonu/index.html", grad: "linear-gradient(135deg,#3b1f5f,#0b1526)" },
    { id: "video", title: "Video", desc: "İzleme listesi", emoji: "🎬", href: "#baglantilar", grad: "linear-gradient(135deg,#1f5f4a,#0b1526)" },
    { id: "blog", title: "Blog", desc: "Notlar ve yazılar", emoji: "📝", href: "#baglantilar", grad: "linear-gradient(135deg,#5f3a1f,#0b1526)" },
    { id: "uzak", title: "Uzak Bağlantı", desc: "Sunucuna eriş", emoji: "🖧", href: "#sunucu", grad: "linear-gradient(135deg,#1f3d5f,#0b1526)" },
    { id: "projeler", title: "Projeler", desc: "Kişisel projelerin", emoji: "🗂️", href: "#baglantilar", grad: "linear-gradient(135deg,#5f1f3d,#0b1526)" }
  ];

  var DEFAULT_LINKS = [
    { id: "instagram", name: "Instagram", url: "https://instagram.com", icon: "📸" },
    { id: "youtube", name: "YouTube", url: "https://youtube.com", icon: "▶️" },
    { id: "telegram", name: "Telegram", url: "https://telegram.org", icon: "✈️" },
    { id: "chatgpt", name: "ChatGPT", url: "https://chat.openai.com", icon: "💬" },
    { id: "deepseek", name: "DeepSeek", url: "https://chat.deepseek.com", icon: "🌊" },
    { id: "google", name: "Google", url: "https://google.com", icon: "🔎" },
    { id: "donanim", name: "Donanım Haber", url: "https://donanimhaber.com", icon: "💻" }
  ];

  var els = {};
  var state = { links: [], search: "" };

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
      a.href = s.href;
      a.innerHTML =
        '<span class="sc-bg" style="--sc-grad:' + s.grad + '"></span>' +
        '<span class="sc-emoji">' + s.emoji + "</span>" +
        '<span class="sc-body"><span class="sc-title">' + escapeHtml(s.title) + '</span>' +
        '<span class="sc-desc">' + escapeHtml(s.desc) + "</span></span>";
      a.style.setProperty("--sc-grad", s.grad);
      els.sectionsGrid.appendChild(a);
    });
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
      a.textContent = (l.icon || "🔗") + " " + l.name;
      els.quicknav.appendChild(a);
    });
  }

  function renderLinks() {
    var q = state.search.trim().toLowerCase();
    els.linksGrid.innerHTML = "";
    var filtered = state.links.filter(function (l) {
      return !q || l.name.toLowerCase().indexOf(q) !== -1;
    });
    els.linksEmptyHint.classList.toggle("hidden", filtered.length > 0);

    filtered.forEach(function (l) {
      var a = document.createElement("a");
      a.className = "link-card";
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML =
        '<span class="lc-icon">' + (l.icon || "🔗") + "</span>" +
        '<span class="lc-name">' + escapeHtml(l.name) + "</span>" +
        '<button type="button" class="lc-edit" data-id="' + l.id + '" title="Düzenle">✏️</button>';
      a.querySelector(".lc-edit").addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openLinkModal(l);
      });
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
    if (!name || !url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    if (id) {
      var existing = state.links.find(function (l) { return l.id === id; });
      if (existing) { existing.name = name; existing.url = url; existing.icon = icon; }
    } else {
      state.links.push({ id: uid(), name: name, url: url, icon: icon });
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

  /* ---------- Server panel ---------- */
  function renderServer() {
    var addr = localStorage.getItem(LS_SERVER) || "";
    els.serverAddr.textContent = addr || "Henüz ayarlanmadı";
  }
  function openServerModal() {
    $("serverInput").value = localStorage.getItem(LS_SERVER) || "";
    els.serverModal.classList.remove("hidden");
    $("serverInput").focus();
  }
  function closeServerModal() { els.serverModal.classList.add("hidden"); }
  function handleServerSubmit(e) {
    e.preventDefault();
    var val = $("serverInput").value.trim();
    if (val) localStorage.setItem(LS_SERVER, val);
    else localStorage.removeItem(LS_SERVER);
    renderServer();
    closeServerModal();
    showToast("Sunucu adresi kaydedildi.");
  }
  function copyServer() {
    var addr = localStorage.getItem(LS_SERVER) || "";
    if (!addr) { showToast("Önce bir sunucu adresi ekle."); return; }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(addr).then(function () { showToast("Kopyalandı."); });
    } else {
      showToast(addr);
    }
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
    els.linksGrid = $("linksGrid");
    els.linksEmptyHint = $("linksEmptyHint");
    els.serverAddr = $("serverAddr");
    els.toast = $("toast");
    els.linkModal = $("linkModal");
    els.serverModal = $("serverModal");

    state.links = loadJSON(LS_LINKS, null) || DEFAULT_LINKS.slice();
    if (!loadJSON(LS_LINKS, null)) saveLinks();

    applyThemeUI();
    renderSections();
    renderQuicknav();
    renderLinks();
    renderServer();

    $("themeToggle").addEventListener("click", toggleTheme);
    $("editModeBtn").addEventListener("click", toggleEditMode);
    $("navToggle").addEventListener("click", toggleNav);
    $("searchInput").addEventListener("input", handleSearch);
    $("addLinkBtn").addEventListener("click", function () { openLinkModal(null); });
    $("linkModalCloseBtn").addEventListener("click", closeLinkModal);
    els.linkModal.addEventListener("click", function (e) { if (e.target === els.linkModal) closeLinkModal(); });
    $("linkForm").addEventListener("submit", handleLinkSubmit);
    $("deleteLinkBtn").addEventListener("click", handleDeleteLink);

    $("editServerBtn").addEventListener("click", openServerModal);
    $("copyServerBtn").addEventListener("click", copyServer);
    $("serverModalCloseBtn").addEventListener("click", closeServerModal);
    els.serverModal.addEventListener("click", function (e) { if (e.target === els.serverModal) closeServerModal(); });
    $("serverForm").addEventListener("submit", handleServerSubmit);

    $("year").textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
