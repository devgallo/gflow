const INTERVAL_MINUTES = 1;
let lastAlertTime = 0;

// 🔊 OFFSCREEN
async function createOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"]
  });

  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Som de alerta"
    });
  }
}

async function playAlertSound() {
  const data = await chrome.storage.local.get([
    "alertSound",
    "alertVolume"
  ]);

  const sound = data.alertSound || "alert";
  const volume = data.alertVolume ?? 0.5;

  await createOffscreen();

  chrome.runtime.sendMessage({
    type: "PLAY_SOUND",
    sound: `sounds/${sound}.mp3`,
    volume: volume
  });
}

// 🔹 ALARME
function createAlarm() {
  chrome.alarms.clear("checkStatus", () => {
    chrome.alarms.create("checkStatus", {
      periodInMinutes: INTERVAL_MINUTES
    });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  createAlarm();

  const data = await chrome.storage.local.get("alertEnabled");
  if (data.alertEnabled === undefined) {
    await chrome.storage.local.set({ alertEnabled: true });
  }
});

chrome.runtime.onStartup.addListener(createAlarm);

// 🔹 EXECUÇÃO
chrome.alarms.onAlarm.addListener(async () => {
  const { alertEnabled } = await chrome.storage.local.get("alertEnabled");
  if (!alertEnabled) return;

  const tabs = await chrome.tabs.query({
    url: "*://*.movidesk.com/*"
  });

  if (!tabs.length) return;

  const tab = tabs[0];

  await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    files: ["content.js"]
  });

  setTimeout(() => {
    chrome.tabs.sendMessage(tab.id, { type: "GET_DATA" }, async (res) => {

      if (!res) return;

      const status = (res.status || "").toLowerCase();

      if (status.includes("offline")) {

        chrome.action.setIcon({ path: { 128: "icon-red-128.png" } });
        chrome.action.setBadgeText({ text: "OFF" });
        chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });

        if (Date.now() - lastAlertTime < 60000) return;
        lastAlertTime = Date.now();

        await playAlertSound();

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {

            const old = document.getElementById("gflow-toast");
            if (old) old.remove();

            const toast = document.createElement("div");
            toast.id = "gflow-toast";
            toast.innerText = "⚠️ Você está OFFLINE na fila!";

            Object.assign(toast.style, {
              position: "fixed",
              top: "30px",
              right: "30px",
              background: "#e74c3c",
              color: "#fff",
              padding: "16px 20px",
              borderRadius: "8px",
              zIndex: 999999
            });

            document.body.appendChild(toast);

            document.body.style.transform = "translateX(6px)";
            setTimeout(() => document.body.style.transform = "translateX(-6px)", 100);
            setTimeout(() => document.body.style.transform = "translateX(0)", 200);

            setTimeout(() => toast.remove(), 5000);
          }
        });

      } else {
        chrome.action.setIcon({ path: { 128: "icon-green-128.png" } });
        chrome.action.setBadgeText({ text: "" });
      }

    });
  }, 800);
});