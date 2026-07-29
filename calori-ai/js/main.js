(function () {
  "use strict";

  const ENTRIES_KEY = "caloriai.entries.v1";
  const GOALS_KEY = "caloriai.goals.v1";
  const THEME_KEY = "caloriai.theme";
  const PUTER_KEY = "caloriai_data";
  const AI_CHAT_KEY = "caloriai.aiChat.v1";
  const DEFAULT_GOALS = { kcal: 2000, protein: 100, carbs: 250, fat: 65 };
  const MEAL_LABELS = { kahvalti: "Kahvaltı", ogle: "Öğle Yemeği", aksam: "Akşam Yemeği", atistirmalik: "Atıştırmalık" };
  const AI_GREETING = 'Merhaba! Ben Porsiyon AI 🥗 Ne yediğini yaz (örn. "1 tabak mercimek çorbası ve 2 dilim ekmek") ya da kameradan fotoğrafını göster, kalorisini tahmin edeyim.';

  const fmtKcal = (n) => Math.round(n || 0).toLocaleString("tr-TR") + " kcal";
  const fmtG = (n) => (Math.round((n || 0) * 10) / 10).toLocaleString("tr-TR") + " g";
  const fmtDateTR = (isoDate) => {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Storage ----------
  function loadEntries() {
    try {
      const raw = localStorage.getItem(ENTRIES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveEntries(list) {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(list));
    pushToPuter();
  }

  function loadGoals() {
    try {
      const raw = localStorage.getItem(GOALS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed.kcal === "number" ? parsed : { ...DEFAULT_GOALS };
    } catch {
      return { ...DEFAULT_GOALS };
    }
  }

  function saveGoals(g) {
    localStorage.setItem(GOALS_KEY, JSON.stringify(g));
    pushToPuter();
  }

  let entries = loadEntries();
  let goals = loadGoals();

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
      if (btn.dataset.tab === "gunluk") renderEntryTable();
    });
  });

  const quickCameraBtn = document.getElementById("quickCameraBtn");
  if (quickCameraBtn) {
    quickCameraBtn.addEventListener("click", () => {
      document.querySelector('.tab-btn[data-tab="ai"]').click();
      openCamera();
    });
  }

  // ---------- Toast ----------
  const toast = document.getElementById("toast");
  let toastTimer = null;

  function showToast(message, duration = 3000) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.remove("hidden");
    requestAnimationFrame(() => toast.classList.add("show"));
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.classList.add("hidden"), 200);
    }, duration);
  }

  // ---------- Entry form ----------
  const entryForm = document.getElementById("entryForm");
  const entryDate = document.getElementById("entryDate");
  const entryEditId = document.getElementById("entryEditId");
  const entrySubmitBtn = document.getElementById("entrySubmitBtn");
  const entryCancelEdit = document.getElementById("entryCancelEdit");
  const entryFormTitle = document.getElementById("entryFormTitle");
  entryDate.valueAsDate = new Date();

  function exitEntryEditMode() {
    entryEditId.value = "";
    entrySubmitBtn.textContent = "Kaydet";
    entryFormTitle.textContent = "Yeni Öğün Ekle";
    entryCancelEdit.style.display = "none";
  }

  entryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const meal = document.getElementById("entryMeal").value;
    const name = document.getElementById("entryName").value.trim();
    const date = entryDate.value;
    const kcal = parseFloat(document.getElementById("entryKcal").value);
    const protein = parseFloat(document.getElementById("entryProtein").value) || 0;
    const carbs = parseFloat(document.getElementById("entryCarbs").value) || 0;
    const fat = parseFloat(document.getElementById("entryFat").value) || 0;

    if (!name || !date || !(kcal >= 0)) return;

    const editId = entryEditId.value;
    if (editId) {
      const idx = entries.findIndex((t) => t.id === editId);
      if (idx !== -1) entries[idx] = { ...entries[idx], meal, name, date, kcal, protein, carbs, fat };
      exitEntryEditMode();
    } else {
      entries.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        meal, name, date, kcal, protein, carbs, fat,
      });
    }
    saveEntries(entries);
    entryForm.reset();
    entryDate.valueAsDate = new Date();

    renderEntryTable();
    renderOverview();
  });

  entryCancelEdit.addEventListener("click", () => {
    entryForm.reset();
    entryDate.valueAsDate = new Date();
    exitEntryEditMode();
  });

  // ---------- Filters ----------
  const filterDate = document.getElementById("filterDate");
  const filterMeal = document.getElementById("filterMeal");
  filterDate.addEventListener("change", renderEntryTable);
  filterMeal.addEventListener("change", renderEntryTable);

  function populateDateFilter() {
    const dates = new Set(entries.map((e) => e.date));
    const sorted = Array.from(dates).sort().reverse();
    const current = filterDate.value;
    filterDate.innerHTML = '<option value="">Tüm Tarihler</option>';
    sorted.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = fmtDateTR(d);
      filterDate.appendChild(opt);
    });
    filterDate.value = sorted.includes(current) ? current : "";
  }

  function filteredEntries() {
    return entries
      .filter((e) => (filterDate.value ? e.date === filterDate.value : true))
      .filter((e) => (filterMeal.value ? e.meal === filterMeal.value : true))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }

  // ---------- Table ----------
  const entryTableBody = document.getElementById("entryTableBody");
  const entryEmptyHint = document.getElementById("entryEmptyHint");

  function renderEntryTable() {
    populateDateFilter();
    const rows = filteredEntries();
    entryTableBody.innerHTML = "";
    entryEmptyHint.style.display = rows.length ? "none" : "block";

    rows.forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtDateTR(t.date)}</td>
        <td>${MEAL_LABELS[t.meal] || t.meal}</td>
        <td>${escapeHtml(t.name)}</td>
        <td>${fmtKcal(t.kcal)}</td>
        <td>${fmtG(t.protein)} / ${fmtG(t.carbs)} / ${fmtG(t.fat)}</td>
        <td>
          <button class="edit-btn" data-id="${t.id}" title="Düzenle">✎</button>
          <button class="del-btn" data-id="${t.id}" title="Sil">✕</button>
        </td>
      `;
      entryTableBody.appendChild(tr);
    });

    entryTableBody.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = entries.find((e) => e.id === btn.dataset.id);
        if (!t) return;
        document.getElementById("entryMeal").value = t.meal;
        document.getElementById("entryName").value = t.name;
        entryDate.value = t.date;
        document.getElementById("entryKcal").value = t.kcal;
        document.getElementById("entryProtein").value = t.protein;
        document.getElementById("entryCarbs").value = t.carbs;
        document.getElementById("entryFat").value = t.fat;
        entryEditId.value = t.id;
        entrySubmitBtn.textContent = "Güncelle";
        entryFormTitle.textContent = "Öğünü Düzenle";
        entryCancelEdit.style.display = "inline-flex";
        document.querySelector('.tab-btn[data-tab="gunluk"]').click();
        entryForm.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    entryTableBody.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        entries = entries.filter((e) => e.id !== btn.dataset.id);
        saveEntries(entries);
        renderEntryTable();
        renderOverview();
      });
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

  // ---------- Overview: cards + macro donut + recent + weekly bar ----------
  const sumConsumedEl = document.getElementById("sumConsumed");
  const sumGoalEl = document.getElementById("sumGoal");
  const sumRemainingEl = document.getElementById("sumRemaining");
  const remainingCard = sumRemainingEl.closest(".card");
  const recentList = document.getElementById("recentList");
  const recentEmptyHint = document.getElementById("recentEmptyHint");
  const donutWrap = document.getElementById("donutWrap");
  const donutCenterValue = document.getElementById("donutCenterValue");
  const donutLegend = document.getElementById("donutLegend");
  const donutEmptyHint = document.getElementById("donutEmptyHint");
  const barChartWrap = document.getElementById("barChartWrap");

  function renderOverview() {
    const today = todayISO();
    const todays = entries.filter((e) => e.date === today);
    const consumed = todays.reduce((s, e) => s + e.kcal, 0);
    const remaining = goals.kcal - consumed;

    sumConsumedEl.textContent = fmtKcal(consumed);
    sumGoalEl.textContent = fmtKcal(goals.kcal);
    sumRemainingEl.textContent = remaining < 0 ? "Aşım: " + fmtKcal(-remaining) : fmtKcal(remaining);
    remainingCard.classList.toggle("over", remaining < 0);

    // Recent (today's meals, most recently added first)
    const recent = [...todays].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 6);
    recentList.innerHTML = "";
    recentEmptyHint.style.display = recent.length ? "none" : "block";
    recent.forEach((t) => {
      const li = document.createElement("li");
      li.className = "recent-item";
      li.innerHTML = `
        <span>
          ${escapeHtml(t.name)}
          <div class="recent-meta">${MEAL_LABELS[t.meal] || t.meal}</div>
        </span>
        <span class="recent-kcal">${fmtKcal(t.kcal)}</span>
      `;
      recentList.appendChild(li);
    });

    renderDonut(todays);
    renderWeeklyBar();
  }

  function renderDonut(todays) {
    const protein = todays.reduce((s, e) => s + (e.protein || 0), 0);
    const carbs = todays.reduce((s, e) => s + (e.carbs || 0), 0);
    const fat = todays.reduce((s, e) => s + (e.fat || 0), 0);

    const segments = [
      { name: "Protein", grams: protein, kcalPer: 4, color: "var(--protein)", swatch: "swatch-protein" },
      { name: "Karbonhidrat", grams: carbs, kcalPer: 4, color: "var(--carbs)", swatch: "swatch-carbs" },
      { name: "Yağ", grams: fat, kcalPer: 9, color: "var(--fat)", swatch: "swatch-fat" },
    ].map((s) => ({ ...s, kcal: s.grams * s.kcalPer }));

    const totalKcal = segments.reduce((s, seg) => s + seg.kcal, 0);
    donutCenterValue.textContent = fmtKcal(totalKcal);

    donutWrap.querySelectorAll("svg").forEach((el) => el.remove());
    donutLegend.innerHTML = "";
    donutEmptyHint.style.display = totalKcal > 0 ? "none" : "block";
    if (totalKcal <= 0) return;

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
    segments.filter((s) => s.kcal > 0).forEach((seg) => {
      const frac = seg.kcal / totalKcal;
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

      const pct = ((seg.kcal / totalKcal) * 100).toFixed(1).replace(".", ",");
      const detail = `${fmtG(seg.grams)} · ${fmtKcal(seg.kcal)} · %${pct}`;
      const onHover = (e) => showTooltip(e.clientX, e.clientY, seg.name, detail);
      circle.addEventListener("pointermove", onHover);
      circle.addEventListener("pointerenter", onHover);
      circle.addEventListener("pointerleave", hideTooltip);
      circle.addEventListener("focus", () => {
        const rc = circle.getBoundingClientRect();
        showTooltip(rc.left + rc.width / 2, rc.top + rc.height / 2, seg.name, detail);
      });
      circle.addEventListener("blur", hideTooltip);

      svg.appendChild(circle);
      offset += len;
    });

    donutWrap.appendChild(svg);

    segments.forEach((seg) => {
      const item = document.createElement("span");
      item.className = "legend-item";
      const swatch = document.createElement("span");
      swatch.className = "legend-swatch " + seg.swatch;
      item.appendChild(swatch);
      item.appendChild(document.createTextNode(seg.name + " "));
      const strong = document.createElement("strong");
      strong.textContent = fmtG(seg.grams);
      item.appendChild(strong);
      donutLegend.appendChild(item);
    });
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

  function renderWeeklyBar() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("tr-TR", { weekday: "short" });
      const kcal = entries.filter((e) => e.date === iso).reduce((s, e) => s + e.kcal, 0);
      days.push({ iso, label, kcal });
    }

    const maxVal = Math.max(1, goals.kcal, ...days.map((d) => d.kcal));
    const step = niceStep(maxVal);
    const chartMax = step * Math.ceil((maxVal * 1.05) / step);
    const gridValues = [];
    for (let v = 0; v <= chartMax; v += step) gridValues.push(v);

    const width = 700;
    const height = 240;
    const padLeft = 56;
    const padRight = 12;
    const padTop = 16;
    const padBottom = 30;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const groupW = plotW / 7;
    const barW = Math.min(46, groupW * 0.55);

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", height);
    svg.style.minWidth = "560px";

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

    // Goal reference line
    const goalY = padTop + plotH - (chartMax ? (goals.kcal / chartMax) * plotH : 0);
    const goalLine = document.createElementNS(svgNS, "line");
    goalLine.setAttribute("x1", padLeft);
    goalLine.setAttribute("x2", width - padRight);
    goalLine.setAttribute("y1", goalY);
    goalLine.setAttribute("y2", goalY);
    goalLine.setAttribute("stroke", "var(--brand)");
    goalLine.setAttribute("stroke-width", "2");
    goalLine.setAttribute("stroke-dasharray", "6 5");
    svg.appendChild(goalLine);

    days.forEach((day, i) => {
      const groupX = padLeft + i * groupW;
      const centerX = groupX + groupW / 2;

      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", centerX);
      text.setAttribute("y", height - padBottom + 18);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("class", "chart-axis-label");
      text.textContent = day.label;
      svg.appendChild(text);

      const h = chartMax ? (day.kcal / chartMax) * plotH : 0;
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", centerX - barW / 2);
      rect.setAttribute("y", padTop + plotH - h);
      rect.setAttribute("width", barW);
      rect.setAttribute("height", Math.max(h, 0));
      rect.setAttribute("rx", 5);
      rect.setAttribute("fill", day.kcal > goals.kcal ? "var(--over)" : "var(--accent)");
      rect.setAttribute("class", "bar-rect");
      rect.setAttribute("tabindex", "0");

      const onHover = (e) => showTooltip(e.clientX, e.clientY, fmtDateTR(day.iso), fmtKcal(day.kcal));
      rect.addEventListener("pointermove", onHover);
      rect.addEventListener("pointerenter", onHover);
      rect.addEventListener("pointerleave", hideTooltip);
      rect.addEventListener("focus", () => {
        const rc = rect.getBoundingClientRect();
        showTooltip(rc.left + rc.width / 2, rc.top, fmtDateTR(day.iso), fmtKcal(day.kcal));
      });
      rect.addEventListener("blur", hideTooltip);

      svg.appendChild(rect);
    });

    barChartWrap.innerHTML = "";
    barChartWrap.appendChild(svg);
  }

  // ---------- AI Kalori Analizi ----------
  const aiChat = document.getElementById("aiChat");
  const aiForm = document.getElementById("aiForm");
  const aiInput = document.getElementById("aiInput");
  const aiSend = document.getElementById("aiSend");
  const aiHint = document.getElementById("aiHint");
  const cameraBtn = document.getElementById("cameraBtn");
  const cameraOverlay = document.getElementById("cameraOverlay");
  const cameraVideo = document.getElementById("cameraVideo");
  const cameraCanvas = document.getElementById("cameraCanvas");
  const captureBtn = document.getElementById("captureBtn");
  const cameraCancelBtn = document.getElementById("cameraCancelBtn");
  const clearAiChatBtn = document.getElementById("clearAiChatBtn");

  const SYSTEM_PROMPT = `Sen Porsiyon AI'sın, beslenme ve kalori tahmini konusunda uzmanlaşmış bir yapay zekâ asistanısın.
Türkçe konuş, sıcak ve motive edici bir dille yaz. Kullanıcı bir yemek adı, açıklaması ya da fotoğrafı paylaştığında bu yemeğin YAKLAŞIK besin değerlerini tahmin et.
Cevabını HER ZAMAN tam olarak aşağıdaki formatta, ayrı satırlar halinde ver (başka başlık ekleme, etiketleri değiştirme):

Kalori: <sayı> kcal
Protein: <sayı> g
Karbonhidrat: <sayı> g
Yağ: <sayı> g
Not: <kısa açıklama, porsiyon varsayımı veya öneri>

Porsiyon belirtilmemişse ortalama bir porsiyon varsay ve bunu Not kısmında belirt. Emin olmadığın durumlarda da en makul tahmini yap, sayıları asla boş bırakma.`;

  let isThinking = false;

  function loadAiMessages() {
    try {
      const raw = localStorage.getItem(AI_CHAT_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {}
    return [{ role: "ai", text: AI_GREETING }];
  }

  function saveAiMessages() {
    try {
      localStorage.setItem(AI_CHAT_KEY, JSON.stringify(aiMessages.slice(-40)));
    } catch {}
  }

  let aiMessages = loadAiMessages();

  function mealForNow() {
    const h = new Date().getHours();
    if (h < 11) return "kahvalti";
    if (h < 16) return "ogle";
    if (h < 21) return "aksam";
    return "atistirmalik";
  }

  function parseMacros(text) {
    const kcalM = text.match(/Kalori:\s*([\d.,]+)/i);
    if (!kcalM) return null;
    const num = (m) => (m ? parseFloat(m[1].replace(",", ".")) : 0);
    return {
      kcal: num(kcalM),
      protein: num(text.match(/Protein:\s*([\d.,]+)/i)),
      carbs: num(text.match(/Karbonhidrat:\s*([\d.,]+)/i)),
      fat: num(text.match(/Yağ:\s*([\d.,]+)/i)),
    };
  }

  function addBubble(role, text, imageDataURL) {
    const row = document.createElement("div");
    row.className = "demo-row demo-" + role;

    const bubble = document.createElement("div");
    bubble.className = "demo-bubble";

    if (imageDataURL) {
      const img = document.createElement("img");
      img.src = imageDataURL;
      bubble.appendChild(img);
    }

    if (text) {
      const span = document.createElement("span");
      span.textContent = text;
      bubble.appendChild(span);
    }

    row.appendChild(bubble);
    aiChat.appendChild(row);
    aiChat.scrollTop = aiChat.scrollHeight;
    return row;
  }

  function addAddToJournalButton(macros, sourceName) {
    const row = document.createElement("div");
    row.className = "demo-row demo-ai";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "macro-suggest";
    btn.textContent = `➕ Günlüğe Ekle (${fmtKcal(macros.kcal)})`;
    btn.addEventListener("click", () => {
      entries.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        meal: mealForNow(),
        name: sourceName || "AI Tahmini",
        date: todayISO(),
        kcal: macros.kcal,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
      });
      saveEntries(entries);
      renderEntryTable();
      renderOverview();
      btn.disabled = true;
      btn.textContent = "✅ Günlüğe eklendi";
      showToast("✅ Günlüğe eklendi");
    });
    row.appendChild(btn);
    aiChat.appendChild(row);
    aiChat.scrollTop = aiChat.scrollHeight;
  }

  function renderAiChat() {
    aiChat.innerHTML = "";
    aiMessages.forEach((m) => {
      addBubble(m.role, m.text);
      if (m.role === "ai") {
        const macros = parseMacros(m.text);
        if (macros) addAddToJournalButton(macros, m.forName);
      }
    });
  }

  function pushAiMessage(role, text, forName) {
    aiMessages.push({ role, text, forName });
    if (aiMessages.length > 40) aiMessages = aiMessages.slice(-40);
    saveAiMessages();
  }

  function buildAiHistory() {
    return aiMessages
      .filter((m) => m.role === "user" || m.role === "ai")
      .slice(-20)
      .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
  }

  function addTyping() {
    const row = document.createElement("div");
    row.className = "demo-row demo-ai";
    const bubble = document.createElement("div");
    bubble.className = "demo-bubble";
    bubble.innerHTML = '<span class="demo-typing"><span></span><span></span><span></span></span>';
    row.appendChild(bubble);
    aiChat.appendChild(row);
    aiChat.scrollTop = aiChat.scrollHeight;
    return row;
  }

  function extractText(response) {
    if (!response) return "";
    if (typeof response === "string") return response;
    if (response.message && typeof response.message.content === "string") return response.message.content;
    if (typeof response.text === "string") return response.text;
    return String(response);
  }

  async function getReply() {
    if (typeof puter === "undefined" || !puter.ai || typeof puter.ai.chat !== "function") {
      throw new Error("AI motoru yüklenemedi.");
    }
    const apiMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...buildAiHistory()];
    const response = await puter.ai.chat(apiMessages);
    const reply = extractText(response).trim();
    if (!reply) throw new Error("Boş yanıt geldi.");
    return reply;
  }

  async function getVisionReply(userText, imageDataURL) {
    if (typeof puter === "undefined" || !puter.ai || typeof puter.ai.chat !== "function") {
      throw new Error("AI motoru yüklenemedi.");
    }
    const prompt = `${SYSTEM_PROMPT}\n\nKullanıcının notu: ${userText || "(yok)"}\n\nFotoğraftaki yemeği tanı ve yukarıdaki formatta besin değerlerini tahmin et.`;
    const response = await puter.ai.chat(prompt, imageDataURL);
    const reply = extractText(response).trim();
    if (!reply) throw new Error("Boş yanıt geldi.");
    return reply;
  }

  async function ask(text, imageDataURL) {
    if (isThinking) return;
    if (!text && !imageDataURL) return;

    addBubble("user", text, imageDataURL);
    pushAiMessage("user", imageDataURL ? `[📷 Fotoğraf gönderildi] ${text || ""}`.trim() : text);

    isThinking = true;
    aiSend.disabled = true;
    aiInput.disabled = true;
    aiHint.textContent = "Porsiyon AI hesaplıyor...";

    const typingRow = addTyping();

    try {
      const reply = imageDataURL ? await getVisionReply(text, imageDataURL) : await getReply();
      typingRow.remove();
      addBubble("ai", reply);
      pushAiMessage("ai", reply, text);

      const macros = parseMacros(reply);
      if (macros) addAddToJournalButton(macros, text);

      aiHint.textContent = "Bu analiz tarayıcınızda çalışan bir yapay zekâ modeli kullanır, tahminler yaklaşıktır.";
    } catch (error) {
      console.error(error);
      typingRow.remove();
      const errText = "Şu anda bağlanırken bir sorun oluştu. Lütfen tekrar deneyin.";
      addBubble("ai", errText);
      pushAiMessage("ai", errText);
      aiHint.textContent = "Bağlantı sorunu yaşandı, tekrar deneyebilirsin.";
    } finally {
      isThinking = false;
      aiSend.disabled = false;
      aiInput.disabled = false;
      aiInput.focus();
    }
  }

  aiForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = aiInput.value.trim();
    if (!text) return;
    aiInput.value = "";
    ask(text, null);
  });

  clearAiChatBtn.addEventListener("click", () => {
    if (isThinking) {
      showToast("Porsiyon AI hesaplarken sohbet temizlenemez, biraz bekle.");
      return;
    }
    aiMessages = [{ role: "ai", text: AI_GREETING }];
    saveAiMessages();
    renderAiChat();
    showToast("🗑️ Sohbet temizlendi");
  });

  // ---------- Camera capture ----------
  let cameraStream = null;

  async function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast("Bu tarayıcı kamera erişimini desteklemiyor.", 4000);
      return;
    }
    showToast("📷 Kamera izni isteniyor, lütfen izin ver");
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      cameraVideo.srcObject = cameraStream;
      cameraOverlay.classList.remove("hidden");
    } catch {
      showToast("🚫 Kameraya erişilemedi. Tarayıcı ayarlarından bu site için kamera iznini kontrol et.", 5000);
    }
  }

  function closeCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    cameraVideo.srcObject = null;
    cameraOverlay.classList.add("hidden");
  }

  cameraBtn.addEventListener("click", openCamera);
  cameraCancelBtn.addEventListener("click", closeCamera);

  captureBtn.addEventListener("click", async () => {
    const width = cameraVideo.videoWidth || 640;
    const height = cameraVideo.videoHeight || 480;
    cameraCanvas.width = width;
    cameraCanvas.height = height;
    const ctx = cameraCanvas.getContext("2d");
    ctx.drawImage(cameraVideo, 0, 0, width, height);
    const dataURL = cameraCanvas.toDataURL("image/jpeg", 0.85);

    const caption = aiInput.value.trim();
    aiInput.value = "";
    closeCamera();
    await ask(caption, dataURL);
  });

  // ---------- Hedeflerim (goal calculator) ----------
  const goalForm = document.getElementById("goalForm");
  const goalResult = document.getElementById("goalResult");
  const manualGoalBtn = document.getElementById("manualGoalBtn");
  const manualGoalPanel = document.getElementById("manualGoalPanel");
  const manualKcal = document.getElementById("manualKcal");
  const manualProtein = document.getElementById("manualProtein");
  const manualCarbs = document.getElementById("manualCarbs");
  const manualFat = document.getElementById("manualFat");

  function renderGoalResult(bmr, tdee, target, protein, carbs, fat) {
    goalResult.innerHTML = `
      <div class="result-row"><span>Bazal Metabolizma (BMR)</span><strong>${fmtKcal(bmr)}</strong></div>
      <div class="result-row"><span>Günlük Enerji İhtiyacı (TDEE)</span><strong>${fmtKcal(tdee)}</strong></div>
      <div class="result-row"><span>Hedef Kalori</span><strong>${fmtKcal(target)}</strong></div>
      <div class="result-row"><span>Protein</span><strong>${fmtG(protein)}</strong></div>
      <div class="result-row"><span>Karbonhidrat</span><strong>${fmtG(carbs)}</strong></div>
      <div class="result-row"><span>Yağ</span><strong>${fmtG(fat)}</strong></div>
    `;
    goalResult.classList.add("show");
  }

  goalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const gender = document.getElementById("goalGender").value;
    const age = parseFloat(document.getElementById("goalAge").value);
    const height = parseFloat(document.getElementById("goalHeight").value);
    const weight = parseFloat(document.getElementById("goalWeight").value);
    const activity = parseFloat(document.getElementById("goalActivity").value);
    const adjust = parseFloat(document.getElementById("goalTarget").value);

    if (!age || !height || !weight) return;

    const bmr = gender === "erkek"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
    const tdee = bmr * activity;
    const target = Math.max(1200, tdee + adjust);

    const protein = weight * 1.6;
    const fat = weight * 0.8;
    const proteinKcal = protein * 4;
    const fatKcal = fat * 9;
    const carbs = Math.max(0, (target - proteinKcal - fatKcal) / 4);

    renderGoalResult(bmr, tdee, target, protein, carbs, fat);

    goals = { kcal: Math.round(target), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
    saveGoals(goals);
    renderOverview();
    showToast("🎯 Hedeflerin kaydedildi");
  });

  manualGoalBtn.addEventListener("click", () => {
    const showing = manualGoalPanel.style.display === "block";
    if (!showing) {
      manualKcal.value = goals.kcal;
      manualProtein.value = goals.protein;
      manualCarbs.value = goals.carbs;
      manualFat.value = goals.fat;
    }
    manualGoalPanel.style.display = showing ? "none" : "block";
  });

  document.getElementById("saveManualGoalBtn").addEventListener("click", () => {
    const kcal = parseFloat(manualKcal.value);
    const protein = parseFloat(manualProtein.value) || 0;
    const carbs = parseFloat(manualCarbs.value) || 0;
    const fat = parseFloat(manualFat.value) || 0;
    if (!(kcal >= 0)) return;

    goals = { kcal, protein, carbs, fat };
    saveGoals(goals);
    renderOverview();
    manualGoalPanel.style.display = "none";
    showToast("🎯 Hedeflerin kaydedildi");
  });

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
      await puter.kv.set(PUTER_KEY, JSON.stringify({ entries, goals }));
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
        entries = Array.isArray(data.entries) ? data.entries : entries;
        goals = data.goals && typeof data.goals.kcal === "number" ? data.goals : goals;
        localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
        localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
      } else {
        await pushToPuter();
      }
      renderOverview();
      renderEntryTable();
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
        showToast("Çıkış yapıldı.");
      } catch {}
      updatePuterButton(null);
      return;
    }
    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = "Bağlanıyor...";

    const popupHintTimer = setTimeout(() => {
      showToast("Giriş penceresi açılmadıysa tarayıcın açılır pencereleri (popup) engelliyor olabilir. Adres çubuğundaki popup simgesine bakıp bu site için izin verip tekrar dene.", 6000);
    }, 4000);

    try {
      await puter.auth.signIn();
      clearTimeout(popupHintTimer);
      const user = await puter.auth.getUser();
      updatePuterButton(user);
      await syncFromPuter();
      showToast("🎉 Puter ile giriş yapıldı, verilerin yedekleniyor.");
    } catch {
      clearTimeout(popupHintTimer);
      updatePuterButton(null);
      showToast("Giriş penceresi kapatıldı ya da tamamlanamadı. Butona tekrar basıp yeniden deneyebilirsin.", 4000);
    } finally {
      btn.disabled = false;
      if (btn.textContent === "Bağlanıyor...") btn.textContent = originalLabel;
    }
  }

  puterBtn.addEventListener("click", () => handlePuterClick(puterBtn));
  if (settingsPuterBtn) settingsPuterBtn.addEventListener("click", () => handlePuterClick(settingsPuterBtn));

  // ---------- Display name ----------
  const DISPLAY_NAME_KEY = "caloriai.displayName";
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
  const APPLOCK_KEY = "caloriai.applock";
  const PIN_KEY = "caloriai.pin";
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
    const data = { entries, goals, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "porsiyon-ai-yedek-" + new Date().toISOString().slice(0, 10) + ".json";
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
        if (Array.isArray(data.entries)) entries = data.entries;
        if (data.goals && typeof data.goals.kcal === "number") goals = data.goals;
        saveEntries(entries);
        saveGoals(goals);
        renderOverview();
        renderEntryTable();
        window.alert("Veriler başarıyla içe aktarıldı.");
      } catch {
        window.alert("Dosya okunamadı. Geçerli bir yedek dosyası seçin.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  document.getElementById("clearDataBtn").addEventListener("click", () => {
    if (!window.confirm("Tüm öğünler ve hedefler silinecek. Emin misiniz?")) return;
    entries = [];
    goals = { ...DEFAULT_GOALS };
    saveEntries(entries);
    saveGoals(goals);
    renderOverview();
    renderEntryTable();
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
  renderOverview();
  renderEntryTable();
  renderAiChat();
  Promise.race([initPuter(), timeout(3000)]).then(() => {
    hideLoadingScreen();
    checkAppLock();
  });
})();
