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
