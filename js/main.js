(() => {
  "use strict";

  document.getElementById("year").textContent = new Date().getFullYear();

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

  const SYSTEM_PROMPT = `Sen Nova AI'sın, herkese açık bir yapay zekâ asistanısın.
Türkçe konuş. Sıcak, samimi ve anlaşılır ol. Kısa ve net cevaplar ver, gerektiğinde ayrıntı ekle.`;

  const demoChat = document.getElementById("demoChat");
  const demoForm = document.getElementById("demoForm");
  const demoInput = document.getElementById("demoInput");
  const demoSend = document.getElementById("demoSend");
  const demoHint = document.getElementById("demoHint");

  let history = [];
  let isThinking = false;

  function addBubble(role, text) {
    const row = document.createElement("div");
    row.className = "demo-row demo-" + role;

    const bubble = document.createElement("div");
    bubble.className = "demo-bubble";
    bubble.textContent = text;

    row.appendChild(bubble);
    demoChat.appendChild(row);
    demoChat.scrollTop = demoChat.scrollHeight;
    return bubble;
  }

  function addTyping() {
    const row = document.createElement("div");
    row.className = "demo-row demo-ai";

    const bubble = document.createElement("div");
    bubble.className = "demo-bubble";
    bubble.innerHTML = '<span class="demo-typing"><span></span><span></span><span></span></span>';

    row.appendChild(bubble);
    demoChat.appendChild(row);
    demoChat.scrollTop = demoChat.scrollHeight;
    return row;
  }

  function extractText(response) {
    if (!response) return "";
    if (typeof response === "string") return response;
    if (response.message && typeof response.message.content === "string") return response.message.content;
    if (typeof response.text === "string") return response.text;
    return String(response);
  }

  async function getReply(userText) {
    if (typeof puter === "undefined" || !puter.ai || typeof puter.ai.chat !== "function") {
      throw new Error("AI motoru yüklenemedi.");
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: userText }
    ];

    const response = await puter.ai.chat(messages);
    const reply = extractText(response).trim();
    if (!reply) throw new Error("Boş yanıt geldi.");
    return reply;
  }

  demoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isThinking) return;

    const text = demoInput.value.trim();
    if (!text) return;

    addBubble("user", text);
    demoInput.value = "";
    isThinking = true;
    demoSend.disabled = true;
    demoInput.disabled = true;
    demoHint.textContent = "Nova düşünüyor...";

    const typingRow = addTyping();

    try {
      const reply = await getReply(text);
      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: reply });
      if (history.length > 20) history = history.slice(-20);

      typingRow.remove();
      addBubble("ai", reply);
      demoHint.textContent = "Bu demo, tarayıcınızda çalışan canlı bir yapay zekâ modelini kullanır.";
    } catch (error) {
      console.error(error);
      typingRow.remove();
      addBubble("ai", "Şu anda bağlanırken bir sorun oluştu. Lütfen tekrar deneyin.");
      demoHint.textContent = "Bağlantı sorunu yaşandı, tekrar deneyebilirsiniz.";
    } finally {
      isThinking = false;
      demoSend.disabled = false;
      demoInput.disabled = false;
      demoInput.focus();
    }
  });
})();
