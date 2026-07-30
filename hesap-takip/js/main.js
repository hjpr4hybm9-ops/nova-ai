(function () {
  "use strict";

  const STORAGE_KEY = "hesapDefterim.transactions.v1";
  const NOTES_KEY = "transfer212.notes.v1";
  const DEBTS_KEY = "transfer212.debts.v1";
  const THEME_KEY = "transfer212.theme";
  const PUTER_KEY = "transfer212_data";
  const RATES_KEY = "transfer212.rates.v1";

  const CURRENCY_SYMBOLS = { TRY: "₺", USD: "$", EUR: "€" };

  const fmtTRY = (n) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n || 0);

  const fmtDateTR = (isoDate) => {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  function fmtForeign(n, currency) {
    return CURRENCY_SYMBOLS[currency] + n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtTxAmount(t) {
    if (t.currency && t.currency !== "TRY") {
      const orig = t.originalAmount != null ? t.originalAmount : t.amount;
      return `${fmtForeign(orig, t.currency)} (${fmtTRY(t.amount)})`;
    }
    return fmtTRY(t.amount);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Storage ----------
  function loadTx() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveTx(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    pushToPuter();
  }

  function loadNotes() {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveNotes(list) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(list));
    pushToPuter();
  }

  function loadDebts() {
    try {
      const raw = localStorage.getItem(DEBTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveDebts(list) {
    localStorage.setItem(DEBTS_KEY, JSON.stringify(list));
    pushToPuter();
  }

  let transactions = loadTx();
  let notes = loadNotes();
  let debts = loadDebts();

  // ---------- Theme ----------
  const themeToggle = document.getElementById("themeToggle");
  const darkModeSwitch = document.getElementById("darkModeSwitch");

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function applyTheme(next) {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    darkModeSwitch.checked = next === "dark";
    // Category chart colors are theme-dependent; refresh them.
    renderDonut();
    renderBarChart();
  }

  themeToggle.addEventListener("click", () => {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  });

  darkModeSwitch.checked = currentTheme() === "dark";
  darkModeSwitch.addEventListener("change", () => {
    applyTheme(darkModeSwitch.checked ? "dark" : "light");
  });

  // ---------- Tabs ----------
  const tabButtons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".panel");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "ozet") renderOverview();
    });
  });

  // ---------- Transaction form ----------
  const txForm = document.getElementById("txForm");
  const txDate = document.getElementById("txDate");
  const txEditId = document.getElementById("txEditId");
  const txSubmitBtn = document.getElementById("txSubmitBtn");
  const txCancelEdit = document.getElementById("txCancelEdit");
  const txFormTitle = document.getElementById("txFormTitle");
  txDate.valueAsDate = new Date();

  function exitEditMode() {
    txEditId.value = "";
    txSubmitBtn.textContent = "İşlemi Kaydet";
    txFormTitle.textContent = "Yeni İşlem Ekle";
    txCancelEdit.style.display = "none";
  }

  document.getElementById("txCurrency").addEventListener("change", (e) => {
    const c = e.target.value;
    if (c !== "TRY" && !exchangeRates[c]) fetchRates(true);
  });

  txForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("txType").value;
    const rawAmount = parseFloat(document.getElementById("txAmount").value);
    const currency = document.getElementById("txCurrency").value;
    const date = document.getElementById("txDate").value;
    const category = document.getElementById("txCategory").value.trim();
    const desc = document.getElementById("txDesc").value.trim();

    if (!rawAmount || rawAmount <= 0 || !date || !category) return;

    const amount = await resolveTRYAmount(rawAmount, currency);
    if (amount === null) return; // kullanıcı kuru girmekten vazgeçti

    const editId = txEditId.value;
    if (editId) {
      const idx = transactions.findIndex((t) => t.id === editId);
      if (idx !== -1) {
        transactions[idx] = {
          ...transactions[idx],
          type,
          amount,
          currency,
          originalAmount: rawAmount,
          date,
          category,
          desc,
        };
      }
      exitEditMode();
    } else {
      transactions.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        type,
        amount,
        currency,
        originalAmount: rawAmount,
        date,
        category,
        desc,
      });
    }
    saveTx(transactions);
    txForm.reset();
    txDate.valueAsDate = new Date();

    renderAll();
  });

  txCancelEdit.addEventListener("click", () => {
    txForm.reset();
    txDate.valueAsDate = new Date();
    exitEditMode();
  });

  // ---------- Filters ----------
  const filterMonth = document.getElementById("filterMonth");
  const filterType = document.getElementById("filterType");
  filterMonth.addEventListener("change", renderTxTable);
  filterType.addEventListener("change", renderTxTable);

  function populateMonthFilter() {
    const months = new Set(transactions.map((t) => t.date.slice(0, 7)));
    const sorted = Array.from(months).sort().reverse();
    const current = filterMonth.value;
    filterMonth.innerHTML = '<option value="">Tüm Aylar</option>';
    sorted.forEach((m) => {
      const [y, mo] = m.split("-");
      const label = new Date(y, mo - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = label;
      filterMonth.appendChild(opt);
    });
    filterMonth.value = sorted.includes(current) ? current : "";
  }

  function filteredTx() {
    return transactions
      .filter((t) => (filterMonth.value ? t.date.slice(0, 7) === filterMonth.value : true))
      .filter((t) => (filterType.value ? t.type === filterType.value : true))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  // ---------- Table ----------
  const txTableBody = document.getElementById("txTableBody");
  const txEmptyHint = document.getElementById("txEmptyHint");

  function renderTxTable() {
    const rows = filteredTx();
    txTableBody.innerHTML = "";
    txEmptyHint.style.display = rows.length ? "none" : "block";

    rows.forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtDateTR(t.date)}</td>
        <td>${t.type === "gelir" ? "Gelir" : "Gider"}</td>
        <td>${escapeHtml(t.category)}</td>
        <td>${escapeHtml(t.desc || "—")}</td>
        <td class="amount-${t.type}">${t.type === "gider" ? "-" : "+"}${fmtTxAmount(t)}</td>
        <td>
          <button class="edit-btn" data-id="${t.id}" title="Düzenle">✎</button>
          <button class="del-btn" data-id="${t.id}" title="Sil">✕</button>
        </td>
      `;
      txTableBody.appendChild(tr);
    });

    txTableBody.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = transactions.find((tx) => tx.id === btn.dataset.id);
        if (!t) return;
        document.getElementById("txType").value = t.type;
        document.getElementById("txAmount").value = t.originalAmount != null ? t.originalAmount : t.amount;
        document.getElementById("txCurrency").value = t.currency || "TRY";
        document.getElementById("txDate").value = t.date;
        document.getElementById("txCategory").value = t.category;
        document.getElementById("txDesc").value = t.desc || "";
        txEditId.value = t.id;
        txSubmitBtn.textContent = "Güncelle";
        txFormTitle.textContent = "İşlemi Düzenle";
        txCancelEdit.style.display = "inline-flex";
        document.querySelector('.tab-btn[data-tab="islemler"]').click();
        txForm.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    txTableBody.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        transactions = transactions.filter((t) => t.id !== btn.dataset.id);
        saveTx(transactions);
        renderAll();
      });
    });
  }

  // ---------- Overview ----------
  const sumIncomeEl = document.getElementById("sumIncome");
  const sumExpenseEl = document.getElementById("sumExpense");
  const sumBalanceEl = document.getElementById("sumBalance");
  const recentList = document.getElementById("recentList");
  const recentEmptyHint = document.getElementById("recentEmptyHint");

  function renderOverview() {
    const totalIncome = transactions.filter((t) => t.type === "gelir").reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === "gider").reduce((s, t) => s + t.amount, 0);

    sumIncomeEl.textContent = fmtTRY(totalIncome);
    sumExpenseEl.textContent = fmtTRY(totalExpense);
    sumBalanceEl.textContent = fmtTRY(totalIncome - totalExpense);

    // Recent transactions
    const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    recentList.innerHTML = "";
    recentEmptyHint.style.display = recent.length ? "none" : "block";
    recent.forEach((t) => {
      const li = document.createElement("li");
      li.className = "recent-item";
      li.innerHTML = `
        <span>
          ${escapeHtml(t.category)}
          <div class="recent-meta">${fmtDateTR(t.date)}</div>
        </span>
        <span class="amount-${t.type}">${t.type === "gider" ? "-" : "+"}${fmtTxAmount(t)}</span>
      `;
      recentList.appendChild(li);
    });
  }

  // ---------- Chart tooltip ----------
  const chartTooltip = document.getElementById("chartTooltip");

  function showTooltip(x, y, labelText, valueText) {
    chartTooltip.innerHTML = "";
    const labelEl = document.createElement("div");
    labelEl.className = "tt-label";
    labelEl.textContent = labelText;
    const valueEl = document.createElement("div");
    valueEl.className = "tt-value";
    valueEl.textContent = valueText;
    chartTooltip.appendChild(labelEl);
    chartTooltip.appendChild(valueEl);
    chartTooltip.classList.add("show");

    const pad = 14;
    let left = x + pad;
    let top = y + pad;
    const rect = chartTooltip.getBoundingClientRect();
    if (left + rect.width > window.innerWidth - 8) left = x - rect.width - pad;
    if (top + rect.height > window.innerHeight - 8) top = y - rect.height - pad;
    chartTooltip.style.left = Math.max(8, left) + "px";
    chartTooltip.style.top = Math.max(8, top) + "px";
  }

  function hideTooltip() {
    chartTooltip.classList.remove("show");
  }

  // ---------- Category donut chart ----------
  const MONTHS_TR_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  const MONTHS_TR_FULL = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];

  const donutMonthSelect = document.getElementById("donutMonth");
  const donutWrap = document.getElementById("donutWrap");
  const donutCenterLabel = document.getElementById("donutCenterLabel");
  const donutCenterValue = document.getElementById("donutCenterValue");
  const donutLegend = document.getElementById("donutLegend");
  const donutEmptyHint = document.getElementById("donutEmptyHint");

  donutMonthSelect.addEventListener("change", renderDonut);

  function todayYM() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function populateDonutMonths() {
    const months = new Set(transactions.map((t) => t.date.slice(0, 7)));
    months.add(todayYM());
    const sorted = Array.from(months).sort().reverse();
    const current = donutMonthSelect.value;
    donutMonthSelect.innerHTML = "";
    sorted.forEach((m) => {
      const [y, mo] = m.split("-");
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = MONTHS_TR_FULL[parseInt(mo, 10) - 1] + " " + y;
      donutMonthSelect.appendChild(opt);
    });
    if (sorted.includes(current)) donutMonthSelect.value = current;
    else if (sorted.includes(todayYM())) donutMonthSelect.value = todayYM();
  }

  function renderDonut() {
    const month = donutMonthSelect.value;
    const byCategory = {};
    transactions
      .filter((t) => t.type === "gider" && t.date.slice(0, 7) === month)
      .forEach((t) => {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      });

    const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0);

    const catColors = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)"];
    const shown = entries.slice(0, 5).map(([name, value], i) => ({ name, value, color: catColors[i] }));
    if (entries.length > 5) {
      const otherTotal = entries.slice(5).reduce((s, [, v]) => s + v, 0);
      shown.push({ name: "Diğer", value: otherTotal, color: "var(--cat-other)" });
    }

    const [y, mo] = month.split("-");
    donutCenterLabel.textContent = MONTHS_TR_FULL[parseInt(mo, 10) - 1] + " Gider";
    donutCenterValue.textContent = fmtTRY(total);

    donutEmptyHint.style.display = shown.length ? "none" : "block";
    donutWrap.querySelectorAll("svg").forEach((el) => el.remove());
    donutLegend.innerHTML = "";
    if (!shown.length) return;

    const size = 200;
    const strokeWidth = 30;
    const gap = 3;
    const r = (size - strokeWidth) / 2;
    const c = 2 * Math.PI * r;
    const cx = size / 2;
    const cy = size / 2;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);

    let offset = 0;
    shown.forEach((seg) => {
      const frac = seg.value / total;
      const len = frac * c;
      const drawLen = Math.max(len - gap, 0.001);
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", cx);
      circle.setAttribute("cy", cy);
      circle.setAttribute("r", r);
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", seg.color);
      circle.setAttribute("stroke-width", strokeWidth);
      circle.setAttribute("stroke-linecap", "round");
      circle.setAttribute("stroke-dasharray", `${drawLen} ${c - drawLen}`);
      circle.setAttribute("stroke-dashoffset", String(-(offset + gap / 2)));
      circle.setAttribute("transform", `rotate(-90 ${cx} ${cy})`);
      circle.setAttribute("class", "donut-seg");
      circle.setAttribute("tabindex", "0");

      const pct = (frac * 100).toFixed(1).replace(".", ",");
      const onHover = (e) => showTooltip(e.clientX, e.clientY, seg.name, `${fmtTRY(seg.value)} · %${pct}`);
      circle.addEventListener("pointermove", onHover);
      circle.addEventListener("pointerenter", onHover);
      circle.addEventListener("pointerleave", hideTooltip);
      circle.addEventListener("focus", () => {
        const rc = circle.getBoundingClientRect();
        showTooltip(rc.left + rc.width / 2, rc.top + rc.height / 2, seg.name, `${fmtTRY(seg.value)} · %${pct}`);
      });
      circle.addEventListener("blur", hideTooltip);

      svg.appendChild(circle);
      offset += len;
    });

    donutWrap.appendChild(svg);

    shown.forEach((seg) => {
      const item = document.createElement("span");
      item.className = "legend-item";
      const swatch = document.createElement("span");
      swatch.className = "legend-swatch";
      swatch.style.background = seg.color;
      item.appendChild(swatch);
      item.appendChild(document.createTextNode(seg.name + " "));
      const strong = document.createElement("strong");
      strong.textContent = fmtTRY(seg.value);
      item.appendChild(strong);
      donutLegend.appendChild(item);
    });
  }

  // ---------- Yearly income/expense bar chart ----------
  const barYearSelect = document.getElementById("barYear");
  const barChartWrap = document.getElementById("barChartWrap");

  barYearSelect.addEventListener("change", renderBarChart);

  function populateBarYears() {
    const years = new Set(transactions.map((t) => t.date.slice(0, 4)));
    years.add(String(new Date().getFullYear()));
    const sorted = Array.from(years).sort().reverse();
    const current = barYearSelect.value;
    barYearSelect.innerHTML = "";
    sorted.forEach((yr) => {
      const opt = document.createElement("option");
      opt.value = yr;
      opt.textContent = yr;
      barYearSelect.appendChild(opt);
    });
    barYearSelect.value = sorted.includes(current) ? current : sorted[0];
  }

  function niceStep(max) {
    const rough = max / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(rough || 1)));
    const norm = rough / mag;
    let step;
    if (norm < 1.5) step = 1;
    else if (norm < 3) step = 2;
    else if (norm < 7) step = 5;
    else step = 10;
    return step * mag;
  }

  function fmtAxisNum(n) {
    return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n);
  }

  function renderBarChart() {
    const year = barYearSelect.value;
    const monthlyIncome = new Array(12).fill(0);
    const monthlyExpense = new Array(12).fill(0);

    transactions.forEach((t) => {
      if (t.date.slice(0, 4) !== year) return;
      const idx = parseInt(t.date.slice(5, 7), 10) - 1;
      if (idx < 0 || idx > 11) return;
      if (t.type === "gelir") monthlyIncome[idx] += t.amount;
      else monthlyExpense[idx] += t.amount;
    });

    const maxVal = Math.max(1, ...monthlyIncome, ...monthlyExpense);
    const step = niceStep(maxVal);
    const chartMax = step * Math.ceil(maxVal / step);
    const gridValues = [];
    for (let v = 0; v <= chartMax; v += step) gridValues.push(v);

    const width = 760;
    const height = 260;
    const padLeft = 60;
    const padRight = 12;
    const padTop = 16;
    const padBottom = 30;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const groupW = plotW / 12;
    const barW = Math.min(24, groupW * 0.32);
    const gap = 3;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", height);
    svg.style.minWidth = "600px";

    gridValues.forEach((v) => {
      const y = padTop + plotH - (chartMax ? (v / chartMax) * plotH : 0);
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", padLeft);
      line.setAttribute("x2", width - padRight);
      line.setAttribute("y1", y);
      line.setAttribute("y2", y);
      line.setAttribute("stroke", "var(--border)");
      line.setAttribute("stroke-width", "1");
      svg.appendChild(line);

      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", padLeft - 8);
      label.setAttribute("y", y + 4);
      label.setAttribute("text-anchor", "end");
      label.setAttribute("class", "chart-axis-label");
      label.textContent = fmtAxisNum(v);
      svg.appendChild(label);
    });

    MONTHS_TR_SHORT.forEach((monthLabel, i) => {
      const groupX = padLeft + i * groupW;
      const centerX = groupX + groupW / 2;

      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", centerX);
      text.setAttribute("y", height - padBottom + 18);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("class", "chart-axis-label");
      text.textContent = monthLabel;
      svg.appendChild(text);

      const bars = [
        { x: centerX - gap / 2 - barW, val: monthlyIncome[i], color: "var(--income)", label: "Gelir" },
        { x: centerX + gap / 2, val: monthlyExpense[i], color: "var(--expense)", label: "Gider" },
      ];

      bars.forEach((bar) => {
        const h = chartMax ? (bar.val / chartMax) * plotH : 0;
        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("x", bar.x);
        rect.setAttribute("y", padTop + plotH - h);
        rect.setAttribute("width", barW);
        rect.setAttribute("height", Math.max(h, 0));
        rect.setAttribute("rx", 4);
        rect.setAttribute("fill", bar.color);
        rect.setAttribute("class", "bar-rect");
        rect.setAttribute("tabindex", "0");

        const onHover = (e) =>
          showTooltip(e.clientX, e.clientY, `${monthLabel} ${year}`, `${bar.label}: ${fmtTRY(bar.val)}`);
        rect.addEventListener("pointermove", onHover);
        rect.addEventListener("pointerenter", onHover);
        rect.addEventListener("pointerleave", hideTooltip);
        rect.addEventListener("focus", () => {
          const rc = rect.getBoundingClientRect();
          showTooltip(rc.left + rc.width / 2, rc.top, `${monthLabel} ${year}`, `${bar.label}: ${fmtTRY(bar.val)}`);
        });
        rect.addEventListener("blur", hideTooltip);

        svg.appendChild(rect);
      });
    });

    barChartWrap.innerHTML = "";
    barChartWrap.appendChild(svg);
  }

  function renderAll() {
    populateMonthFilter();
    renderTxTable();
    renderOverview();
    populateDonutMonths();
    renderDonut();
    populateBarYears();
    renderBarChart();
  }

  // ---------- Notes ----------
  const noteForm = document.getElementById("noteForm");
  const notesGrid = document.getElementById("notesGrid");
  const notesEmptyHint = document.getElementById("notesEmptyHint");
  const noteEditId = document.getElementById("noteEditId");
  const noteSubmitBtn = document.getElementById("noteSubmitBtn");
  const noteCancelEdit = document.getElementById("noteCancelEdit");
  const noteFormTitle = document.getElementById("noteFormTitle");

  function exitNoteEditMode() {
    noteEditId.value = "";
    noteSubmitBtn.textContent = "Notu Kaydet";
    noteFormTitle.textContent = "Yeni Not Ekle";
    noteCancelEdit.style.display = "none";
  }

  function enterNoteEditMode(note) {
    document.getElementById("noteTitle").value = note.title || "";
    document.getElementById("noteText").value = note.text;
    noteEditId.value = note.id;
    noteSubmitBtn.textContent = "Notu Güncelle";
    noteFormTitle.textContent = "Notu Düzenle";
    noteCancelEdit.style.display = "inline-flex";
    closeNoteModal();
    document.querySelector('.tab-btn[data-tab="notlar"]').click();
    noteForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  noteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("noteTitle").value.trim();
    const text = document.getElementById("noteText").value.trim();
    if (!text) return;

    const editId = noteEditId.value;
    if (editId) {
      const idx = notes.findIndex((n) => n.id === editId);
      if (idx !== -1) {
        notes[idx] = { ...notes[idx], title, text };
      }
      exitNoteEditMode();
    } else {
      notes.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title,
        text,
        date: new Date().toISOString().slice(0, 10),
      });
    }
    saveNotes(notes);
    noteForm.reset();
    renderNotes();
  });

  noteCancelEdit.addEventListener("click", () => {
    noteForm.reset();
    exitNoteEditMode();
  });

  function renderNotes() {
    notesGrid.innerHTML = "";
    notesEmptyHint.style.display = notes.length ? "none" : "block";

    notes.forEach((n) => {
      const card = document.createElement("div");
      card.className = "note-card";
      card.dataset.id = n.id;
      card.innerHTML = `
        ${n.title ? `<h4>${escapeHtml(n.title)}</h4>` : ""}
        <p>${escapeHtml(n.text)}</p>
        <div class="note-footer">
          <span class="recent-meta">${fmtDateTR(n.date)}</span>
          <div class="note-footer-actions">
            <button class="edit-btn" data-id="${n.id}" title="Düzenle">✎</button>
            <button class="del-btn" data-id="${n.id}" title="Sil">✕</button>
          </div>
        </div>
      `;
      card.addEventListener("click", () => openNoteModal(n.id));
      notesGrid.appendChild(card);
    });

    notesGrid.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const n = notes.find((note) => note.id === btn.dataset.id);
        if (n) enterNoteEditMode(n);
      });
    });

    notesGrid.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteNote(btn.dataset.id);
      });
    });
  }

  function deleteNote(id) {
    notes = notes.filter((n) => n.id !== id);
    saveNotes(notes);
    renderNotes();
  }

  // ---------- Full-page note viewer ----------
  const noteModal = document.getElementById("noteModal");
  const noteModalTitle = document.getElementById("noteModalTitle");
  const noteModalDate = document.getElementById("noteModalDate");
  const noteModalText = document.getElementById("noteModalText");
  const noteModalClose = document.getElementById("noteModalClose");
  const noteModalEdit = document.getElementById("noteModalEdit");
  const noteModalDelete = document.getElementById("noteModalDelete");
  let openNoteId = null;

  function openNoteModal(id) {
    const n = notes.find((note) => note.id === id);
    if (!n) return;
    openNoteId = id;
    noteModalTitle.textContent = n.title || "Başlıksız Not";
    noteModalDate.textContent = fmtDateTR(n.date);
    noteModalText.textContent = n.text;
    noteModal.classList.add("open");
  }

  function closeNoteModal() {
    noteModal.classList.remove("open");
    openNoteId = null;
  }

  noteModalClose.addEventListener("click", closeNoteModal);

  noteModalEdit.addEventListener("click", () => {
    const n = notes.find((note) => note.id === openNoteId);
    if (n) enterNoteEditMode(n);
  });

  noteModalDelete.addEventListener("click", () => {
    if (openNoteId) deleteNote(openNoteId);
    closeNoteModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && noteModal.classList.contains("open")) closeNoteModal();
  });

  // ---------- Debts (Borçlar) ----------
  const debtForm = document.getElementById("debtForm");
  const debtDate = document.getElementById("debtDate");
  const debtEditId = document.getElementById("debtEditId");
  const debtSubmitBtn = document.getElementById("debtSubmitBtn");
  const debtCancelEdit = document.getElementById("debtCancelEdit");
  const debtFormTitle = document.getElementById("debtFormTitle");
  const debtTableBody = document.getElementById("debtTableBody");
  const debtEmptyHint = document.getElementById("debtEmptyHint");
  const debtFilterType = document.getElementById("debtFilterType");
  const debtFilterStatus = document.getElementById("debtFilterStatus");
  const sumAlacakEl = document.getElementById("sumAlacak");
  const sumBorcEl = document.getElementById("sumBorc");
  const sumNetBorcEl = document.getElementById("sumNetBorc");
  debtDate.valueAsDate = new Date();

  document.getElementById("debtCurrency").addEventListener("change", (e) => {
    const c = e.target.value;
    if (c !== "TRY" && !exchangeRates[c]) fetchRates(true);
  });

  function exitDebtEditMode() {
    debtEditId.value = "";
    debtSubmitBtn.textContent = "Kaydet";
    debtFormTitle.textContent = "Yeni Borç / Alacak Ekle";
    debtCancelEdit.style.display = "none";
  }

  debtForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("debtType").value;
    const rawAmount = parseFloat(document.getElementById("debtAmount").value);
    const currency = document.getElementById("debtCurrency").value;
    const date = document.getElementById("debtDate").value;
    const person = document.getElementById("debtPerson").value.trim();
    const desc = document.getElementById("debtDesc").value.trim();

    if (!rawAmount || rawAmount <= 0 || !date || !person) return;

    const amount = await resolveTRYAmount(rawAmount, currency);
    if (amount === null) return;

    const editId = debtEditId.value;
    if (editId) {
      const idx = debts.findIndex((d) => d.id === editId);
      if (idx !== -1) {
        debts[idx] = { ...debts[idx], type, amount, currency, originalAmount: rawAmount, date, person, desc };
      }
      exitDebtEditMode();
    } else {
      debts.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        type,
        amount,
        currency,
        originalAmount: rawAmount,
        date,
        person,
        desc,
        paid: false,
      });
    }
    saveDebts(debts);
    debtForm.reset();
    debtDate.valueAsDate = new Date();
    renderDebts();
  });

  debtCancelEdit.addEventListener("click", () => {
    debtForm.reset();
    debtDate.valueAsDate = new Date();
    exitDebtEditMode();
  });

  debtFilterType.addEventListener("change", renderDebts);
  debtFilterStatus.addEventListener("change", renderDebts);

  function filteredDebts() {
    return debts
      .filter((d) => (debtFilterType.value ? d.type === debtFilterType.value : true))
      .filter((d) => {
        if (!debtFilterStatus.value) return true;
        return debtFilterStatus.value === "paid" ? d.paid : !d.paid;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  function renderDebts() {
    const rows = filteredDebts();
    debtTableBody.innerHTML = "";
    debtEmptyHint.style.display = rows.length ? "none" : "block";

    rows.forEach((d) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtDateTR(d.date)}</td>
        <td>${d.type === "alacak" ? "Alacak" : "Borç"}</td>
        <td>${escapeHtml(d.person)}</td>
        <td>${escapeHtml(d.desc || "—")}</td>
        <td class="amount-${d.type === "alacak" ? "gelir" : "gider"}">${fmtTxAmount(d)}</td>
        <td>
          <button class="debt-status-badge ${d.paid ? "paid" : "unpaid"}" data-id="${d.id}">
            ${d.paid ? "Ödendi" : "Ödenmedi"}
          </button>
        </td>
        <td>
          <button class="edit-btn" data-id="${d.id}" title="Düzenle">✎</button>
          <button class="del-btn" data-id="${d.id}" title="Sil">✕</button>
        </td>
      `;
      debtTableBody.appendChild(tr);
    });

    debtTableBody.querySelectorAll(".debt-status-badge").forEach((btn) => {
      btn.addEventListener("click", () => {
        const d = debts.find((debt) => debt.id === btn.dataset.id);
        if (!d) return;
        d.paid = !d.paid;
        saveDebts(debts);
        renderDebts();
      });
    });

    debtTableBody.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const d = debts.find((debt) => debt.id === btn.dataset.id);
        if (!d) return;
        document.getElementById("debtType").value = d.type;
        document.getElementById("debtAmount").value = d.originalAmount != null ? d.originalAmount : d.amount;
        document.getElementById("debtCurrency").value = d.currency || "TRY";
        document.getElementById("debtDate").value = d.date;
        document.getElementById("debtPerson").value = d.person;
        document.getElementById("debtDesc").value = d.desc || "";
        debtEditId.value = d.id;
        debtSubmitBtn.textContent = "Güncelle";
        debtFormTitle.textContent = "Borç / Alacağı Düzenle";
        debtCancelEdit.style.display = "inline-flex";
        document.querySelector('.tab-btn[data-tab="borclar"]').click();
        debtForm.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    debtTableBody.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        debts = debts.filter((d) => d.id !== btn.dataset.id);
        saveDebts(debts);
        renderDebts();
      });
    });

    const totalAlacak = debts.filter((d) => d.type === "alacak" && !d.paid).reduce((s, d) => s + d.amount, 0);
    const totalBorc = debts.filter((d) => d.type === "borc" && !d.paid).reduce((s, d) => s + d.amount, 0);
    sumAlacakEl.textContent = fmtTRY(totalAlacak);
    sumBorcEl.textContent = fmtTRY(totalBorc);
    sumNetBorcEl.textContent = fmtTRY(totalAlacak - totalBorc);
  }

  // ---------- Loan calculator ----------
  document.getElementById("loanForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const principal = parseFloat(document.getElementById("loanAmount").value);
    const annualRate = parseFloat(document.getElementById("loanRate").value);
    const months = parseInt(document.getElementById("loanMonths").value, 10);
    const result = document.getElementById("loanResult");

    if (!principal || !months || annualRate < 0) return;

    const monthlyRate = annualRate / 100 / 12;
    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = principal / months;
    } else {
      monthlyPayment =
        (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);
    }
    const totalPayment = monthlyPayment * months;
    const totalInterest = totalPayment - principal;

    result.innerHTML = `
      <div class="result-row"><span>Aylık Taksit</span><strong>${fmtTRY(monthlyPayment)}</strong></div>
      <div class="result-row"><span>Toplam Geri Ödeme</span><strong>${fmtTRY(totalPayment)}</strong></div>
      <div class="result-row"><span>Toplam Faiz</span><strong>${fmtTRY(totalInterest)}</strong></div>
    `;
    result.classList.add("show");
  });

  // ---------- Budget calculator ----------
  document.getElementById("budgetForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const income = parseFloat(document.getElementById("budgetIncome").value);
    const result = document.getElementById("budgetResult");
    if (!income || income <= 0) return;

    const needs = income * 0.5;
    const wants = income * 0.3;
    const savings = income * 0.2;

    result.innerHTML = `
      <div class="result-row"><span>İhtiyaçlar (%50)</span><strong>${fmtTRY(needs)}</strong></div>
      <div class="result-row"><span>İstekler (%30)</span><strong>${fmtTRY(wants)}</strong></div>
      <div class="result-row"><span>Tasarruf / Borç (%20)</span><strong>${fmtTRY(savings)}</strong></div>
    `;
    result.classList.add("show");
  });

  // ---------- Simple calculator ----------
  const calcDisplay = document.getElementById("calcDisplay");
  const calcGrid = document.getElementById("calcGrid");
  let calcExpr = "";

  function calcRender() {
    calcDisplay.value = calcExpr === "" ? "0" : calcExpr.replace(/\*/g, "×").replace(/\//g, "÷");
  }

  calcGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".calc-btn");
    if (!btn) return;
    const key = btn.dataset.key;

    if (key === "C") {
      calcExpr = "";
    } else if (key === "⌫") {
      calcExpr = calcExpr.slice(0, -1);
    } else if (key === "=") {
      try {
        const sanitized = calcExpr.replace(/,/g, ".");
        if (!/^[0-9.+\-*/%\s]+$/.test(sanitized)) throw new Error("invalid");
        // eslint-disable-next-line no-new-func
        const value = Function('"use strict"; return (' + sanitized + ")")();
        calcExpr = Number.isFinite(value) ? String(value).replace(".", ",") : "";
      } catch {
        calcExpr = "Hata";
      }
    } else if (key === ".") {
      calcExpr += ",";
    } else {
      calcExpr += key;
    }
    calcRender();
  });

  // ---------- Currency converter (USD/EUR -> TRY) ----------
  // 1 USD/EUR has been well above 5 TRY and nowhere near 500 TRY for
  // years; anything outside that band is a bad fetch/typo, not a real
  // rate, and must never be shown or saved (this is what let "1 USD = 2
  // TRY" slip through before).
  function isPlausibleRate(n) {
    return typeof n === "number" && Number.isFinite(n) && n > 5 && n < 500;
  }

  let exchangeRates = { USD: null, EUR: null, updatedAt: null };
  let ratesFetchPromise = null;

  function loadRates() {
    try {
      const raw = localStorage.getItem(RATES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      exchangeRates = {
        USD: isPlausibleRate(parsed.USD) ? parsed.USD : null,
        EUR: isPlausibleRate(parsed.EUR) ? parsed.EUR : null,
        updatedAt: parsed.updatedAt || null,
      };
    } catch {
      // keep defaults
    }
  }

  const fxRateUSDDisplay = document.getElementById("fxRateUSDDisplay");
  const fxRateEURDisplay = document.getElementById("fxRateEURDisplay");
  const fxUpdatedAt = document.getElementById("fxUpdatedAt");
  const fxRefreshBtn = document.getElementById("fxRefreshBtn");
  const fxAmountInput = document.getElementById("fxAmount");
  const fxCurrencySelect = document.getElementById("fxCurrencySelect");
  const fxResultLive = document.getElementById("fxResultLive");
  const fxTryAmountInput = document.getElementById("fxTryAmount");
  const fxReverseCurrencySelect = document.getElementById("fxReverseCurrencySelect");
  const fxResultLiveReverse = document.getElementById("fxResultLiveReverse");

  function flashRateChange(el, prev, next) {
    if (prev == null || next == null || prev === next) return;
    el.classList.remove("rate-flash-up", "rate-flash-down");
    void el.offsetWidth; // animasyonu yeniden başlatmak için reflow tetikle
    el.classList.add(next > prev ? "rate-flash-up" : "rate-flash-down");
  }

  function renderRates() {
    fxRateUSDDisplay.textContent = exchangeRates.USD ? fmtTRY(exchangeRates.USD) : "—";
    fxRateEURDisplay.textContent = exchangeRates.EUR ? fmtTRY(exchangeRates.EUR) : "—";
    fxUpdatedAt.textContent = exchangeRates.updatedAt
      ? "Son güncelleme: " + new Date(exchangeRates.updatedAt).toLocaleString("tr-TR")
      : "Kur bilgisi henüz alınamadı.";
    updateLiveConvert();
    updateReverseConvert();
  }

  function saveRates(rates) {
    const prevUSD = exchangeRates.USD;
    const prevEUR = exchangeRates.EUR;
    exchangeRates = rates;
    localStorage.setItem(RATES_KEY, JSON.stringify(exchangeRates));
    renderRates();
    flashRateChange(fxRateUSDDisplay, prevUSD, rates.USD);
    flashRateChange(fxRateEURDisplay, prevEUR, rates.EUR);
  }

  function updateLiveConvert() {
    const amount = parseFloat(fxAmountInput.value);
    const currency = fxCurrencySelect.value;
    const rate = exchangeRates[currency];
    fxResultLive.textContent = amount && rate ? fmtTRY(amount * rate) : "₺0,00";
  }
  fxAmountInput.addEventListener("input", updateLiveConvert);
  fxCurrencySelect.addEventListener("change", updateLiveConvert);

  function updateReverseConvert() {
    const amount = parseFloat(fxTryAmountInput.value);
    const currency = fxReverseCurrencySelect.value;
    const rate = exchangeRates[currency];
    fxResultLiveReverse.textContent = amount && rate ? fmtForeign(amount / rate, currency) : CURRENCY_SYMBOLS[currency] + "0,00";
  }
  fxTryAmountInput.addEventListener("input", updateReverseConvert);
  fxReverseCurrencySelect.addEventListener("change", updateReverseConvert);

  // Fetches live rates; on failure (or an implausible response), keeps
  // whatever is cached instead of overwriting it with garbage. Only one
  // fetch runs at a time so repeated triggers (page load, currency pick,
  // refresh button, periodic poll) share the same in-flight request.
  function fetchRates(silent) {
    if (ratesFetchPromise) return ratesFetchPromise;
    fxRefreshBtn.classList.add("spinning");
    ratesFetchPromise = (async () => {
      try {
        // Single request, USD-based: TRY is the USD rate directly, and
        // EUR/TRY is derived as TRY-per-USD ÷ EUR-per-USD.
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        if (!res.ok) throw new Error("fx fetch failed");
        const data = await res.json();
        const usdToTry = data.rates && data.rates.TRY;
        const usdToEur = data.rates && data.rates.EUR;
        const eurToTry = usdToEur ? usdToTry / usdToEur : null;

        if (!isPlausibleRate(usdToTry) || !isPlausibleRate(eurToTry)) {
          throw new Error("fx rate out of range");
        }

        saveRates({ USD: usdToTry, EUR: eurToTry, updatedAt: new Date().toISOString() });
        return true;
      } catch {
        if (!silent) {
          window.alert("Kur bilgisi alınamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.");
        }
        return false;
      } finally {
        fxRefreshBtn.classList.remove("spinning");
        ratesFetchPromise = null;
      }
    })();
    return ratesFetchPromise;
  }
  fxRefreshBtn.addEventListener("click", () => fetchRates(false));

  // Kur her an değişebildiği için düzenli aralıklarla ve sekme tekrar
  // görünür olduğunda sessizce tazele; en ufak (1 kuruş) değişiklik bile
  // renkli bir "flaş" ile fxRateUSDDisplay/fxRateEURDisplay üzerinde belli olur.
  setInterval(() => fetchRates(true), 60000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") fetchRates(true);
  });

  // İşlem ve borç formlarının ortak para birimi çözümleyicisi: kur
  // cache'te varsa direkt kullanır, yoksa sessizce tazelemeyi dener,
  // o da olmazsa kullanıcıya tek seferlik kur sorar (iptal ederse null döner).
  async function resolveTRYAmount(rawAmount, currency) {
    if (currency === "TRY") return rawAmount;
    let rate = exchangeRates[currency];
    if (!rate) {
      await fetchRates(true);
      rate = exchangeRates[currency];
    }
    if (!rate) {
      let manualRate = null;
      while (manualRate === null) {
        const manual = window.prompt(`Güncel kur alınamadı. 1 ${currency} kaç TL? (örn: 35.20)`);
        if (manual === null) return null; // vazgeçildi
        const parsed = parseFloat(manual.replace(",", "."));
        if (isPlausibleRate(parsed)) {
          manualRate = parsed;
        } else {
          window.alert("Geçerli bir kur girin (örn: 35.20). Çok küçük veya çok büyük bir değer girildi.");
        }
      }
      rate = manualRate;
      saveRates({ ...exchangeRates, [currency]: manualRate, updatedAt: new Date().toISOString() });
    }
    return rawAmount * rate;
  }

  loadRates();
  renderRates();
  fetchRates(true);

  // ---------- Puter (giriş yap + bulut yedekleme) ----------
  const puterBtn = document.getElementById("puterBtn");
  const settingsPuterBtn = document.getElementById("settingsPuterBtn");
  const settingsPuterStatus = document.getElementById("settingsPuterStatus");
  let puterSignedIn = false;

  function updatePuterButton(user) {
    puterSignedIn = !!user;
    [puterBtn, settingsPuterBtn].forEach((btn) => {
      if (!btn) return;
      if (user) {
        btn.textContent = (user.username || "Kullanıcı") + " · Çıkış Yap";
        btn.dataset.state = "in";
      } else {
        btn.textContent = "Puter ile Giriş Yap";
        btn.dataset.state = "out";
      }
    });
    if (settingsPuterStatus) {
      settingsPuterStatus.textContent = user ? "Bağlı: " + (user.username || "Kullanıcı") : "Bağlı değil";
    }
  }

  async function pushToPuter() {
    if (!puterSignedIn || typeof puter === "undefined" || !puter.kv) return;
    try {
      await puter.kv.set(PUTER_KEY, JSON.stringify({ transactions, notes, debts }));
    } catch {
      // sessizce yut, yerel veriler zaten kaydedildi
    }
  }

  async function syncFromPuter() {
    if (typeof puter === "undefined" || !puter.kv) return;
    try {
      const remote = await puter.kv.get(PUTER_KEY);
      if (remote) {
        const data = JSON.parse(remote);
        transactions = Array.isArray(data.transactions) ? data.transactions : transactions;
        notes = Array.isArray(data.notes) ? data.notes : notes;
        debts = Array.isArray(data.debts) ? data.debts : debts;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
        localStorage.setItem(DEBTS_KEY, JSON.stringify(debts));
      } else {
        await pushToPuter();
      }
      renderAll();
      renderNotes();
      renderDebts();
    } catch {
      // bağlantı yoksa yerel veriyle devam et
    }
  }

  async function initPuter() {
    if (typeof puter === "undefined" || !puter.auth) {
      puterBtn.style.display = "none";
      if (settingsPuterBtn) settingsPuterBtn.style.display = "none";
      if (settingsPuterStatus) settingsPuterStatus.textContent = "Puter kullanılamıyor";
      return;
    }
    try {
      const signedIn = await puter.auth.isSignedIn();
      if (signedIn) {
        const user = await puter.auth.getUser();
        updatePuterButton(user);
        await syncFromPuter();
      } else {
        updatePuterButton(null);
      }
    } catch {
      updatePuterButton(null);
    }
  }

  async function handlePuterClick(btn) {
    if (typeof puter === "undefined") return;
    if (btn.dataset.state === "in") {
      try {
        await puter.auth.signOut();
      } catch {}
      updatePuterButton(null);
      return;
    }
    try {
      await puter.auth.signIn();
      const user = await puter.auth.getUser();
      updatePuterButton(user);
      await syncFromPuter();
    } catch {
      // kullanıcı girişi iptal etti veya bir hata oluştu
    }
  }

  puterBtn.addEventListener("click", () => handlePuterClick(puterBtn));
  if (settingsPuterBtn) settingsPuterBtn.addEventListener("click", () => handlePuterClick(settingsPuterBtn));

  // ---------- Display name ----------
  const DISPLAY_NAME_KEY = "transfer212.displayName";
  const displayNameInput = document.getElementById("displayNameInput");
  const headerGreeting = document.getElementById("headerGreeting");

  function updateGreeting() {
    const name = localStorage.getItem(DISPLAY_NAME_KEY);
    if (name) {
      headerGreeting.textContent = "Merhaba, " + name;
      headerGreeting.style.display = "inline";
    } else {
      headerGreeting.style.display = "none";
    }
  }

  displayNameInput.value = localStorage.getItem(DISPLAY_NAME_KEY) || "";
  document.getElementById("displayNameSave").addEventListener("click", () => {
    const name = displayNameInput.value.trim();
    if (name) localStorage.setItem(DISPLAY_NAME_KEY, name);
    else localStorage.removeItem(DISPLAY_NAME_KEY);
    updateGreeting();
  });
  updateGreeting();

  // ---------- App lock (PIN) ----------
  const APPLOCK_KEY = "transfer212.applock";
  const PIN_KEY = "transfer212.pin";
  const appLockSwitch = document.getElementById("appLockSwitch");
  const setPinPanel = document.getElementById("setPinPanel");
  const newPinInput = document.getElementById("newPinInput");
  const confirmPinInput = document.getElementById("confirmPinInput");
  const pinError = document.getElementById("pinError");

  appLockSwitch.checked = localStorage.getItem(APPLOCK_KEY) === "1";

  appLockSwitch.addEventListener("change", () => {
    if (appLockSwitch.checked) {
      setPinPanel.style.display = "block";
    } else {
      localStorage.removeItem(APPLOCK_KEY);
      localStorage.removeItem(PIN_KEY);
      setPinPanel.style.display = "none";
    }
  });

  document.getElementById("savePinBtn").addEventListener("click", () => {
    const pin = newPinInput.value.trim();
    const confirmPin = confirmPinInput.value.trim();
    pinError.style.display = "none";

    if (!/^\d{4,6}$/.test(pin)) {
      pinError.textContent = "PIN 4-6 haneli rakamlardan oluşmalı.";
      pinError.style.display = "block";
      return;
    }
    if (pin !== confirmPin) {
      pinError.textContent = "PIN'ler eşleşmiyor.";
      pinError.style.display = "block";
      return;
    }

    localStorage.setItem(PIN_KEY, pin);
    localStorage.setItem(APPLOCK_KEY, "1");
    setPinPanel.style.display = "none";
    newPinInput.value = "";
    confirmPinInput.value = "";
  });

  const lockScreen = document.getElementById("lockScreen");
  const lockPinInput = document.getElementById("lockPinInput");
  const lockError = document.getElementById("lockError");

  function checkAppLock() {
    if (localStorage.getItem(APPLOCK_KEY) === "1" && localStorage.getItem(PIN_KEY)) {
      lockScreen.classList.add("show");
      lockPinInput.focus();
    }
  }

  function tryUnlock() {
    const storedPin = localStorage.getItem(PIN_KEY);
    if (lockPinInput.value === storedPin) {
      lockScreen.classList.remove("show");
      lockPinInput.value = "";
      lockError.style.display = "none";
    } else {
      lockError.style.display = "block";
      lockPinInput.value = "";
    }
  }

  document.getElementById("lockUnlockBtn").addEventListener("click", tryUnlock);
  lockPinInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryUnlock();
  });

  // ---------- Data management ----------
  document.getElementById("exportDataBtn").addEventListener("click", () => {
    const data = { transactions, notes, debts, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transfer212-yedek-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  });

  const importDataInput = document.getElementById("importDataInput");
  document.getElementById("importDataBtn").addEventListener("click", () => importDataInput.click());

  importDataInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.transactions)) transactions = data.transactions;
        if (Array.isArray(data.notes)) notes = data.notes;
        if (Array.isArray(data.debts)) debts = data.debts;
        saveTx(transactions);
        saveNotes(notes);
        saveDebts(debts);
        renderAll();
        renderNotes();
        renderDebts();
        window.alert("Veriler başarıyla içe aktarıldı.");
      } catch {
        window.alert("Dosya okunamadı. Geçerli bir yedek dosyası seçin.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  document.getElementById("clearDataBtn").addEventListener("click", () => {
    if (!window.confirm("Tüm işlemler, notlar ve borç/alacak kayıtları silinecek. Emin misiniz?")) return;
    transactions = [];
    notes = [];
    debts = [];
    saveTx(transactions);
    saveNotes(notes);
    saveDebts(debts);
    renderAll();
    renderNotes();
    renderDebts();
  });

  // ---------- Loading screen ----------
  function hideLoadingScreen() {
    const el = document.getElementById("loadingScreen");
    if (!el) return;
    el.classList.add("hide");
    setTimeout(() => el.remove(), 400);
  }

  function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ---------- Init ----------
  renderAll();
  renderNotes();
  renderDebts();
  Promise.race([initPuter(), timeout(3000)]).then(() => {
    hideLoadingScreen();
    checkAppLock();
  });
})();
