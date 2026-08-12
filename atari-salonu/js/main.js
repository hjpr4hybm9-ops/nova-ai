(function () {
  "use strict";

  var LS_GAMES = "atari.games";
  var LS_THEME = "atari.theme";
  var EJS_CDN = "https://cdn.emulatorjs.org/stable/data/";

  /* Not: EmulatorJS'in çekirdek (core) kimlikleri sürümden sürüme değişebilir.
     Bir platform yüklenmezse EmulatorJS belgelerinden güncel EJS_core değerini kontrol et. */
  var PLATFORMS = [
    { id: "nes", label: "NES", core: "nes", emoji: "🎮", grad: "linear-gradient(135deg,#7a1e2c,#150c22)" },
    { id: "snes", label: "SNES", core: "snes", emoji: "🕹️", grad: "linear-gradient(135deg,#1e4a7a,#150c22)" },
    { id: "genesis", label: "Sega Genesis", core: "segaMD", emoji: "🌀", grad: "linear-gradient(135deg,#1e7a5a,#150c22)" },
    { id: "gb", label: "Game Boy / Color", core: "gb", emoji: "🟩", grad: "linear-gradient(135deg,#3a7a1e,#150c22)" },
    { id: "gba", label: "Game Boy Advance", core: "gba", emoji: "🟪", grad: "linear-gradient(135deg,#5a1e7a,#150c22)" },
    { id: "n64", label: "Nintendo 64", core: "n64", emoji: "🔷", grad: "linear-gradient(135deg,#1e3d7a,#150c22)" },
    { id: "psx", label: "PlayStation", core: "psx", emoji: "⬛", grad: "linear-gradient(135deg,#333,#150c22)" },
    { id: "atari2600", label: "Atari 2600", core: "atari2600", emoji: "👾", grad: "linear-gradient(135deg,#7a5a1e,#150c22)" },
    { id: "arcade", label: "Arcade / Neo-Geo / CPS", core: "arcade", emoji: "🎰", grad: "linear-gradient(135deg,#7a1e6a,#150c22)" }
  ];
  var PLATFORM_MAP = {};
  PLATFORMS.forEach(function (p) { PLATFORM_MAP[p.id] = p; });

  var BUILTIN_PLATFORM = { id: "builtin", label: "Mini Oyun", core: null, emoji: "🎮", grad: "linear-gradient(135deg,#1e5f3a,#150c22)" };

  var BUILTIN_GAMES = [
    { id: "builtin-invaders", title: "Uzay İstilası", platform: "builtin", builtin: "invaders", romName: "Yerleşik oyun" },
    { id: "builtin-asteroids", title: "Asteroit", platform: "builtin", builtin: "asteroids", romName: "Yerleşik oyun" },
    { id: "builtin-missile", title: "Füze Savunması", platform: "builtin", builtin: "missile", romName: "Yerleşik oyun" },
    { id: "builtin-snake", title: "Yılan", platform: "builtin", builtin: "snake", romName: "Yerleşik oyun" },
    { id: "builtin-pong", title: "Pong", platform: "builtin", builtin: "pong", romName: "Yerleşik oyun" },
    { id: "builtin-breakout", title: "Tuğla Kırma", platform: "builtin", builtin: "breakout", romName: "Yerleşik oyun" },
    { id: "builtin-2048", title: "2048", platform: "builtin", builtin: "twenty48", romName: "Yerleşik oyun" },
    { id: "builtin-memory", title: "Hafıza", platform: "builtin", builtin: "memory", romName: "Yerleşik oyun" }
  ];
  var BUILTIN_ICONS = {
    snake: "🐍", pong: "🏓", breakout: "🧱", twenty48: "🔢", memory: "🍀",
    invaders: "👾", asteroids: "☄️", missile: "🚀"
  };

  var els = {};
  var state = { games: [], search: "", platform: "all", currentGameId: null };
  var coverUrlCache = {};

  function $(id) { return document.getElementById(id); }

  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveGames() {
    try { localStorage.setItem(LS_GAMES, JSON.stringify(state.games)); } catch (e) {}
  }

  function uid() { return "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function showToast(msg) {
    var t = els.toast;
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(showToast._tid);
    showToast._tid = setTimeout(function () { t.classList.add("hidden"); }, 2400);
  }

  /* ---------- Theme ---------- */
  function applyThemeUI() {
    var stored = localStorage.getItem(LS_THEME);
    if (stored === "light" || stored === "dark") document.documentElement.setAttribute("data-theme", stored);
  }
  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme");
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var effective = current || (prefersDark ? "dark" : "light");
    var next = effective === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(LS_THEME, next);
  }

  /* ---------- Platform filter chips ---------- */
  function renderPlatformFilters() {
    var wrap = els.platformFilters;
    wrap.innerHTML = "";
    var all = document.createElement("button");
    all.type = "button";
    all.className = "pf-chip" + (state.platform === "all" ? " active" : "");
    all.textContent = "Hepsi";
    all.addEventListener("click", function () { state.platform = "all"; renderPlatformFilters(); renderGames(); });
    wrap.appendChild(all);

    [BUILTIN_PLATFORM].concat(PLATFORMS).forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pf-chip" + (state.platform === p.id ? " active" : "");
      b.textContent = p.emoji + " " + p.label;
      b.addEventListener("click", function () { state.platform = p.id; renderPlatformFilters(); renderGames(); });
      wrap.appendChild(b);
    });
  }

  /* ---------- Platform select in modal ---------- */
  function fillPlatformSelect() {
    var sel = $("gamePlatform");
    sel.innerHTML = "";
    PLATFORMS.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.emoji + " " + p.label;
      sel.appendChild(opt);
    });
  }

  /* ---------- Games grid ---------- */
  function allGames() { return BUILTIN_GAMES.concat(state.games); }

  function renderGames() {
    var q = state.search.trim().toLowerCase();
    var list = allGames().filter(function (g) {
      if (state.platform !== "all" && g.platform !== state.platform) return false;
      if (q && g.title.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    els.gamesGrid.innerHTML = "";
    els.emptyState.classList.toggle("hidden", list.length > 0);
    els.gamesGrid.classList.toggle("hidden", list.length === 0);

    list.forEach(function (g) {
      var isBuiltin = !!g.builtin;
      var p = isBuiltin ? BUILTIN_PLATFORM : (PLATFORM_MAP[g.platform] || PLATFORMS[0]);
      var emoji = isBuiltin ? (BUILTIN_ICONS[g.builtin] || "🎮") : p.emoji;
      var card = document.createElement("div");
      card.className = "game-card";
      card.innerHTML =
        '<div class="game-cover" style="--gc-grad:' + p.grad + '">' +
        '<span class="gc-platform-badge">' + escapeHtml(p.label) + "</span>" +
        (isBuiltin ? "" : '<button type="button" class="gc-delete" title="Sil">🗑️</button>') +
        '<span class="gc-emoji">' + emoji + "</span>" +
        '<button type="button" class="gc-play">▶ OYNA</button>' +
        "</div>" +
        '<div class="game-info">' +
        '<span class="gi-title">' + escapeHtml(g.title) + "</span>" +
        '<span class="gi-meta">' + escapeHtml(p.label) + "</span>" +
        '<span class="gi-file">' + escapeHtml(g.romName || "") + "</span>" +
        "</div>";

      card.querySelector(".gc-play").addEventListener("click", function () { playGame(g); });
      var delBtn = card.querySelector(".gc-delete");
      if (delBtn) delBtn.addEventListener("click", function () { deleteGame(g); });

      var coverEl = card.querySelector(".game-cover");
      if (g.hasCover) loadCoverImage(g.id, coverEl);

      els.gamesGrid.appendChild(card);
    });
  }

  function loadCoverImage(id, coverEl) {
    function apply(url) {
      var img = document.createElement("img");
      img.src = url;
      img.alt = "";
      coverEl.insertBefore(img, coverEl.firstChild);
    }
    if (coverUrlCache[id]) { apply(coverUrlCache[id]); return; }
    window.AtariDB.get(id + ":cover").then(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      coverUrlCache[id] = url;
      apply(url);
    });
  }

  /* ---------- Add game modal ---------- */
  function openAddGameModal() {
    $("addGameForm").reset();
    els.addGameModal.classList.remove("hidden");
    $("gameTitle").focus();
  }
  function closeAddGameModal() { els.addGameModal.classList.add("hidden"); }

  function handleAddGameSubmit(e) {
    e.preventDefault();
    var title = $("gameTitle").value.trim();
    var platform = $("gamePlatform").value;
    var romFile = $("gameRomFile").files[0];
    var coverFile = $("gameCoverFile").files[0];
    if (!title || !romFile) return;

    var submitBtn = $("addGameSubmitBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Ekleniyor...";

    var id = uid();
    var tasks = [window.AtariDB.put(id + ":rom", romFile)];
    if (coverFile) tasks.push(window.AtariDB.put(id + ":cover", coverFile));

    Promise.all(tasks).then(function () {
      state.games.unshift({
        id: id,
        title: title,
        platform: platform,
        romName: romFile.name,
        hasCover: !!coverFile,
        addedAt: Date.now()
      });
      saveGames();
      renderGames();
      closeAddGameModal();
      showToast("\"" + title + "\" kütüphaneye eklendi.");
    }).catch(function () {
      showToast("Dosya kaydedilirken bir hata oluştu.");
    }).finally(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = "Kütüphaneye Ekle";
    });
  }

  function deleteGame(g) {
    if (!confirm('"' + g.title + '" kütüphaneden ve tarayıcı deposundan silinsin mi?')) return;
    state.games = state.games.filter(function (x) { return x.id !== g.id; });
    saveGames();
    window.AtariDB.delete(g.id + ":rom");
    window.AtariDB.delete(g.id + ":cover");
    if (coverUrlCache[g.id]) { URL.revokeObjectURL(coverUrlCache[g.id]); delete coverUrlCache[g.id]; }
    renderGames();
    showToast("Oyun silindi.");
  }

  /* ---------- Play / emulator ---------- */
  var activeObjectUrl = null;
  var activeMiniGame = null;

  function playGame(g) {
    els.coinOverlay.classList.remove("hidden");
    setTimeout(function () {
      els.coinOverlay.classList.add("hidden");
      if (g.builtin) launchMiniGame(g);
      else launchPlayer(g);
    }, 700);
  }

  function launchMiniGame(g) {
    teardownPlayer();
    state.currentGameId = g.id;
    $("playerTitle").textContent = g.title + " · Yerleşik oyun";
    $("reloadPlayerBtn").classList.add("hidden");
    els.playerOverlay.classList.remove("hidden");
    var mod = window.MiniGames && window.MiniGames[g.builtin];
    if (!mod) { showToast("Bu mini oyun yüklenemedi."); return; }
    activeMiniGame = mod.start(els.gameContainer);
  }

  function launchPlayer(g) {
    window.AtariDB.get(g.id + ":rom").then(function (blob) {
      if (!blob) { showToast("ROM dosyası bulunamadı."); return; }
      var p = PLATFORM_MAP[g.platform] || PLATFORMS[0];
      teardownPlayer();

      state.currentGameId = g.id;
      $("playerTitle").textContent = g.title + " · " + p.label;
      $("reloadPlayerBtn").classList.remove("hidden");
      els.playerOverlay.classList.remove("hidden");

      activeObjectUrl = URL.createObjectURL(blob);
      window.EJS_player = "#gameContainer";
      window.EJS_core = p.core;
      window.EJS_gameUrl = activeObjectUrl;
      window.EJS_pathtodata = EJS_CDN;
      window.EJS_gameName = g.title;
      window.EJS_startOnLoaded = true;

      var script = document.createElement("script");
      script.id = "ejsLoaderScript";
      script.src = EJS_CDN + "loader.js";
      script.onerror = function () { showToast("Emülatör yüklenemedi. İnternet bağlantını kontrol et."); };
      document.body.appendChild(script);
    }).catch(function () {
      showToast("ROM dosyası okunurken hata oluştu.");
    });
  }

  function teardownPlayer() {
    if (activeMiniGame) { activeMiniGame.run(); activeMiniGame = null; }
    var oldScript = $("ejsLoaderScript");
    if (oldScript) oldScript.remove();
    els.gameContainer.innerHTML = "";
    if (activeObjectUrl) { URL.revokeObjectURL(activeObjectUrl); activeObjectUrl = null; }
    try {
      delete window.EJS_player; delete window.EJS_core; delete window.EJS_gameUrl;
      delete window.EJS_pathtodata; delete window.EJS_gameName; delete window.EJS_emulator;
    } catch (e) {}
  }

  function closePlayer() {
    els.playerOverlay.classList.add("hidden");
    teardownPlayer();
    state.currentGameId = null;
  }

  function reloadPlayer() {
    if (!state.currentGameId) return;
    var g = allGames().find(function (x) { return x.id === state.currentGameId; });
    if (g && !g.builtin) launchPlayer(g);
  }

  /* ---------- Search / nav ---------- */
  function handleSearch(e) { state.search = e.target.value; renderGames(); }
  function toggleNav() {
    var open = els.mainNav.classList.toggle("open");
    $("navToggle").setAttribute("aria-expanded", open ? "true" : "false");
  }

  /* ---------- Init ---------- */
  function init() {
    els.gamesGrid = $("gamesGrid");
    els.emptyState = $("emptyState");
    els.platformFilters = $("platformFilters");
    els.toast = $("toast");
    els.addGameModal = $("addGameModal");
    els.coinOverlay = $("coinOverlay");
    els.playerOverlay = $("playerOverlay");
    els.gameContainer = $("gameContainer");
    els.mainNav = $("mainNav");

    state.games = loadJSON(LS_GAMES, []);

    applyThemeUI();
    fillPlatformSelect();
    renderPlatformFilters();
    renderGames();

    $("themeToggle").addEventListener("click", toggleTheme);
    $("navToggle").addEventListener("click", toggleNav);
    $("searchInput").addEventListener("input", handleSearch);

    $("addGameBtn").addEventListener("click", openAddGameModal);
    $("emptyAddBtn").addEventListener("click", openAddGameModal);
    $("addGameCloseBtn").addEventListener("click", closeAddGameModal);
    $("addGameCancelBtn").addEventListener("click", closeAddGameModal);
    els.addGameModal.addEventListener("click", function (e) { if (e.target === els.addGameModal) closeAddGameModal(); });
    $("addGameForm").addEventListener("submit", handleAddGameSubmit);

    $("closePlayerBtn").addEventListener("click", closePlayer);
    $("reloadPlayerBtn").addEventListener("click", reloadPlayer);

    $("year").textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
