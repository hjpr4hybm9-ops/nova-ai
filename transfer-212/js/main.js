(() => {
  "use strict";

  document.getElementById("year").textContent = new Date().getFullYear();

  const THEME_KEY = "transfer212.theme";
  const WHATSAPP_NUMBER = "905000000000";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK_NS = "http://www.w3.org/1999/xlink";

  // ---- Turkey map sprite (province border paths, loaded from js/tr-map-data.js) ----
  document.body.insertAdjacentHTML("afterbegin", window.TR_MAP_DEFS_SVG);

  const AIRPORTS = [
    { code: "ist-havalimani", name: "İstanbul Havalimanı (IST)", lat: 41.2753, lon: 28.7519, provinceCode: "34" },
    { code: "saw-havalimani", name: "Sabiha Gökçen Havalimanı (SAW)", lat: 40.8986, lon: 29.3092, provinceCode: "34" }
  ];

  const PROVINCES = window.TR_PROVINCES.map(p => ({ ...p, provinceCode: p.code }));
  const ALL_LOCATIONS = AIRPORTS.concat(PROVINCES);
  const LOCATIONS_BY_CODE = new Map(ALL_LOCATIONS.map(l => [l.code, l]));
  const PROVINCES_SORTED = [...PROVINCES].sort((a, b) => a.name.localeCompare(b.name, "tr"));

  // ---- Nav toggle ----
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");

  navToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  mainNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  // ---- Theme toggle ----
  function applyThemeChoice(choice) {
    if (choice === "system") {
      localStorage.removeItem(THEME_KEY);
      document.documentElement.removeAttribute("data-theme");
    } else {
      localStorage.setItem(THEME_KEY, choice);
      document.documentElement.setAttribute("data-theme", choice);
    }
  }

  function toggleThemeQuick() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark" ||
      (!document.documentElement.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    applyThemeChoice(isDark ? "light" : "dark");
  }

  document.getElementById("themeToggle").addEventListener("click", toggleThemeQuick);

  // ---- Toast ----
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

  // ---- WhatsApp helpers ----
  function whatsappUrl(message) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  document.getElementById("heroWhatsappBtn").addEventListener("click", (e) => {
    e.preventDefault();
    window.open(whatsappUrl("Merhaba, Transfer 212 hakkında bilgi almak ve rezervasyon yapmak istiyorum."), "_blank", "noopener");
  });

  document.getElementById("contactWhatsapp").addEventListener("click", (e) => {
    e.preventDefault();
    window.open(whatsappUrl("Merhaba, Transfer 212 hakkında bilgi almak ve rezervasyon yapmak istiyorum."), "_blank", "noopener");
  });

  // ---- Location picker: Turkey map (clickable provinces) + accessible select ----
  function createLocationPicker(container, defaultCode) {
    const picker = document.createElement("div");
    picker.className = "location-picker";

    const mapWrap = document.createElement("div");
    mapWrap.className = "tr-map-wrap";

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "tr-map");
    svg.setAttribute("viewBox", "0 0 1007.478 527.323");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Türkiye haritası, il seçmek için tıklayın");

    PROVINCES.forEach(p => {
      p.regionIds.forEach(rid => {
        const use = document.createElementNS(SVG_NS, "use");
        use.setAttributeNS(XLINK_NS, "xlink:href", "#region-" + rid);
        use.setAttribute("href", "#region-" + rid);
        use.setAttribute("class", "tr-region");
        use.setAttribute("data-code", p.code);
        use.setAttribute("tabindex", "0");
        use.setAttribute("role", "button");
        use.setAttribute("aria-label", p.name);
        use.setAttribute("title", p.name);
        svg.appendChild(use);
      });
    });

    mapWrap.appendChild(svg);

    const select = document.createElement("select");
    select.className = "location-select";

    const airportGroup = document.createElement("optgroup");
    airportGroup.label = "Havalimanları";
    AIRPORTS.forEach(a => {
      const opt = document.createElement("option");
      opt.value = a.code;
      opt.textContent = a.name;
      airportGroup.appendChild(opt);
    });
    select.appendChild(airportGroup);

    const cityGroup = document.createElement("optgroup");
    cityGroup.label = "İller (81 il)";
    PROVINCES_SORTED.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.code;
      opt.textContent = p.name;
      cityGroup.appendChild(opt);
    });
    select.appendChild(cityGroup);

    const readout = document.createElement("p");
    readout.className = "location-readout";

    picker.appendChild(mapWrap);
    picker.appendChild(select);
    picker.appendChild(readout);
    container.appendChild(picker);

    function highlight(provinceCode) {
      svg.querySelectorAll(".tr-region.active").forEach(el => el.classList.remove("active"));
      svg.querySelectorAll(`.tr-region[data-code="${provinceCode}"]`).forEach(el => el.classList.add("active"));
    }

    function setValue(code) {
      const loc = LOCATIONS_BY_CODE.get(code);
      if (!loc) return;
      select.value = code;
      highlight(loc.provinceCode);
      readout.innerHTML = `Seçili: <strong>${loc.name}</strong>`;
    }

    select.addEventListener("change", () => setValue(select.value));

    svg.addEventListener("click", (e) => {
      const use = e.target.closest("use");
      if (!use) return;
      setValue(use.getAttribute("data-code"));
    });

    svg.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const use = e.target.closest("use");
      if (!use) return;
      e.preventDefault();
      setValue(use.getAttribute("data-code"));
    });

    setValue(defaultCode);

    return { getValue: () => select.value, setValue };
  }

  const locationPickers = {};
  document.querySelectorAll("[data-location-field]").forEach(el => {
    const key = el.dataset.locationField;
    locationPickers[key] = createLocationPicker(el, el.dataset.default);
  });

  // ---- Distance-based fare estimate ----
  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const BASE_FEE = 600;
  const PER_KM = 35;
  const CITY_FEE = 700;
  const CITY_THRESHOLD_KM = 20;
  const VEHICLE_MULTIPLIER = { sedan: 1, minivan: 1.35, sprinter: 1.85 };

  function estimateFare(fromCode, toCode, vehicle) {
    const from = LOCATIONS_BY_CODE.get(fromCode);
    const to = LOCATIONS_BY_CODE.get(toCode);
    if (!from || !to) return null;

    const distanceKm = haversineKm(from.lat, from.lon, to.lat, to.lon);
    const multiplier = VEHICLE_MULTIPLIER[vehicle] || 1;
    const base = distanceKm < CITY_THRESHOLD_KM ? CITY_FEE : BASE_FEE + distanceKm * PER_KM;

    return {
      price: Math.round((base * multiplier) / 50) * 50,
      distanceKm: Math.round(distanceKm)
    };
  }

  function buildReservationMessage({ name, phone, fromLabel, toLabel, vehicleLabel, passengers, date, time, note, price, distanceKm }) {
    const lines = [
      "Merhaba, Transfer 212 üzerinden rezervasyon yapmak istiyorum.",
      name ? `Ad Soyad: ${name}` : null,
      phone ? `Telefon: ${phone}` : null,
      `Güzergah: ${fromLabel} → ${toLabel}`,
      distanceKm != null ? `Mesafe: ~${distanceKm} km` : null,
      `Araç: ${vehicleLabel}`,
      `Yolcu sayısı: ${passengers}`,
      `Tarih: ${date}`,
      `Saat: ${time}`,
      note ? `Not: ${note}` : null,
      `Web sitesindeki tahmini ücret: ${price.toLocaleString("tr-TR")} ₺`
    ].filter(Boolean);
    return lines.join("\n");
  }

  // ---- Fiyat Hesapla ----
  const calcForm = document.getElementById("calcForm");
  const vehicleSelect = document.getElementById("vehicleSelect");
  const passengerInput = document.getElementById("passengerInput");
  const dateInput = document.getElementById("dateInput");
  const timeInput = document.getElementById("timeInput");
  const calcResult = document.getElementById("calcResult");
  const calcResultValue = document.getElementById("calcResultValue");
  const calcResultDistance = document.getElementById("calcResultDistance");
  const calcWhatsappBtn = document.getElementById("calcWhatsappBtn");

  const today = new Date().toISOString().slice(0, 10);
  dateInput.value = today;
  dateInput.min = today;

  calcForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const fromCode = locationPickers.calcFrom.getValue();
    const toCode = locationPickers.calcTo.getValue();

    if (fromCode === toCode) {
      showToast("Nereden ve nereye aynı nokta olamaz, lütfen farklı bir yer seçin.");
      return;
    }

    const result = estimateFare(fromCode, toCode, vehicleSelect.value);
    calcResultValue.textContent = result.price.toLocaleString("tr-TR") + " ₺";
    calcResultDistance.textContent = `≈ ${result.distanceKm.toLocaleString("tr-TR")} km`;
    calcResult.classList.remove("hidden");
    calcResult.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const message = buildReservationMessage({
      name: null,
      phone: null,
      fromLabel: LOCATIONS_BY_CODE.get(fromCode).name,
      toLabel: LOCATIONS_BY_CODE.get(toCode).name,
      vehicleLabel: vehicleSelect.options[vehicleSelect.selectedIndex].text,
      passengers: passengerInput.value,
      date: dateInput.value,
      time: timeInput.value,
      note: null,
      price: result.price,
      distanceKm: result.distanceKm
    });

    calcWhatsappBtn.href = whatsappUrl(message);
    calcWhatsappBtn.onclick = (e2) => {
      e2.preventDefault();
      window.open(whatsappUrl(message), "_blank", "noopener");
    };
  });

  // ---- Rezervasyon ----
  const reservationForm = document.getElementById("reservationForm");
  const resNameInput = document.getElementById("resNameInput");
  const resPhoneInput = document.getElementById("resPhoneInput");
  const resVehicleSelect = document.getElementById("resVehicleSelect");
  const resPassengerInput = document.getElementById("resPassengerInput");
  const resDateInput = document.getElementById("resDateInput");
  const resTimeInput = document.getElementById("resTimeInput");
  const resNoteInput = document.getElementById("resNoteInput");
  const resResult = document.getElementById("resResult");
  const resResultValue = document.getElementById("resResultValue");
  const resResultDistance = document.getElementById("resResultDistance");

  resDateInput.value = today;
  resDateInput.min = today;

  reservationForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = resNameInput.value.trim();
    const phone = resPhoneInput.value.trim();

    if (!name || !phone) {
      showToast("Lütfen ad soyad ve telefon numaranızı girin.");
      return;
    }

    const fromCode = locationPickers.resFrom.getValue();
    const toCode = locationPickers.resTo.getValue();

    if (fromCode === toCode) {
      showToast("Nereden ve nereye aynı nokta olamaz, lütfen farklı bir yer seçin.");
      return;
    }

    const result = estimateFare(fromCode, toCode, resVehicleSelect.value);
    resResultValue.textContent = result.price.toLocaleString("tr-TR") + " ₺";
    resResultDistance.textContent = `≈ ${result.distanceKm.toLocaleString("tr-TR")} km`;
    resResult.classList.remove("hidden");

    const message = buildReservationMessage({
      name,
      phone,
      fromLabel: LOCATIONS_BY_CODE.get(fromCode).name,
      toLabel: LOCATIONS_BY_CODE.get(toCode).name,
      vehicleLabel: resVehicleSelect.options[resVehicleSelect.selectedIndex].text,
      passengers: resPassengerInput.value,
      date: resDateInput.value,
      time: resTimeInput.value,
      note: resNoteInput.value.trim(),
      price: result.price,
      distanceKm: result.distanceKm
    });

    window.open(whatsappUrl(message), "_blank", "noopener");
    resResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
})();
