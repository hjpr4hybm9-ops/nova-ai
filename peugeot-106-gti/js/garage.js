import * as THREE from "./vendor/three.module.min.js";
import { PARTS, PAINT_COLORS, BASE_CAR } from "./data.js";
import { State } from "./state.js";
import { updateMoneyDisplay } from "./ui.js";
import { createCarGroup } from "./car3d.js";

const root = () => document.getElementById("tab-garage");
let mounted = false;
let previewCar = null;
let previewRenderer = null;

function statBar(label, value, ratio) {
  const pct = Math.max(4, Math.min(100, ratio * 100));
  return `<div class="stat-row"><span class="stat-label">${label}</span><div class="stat-track"><div class="stat-fill" style="width:${pct}%"></div></div><span class="stat-val">${value}</span></div>`;
}

function statBars(stats) {
  return `${statBar("Güç", stats.hp + " HP", stats.hp / 200)}
    ${statBar("Tutuş", Math.round(stats.grip * 100) + "%", stats.grip)}
    ${statBar("Çeviklik", Math.round(stats.turnRate * 100) / 100 + "", stats.turnRate / 4)}
    ${statBar("Fren", Math.round(stats.brakePower) + "", stats.brakePower / 700)}`;
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

function initPreview3D() {
  const canvas = document.getElementById("carPreviewCanvas");
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(32, 1, 1, 2000);
  camera.position.set(70, 42, 62);
  camera.lookAt(0, 8, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1420, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(60, 90, 40);
  scene.add(sun);

  previewCar = createCarGroup(State.getCarStats().color.hex);
  scene.add(previewCar);

  previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    if (!root().classList.contains("active")) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
      previewRenderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const dt = clock.getDelta();
    previewCar.rotation.y += dt * 0.6;
    previewRenderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
}

function mount() {
  root().innerHTML = `
    <div class="garage-grid">
      <div class="car-preview-panel">
        <div class="car-preview-canvas-wrap"><canvas id="carPreviewCanvas"></canvas></div>
        <h2>Peugeot 106 GTI '01</h2>
        <p class="car-sub" id="carSub"></p>
        <div class="stat-bars" id="statBars"></div>
        <div class="color-panel">
          <span class="color-label">Renk</span>
          <div class="swatches" id="swatches"></div>
        </div>
      </div>
      <div class="upgrades-panel" id="upgradesPanel"></div>
    </div>`;

  initPreview3D();

  root()
    .querySelector("#swatches")
    .addEventListener("click", (e) => {
      const btn = e.target.closest("[data-color]");
      if (!btn) return;
      State.setColor(btn.dataset.color);
      refresh();
    });

  root()
    .querySelector("#upgradesPanel")
    .addEventListener("click", (e) => {
      const btn = e.target.closest("[data-upgrade]");
      if (!btn || btn.disabled) return;
      if (State.upgrade(btn.dataset.upgrade)) {
        refresh();
        updateMoneyDisplay();
      }
    });
}

function refresh() {
  const stats = State.getCarStats();
  root().querySelector("#carSub").textContent = `${stats.hp} HP · ${BASE_CAR.engine}`;
  root().querySelector("#statBars").innerHTML = statBars(stats);
  root().querySelector("#upgradesPanel").innerHTML = Object.keys(PARTS).map(upgradeCard).join("");
  root().querySelector("#swatches").innerHTML = colorSwatches();
  if (previewCar) previewCar.userData.setColor(stats.color.hex);
}

export function render() {
  if (!mounted) {
    mount();
    mounted = true;
  }
  refresh();
}
