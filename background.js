// Service worker para gerenciar o clique no ícone da extensão
chrome.action.onClicked.addListener((tab) => {
  // Enviar mensagem para o content script da aba ativa
  chrome.tabs.sendMessage(tab.id, {action: 'capturar_e_copiar'}, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Erro ao comunicar com a página:', chrome.runtime.lastError);
    }
  });
});

// Configurar extensão ao instalar
chrome.runtime.onInstalled.addListener(() => {
  //chrome.action.setBadgeText({text: 'OK'});
  //chrome.action.setBadgeBackgroundColor({color: '#007cba'});
});