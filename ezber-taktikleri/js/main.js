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

  var decks = {
    "kpss-tarih-2026": { label: "KPSS Tarih 2026", short: "KPSS Tarih 2026", cards: kpssTarihCards },
    "genel": { label: "Örnek Genel Bilgi", short: "Genel Bilgi", cards: genelCards }
  };
  var deckOrder = ["kpss-tarih-2026", "genel"];

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

  var deckTabs = document.getElementById("deckTabs");
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

  function renderDeckTabs() {
    if (!deckTabs) return;
    deckTabs.querySelectorAll(".tool-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.deck === activeDeckId);
    });
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
    renderDeckTabs();
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

  if (deckTabs) {
    deckTabs.addEventListener("click", function (e) {
      var btn = e.target.closest(".tool-btn");
      if (!btn) return;
      switchDeck(btn.dataset.deck);
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
  renderDeckTabs();
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
