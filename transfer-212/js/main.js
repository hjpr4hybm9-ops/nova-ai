(() => {
  "use strict";

  document.getElementById("year").textContent = new Date().getFullYear();

  const THEME_KEY = "transfer212.theme";
  const WHATSAPP_NUMBER = "905000000000";

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

  // ---- Fare calculator ----
  const PRICES = {
    ist: { taksim: 2200, sultanahmet: 2400, sisli: 2100, besiktas: 2300, kadikoy: 2800, bakirkoy: 1900, levent: 2000, saw: 3200, ist: 800 },
    saw: { taksim: 1800, sultanahmet: 1700, sisli: 1900, besiktas: 2000, kadikoy: 900, bakirkoy: 2200, levent: 2100, saw: 800, ist: 3200 },
    city: { taksim: 600, sultanahmet: 700, sisli: 550, besiktas: 600, kadikoy: 900, bakirkoy: 750, levent: 650, saw: 1800, ist: 2000 }
  };

  const VEHICLE_MULTIPLIER = { sedan: 1, minivan: 1.35, sprinter: 1.85 };

  function getBasePrice(from, to) {
    const table = PRICES[from];
    if (table && typeof table[to] === "number") return table[to];
    return 1500;
  }

  function estimatePrice(from, to, vehicle) {
    const base = getBasePrice(from, to);
    const multiplier = VEHICLE_MULTIPLIER[vehicle] || 1;
    return Math.round((base * multiplier) / 50) * 50;
  }

  const calcForm = document.getElementById("calcForm");
  const fromSelect = document.getElementById("fromSelect");
  const toSelect = document.getElementById("toSelect");
  const vehicleSelect = document.getElementById("vehicleSelect");
  const passengerInput = document.getElementById("passengerInput");
  const dateInput = document.getElementById("dateInput");
  const timeInput = document.getElementById("timeInput");
  const calcResult = document.getElementById("calcResult");
  const calcResultValue = document.getElementById("calcResultValue");
  const calcWhatsappBtn = document.getElementById("calcWhatsappBtn");

  const today = new Date();
  dateInput.value = today.toISOString().slice(0, 10);
  dateInput.min = today.toISOString().slice(0, 10);

  calcForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (fromSelect.value === toSelect.value) {
      showToast("Lütfen farklı bir varış noktası seçin.");
      return;
    }

    const price = estimatePrice(fromSelect.value, toSelect.value, vehicleSelect.value);
    calcResultValue.textContent = price.toLocaleString("tr-TR") + " ₺";
    calcResult.classList.remove("hidden");
    calcResult.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const fromLabel = fromSelect.options[fromSelect.selectedIndex].text;
    const toLabel = toSelect.options[toSelect.selectedIndex].text;
    const vehicleLabel = vehicleSelect.options[vehicleSelect.selectedIndex].text;

    const message = [
      "Merhaba, Transfer 212 üzerinden rezervasyon yapmak istiyorum.",
      `Güzergah: ${fromLabel} → ${toLabel}`,
      `Araç: ${vehicleLabel}`,
      `Yolcu sayısı: ${passengerInput.value}`,
      `Tarih: ${dateInput.value}`,
      `Saat: ${timeInput.value}`,
      `Web sitesindeki tahmini ücret: ${price.toLocaleString("tr-TR")} ₺`
    ].join("\n");

    calcWhatsappBtn.href = whatsappUrl(message);
    calcWhatsappBtn.onclick = (e) => {
      e.preventDefault();
      window.open(whatsappUrl(message), "_blank", "noopener");
    };
  });
})();
