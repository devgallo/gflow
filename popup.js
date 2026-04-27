//COR PORCENTAGEM
function applyValueColor(el, value) {
  if (!el) return;

  el.classList.remove("value-good", "value-mid", "value-bad");

  if (value >= 93) el.classList.add("value-good");
  else if (value >= 50) el.classList.add("value-mid");
  else el.classList.add("value-bad");
}

// ==========================
// 🔊 OFFSCREEN CONTROL
// ==========================
async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"]
  });

  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Reproduzir sons"
    });
  }
}

async function playSound(sound, volume) {
  await ensureOffscreen();

  chrome.runtime.sendMessage({
    type: "PLAY_SOUND",
    sound: `sounds/${sound}.mp3`,
    volume: volume
  });
}

// ==========================
// 🔔 ALERTA (COM CONTROLE)
// ==========================
let lastStatus = null;

async function checkAndTriggerAlert(currentStatus) {
  const data = await chrome.storage.local.get("lastStatus");

  const previousStatus = data.lastStatus;

  // se mudou pra offline → toca som
  if (currentStatus === "Offline" && previousStatus !== "Offline") {
    await triggerAlertSound();
  }

  // salva novo status
  await chrome.storage.local.set({ lastStatus: currentStatus });
}

async function triggerAlertSound() {
  const data = await chrome.storage.local.get([
    "alertSound",
    "alertVolume",
    "alertEnabled"
  ]);

  if (!data.alertEnabled) return;

  const sound = data.alertSound || "alert";
  const volume = data.alertVolume ?? 0.5;

  playSound(sound, volume);
}

// ==========================
// 📊 DATA
// ==========================
async function loadData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });

    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, { type: "GET_DATA" }, async (res) => {

        if (chrome.runtime.lastError || !res) return;

        document.getElementById("agent").innerText = res.agent || "-";

        const statusText = document.getElementById("statusText");
        const statusDot = document.getElementById("statusDot");

        statusText.innerText = res.status || "-";

        statusDot.classList.remove("status-online", "status-offline");

        if (res.status === "Online") {
          statusDot.classList.add("status-online");
        } else {
          statusDot.classList.add("status-offline");
        }

        await checkAndTriggerAlert(res.status);

        const sat = document.getElementById("satisfaction");
        const satValue = res.satisfactionPercent ?? 0;

        if (sat) {
          sat.innerText = satValue + "%";
          applyValueColor(sat, satValue);
        }

        const conv = document.getElementById("conversion");
        const convValue = res.conversion ?? 0;

        if (conv) {
          conv.innerText = convValue + "%";
          applyValueColor(conv, convValue);
        }

      });
    }, 600); 

  } catch (e) {
    console.log("Erro:", e);
  }
}

// ==========================
// 🔔 ALERT TOGGLE
// ==========================
const toggle = document.getElementById("toggleAlert");
const bell = document.getElementById("bell");

function updateBell() {
  if (!toggle || !bell) return;

  if (toggle.checked) {
    bell.classList.add("bell-active");
  } else {
    bell.classList.remove("bell-active");
  }
}

if (toggle) {
  toggle.onchange = () => {
    chrome.storage.local.set({ alertEnabled: toggle.checked });
    updateBell();
  };
}

async function loadSettings() {
  const data = await chrome.storage.local.get("alertEnabled");

  if (toggle) {
    toggle.checked = data.alertEnabled ?? true;
    updateBell();
  }
}

// ==========================
// 🌙 DARK MODE
// ==========================
const darkToggle = document.getElementById("switch");

function setDarkMode(enabled) {
  document.body.classList.toggle("dark-mode", enabled);
  chrome.storage.local.set({ darkMode: enabled });
}

if (darkToggle) {
  darkToggle.onchange = () => {
    setDarkMode(darkToggle.checked);
  };
}

async function loadDarkMode() {
  const data = await chrome.storage.local.get("darkMode");

  const enabled = data.darkMode ?? false;

  if (darkToggle) {
    darkToggle.checked = enabled;
    setDarkMode(enabled);
  }
}

// ==========================
// 🔊 SOM CONFIG
// ==========================
const soundRadios = document.querySelectorAll("input[name='alertSound']");
const volumeControl = document.getElementById("volumeControl");

// salvar config ao mexer
if (volumeControl) {
  volumeControl.oninput = saveSoundSettings;

  // 🔊 preview ao soltar o slider
  volumeControl.addEventListener("change", async () => {
    const selected = document.querySelector("input[name='alertSound']:checked");

    if (!selected) return;

    playSound(selected.value, volumeControl.value);
  });
}

function saveSoundSettings() {
  const selected = document.querySelector("input[name='alertSound']:checked");

  chrome.storage.local.set({
    alertSound: selected?.value || "alert",
    alertVolume: parseFloat(volumeControl.value)
  });
}

soundRadios.forEach(radio => {
  radio.onchange = saveSoundSettings;
});

if (volumeControl) {
  volumeControl.oninput = saveSoundSettings;
}

async function loadSoundSettings() {
  const data = await chrome.storage.local.get([
    "alertSound",
    "alertVolume"
  ]);

  const sound = data.alertSound || "alert";
  const volume = data.alertVolume ?? 0.5;

  const selectedRadio = document.querySelector(
    `input[name="alertSound"][value="${sound}"]`
  );

  if (selectedRadio) selectedRadio.checked = true;

  if (volumeControl) volumeControl.value = volume;
}

const volume = document.getElementById("volumeControl");
const volumeValue = document.getElementById("volumeValue");
const radios = document.querySelectorAll("input[name='alertSound']");

// atualizar volume visual
function updateVolumeUI() {
  const percent = Math.round(volume.value * 100);

  volumeValue.innerText = percent + "%";
  volume.style.setProperty("--progress", percent + "%");
}

volume.addEventListener("input", () => {
  updateVolumeUI();
});

// preview automático ao trocar som
radios.forEach(radio => {
  radio.addEventListener("change", async () => {

    const data = await chrome.storage.local.get("alertVolume");

    const volume = data.alertVolume ?? 0.5;

    playSound(radio.value, volume);
  });
});


// init
setTimeout(updateVolumeUI, 100);

// ==========================
// 🚀 INIT
// ==========================
loadDarkMode();
loadSettings();
loadSoundSettings();
loadData();