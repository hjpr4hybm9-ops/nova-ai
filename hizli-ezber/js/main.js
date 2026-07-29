(function () {
  "use strict";

  const THEME_KEY = "ezber.theme";
  const DECKS_KEY = "ezber.decks.v1";
  const ACTIVE_DECK_KEY = "ezber.activeDeck.v1";
  const BEST_SCORE_KEY = "ezber.bestScore.v1";

  const BOX_INTERVAL_DAYS = { 1: 0, 2: 2, 3: 4, 4: 7, 5: 14 };
  const BOX_LABELS = { 1: "Kutu 1 · günlük", 2: "Kutu 2 · 2 günde bir", 3: "Kutu 3 · 4 günde bir", 4: "Kutu 4 · 7 günde bir", 5: "Kutu 5 · 14 günde bir" };

  const todayISO = () => new Date().toISOString().slice(0, 10);
  const addDaysISO = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Theme ----------
  const themeToggle = document.getElementById("themeToggle");

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function applyTheme(next) {
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  }

  themeToggle.addEventListener("click", () => {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  });

  // ---------- Toast ----------
  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    requestAnimationFrame(() => toastEl.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
      setTimeout(() => toastEl.classList.add("hidden"), 200);
    }, 2200);
  }

  // ---------- Tabs ----------
  const tabBtns = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".panel");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
    });
  });

  // ---------- Deck storage ----------
  function loadDecks() {
    try {
      const raw = localStorage.getItem(DECKS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveDecks(list) {
    localStorage.setItem(DECKS_KEY, JSON.stringify(list));
  }

  let decks = loadDecks();
  if (decks.length === 0) {
    decks.push({
      id: uid(),
      name: "Örnek Deste",
      cards: [
        { id: uid(), front: "Zihin sarayı tekniği nedir?", back: "Tanıdık bir mekana ezberlenecek öğeleri canlı görüntülerle yerleştirme yöntemi.", box: 1, due: todayISO() },
        { id: uid(), front: "Aktif hatırlama nedir?", back: "Notu tekrar okumak yerine bilgiyi hafızadan çekmeye çalışarak kendini test etmek.", box: 1, due: todayISO() },
        { id: uid(), front: "Leitner sisteminde kaç kutu vardır?", back: "5 kutu. Her kutunun tekrar aralığı farklıdır (günlük, 2, 4, 7, 14 gün).", box: 1, due: todayISO() }
      ]
    });
    saveDecks(decks);
  }

  let activeDeckId = localStorage.getItem(ACTIVE_DECK_KEY) || (decks[0] && decks[0].id);
  if (!decks.find((d) => d.id === activeDeckId)) activeDeckId = decks[0] && decks[0].id;

  function setActiveDeck(id) {
    activeDeckId = id;
    try { localStorage.setItem(ACTIVE_DECK_KEY, id); } catch {}
    reviewQueue = null;
    renderDecks();
  }

  function activeDeck() {
    return decks.find((d) => d.id === activeDeckId) || null;
  }

  // ---------- Deck UI ----------
  const deckChips = document.getElementById("deckChips");
  const deckEmptyHint = document.getElementById("deckEmptyHint");
  const newDeckBtn = document.getElementById("newDeckBtn");
  const deckStats = document.getElementById("deckStats");
  const boxLevelList = document.getElementById("boxLevelList");
  const dueCountEl = document.getElementById("dueCount");

  function renderDecks() {
    deckChips.innerHTML = "";
    deckEmptyHint.classList.toggle("hidden", decks.length > 0);

    decks.forEach((deck) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "deck-chip" + (deck.id === activeDeckId ? " active" : "");
      chip.innerHTML = `${escapeHtml(deck.name)} <span class="del-deck" data-id="${deck.id}" title="Desteyi sil">✕</span>`;
      chip.addEventListener("click", (e) => {
        if (e.target.closest(".del-deck")) return;
        setActiveDeck(deck.id);
      });
      chip.querySelector(".del-deck").addEventListener("click", (e) => {
        e.stopPropagation();
        if (!confirm(`"${deck.name}" destesini silmek istediğine emin misin?`)) return;
        decks = decks.filter((d) => d.id !== deck.id);
        saveDecks(decks);
        if (activeDeckId === deck.id) activeDeckId = decks[0] && decks[0].id;
        reviewQueue = null;
        renderDecks();
      });
      deckChips.appendChild(chip);
    });

    renderDeckStats();
    renderReview();
  }

  function renderDeckStats() {
    const deck = activeDeck();
    const boxCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let due = 0;
    const total = deck ? deck.cards.length : 0;
    if (deck) {
      deck.cards.forEach((c) => {
        boxCounts[c.box] = (boxCounts[c.box] || 0) + 1;
        if (c.due <= todayISO()) due++;
      });
    }

    deckStats.innerHTML = `
      <div class="stat-tile"><span class="stat-value">${total}</span><span class="stat-label">Toplam Kart</span></div>
      <div class="stat-tile"><span class="stat-value">${due}</span><span class="stat-label">Bugün Hazır</span></div>
    `;

    boxLevelList.innerHTML = [1, 2, 3, 4, 5].map((box) => `
      <div class="box-row">
        <span class="box-swatch swatch-${box}"></span>
        <span class="box-name">${BOX_LABELS[box]}</span>
        <span class="box-count">${boxCounts[box]}</span>
      </div>
    `).join("");

    dueCountEl.textContent = `${due} kart hazır`;
  }

  newDeckBtn.addEventListener("click", () => {
    const name = prompt("Yeni deste adı:", "");
    if (!name || !name.trim()) return;
    const deck = { id: uid(), name: name.trim(), cards: [] };
    decks.push(deck);
    saveDecks(decks);
    setActiveDeck(deck.id);
    showToast("Deste oluşturuldu.");
  });

  // ---------- Add card ----------
  const cardForm = document.getElementById("cardForm");
  cardForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const deck = activeDeck();
    if (!deck) {
      showToast("Önce bir deste oluştur.");
      return;
    }
    const front = document.getElementById("cardFront").value.trim();
    const back = document.getElementById("cardBack").value.trim();
    if (!front || !back) return;
    deck.cards.push({ id: uid(), front, back, box: 1, due: todayISO() });
    saveDecks(decks);
    cardForm.reset();
    reviewQueue = null;
    renderDeckStats();
    renderReview();
    showToast("Kart eklendi.");
  });

  // ---------- Review ----------
  const reviewEmptyHint = document.getElementById("reviewEmptyHint");
  const flashcardEl = document.getElementById("flashcard");
  const flashcardFrontText = document.getElementById("flashcardFrontText");
  const flashcardBackText = document.getElementById("flashcardBackText");
  const flashcardBackFace = document.getElementById("flashcardBackFace");
  const revealBtn = document.getElementById("revealBtn");
  const reviewActions = document.getElementById("reviewActions");

  let reviewQueue = null;
  let currentCard = null;

  function buildQueue() {
    const deck = activeDeck();
    const due = deck ? deck.cards.filter((c) => c.due <= todayISO()) : [];
    for (let i = due.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [due[i], due[j]] = [due[j], due[i]];
    }
    return due;
  }

  function renderReview() {
    if (reviewQueue === null) reviewQueue = buildQueue();

    if (reviewQueue.length === 0) {
      flashcardEl.classList.add("hidden");
      reviewEmptyHint.classList.remove("hidden");
      currentCard = null;
      return;
    }

    reviewEmptyHint.classList.add("hidden");
    flashcardEl.classList.remove("hidden");
    currentCard = reviewQueue[0];
    flashcardFrontText.textContent = currentCard.front;
    flashcardBackText.textContent = currentCard.back;
    flashcardBackFace.classList.add("hidden");
    revealBtn.classList.remove("hidden");
    reviewActions.classList.add("hidden");
  }

  revealBtn.addEventListener("click", () => {
    flashcardBackFace.classList.remove("hidden");
    revealBtn.classList.add("hidden");
    reviewActions.classList.remove("hidden");
  });

  function gradeCurrent(outcome) {
    if (!currentCard) return;
    const deck = activeDeck();
    const card = deck.cards.find((c) => c.id === currentCard.id);
    if (card) {
      if (outcome === "forgot") {
        card.box = 1;
      } else if (outcome === "hard") {
        card.box = Math.max(1, card.box);
      } else if (outcome === "easy") {
        card.box = Math.min(5, card.box + 1);
      }
      card.due = addDaysISO(BOX_INTERVAL_DAYS[card.box]);
      saveDecks(decks);
    }
    reviewQueue.shift();
    renderDeckStats();
    renderReview();
  }

  document.getElementById("btnForgot").addEventListener("click", () => gradeCurrent("forgot"));
  document.getElementById("btnHard").addEventListener("click", () => gradeCurrent("hard"));
  document.getElementById("btnEasy").addEventListener("click", () => gradeCurrent("easy"));

  renderDecks();

  // ---------- Memory test ----------
  const WORD_BANK = [
    "kalem", "deniz", "güneş", "kitap", "bulut", "masa", "anahtar", "kelebek",
    "orman", "yıldız", "köprü", "saat", "bardak", "gitar", "balon", "harita",
    "fener", "yelken", "çanta", "merdiven", "kavanoz", "rüzgar", "tren", "papatya",
    "ayna", "kutu", "kuş", "nehir", "top", "şemsiye", "pusula", "mektup",
    "zil", "salıncak", "define", "gözlük", "yıldırım", "kelebek", "peri", "kitaplık",
    "tekerlek", "fındık", "dalga", "yaprak", "kum", "bahçe", "resim", "pencere"
  ];

  const difficultyRow = document.getElementById("difficultyRow");
  const diffBtns = document.querySelectorAll(".diff-btn");
  const startTestBtn = document.getElementById("startTestBtn");
  const testIdle = document.getElementById("testIdle");
  const testCountdown = document.getElementById("testCountdown");
  const countdownNum = document.getElementById("countdownNum");
  const testWords = document.getElementById("testWords");
  const wordGrid = document.getElementById("wordGrid");
  const timerBar = document.getElementById("timerBar");
  const testRecall = document.getElementById("testRecall");
  const recallInput = document.getElementById("recallInput");
  const checkRecallBtn = document.getElementById("checkRecallBtn");
  const testResult = document.getElementById("testResult");
  const resultScore = document.getElementById("resultScore");
  const correctList = document.getElementById("correctList");
  const missedList = document.getElementById("missedList");
  const testTip = document.getElementById("testTip");
  const retryTestBtn = document.getElementById("retryTestBtn");
  const bestScoreEl = document.getElementById("bestScore");

  let currentDiff = { key: "kolay", words: 5, seconds: 20 };
  let testWordList = [];

  diffBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      diffBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentDiff = { key: btn.dataset.diff, words: parseInt(btn.dataset.words, 10), seconds: parseInt(btn.dataset.seconds, 10) };
      renderBestScore();
    });
  });

  function pickWords(count) {
    const pool = [...WORD_BANK];
    const picked = [];
    while (picked.length < count && pool.length) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
  }

  function loadBestScores() {
    try {
      const raw = localStorage.getItem(BEST_SCORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveBestScore(key, pct) {
    const scores = loadBestScores();
    if (!scores[key] || pct > scores[key]) {
      scores[key] = pct;
      localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(scores));
    }
  }

  function renderBestScore() {
    const scores = loadBestScores();
    const best = scores[currentDiff.key];
    bestScoreEl.textContent = best !== undefined ? `Bu zorlukta en iyi skorun: %${best}` : "Bu zorlukta henüz skor yok.";
  }

  function showStage(which) {
    [testIdle, testCountdown, testWords, testRecall, testResult].forEach((el) => el.classList.add("hidden"));
    which.classList.remove("hidden");
  }

  startTestBtn.addEventListener("click", startTest);
  retryTestBtn.addEventListener("click", () => showStage(testIdle));

  function startTest() {
    let count = 3;
    countdownNum.textContent = count;
    showStage(testCountdown);
    const countdownTimer = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownTimer);
        showWords();
      } else {
        countdownNum.textContent = count;
      }
    }, 700);
  }

  function showWords() {
    testWordList = pickWords(currentDiff.words);
    wordGrid.innerHTML = testWordList.map((w) => `<span class="word-chip">${escapeHtml(w)}</span>`).join("");
    showStage(testWords);
    timerBar.style.transition = "none";
    timerBar.style.width = "100%";
    requestAnimationFrame(() => {
      timerBar.style.transition = `width ${currentDiff.seconds}s linear`;
      timerBar.style.width = "0%";
    });
    setTimeout(() => {
      showStage(testRecall);
      recallInput.value = "";
      recallInput.focus();
    }, currentDiff.seconds * 1000);
  }

  checkRecallBtn.addEventListener("click", () => {
    const raw = recallInput.value.toLowerCase();
    const recalled = raw.split(/[,\n]/).map((w) => w.trim()).filter(Boolean);
    const original = testWordList.map((w) => w.toLowerCase());
    const correct = original.filter((w) => recalled.includes(w));
    const missed = original.filter((w) => !recalled.includes(w));
    const pct = Math.round((correct.length / original.length) * 100);

    resultScore.textContent = `${correct.length} / ${original.length} doğru (%${pct})`;
    correctList.innerHTML = correct.map((w) => `<li>${escapeHtml(w)}</li>`).join("") || "<li>—</li>";
    missedList.innerHTML = missed.map((w) => `<li>${escapeHtml(w)}</li>`).join("") || "<li>—</li>";

    let tip;
    if (pct >= 90) {
      tip = "Harika! Bu kelime sayısında ustalaştın, bir üst zorluğu dene.";
    } else if (missed.length > 0) {
      tip = "İpucu: Kaçırdığın kelimeleri bir sonraki denemede saçma bir hikayeyle birbirine bağlamayı (Hikayeleştirme tekniği) ya da 3'erli gruplara bölmeyi (Parçalama) dene.";
    } else {
      tip = "İyi gidiyorsun, tekrar dene ve süreyi kısaltmaya çalış.";
    }
    testTip.textContent = tip;

    saveBestScore(currentDiff.key, pct);
    renderBestScore();
    showStage(testResult);
  });

  renderBestScore();

  // ---------- Footer year ----------
  document.getElementById("year").textContent = new Date().getFullYear();
})();
