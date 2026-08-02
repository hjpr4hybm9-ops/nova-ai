(() => {
  const lockScreen = document.getElementById("lockScreen");
  const app = document.getElementById("app");
  const input = document.getElementById("lockInput");
  const err = document.getElementById("lockError");
  const rememberBox = document.getElementById("rememberMe");
  const unlockBtn = document.getElementById("unlockBtn");

  function showApp() {
    lockScreen.classList.add("hidden");
    app.classList.remove("hidden");
    document.dispatchEvent(new Event("app:unlocked"));
  }

  function tryUnlock() {
    if (input.value === APP_PASSWORD) {
      err.classList.add("hidden");
      if (rememberBox.checked) localStorage.setItem(REMEMBER_KEY, "1");
      input.value = "";
      showApp();
    } else {
      err.classList.remove("hidden");
      input.value = "";
      input.focus();
      lockScreen.classList.add("shake");
      setTimeout(() => lockScreen.classList.remove("shake"), 400);
    }
  }

  unlockBtn.addEventListener("click", tryUnlock);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryUnlock();
  });

  window.AppLock = {
    lockNow() {
      localStorage.removeItem(REMEMBER_KEY);
      app.classList.add("hidden");
      lockScreen.classList.remove("hidden");
      input.value = "";
      input.focus();
    },
  };

  if (localStorage.getItem(REMEMBER_KEY) === "1") {
    showApp();
  } else {
    input.focus();
  }
})();
