function updateMoneyDisplay() {
  document.getElementById("moneyDisplay").textContent = State.data.money.toLocaleString("tr-TR");
}
window.updateMoneyDisplay = updateMoneyDisplay;

function initTabs() {
  const btns = document.querySelectorAll(".tab-btn");
  const panes = document.querySelectorAll(".tab-pane");
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btns.forEach((b) => b.classList.remove("active"));
      panes.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "track") Race.onTabShown();
      else Race.onTabHidden();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  Garage.render();
  Race.init();
  updateMoneyDisplay();

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Tüm ilerleme (bütçe, parçalar, rekorlar) silinecek. Emin misin?")) {
      State.reset();
      Garage.render();
      updateMoneyDisplay();
      Race.updateBestDisplays();
    }
  });

  document.getElementById("lockAppBtn").addEventListener("click", () => AppLock.lockNow());
});
