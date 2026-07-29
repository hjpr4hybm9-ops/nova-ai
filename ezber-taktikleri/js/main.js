(function () {
  "use strict";

  var THEME_KEY = "ezberlab.theme";
  var CARDS_KEY = "ezberlab.cards";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Theme toggle ---------- */
  var themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var root = document.documentElement;
      var current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
      var next = current === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  }

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById("navToggle");
  var mainNav = document.getElementById("mainNav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    mainNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mainNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Toast ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.add("hidden"); }, 2200);
  }

  /* ---------- Flashcards ---------- */
  var defaultCards = [
    { front: "Fransa'nın başkenti neresidir?", back: "Paris" },
    { front: "Gökkuşağının renk sırası nedir? (kısaltma: Mor Kırmızı Turuncu...)", back: "Mor, Mavi, Yeşil, Sarı, Turuncu, Kırmızı" },
    { front: "İnsan vücudunda kaç kemik vardır?", back: "206" },
    { front: "Su kaç derecede kaynar? (deniz seviyesi)", back: "100°C" }
  ];

  function loadCards() {
    try {
      var raw = localStorage.getItem(CARDS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return defaultCards.slice();
  }

  function saveCards(cards) {
    try { localStorage.setItem(CARDS_KEY, JSON.stringify(cards)); } catch (e) {}
  }

  var cards = loadCards();
  var queue = [];
  var known = 0;
  var currentIndex = 0;
  var showingBack = false;

  var cardForm = document.getElementById("cardForm");
  var cardFrontInput = document.getElementById("cardFront");
  var cardBackInput = document.getElementById("cardBack");
  var cardCountEl = document.getElementById("cardCount");
  var shuffleBtn = document.getElementById("shuffleBtn");
  var resetProgressBtn = document.getElementById("resetProgressBtn");
  var clearCardsBtn = document.getElementById("clearCardsBtn");

  var flashEmpty = document.getElementById("flashEmpty");
  var flashCardWrap = document.getElementById("flashCardWrap");
  var flashDone = document.getElementById("flashDone");
  var flashCard = document.getElementById("flashCard");
  var flashFront = document.getElementById("flashFront");
  var flashBack = document.getElementById("flashBack");
  var flashPosition = document.getElementById("flashPosition");
  var flashProgressBar = document.getElementById("flashProgressBar");
  var knownStat = document.getElementById("knownStat");
  var remainingStat = document.getElementById("remainingStat");
  var doneScore = document.getElementById("doneScore");

  var againBtn = document.getElementById("againBtn");
  var knowBtn = document.getElementById("knowBtn");
  var restartBtn = document.getElementById("restartBtn");

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function startRound() {
    queue = cards.map(function (c, i) { return i; });
    known = 0;
    currentIndex = 0;
    showingBack = false;
    renderStage();
  }

  function renderStage() {
    if (cardCountEl) cardCountEl.textContent = cards.length + (cards.length === 1 ? " kart" : " kart");

    if (!cards.length) {
      flashEmpty.classList.remove("hidden");
      flashCardWrap.classList.add("hidden");
      flashDone.classList.add("hidden");
      return;
    }
    flashEmpty.classList.add("hidden");

    if (currentIndex >= queue.length) {
      flashCardWrap.classList.add("hidden");
      flashDone.classList.remove("hidden");
      doneScore.textContent = known + " / " + cards.length;
      return;
    }

    flashDone.classList.add("hidden");
    flashCardWrap.classList.remove("hidden");

    var card = cards[queue[currentIndex]];
    showingBack = false;
    flashFront.classList.remove("hidden");
    flashBack.classList.add("hidden");
    flashFront.textContent = card.front;
    flashBack.textContent = card.back;

    flashPosition.textContent = (currentIndex + 1) + " / " + queue.length;
    var pct = queue.length ? Math.round((currentIndex / queue.length) * 100) : 0;
    flashProgressBar.style.width = pct + "%";

    knownStat.textContent = known;
    remainingStat.textContent = queue.length - currentIndex;
  }

  function flipCard() {
    if (currentIndex >= queue.length) return;
    showingBack = !showingBack;
    flashFront.classList.toggle("hidden", showingBack);
    flashBack.classList.toggle("hidden", !showingBack);
  }

  function nextCard(markKnown) {
    if (currentIndex >= queue.length) return;
    if (markKnown) known++;
    currentIndex++;
    renderStage();
  }

  if (flashCard) flashCard.addEventListener("click", flipCard);
  if (knowBtn) knowBtn.addEventListener("click", function () { nextCard(true); });
  if (againBtn) againBtn.addEventListener("click", function () { nextCard(false); });
  if (restartBtn) restartBtn.addEventListener("click", startRound);
  if (resetProgressBtn) resetProgressBtn.addEventListener("click", function () {
    startRound();
    showToast("İlerleme sıfırlandı.");
  });

  if (cardForm) {
    cardForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var front = cardFrontInput.value.trim();
      var back = cardBackInput.value.trim();
      if (!front || !back) return;
      cards.push({ front: front, back: back });
      saveCards(cards);
      cardFrontInput.value = "";
      cardBackInput.value = "";
      cardFrontInput.focus();
      startRound();
      showToast("Kart eklendi.");
    });
  }

  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", function () {
      if (!cards.length) return;
      shuffle(queue);
      currentIndex = 0;
      known = 0;
      renderStage();
      showToast("Kartlar karıştırıldı.");
    });
  }

  if (clearCardsBtn) {
    clearCardsBtn.addEventListener("click", function () {
      if (!cards.length) return;
      if (!confirm("Tüm kartları silmek istediğine emin misin?")) return;
      cards = [];
      saveCards(cards);
      startRound();
      showToast("Tüm kartlar silindi.");
    });
  }

  startRound();

  /* ---------- Study timer ---------- */
  var timerDisplay = document.getElementById("timerDisplay");
  var timerStatus = document.getElementById("timerStatus");
  var timerPresets = document.getElementById("timerPresets");
  var timerStartBtn = document.getElementById("timerStartBtn");
  var timerPauseBtn = document.getElementById("timerPauseBtn");
  var timerResetBtn = document.getElementById("timerResetBtn");

  var totalSeconds = 10 * 60;
  var remainingSeconds = totalSeconds;
  var timerInterval = null;

  function formatTime(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
  }

  function renderTimer() {
    if (timerDisplay) timerDisplay.textContent = formatTime(remainingSeconds);
  }

  function setPreset(minutes) {
    clearInterval(timerInterval);
    timerInterval = null;
    totalSeconds = minutes * 60;
    remainingSeconds = totalSeconds;
    renderTimer();
    if (timerStatus) timerStatus.textContent = "Hazır olduğunda başlat.";
    if (timerPresets) {
      timerPresets.querySelectorAll(".tool-btn").forEach(function (btn) {
        btn.classList.toggle("active", parseInt(btn.dataset.min, 10) === minutes);
      });
    }
  }

  if (timerPresets) {
    timerPresets.addEventListener("click", function (e) {
      var btn = e.target.closest(".tool-btn");
      if (!btn) return;
      setPreset(parseInt(btn.dataset.min, 10));
    });
  }

  if (timerStartBtn) {
    timerStartBtn.addEventListener("click", function () {
      if (timerInterval) return;
      if (remainingSeconds <= 0) remainingSeconds = totalSeconds;
      if (timerStatus) timerStatus.textContent = "Odaklan, süre işliyor…";
      timerInterval = setInterval(function () {
        remainingSeconds--;
        renderTimer();
        if (remainingSeconds <= 0) {
          clearInterval(timerInterval);
          timerInterval = null;
          if (timerStatus) timerStatus.textContent = "Tur tamamlandı! Kısa bir mola ver. 🎉";
          showToast("Ezber turu tamamlandı!");
        }
      }, 1000);
    });
  }

  if (timerPauseBtn) {
    timerPauseBtn.addEventListener("click", function () {
      if (!timerInterval) return;
      clearInterval(timerInterval);
      timerInterval = null;
      if (timerStatus) timerStatus.textContent = "Duraklatıldı.";
    });
  }

  if (timerResetBtn) {
    timerResetBtn.addEventListener("click", function () {
      clearInterval(timerInterval);
      timerInterval = null;
      remainingSeconds = totalSeconds;
      renderTimer();
      if (timerStatus) timerStatus.textContent = "Hazır olduğunda başlat.";
    });
  }

  renderTimer();
})();
