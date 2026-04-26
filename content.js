console.log("Content script carregado!");

// ------------------------
// 🔹 AGUARDAR DOM
// ------------------------
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const interval = 300;
    let elapsed = 0;

    const timer = setInterval(() => {
      const el = document.querySelector(selector);

      if (el) {
        clearInterval(timer);
        resolve(el);
        return;
      }

      elapsed += interval;
      if (elapsed >= timeout) {
        clearInterval(timer);
        resolve(null);
      }
    }, interval);
  });
}

// ------------------------
// 🔹 UTIL
// ------------------------
function extrairPorcentagem(texto) {
  const match = texto.match(/\(([\d,]+)%\)/);
  return match ? parseFloat(match[1].replace(',', '.')) : 0;
}

function extrairQuantidade(texto) {
  const match = texto.match(/^(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// ------------------------
// 🔹 AGENTE
// ------------------------
async function getAgentName() {
  try {
    const el = await waitForElement('#editProfileUserName');

    if (el && el.textContent.trim()) {
      return el.textContent.trim();
    }

    return "Não encontrado";

  } catch {
    return "Erro";
  }
}

// ------------------------
// 🔹 STATUS
// ------------------------
async function getAgentStatus() {
  try {
    const el = await waitForElement('.chat-icon-status');

    if (!el) return "Não encontrado";

    const cls = el.className;

    if (cls.includes('online')) return "Online";
    if (cls.includes('offline')) return "Offline";
    if (cls.includes('away')) return "Ausente";

    return "Desconhecido";

  } catch {
    return "Erro";
  }
}

// ------------------------
// 🔹 INDICADORES
// ------------------------
function encontrarDocValido() {
  if (document.querySelector('.nps-value-10')) {
    return document;
  }
  return null;
}

function getResolvedTickets(doc) {
  const el = doc.querySelector('.resolved-tickets');
  return el ? parseInt(el.textContent.trim()) || 0 : 0;
}

// ------------------------
// 🔹 DADOS PRINCIPAIS
// ------------------------
async function getDashboardData() {

  const agent = await getAgentName();
  const status = await getAgentStatus();

  const doc = encontrarDocValido();

  if (!doc) {
    return {
      agent,
      status,
      satisfactionPercent: "0.00",
      conversion: "0.00",
      resolved: 0,
      responses: 0
    };
  }

  let totalPerc = 0;
  let totalRespostas = 0;

  for (let i = 0; i <= 10; i++) {
    const el = doc.querySelector(`.nps-value-${i}`);

    if (el) {
      const texto = el.textContent;

      totalRespostas += extrairQuantidade(texto);

      if (i >= 8) {
        totalPerc += extrairPorcentagem(texto);
      }
    }
  }

  const resolvidos = getResolvedTickets(doc);

  const conversao = resolvidos > 0
    ? (totalRespostas / resolvidos) * 100
    : 0;

  return {
    agent,
    status,
    satisfactionPercent: totalPerc.toFixed(2),
    conversion: conversao.toFixed(2),
    resolved: resolvidos,
    responses: totalRespostas
  };
}

// ------------------------
// 🔹 LISTENER (AGORA ASYNC)
// ------------------------
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "GET_DATA") {

    getDashboardData()
      .then(data => {
        console.log("Dados enviados:", data);
        sendResponse(data);
      })
      .catch(err => {
        console.error("Erro geral:", err);

        sendResponse({
          agent: "Erro",
          status: "Erro",
          satisfactionPercent: "erro",
          conversion: "erro",
          resolved: 0,
          responses: 0
        });
      });

    return true; // 🔥 mantém canal aberto (ESSENCIAL)
  }
});