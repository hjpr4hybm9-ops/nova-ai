/* Futbol Kariyer — veri katmanı
   Tüm kulüp ve oyuncu isimleri kurgusaldır, gerçek kişi/kulüplerle ilgisi yoktur. */
(function (FK) {
  "use strict";

  const FIRST_NAMES = [
    "Kaan","Emre","Berkay","Deniz","Arda","Ozan","Mert","Burak","Serkan","Uğur",
    "Onur","Barış","Yusuf","Eren","Kerem","Cem","Tolga","Volkan","Furkan","Alp",
    "Efe","Toprak","Sinan","Doruk","Kağan","Umut","Bora","Aras","Yiğit","Çınar",
    "Lucas","Mateo","Diego","Bruno","Rafael","Tiago","Nico","Marco","Luca","Adrian",
    "Kevin","Dennis","Erik","Viktor","Milan","Ivan","Stefan","Dario","Aleks","Petar",
    "Jamal","Idris","Malik","Samir","Karim","Omar","Yusuf","Amine","Rachid","Bakari",
    "Andres","Pablo","Hugo","Mathis","Louis","Nathan","Kylian","Theo","Enzo","Ilias",
    "Kenji","Ryo","Haruto","Sung","Min","Wei","Hyun","Jun","Taro","Sora"
  ];

  const LAST_NAMES = [
    "Yıldız","Kaya","Demir","Şahin","Çelik","Aydın","Arslan","Doğan","Kurt","Özdemir",
    "Aksoy","Yavuz","Polat","Erdoğan","Koç","Bulut","Aslan","Güneş","Karaca","Tunç",
    "Silva","Santos","Pereira","Costa","Ferreira","Almeida","Rocha","Ramos","Torres","Nunes",
    "Novak","Horvat","Kovač","Petrov","Ivanov","Popov","Dragić","Sokol","Vidal","Zoran",
    "Diallo","Traoré","Konaté","N'Dour","Camara","Bakayoko","Sanogo","Keita","Toure","Sissoko",
    "Martin","Bernard","Petit","Girard","Lambert","Fontaine","Moreau","Simon","Faure","Blanc",
    "Weber","Fischer","Wagner","Becker","Hofmann","Schulz","Meyer","Klein","Wolf","Braun",
    "Nakamura","Tanaka","Suzuki","Watanabe","Kim","Park","Lee","Wang","Chen","Zhang"
  ];

  const CLUBS_SEED = [
    { name: "Boğaziçi FK",        short: "BOĞ", primary: "#1e3a8a", secondary: "#facc15", tier: 1 },
    { name: "Anadolu Yıldız SK",  short: "AYS", primary: "#7f1d1d", secondary: "#fef3c7", tier: 1 },
    { name: "Sahilspor",          short: "SHL", primary: "#0f766e", secondary: "#ffffff", tier: 1 },
    { name: "Kartepe Birlik",     short: "KRT", primary: "#111827", secondary: "#f97316", tier: 2 },
    { name: "Doğu Ekspres FK",    short: "DEK", primary: "#4c1d95", secondary: "#e0e7ff", tier: 2 },
    { name: "Yeşilova Genç.",     short: "YŞL", primary: "#166534", secondary: "#ffffff", tier: 2 },
    { name: "Rüzgarkent SK",      short: "RZG", primary: "#0c4a6e", secondary: "#bae6fd", tier: 2 },
    { name: "Akdeniz Yıldızı",    short: "AKD", primary: "#155e75", secondary: "#fde68a", tier: 2 },
    { name: "Bozkır Demirspor",   short: "BZK", primary: "#3f3f46", secondary: "#d4d4d8", tier: 3 },
    { name: "Kaleköy FK",         short: "KLK", primary: "#7c2d12", secondary: "#fed7aa", tier: 3 },
    { name: "Toroslar Birlik",    short: "TRS", primary: "#134e4a", secondary: "#99f6e4", tier: 3 },
    { name: "Meriçspor",          short: "MRÇ", primary: "#1e293b", secondary: "#38bdf8", tier: 3 },
    { name: "Ege Rüzgarı SK",     short: "EGR", primary: "#065f46", secondary: "#fbbf24", tier: 3 },
    { name: "Karadeniz Fırtına",  short: "KDF", primary: "#0c0a09", secondary: "#22d3ee", tier: 3 },
    { name: "Palandöken FK",      short: "PLD", primary: "#312e81", secondary: "#c7d2fe", tier: 4 },
    { name: "Güneyspor 1963",     short: "GNY", primary: "#7f1d1d", secondary: "#fca5a5", tier: 4 },
    { name: "Yamaçkent Birlik",   short: "YMÇ", primary: "#1c1917", secondary: "#eab308", tier: 4 },
    { name: "Sınırspor",          short: "SNR", primary: "#083344", secondary: "#a5f3fc", tier: 4 }
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

  let idCounter = 1;
  function nextId(prefix) {
    return prefix + (idCounter++) + "_" + Math.random().toString(36).slice(2, 7);
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function generatePlayerName(usedNames) {
    let name;
    let guard = 0;
    do {
      name = pick(FIRST_NAMES) + " " + pick(LAST_NAMES);
      guard++;
    } while (usedNames.has(name) && guard < 30);
    usedNames.add(name);
    return name;
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

  function generatePlayer(position, clubTier, usedNames) {
    const age = randInt(17, 34);
    const tierBonus = (4 - clubTier) * 6; // tier1 en güçlü
    const base = 46 + tierBonus + randInt(-8, 10);
    let overall = clamp(base, 40, 88);
    const growthRoom = age < 30 ? randInt(0, Math.round((30 - age) * 1.1)) : 0;
    let potential = clamp(overall + growthRoom, overall, 94);
    if (age > 31) { overall = clamp(overall - (age - 31) * 2, 40, 99); potential = overall; }

    const player = {
      id: nextId("p"),
      name: generatePlayerName(usedNames),
      age,
      position,
      role: pick(ROLES[position]),
      overall,
      potential,
      form: 0,
      seasonGoals: 0,
      seasonApps: 0,
      injuredWeeks: 0
    };
    player.value = computeValue(player.overall, player.age, player.potential);
    player.wage = computeWage(player.value);
    return player;
  }

  function generateSquad(clubTier) {
    const squad = [];
    const usedNames = new Set();
    SQUAD_PLAN.forEach(({ pos, count }) => {
      for (let i = 0; i < count; i++) {
        squad.push(generatePlayer(pos, clubTier, usedNames));
      }
    });
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
    return agents;
  }

  FK.data = {
    POSITIONS,
    POSITION_LABELS,
    generateLeague,
    generateFreeAgents,
    generatePlayer,
    generatePlayerName,
    computeValue,
    computeWage,
    clamp,
    randInt,
    pick,
    nextId
  };
})(window.FK = window.FK || {});
