const STORAGE_KEY = "p106gti.save.v1";
const REMEMBER_KEY = "p106gti.remember";

function defaultSave() {
  return {
    money: 4500,
    parts: { engine: 0, tires: 0, suspension: 0, brakes: 0 },
    color: "rouge",
    bestLap: null,
    bestDrift: 0,
  };
}

const State = (() => {
  let save = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw);
      const base = defaultSave();
      return { ...base, ...parsed, parts: { ...base.parts, ...(parsed.parts || {}) } };
    } catch {
      return defaultSave();
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }

  function reset() {
    save = defaultSave();
    persist();
  }

  function getCarStats() {
    const e = PARTS.engine.tiers[save.parts.engine];
    const t = PARTS.tires.tiers[save.parts.tires];
    const s = PARTS.suspension.tiers[save.parts.suspension];
    const b = PARTS.brakes.tiers[save.parts.brakes];
    return {
      hp: Math.round(BASE_CAR.baseHp * e.accelMult),
      accel: 190 * e.accelMult,
      maxSpeed: 250 * e.speedMult,
      grip: Math.min(0.985, 0.86 * t.gripMult),
      turnRate: 2.7 * s.turnMult,
      brakePower: 420 * b.brakeMult,
      color: PAINT_COLORS.find((c) => c.id === save.color) || PAINT_COLORS[0],
    };
  }

  return {
    get data() {
      return save;
    },
    persist,
    reset,
    getCarStats,
    addMoney(n) {
      save.money = Math.max(0, Math.round(save.money + n));
      persist();
    },
    upgrade(cat) {
      const idx = save.parts[cat];
      const tiers = PARTS[cat].tiers;
      if (idx >= tiers.length - 1) return false;
      const next = tiers[idx + 1];
      if (save.money < next.price) return false;
      save.money -= next.price;
      save.parts[cat] = idx + 1;
      persist();
      return true;
    },
    setColor(id) {
      save.color = id;
      persist();
    },
    reportRaceResult(lapTime, driftScore) {
      let improved = false;
      if (save.bestLap === null || lapTime < save.bestLap) {
        save.bestLap = lapTime;
        improved = true;
      }
      if (driftScore > save.bestDrift) save.bestDrift = driftScore;
      persist();
      return improved;
    },
  };
})();
