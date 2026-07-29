(function () {
  "use strict";

  var THEME_KEY = "ezberlab.theme";
  var TIMER_SOUND_KEY = "ezberlab.timerSound";
  var AUTO_SHUFFLE_KEY = "ezberlab.autoShuffle";
  var CARDS_KEY_PREFIX = "ezberlab.cards.";
  var ACTIVE_DECK_KEY = "ezberlab.activeDeck";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function loadBoolSetting(key, defaultValue) {
    try {
      var v = localStorage.getItem(key);
      if (v === null) return defaultValue;
      return v === "1";
    } catch (e) { return defaultValue; }
  }

  function saveBoolSetting(key, value) {
    try { localStorage.setItem(key, value ? "1" : "0"); } catch (e) {}
  }

  /* ---------- Theme (Ayarlar: Görünüm) ---------- */
  var themeToggle = document.getElementById("themeToggle");
  var themeOptions = document.getElementById("themeOptions");

  function currentThemePref() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t === "light" || t === "dark") return t;
    } catch (e) {}
    return "system";
  }

  function updateThemeOptionsUI() {
    if (!themeOptions) return;
    var pref = currentThemePref();
    themeOptions.querySelectorAll(".tool-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.themeChoice === pref);
    });
  }

  function setThemePref(pref) {
    if (pref === "system") {
      try { localStorage.removeItem(THEME_KEY); } catch (e) {}
      document.documentElement.removeAttribute("data-theme");
    } else {
      try { localStorage.setItem(THEME_KEY, pref); } catch (e) {}
      document.documentElement.setAttribute("data-theme", pref);
    }
    updateThemeOptionsUI();
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var root = document.documentElement;
      var effective = root.getAttribute("data-theme") ||
        (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
      setThemePref(effective === "light" ? "dark" : "light");
    });
  }

  if (themeOptions) {
    themeOptions.addEventListener("click", function (e) {
      var btn = e.target.closest(".tool-btn");
      if (!btn) return;
      setThemePref(btn.dataset.themeChoice);
    });
  }

  updateThemeOptionsUI();

  /* ---------- Ayarlar: Sayaç sesi & Otomatik karıştır ---------- */
  var timerSoundToggle = document.getElementById("timerSoundToggle");
  var autoShuffleToggle = document.getElementById("autoShuffleToggle");
  var resetAllBtn = document.getElementById("resetAllBtn");

  var timerSoundEnabled = loadBoolSetting(TIMER_SOUND_KEY, true);
  if (timerSoundToggle) {
    timerSoundToggle.checked = timerSoundEnabled;
    timerSoundToggle.addEventListener("change", function () {
      timerSoundEnabled = timerSoundToggle.checked;
      saveBoolSetting(TIMER_SOUND_KEY, timerSoundEnabled);
    });
  }

  var autoShuffleEnabled = loadBoolSetting(AUTO_SHUFFLE_KEY, false);
  if (autoShuffleToggle) {
    autoShuffleToggle.checked = autoShuffleEnabled;
    autoShuffleToggle.addEventListener("change", function () {
      autoShuffleEnabled = autoShuffleToggle.checked;
      saveBoolSetting(AUTO_SHUFFLE_KEY, autoShuffleEnabled);
    });
  }

  function playBeep() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  }

  if (resetAllBtn) {
    resetAllBtn.addEventListener("click", function () {
      if (!confirm("Tüm desteler, ilerleme ve ayarlar bu tarayıcıdan tamamen silinecek. Emin misin?")) return;
      try {
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf("ezberlab.") === 0) keysToRemove.push(k);
        }
        keysToRemove.forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) {}
      location.reload();
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

  /* ---------- Decks ---------- */
  var genelCards = [
    { front: "Fransa'nın başkenti neresidir?", back: "Paris" },
    { front: "Gökkuşağının renk sırası nedir? (kısaltma: Mor Kırmızı Turuncu...)", back: "Mor, Mavi, Yeşil, Sarı, Turuncu, Kırmızı" },
    { front: "İnsan vücudunda kaç kemik vardır?", back: "206" },
    { front: "Su kaç derecede kaynar? (deniz seviyesi)", back: "100°C" }
  ];

  var kpssTarihCards = [
    /* İslamiyet Öncesi Türk Tarihi */
    { front: "Bilinen ilk Türk devletinin adı nedir?", back: "Asya Hun Devleti (Büyük Hun Devleti)" },
    { front: "Asya Hun Devleti'nin en güçlü ve ünlü hükümdarı kimdir?", back: "Mete Han" },
    { front: "Onlu (onluk) sistemini kuran hükümdar kimdir?", back: "Mete Han" },
    { front: "Türk tarihinin ilk yazılı belgeleri kabul edilen eserler hangileridir?", back: "Orhun (Göktürk) Kitabeleri" },
    { front: "Orhun Kitabeleri kimler adına dikilmiştir?", back: "Bilge Kağan, Kültigin ve Vezir Tonyukuk adına" },
    { front: "Göktürk Devleti'ni kuran hükümdar kimdir?", back: "Bumin Kağan" },
    { front: "Avrupa Hun Devleti'nin en güçlü hükümdarı kimdir?", back: "Attila" },
    { front: "Kavimler Göçü'nü başlatan Türk topluluğu hangisidir?", back: "Avrupa Hunları" },
    { front: "Uygurlar hangi dini benimseyerek yerleşik hayata geçen ilk Türk topluluğu olmuştur?", back: "Maniheizm" },
    { front: "Eski Türklerde kağanın yönetme yetkisini Gök Tanrı'dan aldığına inanılan siyasi anlayışın adı nedir?", back: "Kut anlayışı" },

    /* İlk Türk-İslam Devletleri */
    { front: "751 yılında Abbasiler ile Çinliler arasında yapılan ve Türklerin Abbasi safında yer aldığı, Türklerin İslamiyet'i kabulünü hızlandıran savaş hangisidir?", back: "Talas Savaşı" },
    { front: "İlk Müslüman Türk devleti hangisidir?", back: "Karahanlı Devleti" },
    { front: "İslamiyet'i topluca kabul eden ilk büyük Türk topluluğu hangisidir?", back: "Karluklar" },
    { front: "\"Kutadgu Bilig\" adlı eseri kim yazmıştır?", back: "Yusuf Has Hacip" },
    { front: "\"Divan-ı Lügati't Türk\" adlı eseri kim yazmıştır?", back: "Kaşgarlı Mahmud" },
    { front: "Büyük Selçuklu Devleti'ni kuran hükümdar kimdir?", back: "Tuğrul Bey" },
    { front: "Dandanakan Savaşı hangi yıl, kimler arasında yapılmıştır?", back: "1040, Selçuklular ile Gazneliler arasında" },
    { front: "Malazgirt Savaşı hangi yıl, kimler arasında yapılmıştır?", back: "1071, Selçuklu Sultanı Alparslan ile Bizans İmparatoru Romen Diyojen arasında" },
    { front: "Malazgirt Savaşı'nın en önemli sonucu nedir?", back: "Anadolu'nun kapılarının Türklere açılması" },
    { front: "Büyük Selçuklu Devleti'nin en parlak dönemi hangi hükümdar zamanında yaşanmıştır ve ünlü veziri kimdir?", back: "Melikşah döneminde, veziri Nizamülmülk" },

    /* Türkiye Selçuklu Devleti ve Beylikler */
    { front: "Anadolu (Türkiye) Selçuklu Devleti'ni kim kurmuştur?", back: "Süleyman Şah (I. Kutalmışoğlu Süleyman Şah)" },
    { front: "Anadolu Selçuklu Devleti'nin ilk başkenti neresidir?", back: "İznik" },
    { front: "I. Haçlı Seferi sonrasında Anadolu Selçuklu Devleti'nin başkenti nereye taşınmıştır?", back: "Konya" },
    { front: "Miryokefalon Savaşı hangi yıl, kimler arasında yapılmıştır?", back: "1176, II. Kılıçarslan ile Bizans arasında" },
    { front: "Miryokefalon Savaşı'nın önemi nedir?", back: "Anadolu'nun kesin bir Türk yurdu olduğunun kanıtlanması" },
    { front: "Anadolu Selçuklu Devleti'nin en parlak dönemi hangi hükümdar zamanında yaşanmıştır?", back: "I. Alaeddin Keykubad" },
    { front: "Kösedağ Savaşı hangi yıl, kimler arasında yapılmıştır?", back: "1243, Anadolu Selçukluları ile Moğollar arasında" },
    { front: "Kösedağ Savaşı'nın sonucu nedir?", back: "Anadolu Selçuklu Devleti güç kaybederek Moğol egemenliğine girmiştir" },
    { front: "Anadolu Selçuklu Devleti hangi yıl tamamen sona ermiştir?", back: "1308" },
    { front: "Anadolu Selçuklu Devleti'nin yıkılmasından sonra Anadolu'da kurulan küçük Türk devletlerine ne ad verilir?", back: "Anadolu Beylikleri" },
    { front: "Türkçeyi resmi devlet dili ilan eden ilk Anadolu beyliği hangisidir?", back: "Karamanoğulları Beyliği" },
    { front: "Osmanlı Devleti'nin çekirdeğini oluşturan uç beyliği hangisidir?", back: "Söğüt ve çevresindeki Osmanlı (Kayı) Beyliği" },

    /* Osmanlı Kuruluş Dönemi */
    { front: "Osmanlı Devleti'ni kim, hangi yılda kurmuştur?", back: "Osman Gazi, 1299" },
    { front: "Osmanlı Devleti'nin ilk başkenti neresidir?", back: "Söğüt" },
    { front: "Osmanlıların Rumeli'ye (Avrupa yakasına) geçişini sağlayan ilk kale hangisidir?", back: "Çimpe Kalesi" },
    { front: "Bursa hangi padişah zamanında ve ne zaman fethedilerek başkent yapılmıştır?", back: "Orhan Gazi, 1326" },
    { front: "İlk Osmanlı parası (akçe) hangi padişah döneminde bastırılmıştır?", back: "Orhan Gazi" },
    { front: "İlk düzenli Osmanlı ordusu (Yaya ve Müsellemler) hangi padişah döneminde kurulmuştur?", back: "Orhan Gazi" },
    { front: "Ankara Savaşı hangi yıl, kimler arasında yapılmıştır?", back: "1402, Yıldırım Bayezid ile Timur arasında" },
    { front: "Ankara Savaşı'nın sonucunda Osmanlı Devleti hangi döneme girmiştir?", back: "Fetret Devri (1402-1413)" },
    { front: "Fetret Devri'ni sona erdiren padişah kimdir?", back: "I. Mehmed (Çelebi Mehmed)" },
    { front: "Niğbolu Savaşı hangi yıl, kime karşı yapılmıştır?", back: "1396, Haçlı ordusuna karşı (Yıldırım Bayezid döneminde)" },
    { front: "I. Kosova Savaşı hangi padişah döneminde yapılmış ve padişah bu savaşta ne olmuştur?", back: "I. Murad döneminde, I. Murad şehit olmuştur" },
    { front: "Devşirme sistemi ve Yeniçeri Ocağı hangi padişah döneminde kurulmuştur?", back: "I. Murad" },
    { front: "II. Murad döneminde Osmanlı'nın Balkanlardaki üstünlüğünü pekiştiren iki önemli savaş hangileridir?", back: "Varna Savaşı (1444) ve II. Kosova Savaşı (1448)" },
    { front: "Osmanlı Devleti'nde ilk kez tahttan çekilip sonra tekrar tahta çıkan padişah kimdir?", back: "II. Murad" },
    { front: "Çelebi Mehmed döneminde çıkan ve dini-sosyal içerikli en büyük isyan hangisidir?", back: "Şeyh Bedreddin İsyanı" },

    /* Osmanlı Yükselme Dönemi */
    { front: "İstanbul'u fetheden padişah kimdir ve fetih hangi yıl gerçekleşmiştir?", back: "II. Mehmed (Fatih Sultan Mehmed), 1453" },
    { front: "İstanbul'un fethinin dünya tarihi açısından en önemli sonucu nedir?", back: "Orta Çağ'ın kapanıp Yeni Çağ'ın başladığının kabul edilmesi" },
    { front: "Fatih Sultan Mehmed'in Karadeniz'i bir Türk gölü haline getiren fethi hangisidir?", back: "Kırım'ın alınması (1475)" },
    { front: "Fatih döneminde hazırlanan ilk yazılı Osmanlı kanunnamesi hangisidir?", back: "Kanunname-i Ali Osman (Fatih Kanunnamesi)" },
    { front: "Trabzon Rum İmparatorluğu'na kim, hangi yılda son vermiştir?", back: "Fatih Sultan Mehmed, 1461" },
    { front: "Otlukbeli Savaşı Fatih Sultan Mehmed ile hangi devlet arasında yapılmıştır?", back: "Akkoyunlu Devleti (Uzun Hasan)" },
    { front: "Yavuz Sultan Selim döneminde Osmanlı padişahları hangi unvanı almaya başlamıştır?", back: "İslam Halifeliği" },
    { front: "Çaldıran Savaşı hangi yıl, kimler arasında yapılmıştır?", back: "1514, Yavuz Sultan Selim ile Safevi hükümdarı Şah İsmail arasında" },
    { front: "Mercidabık ve Ridaniye savaşları hangi devlete karşı yapılmıştır?", back: "Memlük Devleti" },
    { front: "Mısır'ın fethiyle (1517) Osmanlı Devleti'ne geçen unvan nedir?", back: "Halifelik" },
    { front: "Osmanlı Devleti'nin en geniş sınırlarına ulaştığı dönem hangi padişaha aittir?", back: "Kanuni Sultan Süleyman" },
    { front: "Mohaç Meydan Savaşı hangi yıl yapılmış ve sonucu nedir?", back: "1526, Macaristan'ın büyük bölümü Osmanlı hakimiyetine girmiştir" },
    { front: "Kanuni döneminde Akdeniz'de Osmanlı üstünlüğünü kesinleştiren deniz savaşı hangisidir?", back: "Preveze Deniz Savaşı (1538)" },
    { front: "Preveze Deniz Savaşı'nı kazanan Osmanlı kaptan-ı deryası kimdir?", back: "Barbaros Hayreddin Paşa" },
    { front: "Osmanlı Devleti'nde ilk kapitülasyonlar hangi devlete, hangi padişah döneminde verilmiştir?", back: "Fransa'ya, Kanuni Sultan Süleyman döneminde (1535)" },
    { front: "Kanuni Sultan Süleyman Avrupa'da hangi unvanla anılmıştır?", back: "Muhteşem Süleyman" },
    { front: "Sokullu Mehmed Paşa hangi üç padişaha sadrazamlık yapmıştır?", back: "Kanuni Sultan Süleyman, II. Selim ve III. Murad" },
    { front: "Sokullu Mehmed Paşa'nın ticaret yollarını güçlendirmek için planladığı kanal projeleri hangileridir?", back: "Süveyş Kanalı ve Don-Volga Kanalı projeleri" },
    { front: "Kanuni Sultan Süleyman nerede, hangi seferde vefat etmiştir?", back: "Zigetvar Seferi'nde (1566)" },
    { front: "Osmanlı Devleti'nde devlet işlerinin görüşüldüğü en yetkili kurulun adı nedir?", back: "Divan-ı Hümayun" },

    /* Osmanlı Duraklama Dönemi */
    { front: "Osmanlı donanmasının kaybettiği ilk büyük deniz savaşı hangisidir?", back: "İnebahtı Deniz Savaşı (1571)" },
    { front: "Haçova Meydan Savaşı hangi padişah döneminde, kime karşı kazanılmıştır?", back: "III. Mehmed döneminde, Avusturya'ya karşı (1596)" },
    { front: "Zitvatorok Antlaşması hangi yıl, kimler arasında imzalanmıştır?", back: "1606, Osmanlı Devleti ile Avusturya arasında" },
    { front: "Zitvatorok Antlaşması'nın önemi nedir?", back: "Osmanlı'nın Avrupa karşısındaki askeri ve siyasi üstünlüğünün sarsıldığının ilk göstergesi olması" },
    { front: "II. Osman'ı (Genç Osman) tahttan indirip öldüren güç hangisidir?", back: "Yeniçeriler" },
    { front: "IV. Murad döneminde İran ile imzalanan ve doğu sınırını büyük ölçüde belirleyen antlaşma hangisidir?", back: "Kasr-ı Şirin Antlaşması (1639)" },
    { front: "Girit adasının fethi hangi padişah döneminde tamamlanmıştır?", back: "IV. Mehmed (Sadrazam Fazıl Ahmed Paşa döneminde)" },
    { front: "II. Viyana Kuşatması hangi yıl, hangi padişah döneminde yapılmıştır?", back: "1683, IV. Mehmed döneminde (Sadrazam Kara Mustafa Paşa)" },
    { front: "II. Viyana Kuşatması'nın başarısızlığı sonucunda Osmanlı'ya karşı kurulan ittifak hangisidir?", back: "Kutsal İttifak (Avusturya, Lehistan, Venedik, Rusya)" },
    { front: "Karlofça Antlaşması hangi yıl imzalanmıştır?", back: "1699" },
    { front: "Karlofça Antlaşması neden Duraklama Dönemi'nin sonu, Gerileme Dönemi'nin başlangıcı kabul edilir?", back: "Osmanlı'nın büyük çapta toprak kaybettiği ilk antlaşma olması" },
    { front: "Duraklama Dönemi'nde başarılı ıslahatlarıyla tanınan sadrazam ailesinin adı nedir?", back: "Köprülüler" },

    /* Osmanlı Gerileme Dönemi */
    { front: "Pasarofça Antlaşması hangi yıl imzalanmıştır?", back: "1718" },
    { front: "Pasarofça Antlaşması'ndan sonra başlayan, eğlence ve barışa dayalı döneme ne ad verilir?", back: "Lale Devri" },
    { front: "Lale Devri hangi padişah ve hangi sadrazam döneminde yaşanmıştır?", back: "III. Ahmed ve Sadrazam Nevşehirli Damat İbrahim Paşa" },
    { front: "İlk Osmanlı matbaası kim tarafından, hangi yılda kurulmuştur?", back: "İbrahim Müteferrika, 1727" },
    { front: "Lale Devri'ni sona erdiren isyan hangisidir?", back: "Patrona Halil İsyanı (1730)" },
    { front: "Küçük Kaynarca Antlaşması hangi yıl, kimler arasında imzalanmıştır?", back: "1774, Osmanlı Devleti ile Rusya arasında" },
    { front: "Küçük Kaynarca Antlaşması'nın en önemli sonucu nedir?", back: "Kırım'ın bağımsızlığının tanınması ve Rusya'ya Osmanlı topraklarındaki Ortodokslar üzerinde koruyuculuk hakkı verilmesi" },
    { front: "III. Selim döneminde kurulan Batı tarzı yeni ordunun adı nedir?", back: "Nizam-ı Cedid" },
    { front: "III. Selim'i tahttan indiren isyan hangisidir?", back: "Kabakçı Mustafa İsyanı (1807)" },
    { front: "Sened-i İttifak hangi padişah döneminde, kimlerle imzalanmıştır?", back: "II. Mahmud döneminde, ayanlarla (1808)" },
    { front: "Sened-i İttifak'ın tarihsel önemi nedir?", back: "Padişah yetkilerinin ilk kez sınırlandırılmış olması" },
    { front: "Yeniçeri Ocağı hangi padişah tarafından, hangi olayla kaldırılmıştır?", back: "II. Mahmud tarafından, Vaka-i Hayriye ile (1826)" },

    /* Tanzimat, Meşrutiyet ve Dağılma Dönemi */
    { front: "Tanzimat Fermanı hangi yıl, kim tarafından ilan edilmiştir?", back: "1839, Mustafa Reşid Paşa tarafından (Abdülmecid döneminde)" },
    { front: "Tanzimat Fermanı'nın diğer adı nedir?", back: "Gülhane Hatt-ı Hümayunu" },
    { front: "Tanzimat Fermanı'nın en önemli özelliği nedir?", back: "Kanun üstünlüğü ve kanun önünde eşitlik ilkesinin ilk kez kabul edilmesi" },
    { front: "Islahat Fermanı hangi yıl ilan edilmiştir?", back: "1856" },
    { front: "Islahat Fermanı'nın temel amacı nedir?", back: "Gayrimüslim tebaaya Müslümanlarla eşit haklar tanımak" },
    { front: "Kırım Savaşı hangi yıllar arasında, kimler arasında yapılmıştır?", back: "1853-1856, Osmanlı-İngiltere-Fransa ittifakı ile Rusya arasında" },
    { front: "Osmanlı Devleti ilk kez dış borcu hangi savaş nedeniyle almıştır?", back: "Kırım Savaşı" },
    { front: "I. Meşrutiyet hangi yıl, hangi padişah tarafından ilan edilmiştir?", back: "1876, II. Abdülhamid tarafından" },
    { front: "I. Meşrutiyet döneminin anayasasının adı nedir?", back: "Kanun-i Esasi" },
    { front: "I. Meşrutiyet hangi savaş bahane edilerek sona erdirilmiştir?", back: "93 Harbi (Osmanlı-Rus Savaşı, 1877-1878)" },
    { front: "II. Meşrutiyet hangi yıl ilan edilmiştir?", back: "1908" },
    { front: "II. Meşrutiyet'in ilanında etkili olan örgüt hangisidir?", back: "İttihat ve Terakki Cemiyeti" },
    { front: "31 Mart Vakası'nı bastıran ve içinde Mustafa Kemal'in de kurmay başkanı olarak görev aldığı ordu hangisidir?", back: "Hareket Ordusu" },
    { front: "Trablusgarp Savaşı kimler arasında, hangi yıllarda yapılmıştır?", back: "1911-1912, Osmanlı ile İtalya arasında" },
    { front: "Trablusgarp Savaşı hangi antlaşmayla sona ermiştir?", back: "Uşi Antlaşması (1912)" },
    { front: "Balkan Savaşları hangi yıllarda gerçekleşmiştir?", back: "1912-1913" },
    { front: "Balkan Savaşları sonunda Osmanlı toprak kayıplarını kesinleştiren antlaşmalar hangileridir?", back: "Londra ve Bükreş Antlaşmaları" },
    { front: "II. Balkan Savaşı sırasında Edirne'yi kim geri almıştır?", back: "Enver Bey (Enver Paşa) komutasındaki Osmanlı kuvvetleri" },

    /* I. Dünya Savaşı ve Osmanlı */
    { front: "I. Dünya Savaşı hangi yıllar arasında yaşanmıştır?", back: "1914-1918" },
    { front: "I. Dünya Savaşı'nı başlatan kıvılcım olay nedir?", back: "Avusturya-Macaristan veliahdının Saraybosna'da öldürülmesi" },
    { front: "Osmanlı Devleti I. Dünya Savaşı'na hangi ittifakın yanında girmiştir?", back: "İttifak Devletleri (Almanya, Avusturya-Macaristan)" },
    { front: "Osmanlı Devleti savaşa fiilen hangi olayla girmiştir?", back: "Goeben ve Breslau (Yavuz-Midilli) gemilerinin Rus limanlarını bombalaması" },
    { front: "Çanakkale Savaşları hangi yıl gerçekleşmiştir?", back: "1915" },
    { front: "Çanakkale Savaşları'nın en önemli sonuçlarından biri nedir?", back: "Mustafa Kemal'in askeri ve siyasi kişiliğinin öne çıkması" },
    { front: "Kut'ül Amare Zaferi hangi cephede, kime karşı kazanılmıştır?", back: "Irak Cephesi'nde İngilizlere karşı (1916)" },
    { front: "Mondros Ateşkes Antlaşması hangi tarihte imzalanmıştır?", back: "30 Ekim 1918" },
    { front: "Mondros Ateşkes Antlaşması'nın işgallere zemin hazırlayan en tehlikeli maddesi hangisidir?", back: "7. madde" },
    { front: "Mondros'tan sonra İtilaf Devletleri tarafından işgal edilen ilk yer neresidir?", back: "Musul" },

    /* Milli Mücadele Hazırlık Dönemi */
    { front: "Mustafa Kemal Samsun'a hangi tarihte, hangi görevle çıkmıştır?", back: "19 Mayıs 1919, 9. Ordu Müfettişi olarak" },
    { front: "İzmir hangi tarihte, kimler tarafından işgal edilmiştir?", back: "15 Mayıs 1919, Yunanlılar tarafından" },
    { front: "Kuvâ-yı Milliye nedir?", back: "Milli Mücadele döneminde işgallere karşı halkın kendi imkanlarıyla kurduğu direniş birlikleri" },
    { front: "Azınlıkların kurduğu ve Türk topraklarını bölmeyi amaçlayan cemiyetlere örnek veriniz.", back: "Mavri Mira, Pontus Rum, Etniki Eterya" },
    { front: "İstanbul Hükümeti'nin ve İtilaf Devletleri'nin etkisiyle kurulan, Milli Mücadele'ye karşı çalışan cemiyet hangisidir?", back: "İngiliz Muhipleri Cemiyeti" },
    { front: "Doğu Anadolu'nun Ermenilere verilmesini engellemek amacıyla kurulan cemiyet hangisidir?", back: "Doğu Anadolu Müdafaa-i Hukuk Cemiyeti" },
    { front: "Trakya'nın Yunanistan'a verilmesini önlemek amacıyla kurulan cemiyet hangisidir?", back: "Trakya-Paşaeli Müdafaa-i Hukuk Cemiyeti" },
    { front: "Amasya Genelgesi hangi tarihte yayımlanmıştır?", back: "22 Haziran 1919" },
    { front: "Amasya Genelgesi'nin en önemli maddesi hangisidir?", back: "\"Milletin istiklalini yine milletin azim ve kararı kurtaracaktır\"" },
    { front: "Erzurum Kongresi hangi tarihler arasında toplanmıştır?", back: "23 Temmuz - 7 Ağustos 1919" },
    { front: "Erzurum Kongresi bölgesel mi yoksa ulusal bir kongre midir?", back: "Bölgesel bir kongredir" },
    { front: "Erzurum Kongresi'nde alınan en önemli karar nedir?", back: "Milli sınırlar içinde vatan bir bütündür, parçalanamaz" },
    { front: "Erzurum Kongresi'nde oluşturulan ilk yürütme organının adı nedir?", back: "Temsil Heyeti" },
    { front: "Sivas Kongresi hangi tarihler arasında toplanmıştır?", back: "4-11 Eylül 1919" },
    { front: "Sivas Kongresi'nin Erzurum Kongresi'nden en önemli farkı nedir?", back: "Bütün yurdu temsil eden ulusal (milli) bir kongre olması" },
    { front: "Sivas Kongresi'nde tüm milli cemiyetler hangi çatı örgüt altında birleştirilmiştir?", back: "Anadolu ve Rumeli Müdafaa-i Hukuk Cemiyeti" },
    { front: "Temsil Heyeti hangi tarihte Ankara'ya gelmiştir?", back: "27 Aralık 1919" },
    { front: "Son Osmanlı Mebusan Meclisi'nin 1920'de kabul ettiği, Türk yurdunun sınırlarını belirleyen kararlar bütününün adı nedir?", back: "Misak-ı Milli" },

    /* TBMM'nin Açılışı ve Cepheler */
    { front: "İstanbul'un İtilaf Devletleri tarafından fiilen işgali hangi tarihte gerçekleşmiştir?", back: "16 Mart 1920" },
    { front: "TBMM hangi tarihte, nerede açılmıştır?", back: "23 Nisan 1920, Ankara'da" },
    { front: "TBMM'nin açtığı ilk kanunlardan biri olan ve vatana ihanet suçlarını düzenleyen kanun hangisidir?", back: "Hıyanet-i Vataniye Kanunu" },
    { front: "Sevr Antlaşması hangi tarihte, kim tarafından imzalanmıştır?", back: "10 Ağustos 1920, İstanbul Hükümeti tarafından" },
    { front: "TBMM Sevr Antlaşması'nı neden tanımamıştır?", back: "Yetkisiz bir hükümet tarafından, milletin onayı olmadan imzalandığı için" },
    { front: "Doğu Cephesi'nde Ermenilere karşı savaşı yöneten komutan kimdir?", back: "Kazım Karabekir Paşa" },
    { front: "Ermenistan ile imzalanan ve TBMM'nin ilk siyasi antlaşması olan antlaşma hangisidir?", back: "Gümrü Antlaşması (Aralık 1920)" },
    { front: "Güney Cephesi'nde Fransızlara karşı halkın direnişiyle öne çıkan ve savaştan sonra başlarına \"gazi/şanlı\" unvanları eklenen şehirler hangileridir?", back: "Antep (Gaziantep), Urfa (Şanlıurfa), Maraş (Kahramanmaraş)" },
    { front: "Batı Cephesi'nde düzenli ordunun Yunanlılara karşı kazandığı ilk zafer hangisidir?", back: "I. İnönü Muharebesi (Ocak 1921)" },
    { front: "I. İnönü Muharebesi'nin ardından kabul edilen anayasanın adı nedir?", back: "Teşkilat-ı Esasiye Kanunu (20 Ocak 1921)" },
    { front: "İstiklal Marşı hangi tarihte kabul edilmiştir ve şairi kimdir?", back: "12 Mart 1921, Mehmet Akif Ersoy" },
    { front: "Sovyet Rusya ile imzalanan ve TBMM'yi tanıyan ilk antlaşma hangisidir?", back: "Moskova Antlaşması (16 Mart 1921)" },
    { front: "II. İnönü Muharebesi hangi tarihte gerçekleşmiştir?", back: "Mart-Nisan 1921" },
    { front: "Mustafa Kemal'in II. İnönü zaferinden sonra İsmet Bey'e gönderdiği ünlü telgrafın konusu nedir?", back: "\"Siz orada yalnız düşmanı değil, milletin makûs talihini de yendiniz\" sözü" },
    { front: "Kütahya-Eskişehir Muharebeleri'nin sonucunda TBMM ordusuna ne olmuştur?", back: "Ordu Sakarya'nın doğusuna kadar geri çekilmiştir" },
    { front: "Kütahya-Eskişehir yenilgisinin ardından Mustafa Kemal'e verilen yetki hangisidir?", back: "Başkomutanlık (Başkomutanlık Kanunu, 5 Ağustos 1921)" },
    { front: "Tekalif-i Milliye Emirleri hangi tarihte, kim tarafından yayımlanmıştır?", back: "7-8 Ağustos 1921, Mustafa Kemal tarafından" },
    { front: "Tekalif-i Milliye Emirleri'nin amacı nedir?", back: "Ordunun ihtiyaçlarını halktan karşılamak için topyekûn seferberlik sağlamak" },
    { front: "Fransa ile Güney Cephesi'ni kapatan antlaşma hangisidir?", back: "Ankara Antlaşması (1921)" },
    { front: "TBMM'nin doğu sınırını kesinleştiren, Ermenistan, Gürcistan ve Azerbaycan ile imzalanan antlaşma hangisidir?", back: "Kars Antlaşması (1921)" },

    /* Sakarya'dan Mudanya'ya */
    { front: "Sakarya Meydan Muharebesi hangi tarihler arasında yapılmıştır?", back: "23 Ağustos - 13 Eylül 1921" },
    { front: "Sakarya Meydan Muharebesi'nin sonucu nedir?", back: "Yunan ordusu taarruz gücünü kaybederek savunmaya çekilmiştir" },
    { front: "Mustafa Kemal'e Sakarya Zaferi'nden sonra TBMM tarafından hangi unvanlar verilmiştir?", back: "Gazilik ve Mareşallik" },
    { front: "Büyük Taarruz hangi tarihte başlamıştır?", back: "26 Ağustos 1922" },
    { front: "Başkomutan Meydan Muharebesi (Dumlupınar Meydan Muharebesi) hangi tarihte kazanılmıştır?", back: "30 Ağustos 1922" },
    { front: "30 Ağustos hangi bayram olarak kutlanmaktadır?", back: "Zafer Bayramı" },
    { front: "İzmir hangi tarihte düşman işgalinden kurtarılmıştır?", back: "9 Eylül 1922" },
    { front: "Mudanya Ateşkes Antlaşması hangi tarihte imzalanmıştır?", back: "11 Ekim 1922" },
    { front: "Mudanya Ateşkes Antlaşması'nın önemi nedir?", back: "Kurtuluş Savaşı'nın silahlı mücadele döneminin sona ermesi" },
    { front: "Saltanat hangi tarihte kaldırılmıştır?", back: "1 Kasım 1922" },

    /* Lozan ve Cumhuriyetin İlanı */
    { front: "Lozan Barış Konferansı'nda TBMM'yi kim temsil etmiştir?", back: "İsmet İnönü (İsmet Paşa)" },
    { front: "Lozan Barış Antlaşması hangi tarihte imzalanmıştır?", back: "24 Temmuz 1923" },
    { front: "Lozan'da çözülemeyip sonraya bırakılan ve 1926'da Ankara Antlaşması'yla sonuçlanan sorun hangisidir?", back: "Musul Sorunu" },
    { front: "Türkiye Cumhuriyeti hangi tarihte ilan edilmiştir?", back: "29 Ekim 1923" },
    { front: "Türkiye Cumhuriyeti'nin ilk cumhurbaşkanı kimdir?", back: "Mustafa Kemal (Atatürk)" },
    { front: "Türkiye Cumhuriyeti'nin ilk başbakanı kimdir?", back: "İsmet İnönü" },
    { front: "Ankara hangi tarihte başkent ilan edilmiştir?", back: "13 Ekim 1923" },
    { front: "İzmir İktisat Kongresi hangi tarihte toplanmıştır?", back: "Şubat 1923" },

    /* Atatürk İlke ve İnkılapları */
    { front: "Halifelik hangi tarihte kaldırılmıştır?", back: "3 Mart 1924" },
    { front: "Eğitimde birliği sağlayan ve aynı gün halifelikle birlikte kabul edilen kanun hangisidir?", back: "Tevhid-i Tedrisat Kanunu (3 Mart 1924)" },
    { front: "1924 Anayasası hangi tarihte kabul edilmiştir?", back: "20 Nisan 1924" },
    { front: "Şapka Kanunu hangi tarihte kabul edilmiştir?", back: "25 Kasım 1925" },
    { front: "Tekke, zaviye ve türbeler hangi tarihte kapatılmıştır?", back: "30 Kasım 1925" },
    { front: "Türk Medeni Kanunu hangi tarihte, hangi ülke örnek alınarak kabul edilmiştir?", back: "17 Şubat 1926, İsviçre Medeni Kanunu örnek alınarak" },
    { front: "Medeni Kanun'un kadınlara sağladığı en önemli haklardan biri nedir?", back: "Miras ve boşanmada erkeklerle eşit haklara sahip olma, tek eşlilik" },
    { front: "Kadınlara belediye seçimlerinde seçme ve seçilme hakkı hangi yıl verilmiştir?", back: "1930" },
    { front: "Kadınlara milletvekili seçme ve seçilme hakkı hangi tarihte verilmiştir?", back: "5 Aralık 1934" },
    { front: "Yeni Türk harfleri (Latin alfabesi) hangi tarihte kabul edilmiştir?", back: "1 Kasım 1928" },
    { front: "Soyadı Kanunu hangi tarihte kabul edilmiştir?", back: "21 Haziran 1934" },
    { front: "Mustafa Kemal'e \"Atatürk\" soyadı hangi yıl verilmiştir?", back: "1934" },
    { front: "Kabotaj Kanunu hangi tarihte kabul edilmiştir ve önemi nedir?", back: "1 Temmuz 1926; Türk denizlerinde taşımacılığın Türklere ait olmasını sağlamıştır" },
    { front: "Uluslararası ölçüler (metre, kilogram) sistemine hangi yıl geçilmiştir?", back: "1931" },
    { front: "Miladi takvime hangi tarihte geçilmiştir?", back: "1 Ocak 1926" },
    { front: "Atatürk ilkelerinin tamamına verilen ortak ad nedir?", back: "Altı Ok (Atatürk İlkeleri)" },
    { front: "Laiklik ilkesi Türkiye Cumhuriyeti anayasasına hangi yıl girmiştir?", back: "1937" },
    { front: "Çok partili siyasi hayata geçiş yolunda kurulan ilk muhalefet partisi hangisidir?", back: "Terakkiperver Cumhuriyet Fırkası (1924)" },
    { front: "Şer'iye ve Evkaf Vekaleti hangi tarihte kaldırılmıştır?", back: "3 Mart 1924" },
    { front: "Devletçilik ilkesinin sanayileşmeyi devlet eliyle hızlandırmayı amaçlayan somut yansımasına ne ad verilir?", back: "Beş Yıllık Sanayi Planları" },

    /* Cumhuriyet Dönemi Dış Politika ve Diğer */
    { front: "Türkiye Milletler Cemiyeti'ne hangi yıl üye olmuştur?", back: "1932" },
    { front: "Montrö Boğazlar Sözleşmesi hangi yıl imzalanmıştır ve önemi nedir?", back: "1936; Boğazlar üzerinde Türk egemenliğini sağlamıştır" },
    { front: "Hatay hangi yıl Türkiye'ye katılmıştır?", back: "1939" },
    { front: "Türkiye, İran, Irak ve Afganistan arasında imzalanan 1937 tarihli ittifak antlaşmasının adı nedir?", back: "Sadabat Paktı" },
    { front: "Mustafa Kemal Atatürk hangi tarihte vefat etmiştir?", back: "10 Kasım 1938" }
  ];

  var sinif1TurkceCards = [
    { front: "Türk alfabesinde kaç harf vardır?", back: "29" },
    { front: "Kedi kelimesi kaç hecelidir?", back: "2 (ke-di)" },
    { front: "Elma kelimesinin ilk harfi nedir?", back: "E" },
    { front: "Birkaç sesli (ünlü) harf say.", back: "a, e, ı, i, o, ö, u, ü" },
    { front: "Kalem kelimesinde kaç harf vardır?", back: "5" },
    { front: "Cümle sonuna hangi noktalama işareti konur?", back: "Nokta (.)" },
    { front: "Soru cümlesi sonuna hangi işaret konur?", back: "Soru işareti (?)" },
    { front: "Top kelimesinin son harfi nedir?", back: "P" },
    { front: "Ev kelimesi kaç hecelidir?", back: "1" },
    { front: "İsimlerin (adların) ilk harfi nasıl yazılır?", back: "Büyük harfle" },
    { front: "Anne kelimesini hecelerine ayır.", back: "An-ne" },
    { front: "Bir ünsüz (sessiz) harfe örnek ver.", back: "B, c, d, f gibi bir harf (örnek: B)" },
    { front: "Okul kelimesinde kaç sesli harf vardır?", back: "2 (o, u)" },
    { front: "Kitap kelimesini hecelerine ayır.", back: "Ki-tap" },
    { front: "Bir hikâyenin ilk bölümüne ne denir?", back: "Giriş" },
  ];

  var sinif1MatematikCards = [
    { front: "1'den 10'a kadar sayarken 5'ten sonra hangi sayı gelir?", back: "6" },
    { front: "3 + 2 kaç eder?", back: "5" },
    { front: "5 - 2 kaç eder?", back: "3" },
    { front: "10 - 1 kaç eder?", back: "9" },
    { front: "4 + 4 kaç eder?", back: "8" },
    { front: "6 + 3 kaç eder?", back: "9" },
    { front: "9 - 4 kaç eder?", back: "5" },
    { front: "7 + 2 kaç eder?", back: "9" },
    { front: "8 - 3 kaç eder?", back: "5" },
    { front: "2 + 6 kaç eder?", back: "8" },
    { front: "Üç kenarı olan şekle ne denir?", back: "Üçgen" },
    { front: "Dört eşit kenarı olan şekle ne denir?", back: "Kare" },
    { front: "Yuvarlak şekle ne denir?", back: "Daire" },
    { front: "Bir haftada kaç gün vardır?", back: "7" },
    { front: "20'ye kadar sayarken 15'ten sonra hangi sayı gelir?", back: "16" },
    { front: "10 + 5 kaç eder?", back: "15" },
    { front: "12 sayısının onlar basamağı kaçtır?", back: "1" },
    { front: "18 sayısının birler basamağı kaçtır?", back: "8" },
    { front: "İki elin parmak sayısı toplamı kaçtır?", back: "10" },
    { front: "5 + 5 kaç eder?", back: "10" },
  ];

  var sinif1HayatBilgisiCards = [
    { front: "Bir yılda kaç mevsim vardır?", back: "4" },
    { front: "Yaz mevsiminden sonra hangi mevsim gelir?", back: "Sonbahar" },
    { front: "Okulda bize ders veren kişiye ne denir?", back: "Öğretmen" },
    { front: "Trafik ışığında kırmızı ışık ne anlama gelir?", back: "Dur" },
    { front: "Trafik ışığında yeşil ışık ne anlama gelir?", back: "Geç" },
    { front: "Ellerimizi ne zaman yıkamalıyız?", back: "Yemekten önce ve tuvaletten sonra" },
    { front: "Bizi büyüten aile üyelerine ne denir?", back: "Anne ve baba" },
    { front: "Bir haftanın ilk günü hangisidir?", back: "Pazartesi" },
    { front: "Dişlerimizi günde en az kaç kez fırçalamalıyız?", back: "2 kez" },
    { front: "Karşıdan karşıya geçerken yayalar hangi ışıkta geçmelidir?", back: "Yeşil ışıkta" },
    { front: "Kış mevsiminde hava genellikle nasıldır?", back: "Soğuk" },
    { front: "Vücudumuzda kaç duyu organı vardır?", back: "5" },
    { front: "Görme duyu organımız hangisidir?", back: "Göz" },
    { front: "Duyma duyu organımız hangisidir?", back: "Kulak" },
    { front: "Bir yılda kaç ay vardır?", back: "12" }
  ];

  var sinif2TurkceCards = [
    { front: "Eş anlamlı kelime ne demektir?", back: "Anlamı aynı olan farklı kelime" },
    { front: "Güzel kelimesinin eş anlamlısı nedir?", back: "Hoş / şirin" },
    { front: "Büyük kelimesinin zıt anlamlısı nedir?", back: "Küçük" },
    { front: "Zıt anlamlı kelime ne demektir?", back: "Anlamca birbirinin karşıtı olan kelime" },
    { front: "Sıcak kelimesinin zıt anlamlısı nedir?", back: "Soğuk" },
    { front: "Bir cümlede genellikle kaç özne bulunur?", back: "Bir tane" },
    { front: "Ali okula gitti cümlesinde özne hangisidir?", back: "Ali" },
    { front: "Ünlem cümlesi sonuna hangi işaret konur?", back: "Ünlem işareti (!)" },
    { front: "Şiirlerdeki satırlara ne denir?", back: "Dize (mısra)" },
    { front: "Hikâyelerde olayları yaşayan kişiye ne denir?", back: "Kahraman" },
    { front: "Küçük kelimesi kaç hecelidir?", back: "2 (kü-çük)" },
    { front: "Virgül cümlede ne için kullanılır?", back: "Kısa bir duraklamayı belirtmek için" },
    { front: "Ev, okul, bahçe kelimeleri hangi tür kelimedir?", back: "İsim (ad)" },
    { front: "Koşmak, gülmek, uyumak kelimeleri hangi tür kelimedir?", back: "Fiil (eylem)" },
    { front: "Masallar genellikle hangi kalıpla başlar?", back: "Bir varmış bir yokmuş" },
  ];

  var sinif2MatematikCards = [
    { front: "25 + 14 kaç eder?", back: "39" },
    { front: "40 - 15 kaç eder?", back: "25" },
    { front: "99'dan sonra hangi sayı gelir?", back: "100" },
    { front: "2 kere 3 (2x3) kaç eder?", back: "6" },
    { front: "Saatte akrep neyi gösterir?", back: "Saati" },
    { front: "Saatte yelkovan neyi gösterir?", back: "Dakikayı" },
    { front: "Yarım saat kaç dakikadır?", back: "30 dakika" },
    { front: "50 + 50 kaç eder?", back: "100" },
    { front: "30'un 10 fazlası kaçtır?", back: "40" },
    { front: "60 - 20 kaç eder?", back: "40" },
    { front: "Bir liranın 100'de biri nedir?", back: "Kuruş" },
    { front: "45 sayısının onlar basamağı kaçtır?", back: "4" },
    { front: "En büyük iki basamaklı sayı kaçtır?", back: "99" },
    { front: "15 + 15 kaç eder?", back: "30" },
    { front: "90 - 45 kaç eder?", back: "45" },
    { front: "Bir düzine kaç tanedir?", back: "12" },
    { front: "3 kere 4 (3x4) kaç eder?", back: "12" },
    { front: "70 sayısının birler basamağı kaçtır?", back: "0" },
    { front: "Yarım kilogram kaç gramdır?", back: "500 gram" },
    { front: "12 + 8 kaç eder?", back: "20" },
  ];

  var sinif2HayatBilgisiCards = [
    { front: "Beş duyu organımız hangileridir?", back: "Göz, kulak, burun, dil, deri" },
    { front: "Tatma duyu organımız hangisidir?", back: "Dil" },
    { front: "Koklama duyu organımız hangisidir?", back: "Burun" },
    { front: "Sağlıklı beslenmek için neler yemeliyiz?", back: "Sebze, meyve, süt gibi besinler" },
    { front: "Çöpleri nereye atmalıyız?", back: "Çöp kutusuna" },
    { front: "Geri dönüşüm ne işe yarar?", back: "Atıkların yeniden kullanılmasını sağlar" },
    { front: "Yangın durumunda hangi kurum aranır?", back: "İtfaiye" },
    { front: "Acil sağlık durumunda hangi numara aranır?", back: "112" },
    { front: "Yangın ihbarı için hangi numara aranır?", back: "110" },
    { front: "Polis çağırmak için hangi numara aranır?", back: "155" },
    { front: "Bayrağımızın renkleri nelerdir?", back: "Kırmızı ve beyaz" },
    { front: "Ülkemizin başkenti neresidir?", back: "Ankara" },
    { front: "23 Nisan hangi bayramdır?", back: "Ulusal Egemenlik ve Çocuk Bayramı" },
    { front: "Suyu tasarruflu kullanmak için ne yapmalıyız?", back: "Musluğu gereksiz yere açık bırakmamak" },
    { front: "Bitkilerin büyümesi için nelere ihtiyacı vardır?", back: "Su, güneş ışığı, toprak" }
  ];

  var sinif3TurkceCards = [
    { front: "İsim (ad) nedir?", back: "Varlıkları karşılayan kelime" },
    { front: "Sıfat (önad) nedir?", back: "İsimleri niteleyen kelime" },
    { front: "Kırmızı elma sözünde sıfat hangisidir?", back: "Kırmızı" },
    { front: "Özel isimler nasıl yazılır?", back: "Büyük harfle başlar" },
    { front: "İstanbul, Ali, Türkiye hangi tür isimdir?", back: "Özel isim" },
    { front: "Şehir, çocuk, ülke hangi tür isimdir?", back: "Cins (tür) isim" },
    { front: "Atasözü nedir?", back: "Halkın deneyimlerinden oluşan, öğüt veren kalıplaşmış söz" },
    { front: "Damlaya damlaya göl olur sözü hangi söz grubuna girer?", back: "Atasözü" },
    { front: "Paragrafın ilk cümlesine ne denir?", back: "Giriş cümlesi" },
    { front: "Bir metnin ana fikri nedir?", back: "Yazarın anlatmak istediği en önemli düşünce" },
    { front: "Eş sesli (sesteş) kelime nedir?", back: "Yazılışı aynı, anlamı farklı kelime" },
    { front: "Yüz kelimesi hangi iki farklı anlamda kullanılabilir?", back: "Sayı (100) ve vücut bölümü (surat) anlamında" },
    { front: "Bir mektubun en sonuna genellikle ne yazılır?", back: "İmza (gönderenin adı)" },
  ];

  var sinif3MatematikCards = [
    { front: "4 x 6 kaç eder?", back: "24" },
    { front: "7 x 8 kaç eder?", back: "56" },
    { front: "100 - 37 kaç eder?", back: "63" },
    { front: "250 + 125 kaç eder?", back: "375" },
    { front: "Bir kesirde çizginin üstündeki sayıya ne denir?", back: "Pay" },
    { front: "Bir kesirde çizginin altındaki sayıya ne denir?", back: "Payda" },
    { front: "1/2 kesri neyi ifade eder?", back: "Bir bütünün iki eşit parçasından birini" },
    { front: "Bir dikdörtgenin kaç kenarı vardır?", back: "4" },
    { front: "9 x 9 kaç eder?", back: "81" },
    { front: "36 ÷ 6 kaç eder?", back: "6" },
    { front: "500 sayısının yüzler basamağı kaçtır?", back: "5" },
    { front: "Bir üçgenin iç açıları toplamı kaç derecedir?", back: "180" },
    { front: "45 ÷ 9 kaç eder?", back: "5" },
    { front: "6 x 7 kaç eder?", back: "42" },
    { front: "1000 sayısı kaç basamaklıdır?", back: "4" },
  ];

  var sinif3FenBilimleriCards = [
    { front: "Canlıların ortak özelliklerinden biri nedir?", back: "Beslenme, büyüme, üreme gibi yaşamsal faaliyetler" },
    { front: "Bitkilerin fotosentez yapması için nelere ihtiyacı vardır?", back: "Güneş ışığı, su ve karbondioksit" },
    { front: "Hayvanlar beslenme şekline göre nasıl gruplara ayrılır?", back: "Otçul, etçil ve hem otçul hem etçil (omnivor)" },
    { front: "Suyun katı hâline ne denir?", back: "Buz" },
    { front: "Suyun gaz hâline ne denir?", back: "Su buharı" },
    { front: "Mıknatısın çektiği madde türü hangisidir?", back: "Demir (bazı metaller)" },
    { front: "Gündüz gökyüzünde gördüğümüz ışık kaynağı nedir?", back: "Güneş" },
    { front: "Gece gökyüzünde gördüğümüz ışık kaynağı nedir?", back: "Ay" },
    { front: "Hava sıcaklığını ölçmek için hangi alet kullanılır?", back: "Termometre" },
    { front: "Sesleri hangi duyu organımızla algılarız?", back: "İşitme (kulak)" },
    { front: "Bitkilerin suyu topraktan almasını sağlayan kısmı nedir?", back: "Kök" },
    { front: "Bitkilerin fotosentez yaptığı kısmı nedir?", back: "Yaprak" },
  ];

  var sinif3SosyalBilgilerCards = [
    { front: "Yaşadığımız yerin en küçük yönetim birimine ne denir?", back: "Mahalle veya köy" },
    { front: "Ülkemizin komşularından birini say.", back: "Yunanistan, Bulgaristan, Gürcistan gibi bir komşu ülke" },
    { front: "Haritalarda kara parçaları hangi renk tonlarıyla gösterilir?", back: "Yeşil ve kahverengi tonları" },
    { front: "Haritalarda denizler hangi renkle gösterilir?", back: "Mavi" },
    { front: "Pusula neye yarar?", back: "Yönümüzü bulmaya" },
    { front: "Güneşin doğduğu yöne ne denir?", back: "Doğu" },
    { front: "Güneşin battığı yöne ne denir?", back: "Batı" },
    { front: "Ülkemizin kaç komşu ülkesi vardır?", back: "8" },
    { front: "Bir ailenin ihtiyaçlarını karşılamak için yaptığı plana ne denir?", back: "Bütçe" },
    { front: "Kültürel miras nedir?", back: "Geçmişten günümüze aktarılan değerler ve eserler" }
  ];

  var sinif4TurkceCards = [
    { front: "Fiil (eylem) nedir?", back: "İş, oluş, hareket bildiren kelime" },
    { front: "Zamir (adıl) nedir?", back: "İsimlerin yerini tutan kelime" },
    { front: "Ben, sen, o, biz, siz, onlar hangi tür kelimedir?", back: "Kişi zamiri" },
    { front: "Öznel cümle nedir?", back: "Kişisel görüş bildiren cümle" },
    { front: "Nesnel cümle nedir?", back: "Kanıtlanabilir, gerçek bilgi bildiren cümle" },
    { front: "Bir metnin konusu ile ana fikri arasındaki fark nedir?", back: "Konu kısa başlıktır, ana fikir yazarın vermek istediği mesajdır" },
    { front: "Karşılaştırma bildiren cümlede hangi tür kelimeler kullanılır?", back: "Daha, en, gibi gibi kelimeler" },
    { front: "Kitap okumayı çok seviyorum cümlesinde yüklem hangisidir?", back: "Seviyorum" },
    { front: "Deyim nedir?", back: "Gerçek anlamından farklı, kalıplaşmış anlatım" },
    { front: "Ağzı kulaklarına varmak hangi söz grubuna girer?", back: "Deyim" },
    { front: "Bir dilekçenin sonunda genellikle ne bulunur?", back: "Tarih ve imza" },
    { front: "Şiirde aynı sesle biten dizelere ne denir?", back: "Kafiye" },
  ];

  var sinif4MatematikCards = [
    { front: "1234 + 4321 kaç eder?", back: "5555" },
    { front: "12 x 12 kaç eder?", back: "144" },
    { front: "144 ÷ 12 kaç eder?", back: "12" },
    { front: "Bir dikdörtgenin çevresi nasıl hesaplanır?", back: "(Uzun kenar + kısa kenar) x 2" },
    { front: "Bir karenin alanı nasıl hesaplanır?", back: "Kenar x kenar" },
    { front: "3/4 kesri ondalık olarak nedir?", back: "0,75" },
    { front: "1 kilogram kaç gramdır?", back: "1000 gram" },
    { front: "1 metre kaç santimetredir?", back: "100 santimetre" },
    { front: "25 x 4 kaç eder?", back: "100" },
    { front: "500 ÷ 5 kaç eder?", back: "100" },
    { front: "Bir açının 90 derece olmasına ne denir?", back: "Dik açı" },
    { front: "90 dereceden küçük açıya ne denir?", back: "Dar açı" },
    { front: "90 dereceden büyük açıya ne denir?", back: "Geniş açı" },
    { front: "7 x 6 - 10 işleminin sonucu kaçtır?", back: "32" },
  ];

  var sinif4FenBilimleriCards = [
    { front: "Kuvvet nesnelerde neyi değiştirebilir?", back: "Hareketini veya şeklini" },
    { front: "Yer çekimi kuvveti cisimleri hangi yöne çeker?", back: "Aşağıya, yere doğru" },
    { front: "Maddenin üç hâli nelerdir?", back: "Katı, sıvı, gaz" },
    { front: "Isı verilince katı madde neye dönüşebilir?", back: "Sıvıya (erime)" },
    { front: "Dünyamızın uydusu hangisidir?", back: "Ay" },
    { front: "Güneş Sistemi'nde kaç gezegen vardır?", back: "8" },
    { front: "Dünya'ya en yakın gezegen hangisidir?", back: "Venüs" },
    { front: "Dünya'nın kendi ekseni etrafında dönmesi neyi oluşturur?", back: "Gece ve gündüzü" },
    { front: "Dünya'nın Güneş etrafında dönmesi neyi oluşturur?", back: "Mevsimleri ve bir yılı" },
    { front: "Elektriği ileten maddelere ne denir?", back: "İletken" },
    { front: "Elektriği iletmeyen maddelere ne denir?", back: "Yalıtkan" },
    { front: "Basit bir elektrik devresinde ışık kaynağı olarak ne kullanılır?", back: "Ampul" },
  ];

  var sinif4SosyalBilgilerCards = [
    { front: "Mektup dışında eski bir haberleşme yolu neydi?", back: "Güvercinle haberleşme, tellal gibi yöntemler" },
    { front: "Kara, hava ve deniz dışında bir ulaşım türü nedir?", back: "Demiryolu (tren)" },
    { front: "Bir ürünün üretilip tüketiciye ulaşana kadar geçtiği sürece ne denir?", back: "Üretim-dağıtım-tüketim zinciri" },
    { front: "İstanbul hangi yıl, kim tarafından fethedilmiştir?", back: "1453, Fatih Sultan Mehmed" },
    { front: "Yaşadığımız çevredeki doğal afetlere örnek ver.", back: "Deprem, sel, çığ" },
    { front: "Deprem sırasında yapılması gereken en önemli şey nedir?", back: "Sakin kalıp güvenli bir yere sığınmak (Çök-Kapan-Tutun)" },
    { front: "Vatandaşların oy kullanma hakkına ne denir?", back: "Seçme hakkı" },
    { front: "Ülkemizi yöneten kişiye ne denir?", back: "Cumhurbaşkanı" },
    { front: "Ülkemizin yasalarını yapan kuruma ne denir?", back: "TBMM (Türkiye Büyük Millet Meclisi)" },
    { front: "Bayrak, dil, tarih gibi ortak değerlere ne denir?", back: "Milli değerler" },
    { front: "Tasarruf ne demektir?", back: "Gereksiz harcamalardan kaçınıp biriktirmek" },
    { front: "İhtiyaç ile istek arasındaki fark nedir?", back: "İhtiyaç yaşam için gereklidir, istek gerekli olmayan arzudur" }
  ];

  var sinif5TurkceCards = [
    { front: "Sözcükte gerçek anlam nedir?", back: "Kelimenin ilk akla gelen, temel anlamı" },
    { front: "Sözcükte mecaz anlam nedir?", back: "Kelimenin gerçek anlamından farklı, benzetme yoluyla kazandığı anlam" },
    { front: "Yüreği dağ gibi sözünde dağ hangi anlamda kullanılmıştır?", back: "Mecaz anlamda" },
    { front: "Öznel yargı ile nesnel yargı arasındaki fark nedir?", back: "Öznel kişisel görüş, nesnel kanıtlanabilir bilgidir" },
    { front: "Bir metnin ana düşüncesini bulmak için nereye bakılır?", back: "Metnin bütününe ve tekrar eden fikre" },
    { front: "Noktalı virgül (;) ne zaman kullanılır?", back: "Birbirine bağlı sıralı cümleleri ayırmak için" },
    { front: "Kitap okumak, yüzmek gibi kalıplar hangi kelime türüdür?", back: "Fiilimsi (isim-fiil)" },
    { front: "Paragrafta yardımcı düşünce nedir?", back: "Ana düşünceyi destekleyen düşünce" },
    { front: "Bir yazıda yazarın amacı ne olabilir?", back: "Bilgi vermek, ikna etmek veya eğlendirmek" },
    { front: "Göz kulak olmak hangi söz sanatına örnektir?", back: "Deyim" },
  ];

  var sinif5MatematikCards = [
    { front: "Bir sayının asal çarpanlarına ayrılmasına ne denir?", back: "Çarpanlara ayırma" },
    { front: "2, 3, 5, 7 gibi sayılara ne denir?", back: "Asal sayı" },
    { front: "12'nin tam bölenleri nelerdir?", back: "1, 2, 3, 4, 6, 12" },
    { front: "3/5 kesri ile 2/5 kesrinin toplamı kaçtır?", back: "5/5 yani 1" },
    { front: "0,25 ondalık sayısı kesir olarak nedir?", back: "1/4" },
    { front: "Bir üçgenin alanı nasıl hesaplanır?", back: "(Taban x Yükseklik) / 2" },
    { front: "Yüzde (%) ne anlama gelir?", back: "100'de kaçı olduğunu ifade eder" },
    { front: "100'ün %20'si kaçtır?", back: "20" },
    { front: "Bir dairenin merkezinden çevresine olan uzaklığa ne denir?", back: "Yarıçap" },
    { front: "6 ile 8'in en küçük ortak katı (EKOK) kaçtır?", back: "24" },
    { front: "12 ile 18'in en büyük ortak böleni (EBOB) kaçtır?", back: "6" },
    { front: "8 sayısının karesi kaçtır?", back: "64" },
  ];

  var sinif5FenBilimleriCards = [
    { front: "Güneş Sistemi'nin merkezinde ne bulunur?", back: "Güneş" },
    { front: "Dünya'ya en yakın gök cismi hangisidir?", back: "Ay" },
    { front: "Canlıları sınıflandırırken kullanılan en büyük grup nedir?", back: "Alem" },
    { front: "İnsan vücudunda kanı pompalayan organ hangisidir?", back: "Kalp" },
    { front: "Solunum sisteminin ana organı hangisidir?", back: "Akciğer" },
    { front: "Besinlerin sindirimi nerede başlar?", back: "Ağızda" },
    { front: "Maddenin miktarının ölçüsüne ne denir?", back: "Kütle" },
    { front: "Sesin yayılması için neye ihtiyaç vardır?", back: "Bir ortama (hava, su, katı madde)" },
    { front: "Işığın bir yüzeyden geri dönmesine ne denir?", back: "Yansıma" },
    { front: "Basit makinelere örnek ver.", back: "Makara, eğik düzlem, kaldıraç" },
    { front: "Bir mıknatısın iki kutbu nasıl adlandırılır?", back: "Kuzey ve güney kutbu" },
    { front: "Erime ve donma birbirinin nesidir?", back: "Zıttı (tersi)" },
  ];

  var sinif5SosyalBilgilerCards = [
    { front: "İpek Yolu neden önemlidir?", back: "Doğu ile Batı arasında ticareti sağlayan tarihi yol olduğu için" },
    { front: "İletişim araçlarının gelişimi hayatımızı nasıl etkilemiştir?", back: "Bilgiye ulaşmayı hızlandırmış ve kolaylaştırmıştır" },
    { front: "Yerel yönetimlere örnek ver.", back: "Belediye" },
    { front: "Ülkemizde kaç coğrafi bölge vardır?", back: "7" },
    { front: "Doğal kaynaklara örnek ver.", back: "Su, orman, maden" },
    { front: "Göç nedir?", back: "Bir yerden başka bir yere yerleşmek amacıyla yapılan yer değiştirme" },
    { front: "Kültürel miras örneklerinden biri nedir?", back: "Tarihi eserler, gelenekler" },
    { front: "İnsan hakları neden önemlidir?", back: "Herkesin eşit ve onurlu yaşaması için" },
    { front: "Bir ülkenin bağımsızlığı ne anlama gelir?", back: "Kendi kararlarını başka bir gücün etkisi olmadan alabilmesi" },
    { front: "Sivil toplum kuruluşu (STK) nedir?", back: "Kâr amacı gütmeden topluma fayda sağlamak için kurulan kuruluş" },
  ];

  var sinif5IngilizceCards = [
    { front: "Apple kelimesinin Türkçe anlamı nedir?", back: "Elma" },
    { front: "Book kelimesinin Türkçe anlamı nedir?", back: "Kitap" },
    { front: "Monday hangi gün anlamına gelir?", back: "Pazartesi" },
    { front: "Red kelimesinin Türkçe anlamı nedir?", back: "Kırmızı" },
    { front: "How are you? ifadesinin anlamı nedir?", back: "Nasılsın?" },
    { front: "Family kelimesinin Türkçe anlamı nedir?", back: "Aile" }
  ];

  var sinif6TurkceCards = [
    { front: "Cümlenin öğeleri nelerdir?", back: "Özne, yüklem, nesne, dolaylı tümleç, zarf tümleci" },
    { front: "Yüklem cümlede nedir?", back: "İşi, oluşu, durumu bildiren ve genelde cümle sonunda bulunan öğe" },
    { front: "Nesne (tümleç) cümlede neyi bildirir?", back: "Yüklemin etkilediği varlığı" },
    { front: "Fiilimsi türleri nelerdir?", back: "İsim-fiil, sıfat-fiil, zarf-fiil" },
    { front: "-mak/-mek eki fiile eklenince ne olur?", back: "İsim-fiil olur" },
    { front: "Bir varlığı başka bir varlığa benzetmeye ne denir?", back: "Benzetme (teşbih)" },
    { front: "Kişileştirme (teşhis) nedir?", back: "İnsan olmayan varlıklara insan özelliği verme" },
    { front: "Bir öyküde yer unsuru neyi ifade eder?", back: "Olayın geçtiği mekânı" },
    { front: "Anlatım bozukluğu nedir?", back: "Cümlenin anlam veya yapı bakımından hatalı olması" },
    { front: "Bağlaç nedir?", back: "Kelimeleri veya cümleleri birbirine bağlayan kelime" },
  ];

  var sinif6MatematikCards = [
    { front: "Tam sayılar hangi sayılardan oluşur?", back: "Negatif tam sayılar, sıfır ve pozitif tam sayılar" },
    { front: "-5 ile +3 sayılarının toplamı kaçtır?", back: "-2" },
    { front: "Bir sayının mutlak değeri nedir?", back: "Sayının sıfıra olan uzaklığı (her zaman pozitif)" },
    { front: "Oran nedir?", back: "İki çokluğun birbirine bölünmesiyle elde edilen değer" },
    { front: "Orantı nedir?", back: "İki oranın birbirine eşit olması" },
    { front: "Bir çemberin çevresi nasıl hesaplanır?", back: "2 x π x yarıçap" },
    { front: "Bir dairenin alanı nasıl hesaplanır?", back: "π x yarıçap kare" },
    { front: "Cebirsel ifade nedir?", back: "Bilinmeyen içeren matematiksel ifade" },
    { front: "2x + 3 = 9 denkleminde x kaçtır?", back: "3" },
    { front: "Yüzde 50, kesir olarak nedir?", back: "1/2" },
    { front: "Bir kenar uzunluğu 4 cm olan karenin alanı kaç cm karedir?", back: "16" },
    { front: "-8 sayısının mutlak değeri kaçtır?", back: "8" },
  ];

  var sinif6FenBilimleriCards = [
    { front: "Sindirim sisteminin son organı hangisidir?", back: "Kalın bağırsak" },
    { front: "Kaslarımız ne işe yarar?", back: "Hareket etmemizi sağlar" },
    { front: "Kuvvetin birimi nedir?", back: "Newton" },
    { front: "Sürtünme kuvveti hareketi nasıl etkiler?", back: "Hareketi yavaşlatır" },
    { front: "Işığın madde içinden geçebilmesine göre maddeler nasıl sınıflandırılır?", back: "Saydam, yarı saydam, opak (saydam olmayan)" },
    { front: "Elektrik devresinde akımı kesmeye yarayan eleman nedir?", back: "Anahtar (switch)" },
    { front: "Vücudumuzda oksijenin kana karıştığı organ hangisidir?", back: "Akciğer" },
    { front: "Madde döngüsüne bir örnek ver.", back: "Su döngüsü" },
    { front: "Ekosistemde üretici canlılara örnek nedir?", back: "Bitkiler" },
    { front: "Ekosistemde tüketici canlılara örnek nedir?", back: "Hayvanlar" },
  ];

  var sinif6SosyalBilgilerCards = [
    { front: "İslamiyet öncesi Türklerin yaşam biçimi genellikle nasıldı?", back: "Göçebe (konar-göçer)" },
    { front: "Türklerin İslamiyet'i kabul etmesiyle hangi devlet kurulmuştur?", back: "Karahanlı Devleti" },
    { front: "Anadolu'ya Türklerin yerleşmesini sağlayan savaş hangisidir?", back: "Malazgirt Savaşı (1071)" },
    { front: "Bir ülkenin yönetim biçimlerinden biri nedir?", back: "Cumhuriyet" },
    { front: "Demokrasi nedir?", back: "Halkın kendi kendini yönetmesi" },
    { front: "Bireysel hak ve özgürlüklere örnek nedir?", back: "Düşünce özgürlüğü, eğitim hakkı" },
    { front: "Ekonomik faaliyetlere örnek nedir?", back: "Tarım, sanayi, ticaret" },
    { front: "Doğal afetlere karşı alınabilecek önlemlere örnek nedir?", back: "Sağlam bina yapımı, erken uyarı sistemleri" },
    { front: "Kültürel etkileşim nedir?", back: "Farklı toplumların birbirini kültürel açıdan etkilemesi" },
    { front: "Bilim insanlarının çalışmalarını paylaştığı ortama örnek nedir?", back: "Bilimsel dergi, konferans" },
  ];

  var sinif6IngilizceCards = [
    { front: "School kelimesinin Türkçe anlamı nedir?", back: "Okul" },
    { front: "Teacher kelimesinin Türkçe anlamı nedir?", back: "Öğretmen" },
    { front: "What time is it? ifadesinin anlamı nedir?", back: "Saat kaç?" },
    { front: "I like ifadesinin anlamı nedir?", back: "Seviyorum / hoşuma gidiyor" },
    { front: "Weekend kelimesinin Türkçe anlamı nedir?", back: "Hafta sonu" },
    { front: "Yesterday kelimesinin Türkçe anlamı nedir?", back: "Dün" },
    { front: "Tomorrow kelimesinin Türkçe anlamı nedir?", back: "Yarın" },
    { front: "My name is... ifadesinin anlamı nedir?", back: "Benim adım..." }
  ];

  var sinif7TurkceCards = [
    { front: "Sıfat-fiil (ortaç) nedir?", back: "Fiilden türeyip isim gibi kullanılan, sıfat görevi gören kelime" },
    { front: "-an/-en eki fiile gelince hangi fiilimsi oluşur?", back: "Sıfat-fiil (ortaç)" },
    { front: "Zarf-fiil (bağ-fiil) nedir?", back: "Fiilden türeyip zarf görevinde kullanılan kelime" },
    { front: "-erek/-arak eki hangi fiilimsi türünü oluşturur?", back: "Zarf-fiil" },
    { front: "Bir metinde yardımcı fikir sayısı hakkında ne söylenebilir?", back: "Birden fazla olabilir" },
    { front: "Öyküleyici anlatım nedir?", back: "Bir olayın oluş sırasına göre anlatıldığı anlatım biçimi" },
    { front: "Betimleyici (tasvir edici) anlatım nedir?", back: "Bir varlığı, yeri okuyucunun gözünde canlandıracak şekilde anlatma" },
    { front: "Cümlede neden-sonuç ilişkisi hangi bağlaçlarla kurulur?", back: "İçin, dolayı gibi bağlaçlarla" },
    { front: "Cümlede öznel ifadeye örnek nedir?", back: "Bence, bana göre gibi kişisel görüş bildiren ifadeler" },
  ];

  var sinif7MatematikCards = [
    { front: "Rasyonel sayı nedir?", back: "İki tam sayının oranı şeklinde yazılabilen sayı" },
    { front: "Bir doğrunun eğimi neyi ifade eder?", back: "Doğrunun dikliğini" },
    { front: "Cebirsel ifadelerde terim nedir?", back: "Artı veya eksi işaretiyle ayrılan ifadeler" },
    { front: "3x + 2x işleminin sonucu nedir?", back: "5x" },
    { front: "Bir dikdörtgenler prizmasının hacmi nasıl hesaplanır?", back: "Uzunluk x genişlik x yükseklik" },
    { front: "Doğru orantıda bir çokluk artarsa diğeri ne olur?", back: "Artar" },
    { front: "Ters orantıda bir çokluk artarsa diğeri ne olur?", back: "Azalır" },
    { front: "Bir çokgenin iç açıları toplamı nasıl bulunur?", back: "(Kenar sayısı - 2) x 180" },
    { front: "Bir beşgenin iç açıları toplamı kaç derecedir?", back: "540" },
    { front: "5x - 3 = 12 denkleminde x kaçtır?", back: "3" },
    { front: "Negatif bir sayının karesi neden pozitiftir?", back: "İki negatif sayının çarpımı pozitif olduğu için" },
    { front: "Bir üçgende iki kenarın toplamı üçüncü kenardan büyük müdür?", back: "Evet (üçgen eşitsizliği)" },
  ];

  var sinif7FenBilimleriCards = [
    { front: "Hücrenin yönetim merkezi hangi organeldir?", back: "Çekirdek" },
    { front: "Bitki hücresinde bulunup hayvan hücresinde bulunmayan yapılar nelerdir?", back: "Hücre duvarı ve kloroplast" },
    { front: "Newton neyin ölçü birimidir?", back: "Kuvvetin" },
    { front: "Basınç neye bağlıdır?", back: "Uygulanan kuvvet ve yüzey alanına" },
    { front: "Elektrik enerjisinin ısı enerjisine dönüşümüne örnek nedir?", back: "Elektrikli ısıtıcı, ütü" },
    { front: "Güneş'e uzaklık sırasına göre ilk üç gezegen hangileridir?", back: "Merkür, Venüs, Dünya" },
    { front: "Mevsimlerin oluşma nedeni nedir?", back: "Dünya'nın ekseninin eğik olması ve Güneş etrafında dönmesi" },
    { front: "Kalıtım nedir?", back: "Özelliklerin nesilden nesile aktarılması" },
    { front: "DNA'nın açılımı nedir?", back: "Deoksiribonükleik asit" },
    { front: "Basınç birimi nedir?", back: "Pascal" },
  ];

  var sinif7SosyalBilgilerCards = [
    { front: "Osmanlı Devleti'ni kim, ne zaman kurmuştur?", back: "Osman Gazi, 1299" },
    { front: "İstanbul'un fethi hangi çağı kapatıp hangi çağı açmıştır?", back: "Orta Çağ'ı kapatıp Yeni Çağ'ı açmıştır" },
    { front: "Osmanlı Devleti'nde eğitim kurumlarına örnek nedir?", back: "Medrese" },
    { front: "Coğrafi Keşifler'in en önemli sonuçlarından biri nedir?", back: "Yeni kıtaların keşfedilmesi ve ticaret yollarının değişmesi" },
    { front: "Rönesans hareketi nerede başlamıştır?", back: "İtalya" },
    { front: "Reform hareketi hangi alanda gerçekleşmiştir?", back: "Din (Hristiyanlık) alanında" },
    { front: "Osmanlı'da bilim insanlarına örnek nedir?", back: "Piri Reis, Ali Kuşçu" },
    { front: "Piri Reis hangi eseriyle tanınır?", back: "Dünya haritası ve Kitab-ı Bahriye" },
    { front: "Osmanlı Devleti'nin ilk başkenti neresidir?", back: "Söğüt" },
  ];

  var sinif7IngilizceCards = [
    { front: "Because kelimesinin Türkçe anlamı nedir?", back: "Çünkü" },
    { front: "I have to ifadesinin anlamı nedir?", back: "Yapmam gerekiyor" },
    { front: "Always kelimesinin Türkçe anlamı nedir?", back: "Her zaman" },
    { front: "Never kelimesinin Türkçe anlamı nedir?", back: "Asla, hiçbir zaman" },
    { front: "Healthy food ifadesinin anlamı nedir?", back: "Sağlıklı besin" },
    { front: "Free time ifadesinin anlamı nedir?", back: "Boş zaman" },
  ];

  var sinif7DinKulturuCards = [
    { front: "İslam dininin temel inanç esaslarına ne denir?", back: "İman esasları (Amentü)" },
    { front: "Kur'an-ı Kerim kaç sure içerir?", back: "114" },
    { front: "Zekât nedir?", back: "Belirli bir mal varlığına sahip Müslümanların ihtiyaç sahiplerine verdiği yardım" },
    { front: "Hz. Muhammed'in doğduğu şehir neresidir?", back: "Mekke" }
  ];

  var sinif8TurkceCards = [
    { front: "Cümlenin öğelerini bulurken önce hangi öğe bulunur?", back: "Yüklem" },
    { front: "Dolaylı tümleç cümlede neyi bildirir?", back: "Yer, yön, durum bildiren tümleç" },
    { front: "Fiilde kip nedir?", back: "Fiilin zaman veya anlam bakımından gösterdiği durum" },
    { front: "Bileşik zamanlı fiil nedir?", back: "Basit çekimli fiile idi, imiş, ise gelmesiyle oluşan fiil" },
    { front: "Anlatım bozukluklarından gereksiz sözcük kullanımı nasıl önlenir?", back: "Anlamı bozmayan fazlalık kelimeleri çıkararak" },
    { front: "Cümlede pekiştirme nasıl yapılır?", back: "Sözcüğün ilk hecesi tekrarlanarak (örnek: masmavi)" },
    { front: "Paragrafta giriş cümlesi nasıl tanınır?", back: "Konuyu ilk kez ortaya koyan, kendinden önce cümle gerektirmeyen cümledir" },
    { front: "Öznel anlatımlı cümleye örnek nedir?", back: "Bu film çok güzeldi gibi kişisel yargı içeren cümle" },
    { front: "Bir cümlede birden fazla yüklem varsa cümle nasıl adlandırılır?", back: "Birleşik veya sıralı cümle" },
  ];

  var sinif8MatematikCards = [
    { front: "Çarpanlara ayırma nedir?", back: "Bir ifadeyi çarpanlarının çarpımı şeklinde yazma" },
    { front: "a kare eksi b kare ifadesi nasıl çarpanlarına ayrılır?", back: "(a-b)(a+b)" },
    { front: "İki bilinmeyenli bir doğrusal denklem sisteminde kaç denklem gerekir?", back: "2" },
    { front: "Üslü sayılarda taban aynıyken üsler çarpılırsa ne olur?", back: "Üsler toplanır" },
    { front: "Karekök almak hangi işlemin tersidir?", back: "Karesini alma" },
    { front: "Karekök 16 kaçtır?", back: "4" },
    { front: "Bir küpün hacmi nasıl hesaplanır?", back: "Kenar x kenar x kenar" },
    { front: "Veri analizinde ortalama nasıl bulunur?", back: "Verilerin toplamının veri sayısına bölünmesiyle" },
    { front: "Veri analizinde ortanca (medyan) nedir?", back: "Sıralı verilerin ortasındaki değer" },
    { front: "Bir olayın olma olasılığı nasıl hesaplanır?", back: "İstenen durum sayısı bölü toplam durum sayısı" },
    { front: "Üç basamaklı en büyük sayı ile en küçük sayının farkı kaçtır?", back: "999 - 100 = 899" },
  ];

  var sinif8FenBilimleriCards = [
    { front: "DNA hücrenin hangi bölümünde bulunur?", back: "Çekirdek" },
    { front: "Mitoz bölünme sonucunda kaç hücre oluşur?", back: "2" },
    { front: "Mayoz bölünme sonucunda kaç hücre oluşur?", back: "4" },
    { front: "Basınç birimi nedir?", back: "Pascal (Pa)" },
    { front: "Sıvı basıncı neye bağlıdır?", back: "Sıvının yoğunluğuna ve derinliğe" },
    { front: "Periyodik tabloda elementler neye göre sıralanır?", back: "Atom numarasına göre" },
    { front: "Asit ve baz karışınca ne oluşur?", back: "Tuz ve su (nötrleşme tepkimesi)" },
    { front: "Basit elektrik devresinde direnç neyi ifade eder?", back: "Akıma karşı gösterilen zorluk" },
    { front: "Canlıların genetik bilgisini taşıyan molekül hangisidir?", back: "DNA" },
  ];

  var sinif8InkilapTarihiCards = [
    { front: "I. Dünya Savaşı hangi yıllar arasında yaşanmıştır?", back: "1914-1918" },
    { front: "Mustafa Kemal Samsun'a hangi tarihte çıkmıştır?", back: "19 Mayıs 1919" },
    { front: "TBMM hangi tarihte açılmıştır?", back: "23 Nisan 1920" },
    { front: "Sakarya Meydan Muharebesi hangi yıl kazanılmıştır?", back: "1921" },
    { front: "Büyük Taarruz hangi tarihte başlamıştır?", back: "26 Ağustos 1922" },
    { front: "Cumhuriyet hangi tarihte ilan edilmiştir?", back: "29 Ekim 1923" },
    { front: "Türkiye Cumhuriyeti'nin ilk cumhurbaşkanı kimdir?", back: "Mustafa Kemal Atatürk" },
    { front: "Harf inkılabı hangi yıl gerçekleşmiştir?", back: "1928" },
    { front: "Kadınlara milletvekili seçme-seçilme hakkı hangi yıl verilmiştir?", back: "1934" },
    { front: "Atatürk hangi tarihte vefat etmiştir?", back: "10 Kasım 1938" },
    { front: "Lozan Barış Antlaşması hangi yıl imzalanmıştır?", back: "1923" },
    { front: "Laiklik ilkesi ne anlama gelir?", back: "Din ve devlet işlerinin birbirinden ayrılması" },
    { front: "Saltanat hangi tarihte kaldırılmıştır?", back: "1 Kasım 1922" },
  ];

  var sinif8IngilizceCards = [
    { front: "Would you like...? ifadesi ne için kullanılır?", back: "Nazikçe teklif sunmak için" },
    { front: "In my opinion ifadesinin anlamı nedir?", back: "Bence, benim fikrime göre" },
    { front: "Environment kelimesinin Türkçe anlamı nedir?", back: "Çevre" },
    { front: "Global warming ifadesinin anlamı nedir?", back: "Küresel ısınma" },
  ];

  var sinif8DinKulturuCards = [
    { front: "İslam'ın beş şartından biri olan hac nedir?", back: "Belirli zamanlarda Mekke'ye yapılan ibadet amaçlı ziyaret" },
    { front: "Oruç hangi ayda tutulur?", back: "Ramazan ayında" },
    { front: "Kelime-i şehadet neyi ifade eder?", back: "Allah'ın birliğine ve Hz. Muhammed'in elçiliğine şahitlik" },
    { front: "İslam dininde sünnet ne demektir?", back: "Hz. Muhammed'in söz, davranış ve onaylarına dayanan uygulamalar" }
  ];

  var sinif9MatematikCards = [
    { front: "Kümelerde boş küme nasıl gösterilir?", back: "Boş süslü parantez veya belirli bir sembol" },
    { front: "Doğal sayılar kümesi neyi ifade eder?", back: "0, 1, 2, 3... sayılarını" },
    { front: "Mutlak değer fonksiyonu neyi verir?", back: "Sayının işaretsiz (pozitif) değerini" },
    { front: "Bir fonksiyonun tanım kümesi nedir?", back: "Fonksiyonun aldığı girdi değerlerinin kümesi" },
    { front: "Birinci dereceden bir bilinmeyenli denklem kaç kök verir?", back: "1" },
    { front: "İkinci dereceden bir bilinmeyenli denklemin genel adı nedir?", back: "Kuadratik (ikinci derece) denklem" },
    { front: "Bir üslü ifadede taban negatif ve üs tek sayıysa sonuç ne olur?", back: "Negatif" },
    { front: "Faktöriyel işlemi ne anlama gelir?", back: "Bir sayıdan 1'e kadar olan sayıların çarpımı" },
    { front: "5 faktöriyel (5!) kaçtır?", back: "120" },
    { front: "Permütasyon ile kombinasyon arasındaki temel fark nedir?", back: "Permütasyonda sıralama önemlidir, kombinasyonda önemli değildir" },
  ];

  var sinif9FizikCards = [
    { front: "Fizik biliminin temel amacı nedir?", back: "Doğa olaylarını gözlem ve deneyle açıklamak" },
    { front: "Hız birimi SI sisteminde nedir?", back: "m/s" },
    { front: "Sabit hızlı harekete ne denir?", back: "Düzgün doğrusal hareket" },
    { front: "İvme neyi ifade eder?", back: "Hızın zamana göre değişimini" },
    { front: "Newton'un birinci yasası (eylemsizlik) neyi ifade eder?", back: "Bir cisme net kuvvet etki etmezse hareket durumu değişmez" },
    { front: "Kuvvetin vektörel bir büyüklük olması ne anlama gelir?", back: "Hem büyüklüğü hem yönü vardır" },
    { front: "Enerji birimi nedir?", back: "Joule" },
    { front: "Öz kütle (yoğunluk) nasıl hesaplanır?", back: "Kütle bölü hacim" },
  ];

  var sinif9KimyaCards = [
    { front: "Kimyanın inceleme konusu nedir?", back: "Maddenin yapısı, özellikleri ve değişimleri" },
    { front: "Atomun temel parçacıkları nelerdir?", back: "Proton, nötron, elektron" },
    { front: "Protonlar atomun neresinde bulunur?", back: "Çekirdekte" },
    { front: "Elektronlar atomda nerede bulunur?", back: "Çekirdek etrafındaki elektron bulutunda" },
    { front: "Bir elementin atom numarası neyi gösterir?", back: "Proton sayısını" },
    { front: "Element ile bileşik arasındaki fark nedir?", back: "Element tek cins atomdan, bileşik farklı atomların birleşiminden oluşur" },
    { front: "Karışımlar kaça ayrılır?", back: "2 (homojen ve heterojen)" },
    { front: "Damıtma (distilasyon) hangi tür karışımları ayırmaya yarar?", back: "Homojen sıvı karışımları" },
  ];

  var sinif9BiyolojiCards = [
    { front: "Canlıların temel yapı taşı nedir?", back: "Hücre" },
    { front: "Prokaryot ile ökaryot hücre arasındaki temel fark nedir?", back: "Prokaryotta zarla çevrili çekirdek yoktur, ökaryotta vardır" },
    { front: "Hücre zarının temel görevi nedir?", back: "Hücreyi dış ortamdan ayırmak ve madde alışverişini düzenlemek" },
    { front: "Mitokondrinin görevi nedir?", back: "Hücrenin enerji üretim merkezi olmak" },
    { front: "Canlıların sınıflandırılmasında en küçük birim nedir?", back: "Tür" },
    { front: "Fotosentez hangi organelde gerçekleşir?", back: "Kloroplast" },
    { front: "Homeostazi nedir?", back: "Vücudun iç dengesini koruması" },
    { front: "Bir ekosistemde enerji akışı hangi yönde gerçekleşir?", back: "Üreticiden tüketiciye doğru, tek yönlü" },
  ];

  var sinif9TarihCards = [
    { front: "Tarih öncesi çağlar nelere göre ayrılır?", back: "Kullanılan alet ve gereçlere göre" },
    { front: "İlk Çağ'da yazının icadı hangi uygarlığa aittir?", back: "Sümerler" },
    { front: "Mısır uygarlığı hangi nehir çevresinde gelişmiştir?", back: "Nil Nehri" },
    { front: "Hammurabi Kanunları hangi uygarlığa aittir?", back: "Babilliler" },
    { front: "Anadolu'da kurulan ilk uygarlıklardan biri hangisidir?", back: "Hititler" },
    { front: "Hitit uygarlığı tarihteki ilk yazılı antlaşma ile hangi devletle tanınır?", back: "Mısırla yapılan Kadeş Antlaşması ile" },
    { front: "Eski Yunan uygarlığında yönetim biçimi olarak neyle tanınır?", back: "Site devletleri (polis) ve demokrasi ile" },
    { front: "Roma uygarlığının hukuk alanındaki en önemli mirası nedir?", back: "Roma Hukuku" },
  ];

  var sinif9EdebiyatCards = [
    { front: "Edebiyatın en eski sözlü ürünlerinden biri nedir?", back: "Destan" },
    { front: "Divan edebiyatı hangi dönemlerde etkili olmuştur?", back: "Osmanlı döneminde (13-19. yüzyıllar)" },
    { front: "Halk edebiyatı ürünlerine örnek nedir?", back: "Türkü, mani, atasözü" },
    { front: "Şiirde ölçü (vezin) nedir?", back: "Dizelerdeki hece veya durak sayısının düzenli olması" },
    { front: "Hece ölçüsü nedir?", back: "Dizelerdeki hece sayısına dayanan ölçü" },
    { front: "Aruz ölçüsü nedir?", back: "Hecelerin uzunluk-kısalığına dayanan, Divan edebiyatında kullanılan ölçü" },
    { front: "Roman türünün temel özelliği nedir?", back: "Olay, kişi, zaman, mekân öğeleriyle kurgulanmış uzun anlatı" },
    { front: "Tiyatro eserlerinde konuşmaların yazılı hâline ne denir?", back: "Diyalog" }
  ];

  var sinif10MatematikCards = [
    { front: "Fonksiyonlarda bileşke fonksiyon nedir?", back: "İki fonksiyonun art arda uygulanmasıyla oluşan yeni fonksiyon" },
    { front: "Ters fonksiyon nasıl gösterilir?", back: "f üzeri -1 şeklinde" },
    { front: "Polinom nedir?", back: "Değişkenlerin tam sayı kuvvetlerinden oluşan matematiksel ifade" },
    { front: "İkinci dereceden bir denklemin diskriminantı neyi belirler?", back: "Kökün gerçek olup olmadığını" },
    { front: "Bir üçgende kosinüs teoremi hangi durumda kullanılır?", back: "Üç kenarı bilinen üçgende açı bulmak için" },
    { front: "Trigonometride sinüs oranı neyi ifade eder?", back: "Karşı kenar bölü hipotenüs" },
    { front: "Logaritma neyin tersidir?", back: "Üslü ifadenin" },
    { front: "10 tabanında logaritma 100 kaçtır?", back: "2" },
    { front: "Bir dizinin aritmetik dizi olması ne anlama gelir?", back: "Ardışık terimler arasındaki farkın sabit olması" },
    { front: "Geometrik dizide ardışık terimler arasındaki oran nasıl adlandırılır?", back: "Ortak çarpan" },
  ];

  var sinif10FizikCards = [
    { front: "İş (fizikte) nasıl tanımlanır?", back: "Kuvvet çarpı yol, kuvvet yönünde alınan yol" },
    { front: "Enerjinin korunumu yasası neyi ifade eder?", back: "Enerji yoktan var, vardan yok edilemez, sadece dönüşür" },
    { front: "Elektrik akımının birimi nedir?", back: "Amper" },
    { front: "Ohm Yasası neyi ifade eder?", back: "Akım, gerilim ile doğru, direnç ile ters orantılıdır" },
    { front: "Elektrik potansiyel farkının (gerilim) birimi nedir?", back: "Volt" },
    { front: "Pascal hangi büyüklüğün birimidir?", back: "Basıncın" },
    { front: "Kaldırma kuvveti hangi ortamda etkilidir?", back: "Sıvı ve gaz (akışkan) ortamlarda" },
    { front: "Isı ile sıcaklık arasındaki fark nedir?", back: "Isı enerjidir, sıcaklık bu enerjinin şiddetinin ölçüsüdür" },
  ];

  var sinif10KimyaCards = [
    { front: "Periyodik cetvelde yatay sıralara ne denir?", back: "Periyot" },
    { front: "Periyodik cetvelde dikey sütunlara ne denir?", back: "Grup" },
    { front: "Elektronegatiflik nedir?", back: "Bir atomun elektronu kendine çekme gücü" },
    { front: "İyonik bağ nasıl oluşur?", back: "Elektron alışverişiyle" },
    { front: "Kovalent bağ nasıl oluşur?", back: "Elektron ortaklaşımıyla" },
    { front: "Asitlerin ortak özelliği nedir?", back: "Suda H+ iyonu verirler, pH'ları 7'den küçüktür" },
    { front: "Bazların ortak özelliği nedir?", back: "Suda OH- iyonu verirler, pH'ları 7'den büyüktür" },
    { front: "Mol kavramı neyi ifade eder?", back: "Avogadro sayısı kadar tanecik içeren madde miktarı" },
  ];

  var sinif10BiyolojiCards = [
    { front: "Kalıtımın temel biriminin adı nedir?", back: "Gen" },
    { front: "Mendel'in kalıtım çalışmalarında kullandığı bitki hangisidir?", back: "Bezelye" },
    { front: "Baskın (dominant) genin özelliği nedir?", back: "Kendini her zaman gösteren gen" },
    { front: "Çekinik (resesif) genin özelliği nedir?", back: "Ancak iki kopya olduğunda kendini gösteren gen" },
    { front: "DNA'nın çift sarmal yapısını kimler keşfetmiştir?", back: "Watson ve Crick" },
    { front: "Kromozom nedir?", back: "DNA ve proteinlerden oluşan, kalıtsal bilgiyi taşıyan yapı" },
    { front: "İnsanda kaç kromozom bulunur?", back: "46" },
    { front: "Cinsiyeti belirleyen kromozomlara ne denir?", back: "Eşey (cinsiyet) kromozomları" },
  ];

  var sinif10TarihCards = [
    { front: "Orta Çağ Avrupa'sında toprak sahipliğine dayalı sisteme ne denir?", back: "Feodalite" },
    { front: "Türklerin İslamiyet'i kabulünden sonra kurulan ilk büyük Türk-İslam devleti hangisidir?", back: "Karahanlı Devleti" },
    { front: "Büyük Selçuklu Devleti'ni kim kurmuştur?", back: "Tuğrul Bey" },
    { front: "Malazgirt Savaşı hangi yıl yapılmıştır?", back: "1071" },
    { front: "Anadolu Selçuklu Devleti'nin başkenti neresidir?", back: "Konya" },
    { front: "Haçlı Seferleri'nin temel nedenlerinden biri nedir?", back: "Kutsal toprakları (Kudüs) ele geçirmek" },
    { front: "Osmanlı Devleti hangi yıl, kim tarafından kurulmuştur?", back: "1299, Osman Gazi" },
    { front: "İstanbul'un fethi hangi yıl gerçekleşmiştir?", back: "1453" },
  ];

  var sinif10EdebiyatCards = [
    { front: "Divan edebiyatının en önemli nazım biçimlerinden biri nedir?", back: "Gazel" },
    { front: "Divan şiirinde beyit nedir?", back: "İki dizeden oluşan şiir birimi" },
    { front: "Halk edebiyatında aşık tarzı şiirin temsilcilerinden biri kimdir?", back: "Karacaoğlan" },
    { front: "Tanzimat edebiyatı hangi dönemde başlamıştır?", back: "1860'larda" },
    { front: "Tanzimat edebiyatının öncülerinden biri kimdir?", back: "Şinasi" },
    { front: "Roman türü Türk edebiyatına hangi dönemde girmiştir?", back: "Tanzimat dönemi" },
    { front: "Şair Evlenmesi adlı ilk tiyatro örneklerinden biri kimin eseridir?", back: "Şinasi" },
    { front: "Namık Kemal hangi edebi akımın önemli isimlerindendir?", back: "Tanzimat edebiyatı" }
  ];

  var sinif11MatematikCards = [
    { front: "Trigonometride tanjant nasıl hesaplanır?", back: "Karşı kenar bölü komşu kenar" },
    { front: "Bir dairenin analitik denklemi nasıldır?", back: "(x-a) kare + (y-b) kare = r kare" },
    { front: "Türev neyi ifade eder?", back: "Bir fonksiyonun anlık değişim hızını" },
    { front: "Bir fonksiyonun türevi sıfır olduğu noktada ne olabilir?", back: "Yerel maksimum veya minimum" },
    { front: "Limit kavramı neyi ifade eder?", back: "Bir fonksiyonun bir noktaya yaklaşırken aldığı değeri" },
    { front: "Karmaşık sayılarda i neyi ifade eder?", back: "-1'in karekökünü (sanal birim)" },
    { front: "Parabolün tepe noktasının x koordinatı formülü nedir?", back: "x = -b bölü 2a" },
    { front: "Permütasyonda tekrarlı elemanlar varsa formül nasıl değişir?", back: "Tekrar eden elemanların faktöriyeline bölünür" },
    { front: "Olasılıkta bağımsız olaylarda ve durumunun olasılığı nasıl bulunur?", back: "Olasılıklar çarpılarak" },
    { front: "Aritmetik dizinin n. terimi formülü nedir?", back: "a1 + (n-1) x d" },
  ];

  var sinif11FizikCards = [
    { front: "Elektrik alan nedir?", back: "Elektrik yüklerinin çevresinde oluşturduğu etki alanı" },
    { front: "Manyetik alan nedir?", back: "Mıknatısların ve akım taşıyan tellerin çevresinde oluşturduğu etki alanı" },
    { front: "Elektromanyetik indüksiyon nedir?", back: "Değişen manyetik alanın elektrik akımı oluşturması" },
    { front: "Dalga hareketinde frekans neyi ifade eder?", back: "Birim zamandaki titreşim sayısını" },
    { front: "Ses dalgaları hangi tür dalgadır?", back: "Mekanik (boyuna) dalga" },
    { front: "Işık dalgaları hangi tür dalgadır?", back: "Elektromanyetik (enine) dalga" },
    { front: "Atom modelinde elektronların bulunma olasılığının yüksek olduğu bölgeye ne denir?", back: "Orbital" },
    { front: "Radyoaktif bozunma türlerinden birini say.", back: "Alfa, beta veya gama bozunması" },
  ];

  var sinif11KimyaCards = [
    { front: "Kimyasal tepkimelerde enerji açığa çıkarsa buna ne denir?", back: "Ekzotermik tepkime" },
    { front: "Kimyasal tepkimelerde enerji soğurulursa buna ne denir?", back: "Endotermik tepkime" },
    { front: "Tepkime hızını etkileyen faktörlere örnek nedir?", back: "Sıcaklık, derişim, katalizör" },
    { front: "Katalizörün görevi nedir?", back: "Tepkime hızını artırmak, kendisi tükenmeden" },
    { front: "Kimyasal denge nedir?", back: "İleri ve geri tepkime hızlarının eşit olduğu durum" },
    { front: "pH ölçeği kaç ile kaç arasında değişir?", back: "0 ile 14 arasında" },
    { front: "Nötr bir çözeltinin pH'ı kaçtır?", back: "7" },
    { front: "Organik kimyanın temel elementi hangisidir?", back: "Karbon" },
  ];

  var sinif11BiyolojiCards = [
    { front: "İnsanda sinir sisteminin temel hücresi nedir?", back: "Nöron" },
    { front: "Hormon salgılayan bezlere ne denir?", back: "Endokrin bez" },
    { front: "Kan grubu sistemlerinden biri hangisidir?", back: "ABO sistemi" },
    { front: "Bağışıklık sisteminde antikor üreten hücreler hangileridir?", back: "B lenfositleri" },
    { front: "Fotosentezin girdileri nelerdir?", back: "Su, karbondioksit ve güneş ışığı" },
    { front: "Fotosentezin çıktıları nelerdir?", back: "Glikoz (besin) ve oksijen" },
    { front: "Hücresel solunum hangi organelde gerçekleşir?", back: "Mitokondri" },
    { front: "Bitkilerde su taşınmasını sağlayan doku hangisidir?", back: "Odun boruları (ksilem)" },
  ];

  var sinif11TarihCards = [
    { front: "Osmanlı Devleti'nin en geniş sınırlara ulaştığı padişah kimdir?", back: "Kanuni Sultan Süleyman" },
    { front: "Halifelik unvanı Osmanlı'ya hangi padişah döneminde geçmiştir?", back: "Yavuz Sultan Selim döneminde" },
    { front: "Osmanlı'da divan teşkilatının başındaki kişi kimdir?", back: "Sadrazam" },
    { front: "Osmanlı gerileme döneminin başlangıcı hangi antlaşmayla kabul edilir?", back: "Karlofça Antlaşması (1699)" },
    { front: "Tanzimat Fermanı hangi yıl ilan edilmiştir?", back: "1839" },
    { front: "Tanzimat Fermanı'nın en önemli özelliği nedir?", back: "Kanun önünde eşitlik ilkesinin kabulü" },
    { front: "I. Meşrutiyet hangi yıl ilan edilmiştir?", back: "1876" },
    { front: "II. Meşrutiyet hangi yıl ilan edilmiştir?", back: "1908" },
  ];

  var sinif11EdebiyatCards = [
    { front: "Servet-i Fünun edebiyatı hangi yıllarda etkili olmuştur?", back: "1896-1901 arasında" },
    { front: "Servet-i Fünun edebiyatının önde gelen isimlerinden biri kimdir?", back: "Tevfik Fikret" },
    { front: "Fecr-i Ati topluluğu hangi dönemde ortaya çıkmıştır?", back: "II. Meşrutiyet sonrası (1909)" },
    { front: "Milli Edebiyat akımının temel özelliği nedir?", back: "Sade Türkçe kullanımı ve milli konulara yönelme" },
    { front: "Milli Edebiyat akımının önemli temsilcilerinden biri kimdir?", back: "Ömer Seyfettin" },
    { front: "Hece ölçüsüne dönüş hangi akımla ilişkilidir?", back: "Milli Edebiyat" },
    { front: "Roman türünde realizm akımı neyi esas alır?", back: "Gerçekçi, gözleme dayalı anlatım" },
    { front: "Türk edebiyatında ilk yerli roman kabul edilen eser hangisidir?", back: "Taaşşuk-ı Talat ve Fitnat" }
  ];

  var sinif12MatematikCards = [
    { front: "Türev alma kurallarından çarpım kuralı nasıldır?", back: "(fg)' = f'g + fg'" },
    { front: "İntegral, türevin nesidir?", back: "Tersi (ters işlemi)" },
    { front: "Belirli integral neyi hesaplamaya yarar?", back: "Bir eğri altındaki alanı" },
    { front: "Bir fonksiyonun maksimum noktası nasıl bulunur?", back: "Türevi sıfır yapan ve ikinci türevi negatif olan nokta" },
    { front: "e sayısı yaklaşık olarak kaçtır?", back: "2,718" },
    { front: "Logaritmik fonksiyonun tanım kümesi nasıldır?", back: "Pozitif reel sayılar" },
    { front: "Yakınsak dizi ne demektir?", back: "Belirli bir değere yaklaşan dizi" },
    { front: "Analitik geometride iki nokta arasındaki uzaklık nasıl bulunur?", back: "Koordinat farklarının karelerinin toplamının karekökü alınarak" },
    { front: "Bir doğrunun eğimi 0 ise doğru nasıldır?", back: "Yatay (x eksenine paralel)" },
    { front: "Bir doğrunun eğimi tanımsız ise doğru nasıldır?", back: "Dikey (y eksenine paralel)" },
  ];

  var sinif12FizikCards = [
    { front: "Modern fiziğin temelini atan iki büyük teori nedir?", back: "Görelilik teorisi ve kuantum mekaniği" },
    { front: "Görelilik teorisini kim geliştirmiştir?", back: "Albert Einstein" },
    { front: "Fotoelektrik olay neyi açıklar?", back: "Işığın metal yüzeyden elektron koparmasını" },
    { front: "Işığın hem dalga hem tanecik özelliği göstermesine ne denir?", back: "Dalga-tanecik ikiliği" },
    { front: "Atom çekirdeğinin parçalanmasına ne denir?", back: "Fisyon" },
    { front: "Küçük çekirdeklerin birleşmesine ne denir?", back: "Füzyon" },
    { front: "Yarı iletken maddelere örnek nedir?", back: "Silisyum, germanyum" },
    { front: "Elektrik devrelerinde diyotun görevi nedir?", back: "Akımı tek yönde geçirmek" },
  ];

  var sinif12KimyaCards = [
    { front: "Organik bileşiklerde karbon atomları arasındaki bağ türleri nelerdir?", back: "Tekli, ikili, üçlü bağ" },
    { front: "Alkanlar hangi tür karbon bağına sahiptir?", back: "Tekli bağ (doymuş)" },
    { front: "Alkenler hangi tür karbon bağına sahiptir?", back: "İkili bağ" },
    { front: "Elektrokimyada pil nasıl çalışır?", back: "Kimyasal enerjiyi elektrik enerjisine dönüştürerek" },
    { front: "Elektroliz nedir?", back: "Elektrik enerjisiyle kimyasal tepkime gerçekleştirme" },
    { front: "Polimer nedir?", back: "Küçük moleküllerin (monomer) birleşmesiyle oluşan büyük molekül" },
    { front: "Doğal polimerlere örnek nedir?", back: "Nişasta, selüloz, protein" },
    { front: "Sentetik polimerlere örnek nedir?", back: "Naylon, polietilen (plastik)" },
  ];

  var sinif12BiyolojiCards = [
    { front: "Ekosistemde madde döngüsüne örnek nedir?", back: "Azot döngüsü, karbon döngüsü" },
    { front: "Popülasyon nedir?", back: "Belirli bir bölgede yaşayan aynı türe ait canlıların oluşturduğu topluluk" },
    { front: "Biyolojik çeşitlilik neden önemlidir?", back: "Ekosistem dengesini ve sürdürülebilirliği sağlar" },
    { front: "Evrim teorisinin öncülerinden biri kimdir?", back: "Charles Darwin" },
    { front: "Doğal seçilim nedir?", back: "Ortama en uyumlu bireylerin hayatta kalıp üreme şansının artması" },
    { front: "Biyoteknolojinin kullanım alanlarına örnek nedir?", back: "Tıp, tarım, endüstri" },
    { front: "Kök hücrelerin özelliği nedir?", back: "Farklı hücre türlerine dönüşebilme yeteneği" },
    { front: "Merkezi sinir sistemi hangi organlardan oluşur?", back: "Beyin ve omurilik" },
  ];

  var sinif12TarihCards = [
    { front: "I. Dünya Savaşı'nın başlangıç nedeni olarak kabul edilen olay nedir?", back: "Avusturya-Macaristan veliahdının Saraybosna'da öldürülmesi" },
    { front: "Mondros Ateşkes Antlaşması hangi yıl imzalanmıştır?", back: "1918" },
    { front: "Kurtuluş Savaşı'nın kazanılmasıyla imzalanan barış antlaşması hangisidir?", back: "Lozan Barış Antlaşması" },
    { front: "Cumhuriyet'in ilanından sonra yapılan ilk büyük inkılaplardan biri nedir?", back: "Halifeliğin kaldırılması" },
    { front: "II. Dünya Savaşı hangi yıllar arasında yaşanmıştır?", back: "1939-1945" },
    { front: "Türkiye II. Dünya Savaşı'na katılmış mıdır?", back: "Hayır, savaşın büyük bölümünde tarafsız kalmıştır" },
    { front: "Soğuk Savaş dönemi hangi iki blok arasında yaşanmıştır?", back: "ABD önderliğindeki Batı Bloku ve SSCB önderliğindeki Doğu Bloku" },
    { front: "Türkiye NATO'ya hangi yıl üye olmuştur?", back: "1952" },
  ];

  var sinif12EdebiyatCards = [
    { front: "Cumhuriyet dönemi edebiyatının temel özelliklerinden biri nedir?", back: "Toplumcu ve gerçekçi konulara yönelme" },
    { front: "Yedi Meşaleciler hangi türde eser vermiştir?", back: "Şiir" },
    { front: "Garip (I. Yeni) akımının öncüleri kimlerdir?", back: "Orhan Veli, Oktay Rifat, Melih Cevdet Anday" },
    { front: "Garip akımının şiirde savunduğu temel görüş nedir?", back: "Şiirde ölçü, kafiye ve süslü dilin terk edilmesi" },
    { front: "Nazım Hikmet hangi şiir akımıyla anılır?", back: "Serbest nazım ve toplumcu gerçekçi şiir" },
    { front: "Cumhuriyet dönemi roman yazarlarından biri kimdir?", back: "Yaşar Kemal" },
    { front: "İkinci Yeni şiir akımının temel özelliği nedir?", back: "Kapalı, imgeci ve soyut bir anlatım" },
    { front: "Türk edebiyatında Nobel Ödülü kazanan yazar kimdir?", back: "Orhan Pamuk" }
  ];

  var lgsTurkceCards = [
    { front: "Bir metinde amaç-sonuç ilişkisi hangi bağlaçlarla kurulur?", back: "Diye, için gibi bağlaçlarla" },
    { front: "Ama, fakat, lakin bağlaçları cümlede nasıl bir anlam ilişkisi kurar?", back: "Karşıtlık (zıtlık)" },
    { front: "Bir cümlede koşul anlamı hangi ekle verilir?", back: "-se/-sa eki veya eğer kelimesiyle" },
    { front: "Açıklayıcı anlatım ne amaçla kullanılır?", back: "Bilgi vermek, bir konuyu açıklamak için" },
    { front: "Bir metindeki grafik/tablo sorularında dikkat edilmesi gereken nedir?", back: "Verilerin doğru okunup karşılaştırılması" },
    { front: "Cümlede öznenin gizli olması ne anlama gelir?", back: "Fiilin çekiminden anlaşılan, ayrıca yazılmayan özne" },
    { front: "Sözel mantık sorularında sıralama yaparken nelere dikkat edilir?", back: "Verilen ipuçlarının tümünü birlikte değerlendirmek" },
    { front: "Bir yazıda tanık gösterme hangi düşünceyi geliştirme yoludur?", back: "Görüşü desteklemek için başka bir kişinin sözüne başvurma" },
    { front: "Karşılaştırma düşünceyi geliştirme yollarından biri midir?", back: "Evet" },
    { front: "Deyimlerin cümleye kattığı en önemli özellik nedir?", back: "Anlatımı etkili ve akıcı kılmak" },
  ];

  var lgsMatematikCards = [
    { front: "EBOB nasıl bulunur?", back: "Ortak asal çarpanların en küçük üslüsünün çarpımıyla" },
    { front: "Üslü sayılarda (a üzeri m) üzeri n ifadesinin sonucu nedir?", back: "a üzeri (m çarpı n)" },
    { front: "Kareköklü sayılarda karekök a çarpı karekök b işleminin sonucu nedir?", back: "Karekök (a çarpı b)" },
    { front: "Bir veri grubunun aralığı (açıklık) nasıl bulunur?", back: "En büyük değer eksi en küçük değer" },
    { front: "Bir eşitsizliğin her iki tarafı negatif sayıyla çarpılırsa ne olur?", back: "Eşitsizlik yön değiştirir" },
    { front: "İki bilinmeyenli bir denklemin grafiği nasıldır?", back: "Bir doğru" },
    { front: "Üçgende kenarortay neyi ifade eder?", back: "Bir köşeyi karşı kenarın orta noktasına birleştiren doğru parçası" },
    { front: "Dönüşüm geometrisinde öteleme nedir?", back: "Bir şeklin yönü ve boyutu değişmeden yer değiştirmesi" },
    { front: "Bir dik prizmanın yüzey alanı nasıl hesaplanır?", back: "Taban alanlarının ve yanal yüzey alanının toplamı" },
    { front: "Silindirin hacmi nasıl hesaplanır?", back: "π x yarıçap kare x yükseklik" },
    { front: "Olasılıkta kesin olayın olasılığı kaçtır?", back: "1" },
    { front: "Olasılıkta imkânsız olayın olasılığı kaçtır?", back: "0" },
  ];

  var lgsFenBilimleriCards = [
    { front: "Mevsimlerin oluşmasında Dünya'nın ekseninin eğik olması nasıl etkilidir?", back: "Güneş ışınlarının geliş açısını değiştirir" },
    { front: "DNA'nın yapı taşları nelerdir?", back: "Nükleotitler" },
    { front: "Kalıtsal hastalıklara örnek nedir?", back: "Renk körlüğü, hemofili" },
    { front: "Yükseklik ile atmosfer basıncı arasındaki ilişki nasıldır?", back: "Yükseklik arttıkça basınç azalır" },
    { front: "Kaldıraç türü basit makine hangi işi kolaylaştırır?", back: "Az kuvvetle büyük yükleri kaldırmayı" },
    { front: "Enerji dönüşümünde verim yüzde 100 olabilir mi?", back: "Hayır, her zaman bir miktar enerji ısı olarak kaybolur" },
    { front: "Karbon döngüsünde bitkiler ne yapar?", back: "Fotosentezle karbondioksiti alır" },
    { front: "Elektrik devresinde seri bağlı ampullerden biri sönerse diğerleri ne olur?", back: "Söner" },
    { front: "Elektrik devresinde paralel bağlı ampullerden biri sönerse diğerleri ne olur?", back: "Yanmaya devam eder" },
    { front: "Periyodik tabloda metaller genellikle nerede bulunur?", back: "Sol ve orta kısımda" },
  ];

  var lgsInkilapTarihiCards = [
    { front: "Amasya Genelgesi hangi tarihte yayımlanmıştır?", back: "22 Haziran 1919" },
    { front: "Erzurum ve Sivas kongrelerinin ortak amacı nedir?", back: "Milli birliği sağlamak ve işgallere karşı direnişi örgütlemek" },
    { front: "Misak-ı Milli kararları hangi mecliste kabul edilmiştir?", back: "Son Osmanlı Mebusan Meclisi" },
    { front: "I. İnönü Muharebesi'nin siyasi sonuçlarından biri nedir?", back: "TBMM'nin ilk anayasasının kabulü" },
    { front: "Sakarya Meydan Muharebesi'nden sonra Mustafa Kemal'e verilen unvanlar nelerdir?", back: "Gazilik ve Mareşallik" },
    { front: "Saltanat hangi tarihte kaldırılmıştır?", back: "1 Kasım 1922" },
    { front: "Cumhuriyet'in ilanından sonraki ilk inkılaplardan biri hangisidir?", back: "Halifeliğin kaldırılması (1924)" },
    { front: "Yurtta sulh, cihanda sulh sözü ne anlama gelir?", back: "Ülke içinde ve dünyada barışı esas almak" },
    { front: "Türkiye Milletler Cemiyeti'ne hangi yıl üye olmuştur?", back: "1932" },
    { front: "Montrö Boğazlar Sözleşmesi'nin önemi nedir?", back: "Boğazlar üzerinde Türk egemenliğinin sağlanması" },
  ];

  var lgsDinKulturuCards = [
    { front: "İslam'da ibadetlerin temel amacı nedir?", back: "Allah'a kulluk etmek" },
    { front: "Vicdan özgürlüğü ne anlama gelir?", back: "Kişinin inanç ve düşüncelerini özgürce yaşayabilmesi" },
    { front: "Veda Hutbesi'nde vurgulanan temel değerlerden biri nedir?", back: "İnsan hakları ve eşitlik" },
    { front: "Dinin toplumsal birlik açısından önemi nedir?", back: "Ortak değerler etrafında toplumu bir araya getirmesi" },
  ];

  var lgsIngilizceCards = [
    { front: "I am going to... kalıbı ne için kullanılır?", back: "Gelecekteki bir plandan bahsetmek için" },
    { front: "Have you ever...? kalıbı hangi zamanla ilgilidir?", back: "Present Perfect Tense, geçmiş deneyim sormak için" },
    { front: "Should kelimesi ne için kullanılır?", back: "Tavsiye vermek için" },
    { front: "If I were you... ifadesi ne anlama gelir?", back: "Senin yerinde olsam..." }
  ];

  var yksTurkceCards = [
    { front: "Sözcükte genel-özel anlam ne demektir?", back: "Bir sözcüğün diğerinden daha geniş veya dar anlamlı olması" },
    { front: "Anlam daralması ile anlam genişlemesi neyi ifade eder?", back: "Bir sözcüğün zamanla anlamının daralması veya genişlemesini" },
    { front: "Gereksiz yardımcı fiil kullanımı hangi tür hataya girer?", back: "Anlatım bozukluğu" },
    { front: "Cümlede öznellik hangi ögelerle anlaşılır?", back: "Kişisel görüş bildiren sözcük ve ifadelerle" },
    { front: "Deneme türü nedir?", back: "Yazarın bir konudaki görüşlerini kesin yargıya varmadan anlattığı yazı türü" },
    { front: "Makale türü nedir?", back: "Bilgi vermek veya görüş bildirmek için kesin yargılar içeren yazı türü" },
    { front: "Türemiş sözcük nedir?", back: "Kök veya gövdeye yapım eki alarak yeni anlam kazanan sözcük" },
    { front: "Gözlük sözcüğü hangi ek türünü almıştır?", back: "Yapım eki" },
    { front: "Zarf tümleci cümlede neyi bildirir?", back: "Zaman, durum, yer-yön gibi anlamları" },
    { front: "Giriş-gelişme-sonuç yapısı hangi tür yazılarda görülür?", back: "Kompozisyon türü yazılarda" },
  ];

  var yksMatematikCards = [
    { front: "Birebir (injektif) fonksiyon ne demektir?", back: "Her elemanın görüntüsünün farklı olduğu fonksiyon" },
    { front: "Örten (sürjektif) fonksiyon ne demektir?", back: "Değer kümesindeki her elemanın bir görüntü olduğu fonksiyon" },
    { front: "Bir dizinin limiti sabit bir değere yaklaşıyorsa buna ne denir?", back: "Yakınsak dizi" },
    { front: "Zincir kuralı ne zaman kullanılır?", back: "Bileşke fonksiyonların türevini alırken" },
    { front: "Belirsiz integralde sonuca neden +C eklenir?", back: "Sabitin türevi sıfır olduğu için sonsuz çözüm olabileceğinden" },
    { front: "İki doğrunun paralel olması ne anlama gelir?", back: "Eğimlerinin eşit olması" },
    { front: "İki doğrunun dik olması ne anlama gelir?", back: "Eğimlerinin çarpımının -1 olması" },
    { front: "Koşullu olasılık ne demektir?", back: "Bir olayın, başka bir olay gerçekleştiği bilindiğinde olma olasılığı" },
    { front: "İki vektörün skaler (nokta) çarpımı ne verir?", back: "Bir sayı (skaler değer)" },
    { front: "Karmaşık sayılarda bir sayının eşleniği nasıl bulunur?", back: "Sanal kısmın işareti değiştirilerek" },
    { front: "Birim çember neyi ifade eder?", back: "Yarıçapı 1 olan, merkezi orijinde olan çember" },
    { front: "İntegralin geometrik anlamı nedir?", back: "Bir fonksiyonun grafiği ile x ekseni arasındaki alan" },
  ];

  var yksFizikCards = [
    { front: "Kapalı bir sistemde enerjinin korunumu ilkesi neyi ifade eder?", back: "Toplam enerjinin sabit kaldığını" },
    { front: "Basit harmonik hareket örneği nedir?", back: "Sarkacın salınımı, yayın titreşimi" },
    { front: "Elektrik yükleri arasındaki kuvveti hesaplayan yasa hangisidir?", back: "Coulomb Yasası" },
    { front: "Manyetik alan içinde hareket eden yüklü parçacığa etki eden kuvvete ne denir?", back: "Lorentz kuvveti" },
  ];

  var yksKimyaCards = [
    { front: "Kimyasal tepkimelerde kütlenin korunumu yasasını kim ortaya koymuştur?", back: "Lavoisier" },
    { front: "Gazların basınç-hacim ilişkisini açıklayan yasa hangisidir?", back: "Boyle Yasası" },
    { front: "Derişim arttıkça tepkime hızı genellikle nasıl değişir?", back: "Artar" },
    { front: "Elektrokimyasal hücrelerde anot neresidir?", back: "Yükseltgenmenin (oksidasyonun) gerçekleştiği elektrot" },
  ];

  var yksBiyolojiCards = [
    { front: "Ekolojide besin zinciri nedir?", back: "Canlılar arasındaki beslenme ilişkilerinin sıralı gösterimi" },
    { front: "Homeostazi hangi sistemler tarafından sağlanır?", back: "Sinir ve endokrin (hormon) sistemleri" },
    { front: "Genetik çeşitliliğin kaynaklarından biri nedir?", back: "Mutasyon" },
    { front: "Bitkilerde gaz alışverişi hangi yapı ile gerçekleşir?", back: "Stoma (gözenek)" },
  ];

  var yksTarihCografyaCards = [
    { front: "Osmanlı Devleti'nde tımar sistemi neye dayanır?", back: "Toprak gelirinin hizmet karşılığı dağıtılmasına" },
    { front: "Sanayi Devrimi hangi ülkede başlamıştır?", back: "İngiltere" },
    { front: "Fransız İhtilali'nin dünya tarihine en önemli katkısı nedir?", back: "Milliyetçilik, özgürlük, eşitlik fikirlerinin yayılması" },
    { front: "I. Dünya Savaşı sonunda Osmanlı'yı bölen antlaşma hangisidir?", back: "Sevr Antlaşması" },
    { front: "Türkiye'nin coğrafi konumu hangi iki kıta arasında köprü oluşturur?", back: "Asya ve Avrupa" },
    { front: "Türkiye'de nüfusun en yoğun olduğu bölge hangisidir?", back: "Marmara Bölgesi" },
    { front: "Türkiye'de en fazla yağış alan bölge hangisidir?", back: "Karadeniz Bölgesi" },
    { front: "İklim ile bitki örtüsü arasındaki ilişki nasıldır?", back: "İklim koşulları bitki örtüsünü doğrudan belirler" },
    { front: "Ekonomik coğrafyada birincil sektör hangi faaliyetleri kapsar?", back: "Tarım, hayvancılık, madencilik gibi faaliyetler" },
    { front: "Nüfus piramidi neyi gösterir?", back: "Bir ülkenin yaş ve cinsiyete göre nüfus dağılımını" },
  ];

  var yksFelsefeCards = [
    { front: "Bilgi felsefesine ne denir?", back: "Epistemoloji" },
    { front: "Varlık felsefesine ne denir?", back: "Ontoloji" },
    { front: "Ahlak felsefesine ne denir?", back: "Etik" },
    { front: "Sokrates'in felsefe yöntemine ne denir?", back: "Diyalektik (soru-cevap) yöntemi" },
    { front: "Platon'un ideal devlet anlayışını anlattığı eseri nedir?", back: "Devlet (Politeia)" },
    { front: "Aristoteles'e göre insanın mutluluğa ulaşma amacına ne denir?", back: "Eudaimonia" }
  ];

  var kpssGenelCografyaCards = [
    { front: "Türkiye'nin yüzölçümü yaklaşık kaç km karedir?", back: "783.000 km²" },
    { front: "Türkiye'nin en yüksek dağı hangisidir?", back: "Ağrı Dağı (5137 m)" },
    { front: "Türkiye'nin en uzun nehri hangisidir?", back: "Kızılırmak" },
    { front: "Türkiye'nin en büyük gölü hangisidir?", back: "Van Gölü" },
    { front: "Türkiye kaç coğrafi bölgeye ayrılır?", back: "7" },
    { front: "Türkiye'de nüfusu en fazla olan il hangisidir?", back: "İstanbul" },
    { front: "Türkiye'nin başkenti neresidir?", back: "Ankara" },
    { front: "Türkiye'yi çevreleyen denizler hangileridir?", back: "Karadeniz, Ege Denizi, Akdeniz, Marmara Denizi" },
    { front: "Türkiye'nin kaç komşu ülkesi vardır?", back: "8" },
    { front: "Türkiye'de en fazla zeytin üretimi hangi bölgede yapılır?", back: "Ege Bölgesi" },
    { front: "Türkiye'de nüfus yoğunluğunun en az olduğu bölge hangisidir?", back: "Doğu Anadolu Bölgesi" },
    { front: "İstanbul ve Çanakkale boğazları hangi denizleri birbirine bağlar?", back: "Karadeniz'i Ege ve Akdeniz'e bağlar" },
    { front: "Türkiye'de sanayinin en yoğun olduğu bölge hangisidir?", back: "Marmara Bölgesi" },
    { front: "Fırat ve Dicle nehirleri nereye dökülür?", back: "Basra Körfezi" },
    { front: "Türkiye'de kış turizminin geliştiği bölgelere örnek nedir?", back: "Doğu Anadolu ve Karadeniz bölgeleri" },
    { front: "Türkiye'nin en büyük adası hangisidir?", back: "Gökçeada" },
    { front: "Türkiye'nin en kalabalık ikinci ili hangisidir?", back: "Ankara" },
    { front: "Türkiye'de en fazla fındık üretimi hangi bölgede yapılır?", back: "Karadeniz Bölgesi" },
    { front: "Güneydoğu Anadolu Projesi'nin (GAP) temel amacı nedir?", back: "Bölgenin sulama ve enerji potansiyelini geliştirmek" },
    { front: "Türkiye'de deprem riski en yüksek fay hattı hangisidir?", back: "Kuzey Anadolu Fay Hattı" },
    { front: "Türkiye'nin komşu ülkelerinden en uzun sınırı hangisiyle vardır?", back: "Suriye" },
    { front: "Marmara Bölgesi'nin Türkiye ekonomisindeki önemi nedir?", back: "Sanayi ve ticaretin en yoğun olduğu bölge olması" },
    { front: "Ege Bölgesi'nde yaygın olarak yetiştirilen tarım ürünlerine örnek nedir?", back: "Zeytin, incir, üzüm, pamuk" },
    { front: "Türkiye'de kaç tane büyükşehir belediyesi vardır?", back: "30" },
    { front: "Dünyanın en uzun nehri hangisidir?", back: "Nil Nehri" },
    { front: "Dünyanın en yüksek dağı hangisidir?", back: "Everest" },
    { front: "Dünyanın en büyük çölü hangisidir?", back: "Sahra Çölü" },
    { front: "Dünyanın en büyük adası hangisidir?", back: "Grönland" },
    { front: "Ekvator hangi kıtalardan geçer?", back: "Afrika, Güney Amerika ve Asya (Endonezya)" },
    { front: "Dünyada en fazla nüfusa sahip ülke hangisidir?", back: "Hindistan" },
    { front: "Dünyanın yedi kıtası hangileridir?", back: "Asya, Afrika, Kuzey Amerika, Güney Amerika, Avrupa, Okyanusya, Antarktika" },
    { front: "Akdeniz iklimi hangi mevsimde yağışlıdır?", back: "Kış" },
    { front: "Karasal iklimin özelliği nedir?", back: "Yazlar sıcak-kurak, kışlar soğuk-kar yağışlıdır; sıcaklık farkı fazladır" },
    { front: "Türkiye'de nüfus artış hızının en yüksek olduğu bölge hangisidir?", back: "Güneydoğu Anadolu Bölgesi" },
    { front: "Türkiye'de kırsal nüfusun en yoğun olduğu bölgelerden biri hangisidir?", back: "Karadeniz Bölgesi" },
    { front: "Bir yerin matematik konumu neyi ifade eder?", back: "Enlem ve boylam derecelerine göre yerini" },
    { front: "Türkiye hangi enlemler arasında yer alır?", back: "36-42 derece kuzey enlemleri" },
    { front: "Türkiye hangi boylamlar arasında yer alır?", back: "26-45 derece doğu boylamları" },
    { front: "Türkiye'nin üç tarafı denizlerle çevrili olduğu için hangi iklim tiplerinin etkisi görülür?", back: "Karadeniz, Akdeniz ve Ege (geçiş) iklimleri gibi kıyı iklimleri" },
    { front: "Türkiye'de kaç il vardır?", back: "81" }
  ];

  var kpssGenelVatandaslikAnayasaCards = [
    { front: "Türkiye Cumhuriyeti Anayasası'na göre egemenlik kime aittir?", back: "Millete, kayıtsız şartsız" },
    { front: "Yasama yetkisi hangi organa aittir?", back: "TBMM" },
    { front: "Yürütme yetkisi kime aittir?", back: "Cumhurbaşkanına" },
    { front: "Yargı yetkisi kimin adına kullanılır?", back: "Türk Milleti adına bağımsız mahkemelerce" },
    { front: "TBMM kaç milletvekilinden oluşur?", back: "600" },
    { front: "Milletvekili seçilme yaşı kaçtır?", back: "18" },
    { front: "Cumhurbaşkanı seçilme yaşı kaçtır?", back: "40" },
    { front: "Anayasa Mahkemesi'nin temel görevi nedir?", back: "Kanunların anayasaya uygunluğunu denetlemek" },
    { front: "Türkiye'de yerel yönetimlere örnek nedir?", back: "Belediye, il özel idaresi, köy" },
    { front: "Seçme hakkı hangi yaşta kazanılır?", back: "18" },
    { front: "Türkiye'de kuvvetler ayrılığı ilkesi hangi organlar arasındadır?", back: "Yasama, yürütme, yargı" },
    { front: "Laiklik devletin hangi temel niteliğidir?", back: "Din ve devlet işlerinin ayrılığını ifade eden niteliği" },
    { front: "Anayasa'nın değiştirilemez maddeleri hangi konuları kapsar?", back: "Devletin şekli (Cumhuriyet), bayrak, dil, başkent gibi temel nitelikler" },
    { front: "Türkiye'nin resmi dili nedir?", back: "Türkçe" },
    { front: "Anayasa değişikliği teklifi için TBMM'de en az kaçta kaç çoğunluk gerekir?", back: "Üçte biri (1/3)" },
    { front: "Yürürlükteki Türkiye Cumhuriyeti Anayasası hangi yıl kabul edilmiştir?", back: "1982" },
    { front: "Anayasa'ya göre devletin şekli nedir?", back: "Cumhuriyet" },
    { front: "Cumhurbaşkanının görev süresi kaç yıldır?", back: "5 yıl" },
    { front: "Bir kişi en fazla kaç kez cumhurbaşkanı seçilebilir?", back: "2 kez" },
    { front: "TBMM'nin görev süresi kaç yıldır?", back: "5 yıl" },
    { front: "Yargıtay'ın görevi nedir?", back: "Adli yargı kararlarını denetlemek (temyiz mercii)" },
    { front: "Danıştay'ın görevi nedir?", back: "İdari yargı kararlarını denetlemek" },
    { front: "Sayıştay'ın görevi nedir?", back: "Kamu kurumlarının gelir-gider hesaplarını denetlemek" },
    { front: "Hakimler ve Savcılar Kurulu'nun görevi nedir?", back: "Hakim ve savcıların atama, denetim ve disiplin işlerini yürütmek" },
    { front: "Anayasa'nın ilk dört maddesi neyi düzenler?", back: "Devletin temel nitelikleri, şekli, bütünlüğü, bayrağı, dili, başkenti" },
    { front: "Cumhurbaşkanı yardımcısı kim tarafından atanır?", back: "Cumhurbaşkanı tarafından" },
    { front: "İl düzeyinde devletin en yetkili temsilcisi kimdir?", back: "Vali" },
    { front: "İlçe düzeyinde devletin en yetkili temsilcisi kimdir?", back: "Kaymakam" },
    { front: "Belediye başkanları kaç yılda bir seçilir?", back: "5 yılda bir" },
    { front: "Muhtarlık hangi yönetim biriminin başıdır?", back: "Köy veya mahalle" },
    { front: "Anayasa Mahkemesi üyeleri kim tarafından seçilir?", back: "TBMM ve Cumhurbaşkanı tarafından" },
    { front: "Bireysel başvuru hakkı hangi mahkemeye yapılır?", back: "Anayasa Mahkemesi" },
    { front: "Vatandaşlık hakkı nasıl kazanılır?", back: "Doğumla veya sonradan (evlilik, izin gibi yollarla) kazanılabilir" },
    { front: "Türkiye'de zorunlu eğitim kaç yıldır?", back: "12 yıl" },
    { front: "Dilekçe hakkı nedir?", back: "Vatandaşların istek ve şikayetlerini yetkili makamlara yazılı olarak bildirme hakkı" },
    { front: "Bilgi edinme hakkı ne anlama gelir?", back: "Vatandaşların kamu kurumlarından bilgi talep edebilme hakkı" },
    { front: "Grev hakkı hangi temel hak kategorisine girer?", back: "Sosyal ve ekonomik haklar" },
    { front: "Anayasa değişikliği hangi durumda halkoyuna (referandum) sunulur?", back: "TBMM'de yeterli çoğunluk sağlanamazsa veya Cumhurbaşkanı isterse" },
    { front: "Devletin sosyal hukuk devleti olması ne anlama gelir?", back: "Devletin vatandaşlarının sosyal ve ekonomik refahını gözetmesi" },
    { front: "Türkiye'de en yeni idari birim olan büyükşehir belediyesi sistemine göre il ile ilçe arasındaki yönetim farkı nedir?", back: "Büyükşehirlerde ilçe belediyeleri de büyükşehir belediyesine bağlı olarak hizmet verir" }
  ];

  var kpssGenelGenelKulturGuncelCards = [
    { front: "Birleşmiş Milletler'in merkezi neresidir?", back: "New York" },
    { front: "Türkiye Birleşmiş Milletler'e hangi yıl üye olmuştur?", back: "1945" },
    { front: "NATO'nun açılımı nedir?", back: "Kuzey Atlantik Antlaşması Örgütü" },
    { front: "Avrupa Birliği'nin ortak para birimi nedir?", back: "Euro" },
    { front: "Dünyanın en kalabalık kıtası hangisidir?", back: "Asya" },
    { front: "Dünyanın en büyük okyanusu hangisidir?", back: "Büyük Okyanus (Pasifik)" },
    { front: "Türkiye'nin resmi para birimi nedir?", back: "Türk Lirası" },
    { front: "Nobel barış ödülü dışındaki Nobel ödülleri hangi ülkede verilir?", back: "İsveç" },
    { front: "Dünya Sağlık Örgütü'nün kısaltması nedir?", back: "DSÖ (WHO)" },
    { front: "Olimpiyat Oyunları kaç yılda bir düzenlenir?", back: "4 yılda bir" },
    { front: "Dünya Ticaret Örgütü'nün kısaltması nedir?", back: "DTÖ (WTO)" },
    { front: "UNESCO'nun açılımı nedir?", back: "Birleşmiş Milletler Eğitim, Bilim ve Kültür Örgütü" },
    { front: "UNICEF hangi alanda çalışan bir kuruluştur?", back: "Çocuk hakları ve refahı" },
    { front: "G20 nedir?", back: "Dünyanın en büyük 20 ekonomisinin oluşturduğu forum" },
    { front: "Türkiye'nin AB'ye adaylık süreci hangi yıl resmen başlamıştır?", back: "1999 (Helsinki Zirvesi)" },
    { front: "Dünyada anadili olarak en çok konuşulan dil hangisidir?", back: "Mandarin Çincesi" },
    { front: "En çok ülkede resmi dil olarak konuşulan dil hangisidir?", back: "İngilizce" },
    { front: "Kyoto Protokolü hangi konuda imzalanmıştır?", back: "İklim değişikliği ve sera gazı emisyonlarının azaltılması" },
    { front: "Paris İklim Anlaşması hangi yıl imzalanmıştır?", back: "2015" },
    { front: "Dünya Bankası'nın temel amacı nedir?", back: "Gelişmekte olan ülkelere kalkınma için finansman sağlamak" },
    { front: "IMF'nin (Uluslararası Para Fonu) temel görevi nedir?", back: "Küresel parasal işbirliğini ve finansal istikrarı desteklemek" },
    { front: "İnsan Hakları Evrensel Beyannamesi hangi yıl kabul edilmiştir?", back: "1948" },
    { front: "Bilgisayarların temel işlem biriminin kısaltması nedir?", back: "CPU (İşlemci)" },
    { front: "İnternetin öncüsü kabul edilen ağın adı nedir?", back: "ARPANET" },
    { front: "Yapay zekanın yaygın kullanıldığı alanlara örnek nedir?", back: "Sağlık, eğitim, otomasyon gibi alanlar" },
    { front: "Küresel ısınmanın başlıca nedeni nedir?", back: "Sera gazı emisyonlarının atmosferde birikmesi" },
    { front: "Yenilenebilir enerji kaynaklarına örnek nedir?", back: "Güneş, rüzgar, hidroelektrik enerjisi" },
    { front: "Dünya Sağlık Örgütü'nün merkezi neresidir?", back: "Cenevre (İsviçre)" },
    { front: "Türkiye'nin ilk yerli otomobilinin adı nedir?", back: "Togg" },
    { front: "Türk Hava Yolları hangi yıl kurulmuştur?", back: "1933" },
    { front: "Cumhuriyet döneminin ilk yerli uçak fabrikası hangi şehirde kurulmuştur?", back: "Kayseri" },
    { front: "Türkiye'nin uzay çalışmaları hangi kurum tarafından yürütülür?", back: "TÜBİTAK Uzay" },
    { front: "Türkiye'nin ilk astronotu kimdir?", back: "Alper Gezeravcı" },
    { front: "Nobel Ödülleri hangi alanlarda verilir?", back: "Fizik, kimya, tıp, edebiyat, barış ve ekonomi alanlarında" },
    { front: "Enflasyon ne anlama gelir?", back: "Genel fiyat düzeyinin sürekli artması" },
    { front: "Döviz kuru nedir?", back: "Bir ülke parasının başka bir ülke parası karşısındaki değeri" },
    { front: "GSYH (Gayri Safi Yurtiçi Hasıla) neyi ifade eder?", back: "Bir ülkede belirli bir dönemde üretilen mal ve hizmetlerin toplam parasal değeri" },
    { front: "Merkez bankalarının temel görevlerinden biri nedir?", back: "Fiyat istikrarını sağlamak ve para politikasını yürütmek" },
    { front: "Dünyada en fazla altın rezervine sahip kurum türü hangisidir?", back: "Merkez bankaları" },
    { front: "Türkiye'nin ilk yapay uydusu hangisidir?", back: "Türksat 1B (ilk aktif Türk uydusu)" }
  ];

  var kpssGenelTurkceGenelYetenekCards = [
    { front: "KPSS Türkçe testinde en sık sorulan konulardan biri hangisidir?", back: "Paragraf (anlam bilgisi)" },
    { front: "Eş anlamlılık ile yakın anlamlılık arasındaki fark nedir?", back: "Eş anlamlıda anlam birebir aynı, yakın anlamlıda benzer ama tam aynı değildir" },
    { front: "Anlatım bozukluğu nedir?", back: "Cümlenin anlam veya yapı yönünden hatalı kurulması" },
    { front: "İki nokta (:) işareti ne zaman kullanılır?", back: "Örnek verilecek veya açıklama yapılacak cümlelerden önce" },
    { front: "Kesme işareti özel isimlere gelen eklerde nasıl kullanılır?", back: "Özel isim ile eki ayırmak için konur" },
    { front: "Paragrafta giriş cümlesi hangi özelliği taşımaz?", back: "Kendinden önce bir cümle gerektirme özelliğini" },
    { front: "Yapım eki ile çekim eki arasındaki fark nedir?", back: "Yapım eki yeni sözcük türetir, çekim eki sözcüğün görevini değiştirir" },
    { front: "de/da bağlacı nasıl yazılır?", back: "Ayrı yazılır" },
    { front: "-de/-da hâl eki nasıl yazılır?", back: "Bitişik yazılır" },
    { front: "Bir cümleden birden fazla anlam çıkabiliyorsa buna ne denir?", back: "Anlam belirsizliği (kapalılık)" },
    { front: "Sözcükte ünlü daralması nedir?", back: "Geniş ünlülerin (a, e) bazı eklerle daralarak (ı, i, u, ü) söylenmesi" },
    { front: "Bekliyor sözcüğünde hangi ses olayı görülür?", back: "Ünlü daralması" },
    { front: "Büyük ünlü uyumu nedir?", back: "Bir sözcükteki ünlülerin kalınlık-incelik bakımından uyumlu olması" },
    { front: "Küçük ünlü uyumu nedir?", back: "Ünlülerin düzlük-yuvarlaklık bakımından uyumlu olması" },
    { front: "Kitaplık sözcüğü büyük ünlü uyumuna uyar mı?", back: "Evet" },
    { front: "Ünsüz yumuşaması hangi seslerde görülür?", back: "P, ç, t, k seslerinin b, c, d, g/ğ'ye dönüşmesinde" },
    { front: "Kitap sözcüğüne -ı eki gelince ünsüz yumuşamasıyla nasıl olur?", back: "Kitabı" },
    { front: "Ünsüz benzeşmesi (sertleşmesi) nedir?", back: "Sert ünsüzden sonra gelen yumuşak ünsüzün sertleşmesi" },
    { front: "Kitap sözcüğüne -cı eki gelince ünsüz benzeşmesiyle nasıl olur?", back: "Kitapçı" },
    { front: "Özel isimler nasıl yazılır?", back: "Büyük harfle başlar" },
    { front: "Cümlede ki bağlacı nasıl yazılır?", back: "Genellikle ayrı yazılır (sanki, halbuki gibi kalıplaşmışlar hariç)" },
    { front: "-ki aitlik eki nasıl yazılır?", back: "Bitişik yazılır" },
    { front: "Pekiştirmeli sıfatlara örnek ver.", back: "Masmavi, bembeyaz, güpegündüz" },
    { front: "İkileme nedir?", back: "Anlamı pekiştirmek için aynı veya yakın anlamlı kelimelerin tekrarlanması" },
    { front: "Ağır ağır ifadesi hangi tür ikilemedir?", back: "Aynı kelimenin tekrarıyla oluşan ikileme" },
    { front: "Cümlede edat (ilgeç) nedir?", back: "Tek başına anlamı olmayan, başka kelimelerle anlam kazanan kelime" },
    { front: "Gibi, kadar, için, ile kelimeleri hangi kelime türüdür?", back: "Edat (ilgeç)" },
    { front: "Ünlem nedir?", back: "Duygu ve heyecanı ifade eden kelime türü" },
    { front: "Paragrafta sonuç cümlesi nasıl tanınır?", back: "Konuyu toparlayan, genelde paragrafın en sonunda yer alan cümle" },
    { front: "Bir paragrafın ikiye bölünebilmesi için gereken şart nedir?", back: "Paragrafta konu değişikliğinin olması" },
    { front: "Öznel cümleyi ayırt etmek için nelere bakılır?", back: "Sanırım, bence gibi kişisel yargı bildiren ifadelere" },
    { front: "Bir metnin üslubu nedir?", back: "Yazarın kendine özgü anlatım biçimi" },
    { front: "Tırnak işareti ne zaman kullanılır?", back: "Alıntı sözleri ve özellikle vurgulanmak istenen sözleri belirtmek için" },
    { front: "Kesme işareti özel isimler dışında hangi durumda kullanılır?", back: "Bazı kısaltmalara getirilen eklerde" },
    { front: "Yanlış mı yalnış mı doğru yazımdır?", back: "Yanlış" },
    { front: "Herşey mi her şey mi doğru yazımdır?", back: "Her şey (ayrı yazılır)" },
    { front: "Hiçbir kelimesi nasıl yazılır?", back: "Bitişik yazılır" },
    { front: "Cümlede özne-yüklem uyumsuzluğu nasıl bir anlatım bozukluğudur?", back: "Yapısal (dil bilgisel) anlatım bozukluğu" },
    { front: "Bir cümlede gereksiz yere birden fazla olumsuzluk eki kullanılması neye yol açar?", back: "Anlam karmaşasına veya anlatım bozukluğuna" },
    { front: "Sözcükte yansıma kelime nedir?", back: "Doğadaki bir sesin taklit edilmesiyle oluşan kelime (örnek: şırıl şırıl)" }
  ];

  var kpssGenelMatematikCards = [
    { front: "15 + 27 kaç eder?", back: "42" },
    { front: "84 - 39 kaç eder?", back: "45" },
    { front: "12 x 15 kaç eder?", back: "180" },
    { front: "144 ÷ 12 kaç eder?", back: "12" },
    { front: "2 üzeri 5 kaçtır?", back: "32" },
    { front: "Karekök 81 kaçtır?", back: "9" },
    { front: "Bir sayının %25'i 20 ise sayının kendisi kaçtır?", back: "80" },
    { front: "3/4 ile 2/3 kesirlerinin çarpımı kaçtır?", back: "1/2" },
    { front: "Bir üçgenin iç açıları toplamı kaç derecedir?", back: "180" },
    { front: "Alanı 48 cm² olan bir dikdörtgenin kısa kenarı 6 cm ise uzun kenarı kaç cm dir?", back: "8" },
    { front: "5 işçi bir işi 12 günde bitiriyorsa 10 işçi aynı işi kaç günde bitirir?", back: "6 gün" },
    { front: "Saatte 60 km hızla giden bir araç 3 saatte kaç km yol alır?", back: "180 km" },
    { front: "Alış fiyatı 200 TL olan bir mal %20 kârla satılırsa satış fiyatı kaç TL olur?", back: "240 TL" },
    { front: "1'den 10'a kadar olan sayıların toplamı kaçtır?", back: "55" },
    { front: "Ardışık üç doğal sayının toplamı 30 ise ortadaki sayı kaçtır?", back: "10" },
    { front: "Bir sınıftaki öğrencilerin %60'ı kız ve kız öğrenci sayısı 18 ise sınıf mevcudu kaçtır?", back: "30" },
    { front: "8 ile 12'nin en küçük ortak katı (EKOK) kaçtır?", back: "24" },
    { front: "18 ile 24'ün en büyük ortak böleni (EBOB) kaçtır?", back: "6" },
    { front: "Bir zarın atılmasında tek sayı gelme olasılığı kaçtır?", back: "1/2" },
    { front: "4 farklı kitap bir rafa kaç farklı şekilde dizilebilir?", back: "24 (4 faktöriyel)" },
    { front: "Bir havuzu bir musluk 6 saatte, başka bir musluk 3 saatte dolduruyor. İkisi birlikte açılırsa havuz kaç saatte dolar?", back: "2 saat" },
    { front: "45 yaşındaki bir kişi, 15 yaşındaki çocuğunun kaç katı yaşındadır?", back: "3 katı" },
    { front: "Bir sayının 3 katının 5 fazlası 20 ise sayı kaçtır?", back: "5" },
    { front: "%10 zam gören 100 TL'lik bir ürün kaç TL olur?", back: "110 TL" },
    { front: "Bir çemberin çapı 10 cm ise yarıçapı kaç cm dir?", back: "5 cm" },
    { front: "İki basamaklı en büyük çift sayı kaçtır?", back: "98" },
    { front: "7'nin katı olan iki basamaklı en küçük sayı kaçtır?", back: "14" },
    { front: "240 km yolu 4 saatte alan bir otobüsün ortalama hızı kaç km/saattir?", back: "60 km/saat" },
    { front: "5 faktöriyel (5!) kaçtır?", back: "120" },
    { front: "Karesi 49 olan sayı kaç olabilir?", back: "7 veya -7" },
    { front: "Rasyonel sayı ile irrasyonel sayı arasındaki fark nedir?", back: "Rasyonel sayı iki tam sayının oranı şeklinde yazılabilir, irrasyonel yazılamaz" },
    { front: "Bir üçgende iki açı 50 ve 60 derece ise üçüncü açı kaç derecedir?", back: "70 derece" },
    { front: "Negatif bir sayı ile pozitif bir sayının çarpımı nasıl bir sayı verir?", back: "Negatif" },
    { front: "Bir sınıfta 20 erkek, 15 kız öğrenci varsa kız öğrencilerin sınıfa oranı kaçtır?", back: "3/7" },
    { front: "100 sayısının kaç tane asal böleni vardır?", back: "2 (2 ve 5)" },
    { front: "2, 4, 8, 16 dizisinde bir sonraki terim kaçtır?", back: "32" },
    { front: "Ondalık sayılarda virgülden sonraki ilk basamağa ne denir?", back: "Onda birler basamağı" },
    { front: "Kenarları 3, 4, 5 cm olan üçgen ne tür bir üçgendir?", back: "Dik üçgen" },
    { front: "Bir kap yarısına kadar dolu iken 3 litre su eklenince tam doluyorsa kabın hacmi kaç litredir?", back: "6 litre" },
    { front: "Bileşik faizde ana para zamanla nasıl değişir?", back: "Kazanılan faiz de ana paraya eklenerek büyür" }
  ];

  var decks = {
    "kpss-tarih-2026": { label: "KPSS Tarih 2026", short: "KPSS Tarih 2026", cards: kpssTarihCards },
    "sinif-1-turkce": { label: "1. Sınıf · Türkçe", short: "1. Sınıf · Türkçe", cards: sinif1TurkceCards },
    "sinif-1-matematik": { label: "1. Sınıf · Matematik", short: "1. Sınıf · Matematik", cards: sinif1MatematikCards },
    "sinif-1-hayat-bilgisi": { label: "1. Sınıf · Hayat Bilgisi", short: "1. Sınıf · Hayat Bilgisi", cards: sinif1HayatBilgisiCards },
    "sinif-2-turkce": { label: "2. Sınıf · Türkçe", short: "2. Sınıf · Türkçe", cards: sinif2TurkceCards },
    "sinif-2-matematik": { label: "2. Sınıf · Matematik", short: "2. Sınıf · Matematik", cards: sinif2MatematikCards },
    "sinif-2-hayat-bilgisi": { label: "2. Sınıf · Hayat Bilgisi", short: "2. Sınıf · Hayat Bilgisi", cards: sinif2HayatBilgisiCards },
    "sinif-3-turkce": { label: "3. Sınıf · Türkçe", short: "3. Sınıf · Türkçe", cards: sinif3TurkceCards },
    "sinif-3-matematik": { label: "3. Sınıf · Matematik", short: "3. Sınıf · Matematik", cards: sinif3MatematikCards },
    "sinif-3-fen-bilimleri": { label: "3. Sınıf · Fen Bilimleri", short: "3. Sınıf · Fen Bilimleri", cards: sinif3FenBilimleriCards },
    "sinif-3-sosyal-bilgiler": { label: "3. Sınıf · Sosyal Bilgiler", short: "3. Sınıf · Sosyal Bilgiler", cards: sinif3SosyalBilgilerCards },
    "sinif-4-turkce": { label: "4. Sınıf · Türkçe", short: "4. Sınıf · Türkçe", cards: sinif4TurkceCards },
    "sinif-4-matematik": { label: "4. Sınıf · Matematik", short: "4. Sınıf · Matematik", cards: sinif4MatematikCards },
    "sinif-4-fen-bilimleri": { label: "4. Sınıf · Fen Bilimleri", short: "4. Sınıf · Fen Bilimleri", cards: sinif4FenBilimleriCards },
    "sinif-4-sosyal-bilgiler": { label: "4. Sınıf · Sosyal Bilgiler", short: "4. Sınıf · Sosyal Bilgiler", cards: sinif4SosyalBilgilerCards },
    "sinif-5-turkce": { label: "5. Sınıf · Türkçe", short: "5. Sınıf · Türkçe", cards: sinif5TurkceCards },
    "sinif-5-matematik": { label: "5. Sınıf · Matematik", short: "5. Sınıf · Matematik", cards: sinif5MatematikCards },
    "sinif-5-fen-bilimleri": { label: "5. Sınıf · Fen Bilimleri", short: "5. Sınıf · Fen Bilimleri", cards: sinif5FenBilimleriCards },
    "sinif-5-sosyal-bilgiler": { label: "5. Sınıf · Sosyal Bilgiler", short: "5. Sınıf · Sosyal Bilgiler", cards: sinif5SosyalBilgilerCards },
    "sinif-5-ingilizce": { label: "5. Sınıf · İngilizce", short: "5. Sınıf · İngilizce", cards: sinif5IngilizceCards },
    "sinif-6-turkce": { label: "6. Sınıf · Türkçe", short: "6. Sınıf · Türkçe", cards: sinif6TurkceCards },
    "sinif-6-matematik": { label: "6. Sınıf · Matematik", short: "6. Sınıf · Matematik", cards: sinif6MatematikCards },
    "sinif-6-fen-bilimleri": { label: "6. Sınıf · Fen Bilimleri", short: "6. Sınıf · Fen Bilimleri", cards: sinif6FenBilimleriCards },
    "sinif-6-sosyal-bilgiler": { label: "6. Sınıf · Sosyal Bilgiler", short: "6. Sınıf · Sosyal Bilgiler", cards: sinif6SosyalBilgilerCards },
    "sinif-6-ingilizce": { label: "6. Sınıf · İngilizce", short: "6. Sınıf · İngilizce", cards: sinif6IngilizceCards },
    "sinif-7-turkce": { label: "7. Sınıf · Türkçe", short: "7. Sınıf · Türkçe", cards: sinif7TurkceCards },
    "sinif-7-matematik": { label: "7. Sınıf · Matematik", short: "7. Sınıf · Matematik", cards: sinif7MatematikCards },
    "sinif-7-fen-bilimleri": { label: "7. Sınıf · Fen Bilimleri", short: "7. Sınıf · Fen Bilimleri", cards: sinif7FenBilimleriCards },
    "sinif-7-sosyal-bilgiler": { label: "7. Sınıf · Sosyal Bilgiler", short: "7. Sınıf · Sosyal Bilgiler", cards: sinif7SosyalBilgilerCards },
    "sinif-7-ingilizce": { label: "7. Sınıf · İngilizce", short: "7. Sınıf · İngilizce", cards: sinif7IngilizceCards },
    "sinif-7-din-kulturu": { label: "7. Sınıf · Din Kültürü", short: "7. Sınıf · Din Kültürü", cards: sinif7DinKulturuCards },
    "sinif-8-turkce": { label: "8. Sınıf · Türkçe", short: "8. Sınıf · Türkçe", cards: sinif8TurkceCards },
    "sinif-8-matematik": { label: "8. Sınıf · Matematik", short: "8. Sınıf · Matematik", cards: sinif8MatematikCards },
    "sinif-8-fen-bilimleri": { label: "8. Sınıf · Fen Bilimleri", short: "8. Sınıf · Fen Bilimleri", cards: sinif8FenBilimleriCards },
    "sinif-8-inkilap-tarihi": { label: "8. Sınıf · T.C. İnkılap Tarihi ve Atatürkçülük", short: "8. Sınıf · T.C. İnkılap Tarihi ve Atatürkçülük", cards: sinif8InkilapTarihiCards },
    "sinif-8-ingilizce": { label: "8. Sınıf · İngilizce", short: "8. Sınıf · İngilizce", cards: sinif8IngilizceCards },
    "sinif-8-din-kulturu": { label: "8. Sınıf · Din Kültürü", short: "8. Sınıf · Din Kültürü", cards: sinif8DinKulturuCards },
    "sinif-9-matematik": { label: "9. Sınıf · Matematik", short: "9. Sınıf · Matematik", cards: sinif9MatematikCards },
    "sinif-9-fizik": { label: "9. Sınıf · Fizik", short: "9. Sınıf · Fizik", cards: sinif9FizikCards },
    "sinif-9-kimya": { label: "9. Sınıf · Kimya", short: "9. Sınıf · Kimya", cards: sinif9KimyaCards },
    "sinif-9-biyoloji": { label: "9. Sınıf · Biyoloji", short: "9. Sınıf · Biyoloji", cards: sinif9BiyolojiCards },
    "sinif-9-tarih": { label: "9. Sınıf · Tarih", short: "9. Sınıf · Tarih", cards: sinif9TarihCards },
    "sinif-9-edebiyat": { label: "9. Sınıf · Türk Dili ve Edebiyatı", short: "9. Sınıf · Türk Dili ve Edebiyatı", cards: sinif9EdebiyatCards },
    "sinif-10-matematik": { label: "10. Sınıf · Matematik", short: "10. Sınıf · Matematik", cards: sinif10MatematikCards },
    "sinif-10-fizik": { label: "10. Sınıf · Fizik", short: "10. Sınıf · Fizik", cards: sinif10FizikCards },
    "sinif-10-kimya": { label: "10. Sınıf · Kimya", short: "10. Sınıf · Kimya", cards: sinif10KimyaCards },
    "sinif-10-biyoloji": { label: "10. Sınıf · Biyoloji", short: "10. Sınıf · Biyoloji", cards: sinif10BiyolojiCards },
    "sinif-10-tarih": { label: "10. Sınıf · Tarih", short: "10. Sınıf · Tarih", cards: sinif10TarihCards },
    "sinif-10-edebiyat": { label: "10. Sınıf · Edebiyat", short: "10. Sınıf · Edebiyat", cards: sinif10EdebiyatCards },
    "sinif-11-matematik": { label: "11. Sınıf · Matematik", short: "11. Sınıf · Matematik", cards: sinif11MatematikCards },
    "sinif-11-fizik": { label: "11. Sınıf · Fizik", short: "11. Sınıf · Fizik", cards: sinif11FizikCards },
    "sinif-11-kimya": { label: "11. Sınıf · Kimya", short: "11. Sınıf · Kimya", cards: sinif11KimyaCards },
    "sinif-11-biyoloji": { label: "11. Sınıf · Biyoloji", short: "11. Sınıf · Biyoloji", cards: sinif11BiyolojiCards },
    "sinif-11-tarih": { label: "11. Sınıf · Tarih", short: "11. Sınıf · Tarih", cards: sinif11TarihCards },
    "sinif-11-edebiyat": { label: "11. Sınıf · Edebiyat", short: "11. Sınıf · Edebiyat", cards: sinif11EdebiyatCards },
    "sinif-12-matematik": { label: "12. Sınıf · Matematik", short: "12. Sınıf · Matematik", cards: sinif12MatematikCards },
    "sinif-12-fizik": { label: "12. Sınıf · Fizik", short: "12. Sınıf · Fizik", cards: sinif12FizikCards },
    "sinif-12-kimya": { label: "12. Sınıf · Kimya", short: "12. Sınıf · Kimya", cards: sinif12KimyaCards },
    "sinif-12-biyoloji": { label: "12. Sınıf · Biyoloji", short: "12. Sınıf · Biyoloji", cards: sinif12BiyolojiCards },
    "sinif-12-tarih": { label: "12. Sınıf · Tarih", short: "12. Sınıf · Tarih", cards: sinif12TarihCards },
    "sinif-12-edebiyat": { label: "12. Sınıf · Edebiyat", short: "12. Sınıf · Edebiyat", cards: sinif12EdebiyatCards },
    "lgs-turkce": { label: "LGS · Türkçe", short: "LGS · Türkçe", cards: lgsTurkceCards },
    "lgs-matematik": { label: "LGS · Matematik", short: "LGS · Matematik", cards: lgsMatematikCards },
    "lgs-fen-bilimleri": { label: "LGS · Fen Bilimleri", short: "LGS · Fen Bilimleri", cards: lgsFenBilimleriCards },
    "lgs-inkilap-tarihi": { label: "LGS · T.C. İnkılap Tarihi ve Atatürkçülük", short: "LGS · T.C. İnkılap Tarihi ve Atatürkçülük", cards: lgsInkilapTarihiCards },
    "lgs-din-kulturu": { label: "LGS · Din Kültürü", short: "LGS · Din Kültürü", cards: lgsDinKulturuCards },
    "lgs-ingilizce": { label: "LGS · İngilizce", short: "LGS · İngilizce", cards: lgsIngilizceCards },
    "yks-turkce": { label: "YKS · Türkçe", short: "YKS · Türkçe", cards: yksTurkceCards },
    "yks-matematik": { label: "YKS · Matematik (TYT/AYT)", short: "YKS · Matematik (TYT/AYT)", cards: yksMatematikCards },
    "yks-fizik": { label: "YKS · Fizik", short: "YKS · Fizik", cards: yksFizikCards },
    "yks-kimya": { label: "YKS · Kimya", short: "YKS · Kimya", cards: yksKimyaCards },
    "yks-biyoloji": { label: "YKS · Biyoloji", short: "YKS · Biyoloji", cards: yksBiyolojiCards },
    "yks-tarih-cografya": { label: "YKS · Tarih ve Coğrafya", short: "YKS · Tarih ve Coğrafya", cards: yksTarihCografyaCards },
    "yks-felsefe": { label: "YKS · Felsefe", short: "YKS · Felsefe", cards: yksFelsefeCards },
    "kpss-genel-turkce": { label: "KPSS Genel Kültür · Türkçe", short: "KPSS Genel Kültür · Türkçe", cards: kpssGenelTurkceGenelYetenekCards },
    "kpss-genel-matematik": { label: "KPSS Genel Kültür · Matematik", short: "KPSS Genel Kültür · Matematik", cards: kpssGenelMatematikCards },
    "kpss-genel-cografya": { label: "KPSS Genel Kültür · Coğrafya", short: "KPSS Genel Kültür · Coğrafya", cards: kpssGenelCografyaCards },
    "kpss-genel-vatandaslik-anayasa": { label: "KPSS Genel Kültür · Vatandaşlık ve Anayasa", short: "KPSS Genel Kültür · Vatandaşlık ve Anayasa", cards: kpssGenelVatandaslikAnayasaCards },
    "kpss-genel-guncel-bilgiler": { label: "KPSS Genel Kültür · Güncel Bilgiler", short: "KPSS Genel Kültür · Güncel Bilgiler", cards: kpssGenelGenelKulturGuncelCards },
    "genel": { label: "Örnek Genel Bilgi", short: "Genel Bilgi", cards: genelCards }
  };
  var deckOrder = [
    "kpss-tarih-2026",
    "sinif-1-turkce",
    "sinif-1-matematik",
    "sinif-1-hayat-bilgisi",
    "sinif-2-turkce",
    "sinif-2-matematik",
    "sinif-2-hayat-bilgisi",
    "sinif-3-turkce",
    "sinif-3-matematik",
    "sinif-3-fen-bilimleri",
    "sinif-3-sosyal-bilgiler",
    "sinif-4-turkce",
    "sinif-4-matematik",
    "sinif-4-fen-bilimleri",
    "sinif-4-sosyal-bilgiler",
    "sinif-5-turkce",
    "sinif-5-matematik",
    "sinif-5-fen-bilimleri",
    "sinif-5-sosyal-bilgiler",
    "sinif-5-ingilizce",
    "sinif-6-turkce",
    "sinif-6-matematik",
    "sinif-6-fen-bilimleri",
    "sinif-6-sosyal-bilgiler",
    "sinif-6-ingilizce",
    "sinif-7-turkce",
    "sinif-7-matematik",
    "sinif-7-fen-bilimleri",
    "sinif-7-sosyal-bilgiler",
    "sinif-7-ingilizce",
    "sinif-7-din-kulturu",
    "sinif-8-turkce",
    "sinif-8-matematik",
    "sinif-8-fen-bilimleri",
    "sinif-8-inkilap-tarihi",
    "sinif-8-ingilizce",
    "sinif-8-din-kulturu",
    "sinif-9-matematik",
    "sinif-9-fizik",
    "sinif-9-kimya",
    "sinif-9-biyoloji",
    "sinif-9-tarih",
    "sinif-9-edebiyat",
    "sinif-10-matematik",
    "sinif-10-fizik",
    "sinif-10-kimya",
    "sinif-10-biyoloji",
    "sinif-10-tarih",
    "sinif-10-edebiyat",
    "sinif-11-matematik",
    "sinif-11-fizik",
    "sinif-11-kimya",
    "sinif-11-biyoloji",
    "sinif-11-tarih",
    "sinif-11-edebiyat",
    "sinif-12-matematik",
    "sinif-12-fizik",
    "sinif-12-kimya",
    "sinif-12-biyoloji",
    "sinif-12-tarih",
    "sinif-12-edebiyat",
    "lgs-turkce",
    "lgs-matematik",
    "lgs-fen-bilimleri",
    "lgs-inkilap-tarihi",
    "lgs-din-kulturu",
    "lgs-ingilizce",
    "yks-turkce",
    "yks-matematik",
    "yks-fizik",
    "yks-kimya",
    "yks-biyoloji",
    "yks-tarih-cografya",
    "yks-felsefe",
    "kpss-genel-turkce",
    "kpss-genel-matematik",
    "kpss-genel-cografya",
    "kpss-genel-vatandaslik-anayasa",
    "kpss-genel-guncel-bilgiler",
    "genel"
  ];

  function cardsKey(deckId) { return CARDS_KEY_PREFIX + deckId; }

  function loadCards(deckId) {
    try {
      var raw = localStorage.getItem(cardsKey(deckId));
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return decks[deckId].cards.slice();
  }

  function saveCards(deckId, list) {
    try { localStorage.setItem(cardsKey(deckId), JSON.stringify(list)); } catch (e) {}
  }

  function loadActiveDeckId() {
    try {
      var d = localStorage.getItem(ACTIVE_DECK_KEY);
      if (d && decks[d]) return d;
    } catch (e) {}
    return deckOrder[0];
  }

  function saveActiveDeckId(deckId) {
    try { localStorage.setItem(ACTIVE_DECK_KEY, deckId); } catch (e) {}
  }

  /* ---------- Flashcards ---------- */
  var MISTAKES_KEY_PREFIX = "ezberlab.mistakes.";
  var activeDeckId = loadActiveDeckId();
  var cards = loadCards(activeDeckId);
  var queue = [];
  var known = 0;
  var currentIndex = 0;
  var showingBack = false;
  var stage = "question"; // "question" | "confirm"

  var deckSelect = document.getElementById("deckSelect");
  var cardForm = document.getElementById("cardForm");
  var cardFrontInput = document.getElementById("cardFront");
  var cardBackInput = document.getElementById("cardBack");
  var cardCountEl = document.getElementById("cardCount");
  var mistakesBtn = document.getElementById("mistakesBtn");
  var mistakesCountEl = document.getElementById("mistakesCount");
  var shuffleBtn = document.getElementById("shuffleBtn");
  var resetProgressBtn = document.getElementById("resetProgressBtn");
  var restoreDeckBtn = document.getElementById("restoreDeckBtn");
  var clearCardsBtn = document.getElementById("clearCardsBtn");

  var flashEmpty = document.getElementById("flashEmpty");
  var flashCardWrap = document.getElementById("flashCardWrap");
  var flashDone = document.getElementById("flashDone");
  var flashCard = document.getElementById("flashCard");
  var flashFront = document.getElementById("flashFront");
  var flashBack = document.getElementById("flashBack");
  var flashPosition = document.getElementById("flashPosition");
  var flashProgressBar = document.getElementById("flashProgressBar");
  var flashHint = document.getElementById("flashHint");
  var knownStat = document.getElementById("knownStat");
  var remainingStat = document.getElementById("remainingStat");
  var doneScore = document.getElementById("doneScore");

  var flashActionsPrimary = document.getElementById("flashActionsPrimary");
  var flashActionsConfirm = document.getElementById("flashActionsConfirm");
  var dontKnowBtn = document.getElementById("dontKnowBtn");
  var knowBtn = document.getElementById("knowBtn");
  var correctBtn = document.getElementById("correctBtn");
  var wrongBtn = document.getElementById("wrongBtn");
  var restartBtn = document.getElementById("restartBtn");
  var prevCardBtn = document.getElementById("prevCardBtn");
  var nextCardBtn = document.getElementById("nextCardBtn");

  var mistakesOverlay = document.getElementById("mistakesOverlay");
  var mistakesList = document.getElementById("mistakesList");
  var closeMistakesBtn = document.getElementById("closeMistakesBtn");
  var clearMistakesBtn = document.getElementById("clearMistakesBtn");
  var practiceMistakesBtn = document.getElementById("practiceMistakesBtn");

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function mistakesKey(deckId) { return MISTAKES_KEY_PREFIX + deckId; }

  function loadMistakes(deckId) {
    try {
      var raw = localStorage.getItem(mistakesKey(deckId));
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function saveMistakes(deckId, list) {
    try { localStorage.setItem(mistakesKey(deckId), JSON.stringify(list)); } catch (e) {}
  }

  var mistakes = loadMistakes(activeDeckId);

  function renderMistakesCount() {
    if (mistakesCountEl) mistakesCountEl.textContent = "(" + mistakes.length + ")";
  }

  function renderMistakesList() {
    if (!mistakesList) return;
    mistakesList.innerHTML = "";
    if (!mistakes.length) {
      var empty = document.createElement("p");
      empty.className = "mistakes-empty";
      empty.textContent = "Henüz yanlış bildiğin bir kart yok. 🎉";
      mistakesList.appendChild(empty);
      return;
    }
    mistakes.forEach(function (m, i) {
      var row = document.createElement("div");
      row.className = "mistake-row";

      var text = document.createElement("div");
      var q = document.createElement("p");
      q.className = "mistake-front";
      q.textContent = m.front;
      var a = document.createElement("p");
      a.className = "mistake-back";
      a.textContent = m.back;
      text.appendChild(q);
      text.appendChild(a);

      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "mistake-remove";
      removeBtn.setAttribute("aria-label", "Sepetten çıkar");
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", function () {
        mistakes.splice(i, 1);
        saveMistakes(activeDeckId, mistakes);
        renderMistakesCount();
        renderMistakesList();
      });

      row.appendChild(text);
      row.appendChild(removeBtn);
      mistakesList.appendChild(row);
    });
  }

  function addMistake(card) {
    var exists = mistakes.some(function (m) { return m.front === card.front; });
    if (!exists) mistakes.push({ front: card.front, back: card.back });
    saveMistakes(activeDeckId, mistakes);
    renderMistakesCount();
  }

  function removeMistake(card) {
    var idx = -1;
    for (var i = 0; i < mistakes.length; i++) {
      if (mistakes[i].front === card.front) { idx = i; break; }
    }
    if (idx !== -1) {
      mistakes.splice(idx, 1);
      saveMistakes(activeDeckId, mistakes);
      renderMistakesCount();
    }
  }

  function openMistakes() {
    renderMistakesList();
    if (mistakesOverlay) mistakesOverlay.classList.remove("hidden");
  }

  function closeMistakes() {
    if (mistakesOverlay) mistakesOverlay.classList.add("hidden");
  }

  function syncDeckSelect() {
    if (!deckSelect) return;
    deckSelect.value = activeDeckId;
  }

  function startRound() {
    queue = cards.map(function (c, i) { return i; });
    if (autoShuffleEnabled) shuffle(queue);
    known = 0;
    currentIndex = 0;
    showingBack = false;
    renderStage();
  }

  function updateHint() {
    if (!flashHint) return;
    if (stage === "confirm") {
      flashHint.textContent = "Cevabı doğru bildin mi? Aşağıdan seç.";
    } else if (showingBack) {
      flashHint.textContent = "Cevabı gördün mü? Devam etmek için Bilmiyorum'a tekrar bas.";
    } else {
      flashHint.textContent = "Kartı çevirmek için üzerine tıkla ya da Biliyorum / Bilmiyorum'a bas.";
    }
  }

  function showPrimaryActions() {
    stage = "question";
    if (flashActionsPrimary) flashActionsPrimary.classList.remove("hidden");
    if (flashActionsConfirm) flashActionsConfirm.classList.add("hidden");
    updateHint();
  }

  function showConfirmActions() {
    stage = "confirm";
    if (flashActionsPrimary) flashActionsPrimary.classList.add("hidden");
    if (flashActionsConfirm) flashActionsConfirm.classList.remove("hidden");
    updateHint();
  }

  function renderStage() {
    if (cardCountEl) cardCountEl.textContent = decks[activeDeckId].short + " — " + cards.length + " kart";

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
    if (prevCardBtn) prevCardBtn.disabled = currentIndex <= 0;
    if (nextCardBtn) nextCardBtn.disabled = currentIndex >= queue.length - 1;
    showPrimaryActions();
  }

  function goToCard(index) {
    if (!cards.length || !queue.length) return;
    if (index < 0) index = 0;
    if (index > queue.length - 1) index = queue.length - 1;
    currentIndex = index;
    renderStage();
  }

  function flipCard() {
    if (currentIndex >= queue.length || stage === "confirm") return;
    showingBack = !showingBack;
    flashFront.classList.toggle("hidden", showingBack);
    flashBack.classList.toggle("hidden", !showingBack);
    updateHint();
  }

  function gradeCard(markKnown) {
    if (currentIndex >= queue.length) return;
    var card = cards[queue[currentIndex]];
    if (markKnown) {
      known++;
      removeMistake(card);
    } else {
      addMistake(card);
    }
    currentIndex++;
    renderStage();
  }

  function switchDeck(deckId) {
    if (!decks[deckId] || deckId === activeDeckId) return;
    activeDeckId = deckId;
    saveActiveDeckId(activeDeckId);
    cards = loadCards(activeDeckId);
    mistakes = loadMistakes(activeDeckId);
    renderMistakesCount();
    syncDeckSelect();
    startRound();
    showToast(decks[activeDeckId].short + " destesi yüklendi.");
  }

  if (flashCard) flashCard.addEventListener("click", flipCard);

  if (knowBtn) {
    knowBtn.addEventListener("click", function () {
      if (currentIndex >= queue.length) return;
      if (!showingBack) flipCard();
      showConfirmActions();
    });
  }

  if (dontKnowBtn) {
    dontKnowBtn.addEventListener("click", function () {
      if (currentIndex >= queue.length) return;
      if (!showingBack) {
        flipCard();
      } else {
        gradeCard(false);
      }
    });
  }

  if (correctBtn) correctBtn.addEventListener("click", function () { gradeCard(true); });
  if (wrongBtn) wrongBtn.addEventListener("click", function () { gradeCard(false); });

  if (prevCardBtn) prevCardBtn.addEventListener("click", function () { goToCard(currentIndex - 1); });
  if (nextCardBtn) nextCardBtn.addEventListener("click", function () { goToCard(currentIndex + 1); });

  if (restartBtn) restartBtn.addEventListener("click", startRound);
  if (resetProgressBtn) resetProgressBtn.addEventListener("click", function () {
    startRound();
    showToast("İlerleme sıfırlandı.");
  });

  if (deckSelect) {
    deckSelect.addEventListener("change", function () {
      switchDeck(deckSelect.value);
    });
  }

  if (cardForm) {
    cardForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var front = cardFrontInput.value.trim();
      var back = cardBackInput.value.trim();
      if (!front || !back) return;
      cards.push({ front: front, back: back });
      saveCards(activeDeckId, cards);
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

  if (restoreDeckBtn) {
    restoreDeckBtn.addEventListener("click", function () {
      if (!confirm("Bu deste, eklediğin/sildiğin kartlar dahil varsayılan haline sıfırlanacak. Devam edilsin mi?")) return;
      cards = decks[activeDeckId].cards.slice();
      saveCards(activeDeckId, cards);
      mistakes = [];
      saveMistakes(activeDeckId, mistakes);
      renderMistakesCount();
      startRound();
      showToast(decks[activeDeckId].short + " varsayılana sıfırlandı.");
    });
  }

  if (clearCardsBtn) {
    clearCardsBtn.addEventListener("click", function () {
      if (!cards.length) return;
      if (!confirm("Bu destedeki tüm kartları silmek istediğine emin misin?")) return;
      cards = [];
      saveCards(activeDeckId, cards);
      mistakes = [];
      saveMistakes(activeDeckId, mistakes);
      renderMistakesCount();
      startRound();
      showToast("Tüm kartlar silindi.");
    });
  }

  if (mistakesBtn) mistakesBtn.addEventListener("click", openMistakes);
  if (closeMistakesBtn) closeMistakesBtn.addEventListener("click", closeMistakes);
  if (mistakesOverlay) {
    mistakesOverlay.addEventListener("click", function (e) {
      if (e.target === mistakesOverlay) closeMistakes();
    });
  }

  if (clearMistakesBtn) {
    clearMistakesBtn.addEventListener("click", function () {
      if (!mistakes.length) return;
      if (!confirm("Yanlış sepetini tamamen temizlemek istediğine emin misin?")) return;
      mistakes = [];
      saveMistakes(activeDeckId, mistakes);
      renderMistakesCount();
      renderMistakesList();
      showToast("Yanlış sepeti temizlendi.");
    });
  }

  if (practiceMistakesBtn) {
    practiceMistakesBtn.addEventListener("click", function () {
      if (!mistakes.length) return;
      var indices = [];
      mistakes.forEach(function (m) {
        var idx = -1;
        for (var i = 0; i < cards.length; i++) {
          if (cards[i].front === m.front) { idx = i; break; }
        }
        if (idx !== -1) indices.push(idx);
      });
      if (!indices.length) {
        showToast("Bu kartlar artık destede bulunmuyor.");
        return;
      }
      queue = indices;
      known = 0;
      currentIndex = 0;
      showingBack = false;
      renderStage();
      closeMistakes();
      showToast(indices.length + " yanlış kartla çalışıyorsun.");
    });
  }

  renderMistakesCount();
  syncDeckSelect();
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
          if (timerSoundEnabled) playBeep();
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
