import { State } from "./state.js";

export function updateMoneyDisplay() {
  document.getElementById("moneyDisplay").textContent = State.data.money.toLocaleString("tr-TR");
}
