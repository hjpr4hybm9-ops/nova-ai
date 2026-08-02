import * as THREE from "./vendor/three.module.min.js";
import { State } from "./state.js";
import { RACE_CONFIG } from "./data.js";
import { createCarGroup } from "./car3d.js";
import { updateMoneyDisplay } from "./ui.js";
import { render as renderGarage } from "./garage.js";

// ---- Pist merkez çizgisi geometrisi (yuvarlak köşeli dikdörtgen), 2B fizik uzayında ----
function buildSegments(cx, cy, X, Y, R) {
  return [
    { type: "line", x1: cx - X + R, y1: cy - Y, x2: cx + X - R, y2: cy - Y },
    { type: "arc", cx: cx + X - R, cy: cy - Y + R, r: R, a1: -Math.PI / 2, a2: 0 },
    { type: "line", x1: cx + X, y1: cy - Y + R, x2: cx + X, y2: cy + Y - R },
    { type: "arc", cx: cx + X - R, cy: cy + Y - R, r: R, a1: 0, a2: Math.PI / 2 },
    { type: "line", x1: cx + X - R, y1: cy + Y, x2: cx - X + R, y2: cy + Y },
    { type: "arc", cx: cx - X + R, cy: cy + Y - R, r: R, a1: Math.PI / 2, a2: Math.PI },
    { type: "line", x1: cx - X, y1: cy + Y - R, x2: cx - X, y2: cy - Y + R },
    { type: "arc", cx: cx - X + R, cy: cy - Y + R, r: R, a1: Math.PI, a2: Math.PI * 1.5 },
  ];
}
function segLength(seg) {
  return seg.type === "line" ? Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1) : seg.r * Math.abs(seg.a2 - seg.a1);
}
function segPoint(seg, t) {
  if (seg.type === "line") return { x: seg.x1 + (seg.x2 - seg.x1) * t, y: seg.y1 + (seg.y2 - seg.y1) * t };
  const a = seg.a1 + (seg.a2 - seg.a1) * t;
  return { x: seg.cx + Math.cos(a) * seg.r, y: seg.cy + Math.sin(a) * seg.r };
}
function buildPolyline(segments, totalPoints) {
  const totalLen = segments.reduce((s, seg) => s + segLength(seg), 0);
  const pts = [];
  segments.forEach((seg) => {
    const len = segLength(seg);
    const n = Math.max(2, Math.round((totalPoints * len) / totalLen));
    for (let i = 0; i < n; i++) pts.push(segPoint(seg, i / n));
  });
  return pts;
}
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - x1) * dx + (py - y1) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + dx * t, cy = y1 + dy * t;
  return Math.hypot(px - cx, py - cy);
}
function distToPolyline(px, py, pts) {
  let min = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const d = distToSegment(px, py, a.x, a.y, b.x, b.y);
    if (d < min) min = d;
  }
  return min;
}
function angleDiff(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function formatTime(sec) {
  if (sec == null) return "--:--";
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
}

export const Race = (() => {
  const TRACK_X = 340, TRACK_Y = 200, TRACK_R = 90, TRACK_WIDTH = 74;
  const W = 900, H = 560;
  const cx = W / 2, cy = H / 2;

  let canvas, renderer, scene, camera;
  let carMesh, carVisualAngle = 0;
  let polyline, checkpoints, startPoint, startAngle;
  let car, keys = {};
  let active = false, rafId = null, lastTs = 0;
  let laps = 0, nextCp = 0, raceTime = 0, driftScore = 0;
  let phase = "idle";
  let countdownVal = 0, countdownTimer = 0;

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();

  const SKID_POOL_SIZE = 260;
  let skidPool = [], skidCursor = 0;

  function toWorld(x, y, yUp = 0) {
    return new THREE.Vector3(x - cx, yUp, y - cy);
  }

  function buildTrackMesh() {
    const group = new THREE.Group();

    // Zemin (çim)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 4000),
      new THREE.MeshStandardMaterial({ color: 0x1d4a2c, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    group.add(ground);

    // Asfalt şerit
    const n = polyline.length;
    const positions = [], uvs = [], indices = [];
    for (let i = 0; i < n; i++) {
      const p = polyline[i];
      const pNext = polyline[(i + 1) % n];
      const pPrev = polyline[(i - 1 + n) % n];
      const tangent = { x: pNext.x - pPrev.x, y: pNext.y - pPrev.y };
      const len = Math.hypot(tangent.x, tangent.y) || 1;
      const nx = -tangent.y / len, ny = tangent.x / len;
      const half = TRACK_WIDTH / 2;
      positions.push(p.x + nx * half - cx, 0.03, p.y + ny * half - cy);
      positions.push(p.x - nx * half - cx, 0.03, p.y - ny * half - cy);
      uvs.push(0, i * 0.15, 1, i * 0.15);
    }
    for (let i = 0; i < n; i++) {
      const a = i * 2, b = i * 2 + 1;
      const c = ((i + 1) % n) * 2, d = ((i + 1) % n) * 2 + 1;
      indices.push(a, b, c, b, d, c);
    }
    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    roadGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();
    const road = new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({ color: 0x33394a, roughness: 0.9, side: THREE.DoubleSide }));
    group.add(road);

    // Kenar bordürleri (kırmızı/beyaz direkler)
    const poleGeo = new THREE.CylinderGeometry(1.6, 1.6, 10, 8);
    for (let i = 0; i < n; i += 6) {
      const p = polyline[i];
      const pNext = polyline[(i + 1) % n];
      const tangent = { x: pNext.x - p.x, y: pNext.y - p.y };
      const len = Math.hypot(tangent.x, tangent.y) || 1;
      const nx = -tangent.y / len, ny = tangent.x / len;
      const outer = TRACK_WIDTH / 2 + 8;
      const mat = new THREE.MeshStandardMaterial({ color: i % 12 === 0 ? 0xd81c2c : 0xf4f6fb, roughness: 0.6 });
      const poleA = new THREE.Mesh(poleGeo, mat);
      poleA.position.set(p.x + nx * outer - cx, 5, p.y + ny * outer - cy);
      group.add(poleA);
      const poleB = new THREE.Mesh(poleGeo, mat);
      poleB.position.set(p.x - nx * outer - cx, 5, p.y - ny * outer - cy);
      group.add(poleB);
    }

    // Başlangıç/bitiş çizgisi
    const p0 = polyline[0], p1 = polyline[1];
    const lineShape = new THREE.PlaneGeometry(4, TRACK_WIDTH);
    const startLine = new THREE.Mesh(lineShape, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }));
    startLine.rotation.x = -Math.PI / 2;
    const startLineHolder = new THREE.Group();
    startLineHolder.add(startLine);
    startLineHolder.rotation.y = -Math.atan2(p1.y - p0.y, p1.x - p0.x);
    startLineHolder.position.set(p0.x - cx, 0.04, p0.y - cy);
    group.add(startLineHolder);

    return group;
  }

  function spawnSkid(x, y, angle) {
    const s = skidPool[skidCursor];
    skidCursor = (skidCursor + 1) % SKID_POOL_SIZE;
    s.holder.position.set(x - cx, 0.05, y - cy);
    s.holder.rotation.y = -angle;
    s.mesh.material.opacity = 0.4;
    s.holder.visible = true;
    s.life = 1;
  }

  function initSkidPool() {
    const geo = new THREE.PlaneGeometry(3.4, 6.5);
    for (let i = 0; i < SKID_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x0a0a0c, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      const holder = new THREE.Group();
      holder.add(mesh);
      holder.visible = false;
      scene.add(holder);
      skidPool.push({ holder, mesh, life: 0 });
    }
  }

  function init() {
    canvas = document.getElementById("raceCanvas");
    const segments = buildSegments(cx, cy, TRACK_X, TRACK_Y, TRACK_R);
    polyline = buildPolyline(segments, 260);
    checkpoints = [];
    const step = Math.floor(polyline.length / 12);
    for (let i = 0; i < polyline.length; i += step) checkpoints.push(polyline[i]);
    startPoint = polyline[0];
    startAngle = Math.atan2(polyline[3].y - polyline[0].y, polyline[3].x - polyline[0].x);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8fd3f4);
    scene.fog = new THREE.Fog(0x8fd3f4, 420, 1500);

    camera = new THREE.PerspectiveCamera(58, 16 / 10, 1, 3000);

    const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x1d4a2c, 0.85);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2d0, 1.05);
    sun.position.set(300, 400, 200);
    scene.add(sun);

    scene.add(buildTrackMesh());
    initSkidPool();

    carMesh = createCarGroup(State.getCarStats().color.hex);
    scene.add(carMesh);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    resetCar();
    bindInput();
    document.getElementById("startRaceBtn").addEventListener("click", startRace);
    document.getElementById("cancelRaceBtn").addEventListener("click", cancelRace);
    updateBestDisplays();
    renderFrame();
  }

  function resetCar() {
    car = { x: startPoint.x, y: startPoint.y, angle: startAngle, vx: 0, vy: 0, stats: State.getCarStats() };
    carMesh.userData.setColor(car.stats.color.hex);
    laps = 0;
    nextCp = 0;
    raceTime = 0;
    driftScore = 0;
    skidPool.forEach((s) => {
      s.life = 0;
      s.holder.visible = false;
    });
    phase = "idle";
    updateHud();
    syncCarMesh(true);
  }

  function bindInput() {
    window.addEventListener("keydown", (e) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === " ") e.preventDefault();
      if (e.key.toLowerCase() === "r" && phase !== "idle") startRace();
    });
    window.addEventListener("keyup", (e) => {
      keys[e.key.toLowerCase()] = false;
    });
  }

  function onTabShown() {
    active = true;
    if (!rafId) {
      lastTs = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }
  function onTabHidden() {
    active = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function startRace() {
    document.getElementById("raceResult").classList.add("hidden");
    resetCar();
    phase = "countdown";
    countdownVal = 3;
    countdownTimer = 0;
  }
  function cancelRace() {
    resetCar();
    document.getElementById("raceResult").classList.add("hidden");
  }

  function loop(ts) {
    if (!active) {
      rafId = null;
      return;
    }
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    dt = Math.min(dt, 0.05);
    update(dt);
    renderFrame();
    rafId = requestAnimationFrame(loop);
  }

  function update(dt) {
    if (phase === "countdown") {
      countdownTimer += dt;
      if (countdownTimer >= 1) {
        countdownTimer -= 1;
        countdownVal -= 1;
        if (countdownVal <= 0) phase = "racing";
      }
      updateHud();
      syncCarMesh(false, dt);
      return;
    }
    if (phase !== "racing") {
      syncCarMesh(false, dt);
      return;
    }

    raceTime += dt;
    const s = car.stats;
    const throttle = keys["arrowup"] || keys["w"] ? 1 : keys["arrowdown"] || keys["s"] ? -1 : 0;
    const steer = keys["arrowleft"] || keys["a"] ? -1 : keys["arrowright"] || keys["d"] ? 1 : 0;
    const handbrake = !!keys[" "];

    const heading = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
    const forwardSpeed = car.vx * heading.x + car.vy * heading.y;

    const speedFactor = Math.min(1, Math.abs(forwardSpeed) / 60 + 0.15);
    const turnDir = forwardSpeed < 0 ? -1 : 1;
    car.angle += steer * s.turnRate * speedFactor * turnDir * dt * (handbrake ? 1.15 : 1);

    if (throttle > 0) {
      car.vx += heading.x * s.accel * dt;
      car.vy += heading.y * s.accel * dt;
    } else if (throttle < 0) {
      if (forwardSpeed > 5) {
        car.vx -= heading.x * s.brakePower * dt;
        car.vy -= heading.y * s.brakePower * dt;
      } else {
        car.vx -= heading.x * (s.accel * 0.6) * dt;
        car.vy -= heading.y * (s.accel * 0.6) * dt;
      }
    }

    const distC = distToPolyline(car.x, car.y, polyline);
    const onTrack = distC <= TRACK_WIDTH / 2;

    const dragFactor = Math.pow(onTrack ? 0.992 : 0.955, dt * 60);
    car.vx *= dragFactor;
    car.vy *= dragFactor;

    const grip = s.grip * (handbrake ? 0.4 : 1) * (onTrack ? 1 : 0.6);
    const curSpeed = Math.hypot(car.vx, car.vy);
    if (curSpeed > 1) {
      const desiredX = heading.x * curSpeed, desiredY = heading.y * curSpeed;
      const gripFactor = Math.min(1, grip * dt * 6);
      car.vx += (desiredX - car.vx) * gripFactor;
      car.vy += (desiredY - car.vy) * gripFactor;
    }

    const maxSp = s.maxSpeed * (onTrack ? 1 : 0.55);
    const sp = Math.hypot(car.vx, car.vy);
    if (sp > maxSp) {
      const k = maxSp / sp;
      car.vx *= k;
      car.vy *= k;
    }

    const velAngle = Math.atan2(car.vy, car.vx);
    const slipDeg = sp > 40 ? Math.abs(angleDiff(velAngle, car.angle)) * (180 / Math.PI) : 0;
    if (slipDeg > 10 && sp > 60) {
      driftScore += slipDeg * (sp / s.maxSpeed) * dt * 12;
      if (Math.random() < 0.6) spawnSkid(car.x - heading.x * 8, car.y - heading.y * 8, car.angle);
    }

    car.x += car.vx * dt;
    car.y += car.vy * dt;
    car.x = Math.max(20, Math.min(W - 20, car.x));
    car.y = Math.max(20, Math.min(H - 20, car.y));

    const cp = checkpoints[nextCp];
    if (Math.hypot(car.x - cp.x, car.y - cp.y) < TRACK_WIDTH * 0.9) {
      nextCp = (nextCp + 1) % checkpoints.length;
      if (nextCp === 0) {
        laps++;
        if (laps >= RACE_CONFIG.laps) finishRace();
      }
    }

    skidPool.forEach((sk) => {
      if (sk.life <= 0) return;
      sk.life -= dt * 0.4;
      sk.mesh.material.opacity = Math.max(0, sk.life * 0.4);
      if (sk.life <= 0) sk.holder.visible = false;
    });

    updateHud();
    syncCarMesh(false, dt);
  }

  function syncCarMesh(instant, dt = 0.016) {
    const pos = toWorld(car.x, car.y);
    carMesh.position.set(pos.x, 0, pos.z);
    carMesh.rotation.y = -car.angle;

    const wheelSpeed = Math.hypot(car.vx, car.vy) * 0.05;
    carMesh.userData.wheels.forEach((w) => (w.rotation.x += wheelSpeed));

    const heading = new THREE.Vector3(Math.cos(car.angle), 0, Math.sin(car.angle));
    const desiredCamPos = new THREE.Vector3(
      pos.x - heading.x * 82,
      44,
      pos.z - heading.z * 82
    );
    const desiredLook = new THREE.Vector3(pos.x + heading.x * 24, 6, pos.z + heading.z * 24);

    if (instant) {
      camPos.copy(desiredCamPos);
      camLook.copy(desiredLook);
    } else {
      const f = Math.min(1, dt * 4.5);
      camPos.lerp(desiredCamPos, f);
      camLook.lerp(desiredLook, f);
    }
  }

  function finishRace() {
    phase = "finished";
    const lapAvg = raceTime / RACE_CONFIG.laps;
    const improved = State.reportRaceResult(lapAvg, Math.round(driftScore));
    const reward = Math.round(400 * RACE_CONFIG.laps + driftScore * 4 + (improved ? 1500 : 0));
    State.addMoney(reward);
    updateMoneyDisplay();
    renderGarage();
    updateBestDisplays();
    const panel = document.getElementById("raceResult");
    panel.innerHTML = `
      <h3>${improved ? "🏆 Yeni Rekor!" : "Yarış Bitti"}</h3>
      <p>Toplam süre: <strong>${formatTime(raceTime)}</strong> (${RACE_CONFIG.laps} tur)</p>
      <p>Drift puanı: <strong>${Math.round(driftScore)}</strong></p>
      <p>Kazanç: <strong>${reward.toLocaleString("tr-TR")} ₺</strong></p>
      <button class="btn btn-primary" id="raceAgainBtn">Tekrar Sür</button>`;
    panel.classList.remove("hidden");
    document.getElementById("raceAgainBtn").addEventListener("click", startRace);
  }

  function updateHud() {
    document.getElementById("lapDisplay").textContent = `${Math.min(laps, RACE_CONFIG.laps)}/${RACE_CONFIG.laps}`;
    document.getElementById("timeDisplay").textContent = formatTime(raceTime);
    document.getElementById("driftScoreDisplay").textContent = Math.round(driftScore);
    const cd = document.getElementById("countdownOverlay");
    if (phase === "countdown") {
      cd.textContent = countdownVal > 0 ? countdownVal : "GİT!";
      cd.classList.remove("hidden");
    } else {
      cd.classList.add("hidden");
    }
  }
  function updateBestDisplays() {
    document.getElementById("bestLapDisplay").textContent = State.data.bestLap ? formatTime(State.data.bestLap) : "--:--";
    document.getElementById("bestDriftDisplay").textContent = State.data.bestDrift || 0;
  }

  function renderFrame() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    renderer.render(scene, camera);
  }

  return { init, onTabShown, onTabHidden, updateBestDisplays };
})();
