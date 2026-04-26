async function loadData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });

    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, { type: "GET_DATA" }, (res) => {

        if (chrome.runtime.lastError || !res) return;

        // AGENTE
        document.getElementById("agent").innerText = res.agent || "-";

        // STATUS
        const statusText = document.getElementById("statusText");
        const statusDot = document.getElementById("statusDot");

        statusText.innerText = res.status || "-";

        statusDot.classList.remove("status-online", "status-offline");

        if (res.status === "Online") {
          statusDot.classList.add("status-online");
        } else {
          statusDot.classList.add("status-offline");
        }

        // SATISFAÇÃO
        const sat = document.getElementById("satisfaction");
        sat.innerText = (res.satisfactionPercent ?? 0) + "%";

        // CONVERSÃO
        document.getElementById("conversion").innerText =
          (res.conversion ?? 0) + "%";

      });
    }, 600);

  } catch (e) {
    console.log("Erro:", e);
  }
}

// REFRESH
document.getElementById("refresh").onclick = loadData;

// ALERTA
const toggle = document.getElementById("toggleAlert");
const bell = document.getElementById("bell");

toggle.onchange = () => {
  chrome.storage.local.set({ alertEnabled: toggle.checked });
  updateBell();
};

function updateBell() {
  if (toggle.checked) {
    bell.classList.add("bell-active");
  } else {
    bell.classList.remove("bell-active");
  }
}

// LOAD SETTINGS
async function loadSettings() {
  const data = await chrome.storage.local.get("alertEnabled");
  toggle.checked = data.alertEnabled ?? true;
  updateBell();
}

// INIT
loadSettings();
loadData();