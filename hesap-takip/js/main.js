(function () {
  "use strict";

  const STORAGE_KEY = "hesapDefterim.transactions.v1";
  const NOTES_KEY = "transfer212.notes.v1";
  const THEME_KEY = "transfer212.theme";
  const PUTER_KEY = "transfer212_data";

  const fmtTRY = (n) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n || 0);

  const fmtDateTR = (isoDate) => {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

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

  let transactions = loadTx();
  let notes = loadNotes();

  // ---------- Theme ----------
  const themeToggle = document.getElementById("themeToggle");

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  themeToggle.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
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

  txForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const type = document.getElementById("txType").value;
    const amount = parseFloat(document.getElementById("txAmount").value);
    const date = document.getElementById("txDate").value;
    const category = document.getElementById("txCategory").value.trim();
    const desc = document.getElementById("txDesc").value.trim();

    if (!amount || amount <= 0 || !date || !category) return;

    const editId = txEditId.value;
    if (editId) {
      const idx = transactions.findIndex((t) => t.id === editId);
      if (idx !== -1) {
        transactions[idx] = { ...transactions[idx], type, amount, date, category, desc };
      }
      exitEditMode();
    } else {
      transactions.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        type,
        amount,
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
        <td class="amount-${t.type}">${t.type === "gider" ? "-" : "+"}${fmtTRY(t.amount)}</td>
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
        document.getElementById("txAmount").value = t.amount;
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

  // ---------- Puter (giriş yap + bulut yedekleme) ----------
  const puterBtn = document.getElementById("puterBtn");
  let puterSignedIn = false;

  function updatePuterButton(user) {
    puterSignedIn = !!user;
    if (user) {
      puterBtn.textContent = (user.username || "Kullanıcı") + " · Çıkış Yap";
      puterBtn.dataset.state = "in";
    } else {
      puterBtn.textContent = "Puter ile Giriş Yap";
      puterBtn.dataset.state = "out";
    }
  }

  async function pushToPuter() {
    if (!puterSignedIn || typeof puter === "undefined" || !puter.kv) return;
    try {
      await puter.kv.set(PUTER_KEY, JSON.stringify({ transactions, notes }));
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
      } else {
        await pushToPuter();
      }
      renderAll();
      renderNotes();
    } catch {
      // bağlantı yoksa yerel veriyle devam et
    }
  }

  async function initPuter() {
    if (typeof puter === "undefined" || !puter.auth) {
      puterBtn.style.display = "none";
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

  puterBtn.addEventListener("click", async () => {
    if (typeof puter === "undefined") return;
    if (puterBtn.dataset.state === "in") {
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
  Promise.race([initPuter(), timeout(3000)]).then(hideLoadingScreen);
})();
