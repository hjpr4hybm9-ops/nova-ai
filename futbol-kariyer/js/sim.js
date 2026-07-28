/* Futbol Kariyer — fikstür üretimi ve maç simülasyonu */
(function (FK) {
  "use strict";

  function generateDoubleRoundRobin(clubIds) {
    const teams = clubIds.slice();
    if (teams.length % 2 !== 0) teams.push(null);
    const n = teams.length;
    const half = n / 2;
    let arr = teams.slice();
    const firstLeg = [];

    for (let r = 0; r < n - 1; r++) {
      const round = [];
      for (let i = 0; i < half; i++) {
        const home = arr[i];
        const away = arr[n - 1 - i];
        if (home == null || away == null) continue;
        if (i === 0 && r % 2 === 1) round.push({ home: away, away: home });
        else round.push({ home, away });
      }
      firstLeg.push(round);
      const last = arr.pop();
      arr.splice(1, 0, last);
    }

    const secondLeg = firstLeg.map((round) =>
      round.map((m) => ({ home: m.away, away: m.home }))
    );

    return firstLeg.concat(secondLeg).map((round) =>
      round.map((m) => ({
        home: m.home,
        away: m.away,
        played: false,
        homeGoals: null,
        awayGoals: null,
        scorers: []
      }))
    );
  }

  function poissonRandom(lambda) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  }

  function pickStartingXI(club) {
    const available = club.players.filter((p) => p.injuredWeeks <= 0);
    const slots = (FK.data.FORMATIONS && FK.data.FORMATIONS[club.formation]) || { GK: 1, DEF: 4, MID: 4, FWD: 2 };
    const xi = [];
    const used = new Set();
    FK.data.POSITIONS.forEach((pos) => {
      const need = slots[pos] || 0;
      const candidates = available
        .filter((p) => p.position === pos && !used.has(p.id))
        .sort((a, b) => b.overall - a.overall)
        .slice(0, need);
      candidates.forEach((p) => used.add(p.id));
      xi.push(...candidates);
    });
    if (xi.length < 11) {
      const rest = available
        .filter((p) => !used.has(p.id))
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 11 - xi.length);
      xi.push(...rest);
    }
    return xi;
  }

  function teamStrength(club) {
    const xi = pickStartingXI(club);
    if (xi.length === 0) return 45;
    const sum = xi.reduce((acc, p) => acc + p.overall + p.form, 0);
    return sum / xi.length;
  }

  function expectedGoals(strength, oppStrength, isHome) {
    const diff = strength - oppStrength + (isHome ? 4 : 0);
    return Math.max(0.15, 1.25 + diff * 0.045);
  }

  function weightedScorer(club) {
    const weights = { FWD: 5, MID: 3, DEF: 1, GK: 0.15 };
    const pool = club.players.filter((p) => p.injuredWeeks <= 0);
    const total = pool.reduce((acc, p) => acc + weights[p.position], 0);
    if (total <= 0) return pool[0] || club.players[0];
    let r = Math.random() * total;
    for (const p of pool) {
      r -= weights[p.position];
      if (r <= 0) return p;
    }
    return pool[pool.length - 1];
  }

  function simulateMatch(homeClub, awayClub) {
    const hs = teamStrength(homeClub);
    const as = teamStrength(awayClub);
    const homeGoals = poissonRandom(expectedGoals(hs, as, true));
    const awayGoals = poissonRandom(expectedGoals(as, hs, false));
    const scorers = [];

    for (let i = 0; i < homeGoals; i++) {
      const scorer = weightedScorer(homeClub);
      if (scorer) { scorer.seasonGoals++; scorers.push({ club: homeClub.id, playerId: scorer.id, name: scorer.name }); }
    }
    for (let i = 0; i < awayGoals; i++) {
      const scorer = weightedScorer(awayClub);
      if (scorer) { scorer.seasonGoals++; scorers.push({ club: awayClub.id, playerId: scorer.id, name: scorer.name }); }
    }

    homeClub.players.forEach((p) => { if (p.injuredWeeks <= 0) p.seasonApps++; });
    awayClub.players.forEach((p) => { if (p.injuredWeeks <= 0) p.seasonApps++; });

    return { homeGoals, awayGoals, scorers };
  }

  function computeTable(clubs, fixtures) {
    const table = {};
    clubs.forEach((c) => {
      table[c.id] = {
        id: c.id, name: c.name, short: c.short, primary: c.primary,
        played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, pts: 0, form: []
      };
    });
    fixtures.flat().forEach((m) => {
      if (!m.played) return;
      const h = table[m.home];
      const a = table[m.away];
      if (!h || !a) return;
      h.played++; a.played++;
      h.gf += m.homeGoals; h.ga += m.awayGoals;
      a.gf += m.awayGoals; a.ga += m.homeGoals;
      if (m.homeGoals > m.awayGoals) { h.win++; h.pts += 3; a.loss++; h.form.push("G"); a.form.push("M"); }
      else if (m.homeGoals < m.awayGoals) { a.win++; a.pts += 3; h.loss++; a.form.push("G"); h.form.push("M"); }
      else { h.draw++; a.draw++; h.pts++; a.pts++; h.form.push("B"); a.form.push("B"); }
    });
    return Object.values(table).sort((x, y) =>
      y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf
    );
  }

  function topScorers(clubs, limit) {
    const all = [];
    clubs.forEach((c) => c.players.forEach((p) => {
      if (p.seasonGoals > 0) all.push({ name: p.name, club: c.short, goals: p.seasonGoals });
    }));
    return all.sort((a, b) => b.goals - a.goals).slice(0, limit || 10);
  }

  FK.sim = {
    generateDoubleRoundRobin,
    simulateMatch,
    teamStrength,
    computeTable,
    topScorers,
    poissonRandom
  };
})(window.FK = window.FK || {});
