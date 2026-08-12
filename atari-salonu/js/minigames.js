/* Orijinal, telifsiz mini oyunlar. Hiçbir ROM/dış dosya gerektirmez, tamamen bu dosyada yazılıdır. */
(function (global) {
  "use strict";

  function el(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  function makeStopper() {
    var fns = [];
    return {
      add: function (fn) { fns.push(fn); },
      run: function () {
        fns.forEach(function (fn) { try { fn(); } catch (e) {} });
        fns = [];
      }
    };
  }

  function dpad(parent, handlers) {
    var pad = el("div", "mg-dpad", parent);
    var up = el("button", "mg-dbtn mg-dup", pad, "▲");
    var left = el("button", "mg-dbtn mg-dleft", pad, "◀");
    var right = el("button", "mg-dbtn mg-dright", pad, "▶");
    var down = el("button", "mg-dbtn mg-ddown", pad, "▼");
    [["mousedown", "touchstart"]].forEach(function () {});
    function bind(btn, fn) {
      btn.addEventListener("click", function (e) { e.preventDefault(); fn(); });
    }
    if (handlers.up) bind(up, handlers.up); else up.classList.add("hidden");
    if (handlers.down) bind(down, handlers.down); else down.classList.add("hidden");
    if (handlers.left) bind(left, handlers.left);
    if (handlers.right) bind(right, handlers.right);
    return pad;
  }

  /* ================= Snake (Yılan) ================= */
  function startSnake(container) {
    container.innerHTML = "";
    var wrap = el("div", "mg-wrap", container);
    var bar = el("div", "mg-bar", wrap);
    var scoreEl = el("span", "mg-score", bar);
    el("span", "mg-hint", bar, "Ok tuşları ile yön ver");
    var stage = el("div", "mg-stage", wrap);
    var canvas = el("canvas", "mg-canvas", stage);
    var ctx = canvas.getContext("2d");
    var cols = 18, rows = 18, cell = 0;
    var snake, dir, nextDir, food, score, gameOver, interval;
    var stopper = makeStopper();

    function resize() {
      var size = Math.max(180, Math.min(stage.clientWidth, stage.clientHeight, 440));
      cell = Math.floor(size / cols);
      canvas.width = cell * cols;
      canvas.height = cell * rows;
      if (snake) draw();
    }

    function reset() {
      snake = [{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }];
      dir = { x: 1, y: 0 };
      nextDir = dir;
      score = 0;
      gameOver = false;
      placeFood();
      scoreEl.textContent = "Skor: 0";
    }
    function placeFood() {
      do {
        food = { x: (Math.random() * cols) | 0, y: (Math.random() * rows) | 0 };
      } while (snake.some(function (s) { return s.x === food.x && s.y === food.y; }));
    }
    function turn(x, y) {
      if (x === -dir.x && y === -dir.y) return;
      nextDir = { x: x, y: y };
    }
    function tick() {
      if (gameOver) return;
      dir = nextDir;
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      var hit = head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows ||
        snake.some(function (s) { return s.x === head.x && s.y === head.y; });
      if (hit) { gameOver = true; draw(); return; }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score++; scoreEl.textContent = "Skor: " + score; placeFood();
      } else {
        snake.pop();
      }
      draw();
    }
    function draw() {
      if (!cell) return;
      ctx.fillStyle = "#0a0710";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      snake.forEach(function (s, i) {
        ctx.fillStyle = i === 0 ? "#ff7a1a" : "#a855f7";
        ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
      });
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(food.x * cell + 3, food.y * cell + 3, cell - 6, cell - 6);
      if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText("Oyun Bitti", canvas.width / 2, canvas.height / 2 - 8);
        ctx.font = "12px sans-serif";
        ctx.fillText("Yeniden başlamak için dokun", canvas.width / 2, canvas.height / 2 + 14);
      }
    }
    function onKey(e) {
      var map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      var d = map[e.key];
      if (!d) return;
      e.preventDefault();
      turn(d[0], d[1]);
    }
    function onTapRestart() { if (gameOver) reset(); }

    resize();
    reset();
    draw();
    window.addEventListener("keydown", onKey);
    canvas.addEventListener("click", onTapRestart);
    var onResize = function () { resize(); };
    window.addEventListener("resize", onResize);
    interval = setInterval(tick, 110);
    dpad(wrap, {
      up: function () { turn(0, -1); }, down: function () { turn(0, 1); },
      left: function () { turn(-1, 0); }, right: function () { turn(1, 0); }
    });

    stopper.add(function () { clearInterval(interval); });
    stopper.add(function () { window.removeEventListener("keydown", onKey); });
    stopper.add(function () { window.removeEventListener("resize", onResize); });
    return stopper;
  }

  /* ================= Pong ================= */
  function startPong(container) {
    container.innerHTML = "";
    var wrap = el("div", "mg-wrap", container);
    var bar = el("div", "mg-bar", wrap);
    var scoreEl = el("span", "mg-score", bar);
    el("span", "mg-hint", bar, "Ok tuşları (▲▼) ile paletini oynat");
    var stage = el("div", "mg-stage", wrap);
    var canvas = el("canvas", "mg-canvas", stage);
    var ctx = canvas.getContext("2d");
    var W = 480, H = 300;
    canvas.width = W; canvas.height = H;

    var PW = 10, PH = 60;
    var player = { y: H / 2 - PH / 2, score: 0 };
    var cpu = { y: H / 2 - PH / 2, score: 0 };
    var ball = { x: W / 2, y: H / 2, vx: 4, vy: 2.5, r: 6 };
    var up = false, down = false;
    var over = false;
    var raf;
    var stopper = makeStopper();

    function updateScore() { scoreEl.textContent = "Sen " + player.score + " · Bilgisayar " + cpu.score; }
    function resetBall(dir) {
      ball.x = W / 2; ball.y = H / 2;
      ball.vx = 4 * dir; ball.vy = (Math.random() * 4 - 2) || 2;
    }
    function step() {
      if (over) return;
      if (up) player.y -= 5;
      if (down) player.y += 5;
      player.y = Math.max(0, Math.min(H - PH, player.y));

      var target = ball.y - PH / 2;
      cpu.y += Math.max(-3.5, Math.min(3.5, target - cpu.y));
      cpu.y = Math.max(0, Math.min(H - PH, cpu.y));

      ball.x += ball.vx; ball.y += ball.vy;
      if (ball.y - ball.r < 0 || ball.y + ball.r > H) ball.vy *= -1;

      if (ball.x - ball.r < PW && ball.y > player.y && ball.y < player.y + PH) {
        ball.vx = Math.abs(ball.vx) * 1.03;
        ball.vy += (ball.y - (player.y + PH / 2)) * 0.05;
      }
      if (ball.x + ball.r > W - PW && ball.y > cpu.y && ball.y < cpu.y + PH) {
        ball.vx = -Math.abs(ball.vx) * 1.03;
        ball.vy += (ball.y - (cpu.y + PH / 2)) * 0.05;
      }
      if (ball.x < 0) { cpu.score++; updateScore(); checkWin() || resetBall(1); }
      if (ball.x > W) { player.score++; updateScore(); checkWin() || resetBall(-1); }
      draw();
      raf = requestAnimationFrame(step);
    }
    function checkWin() {
      if (player.score >= 5 || cpu.score >= 5) {
        over = true;
        draw();
        return true;
      }
      return false;
    }
    function draw() {
      ctx.fillStyle = "#0a0710"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ff7a1a"; ctx.fillRect(0, player.y, PW, PH);
      ctx.fillStyle = "#a855f7"; ctx.fillRect(W - PW, cpu.y, PW, PH);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill();
      if (over) {
        ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "bold 20px sans-serif";
        ctx.fillText(player.score > cpu.score ? "Kazandın!" : "Kaybettin", W / 2, H / 2 - 8);
        ctx.font = "13px sans-serif";
        ctx.fillText("Yeniden başlamak için dokun", W / 2, H / 2 + 16);
      }
    }
    function restart() { player.score = 0; cpu.score = 0; over = false; updateScore(); resetBall(1); }
    function onKeyDown(e) {
      if (e.key === "ArrowUp") { up = true; e.preventDefault(); }
      if (e.key === "ArrowDown") { down = true; e.preventDefault(); }
    }
    function onKeyUp(e) {
      if (e.key === "ArrowUp") up = false;
      if (e.key === "ArrowDown") down = false;
    }
    canvas.addEventListener("click", function () { if (over) restart(); });

    updateScore();
    resetBall(1);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    dpad(wrap, {
      up: function () { player.y -= 24; },
      down: function () { player.y += 24; }
    });
    raf = requestAnimationFrame(step);

    stopper.add(function () { cancelAnimationFrame(raf); });
    stopper.add(function () { window.removeEventListener("keydown", onKeyDown); });
    stopper.add(function () { window.removeEventListener("keyup", onKeyUp); });
    return stopper;
  }

  /* ================= Breakout (Tuğla Kırma) ================= */
  function startBreakout(container) {
    container.innerHTML = "";
    var wrap = el("div", "mg-wrap", container);
    var bar = el("div", "mg-bar", wrap);
    var scoreEl = el("span", "mg-score", bar);
    el("span", "mg-hint", bar, "◀ ▶ ok tuşlarıyla paleti oynat");
    var stage = el("div", "mg-stage", wrap);
    var canvas = el("canvas", "mg-canvas", stage);
    var ctx = canvas.getContext("2d");
    var W = 420, H = 460;
    canvas.width = W; canvas.height = H;

    var rows = 5, cols = 8, brickW = W / cols, brickH = 18, brickPad = 2;
    var paddle = { w: 70, h: 10, x: W / 2 - 35 };
    var ball = { x: W / 2, y: H - 40, vx: 3, vy: -3.4, r: 6 };
    var bricks, score, lives, state, left = false, right = false, raf;
    var stopper = makeStopper();
    var colors = ["#ff7a1a", "#f97316", "#a855f7", "#8b5cf6", "#ec4899"];

    function initBricks() {
      bricks = [];
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) bricks.push({ r: r, c: c, alive: true });
      }
    }
    function reset() {
      initBricks();
      score = 0; lives = 3; state = "play";
      paddle.x = W / 2 - paddle.w / 2;
      resetBall();
      updateBar();
    }
    function resetBall() {
      ball.x = W / 2; ball.y = H - 40; ball.vx = 3 * (Math.random() < 0.5 ? -1 : 1); ball.vy = -3.4;
    }
    function updateBar() { scoreEl.textContent = "Skor: " + score + " · Can: " + lives; }
    function step() {
      if (state === "play") {
        if (left) paddle.x -= 5.5;
        if (right) paddle.x += 5.5;
        paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

        ball.x += ball.vx; ball.y += ball.vy;
        if (ball.x - ball.r < 0 || ball.x + ball.r > W) ball.vx *= -1;
        if (ball.y - ball.r < 0) ball.vy *= -1;
        if (ball.y + ball.r > H) {
          lives--; updateBar();
          if (lives <= 0) { state = "over"; } else { resetBall(); }
        }
        if (ball.y + ball.r > H - paddle.h && ball.y + ball.r < H && ball.x > paddle.x && ball.x < paddle.x + paddle.w && ball.vy > 0) {
          ball.vy = -Math.abs(ball.vy);
          ball.vx += (ball.x - (paddle.x + paddle.w / 2)) * 0.06;
        }
        bricks.forEach(function (b) {
          if (!b.alive) return;
          var bx = b.c * brickW, by = b.r * brickH + 30;
          if (ball.x > bx && ball.x < bx + brickW && ball.y - ball.r < by + brickH && ball.y + ball.r > by) {
            b.alive = false; ball.vy *= -1; score += 10; updateBar();
          }
        });
        if (bricks.every(function (b) { return !b.alive; })) state = "win";
      }
      draw();
      raf = requestAnimationFrame(step);
    }
    function draw() {
      ctx.fillStyle = "#0a0710"; ctx.fillRect(0, 0, W, H);
      bricks.forEach(function (b) {
        if (!b.alive) return;
        ctx.fillStyle = colors[b.r % colors.length];
        ctx.fillRect(b.c * brickW + brickPad, b.r * brickH + 30 + brickPad, brickW - brickPad * 2, brickH - brickPad * 2);
      });
      ctx.fillStyle = "#f5eefc";
      ctx.fillRect(paddle.x, H - paddle.h, paddle.w, paddle.h);
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill();
      if (state !== "play") {
        ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "bold 20px sans-serif";
        ctx.fillText(state === "win" ? "Kazandın!" : "Oyun Bitti", W / 2, H / 2 - 8);
        ctx.font = "13px sans-serif";
        ctx.fillText("Yeniden başlamak için dokun", W / 2, H / 2 + 16);
      }
    }
    function onKeyDown(e) {
      if (e.key === "ArrowLeft") { left = true; e.preventDefault(); }
      if (e.key === "ArrowRight") { right = true; e.preventDefault(); }
    }
    function onKeyUp(e) {
      if (e.key === "ArrowLeft") left = false;
      if (e.key === "ArrowRight") right = false;
    }
    canvas.addEventListener("click", function () { if (state !== "play") reset(); });

    reset();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    dpad(wrap, {
      left: function () { paddle.x -= 26; },
      right: function () { paddle.x += 26; }
    });
    raf = requestAnimationFrame(step);

    stopper.add(function () { cancelAnimationFrame(raf); });
    stopper.add(function () { window.removeEventListener("keydown", onKeyDown); });
    stopper.add(function () { window.removeEventListener("keyup", onKeyUp); });
    return stopper;
  }

  /* ================= 2048 ================= */
  function startTwenty48(container) {
    container.innerHTML = "";
    var wrap = el("div", "mg-wrap", container);
    var bar = el("div", "mg-bar", wrap);
    var scoreEl = el("span", "mg-score", bar);
    el("span", "mg-hint", bar, "Ok tuşlarıyla kaydır, aynı sayıları birleştir");
    var stage = el("div", "mg-stage", wrap);
    var boardEl = el("div", "mg-2048-board", stage);
    var msgEl = el("div", "mg-2048-msg hidden", stage);
    var stopper = makeStopper();

    var size = 4, grid, score, over, won, cells = [];

    for (var i = 0; i < size * size; i++) cells.push(el("div", "mg-2048-cell", boardEl));

    function emptyGrid() {
      var g = [];
      for (var r = 0; r < size; r++) { g.push([0, 0, 0, 0]); }
      return g;
    }
    function reset() {
      grid = emptyGrid();
      score = 0; over = false; won = false;
      spawn(); spawn();
      render();
    }
    function spawn() {
      var empty = [];
      for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (!grid[r][c]) empty.push([r, c]);
      if (!empty.length) return;
      var pos = empty[(Math.random() * empty.length) | 0];
      grid[pos[0]][pos[1]] = Math.random() < 0.9 ? 2 : 4;
    }
    function render() {
      scoreEl.textContent = "Skor: " + score;
      for (var r = 0; r < size; r++) {
        for (var c = 0; c < size; c++) {
          var v = grid[r][c];
          var cell = cells[r * size + c];
          cell.textContent = v || "";
          cell.setAttribute("data-v", v);
        }
      }
      msgEl.classList.toggle("hidden", !over && !won);
      if (over) msgEl.textContent = "Oyun bitti — dokunarak yeniden başla";
      if (won) msgEl.textContent = "2048'e ulaştın! Devam etmek için oynamaya devam et";
    }
    function slideLine(line) {
      var vals = line.filter(function (v) { return v; });
      var moved = vals.length !== line.filter(function (v, idx) { return v && idx < vals.length; }).length;
      var result = [];
      var gained = 0;
      for (var i = 0; i < vals.length; i++) {
        if (vals[i] === vals[i + 1]) {
          var merged = vals[i] * 2;
          result.push(merged);
          gained += merged;
          if (merged === 2048) won = true;
          i++;
        } else {
          result.push(vals[i]);
        }
      }
      while (result.length < size) result.push(0);
      var changed = result.some(function (v, idx) { return v !== line[idx]; });
      return { line: result, changed: changed, gained: gained };
    }
    function move(dir) {
      if (over) return;
      var changedAny = false, gainedTotal = 0;
      var r, c, line, res;
      if (dir === "left" || dir === "right") {
        for (r = 0; r < size; r++) {
          line = grid[r].slice();
          if (dir === "right") line.reverse();
          res = slideLine(line);
          if (dir === "right") res.line.reverse();
          if (res.changed) { changedAny = true; gainedTotal += res.gained; grid[r] = res.line; }
        }
      } else {
        for (c = 0; c < size; c++) {
          line = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
          if (dir === "down") line.reverse();
          res = slideLine(line);
          if (dir === "down") res.line.reverse();
          if (res.changed) {
            changedAny = true; gainedTotal += res.gained;
            for (r = 0; r < size; r++) grid[r][c] = res.line[r];
          }
        }
      }
      if (changedAny) {
        score += gainedTotal;
        spawn();
        if (!hasMoves()) over = true;
        render();
      }
    }
    function hasMoves() {
      for (var r = 0; r < size; r++) {
        for (var c = 0; c < size; c++) {
          if (!grid[r][c]) return true;
          if (c < size - 1 && grid[r][c] === grid[r][c + 1]) return true;
          if (r < size - 1 && grid[r][c] === grid[r + 1][c]) return true;
        }
      }
      return false;
    }
    function onKey(e) {
      var map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      var d = map[e.key];
      if (!d) return;
      e.preventDefault();
      move(d);
    }
    boardEl.addEventListener("click", function () { if (over) reset(); });

    reset();
    window.addEventListener("keydown", onKey);
    dpad(wrap, {
      up: function () { move("up"); }, down: function () { move("down"); },
      left: function () { move("left"); }, right: function () { move("right"); }
    });

    stopper.add(function () { window.removeEventListener("keydown", onKey); });
    return stopper;
  }

  function actionButton(parent, label) {
    var btn = el("button", "mg-fire", parent, label);
    btn.type = "button";
    return btn;
  }

  /* ================= Uzay İstilası (Space Invaders tarzı) ================= */
  function startInvaders(container) {
    container.innerHTML = "";
    var wrap = el("div", "mg-wrap", container);
    var bar = el("div", "mg-bar", wrap);
    var scoreEl = el("span", "mg-score", bar);
    el("span", "mg-hint", bar, "◀ ▶ hareket, ▲ / ateş düğmesiyle vur");
    var stage = el("div", "mg-stage", wrap);
    var canvas = el("canvas", "mg-canvas", stage);
    var ctx = canvas.getContext("2d");
    var W = 420, H = 480;
    canvas.width = W; canvas.height = H;
    var stopper = makeStopper();

    var ship, bullets, enemyBullets, enemies, enemyDir, score, lives, state, left = false, right = false, raf;

    function initEnemies() {
      enemies = [];
      for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 7; c++) {
          enemies.push({ x: 30 + c * 48, y: 40 + r * 36, alive: true });
        }
      }
      enemyDir = 1;
    }
    function reset() {
      ship = { x: W / 2 - 16, w: 32, h: 14 };
      bullets = []; enemyBullets = [];
      initEnemies();
      score = 0; lives = 3; state = "play";
      updateBar();
    }
    function updateBar() { scoreEl.textContent = "Skor: " + score + " · Can: " + lives; }
    function fire() {
      if (state !== "play") { reset(); return; }
      if (bullets.length < 3) bullets.push({ x: ship.x + ship.w / 2 - 2, y: H - 40 });
    }
    function step() {
      if (state === "play") {
        if (left) ship.x -= 5;
        if (right) ship.x += 5;
        ship.x = Math.max(0, Math.min(W - ship.w, ship.x));

        bullets.forEach(function (b) { b.y -= 7; });
        bullets = bullets.filter(function (b) { return b.y > -10; });
        enemyBullets.forEach(function (b) { b.y += 4; });
        enemyBullets = enemyBullets.filter(function (b) { return b.y < H + 10; });

        var edge = false;
        enemies.forEach(function (en) {
          if (!en.alive) return;
          en.x += enemyDir * 0.6;
          if (en.x < 10 || en.x > W - 40) edge = true;
        });
        if (edge) {
          enemyDir *= -1;
          enemies.forEach(function (en) { en.y += 14; });
        }
        if (Math.random() < 0.02) {
          var alive = enemies.filter(function (e) { return e.alive; });
          if (alive.length) {
            var shooter = alive[(Math.random() * alive.length) | 0];
            enemyBullets.push({ x: shooter.x + 14, y: shooter.y + 20 });
          }
        }

        bullets.forEach(function (b) {
          enemies.forEach(function (en) {
            if (en.alive && b.y < en.y + 20 && b.y > en.y && b.x > en.x && b.x < en.x + 28) {
              en.alive = false; b.y = -100; score += 10; updateBar();
            }
          });
        });
        enemyBullets.forEach(function (b) {
          if (b.x > ship.x && b.x < ship.x + ship.w && b.y > H - 40 && b.y < H - 26) {
            b.y = H + 100; lives--; updateBar();
            if (lives <= 0) state = "over";
          }
        });
        if (enemies.some(function (en) { return en.alive && en.y > H - 80; })) state = "over";
        if (enemies.every(function (en) { return !en.alive; })) state = "win";
      }
      draw();
      raf = requestAnimationFrame(step);
    }
    function draw() {
      ctx.fillStyle = "#0a0710"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#4ade80";
      enemies.forEach(function (en) { if (en.alive) ctx.fillRect(en.x, en.y, 28, 20); });
      ctx.fillStyle = "#fbbf24";
      bullets.forEach(function (b) { ctx.fillRect(b.x, b.y, 4, 10); });
      ctx.fillStyle = "#ff5566";
      enemyBullets.forEach(function (b) { ctx.fillRect(b.x, b.y, 4, 10); });
      ctx.fillStyle = "#ff7a1a";
      ctx.fillRect(ship.x, H - 40, ship.w, ship.h);
      if (state !== "play") {
        ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "bold 20px sans-serif";
        ctx.fillText(state === "win" ? "Kazandın!" : "Oyun Bitti", W / 2, H / 2 - 8);
        ctx.font = "13px sans-serif";
        ctx.fillText("Ateş/dokun ile yeniden başla", W / 2, H / 2 + 16);
      }
    }
    function onKeyDown(e) {
      if (e.key === "ArrowLeft") { left = true; e.preventDefault(); }
      if (e.key === "ArrowRight") { right = true; e.preventDefault(); }
      if (e.key === "ArrowUp" || e.key === " ") { fire(); e.preventDefault(); }
    }
    function onKeyUp(e) {
      if (e.key === "ArrowLeft") left = false;
      if (e.key === "ArrowRight") right = false;
    }
    canvas.addEventListener("click", fire);

    reset();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    dpad(wrap, { left: function () { left = true; setTimeout(function () { left = false; }, 140); }, right: function () { right = true; setTimeout(function () { right = false; }, 140); } });
    actionButton(wrap, "🔥 ATEŞ").addEventListener("click", fire);
    raf = requestAnimationFrame(step);

    stopper.add(function () { cancelAnimationFrame(raf); });
    stopper.add(function () { window.removeEventListener("keydown", onKeyDown); });
    stopper.add(function () { window.removeEventListener("keyup", onKeyUp); });
    return stopper;
  }

  /* ================= Asteroit (Asteroids tarzı) ================= */
  function startAsteroids(container) {
    container.innerHTML = "";
    var wrap = el("div", "mg-wrap", container);
    var bar = el("div", "mg-bar", wrap);
    var scoreEl = el("span", "mg-score", bar);
    el("span", "mg-hint", bar, "◀ ▶ dön, ▲ ilerle, ateş düğmesiyle vur");
    var stage = el("div", "mg-stage", wrap);
    var canvas = el("canvas", "mg-canvas", stage);
    var ctx = canvas.getContext("2d");
    var W = 460, H = 460;
    canvas.width = W; canvas.height = H;
    var stopper = makeStopper();

    var ship, bullets, rocks, score, lives, state, left = false, right = false, thrust = false, raf;

    function wrap2(v, max) { return (v + max) % max; }
    function makeRocks(n, size) {
      var arr = [];
      for (var i = 0; i < n; i++) {
        var x, y;
        do { x = Math.random() * W; y = Math.random() * H; } while (Math.hypot(x - W / 2, y - H / 2) < 100);
        arr.push({ x: x, y: y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, r: size, ang: Math.random() * 7 });
      }
      return arr;
    }
    function reset() {
      ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, ang: -Math.PI / 2 };
      bullets = [];
      rocks = makeRocks(5, 26);
      score = 0; lives = 3; state = "play";
      updateBar();
    }
    function updateBar() { scoreEl.textContent = "Skor: " + score + " · Can: " + lives; }
    function fire() {
      if (state !== "play") { reset(); return; }
      bullets.push({ x: ship.x, y: ship.y, vx: Math.cos(ship.ang) * 6, vy: Math.sin(ship.ang) * 6, life: 60 });
    }
    function step() {
      if (state === "play") {
        if (left) ship.ang -= 0.06;
        if (right) ship.ang += 0.06;
        if (thrust) { ship.vx += Math.cos(ship.ang) * 0.12; ship.vy += Math.sin(ship.ang) * 0.12; }
        ship.vx *= 0.995; ship.vy *= 0.995;
        ship.x = wrap2(ship.x + ship.vx, W); ship.y = wrap2(ship.y + ship.vy, H);

        bullets.forEach(function (b) { b.x = wrap2(b.x + b.vx, W); b.y = wrap2(b.y + b.vy, H); b.life--; });
        bullets = bullets.filter(function (b) { return b.life > 0; });

        rocks.forEach(function (r) { r.x = wrap2(r.x + r.vx, W); r.y = wrap2(r.y + r.vy, H); });

        var newRocks = [];
        rocks.forEach(function (r) {
          var hitBullet = bullets.find(function (b) { return Math.hypot(b.x - r.x, b.y - r.y) < r.r; });
          if (hitBullet) {
            hitBullet.life = 0;
            score += 20; updateBar();
            if (r.r > 12) {
              for (var i = 0; i < 2; i++) newRocks.push({ x: r.x, y: r.y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, r: r.r / 2, ang: Math.random() * 7 });
            }
          } else {
            newRocks.push(r);
            if (Math.hypot(ship.x - r.x, ship.y - r.y) < r.r + 8) {
              lives--; updateBar();
              ship.x = W / 2; ship.y = H / 2; ship.vx = 0; ship.vy = 0;
              if (lives <= 0) state = "over";
            }
          }
        });
        rocks = newRocks;
        bullets = bullets.filter(function (b) { return b.life > 0; });
        if (!rocks.length) state = "win";
      }
      draw();
      raf = requestAnimationFrame(step);
    }
    function draw() {
      ctx.fillStyle = "#0a0710"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 1.5;
      rocks.forEach(function (r) {
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke();
      });
      ctx.fillStyle = "#fbbf24";
      bullets.forEach(function (b) { ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, 7); ctx.fill(); });
      ctx.save();
      ctx.translate(ship.x, ship.y); ctx.rotate(ship.ang);
      ctx.fillStyle = "#ff7a1a";
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-10, 8); ctx.lineTo(-10, -8); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (state !== "play") {
        ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "bold 20px sans-serif";
        ctx.fillText(state === "win" ? "Kazandın!" : "Oyun Bitti", W / 2, H / 2 - 8);
        ctx.font = "13px sans-serif";
        ctx.fillText("Ateş/dokun ile yeniden başla", W / 2, H / 2 + 16);
      }
    }
    function onKeyDown(e) {
      if (e.key === "ArrowLeft") { left = true; e.preventDefault(); }
      if (e.key === "ArrowRight") { right = true; e.preventDefault(); }
      if (e.key === "ArrowUp") { thrust = true; e.preventDefault(); }
      if (e.key === " ") { fire(); e.preventDefault(); }
    }
    function onKeyUp(e) {
      if (e.key === "ArrowLeft") left = false;
      if (e.key === "ArrowRight") right = false;
      if (e.key === "ArrowUp") thrust = false;
    }
    canvas.addEventListener("click", fire);

    reset();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    dpad(wrap, {
      left: function () { left = true; setTimeout(function () { left = false; }, 140); },
      right: function () { right = true; setTimeout(function () { right = false; }, 140); },
      up: function () { thrust = true; setTimeout(function () { thrust = false; }, 180); }
    });
    actionButton(wrap, "🔥 ATEŞ").addEventListener("click", fire);
    raf = requestAnimationFrame(step);

    stopper.add(function () { cancelAnimationFrame(raf); });
    stopper.add(function () { window.removeEventListener("keydown", onKeyDown); });
    stopper.add(function () { window.removeEventListener("keyup", onKeyUp); });
    return stopper;
  }

  /* ================= Füze Savunması (Missile Command tarzı) ================= */
  function startMissileCommand(container) {
    container.innerHTML = "";
    var wrap = el("div", "mg-wrap", container);
    var bar = el("div", "mg-bar", wrap);
    var scoreEl = el("span", "mg-score", bar);
    el("span", "mg-hint", bar, "Şehirleri korumak için ekrana dokun/tıkla");
    var stage = el("div", "mg-stage", wrap);
    var canvas = el("canvas", "mg-canvas", stage);
    var ctx = canvas.getContext("2d");
    var W = 460, H = 420;
    canvas.width = W; canvas.height = H;
    var stopper = makeStopper();

    var cities, missiles, interceptors, explosions, score, state, raf, spawnTimer;

    function reset() {
      cities = [60, 160, 260, 360].map(function (x) { return { x: x, alive: true }; });
      missiles = []; interceptors = []; explosions = [];
      score = 0; state = "play"; spawnTimer = 0;
      updateBar();
    }
    function updateBar() { scoreEl.textContent = "Skor: " + score + " · Şehir: " + cities.filter(function (c) { return c.alive; }).length; }
    function spawnMissile() {
      var targetCity = cities[(Math.random() * cities.length) | 0];
      missiles.push({ x: Math.random() * W, y: 0, tx: targetCity.x + 10, ty: H - 20, speed: 0.9 + Math.random() * 0.5 });
    }
    function fireAt(x, y) {
      if (state !== "play") { reset(); return; }
      interceptors.push({ x: W / 2, y: H - 10, tx: x, ty: y, speed: 6 });
    }
    function step() {
      if (state === "play") {
        spawnTimer++;
        if (spawnTimer > 70) { spawnTimer = 0; spawnMissile(); }

        missiles.forEach(function (m) {
          var dx = m.tx - m.x, dy = m.ty - m.y, dist = Math.hypot(dx, dy);
          if (dist < m.speed) { m.hitGround = true; }
          else { m.x += (dx / dist) * m.speed; m.y += (dy / dist) * m.speed; }
        });
        missiles.filter(function (m) { return m.hitGround; }).forEach(function (m) {
          explosions.push({ x: m.x, y: m.y, r: 4, max: 26 });
          var city = cities.find(function (c) { return Math.abs(c.x + 10 - m.x) < 30 && c.alive; });
          if (city) { city.alive = false; updateBar(); }
        });
        missiles = missiles.filter(function (m) { return !m.hitGround; });

        interceptors.forEach(function (m) {
          var dx = m.tx - m.x, dy = m.ty - m.y, dist = Math.hypot(dx, dy);
          if (dist < m.speed) { explosions.push({ x: m.tx, y: m.ty, r: 4, max: 34 }); m.done = true; }
          else { m.x += (dx / dist) * m.speed; m.y += (dy / dist) * m.speed; }
        });
        interceptors = interceptors.filter(function (m) { return !m.done; });

        explosions.forEach(function (ex) { ex.r += 1.6; });
        explosions.forEach(function (ex) {
          missiles.forEach(function (m) {
            if (Math.hypot(m.x - ex.x, m.y - ex.y) < ex.r) { m.hitGround = false; m.dead = true; score += 15; updateBar(); }
          });
        });
        missiles = missiles.filter(function (m) { return !m.dead; });
        explosions = explosions.filter(function (ex) { return ex.r < ex.max; });

        if (cities.every(function (c) { return !c.alive; })) state = "over";
      }
      draw();
      raf = requestAnimationFrame(step);
    }
    function draw() {
      ctx.fillStyle = "#0a0710"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#4ade80";
      cities.forEach(function (c) { if (c.alive) ctx.fillRect(c.x, H - 22, 20, 16); });
      ctx.strokeStyle = "#ff5566"; ctx.lineWidth = 2;
      missiles.forEach(function (m) {
        ctx.beginPath(); ctx.moveTo(m.tx, m.ty); ctx.lineTo(m.x, m.y); ctx.stroke();
      });
      ctx.strokeStyle = "#38bdf8";
      interceptors.forEach(function (m) {
        ctx.beginPath(); ctx.moveTo(W / 2, H - 10); ctx.lineTo(m.x, m.y); ctx.stroke();
      });
      explosions.forEach(function (ex) {
        ctx.fillStyle = "rgba(251,191,36,0.55)";
        ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.r, 0, 7); ctx.fill();
      });
      if (state !== "play") {
        ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "bold 20px sans-serif";
        ctx.fillText("Oyun Bitti — Skor: " + score, W / 2, H / 2 - 8);
        ctx.font = "13px sans-serif";
        ctx.fillText("Yeniden başlamak için dokun", W / 2, H / 2 + 16);
      }
    }
    canvas.addEventListener("click", function (e) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
      fireAt((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    });

    reset();
    raf = requestAnimationFrame(step);
    stopper.add(function () { cancelAnimationFrame(raf); });
    return stopper;
  }

  /* ================= Hafıza (Memory) ================= */
  function startMemory(container) {
    container.innerHTML = "";
    var wrap = el("div", "mg-wrap", container);
    var bar = el("div", "mg-bar", wrap);
    var scoreEl = el("span", "mg-score", bar);
    el("span", "mg-hint", bar, "Eşleşen çiftleri bul");
    var stage = el("div", "mg-stage", wrap);
    var boardEl = el("div", "mg-memory-board", stage);
    var stopper = makeStopper();

    var icons = ["🍎", "🍋", "🍇", "🍉", "🍓", "🍒", "🥝", "🍍"];
    var cards, first, second, lock, moves, matched;

    function reset() {
      var deck = icons.concat(icons)
        .map(function (v) { return { v: v, flipped: false, matched: false }; })
        .sort(function () { return Math.random() - 0.5; });
      cards = deck; first = null; second = null; lock = false; moves = 0; matched = 0;
      render();
      updateBar();
    }
    function updateBar() { scoreEl.textContent = "Hamle: " + moves + " · Eşleşen: " + matched + "/" + icons.length; }
    function render() {
      boardEl.innerHTML = "";
      cards.forEach(function (card, idx) {
        var btn = el("button", "mg-memory-card" + (card.flipped || card.matched ? " flipped" : ""), boardEl);
        btn.type = "button";
        btn.textContent = card.flipped || card.matched ? card.v : "❓";
        btn.disabled = card.matched;
        btn.addEventListener("click", function () { flip(idx); });
        boardEl.appendChild(btn);
      });
    }
    function flip(idx) {
      if (lock || cards[idx].flipped || cards[idx].matched) return;
      cards[idx].flipped = true;
      if (first == null) {
        first = idx;
      } else {
        second = idx;
        moves++; updateBar();
        lock = true;
        render();
        setTimeout(function () {
          if (cards[first].v === cards[second].v) {
            cards[first].matched = true;
            cards[second].matched = true;
            matched++;
            updateBar();
          } else {
            cards[first].flipped = false;
            cards[second].flipped = false;
          }
          first = null; second = null; lock = false;
          render();
        }, 650);
        return;
      }
      render();
    }

    reset();
    stopper.add(function () {});
    return stopper;
  }

  global.MiniGames = {
    snake: { title: "Yılan", start: startSnake },
    pong: { title: "Pong", start: startPong },
    breakout: { title: "Tuğla Kırma", start: startBreakout },
    invaders: { title: "Uzay İstilası", start: startInvaders },
    asteroids: { title: "Asteroit", start: startAsteroids },
    missile: { title: "Füze Savunması", start: startMissileCommand },
    twenty48: { title: "2048", start: startTwenty48 },
    memory: { title: "Hafıza", start: startMemory }
  };
})(window);
