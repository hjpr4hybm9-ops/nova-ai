/* Futbol Kariyer — veri katmanı
   Tüm kulüp ve oyuncu isimleri kurgusaldır, gerçek kişi/kulüplerle ilgisi yoktur. */
(function (FK) {
  "use strict";

  const NATIONS = [
    {
      country: "Türkiye", flag: "🇹🇷", weight: 5,
      first: ["Kaan","Emre","Berkay","Deniz","Arda","Ozan","Mert","Burak","Serkan","Uğur","Onur","Barış","Yusuf","Eren","Kerem","Cem","Tolga","Volkan","Furkan","Alp","Efe","Toprak","Sinan","Doruk","Kağan","Umut","Bora","Aras","Yiğit","Çınar"],
      last: ["Yıldız","Kaya","Demir","Şahin","Çelik","Aydın","Arslan","Doğan","Kurt","Özdemir","Aksoy","Yavuz","Polat","Erdoğan","Koç","Bulut","Aslan","Güneş","Karaca","Tunç"]
    },
    {
      country: "Brezilya", flag: "🇧🇷", weight: 2,
      first: ["Lucas","Mateo","Diego","Bruno","Rafael","Tiago","Nico","Marco","Luca","Adrian"],
      last: ["Silva","Santos","Pereira","Costa","Ferreira","Almeida","Rocha","Ramos","Torres","Nunes"]
    },
    {
      country: "Hırvatistan", flag: "🇭🇷", weight: 2,
      first: ["Kevin","Dennis","Erik","Viktor","Milan","Ivan","Stefan","Dario","Aleks","Petar"],
      last: ["Novak","Horvat","Kovač","Petrov","Ivanov","Popov","Dragić","Sokol","Vidal","Zoran"]
    },
    {
      country: "Fildişi Sahili", flag: "🇨🇮", weight: 2,
      first: ["Jamal","Idris","Malik","Samir","Karim","Omar","Amine","Rachid","Bakari","Yusuf"],
      last: ["Diallo","Traoré","Konaté","N'Dour","Camara","Bakayoko","Sanogo","Keita","Toure","Sissoko"]
    },
    {
      country: "Fransa", flag: "🇫🇷", weight: 2,
      first: ["Hugo","Mathis","Louis","Nathan","Kylian","Theo","Enzo","Ilias","Mathieu","Julien"],
      last: ["Martin","Bernard","Petit","Girard","Lambert","Fontaine","Moreau","Simon","Faure","Blanc"]
    },
    {
      country: "Almanya", flag: "🇩🇪", weight: 2,
      first: ["Lukas","Finn","Jonas","Maximilian","Paul","Elias","Niklas","Tim","Felix","Moritz"],
      last: ["Weber","Fischer","Wagner","Becker","Hofmann","Schulz","Meyer","Klein","Wolf","Braun"]
    },
    {
      country: "Japonya", flag: "🇯🇵", weight: 1,
      first: ["Kenji","Ryo","Haruto","Taro","Sora","Yuto"],
      last: ["Nakamura","Tanaka","Suzuki","Watanabe"]
    },
    {
      country: "Güney Kore", flag: "🇰🇷", weight: 1,
      first: ["Sung","Min","Hyun","Jun"],
      last: ["Kim","Park","Lee"]
    },
    {
      country: "Arjantin", flag: "🇦🇷", weight: 1,
      first: ["Andres","Pablo","Santiago","Facundo","Gonzalo"],
      last: ["Vidal","Molina","Acosta","Rojas","Medina"]
    }
  ];

  const CLUBS_SEED = [
    { name: "Boğaziçi FK",        short: "BOĞ", primary: "#1e3a8a", secondary: "#dbeafe", tier: 1, nickname: "Boğaz Yıldızları", city: "İstanbul",  stadium: "Boğaziçi Arena",     capacity: 42000, founded: 1954, formation: "4-3-3" },
    { name: "Anadolu Yıldız SK",  short: "AYS", primary: "#7f1d1d", secondary: "#fef3c7", tier: 1, nickname: "Başkent Onbirlisi", city: "Ankara",   stadium: "Başkent Stadı",       capacity: 38000, founded: 1961, formation: "4-2-3-1" },
    { name: "Sahilspor",          short: "SHL", primary: "#0f766e", secondary: "#ffffff", tier: 1, nickname: "Liman Çocukları",  city: "İzmir",     stadium: "Liman Park",          capacity: 35000, founded: 1970, formation: "4-3-3" },
    { name: "Kartepe Birlik",     short: "KRT", primary: "#111827", secondary: "#f97316", tier: 2, nickname: "Tepe Güçleri",     city: "Kocaeli",   stadium: "Kartepe Arena",       capacity: 24000, founded: 1975, formation: "4-4-2" },
    { name: "Doğu Ekspres FK",    short: "DEK", primary: "#4c1d95", secondary: "#e0e7ff", tier: 2, nickname: "Ekspresliler",     city: "Erzurum",   stadium: "Doğu Ekspres Stadı",  capacity: 22000, founded: 1968, formation: "3-5-2" },
    { name: "Yeşilova Genç.",     short: "YŞL", primary: "#166534", secondary: "#ffffff", tier: 2, nickname: "Filizler",        city: "Bursa",     stadium: "Yeşilova Stadı",      capacity: 23000, founded: 1958, formation: "4-3-3" },
    { name: "Rüzgarkent SK",      short: "RZG", primary: "#0c4a6e", secondary: "#bae6fd", tier: 2, nickname: "Poyrazlar",       city: "Çanakkale", stadium: "Rüzgarkent Stadı",    capacity: 19000, founded: 1972, formation: "4-4-2" },
    { name: "Akdeniz Yıldızı",    short: "AKD", primary: "#155e75", secondary: "#fde68a", tier: 2, nickname: "Turkuvazlılar",   city: "Antalya",   stadium: "Akdeniz Arena",       capacity: 21000, founded: 1965, formation: "4-2-3-1" },
    { name: "Bozkır Demirspor",   short: "BZK", primary: "#3f3f46", secondary: "#d4d4d8", tier: 3, nickname: "Bozkır Güçleri",  city: "Kayseri",   stadium: "Bozkır Stadı",        capacity: 17000, founded: 1980, formation: "5-3-2" },
    { name: "Kaleköy FK",         short: "KLK", primary: "#7c2d12", secondary: "#fed7aa", tier: 3, nickname: "Kale Bekçileri",  city: "Giresun",   stadium: "Kaleköy Sahası",      capacity: 15000, founded: 1977, formation: "4-4-2" },
    { name: "Toroslar Birlik",    short: "TRS", primary: "#134e4a", secondary: "#99f6e4", tier: 3, nickname: "Toroslular",      city: "Mersin",    stadium: "Toroslar Stadı",      capacity: 16000, founded: 1963, formation: "4-3-3" },
    { name: "Meriçspor",          short: "MRÇ", primary: "#1e293b", secondary: "#38bdf8", tier: 3, nickname: "Nehir Çocukları", city: "Edirne",    stadium: "Meriç Sahası",        capacity: 13000, founded: 1959, formation: "4-4-2" },
    { name: "Ege Rüzgarı SK",     short: "EGR", primary: "#065f46", secondary: "#fbbf24", tier: 3, nickname: "Meltemliler",     city: "Aydın",     stadium: "Ege Rüzgarı Stadı",   capacity: 14000, founded: 1966, formation: "3-5-2" },
    { name: "Kuzey Sahil SK",     short: "KSH", primary: "#0c0a09", secondary: "#22d3ee", tier: 3, nickname: "Sisliler",        city: "Sinop",     stadium: "Kuzey Sahil Stadı",   capacity: 15000, founded: 1971, formation: "4-4-2" },
    { name: "Palandöken FK",      short: "PLD", primary: "#312e81", secondary: "#c7d2fe", tier: 4, nickname: "Zirve Ekibi",     city: "Erzurum",   stadium: "Palandöken Sahası",   capacity: 9000,  founded: 1983, formation: "5-3-2" },
    { name: "Güneyspor 1963",     short: "GNY", primary: "#7f1d1d", secondary: "#fca5a5", tier: 4, nickname: "Güneyliler",      city: "Adana",     stadium: "Güney Sahası",        capacity: 10000, founded: 1963, formation: "4-4-2" },
    { name: "Yamaçkent Birlik",   short: "YMÇ", primary: "#1c1917", secondary: "#eab308", tier: 4, nickname: "Yamaçlılar",      city: "Rize",      stadium: "Yamaçkent Sahası",    capacity: 8000,  founded: 1986, formation: "4-4-2" },
    { name: "Sınırspor",          short: "SNR", primary: "#083344", secondary: "#a5f3fc", tier: 4, nickname: "Hudutlular",      city: "Kars",      stadium: "Sınır Sahası",        capacity: 7000,  founded: 1990, formation: "5-3-2" }
  ];

  const POSITIONS = ["GK", "DEF", "MID", "FWD"];
  const POSITION_LABELS = { GK: "Kaleci", DEF: "Defans", MID: "Orta Saha", FWD: "Forvet" };
  const ROLES = {
    GK: ["Kaleci"],
    DEF: ["Stoper", "Bek"],
    MID: ["Ön Libero", "Merkez Orta Saha", "Ofansif Orta Saha"],
    FWD: ["Kanat", "Santrafor"]
  };
  const SQUAD_PLAN = [
    { pos: "GK", count: 3 },
    { pos: "DEF", count: 7 },
    { pos: "MID", count: 7 },
    { pos: "FWD", count: 4 }
  ];
  const FORMATIONS = {
    "4-4-2": { GK: 1, DEF: 4, MID: 4, FWD: 2 },
    "4-3-3": { GK: 1, DEF: 4, MID: 3, FWD: 3 },
    "3-5-2": { GK: 1, DEF: 3, MID: 5, FWD: 2 },
    "4-2-3-1": { GK: 1, DEF: 4, MID: 5, FWD: 1 },
    "5-3-2": { GK: 1, DEF: 5, MID: 3, FWD: 2 }
  };
  const FEET = [
    { label: "Sağ", weight: 75 },
    { label: "Sol", weight: 20 },
    { label: "Çift", weight: 5 }
  ];

  let idCounter = 1;
  function nextId(prefix) {
    return prefix + (idCounter++) + "_" + Math.random().toString(36).slice(2, 7);
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function weightedPick(items) {
    const total = items.reduce((a, x) => a + x.weight, 0);
    let r = Math.random() * total;
    for (const item of items) {
      r -= item.weight;
      if (r <= 0) return item;
    }
    return items[items.length - 1];
  }

  function pickFoot() {
    return weightedPick(FEET).label;
  }

  function generatePlayerIdentity(usedNames) {
    let nation, name;
    let guard = 0;
    do {
      nation = weightedPick(NATIONS);
      name = pick(nation.first) + " " + pick(nation.last);
      guard++;
    } while (usedNames.has(name) && guard < 30);
    usedNames.add(name);
    return { name, nation: nation.country, flag: nation.flag };
  }

  function computeValue(overall, age, potential) {
    const peak = 27;
    const ageFactor = age <= peak
      ? 1 + (peak - age) * 0.03
      : Math.max(0.28, 1 - (age - peak) * 0.07);
    const potentialFactor = 1 + (potential - overall) * 0.01;
    const raw = Math.pow(overall / 50, 3.1) * 2000000 * ageFactor * potentialFactor;
    return Math.max(75000, Math.round(raw / 25000) * 25000);
  }

  function computeWage(value) {
    return Math.max(4000, Math.round((value * 0.00065) / 500) * 500);
  }

  function generateSubAttributes(position, overall) {
    const noise = () => randInt(-6, 6);
    if (position === "GK") {
      return {
        reflex: clamp(overall + 4 + noise(), 30, 99),
        handling: clamp(overall + noise(), 30, 99),
        kicking: clamp(overall - 6 + noise(), 30, 99)
      };
    }
    const bias = {
      FWD: { pace: 6, shooting: 8, passing: -4, defending: -16, physical: 0 },
      MID: { pace: 0, shooting: -2, passing: 8, defending: -2, physical: 2 },
      DEF: { pace: -2, shooting: -16, passing: -4, defending: 9, physical: 6 }
    }[position];
    return {
      pace: clamp(overall + bias.pace + noise(), 30, 99),
      shooting: clamp(overall + bias.shooting + noise(), 30, 99),
      passing: clamp(overall + bias.passing + noise(), 30, 99),
      defending: clamp(overall + bias.defending + noise(), 30, 99),
      physical: clamp(overall + bias.physical + noise(), 30, 99)
    };
  }

  function generatePlayer(position, clubTier, usedNames) {
    const age = randInt(17, 34);
    const tierBonus = (4 - clubTier) * 6;
    const base = 46 + tierBonus + randInt(-8, 10);
    let overall = clamp(base, 40, 88);
    const growthRoom = age < 30 ? randInt(0, Math.round((30 - age) * 1.1)) : 0;
    let potential = clamp(overall + growthRoom, overall, 94);
    if (age > 31) { overall = clamp(overall - (age - 31) * 2, 40, 99); potential = overall; }

    const identity = generatePlayerIdentity(usedNames);

    const player = {
      id: nextId("p"),
      name: identity.name,
      nation: identity.nation,
      flag: identity.flag,
      foot: pickFoot(),
      number: null,
      age,
      position,
      role: pick(ROLES[position]),
      overall,
      potential,
      attrs: generateSubAttributes(position, overall),
      form: 0,
      seasonGoals: 0,
      seasonApps: 0,
      injuredWeeks: 0
    };
    player.value = computeValue(player.overall, player.age, player.potential);
    player.wage = computeWage(player.value);
    return player;
  }

  function assignSquadNumbers(squad) {
    const pool = [];
    for (let n = 1; n <= 99; n++) pool.push(n);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const gk = squad.find((p) => p.position === "GK" && !p.number);
    if (gk) {
      gk.number = 1;
      const idx = pool.indexOf(1);
      if (idx >= 0) pool.splice(idx, 1);
    }
    squad.forEach((p) => {
      if (p.number) return;
      p.number = pool.shift();
    });
  }

  function generateSquad(clubTier) {
    const squad = [];
    const usedNames = new Set();
    SQUAD_PLAN.forEach(({ pos, count }) => {
      for (let i = 0; i < count; i++) {
        squad.push(generatePlayer(pos, clubTier, usedNames));
      }
    });
    assignSquadNumbers(squad);
    return squad;
  }

  function generateLeague() {
    return CLUBS_SEED.map((seed) => {
      const budget = seed.tier === 1 ? randInt(65, 95) * 1000000
        : seed.tier === 2 ? randInt(30, 55) * 1000000
        : seed.tier === 3 ? randInt(14, 28) * 1000000
        : randInt(6, 15) * 1000000;
      return {
        id: nextId("c"),
        name: seed.name,
        short: seed.short,
        primary: seed.primary,
        secondary: seed.secondary,
        tier: seed.tier,
        nickname: seed.nickname,
        city: seed.city,
        stadium: seed.stadium,
        capacity: seed.capacity,
        founded: seed.founded,
        formation: seed.formation,
        budget,
        titles: 0,
        players: generateSquad(seed.tier)
      };
    });
  }

  function generateFreeAgents(count) {
    const usedNames = new Set();
    const agents = [];
    for (let i = 0; i < count; i++) {
      const pos = pick(POSITIONS);
      const p = generatePlayer(pos, 3, usedNames);
      p.wage = Math.round(p.wage * 0.8);
      agents.push(p);
    }
    assignSquadNumbers(agents);
    return agents;
  }

  FK.data = {
    POSITIONS,
    POSITION_LABELS,
    FORMATIONS,
    generateLeague,
    generateFreeAgents,
    generatePlayer,
    assignSquadNumbers,
    computeValue,
    computeWage,
    clamp,
    randInt,
    pick,
    nextId
  };
})(window.FK = window.FK || {});
