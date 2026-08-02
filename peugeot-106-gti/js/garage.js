const Garage = (() => {
  const root = () => document.getElementById("tab-garage");

  function carSvg(hex) {
    return `<svg viewBox="0 0 220 100" width="220" height="100">
      <ellipse cx="110" cy="88" rx="90" ry="8" fill="rgba(0,0,0,.35)"/>
      <path d="M20 62 Q30 30 65 24 L150 24 Q182 28 198 55 L198 70 Q198 78 188 78 L30 78 Q20 78 20 68 Z" fill="${hex}" stroke="#00000055" stroke-width="2"/>
      <path d="M70 26 Q80 12 110 12 Q138 12 150 26 Z" fill="${hex}" stroke="#00000055" stroke-width="2"/>
      <path d="M76 27 Q84 16 110 16 Q134 16 146 27 Z" fill="#8fb9ff" opacity=".55"/>
      <circle cx="60" cy="78" r="14" fill="#111"/>
      <circle cx="60" cy="78" r="6" fill="#666"/>
      <circle cx="168" cy="78" r="14" fill="#111"/>
      <circle cx="168" cy="78" r="6" fill="#666"/>
      <rect x="22" y="50" width="10" height="6" rx="2" fill="#ffe27a"/>
      <rect x="188" y="52" width="8" height="10" rx="2" fill="#d81c2c"/>
    </svg>`;
  }

  function statBar(label, value, ratio) {
    const pct = Math.max(4, Math.min(100, ratio * 100));
    return `<div class="stat-row"><span class="stat-label">${label}</span><div class="stat-track"><div class="stat-fill" style="width:${pct}%"></div></div><span class="stat-val">${value}</span></div>`;
  }

  function statBars(stats) {
    return `<div class="stat-bars">
      ${statBar("Güç", stats.hp + " HP", stats.hp / 200)}
      ${statBar("Tutuş", Math.round(stats.grip * 100) + "%", stats.grip)}
      ${statBar("Çeviklik", (Math.round(stats.turnRate * 100) / 100) + "", stats.turnRate / 4)}
      ${statBar("Fren", Math.round(stats.brakePower) + "", stats.brakePower / 700)}
    </div>`;
  }

  function upgradeCard(catKey) {
    const cat = PARTS[catKey];
    const owned = State.data.parts[catKey];
    const current = cat.tiers[owned];
    const next = cat.tiers[owned + 1];
    const money = State.data.money;
    return `<div class="upgrade-card">
      <div class="upgrade-head"><span class="upgrade-icon">${cat.icon}</span><h4>${cat.label}</h4></div>
      <p class="upgrade-current">Takılı: <strong>${current.name}</strong></p>
      ${
        next
          ? `<p class="upgrade-next">${next.name} — ${next.desc}</p>
             <button class="btn ${money >= next.price ? "btn-primary" : "btn-disabled"}" data-upgrade="${catKey}" ${money < next.price ? "disabled" : ""}>
               ${money >= next.price ? "Yükselt" : "Yetersiz Bütçe"} · ${next.price.toLocaleString("tr-TR")} ₺
             </button>`
          : `<p class="upgrade-maxed">✔ Maksimum seviye</p>`
      }
    </div>`;
  }

  function colorSwatches() {
    return PAINT_COLORS.map(
      (c) =>
        `<button class="swatch ${State.data.color === c.id ? "active" : ""}" data-color="${c.id}" style="background:${c.hex}" title="${c.name}" aria-label="${c.name}"></button>`
    ).join("");
  }

  function render() {
    const stats = State.getCarStats();
    root().innerHTML = `
      <div class="garage-grid">
        <div class="car-preview-panel">
          <div class="car-preview">${carSvg(stats.color.hex)}</div>
          <h2>Peugeot 106 GTI '01</h2>
          <p class="car-sub">${stats.hp} HP · ${BASE_CAR.engine}</p>
          ${statBars(stats)}
          <div class="color-panel">
            <span class="color-label">Renk</span>
            <div class="swatches">${colorSwatches()}</div>
          </div>
        </div>
        <div class="upgrades-panel">
          ${Object.keys(PARTS).map(upgradeCard).join("")}
        </div>
      </div>`;

    root()
      .querySelectorAll("[data-upgrade]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          if (State.upgrade(btn.dataset.upgrade)) {
            render();
            window.updateMoneyDisplay();
          }
        });
      });
    root()
      .querySelectorAll("[data-color]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          State.setColor(btn.dataset.color);
          render();
        });
      });
  }

  return { render, carSvg };
})();
