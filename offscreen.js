chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "PLAY_SOUND") {
    const audio = new Audio(chrome.runtime.getURL(msg.sound));

    audio.volume = msg.volume ?? 1;

    audio.play().catch((e) => {
      console.error("Erro ao tocar:", e);
    });
  }
});