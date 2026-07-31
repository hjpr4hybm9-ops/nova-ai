(function () {
  "use strict";

  var STORAGE = {
    theme: "damlasu.theme",
    goal: "damlasu.goal",
    log: "damlasu.log",
    reminderEnabled: "damlasu.reminder.enabled",
    reminderInterval: "damlasu.reminder.interval",
    sound: "damlasu.sound"
  };

  var DEFAULT_GOAL = 2000;
  var DEFAULT_INTERVAL = 60;
  var RING_CIRCUMFERENCE = 2 * Math.PI * 52;

  var reminderTimerId = null;
  var countdownTimerId = null;
  var nextReminderAt = null;

  var scanStream = null;
  var scanPoints = [];
  var scanBaseCanvas = document.createElement("canvas");
  var scanHeightCm = 10;
  var scanFillPercent = 100;

  function $(id) { return document.getElementById(id); }

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function formatDateKey(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function todayKey() { return formatDateKey(new Date()); }

  function loadLog() { return readJSON(STORAGE.log, {}); }
  function saveLog(log) { writeJSON(STORAGE.log, log); }

  function getTodayEntries() {
    var log = loadLog();
    return log[todayKey()] || [];
  }

  function getGoal() {
    var g = parseInt(localStorage.getItem(STORAGE.goal), 10);
    return g && g > 0 ? g : DEFAULT_GOAL;
  }

  function setGoal(ml) {
    try { localStorage.setItem(STORAGE.goal, String(ml)); } catch (e) {}
  }

  // ---------- Toast ----------
  var toastTimer = null;
  function showToast(msg) {
    var toast = $("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove("hidden");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.add("hidden"); }, 3200);
  }

  // ---------- Theme ----------
  function applyThemeChoice(choice) {
    if (choice === "system") {
      localStorage.removeItem(STORAGE.theme);
      document.documentElement.removeAttribute("data-theme");
    } else {
      localStorage.setItem(STORAGE.theme, choice);
      document.documentElement.setAttribute("data-theme", choice);
    }
    updateThemeOptionButtons();
  }

  function currentThemeChoice() {
    var t = localStorage.getItem(STORAGE.theme);
    return (t === "light" || t === "dark") ? t : "system";
  }

  function updateThemeOptionButtons() {
    var choice = currentThemeChoice();
    document.querySelectorAll("[data-theme-choice]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-theme-choice") === choice);
    });
  }

  function toggleThemeQuick() {
    var isDark = document.documentElement.getAttribute("data-theme") === "dark" ||
      (!document.documentElement.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    applyThemeChoice(isDark ? "light" : "dark");
  }

  // ---------- Water tracker ----------
  function renderProgress() {
    var entries = getTodayEntries();
    var total = entries.reduce(function (sum, ml) { return sum + ml; }, 0);
    var goal = getGoal();
    var percent = Math.min(100, Math.round((total / goal) * 100));

    $("progressAmount").textContent = total + " ml";
    $("progressGoal").textContent = "/ " + goal + " ml";
    $("progressPercent").textContent = "%" + percent;

    var ring = $("ringFill");
    var offset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;
    ring.style.strokeDasharray = RING_CIRCUMFERENCE.toFixed(2);
    ring.style.strokeDashoffset = offset.toFixed(2);

    $("todayCount").textContent = "Bugün " + entries.length + " kayıt";
    $("goalInput").value = goal;
  }

  function addWater(ml) {
    if (!ml || ml <= 0) return;
    var log = loadLog();
    var key = todayKey();
    if (!log[key]) log[key] = [];
    log[key].push(ml);
    saveLog(log);
    renderProgress();
    renderHistory();
    showToast("💧 " + ml + " ml eklendi");
  }

  function undoLast() {
    var log = loadLog();
    var key = todayKey();
    if (!log[key] || !log[key].length) {
      showToast("Bugün için geri alınacak kayıt yok.");
      return;
    }
    log[key].pop();
    saveLog(log);
    renderProgress();
    renderHistory();
    showToast("Son ekleme geri alındı.");
  }

  function resetToday() {
    var log = loadLog();
    log[todayKey()] = [];
    saveLog(log);
    renderProgress();
    renderHistory();
    showToast("Bugünün kayıtları sıfırlandı.");
  }

  // ---------- History ----------
  function dayLabel(date, isToday) {
    if (isToday) return "Bugün";
    var days = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    return days[date.getDay()];
  }

  function renderHistory() {
    var log = loadLog();
    var goal = getGoal();
    var panel = $("historyPanel");
    panel.innerHTML = "";

    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var key = formatDateKey(d);
      var entries = log[key] || [];
      var total = entries.reduce(function (sum, ml) { return sum + ml; }, 0);
      var percent = Math.min(100, Math.round((total / goal) * 100));

      var row = document.createElement("div");
      row.className = "history-row";

      var dayEl = document.createElement("span");
      dayEl.className = "history-day";
      dayEl.textContent = dayLabel(d, i === 0);
      row.appendChild(dayEl);

      var track = document.createElement("div");
      track.className = "history-bar-track";
      var fill = document.createElement("div");
      fill.className = "history-bar-fill" + (percent >= 100 ? " goal-met" : "");
      fill.style.width = percent + "%";
      track.appendChild(fill);
      row.appendChild(track);

      var amountEl = document.createElement("span");
      amountEl.className = "history-amount";
      amountEl.textContent = total + " ml";
      row.appendChild(amountEl);

      panel.appendChild(row);
    }
  }

  // ---------- Sound ----------
  function playBeep() {
    if (!$("soundToggle").checked) return;
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 720;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  }

  // ---------- Reminder ----------
  function getReminderInterval() {
    var v = parseInt(localStorage.getItem(STORAGE.reminderInterval), 10);
    return v && v > 0 ? v : DEFAULT_INTERVAL;
  }

  function isReminderEnabled() {
    return localStorage.getItem(STORAGE.reminderEnabled) === "1";
  }

  function fireReminder() {
    var goal = getGoal();
    var entries = getTodayEntries();
    var total = entries.reduce(function (sum, ml) { return sum + ml; }, 0);
    var msg = total >= goal
      ? "🎉 Harika! Günlük hedefini tamamladın, azıcık daha içmeye devam edebilirsin."
      : "💧 Su içme vakti! Bugün " + total + " / " + goal + " ml içtin.";

    if (window.Notification && Notification.permission === "granted") {
      try {
        new Notification("DamlaSu", { body: msg, icon: undefined });
      } catch (e) {
        showToast(msg);
      }
    } else {
      showToast(msg);
    }
    playBeep();
  }

  function updateReminderStatusText() {
    var statusEl = $("reminderStatus");
    if (!isReminderEnabled()) {
      statusEl.textContent = "Hatırlatıcı kapalı.";
      return;
    }
    if (!nextReminderAt) {
      statusEl.textContent = "Hatırlatıcı açık.";
      return;
    }
    var remainingMs = nextReminderAt - Date.now();
    if (remainingMs <= 0) {
      statusEl.textContent = "Hatırlatıcı açık — bildirim gönderiliyor…";
      return;
    }
    var totalSec = Math.round(remainingMs / 1000);
    var min = Math.floor(totalSec / 60);
    var sec = totalSec % 60;
    statusEl.textContent = "Hatırlatıcı açık — sonraki hatırlatma: " +
      min + ":" + String(sec).padStart(2, "0");
  }

  function stopReminder() {
    if (reminderTimerId) { clearInterval(reminderTimerId); reminderTimerId = null; }
    if (countdownTimerId) { clearInterval(countdownTimerId); countdownTimerId = null; }
    nextReminderAt = null;
    updateReminderStatusText();
  }

  function startReminder() {
    stopReminder();
    var minutes = getReminderInterval();
    var ms = minutes * 60 * 1000;
    nextReminderAt = Date.now() + ms;

    reminderTimerId = setInterval(function () {
      fireReminder();
      nextReminderAt = Date.now() + ms;
    }, ms);

    countdownTimerId = setInterval(updateReminderStatusText, 1000);
    updateReminderStatusText();
  }

  function setReminderEnabled(enabled) {
    localStorage.setItem(STORAGE.reminderEnabled, enabled ? "1" : "0");
    if (enabled) {
      if (window.Notification && Notification.permission === "default") {
        Notification.requestPermission().then(function () { startReminder(); });
      } else {
        startReminder();
      }
    } else {
      stopReminder();
    }
  }

  function setReminderInterval(minutes) {
    localStorage.setItem(STORAGE.reminderInterval, String(minutes));
    document.querySelectorAll("#intervalPresets .tool-btn").forEach(function (btn) {
      btn.classList.toggle("active", parseInt(btn.getAttribute("data-min"), 10) === minutes);
    });
    if (isReminderEnabled()) startReminder();
  }

  // ---------- Glass scan (photo volume estimate) ----------
  function openScanOverlay() {
    $("scanOverlay").classList.remove("hidden");
    resetScanState();
    startScanCamera();
  }

  function closeScanOverlay() {
    stopScanCamera();
    $("scanOverlay").classList.add("hidden");
  }

  function startScanCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast("Bu tarayıcıda kamera erişimi desteklenmiyor.");
      closeScanOverlay();
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(function (stream) {
        scanStream = stream;
        $("scanVideo").srcObject = stream;
        showScanStep("camera");
      })
      .catch(function () {
        showToast("Kameraya erişilemedi. Tarayıcı izinlerini kontrol et.");
        closeScanOverlay();
      });
  }

  function stopScanCamera() {
    if (scanStream) {
      scanStream.getTracks().forEach(function (t) { t.stop(); });
      scanStream = null;
    }
  }

  function showScanStep(step) {
    ["camera", "measure", "detail"].forEach(function (s) {
      var el = $("scanStep" + s.charAt(0).toUpperCase() + s.slice(1));
      if (el) el.classList.toggle("hidden", s !== step);
    });
  }

  function resetScanState() {
    scanPoints = [];
    scanHeightCm = 10;
    scanFillPercent = 100;
    $("scanHeightInput").value = 10;
    document.querySelectorAll("#scanHeightPresets .tool-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-cm") === "10");
    });
    document.querySelectorAll("#scanFillPresets .tool-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-fill") === "100");
    });
  }

  function captureScanPhoto() {
    var video = $("scanVideo");
    var w = video.videoWidth;
    var h = video.videoHeight;
    if (!w || !h) {
      showToast("Kamera henüz hazır değil, birkaç saniye sonra tekrar dene.");
      return;
    }
    var maxDim = 900;
    var scaleDown = Math.min(1, maxDim / Math.max(w, h));
    var cw = Math.round(w * scaleDown);
    var ch = Math.round(h * scaleDown);

    scanBaseCanvas.width = cw;
    scanBaseCanvas.height = ch;
    scanBaseCanvas.getContext("2d").drawImage(video, 0, 0, cw, ch);

    var canvas = $("scanCanvas");
    canvas.width = cw;
    canvas.height = ch;

    scanPoints = [];
    redrawScanCanvas();
    updateScanInstruction();
    showScanStep("measure");
  }

  function redrawScanCanvas() {
    var canvas = $("scanCanvas");
    var ctx = canvas.getContext("2d");
    ctx.drawImage(scanBaseCanvas, 0, 0);

    if (scanPoints.length >= 2) drawScanLine(ctx, scanPoints[0], scanPoints[1], "#38bdf8");
    if (scanPoints.length >= 4) drawScanLine(ctx, scanPoints[2], scanPoints[3], "#2dd4bf");

    scanPoints.forEach(function (p, i) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = i < 2 ? "#38bdf8" : "#2dd4bf";
      ctx.stroke();
      ctx.fillStyle = "#0d1b2a";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), p.x, p.y);
    });
  }

  function drawScanLine(ctx, p1, p2, color) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function updateScanInstruction() {
    var texts = [
      "1/4: Bardağın en üst (ağız) noktasına dokun",
      "2/4: Bardağın en alt (taban) noktasına dokun",
      "3/4: Bardağın en geniş yerinin sol kenarına dokun",
      "4/4: Bardağın en geniş yerinin sağ kenarına dokun"
    ];
    var el = $("scanInstruction");
    el.textContent = scanPoints.length < 4 ? texts[scanPoints.length] : "Noktalar işaretlendi. Şimdi yüksekliği gir.";
  }

  function handleScanCanvasClick(e) {
    if (scanPoints.length >= 4) return;
    var canvas = $("scanCanvas");
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var x = (e.clientX - rect.left) * scaleX;
    var y = (e.clientY - rect.top) * scaleY;
    scanPoints.push({ x: x, y: y });
    redrawScanCanvas();
    updateScanInstruction();
    if (scanPoints.length === 4) {
      computeScanVolume();
      setTimeout(function () { showScanStep("detail"); }, 200);
    }
  }

  function scanDist(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  function computeScanVolume() {
    if (scanPoints.length < 4) return;
    var pixelHeight = scanDist(scanPoints[0], scanPoints[1]) || 1;
    var pixelWidth = scanDist(scanPoints[2], scanPoints[3]);

    var cmPerPixel = scanHeightCm / pixelHeight;
    var diameterCm = pixelWidth * cmPerPixel;
    var radiusCm = diameterCm / 2;
    var shapeFactor = 0.9; // most drinking glasses taper slightly toward the base
    var volumeMl = Math.PI * radiusCm * radiusCm * scanHeightCm * shapeFactor;
    volumeMl = Math.max(0, Math.round(volumeMl / 5) * 5);

    $("scanVolumeResult").textContent = volumeMl + " ml";
    var finalMl = Math.max(5, Math.round(volumeMl * (scanFillPercent / 100) / 5) * 5);
    $("scanFinalAmount").value = finalMl;
  }

  // ---------- Init ----------
  function init() {
    $("year").textContent = new Date().getFullYear();

    renderProgress();
    renderHistory();

    // Add-water buttons
    document.querySelectorAll(".add-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        addWater(parseInt(btn.getAttribute("data-ml"), 10));
      });
    });

    $("customAddForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("customAmount");
      var ml = parseInt(input.value, 10);
      if (ml > 0) {
        addWater(ml);
        input.value = "";
      }
    });

    $("undoBtn").addEventListener("click", undoLast);
    $("resetTodayBtn").addEventListener("click", function () {
      if (confirm("Bugünün su kayıtlarını sıfırlamak istediğine emin misin?")) resetToday();
    });

    $("goalInput").addEventListener("change", function () {
      var val = parseInt($("goalInput").value, 10);
      if (val > 0) {
        setGoal(val);
        renderProgress();
        renderHistory();
      }
    });

    // Reminder
    var reminderToggle = $("reminderToggle");
    reminderToggle.checked = isReminderEnabled();
    reminderToggle.addEventListener("change", function () {
      setReminderEnabled(reminderToggle.checked);
    });

    var savedInterval = getReminderInterval();
    document.querySelectorAll("#intervalPresets .tool-btn").forEach(function (btn) {
      var min = parseInt(btn.getAttribute("data-min"), 10);
      btn.classList.toggle("active", min === savedInterval);
      btn.addEventListener("click", function () { setReminderInterval(min); });
    });

    if (isReminderEnabled()) startReminder();
    else updateReminderStatusText();

    $("testNotifBtn").addEventListener("click", function () {
      if (window.Notification && Notification.permission === "default") {
        Notification.requestPermission().then(function () { fireReminder(); });
      } else {
        fireReminder();
      }
    });

    // Sound toggle
    var soundToggle = $("soundToggle");
    soundToggle.checked = localStorage.getItem(STORAGE.sound) !== "0";
    soundToggle.addEventListener("change", function () {
      localStorage.setItem(STORAGE.sound, soundToggle.checked ? "1" : "0");
    });

    // Theme
    updateThemeOptionButtons();
    $("themeToggle").addEventListener("click", toggleThemeQuick);
    document.querySelectorAll("[data-theme-choice]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyThemeChoice(btn.getAttribute("data-theme-choice"));
      });
    });

    // Glass scan
    $("scanGlassBtn").addEventListener("click", openScanOverlay);
    $("scanCloseBtn").addEventListener("click", closeScanOverlay);
    $("scanCaptureBtn").addEventListener("click", captureScanPhoto);
    $("scanCanvas").addEventListener("click", handleScanCanvasClick);

    $("scanResetPointsBtn").addEventListener("click", function () {
      scanPoints = [];
      redrawScanCanvas();
      updateScanInstruction();
      showScanStep("measure");
    });

    $("scanRetakeBtn").addEventListener("click", function () {
      showScanStep("camera");
    });

    $("scanRestartBtn").addEventListener("click", function () {
      resetScanState();
      showScanStep("camera");
    });

    document.querySelectorAll("#scanHeightPresets .tool-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        scanHeightCm = parseFloat(btn.getAttribute("data-cm"));
        $("scanHeightInput").value = scanHeightCm;
        document.querySelectorAll("#scanHeightPresets .tool-btn").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        computeScanVolume();
      });
    });

    $("scanHeightInput").addEventListener("input", function () {
      var v = parseFloat($("scanHeightInput").value);
      if (v > 0) {
        scanHeightCm = v;
        document.querySelectorAll("#scanHeightPresets .tool-btn").forEach(function (b) { b.classList.remove("active"); });
        computeScanVolume();
      }
    });

    document.querySelectorAll("#scanFillPresets .tool-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        scanFillPercent = parseInt(btn.getAttribute("data-fill"), 10);
        document.querySelectorAll("#scanFillPresets .tool-btn").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        computeScanVolume();
      });
    });

    $("scanAddForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var ml = parseInt($("scanFinalAmount").value, 10);
      if (ml > 0) {
        addWater(ml);
        closeScanOverlay();
      }
    });

    // Reset all
    $("resetAllBtn").addEventListener("click", function () {
      if (!confirm("Tüm su kayıtların, geçmişin ve ayarların silinecek. Emin misin?")) return;
      Object.keys(STORAGE).forEach(function (k) { localStorage.removeItem(STORAGE[k]); });
      stopReminder();
      location.reload();
    });

    // Mobile nav
    var navToggle = $("navToggle");
    var mainNav = $("mainNav");
    navToggle.addEventListener("click", function () {
      var open = mainNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mainNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mainNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
