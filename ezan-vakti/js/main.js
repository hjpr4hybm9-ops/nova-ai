(function () {
  "use strict";

  var STORAGE = {
    theme: "ezanvakti.theme",
    mode: "ezanvakti.mode",       // "city" | "geo"
    city: "ezanvakti.city",       // selected il name
    lat: "ezanvakti.lat",
    lon: "ezanvakti.lon",
    sound: "ezanvakti.sound",
    cache: "ezanvakti.cache"      // last known-good timings, per location key
  };

  var API_BASE = "https://api.aladhan.com/v1";
  var METHOD = 13; // Diyanet İşleri Başkanlığı
  var KAABA_LAT = 21.4225;
  var KAABA_LON = 39.8262;

  var VAKIT_KEYS = ["Imsak", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
  var VAKIT_LABELS = { Imsak: "İmsak", Sunrise: "Güneş", Dhuhr: "Öğle", Asr: "İkindi", Maghrib: "Akşam", Isha: "Yatsı" };

  var HIJRI_MONTHS_TR = [
    "Muharrem", "Safer", "Rebiülevvel", "Rebiülahir", "Cemaziyelevvel", "Cemaziyelahir",
    "Recep", "Şaban", "Ramazan", "Şevval", "Zilkade", "Zilhicce"
  ];

  var CITIES = [
    "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya",
    "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik",
    "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum",
    "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir",
    "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul",
    "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kırıkkale",
    "Kırklareli", "Kırşehir", "Kilis", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa",
    "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye",
    "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Şanlıurfa", "Şırnak",
    "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"
  ];

  var TR_ASCII_MAP = { "ç": "c", "Ç": "C", "ğ": "g", "Ğ": "G", "ı": "i", "İ": "I", "ö": "o", "Ö": "O", "ş": "s", "Ş": "S", "ü": "u", "Ü": "U" };
  function toApiCity(name) {
    return name.replace(/[çÇğĞıİöÖşŞüÜ]/g, function (ch) { return TR_ASCII_MAP[ch] || ch; });
  }

  var state = {
    mode: "city",
    city: "İstanbul",
    lat: null,
    lon: null,
    today: null,     // normalized timings for today
    tomorrow: null,  // normalized timings for tomorrow
    todayDates: {},  // key -> Date object (today)
    tomorrowImsakDate: null,
    compassActive: false,
    qiblaBearing: null
  };

  var countdownTimerId = null;
  var notifyTimerId = null;

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

  // ---------- Date helpers ----------
  function formatDDMMYYYY(d) {
    var day = String(d.getDate()).padStart(2, "0");
    var month = String(d.getMonth() + 1).padStart(2, "0");
    return day + "-" + month + "-" + d.getFullYear();
  }

  function locationKey() {
    return state.mode === "geo" && state.lat != null
      ? "geo:" + state.lat.toFixed(2) + "," + state.lon.toFixed(2)
      : "city:" + state.city;
  }

  function stripTz(value) {
    if (!value) return "";
    var m = value.match(/(\d{1,2}:\d{2})/);
    return m ? m[1] : value;
  }

  function timeOnDate(baseDate, hhmm) {
    var parts = hhmm.split(":");
    var d = new Date(baseDate);
    d.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
    return d;
  }

  // ---------- API ----------
  function buildTimingsUrl(dateStr) {
    if (state.mode === "geo" && state.lat != null) {
      return API_BASE + "/timings/" + dateStr + "?latitude=" + state.lat + "&longitude=" + state.lon + "&method=" + METHOD;
    }
    return API_BASE + "/timingsByCity?city=" + encodeURIComponent(toApiCity(state.city)) +
      "&country=Turkey&method=" + METHOD + "&date=" + dateStr;
  }

  function buildCalendarUrl(year, month) {
    if (state.mode === "geo" && state.lat != null) {
      return API_BASE + "/calendar/" + year + "/" + month + "?latitude=" + state.lat + "&longitude=" + state.lon + "&method=" + METHOD;
    }
    return API_BASE + "/calendarByCity/" + year + "/" + month + "?city=" + encodeURIComponent(toApiCity(state.city)) +
      "&country=Turkey&method=" + METHOD;
  }

  function normalizeTimings(raw) {
    var out = {};
    VAKIT_KEYS.forEach(function (key) {
      out[key] = stripTz(raw[key]);
    });
    return out;
  }

  function fetchTimings(dateStr) {
    return fetch(buildTimingsUrl(dateStr)).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (json) {
      if (!json || json.code !== 200 || !json.data || !json.data.timings) throw new Error("Beklenmeyen yanıt");
      return json.data;
    });
  }

  function cacheTimings(data) {
    var all = readJSON(STORAGE.cache, {});
    all[locationKey()] = { timings: normalizeTimings(data.timings), hijri: data.date && data.date.hijri, ts: Date.now() };
    writeJSON(STORAGE.cache, all);
  }

  function getCachedTimings() {
    var all = readJSON(STORAGE.cache, {});
    return all[locationKey()] || null;
  }

  // ---------- Vakitler render ----------
  function setLocationStatus(text) { $("locationStatus").textContent = text; }

  function loadTodayAndTomorrow() {
    setLocationStatus("Vakitler yükleniyor…");
    $("vakitSource").textContent = "";

    var now = new Date();
    var tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    Promise.all([
      fetchTimings(formatDDMMYYYY(now)),
      fetchTimings(formatDDMMYYYY(tomorrow))
    ]).then(function (results) {
      var todayData = results[0];
      var tomorrowData = results[1];

      state.today = normalizeTimings(todayData.timings);
      state.tomorrow = normalizeTimings(tomorrowData.timings);

      state.todayDates = {};
      VAKIT_KEYS.forEach(function (key) {
        state.todayDates[key] = timeOnDate(now, state.today[key]);
      });
      state.tomorrowImsakDate = timeOnDate(tomorrow, state.tomorrow.Imsak);

      cacheTimings(todayData);

      renderVakitDate(now, todayData.date && todayData.date.hijri);
      renderVakitGrid();
      startCountdown();

      var label = state.mode === "geo" ? "Konumun kullanılıyor" : state.city;
      setLocationStatus("📍 " + label + " için Diyanet vakitlerine göre hesaplandı.");
      $("vakitSource").textContent = "Kaynak: Aladhan Prayer Times API (Diyanet yöntemi)";

      loadMonthCalendar();
    }).catch(function (err) {
      var cached = getCachedTimings();
      if (cached) {
        state.today = cached.timings;
        state.todayDates = {};
        VAKIT_KEYS.forEach(function (key) {
          state.todayDates[key] = timeOnDate(now, state.today[key]);
        });
        renderVakitDate(now, cached.hijri);
        renderVakitGrid();
        startCountdown();
        setLocationStatus("⚠️ Güncel veri alınamadı, son bilinen vakitler gösteriliyor.");
      } else {
        setLocationStatus("⚠️ Vakitler alınamadı. Bağlantını kontrol edip tekrar dene.");
      }
      $("vakitSource").textContent = "";
      console.error(err);
    });
  }

  function renderVakitDate(date, hijri) {
    $("vakitDate").textContent = date.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (hijri && hijri.day && hijri.month && hijri.year) {
      var monthName = HIJRI_MONTHS_TR[(hijri.month.number || 1) - 1] || (hijri.month.en || "");
      $("vakitHijri").textContent = hijri.day + " " + monthName + " " + hijri.year;
    } else {
      $("vakitHijri").textContent = "";
    }
  }

  function renderVakitGrid() {
    VAKIT_KEYS.forEach(function (key) {
      var card = document.querySelector('.vakit-card[data-key="' + key + '"]');
      if (!card) return;
      card.querySelector(".vakit-time").textContent = state.today[key] || "--:--";
    });
  }

  function getNextVakit() {
    var now = new Date();
    for (var i = 0; i < VAKIT_KEYS.length; i++) {
      var key = VAKIT_KEYS[i];
      var t = state.todayDates[key];
      if (t && t > now) return { key: key, label: VAKIT_LABELS[key], time: t };
    }
    if (state.tomorrowImsakDate) {
      return { key: "Imsak", label: "İmsak", time: state.tomorrowImsakDate };
    }
    return null;
  }

  function updateCountdown() {
    var next = getNextVakit();
    document.querySelectorAll(".vakit-card").forEach(function (c) { c.classList.remove("active"); });

    if (!next) {
      $("countdownName").textContent = "—";
      $("countdownTime").textContent = "--:--:--";
      return;
    }

    var activeCard = document.querySelector('.vakit-card[data-key="' + next.key + '"]');
    if (activeCard) activeCard.classList.add("active");

    $("countdownName").textContent = next.label;

    var diff = Math.max(0, next.time - new Date());
    var totalSec = Math.floor(diff / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    $("countdownTime").textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function startCountdown() {
    if (countdownTimerId) clearInterval(countdownTimerId);
    updateCountdown();
    countdownTimerId = setInterval(updateCountdown, 1000);
  }

  // ---------- Calendar ----------
  function loadMonthCalendar() {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var monthLabel = now.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
    $("calendarTitle").textContent = monthLabel + " vakitleri";

    fetch(buildCalendarUrl(year, month)).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (json) {
      if (!json || json.code !== 200 || !Array.isArray(json.data)) throw new Error("Beklenmeyen yanıt");
      renderCalendar(json.data, now.getDate());
    }).catch(function (err) {
      $("calendarBody").innerHTML = '<tr><td colspan="7" class="calendar-empty">Aylık takvim şu anda yüklenemedi.</td></tr>';
      console.error(err);
    });
  }

  function renderCalendar(days, todayDate) {
    var body = $("calendarBody");
    body.innerHTML = "";
    days.forEach(function (day) {
      var t = normalizeTimings(day.timings);
      var g = day.date && day.date.gregorian;
      var dayNum = g ? parseInt(g.day, 10) : null;

      var tr = document.createElement("tr");
      if (dayNum === todayDate) tr.className = "today-row";

      var dateLabel = "-";
      if (g) {
        var monthAbbr = g.month && g.month.en ? g.month.en.slice(0, 3) : "";
        dateLabel = g.day + " " + monthAbbr;
      }
      var cells = [dateLabel, t.Imsak, t.Sunrise, t.Dhuhr, t.Asr, t.Maghrib, t.Isha];
      cells.forEach(function (val) {
        var td = document.createElement("td");
        td.textContent = val || "-";
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  // ---------- Geolocation ----------
  function requestGeolocation(onSuccess) {
    if (!navigator.geolocation) {
      showToast("Tarayıcın konum özelliğini desteklemiyor.");
      return;
    }
    showToast("Konum isteniyor…");
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude;
      var lon = pos.coords.longitude;
      onSuccess(lat, lon);
    }, function () {
      showToast("Konum izni verilmedi ya da alınamadı.");
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  function useGeolocationForVakitler() {
    requestGeolocation(function (lat, lon) {
      state.mode = "geo";
      state.lat = lat;
      state.lon = lon;
      localStorage.setItem(STORAGE.mode, "geo");
      localStorage.setItem(STORAGE.lat, String(lat));
      localStorage.setItem(STORAGE.lon, String(lon));
      loadTodayAndTomorrow();
      showToast("Konumun kullanılıyor.");
    });
  }

  // ---------- Qibla ----------
  function toRad(d) { return d * Math.PI / 180; }
  function toDeg(r) { return r * 180 / Math.PI; }

  function computeQibla(lat, lon) {
    var phi1 = toRad(lat), lambda1 = toRad(lon);
    var phi2 = toRad(KAABA_LAT), lambda2 = toRad(KAABA_LON);
    var deltaLambda = lambda2 - lambda1;

    var y = Math.sin(deltaLambda) * Math.cos(phi2);
    var x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
    var bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;

    var R = 6371;
    var dphi = phi2 - phi1;
    var a = Math.sin(dphi / 2) * Math.sin(dphi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    var distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return { bearing: bearing, distance: distance };
  }

  function renderQibla(lat, lon) {
    var result = computeQibla(lat, lon);
    state.qiblaBearing = result.bearing;
    $("qiblaAngle").textContent = "Kıble açısı: " + Math.round(result.bearing) + "° (kuzeyden saat yönünde)";
    $("qiblaDistance").textContent = "Kâbe'ye mesafe: " + Math.round(result.distance).toLocaleString("tr-TR") + " km";
    if (!state.compassActive) {
      $("compassNeedle").style.transform = "translate(-50%, -50%) rotate(" + result.bearing + "deg)";
    }
  }

  function useGeolocationForQibla() {
    $("qiblaStatus").textContent = "";
    requestGeolocation(function (lat, lon) {
      renderQibla(lat, lon);
      showToast("Kıble yönü hesaplandı.");
    });
  }

  function handleOrientation(e) {
    if (state.qiblaBearing == null) return;
    var heading;
    if (typeof e.webkitCompassHeading === "number") {
      heading = e.webkitCompassHeading;
    } else if (typeof e.alpha === "number") {
      heading = 360 - e.alpha;
    } else {
      return;
    }
    var rotation = state.qiblaBearing - heading;
    $("compassNeedle").style.transform = "translate(-50%, -50%) rotate(" + rotation + "deg)";
  }

  function enableCompass() {
    if (state.qiblaBearing == null) {
      $("qiblaStatus").textContent = "Önce konumunla kıbleyi hesapla.";
      return;
    }
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then(function (result) {
        if (result === "granted") {
          window.addEventListener("deviceorientation", handleOrientation);
          state.compassActive = true;
          $("qiblaStatus").textContent = "Pusula etkin. Telefonunu yatay tut.";
        } else {
          $("qiblaStatus").textContent = "Pusula izni verilmedi.";
        }
      }).catch(function () {
        $("qiblaStatus").textContent = "Pusula bu cihazda desteklenmiyor.";
      });
    } else if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientationabsolute", handleOrientation);
      window.addEventListener("deviceorientation", handleOrientation);
      state.compassActive = true;
      $("qiblaStatus").textContent = "Pusula etkin. Telefonunu yatay tut.";
    } else {
      $("qiblaStatus").textContent = "Bu cihaz/tarayıcı pusulayı desteklemiyor.";
    }
  }

  // ---------- Notifications ----------
  function isNotifyEnabled(key) {
    return localStorage.getItem("ezanvakti.notify." + key) === "1";
  }
  function setNotifyEnabled(key, enabled) {
    localStorage.setItem("ezanvakti.notify." + key, enabled ? "1" : "0");
  }

  function playChime() {
    if ($("soundToggle") && !$("soundToggle").checked) return;
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var notes = [660, 880, 990];
      notes.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        var start = ctx.currentTime + i * 0.22;
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.16, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.55);
      });
    } catch (e) {}
  }

  function fireVakitNotification(key) {
    var msg = VAKIT_LABELS[key] + " namazı vakti girdi.";
    if (window.Notification && Notification.permission === "granted") {
      try { new Notification("Ezan Vakti", { body: msg }); } catch (e) { showToast(msg); }
    } else {
      showToast(msg);
    }
    playChime();
  }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function checkNotifications() {
    if (!state.todayDates) return;
    var now = new Date();
    VAKIT_KEYS.forEach(function (key) {
      if (!isNotifyEnabled(key)) return;
      var t = state.todayDates[key];
      if (!t) return;
      var diffSec = (now - t) / 1000;
      if (diffSec >= 0 && diffSec < 30) {
        var flagKey = "ezanvakti.notified." + todayKey() + "." + key;
        if (!sessionStorage.getItem(flagKey)) {
          sessionStorage.setItem(flagKey, "1");
          fireVakitNotification(key);
        }
      }
    });
  }

  // ---------- Init ----------
  function populateCitySelect() {
    var select = $("citySelect");
    CITIES.forEach(function (name) {
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    select.value = state.city;
  }

  function init() {
    $("year").textContent = new Date().getFullYear();

    var savedMode = localStorage.getItem(STORAGE.mode);
    var savedCity = localStorage.getItem(STORAGE.city);
    var savedLat = parseFloat(localStorage.getItem(STORAGE.lat));
    var savedLon = parseFloat(localStorage.getItem(STORAGE.lon));

    if (savedMode === "geo" && !isNaN(savedLat) && !isNaN(savedLon)) {
      state.mode = "geo";
      state.lat = savedLat;
      state.lon = savedLon;
    } else if (savedCity && CITIES.indexOf(savedCity) !== -1) {
      state.mode = "city";
      state.city = savedCity;
    }

    populateCitySelect();
    loadTodayAndTomorrow();

    $("citySelect").addEventListener("change", function () {
      state.mode = "city";
      state.city = $("citySelect").value;
      localStorage.setItem(STORAGE.mode, "city");
      localStorage.setItem(STORAGE.city, state.city);
      loadTodayAndTomorrow();
    });

    ["useGeoBtn", "heroGeoBtn", "ctaGeoBtn"].forEach(function (id) {
      var btn = $(id);
      if (btn) btn.addEventListener("click", useGeolocationForVakitler);
    });

    $("retryBtn").addEventListener("click", loadTodayAndTomorrow);

    // Qibla
    $("qiblaGeoBtn").addEventListener("click", useGeolocationForQibla);
    $("compassBtn").addEventListener("click", enableCompass);
    if (state.mode === "geo" && state.lat != null) {
      renderQibla(state.lat, state.lon);
    }

    // Notifications settings
    document.querySelectorAll("[data-notify]").forEach(function (input) {
      var key = input.getAttribute("data-notify");
      input.checked = isNotifyEnabled(key);
      input.addEventListener("change", function () {
        setNotifyEnabled(key, input.checked);
        if (input.checked && window.Notification && Notification.permission === "default") {
          Notification.requestPermission();
        }
      });
    });
    notifyTimerId = setInterval(checkNotifications, 5000);

    $("testNotifBtn").addEventListener("click", function () {
      if (window.Notification && Notification.permission === "default") {
        Notification.requestPermission().then(function () { fireVakitNotification("Dhuhr"); });
      } else {
        fireVakitNotification("Dhuhr");
      }
    });

    // Sound
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
      if (!confirm("Konum/şehir seçimin, bildirim ayarların ve tercihlerin silinecek. Emin misin?")) return;
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("ezanvakti.") === 0) toRemove.push(k);
      }
      toRemove.forEach(function (k) { localStorage.removeItem(k); });
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
