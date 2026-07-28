/* Futbol Kariyer — arayüz katmanı */
(function (FK) {
  "use strict";

  const D = FK.data;
  const G = FK.game;

  let previewClubs = [];
  let selectedClubId = null;
  let activeTab = "dashboard";
  let squadFilter = "ALL";
  let marketSubtab = "clubs";
  let marketFilter = "ALL";
  let marketSearch = "";
  let toastTimer = null;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function toast(msg, type) {
    const t = $("toast");
    t.textContent = msg;
    t.className = "toast" + (type ? " " + type : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = "toast hidden"; }, 3200);
  }

  function openModal(html) {
    $("modalSheet").innerHTML = '<button class="modal-close" id="modalCloseBtn">✕</button>' + html;
    $("modalOverlay").classList.remove("hidden");
    $("modalCloseBtn").addEventListener("click", closeModal);
  }
  function closeModal() { $("modalOverlay").classList.add("hidden"); }

  function openConfirm(text, onOk) {
    $("confirmText").textContent = text;
    $("confirmOverlay").classList.remove("hidden");
    const okBtn = $("confirmOk");
    const cancelBtn = $("confirmCancel");
    const cleanup = () => {
      $("confirmOverlay").classList.add("hidden");
      okBtn.removeEventListener("click", onOkWrap);
      cancelBtn.removeEventListener("click", onCancel);
    };
    function onOkWrap() { cleanup(); onOk(); }
    function onCancel() { cleanup(); }
    okBtn.addEventListener("click", onOkWrap);
    cancelBtn.addEventListener("click", onCancel);
  }

  /* ---------------- Kurulum ---------------- */

  function initSetup() {
    if (G.hasSave()) {
      G.load();
      const s = G.getState();
      $("continueBox").classList.remove("hidden");
      $("continueInfo").textContent = `${s.managerName} — ${G.getClub(s.userClubId).name} · Sezon ${s.season}, Hafta ${s.week}/${G.totalWeeks()}`;
      $("continueBtn").addEventListener("click", () => { showGame(); });
      $("newCareerBtn").addEventListener("click", () => {
        openConfirm("Yeni kariyer başlatırsan mevcut kaydın silinir. Emin misin?", () => {
          G.deleteSave();
          $("continueBox").classList.add("hidden");
          toast("Yeni kariyer için kulübünü seç.");
        });
      });
    }
    previewClubs = D.generateLeague();
    renderClubPicker();
    $("startCareerBtn").addEventListener("click", startCareer);
  }

  function renderClubPicker() {
    const wrap = $("clubPicker");
    wrap.innerHTML = "";
    previewClubs.forEach((c) => {
      const card = el("div", "club-card" + (c.id === selectedClubId ? " selected" : ""));
      card.dataset.clubId = c.id;
      const stars = "★".repeat(5 - c.tier + 1) + "☆".repeat(c.tier - 1);
      card.innerHTML = `
        <div class="club-crest" style="background:${c.primary};color:${c.secondary}">${c.short}</div>
        <div class="club-name">${c.name}</div>
        <div class="club-meta"><span class="tier-stars">${stars}</span><span>${G.fmtMoney(c.budget)}</span></div>
      `;
      card.addEventListener("click", () => {
        selectedClubId = c.id;
        renderClubPicker();
      });
      wrap.appendChild(card);
    });
  }

  function startCareer() {
    if (!selectedClubId) { toast("Lütfen bir kulüp seç.", "error"); return; }
    const name = $("managerNameInput").value.trim() || "Teknik Direktör";
    G.newCareer(name, selectedClubId, previewClubs);
    showGame();
  }

  function showGame() {
    $("setupScreen").classList.add("hidden");
    $("gameScreen").classList.remove("hidden");
    wireGameEvents();
    renderAll();
  }

  /* ---------------- Genel oyun kabuğu ---------------- */

  let eventsWired = false;
  function wireGameEvents() {
    if (eventsWired) return;
    eventsWired = true;

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    $("nextWeekBtn").addEventListener("click", () => {
      const s = G.getState();
      if (s.seasonOver) {
        const res = G.startNewSeason();
        if (res.ok) toast(`Yeni sezon başladı! Şampiyon: ${res.champion}`, "success");
        renderAll();
        return;
      }
      const result = G.simulateNextWeek();
      if (!result.ok) { toast(result.reason, "error"); return; }
      const mine = result.results.find((r) => r.isUser);
      if (mine) toast(`${mine.home} ${mine.homeGoals} - ${mine.awayGoals} ${mine.away}`, "success");
      if (result.seasonOver) toast("Sezon tamamlandı! Genel Bakış'tan yeni sezonu başlatabilirsin.", "success");
      renderAll();
    });

    $("resetBtn").addEventListener("click", () => {
      openConfirm("Kariyerini silip ana ekrana dönmek istediğine emin misin?", () => {
        G.deleteSave();
        location.reload();
      });
    });
  }

  function switchTab(name) {
    activeTab = name;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));
    renderActiveTab();
  }

  function renderActiveTab() {
    const s = G.getState();
    if (!s) return;
    if (activeTab === "dashboard") renderDashboard();
    else if (activeTab === "squad") renderSquad();
    else if (activeTab === "market") renderMarket();
    else if (activeTab === "table") renderTable();
    else if (activeTab === "fixtures") renderFixtures();
    else if (activeTab === "scorers") renderScorers();
  }

  function renderAll() {
    const s = G.getState();
    if (!s) return;
    const club = G.getUserClub();

    $("topbarClub").innerHTML = `
      <span class="club-crest" style="background:${club.primary};color:${club.secondary};width:30px;height:30px;font-size:11px;display:inline-flex;align-items:center;justify-content:center;border-radius:7px;">${club.short}</span>
      <span>${club.name}</span>
    `;
    $("statSeason").textContent = s.season;
    $("statWeek").textContent = `${Math.min(s.week, G.totalWeeks())} / ${G.totalWeeks()}`;
    $("statBudget").textContent = G.fmtMoney(club.budget);
    const open = G.isTransferWindowOpen();
    $("statWindow").textContent = open ? "Açık" : "Kapalı";
    $("statWindow").style.color = open ? "var(--good)" : "var(--bad)";
    $("nextWeekBtn").textContent = s.seasonOver ? "Yeni Sezonu Başlat 🏆" : "Sonraki Hafta ▶";

    renderActiveTab();
  }

  /* ---------------- Dashboard ---------------- */

  function renderDashboard() {
    const s = G.getState();
    const club = G.getUserClub();
    const table = FK.sim.computeTable(s.clubs, s.fixtures);
    const myRow = table.find((r) => r.id === club.id);
    const myPos = table.findIndex((r) => r.id === club.id) + 1;
    const nextFx = G.nextFixtureForUser();

    let nextMatchHtml = '<p class="empty-hint">Sezon tamamlandı.</p>';
    if (nextFx) {
      const home = G.getClub(nextFx.match.home);
      const away = G.getClub(nextFx.match.away);
      nextMatchHtml = `
        <div class="next-match">
          <div class="team">${home.name}</div>
          <div class="vs">HAFTA ${nextFx.week}<br>vs</div>
          <div class="team">${away.name}</div>
        </div>`;
    }

    const formBadges = (myRow ? myRow.form.slice(-5) : []).map((f) => `<span class="badge badge-${f}">${f}</span>`).join("");

    const pane = $("tab-dashboard");
    pane.innerHTML = `
      <div class="grid-2">
        <div class="panel">
          <h2>Sıradaki Maç</h2>
          ${nextMatchHtml}
        </div>
        <div class="panel">
          <h3>Kulüp Durumu</h3>
          <div class="pill-row">
            <div class="pill-stat"><strong>${myPos || "-"}.</strong>Lig Sırası</div>
            <div class="pill-stat"><strong>${myRow ? myRow.pts : 0}</strong>Puan</div>
            <div class="pill-stat"><strong>${club.players.length}</strong>Kadro</div>
            <div class="pill-stat"><strong>${club.titles}</strong>Şampiyonluk</div>
          </div>
          <p style="color:var(--text-dim);font-size:13px;margin-bottom:6px;">Son 5 maç</p>
          <div class="form-badges">${formBadges || '<span class="empty-hint">Henüz maç oynanmadı.</span>'}</div>
        </div>
      </div>
      <div class="panel">
        <h3>Bildirimler</h3>
        <ul class="notif-list">
          ${s.notifications.slice(0, 6).map((n) => `<li>${n}</li>`).join("") || '<li>Henüz bildirim yok.</li>'}
        </ul>
      </div>
    `;
  }

  /* ---------------- Kadro ---------------- */

  function playerRowHtml(p, opts) {
    const injured = p.injuredWeeks > 0 ? `<span title="Sakat" style="color:var(--bad);">🩹</span>` : "";
    return `
      <tr data-player-id="${p.id}">
        <td><input class="name-input" value="${p.name}" data-rename="${p.id}" ${opts.editable ? "" : "disabled"}></td>
        <td><span class="pos-chip pos-${p.position}">${D.POSITION_LABELS[p.position]}</span></td>
        <td>${p.age}</td>
        <td><span class="ovr-pill">${p.overall}</span></td>
        <td>${p.potential}</td>
        <td>${p.seasonGoals}</td>
        <td>${G.fmtMoney(p.value)}</td>
        <td>${injured}${opts.action ? opts.action(p) : ""}</td>
      </tr>
    `;
  }

  function renderSquad() {
    const club = G.getUserClub();
    const wageBill = club.players.reduce((a, p) => a + p.wage, 0);
    const filtered = squadFilter === "ALL" ? club.players : club.players.filter((p) => p.position === squadFilter);
    const sorted = filtered.slice().sort((a, b) => b.overall - a.overall);

    const pane = $("tab-squad");
    pane.innerHTML = `
      <div class="pill-row">
        <div class="pill-stat"><strong>${club.players.length}</strong>Toplam Oyuncu</div>
        <div class="pill-stat"><strong>${G.fmtMoney(wageBill)}</strong>Haftalık Ücret</div>
        <div class="pill-stat"><strong>${G.fmtMoney(club.budget)}</strong>Bütçe</div>
      </div>
      <div class="panel">
        <div class="squad-toolbar">
          <select id="squadFilterSelect">
            <option value="ALL">Tüm Mevkiler</option>
            <option value="GK">Kaleci</option>
            <option value="DEF">Defans</option>
            <option value="MID">Orta Saha</option>
            <option value="FWD">Forvet</option>
          </select>
          <span style="color:var(--text-dim);font-size:12.5px;">İsimlere tıklayarak oyuncularını yeniden adlandırabilirsin.</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>İsim</th><th>Mevki</th><th>Yaş</th><th>Güç</th><th>Potansiyel</th><th>Gol</th><th>Değer</th><th>Sat</th></tr></thead>
            <tbody>
              ${sorted.map((p) => playerRowHtml(p, {
                editable: true,
                action: (pl) => `<button class="btn btn-outline btn-sm" data-sell="${pl.id}">Sat</button>`
              })).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    $("squadFilterSelect").value = squadFilter;
    $("squadFilterSelect").addEventListener("change", (e) => { squadFilter = e.target.value; renderSquad(); });

    pane.querySelectorAll("[data-rename]").forEach((input) => {
      input.addEventListener("change", (e) => {
        const res = G.renamePlayer(e.target.dataset.rename, e.target.value);
        if (res.ok) toast("Oyuncu adı güncellendi.", "success");
        else toast(res.reason || "Güncellenemedi.", "error");
      });
    });

    pane.querySelectorAll("[data-sell]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = btn.dataset.sell;
        const found = G.findPlayerOwner(pid);
        const name = found ? found.player.name : "oyuncu";
        openConfirm(`${name} adlı oyuncuyu satmak istediğine emin misin?`, () => {
          const res = G.sellPlayer(pid);
          if (res.ok) { toast("Oyuncu satıldı.", "success"); renderAll(); }
          else toast(res.reason || "Satılamadı.", "error");
        });
      });
    });
  }

  /* ---------------- Transfer Piyasası ---------------- */

  function renderMarket() {
    const s = G.getState();
    const club = G.getUserClub();
    const open = G.isTransferWindowOpen();

    const pane = $("tab-market");
    pane.innerHTML = `
      <div class="pill-row">
        <div class="pill-stat"><strong>${open ? "Açık" : "Kapalı"}</strong>Transfer Penceresi</div>
        <div class="pill-stat"><strong>${G.fmtMoney(club.budget)}</strong>Bütçe</div>
      </div>
      <div class="panel">
        <div class="market-tabs">
          <button class="market-subtab ${marketSubtab === "clubs" ? "active" : ""}" data-sub="clubs">Diğer Kulüpler</button>
          <button class="market-subtab ${marketSubtab === "free" ? "active" : ""}" data-sub="free">Serbest Oyuncular</button>
        </div>
        <div class="market-toolbar">
          <select id="marketPosSelect">
            <option value="ALL">Tüm Mevkiler</option>
            <option value="GK">Kaleci</option>
            <option value="DEF">Defans</option>
            <option value="MID">Orta Saha</option>
            <option value="FWD">Forvet</option>
          </select>
          <input id="marketSearchInput" type="text" placeholder="Oyuncu ara...">
        </div>
        <div class="table-wrap" id="marketTableWrap"></div>
      </div>
    `;

    $("marketPosSelect").value = marketFilter;
    $("marketPosSelect").addEventListener("change", (e) => { marketFilter = e.target.value; renderMarketTable(); });
    $("marketSearchInput").value = marketSearch;
    $("marketSearchInput").addEventListener("input", (e) => { marketSearch = e.target.value; renderMarketTable(); });
    pane.querySelectorAll(".market-subtab").forEach((btn) => {
      btn.addEventListener("click", () => { marketSubtab = btn.dataset.sub; renderMarket(); });
    });

    renderMarketTable();
  }

  function renderMarketTable() {
    const s = G.getState();
    const club = G.getUserClub();
    const open = G.isTransferWindowOpen();
    let list = [];

    if (marketSubtab === "clubs") {
      s.clubs.forEach((c) => {
        if (c.id === club.id) return;
        c.players.forEach((p) => list.push({ p, source: c.name }));
      });
    } else {
      s.freeAgents.forEach((p) => list.push({ p, source: "Serbest" }));
    }

    if (marketFilter !== "ALL") list = list.filter((x) => x.p.position === marketFilter);
    if (marketSearch.trim()) {
      const q = marketSearch.trim().toLowerCase();
      list = list.filter((x) => x.p.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => b.p.overall - a.p.overall);
    list = list.slice(0, 60);

    const wrap = $("marketTableWrap");
    if (list.length === 0) {
      wrap.innerHTML = '<p class="empty-hint">Kriterlere uyan oyuncu bulunamadı.</p>';
      return;
    }

    wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>İsim</th><th>Kulüp</th><th>Mevki</th><th>Yaş</th><th>Güç</th><th>Değer</th><th></th></tr></thead>
        <tbody>
          ${list.map(({ p, source }) => `
            <tr>
              <td>${p.name}</td>
              <td>${source}</td>
              <td><span class="pos-chip pos-${p.position}">${D.POSITION_LABELS[p.position]}</span></td>
              <td>${p.age}</td>
              <td><span class="ovr-pill">${p.overall}</span></td>
              <td>${G.fmtMoney(p.value)}</td>
              <td><button class="btn btn-primary btn-sm" data-buy="${p.id}" ${(!open || club.budget < p.value) ? "disabled" : ""}>Al</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    wrap.querySelectorAll("[data-buy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = btn.dataset.buy;
        const res = G.buyPlayer(pid);
        if (res.ok) { toast(`${res.player.name} transfer edildi!`, "success"); renderAll(); }
        else toast(res.reason || "Transfer başarısız.", "error");
      });
    });
  }

  /* ---------------- Puan Durumu ---------------- */

  function renderTable() {
    const s = G.getState();
    const table = FK.sim.computeTable(s.clubs, s.fixtures);
    const pane = $("tab-table");
    pane.innerHTML = `
      <div class="panel">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>#</th><th>Kulüp</th><th>O</th><th>G</th><th>B</th><th>M</th><th>AG</th><th>YG</th><th>Av</th><th>Puan</th></tr>
            </thead>
            <tbody>
              ${table.map((r, idx) => `
                <tr class="${r.id === s.userClubId ? "me" : ""}">
                  <td>${idx + 1}</td>
                  <td>${r.name}</td>
                  <td>${r.played}</td>
                  <td>${r.win}</td>
                  <td>${r.draw}</td>
                  <td>${r.loss}</td>
                  <td>${r.gf}</td>
                  <td>${r.ga}</td>
                  <td>${r.gf - r.ga}</td>
                  <td><strong>${r.pts}</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* ---------------- Fikstür ---------------- */

  function renderFixtures() {
    const s = G.getState();
    const pane = $("tab-fixtures");
    let html = "";
    s.fixtures.forEach((round, idx) => {
      html += `<div class="fixture-week"><h4>Hafta ${idx + 1}</h4>`;
      round.forEach((m) => {
        const home = G.getClub(m.home);
        const away = G.getClub(m.away);
        const isMe = m.home === s.userClubId || m.away === s.userClubId;
        const score = m.played ? `${m.homeGoals} - ${m.awayGoals}` : '<span class="pending">vs</span>';
        html += `<div class="fixture-row ${isMe ? "me" : ""}"><span>${home.name}</span><span class="score">${score}</span><span>${away.name}</span></div>`;
      });
      html += `</div>`;
    });
    pane.innerHTML = `<div class="panel" style="max-height:70vh;overflow-y:auto;">${html}</div>`;
  }

  /* ---------------- Gol Kralları ---------------- */

  function renderScorers() {
    const s = G.getState();
    const scorers = FK.sim.topScorers(s.clubs, 15);
    const pane = $("tab-scorers");
    if (scorers.length === 0) {
      pane.innerHTML = '<div class="panel"><p class="empty-hint">Henüz gol atılmadı.</p></div>';
      return;
    }
    pane.innerHTML = `
      <div class="panel">
        <table class="data-table">
          <thead><tr><th>#</th><th>Oyuncu</th><th>Kulüp</th><th>Gol</th></tr></thead>
          <tbody>
            ${scorers.map((sc, idx) => `<tr><td>${idx + 1}</td><td>${sc.name}</td><td>${sc.club}</td><td><strong>${sc.goals}</strong></td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  /* ---------------- Başlangıç ---------------- */

  document.addEventListener("DOMContentLoaded", initSetup);
})(window.FK = window.FK || {});
