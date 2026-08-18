(function () {
  "use strict";

  var TOTAL_ROUNDS = 8;
  var MAX_SCORES_STORED = 5;
  var STORAGE_THEME = "dondurmaci.theme";
  var STORAGE_SOUND = "dondurmaci.sound";
  var STORAGE_HIGHSCORE = "dondurmaci.highscore";
  var STORAGE_SCORES = "dondurmaci.scores";

  var FLAVORS = [
    { name: "çikolatalı", emoji: "🍫" },
    { name: "vanilyalı", emoji: "🍦" },
    { name: "çilekli", emoji: "🍓" },
    { name: "fıstıklı", emoji: "🥜" },
    { name: "limonlu", emoji: "🍋" },
    { name: "karpuzlu", emoji: "🍉" },
    { name: "muzlu", emoji: "🍌" }
  ];
  var AVATARS = ["🧑", "👦", "👧", "👴", "👵", "🧕", "👨‍🦱", "👩‍🦰", "🧔", "👩"];

  var el = {};
  [
    "startScreen", "playScreen", "endScreen",
    "startBtn", "restartBtn",
    "scoreValue", "roundValue", "comboValue",
    "customerBubble", "customerAvatar",
    "coneWrap", "flavorBadge",
    "floatLayer",
    "patienceFill", "timingTrack", "timingZone", "timingMarker",
    "gameMessage", "teaseBtn", "deliverBtn",
    "endEmoji", "endTitle", "endSummary", "endScore", "endBestCombo", "endServed",
    "leaderboard", "leaderboardEmpty", "leaderboardList", "clearScoresBtn",
    "heroHighscore",
    "themeToggle", "soundToggle", "navToggle", "mainNav", "toast"
  ].forEach(function (id) { el[id] = document.getElementById(id); });

  /* ---------- Theme ---------- */
  function applyThemeToggleIcon() {}
  el.themeToggle && el.themeToggle.addEventListener("click", function () {
    var current = document.documentElement.getAttribute("data-theme");
    var next;
    if (current === "dark") next = "light";
    else if (current === "light") next = "dark";
    else {
      var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      next = prefersDark ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(STORAGE_THEME, next); } catch (e) {}
  });

  /* ---------- Nav toggle ---------- */
  el.navToggle && el.navToggle.addEventListener("click", function () {
    var open = el.mainNav.classList.toggle("open");
    el.navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  el.mainNav && el.mainNav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") el.mainNav.classList.remove("open");
  });

  /* ---------- Sound ---------- */
  var soundOn = true;
  try { soundOn = localStorage.getItem(STORAGE_SOUND) !== "off"; } catch (e) {}
  var audioCtx = null;
  function ensureAudio() {
    if (!soundOn) return null;
    if (!audioCtx) {
      try {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) audioCtx = new Ctx();
      } catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(function () {});
    }
    return audioCtx;
  }
  function beep(freq, duration, type) {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }
  function sfxTease() { beep(720, 0.12, "triangle"); }
  function sfxFail() { beep(160, 0.35, "sawtooth"); }
  function sfxDeliver() { beep(1000, 0.18, "sine"); setTimeout(function () { beep(1300, 0.16, "sine"); }, 90); }
  function sfxWalkOff() { beep(220, 0.25, "square"); }

  function updateSoundIcon() {
    if (!el.soundToggle) return;
    el.soundToggle.textContent = soundOn ? "🔊" : "🔇";
    el.soundToggle.setAttribute("aria-pressed", soundOn ? "true" : "false");
  }
  updateSoundIcon();
  el.soundToggle && el.soundToggle.addEventListener("click", function () {
    soundOn = !soundOn;
    try { localStorage.setItem(STORAGE_SOUND, soundOn ? "on" : "off"); } catch (e) {}
    updateSoundIcon();
  });

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function showToast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.add("hidden"); }, 2200);
  }

  /* ---------- Storage helpers ---------- */
  function getHighscore() {
    try { return parseInt(localStorage.getItem(STORAGE_HIGHSCORE), 10) || 0; } catch (e) { return 0; }
  }
  function setHighscore(v) {
    try { localStorage.setItem(STORAGE_HIGHSCORE, String(v)); } catch (e) {}
  }
  function getScores() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_SCORES) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }
  function saveScore(score) {
    var list = getScores();
    list.push({ score: score, date: new Date().toISOString().slice(0, 10) });
    list.sort(function (a, b) { return b.score - a.score; });
    list = list.slice(0, MAX_SCORES_STORED);
    try { localStorage.setItem(STORAGE_SCORES, JSON.stringify(list)); } catch (e) {}
    return list;
  }
  function renderLeaderboard() {
    var list = getScores();
    if (!list.length) {
      el.leaderboardEmpty.classList.remove("hidden");
      el.leaderboardList.innerHTML = "";
      return;
    }
    el.leaderboardEmpty.classList.add("hidden");
    el.leaderboardList.innerHTML = list.map(function (item, i) {
      return '<li><span class="lb-rank">' + (i + 1) + '</span><span class="lb-date">' + item.date + '</span><span class="lb-score">' + item.score + ' puan</span></li>';
    }).join("");
  }
  el.heroHighscore && (el.heroHighscore.textContent = getHighscore());
  renderLeaderboard();

  el.clearScoresBtn && el.clearScoresBtn.addEventListener("click", function () {
    try {
      localStorage.removeItem(STORAGE_SCORES);
      localStorage.removeItem(STORAGE_HIGHSCORE);
    } catch (e) {}
    renderLeaderboard();
    el.heroHighscore && (el.heroHighscore.textContent = "0");
    showToast("Skor tablosu sıfırlandı.");
  });

  /* ---------- Game state ---------- */
  var state = null;
  var rafId = null;
  var lastTs = 0;

  function newState() {
    return {
      round: 0,
      score: 0,
      served: 0,
      bestCombo: 1,
      combo: 1,
      patience: 100,
      teaseCost: 12,
      drainRate: 7,
      marker: 0,
      markerDir: 1,
      markerSpeed: 0.9,
      zoneStart: 40,
      zoneWidth: 26,
      accepting: false,
      finished: false
    };
  }

  function showScreen(name) {
    el.startScreen.classList.toggle("hidden", name !== "start");
    el.playScreen.classList.toggle("hidden", name !== "play");
    el.endScreen.classList.toggle("hidden", name !== "end");
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function floatText(text, bad) {
    var span = document.createElement("span");
    span.className = "float-text" + (bad ? " bad" : "");
    span.textContent = text;
    span.style.left = (40 + Math.random() * 20) + "%";
    el.floatLayer.appendChild(span);
    setTimeout(function () { span.remove(); }, 1000);
  }

  function startGame() {
    state = newState();
    showScreen("play");
    nextCustomer();
  }

  function difficultyForRound(round) {
    return {
      drainRate: 6 + round * 1.1,
      teaseCost: 10 + round * 0.8,
      zoneWidth: Math.max(10, 26 - round * 1.8),
      markerSpeed: 0.8 + round * 0.09
    };
  }

  function randomizeZone(width) {
    var start = 4 + Math.random() * (96 - width - 4);
    return start;
  }

  function nextCustomer() {
    state.round += 1;
    if (state.round > TOTAL_ROUNDS) {
      endGame();
      return;
    }

    var diff = difficultyForRound(state.round);
    state.combo = 1;
    state.patience = 100;
    state.drainRate = diff.drainRate;
    state.teaseCost = diff.teaseCost;
    state.zoneWidth = diff.zoneWidth;
    state.markerSpeed = diff.markerSpeed;
    state.zoneStart = randomizeZone(state.zoneWidth);
    state.marker = 0;
    state.markerDir = 1;
    state.accepting = true;

    var flavor = pick(FLAVORS);
    state.currentFlavor = flavor;
    el.customerBubble.textContent = "Bir tane " + flavor.name + " dondurma alabilir miyim?";
    el.customerAvatar.textContent = pick(AVATARS);
    el.flavorBadge.textContent = flavor.emoji;
    el.coneWrap.className = "cone-wrap";

    el.roundValue.textContent = state.round + " / " + TOTAL_ROUNDS;
    el.comboValue.textContent = "x" + state.combo;
    el.scoreValue.textContent = state.score;
    el.gameMessage.textContent = "İşaretçi yeşil bölgedeyken \"Kandır\" de!";
    el.timingZone.style.left = state.zoneStart + "%";
    el.timingZone.style.width = state.zoneWidth + "%";
    el.teaseBtn.disabled = false;
    el.deliverBtn.disabled = false;

    lastTs = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function tick(ts) {
    if (!state || !state.accepting) return;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    state.marker += state.markerDir * state.markerSpeed * 60 * dt;
    if (state.marker >= 100) { state.marker = 100; state.markerDir = -1; }
    if (state.marker <= 0) { state.marker = 0; state.markerDir = 1; }
    el.timingMarker.style.left = state.marker + "%";

    state.patience -= state.drainRate * dt;
    if (state.patience < 0) state.patience = 0;
    updatePatienceBar();

    if (state.patience <= 0) {
      customerLeaves();
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  function updatePatienceBar() {
    el.patienceFill.style.width = state.patience + "%";
    el.patienceFill.classList.toggle("low", state.patience < 30);
  }

  function customerLeaves() {
    state.accepting = false;
    if (rafId) cancelAnimationFrame(rafId);
    el.teaseBtn.disabled = true;
    el.deliverBtn.disabled = true;
    el.gameMessage.textContent = "😠 Müşterinin sabrı taştı, dondurmasız gitti!";
    sfxWalkOff();
    floatText("Kayıp müşteri!", true);
    setTimeout(function () { nextCustomer(); }, 1100);
  }

  function onTease() {
    if (!state || !state.accepting) return;
    var inZone = state.marker >= state.zoneStart && state.marker <= (state.zoneStart + state.zoneWidth);

    if (inZone) {
      state.combo = Math.min(8, state.combo + 1);
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.patience -= state.teaseCost;
      if (state.patience < 0) state.patience = 0;
      updatePatienceBar();
      el.comboValue.textContent = "x" + state.combo;
      el.coneWrap.classList.remove("tease-fx");
      void el.coneWrap.offsetWidth;
      el.coneWrap.classList.add("tease-fx");
      el.gameMessage.textContent = "😏 Kandırdın! Kombo x" + state.combo + ". Devam mı, teslim mi?";
      sfxTease();
      floatText("Kombo x" + state.combo);

      state.zoneWidth = Math.max(8, state.zoneWidth - 1.5);
      state.zoneStart = randomizeZone(state.zoneWidth);
      el.timingZone.style.left = state.zoneStart + "%";
      el.timingZone.style.width = state.zoneWidth + "%";

      if (state.patience <= 0) {
        customerLeaves();
      }
    } else {
      state.accepting = false;
      if (rafId) cancelAnimationFrame(rafId);
      el.teaseBtn.disabled = true;
      el.deliverBtn.disabled = true;
      el.coneWrap.classList.add("drop-fx");
      el.gameMessage.textContent = "💥 Yanlış zamanlama! Dondurma düştü, müşteri gitti.";
      sfxFail();
      floatText("Düştü!", true);
      setTimeout(function () { nextCustomer(); }, 1100);
    }
  }

  function onDeliver() {
    if (!state || !state.accepting) return;
    state.accepting = false;
    if (rafId) cancelAnimationFrame(rafId);
    el.teaseBtn.disabled = true;
    el.deliverBtn.disabled = true;

    var roundScore = Math.round(state.combo * 35 + state.patience * 0.6);
    state.score += roundScore;
    state.served += 1;

    el.coneWrap.classList.add("deliver-fx");
    el.scoreValue.textContent = state.score;
    el.gameMessage.textContent = "🤝 Teslim ettin! +" + roundScore + " puan.";
    sfxDeliver();
    floatText("+" + roundScore);

    setTimeout(function () { nextCustomer(); }, 900);
  }

  function endGame() {
    state.finished = true;
    if (rafId) cancelAnimationFrame(rafId);
    showScreen("end");

    var isRecord = state.score > getHighscore();
    if (isRecord) setHighscore(state.score);
    saveScore(state.score);
    renderLeaderboard();
    el.heroHighscore && (el.heroHighscore.textContent = getHighscore());

    el.endEmoji.textContent = isRecord ? "🏆" : (state.served >= TOTAL_ROUNDS - 1 ? "🍦" : "🙂");
    el.endTitle.textContent = isRecord ? "Yeni Rekor!" : "Dükkan Kapandı!";
    el.endSummary.textContent = isRecord
      ? "Tebrikler, bu cihazdaki en yüksek skoru kırdın!"
      : "Bugünlük bu kadar. Tekrar dene, skorunu katla!";
    el.endScore.textContent = state.score;
    el.endBestCombo.textContent = "x" + state.bestCombo;
    el.endServed.textContent = state.served + " / " + TOTAL_ROUNDS;
  }

  el.startBtn && el.startBtn.addEventListener("click", startGame);
  el.restartBtn && el.restartBtn.addEventListener("click", startGame);
  el.teaseBtn && el.teaseBtn.addEventListener("click", onTease);
  el.deliverBtn && el.deliverBtn.addEventListener("click", onDeliver);

  document.addEventListener("keydown", function (e) {
    if (el.playScreen.classList.contains("hidden")) return;
    if (e.code === "Space") { e.preventDefault(); onTease(); }
    if (e.code === "Enter") { e.preventDefault(); onDeliver(); }
  });

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
