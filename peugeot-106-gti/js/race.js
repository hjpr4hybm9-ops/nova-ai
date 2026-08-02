// ---- Geometri yardımcıları (yuvarlak köşeli dikdörtgen pist) ----
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

const Race = (() => {
  let canvas, ctx, W, H;
  const TRACK_X = 340, TRACK_Y = 200, TRACK_R = 90, TRACK_WIDTH = 74;
  let polyline, checkpoints, startPoint, startAngle;
  let car, keys = {};
  let active = false, rafId = null, lastTs = 0;
  let laps = 0, nextCp = 0, raceTime = 0, driftScore = 0, skidMarks = [];
  let phase = "idle";
  let countdownVal = 0, countdownTimer = 0;

  function init() {
    canvas = document.getElementById("raceCanvas");
    ctx = canvas.getContext("2d");
    W = canvas.width;
    H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const segments = buildSegments(cx, cy, TRACK_X, TRACK_Y, TRACK_R);
    polyline = buildPolyline(segments, 260);
    checkpoints = [];
    const step = Math.floor(polyline.length / 12);
    for (let i = 0; i < polyline.length; i += step) checkpoints.push(polyline[i]);
    startPoint = polyline[0];
    startAngle = Math.atan2(polyline[3].y - polyline[0].y, polyline[3].x - polyline[0].x);

    resetCar();
    bindInput();
    document.getElementById("startRaceBtn").addEventListener("click", startRace);
    document.getElementById("cancelRaceBtn").addEventListener("click", cancelRace);
    updateBestDisplays();
    draw();
  }

  function resetCar() {
    car = { x: startPoint.x, y: startPoint.y, angle: startAngle, vx: 0, vy: 0, stats: State.getCarStats() };
    laps = 0;
    nextCp = 0;
    raceTime = 0;
    driftScore = 0;
    skidMarks = [];
    phase = "idle";
    updateHud();
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
    draw();
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
      return;
    }
    if (phase !== "racing") return;

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
      if (Math.random() < 0.6) skidMarks.push({ x: car.x - heading.x * 8, y: car.y - heading.y * 8, life: 1 });
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

    skidMarks.forEach((m) => (m.life -= dt * 0.4));
    skidMarks = skidMarks.filter((m) => m.life > 0).slice(-400);

    updateHud();
  }

  function finishRace() {
    phase = "finished";
    const lapAvg = raceTime / RACE_CONFIG.laps;
    const improved = State.reportRaceResult(lapAvg, Math.round(driftScore));
    const reward = Math.round(400 * RACE_CONFIG.laps + driftScore * 4 + (improved ? 1500 : 0));
    State.addMoney(reward);
    window.updateMoneyDisplay();
    Garage.render();
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

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#173821";
    ctx.fillRect(0, 0, W, H);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = TRACK_WIDTH + 4;
    drawPath();
    ctx.stroke();

    ctx.strokeStyle = "#33394a";
    ctx.lineWidth = TRACK_WIDTH;
    drawPath();
    ctx.stroke();

    ctx.setLineDash([14, 14]);
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = 3;
    drawPath();
    ctx.stroke();
    ctx.setLineDash([]);

    const p0 = polyline[0], p1 = polyline[1];
    const perp = Math.atan2(p1.y - p0.y, p1.x - p0.x) + Math.PI / 2;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(p0.x + Math.cos(perp) * TRACK_WIDTH / 2, p0.y + Math.sin(perp) * TRACK_WIDTH / 2);
    ctx.lineTo(p0.x - Math.cos(perp) * TRACK_WIDTH / 2, p0.y - Math.sin(perp) * TRACK_WIDTH / 2);
    ctx.stroke();

    skidMarks.forEach((m) => {
      ctx.fillStyle = `rgba(10,10,12,${Math.min(0.5, m.life * 0.5)})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    drawCar();
  }
  function drawPath() {
    ctx.beginPath();
    ctx.moveTo(polyline[0].x, polyline[0].y);
    for (let i = 1; i < polyline.length; i++) ctx.lineTo(polyline[i].x, polyline[i].y);
    ctx.closePath();
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function drawCar() {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 17, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = car.stats.color.hex;
    ctx.strokeStyle = "rgba(0,0,0,.5)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, -16, -9, 32, 18, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#8fb9ff";
    roundRect(ctx, -4, -7, 12, 14, 3);
    ctx.fill();
    ctx.fillStyle = "#ffe27a";
    ctx.fillRect(13, -7, 3, 4);
    ctx.fillRect(13, 3, 3, 4);
    ctx.restore();
  }

  return { init, onTabShown, onTabHidden, updateBestDisplays };
})();
