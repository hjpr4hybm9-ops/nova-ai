(function () {
  "use strict";

  const STORAGE_KEY = "hesapDefterim.transactions.v1";

  const fmtTRY = (n) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n || 0);

  const fmtDateTR = (isoDate) => {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

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
  }

  let transactions = loadTx();

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
  txDate.valueAsDate = new Date();

  txForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const type = document.getElementById("txType").value;
    const amount = parseFloat(document.getElementById("txAmount").value);
    const date = document.getElementById("txDate").value;
    const category = document.getElementById("txCategory").value.trim();
    const desc = document.getElementById("txDesc").value.trim();

    if (!amount || amount <= 0 || !date || !category) return;

    transactions.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      amount,
      date,
      category,
      desc,
    });
    saveTx(transactions);
    txForm.reset();
    txDate.valueAsDate = new Date();

    renderAll();
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
        <td class="amount-${t.type}">${t.type === "gider" ? "-" : "+"}${fmtTRY(t.amount)}</td>
        <td><button class="del-btn" data-id="${t.id}" title="Sil">✕</button></td>
      `;
      txTableBody.appendChild(tr);
    });

    txTableBody.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        transactions = transactions.filter((t) => t.id !== btn.dataset.id);
        saveTx(transactions);
        renderAll();
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Overview ----------
  const sumIncomeEl = document.getElementById("sumIncome");
  const sumExpenseEl = document.getElementById("sumExpense");
  const sumBalanceEl = document.getElementById("sumBalance");
  const categoryBars = document.getElementById("categoryBars");
  const categoryEmptyHint = document.getElementById("categoryEmptyHint");
  const recentList = document.getElementById("recentList");
  const recentEmptyHint = document.getElementById("recentEmptyHint");

  function renderOverview() {
    const totalIncome = transactions.filter((t) => t.type === "gelir").reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === "gider").reduce((s, t) => s + t.amount, 0);

    sumIncomeEl.textContent = fmtTRY(totalIncome);
    sumExpenseEl.textContent = fmtTRY(totalExpense);
    sumBalanceEl.textContent = fmtTRY(totalIncome - totalExpense);

    // Category bars (expenses only)
    const byCategory = {};
    transactions
      .filter((t) => t.type === "gider")
      .forEach((t) => {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      });

    const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    categoryBars.innerHTML = "";
    categoryEmptyHint.style.display = entries.length ? "none" : "block";
    const maxVal = entries.length ? entries[0][1] : 1;

    entries.forEach(([cat, val]) => {
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `
        <span>${escapeHtml(cat)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(val / maxVal) * 100}%"></span></span>
        <span>${fmtTRY(val)}</span>
      `;
      categoryBars.appendChild(row);
    });

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
        <span class="amount-${t.type}">${t.type === "gider" ? "-" : "+"}${fmtTRY(t.amount)}</span>
      `;
      recentList.appendChild(li);
    });
  }

  function renderAll() {
    populateMonthFilter();
    renderTxTable();
    renderOverview();
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

  // ---------- Init ----------
  renderAll();
})();
