(function () {
  "use strict";

  var STORAGE = {
    theme: "hizoku.theme",
    wpm: "hizoku.wpm",
    chunk: "hizoku.chunk",
    sound: "hizoku.sound",
    history: "hizoku.history",
    library: "hizoku.library"
  };

  var DEFAULT_WPM = 400;
  var DEFAULT_CHUNK = 1;
  var MAX_HISTORY = 30;

  var DEFAULT_LIBRARY = [
    {
      id: "istiklal-marsi",
      title: "İstiklal Marşı",
      author: "Mehmet Akif Ersoy (1921) — kamu malı",
      text: "Korkma, sönmez bu şafaklarda yüzen al sancak; Sönmeden yurdumun üstünde tüten en son ocak. O benim milletimin yıldızıdır, parlayacak; O benimdir, o benim milletimindir ancak.\n\nÇatma, kurban olayım, çehreni ey nazlı hilal! Kahraman ırkıma bir gül! Ne bu şiddet, bu celal? Sana olmaz dökülen kanlarımız sonra helal… Hakkıdır, Hakk'a tapan, milletimin istiklal!\n\nBen ezelden beridir hür yaşadım, hür yaşarım. Hangi çılgın bana zincir vuracakmış? Şaşarım! Kükremiş sel gibiyim, bendimi çiğner, aşarım. Yırtarım dağları, enginlere sığmam, taşarım.\n\nGarbın afakını sarmışsa çelik zırhlı duvar, Benim iman dolu göğsüm gibi serhaddim var. Ulusun, korkma! Nasıl böyle bir imanı boğar, 'Medeniyet!' dediğin tek dişi kalmış canavar?\n\nArkadaş! Yurduma alçakları uğratma sakın. Siper et gövdeni, dursun bu hayâsızca akın. Doğacaktır sana va'dettiği günler Hakk'ın… Kim bilir, belki yarın, belki yarından da yakın.\n\nBastığın yerleri 'toprak!' diyerek geçme, tanı: Düşün altındaki binlerce kefensiz yatanı. Sen şehit oğlusun, incitme, yazıktır, atanı: Verme, dünyaları alsan da, bu cennet vatanı.\n\nKim bu cennet vatanın uğruna olmaz ki feda? Şüheda fışkıracak toprağı sıksan, şüheda! Canı, cananı, bütün varımı alsın da Hüda, Etmesin tek vatanımdan beni dünyada cüda.\n\nRuhumun senden İlahi, şudur ancak emeli: Değmesin mabedimin göğsüne namahrem eli. Bu ezanlar-ki şehadetleri dinin temeli, Ebedi yurdumun üstünde benim inlemeli.\n\nO zaman vecd ile bin secde eder -varsa- taşım, Her cerihamdan, İlahi, boşanıp kanlı yaşım, Fışkırır ruh-ı mücerret gibi yerden na'şım; O zaman yükselerek arşa değer belki başım.\n\nDalgalan sen de şafaklar gibi ey şanlı hilal! Olsun artık dökülen kanlarımın hepsi helal. Ebediyen sana yok, ırkıma yok izmihlal: Hakkıdır, hür yaşamış bayrağımın hürriyet; Hakkıdır, Hakk'a tapan milletimin istiklal!"
    }
  ];

  var SAMPLE_TEXTS = {
    sample1: "Bilim insanları, düşük yörüngeye daha hafif ve daha ucuz uydular göndermeyi hedefleyen yeni bir fırlatma sistemi üzerinde çalışıyor. Yeni sistem, geleneksel roketlere kıyasla yüzde kırk daha az yakıt tüketiyor ve tekrar kullanılabilir parçalar sayesinde fırlatma maliyetlerini önemli ölçüde düşürüyor. Uzmanlar, bu teknolojinin önümüzdeki on yıl içinde uydu internetine erişimi kırsal bölgelere kadar yaygınlaştırabileceğini belirtiyor. Ayrıca yörüngedeki uzay çöpünü azaltmaya yönelik yeni nesil sensörler de sisteme entegre edildi. Proje ekibi, ilk test fırlatmasının önümüzdeki yıl gerçekleştirilmesini planlıyor. Bu gelişme, uzay araştırmalarında maliyet engelini aşmak isteyen küçük ölçekli girişimler için de yeni kapılar açabilir.",
    sample2: "Yeni bir alışkanlık edinmek genellikle sandığımızdan daha az irade, daha çok doğru sistem gerektirir. Büyük hedefler koymak yerine, her gün tekrarlayabileceğin küçük ve somut adımlarla başlamak çok daha kalıcı sonuçlar verir. Örneğin her sabah on dakika okumak, uzun vadede yılda binlerce sayfa anlamına gelir. Önemli olan mükemmel bir gün geçirmek değil, kesintiye uğrasan bile ertesi gün kaldığın yerden devam edebilmektir. Alışkanlığı mevcut bir rutine eklemek, onu hatırlamanı ve sürdürmeni kolaylaştırır. Unutma: küçük adımlar, tutarlı şekilde tekrarlandığında büyük dönüşümlere dönüşür.",
    sample3: "Selçuklu ve Osmanlı dönemlerinde Anadolu, doğu ile batı arasında önemli bir ticaret ve kültür köprüsü haline gelmişti. Kervansaraylar, tüccarların güvenle konaklayabildiği duraklar olarak şehirler arasındaki ana yollar üzerine belirli aralıklarla inşa edilirdi. Bu yapılar sadece barınma değil, aynı zamanda ticaret, sağlık ve güvenlik hizmetleri de sunardı. Zamanla bu ağ, İpek Yolu'nun önemli bir parçası haline gelerek Anadolu şehirlerinin ekonomik gelişimine büyük katkı sağladı. Günümüzde bu kervansarayların birçoğu restore edilerek kültürel miras olarak korunmaktadır ve tarih meraklıları tarafından ziyaret edilmektedir.",
    sample4: "Beyin, yeni bir bilgiyi öğrenirken önce kısa süreli hafızada geçici olarak tutar. Bu bilginin kalıcı hafızaya aktarılabilmesi için tekrar, anlamlandırma ve özellikle uyku büyük rol oynar. Uyku sırasında beyin, gün içinde edinilen bilgileri yeniden işleyerek güçlü sinirsel bağlantılar oluşturur. Bu yüzden bir konuyu çalıştıktan hemen sonra iyi bir uyku çekmek, ertesi gün aynı konuyu tekrar çalışmaktan bile daha etkili olabilir. Ayrıca aktif olarak hatırlamaya çalışmak, sadece tekrar okumaktan çok daha güçlü bir öğrenme etkisi yaratır. Kısacası hızlı ve kalıcı öğrenme, doğru teknik kadar doğru dinlenmeyi de gerektirir."
  };

  var words = [];
  var totalWords = 0;
  var index = 0;
  var chunkSize = DEFAULT_CHUNK;
  var wpm = DEFAULT_WPM;
  var playing = false;
  var timerId = null;
  var startTime = null;

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

  // ---------- Word splitting & ORP ----------
  function splitWords(text) {
    return text.trim().split(/\s+/).filter(Boolean);
  }

  function orpIndex(len) {
    if (len <= 1) return 0;
    if (len <= 5) return 1;
    if (len <= 9) return 2;
    if (len <= 13) return 3;
    return 4;
  }

  function endsWithHardPunctuation(text) {
    return /[.!?…]$/.test(text);
  }
  function endsWithSoftPunctuation(text) {
    return /[,;:]$/.test(text);
  }

  // ---------- Sound ----------
  function playBeep() {
    if (!$("soundToggle").checked) return;
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  }

  // ---------- Reader ----------
  function updateWordCount() {
    var n = splitWords($("textInput").value).length;
    $("wordCount").textContent = n + " kelime";
  }

  function renderChunkAt(i) {
    var chunkWords = words.slice(i, i + chunkSize);
    var text = chunkWords.join(" ");
    if (!text) return;
    var idx = orpIndex(text.length);
    if (idx >= text.length) idx = text.length - 1;
    $("orpBefore").textContent = text.slice(0, idx);
    $("orpLetter").textContent = text.charAt(idx);
    $("orpAfter").textContent = text.slice(idx + 1);
  }

  function computeDelay(chunkWords) {
    var text = chunkWords.join(" ");
    var base = (60000 / wpm) * chunkWords.length;
    if (endsWithHardPunctuation(text)) base *= 1.7;
    else if (endsWithSoftPunctuation(text)) base *= 1.3;
    return base;
  }

  function updateProgress() {
    var shown = Math.min(index, totalWords);
    var percent = totalWords ? Math.round((shown / totalWords) * 100) : 0;
    $("readerProgressFill").style.width = percent + "%";
    $("readerPosition").textContent = shown + " / " + totalWords + " kelime";

    var remaining = Math.max(0, totalWords - shown);
    var minutesLeft = remaining / wpm;
    var totalSec = Math.round(minutesLeft * 60);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    $("readerTimeLeft").textContent = "Kalan: " + m + ":" + String(s).padStart(2, "0");
  }

  function loopTick() {
    if (index >= words.length) {
      finishReading();
      return;
    }
    renderChunkAt(index);
    updateProgress();
    var chunkWords = words.slice(index, index + chunkSize);
    var delay = computeDelay(chunkWords);
    timerId = setTimeout(function () {
      index += chunkSize;
      if (playing) loopTick();
    }, delay);
  }

  function playReading() {
    if (!words.length) return;
    if (index >= words.length) index = 0;
    playing = true;
    if (!startTime) startTime = Date.now();
    $("playPauseBtn").textContent = "⏸️ Duraklat";
    loopTick();
  }

  function pauseReading() {
    playing = false;
    if (timerId) { clearTimeout(timerId); timerId = null; }
    $("playPauseBtn").textContent = "▶️ Devam Et";
  }

  function togglePlayPause() {
    if (playing) pauseReading();
    else playReading();
  }

  function restartReading() {
    pauseReading();
    index = 0;
    startTime = null;
    renderChunkAt(0);
    updateProgress();
    $("playPauseBtn").textContent = "▶️ Başlat";
  }

  function seek(deltaWords) {
    var wasPlaying = playing;
    pauseReading();
    index = Math.max(0, Math.min(words.length - chunkSize, index + deltaWords));
    index = Math.floor(index / chunkSize) * chunkSize;
    renderChunkAt(index);
    updateProgress();
    if (wasPlaying) playReading();
  }

  function applyLiveChange() {
    if (playing) {
      if (timerId) { clearTimeout(timerId); timerId = null; }
      loopTick();
    }
  }

  function finishReading() {
    pauseReading();
    var elapsedMs = startTime ? (Date.now() - startTime) : 0;
    var elapsedSec = Math.round(elapsedMs / 1000);
    var actualWpm = elapsedSec > 0 ? Math.round((totalWords / elapsedSec) * 60) : wpm;

    saveSession({
      date: new Date().toISOString(),
      words: totalWords,
      wpm: actualWpm,
      seconds: elapsedSec
    });

    $("doneStats").textContent = totalWords + " kelime, " + formatDuration(elapsedSec) +
      " sürede, ortalama " + actualWpm + " kelime/dk hızla okundu.";

    $("readerStage").classList.add("hidden");
    $("readerDone").classList.remove("hidden");

    playBeep();
    renderHistory();
  }

  function formatDuration(totalSec) {
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    if (m <= 0) return s + " sn";
    return m + " dk " + s + " sn";
  }

  function startReadingFromText(text) {
    words = splitWords(text);
    totalWords = words.length;
    if (!totalWords) {
      showToast("Önce okumak için bir metin gir ya da örnek seç.");
      return;
    }
    index = 0;
    startTime = null;
    playing = false;

    $("readerSource").classList.add("hidden");
    $("readerDone").classList.add("hidden");
    $("readerStage").classList.remove("hidden");

    renderChunkAt(0);
    updateProgress();
    $("playPauseBtn").textContent = "▶️ Başlat";
  }

  function backToSource() {
    pauseReading();
    $("readerStage").classList.add("hidden");
    $("readerDone").classList.add("hidden");
    $("readerSource").classList.remove("hidden");
  }

  // ---------- History ----------
  function loadHistory() { return readJSON(STORAGE.history, []); }

  function saveSession(session) {
    var history = loadHistory();
    history.unshift(session);
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    writeJSON(STORAGE.history, history);
  }

  function formatHistoryDate(iso) {
    var d = new Date(iso);
    var day = String(d.getDate()).padStart(2, "0");
    var month = String(d.getMonth() + 1).padStart(2, "0");
    return day + "." + month;
  }

  function renderHistory() {
    var history = loadHistory();
    var panel = $("historyPanel");
    var summary = $("statsSummary");
    panel.innerHTML = "";

    if (!history.length) {
      summary.innerHTML = "";
      panel.innerHTML = '<p class="history-empty">Henüz tamamlanmış bir okuma turu yok. İlk turunu yap, burada görünsün.</p>';
      return;
    }

    var totalWordsRead = history.reduce(function (sum, h) { return sum + h.words; }, 0);
    var avgWpm = Math.round(history.reduce(function (sum, h) { return sum + h.wpm; }, 0) / history.length);
    var bestWpm = history.reduce(function (max, h) { return Math.max(max, h.wpm); }, 0);

    summary.innerHTML =
      '<div class="stat-block"><strong>' + history.length + '</strong><span>Tamamlanan tur</span></div>' +
      '<div class="stat-block"><strong>' + totalWordsRead.toLocaleString("tr-TR") + '</strong><span>Toplam kelime</span></div>' +
      '<div class="stat-block"><strong>' + avgWpm + '</strong><span>Ortalama kelime/dk</span></div>' +
      '<div class="stat-block"><strong>' + bestWpm + '</strong><span>En yüksek kelime/dk</span></div>';

    history.slice(0, 10).forEach(function (h) {
      var row = document.createElement("div");
      row.className = "history-row";
      row.innerHTML =
        '<span class="history-date">' + formatHistoryDate(h.date) + '</span>' +
        '<span class="history-detail">' + h.words + ' kelime · ' + formatDuration(h.seconds) + '</span>' +
        '<span class="history-wpm">' + h.wpm + ' kelime/dk</span>';
      panel.appendChild(row);
    });
  }

  // ---------- Library ----------
  function loadLibrary() {
    var raw = localStorage.getItem(STORAGE.library);
    if (raw === null) {
      writeJSON(STORAGE.library, DEFAULT_LIBRARY);
      return DEFAULT_LIBRARY.slice();
    }
    try {
      return JSON.parse(raw) || [];
    } catch (e) {
      return [];
    }
  }

  function saveLibrary(library) { writeJSON(STORAGE.library, library); }

  function addBook(title, author, text) {
    var library = loadLibrary();
    library.push({
      id: "book-" + Date.now(),
      title: title,
      author: author,
      text: text
    });
    saveLibrary(library);
    renderLibrary();
    showToast("📚 \"" + title + "\" kitaplığa eklendi.");
  }

  function deleteBook(id) {
    var library = loadLibrary().filter(function (b) { return b.id !== id; });
    saveLibrary(library);
    renderLibrary();
    showToast("Kitap kitaplıktan kaldırıldı.");
  }

  function readBook(id) {
    var book = loadLibrary().filter(function (b) { return b.id === id; })[0];
    if (!book) return;
    $("textInput").value = book.text;
    updateWordCount();
    document.getElementById("okuyucu").scrollIntoView({ behavior: "smooth", block: "start" });
    startReadingFromText(book.text);
  }

  function renderLibrary() {
    var library = loadLibrary();
    var list = $("libraryList");
    list.innerHTML = "";

    if (!library.length) {
      list.innerHTML = '<p class="library-empty">Kitaplığın boş. Aşağıdan telifsiz bir eser ekleyebilirsin.</p>';
      return;
    }

    library.forEach(function (book) {
      var wc = splitWords(book.text).length;
      var card = document.createElement("div");
      card.className = "book-card";
      card.innerHTML =
        '<div class="book-info"><h3></h3><p></p></div>' +
        '<div class="book-actions">' +
        '<button type="button" class="btn btn-outline btn-sm" data-read>▶️ Oku</button>' +
        '<button type="button" class="icon-btn" data-delete title="Kaldır" aria-label="Kaldır">🗑️</button>' +
        '</div>';
      card.querySelector(".book-info h3").textContent = book.title;
      card.querySelector(".book-info p").textContent = book.author + " · " + wc + " kelime";
      card.querySelector("[data-read]").addEventListener("click", function () { readBook(book.id); });
      card.querySelector("[data-delete]").addEventListener("click", function () {
        if (confirm('"' + book.title + '" kitaplıktan kaldırılsın mı?')) deleteBook(book.id);
      });
      list.appendChild(card);
    });
  }

  // ---------- Settings persistence ----------
  function getSavedWpm() {
    var v = parseInt(localStorage.getItem(STORAGE.wpm), 10);
    return v && v > 0 ? v : DEFAULT_WPM;
  }
  function getSavedChunk() {
    var v = parseInt(localStorage.getItem(STORAGE.chunk), 10);
    return (v === 1 || v === 2 || v === 3) ? v : DEFAULT_CHUNK;
  }

  function setWpm(v) {
    wpm = v;
    localStorage.setItem(STORAGE.wpm, String(v));
    $("wpmValue").textContent = v;
    $("wpmSlider").value = v;
    document.querySelectorAll("#speedPresets .tool-btn").forEach(function (btn) {
      btn.classList.toggle("active", parseInt(btn.getAttribute("data-wpm"), 10) === v);
    });
    updateProgress();
    applyLiveChange();
  }

  function setChunkSize(v) {
    chunkSize = v;
    localStorage.setItem(STORAGE.chunk, String(v));
    document.querySelectorAll("#chunkPresets .tool-btn").forEach(function (btn) {
      btn.classList.toggle("active", parseInt(btn.getAttribute("data-chunk"), 10) === v);
    });
    if (words.length) {
      index = Math.floor(index / chunkSize) * chunkSize;
      renderChunkAt(index);
      updateProgress();
      applyLiveChange();
    }
  }

  // ---------- Init ----------
  function init() {
    $("year").textContent = new Date().getFullYear();

    updateWordCount();
    $("textInput").addEventListener("input", updateWordCount);

    $("sampleSelect").addEventListener("change", function () {
      var key = $("sampleSelect").value;
      if (key && SAMPLE_TEXTS[key]) {
        $("textInput").value = SAMPLE_TEXTS[key];
        updateWordCount();
      }
    });

    $("loadTextBtn").addEventListener("click", function () {
      startReadingFromText($("textInput").value);
    });

    $("playPauseBtn").addEventListener("click", togglePlayPause);
    $("rewindBtn").addEventListener("click", function () { seek(-10); });
    $("forwardBtn").addEventListener("click", function () { seek(10); });
    $("restartReaderBtn").addEventListener("click", restartReading);
    $("editTextBtn").addEventListener("click", backToSource);

    $("rereadBtn").addEventListener("click", function () {
      startReadingFromText($("textInput").value);
    });
    $("newTextBtn").addEventListener("click", backToSource);

    // Library
    renderLibrary();
    $("libraryAddForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var title = $("bookTitle").value.trim();
      var author = $("bookAuthor").value.trim();
      var text = $("bookText").value.trim();
      if (!title || !author || !text) return;
      addBook(title, author, text);
      $("libraryAddForm").reset();
      $("libraryAddDetails").removeAttribute("open");
    });

    document.addEventListener("keydown", function (e) {
      if ($("readerStage").classList.contains("hidden")) return;
      if (e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === "ArrowLeft") {
        seek(-10);
      } else if (e.code === "ArrowRight") {
        seek(10);
      }
    });

    // Speed
    wpm = getSavedWpm();
    $("wpmSlider").value = wpm;
    $("wpmValue").textContent = wpm;
    document.querySelectorAll("#speedPresets .tool-btn").forEach(function (btn) {
      var v = parseInt(btn.getAttribute("data-wpm"), 10);
      btn.classList.toggle("active", v === wpm);
      btn.addEventListener("click", function () { setWpm(v); });
    });
    $("wpmSlider").addEventListener("input", function () {
      setWpm(parseInt($("wpmSlider").value, 10));
    });

    // Chunk size
    chunkSize = getSavedChunk();
    document.querySelectorAll("#chunkPresets .tool-btn").forEach(function (btn) {
      var v = parseInt(btn.getAttribute("data-chunk"), 10);
      btn.classList.toggle("active", v === chunkSize);
      btn.addEventListener("click", function () { setChunkSize(v); });
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
      if (!confirm("Okuma geçmişin ve tüm ayarların silinecek. Emin misin?")) return;
      Object.keys(STORAGE).forEach(function (k) { localStorage.removeItem(STORAGE[k]); });
      pauseReading();
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

    renderHistory();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
