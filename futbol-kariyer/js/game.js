/* Futbol Kariyer — kariyer/oyun durumu yönetimi */
(function (FK) {
  "use strict";

  const SAVE_KEY = "fkGameSave_v1";
  const MIN_SQUAD = 16;
  const PLAN_SIZE = 21;

  let state = null;

  function totalWeeks() { return state.fixtures.length; }

  function getClub(id) { return state.clubs.find((c) => c.id === id); }
  function getUserClub() { return getClub(state.userClubId); }

  function nextRoundNumber() { return state.week + 1; }

  function isTransferWindowOpen() {
    if (!state) return false;
    if (state.seasonOver) return true;
    const mid = Math.floor(totalWeeks() / 2);
    const r = nextRoundNumber();
    return r <= 3 || (r >= mid && r <= mid + 2);
  }

  function fmtMoney(n) {
    if (n >= 1000000) return "₺" + (n / 1000000).toFixed(2).replace(/\.00$/, "") + "M";
    if (n >= 1000) return "₺" + (n / 1000).toFixed(0) + "K";
    return "₺" + n;
  }

  function newCareer(managerName, clubId, prebuiltClubs) {
    idResetGuard();
    const clubs = prebuiltClubs || FK.data.generateLeague();
    const chosen = clubId ? clubs.find((c) => c.id === clubId) : clubs[0];
    state = {
      managerName: managerName || "Teknik Direktör",
      season: 1,
      week: 0,
      seasonOver: false,
      userClubId: chosen.id,
      clubs,
      fixtures: FK.sim.generateDoubleRoundRobin(clubs.map((c) => c.id)),
      freeAgents: FK.data.generateFreeAgents(14),
      transferLog: [],
      trophyCase: [],
      notifications: ["Kariyerine hoş geldin! Transfer piyasası açık, kadronu güçlendirebilirsin."]
    };
    save();
    return state;
  }

  function idResetGuard() {}

  function currentRoundMatches() {
    if (state.week >= totalWeeks()) return [];
    return state.fixtures[state.week];
  }

  function nextFixtureForUser() {
    for (let w = state.week; w < totalWeeks(); w++) {
      const m = state.fixtures[w].find((x) => x.home === state.userClubId || x.away === state.userClubId);
      if (m) return { week: w + 1, match: m };
    }
    return null;
  }

  function simulateNextWeek() {
    if (state.seasonOver) return { ok: false, reason: "Sezon bitti, yeni sezonu başlat." };
    if (state.week >= totalWeeks()) { state.seasonOver = true; return { ok: false, reason: "Sezon bitti." }; }

    const round = state.fixtures[state.week];
    const results = [];
    round.forEach((m) => {
      const home = getClub(m.home);
      const away = getClub(m.away);
      const res = FK.sim.simulateMatch(home, away);
      m.played = true;
      m.homeGoals = res.homeGoals;
      m.awayGoals = res.awayGoals;
      m.scorers = res.scorers;
      results.push({ home: home.name, away: away.name, homeGoals: res.homeGoals, awayGoals: res.awayGoals, isUser: m.home === state.userClubId || m.away === state.userClubId });
    });

    // hafif form/sakatlık güncellemesi
    state.clubs.forEach((c) => c.players.forEach((p) => {
      p.form = FK.data.clamp(p.form + FK.data.randInt(-2, 2), -6, 6);
      if (p.injuredWeeks > 0) p.injuredWeeks--;
      else if (Math.random() < 0.012) p.injuredWeeks = FK.data.randInt(1, 4);
    }));

    state.week++;
    if (state.week >= totalWeeks()) state.seasonOver = true;
    save();
    return { ok: true, results, seasonOver: state.seasonOver };
  }

  function seasonPrize(position, tier) {
    const base = 1200000 - position * 45000;
    return Math.max(150000, Math.round(base));
  }

  function startNewSeason() {
    if (!state.seasonOver) return { ok: false };
    const table = FK.sim.computeTable(state.clubs, state.fixtures);
    const champion = table[0];
    getClub(champion.id).titles++;
    state.trophyCase.push({ season: state.season, championId: champion.id, championName: champion.name });

    table.forEach((row, idx) => {
      const club = getClub(row.id);
      club.budget += seasonPrize(idx + 1, club.tier);
    });

    state.clubs.forEach((club) => {
      const replacements = [];
      club.players = club.players.filter((p) => {
        p.age++;
        if (p.age >= 36) return false;
        if (p.age < 24) p.overall = FK.data.clamp(p.overall + FK.data.randInt(0, 3), p.overall, p.potential);
        else if (p.age >= 30) p.overall = FK.data.clamp(p.overall - FK.data.randInt(0, 3), 40, p.overall);
        else p.overall = FK.data.clamp(p.overall + FK.data.randInt(-1, 2), 40, p.potential);
        p.value = FK.data.computeValue(p.overall, p.age, p.potential);
        p.wage = FK.data.computeWage(p.value);
        p.seasonGoals = 0;
        p.seasonApps = 0;
        p.form = 0;
        p.injuredWeeks = 0;
        return true;
      });
      while (club.players.length < PLAN_SIZE) {
        const posCounts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
        club.players.forEach((p) => posCounts[p.position]++);
        const needed = posCounts.GK < 3 ? "GK" : posCounts.DEF < 7 ? "DEF" : posCounts.MID < 7 ? "MID" : "FWD";
        const usedNames = new Set(club.players.map((p) => p.name));
        replacements.push(FK.data.generatePlayer(needed, club.tier, usedNames));
        club.players.push(replacements[replacements.length - 1]);
      }
    });

    state.freeAgents = FK.data.generateFreeAgents(14);
    state.season++;
    state.week = 0;
    state.seasonOver = false;
    state.fixtures = FK.sim.generateDoubleRoundRobin(state.clubs.map((c) => c.id));
    state.notifications.unshift(`${champion.name} ${state.season - 1}. sezon şampiyonu oldu!`);
    save();
    return { ok: true, champion: champion.name };
  }

  function findPlayerOwner(playerId) {
    for (const c of state.clubs) {
      const p = c.players.find((pl) => pl.id === playerId);
      if (p) return { club: c, player: p };
    }
    const fa = state.freeAgents.find((p) => p.id === playerId);
    if (fa) return { club: null, player: fa };
    return null;
  }

  function buyPlayer(playerId) {
    if (!isTransferWindowOpen()) return { ok: false, reason: "Transfer penceresi kapalı." };
    const found = findPlayerOwner(playerId);
    if (!found || !found.player) return { ok: false, reason: "Oyuncu bulunamadı." };
    const userClub = getUserClub();
    if (found.club && found.club.id === userClub.id) return { ok: false, reason: "Bu oyuncu zaten kadronda." };

    const { player, club: sellerClub } = found;
    if (sellerClub && sellerClub.players.length - 1 < MIN_SQUAD) {
      return { ok: false, reason: sellerClub.name + " kadrosu yetersiz kalacağı için satmıyor." };
    }
    if (userClub.budget < player.value) return { ok: false, reason: "Bütçe yetersiz." };
    if (userClub.players.length >= 30) return { ok: false, reason: "Kadro dolu (maks. 30)." };

    userClub.budget -= player.value;
    if (sellerClub) {
      sellerClub.budget += Math.round(player.value * 0.92);
      sellerClub.players = sellerClub.players.filter((p) => p.id !== playerId);
    } else {
      state.freeAgents = state.freeAgents.filter((p) => p.id !== playerId);
    }
    userClub.players.push(player);
    state.transferLog.unshift({
      week: state.week + 1, season: state.season, type: "buy",
      playerName: player.name, otherClub: sellerClub ? sellerClub.name : "Serbest",
      amount: player.value
    });
    save();
    return { ok: true, player };
  }

  function sellPlayer(playerId) {
    if (!isTransferWindowOpen()) return { ok: false, reason: "Transfer penceresi kapalı." };
    const userClub = getUserClub();
    const player = userClub.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, reason: "Oyuncu kadronda değil." };
    if (userClub.players.length - 1 < MIN_SQUAD) return { ok: false, reason: `Kadro en az ${MIN_SQUAD} oyuncu olmalı.` };

    userClub.players = userClub.players.filter((p) => p.id !== playerId);
    userClub.budget += player.value;
    state.transferLog.unshift({
      week: state.week + 1, season: state.season, type: "sell",
      playerName: player.name, otherClub: "Piyasa", amount: player.value
    });
    save();
    return { ok: true };
  }

  function renamePlayer(playerId, newName) {
    const found = findPlayerOwner(playerId);
    if (!found || !found.player) return { ok: false };
    const trimmed = (newName || "").trim().slice(0, 40);
    if (!trimmed) return { ok: false, reason: "İsim boş olamaz." };
    found.player.name = trimmed;
    save();
    return { ok: true };
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      state = JSON.parse(raw);
      return true;
    } catch (e) {
      return false;
    }
  }

  function hasSave() {
    return !!localStorage.getItem(SAVE_KEY);
  }

  function deleteSave() {
    localStorage.removeItem(SAVE_KEY);
    state = null;
  }

  function getState() { return state; }

  FK.game = {
    newCareer,
    save,
    load,
    hasSave,
    deleteSave,
    getState,
    getClub,
    getUserClub,
    totalWeeks,
    nextRoundNumber,
    isTransferWindowOpen,
    currentRoundMatches,
    nextFixtureForUser,
    simulateNextWeek,
    startNewSeason,
    buyPlayer,
    sellPlayer,
    renamePlayer,
    findPlayerOwner,
    fmtMoney,
    MIN_SQUAD,
    PLAN_SIZE
  };
})(window.FK = window.FK || {});
