// content.js - Versão com atualização automática de URL
function capturarLoginDoHTML() {
  const elementoLogin = document.querySelector('div.sc-title-subtitle-action__container p.sc-text');

  if (elementoLogin) {
    const textoCompleto = elementoLogin.textContent || elementoLogin.innerText;
    const match = textoCompleto.match(/^([^|]+?)\s*\|\s*CPF/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return textoCompleto.trim();
  }

  const textoCompleto = document.body.innerText;
  const loginMatch = textoCompleto.match(/([^\s|]+(?:\s+[^\s|]+)*)\s*\|\s*CPF\s*\d+/);
  return loginMatch ? loginMatch[1].trim() : '';
}

function capturarDados() {
  const textoCompleto = document.body.innerText;
  const url = window.location.href;
  const login = capturarLoginDoHTML();

  let modelo = '';
  const padroesModelo = [
    /\*\*(\d+mm[^*\n]+)/,
    /(\d+mm\s+[^\n]+)/,
    /\*\*([^*]*\d+mm[^*\n]+)/,
    /Modelo:\s*([^\n]+)/i
  ];

  for (const padrao of padroesModelo) {
    const match = textoCompleto.match(padrao);
    if (match) {
      let modeloCompleto = match[1].replace(/\*\*/g, '').trim();
      modeloCompleto = modeloCompleto.replace(/\s+(Banhad[ao]|Folhead[ao]).*$/i, '');
      modelo = modeloCompleto;
      break;
    }
  }

  const arosAvulsos = [];
  const padroesAro = textoCompleto.match(/Aro\s*-\s*([^\n|]+)/g);

  if (padroesAro && padroesAro.length > 0) {
    padroesAro.forEach((match, index) => {
      const textoAro = match.replace(/Aro\s*-\s*/, '').trim();
      const numeroMatch = textoAro.match(/(\d+(?:\.\d+)?)/);
      const numero = numeroMatch ? numeroMatch[1] : '';
      let comPedra = '';
      if (/com\s+pedra/i.test(textoAro)) {
        comPedra = ' com pedra';
      } else {
        const linhas = textoCompleto.split('\n');
        for (let i = 0; i < linhas.length; i++) {
          if (linhas[i].includes(match)) {
            for (let j = Math.max(0, i - 3); j <= Math.min(linhas.length - 1, i + 3); j++) {
              if (/com\s+pedra/i.test(linhas[j])) {
                comPedra = ' com pedra';
                break;
              }
            }
            break;
          }
        }
      }

      let modeloAro = '';
      const linhas = textoCompleto.split('\n');
      for (let i = 0; i < linhas.length; i++) {
        if (linhas[i].includes(match)) {
          for (let j = Math.max(0, i - 3); j <= Math.min(linhas.length - 1, i + 3); j++) {
            const linhaBusca = linhas[j];
            for (const padrao of padroesModelo) {
              const matchModelo = linhaBusca.match(padrao);
              if (matchModelo) {
                let modeloCompleto = matchModelo[1].replace(/\*\*/g, '').trim();
                modeloCompleto = modeloCompleto.replace(/\s+(Banhad[ao]|Folhead[ao]).*$/i, '');
                modeloAro = modeloCompleto;
                break;
              }
            }
            if (modeloAro) break;
          }
          break;
        }
      }

      arosAvulsos.push({
        numero: numero + comPedra,
        modelo: modeloAro || modelo
      });
    });
  } else {
    const aroMasculinoMatch = textoCompleto.match(/Masculino\s*-\s*([^\n|]+)/);
    let aroMasculino = '';
    if (aroMasculinoMatch) {
      const textoAro = aroMasculinoMatch[1].trim();
      const numeroMatch = textoAro.match(/(\d+(?:\.\d+)?)/);
      const numero = numeroMatch ? numeroMatch[1] : textoAro;
      const comPedra = /com\s+pedra/i.test(textoAro) ? ' com pedra' : '';
      aroMasculino = numero + comPedra;
    }

    const aroFemininoMatch = textoCompleto.match(/Feminino\s*-\s*([^\n|]+)/);
    let aroFeminino = '';
    if (aroFemininoMatch) {
      const textoAro = aroFemininoMatch[1].trim();
      const numeroMatch = textoAro.match(/(\d+(?:\.\d+)?)/);
      const numero = numeroMatch ? numeroMatch[1] : textoAro;
      const comPedra = /com\s+pedra/i.test(textoAro) ? ' com pedra' : '';
      aroFeminino = numero + comPedra;
    }

    if (aroMasculino || aroFeminino) {
      arosAvulsos.push({
        numero: aroMasculino,
        modelo: modelo,
        tipo: 'Masculino'
      });
      arosAvulsos.push({
        numero: aroFeminino,
        modelo: modelo,
        tipo: 'Feminino'
      });
    }
  }

  return {
    login: login,
    modelo: modelo,
    aros: arosAvulsos,
    url: url
  };
}

function formatarTextoParaCopia(dados) {
  let texto = `${dados.url}\n\n${dados.modelo || ''}\n`;

  dados.aros.filter(a => a.tipo).forEach(aro => {
    const numero = aro.numero || '';
    const valor = aro.valor || '';
    if (valor) {
      texto += `${aro.tipo} ${numero} >>                    ${valor}\n`;
    } else {
      texto += `${aro.tipo} ${numero}\n`;
    }
  });

  const avulsos = dados.aros.filter(a => !a.tipo);
  avulsos.forEach((aro, i) => {
    const numero = aro.numero || '';
    const valor = aro.valor || '';

    if (i > 0) texto += '\n';
    texto += `Aro avulso ${i+1}\n`;
    if (aro.modelo) texto += `Modelo ${aro.modelo}\n`;
    if (valor) {
      texto += `${numero} >>                    ${valor}\n`;
    } else {
      texto += `${numero}\n`;
    }
  });

  return texto + `\n${dados.login}`;
}

const SESSION_STORAGE_KEY = 'extensao_dados_capturados_sessao';
const BUTTON_POSITION_STORAGE_KEY = 'extensao_button_position';

// ===============================================
// Fefrello API - Integração para criar cards
// ===============================================
const FEFRELLO_API_BASE = 'https://southamerica-east1-fefrello.cloudfunctions.net';
const FEFRELLO_API_KEY = '708a34771f2659594502ed4b74cd634819a297d37e3fb2fa3cafdf826c286f16';
const FEFRELLO_CONFIG_KEY = 'extensao_fefrello_config';
const RESPONSAVEIS_FEFRELLO = ['Solha', 'Ti', 'Vitão', 'Brunão', 'Fe'];

async function fefrelloFetch(endpoint, options = {}) {
  const res = await fetch(`${FEFRELLO_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'x-api-key': FEFRELLO_API_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro na API Fefrello');
  return json;
}

async function carregarBoards() {
  const res = await fefrelloFetch('/listBoards');
  return res.data;
}

async function carregarColunas(boardId) {
  const res = await fefrelloFetch(`/listColumns?boardId=${boardId}`);
  return res.data;
}

async function criarCardFefrello(boardId, columnId, title, description, responsible) {
  const body = { boardId, columnId, title };
  if (description) body.description = description;
  if (responsible) body.responsible = responsible;
  const res = await fefrelloFetch('/createCardEndpoint', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  return res;
}

function salvarConfigFefrello(config) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [FEFRELLO_CONFIG_KEY]: config }, resolve);
  });
}

function carregarConfigFefrello() {
  return new Promise((resolve) => {
    chrome.storage.local.get([FEFRELLO_CONFIG_KEY], (result) => {
      resolve(result[FEFRELLO_CONFIG_KEY] || null);
    });
  });
}

function salvarDados(dados) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dados));
  } catch (e) {
    console.error('Erro ao salvar dados na sessão:', e);
  }
}

// NOVA FUNÇÃO: Atualizar apenas o URL mantendo os outros dados
function atualizarApenasURL(novoURL) {
  try {
    const dadosExistentes = carregarDados();
    if (dadosExistentes && (dadosExistentes.login || dadosExistentes.modelo)) {
      dadosExistentes.url = novoURL;
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dadosExistentes));
      
      // Atualiza o campo URL no popup se estiver aberto
      const campoURL = document.getElementById('campo-url');
      if (campoURL) {
        campoURL.value = novoURL;
      }
      
      return true;
    }
    return false;
  } catch (e) {
    console.error('Erro ao atualizar URL:', e);
    return false;
  }
}

function carregarDados() {
  try {
    const dadosSalvos = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (dadosSalvos) {
      return JSON.parse(dadosSalvos);
    }
  } catch (e) {
    console.error('Erro ao carregar dados da sessão:', e);
  }
  return {
    login: '',
    modelo: '',
    aros: [],
    url: ''
  };
}

function limparDadosSalvos() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.error('Erro ao limpar dados da sessão:', e);
  }
}

function inserirSimboloNoCursor(campo, simbolo) {
  const posicaoInicial = campo.selectionStart;
  const posicaoFinal = campo.selectionEnd;
  const valorAtual = campo.value;

  const novoValor = valorAtual.substring(0, posicaoInicial) + simbolo + valorAtual.substring(posicaoFinal);
  campo.value = novoValor;

  const novaPosicao = posicaoInicial + simbolo.length;
  campo.setSelectionRange(novaPosicao, novaPosicao);

  campo.focus();
}

function formatarTextoPrimeiraMaiuscula(texto) {
  if (!texto || !texto.trim()) return texto;

  return texto.toLowerCase()
    .split(' ')
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(' ');
}

function criarBotoesSimbolos() {
  return `
    <div style="display: flex; gap: 6px;">
      <button id="btn-coracao" type="button" style="width: 32px; height: 32px; background: transparent; color: #f472b6; border: 1px solid rgba(244,114,182,0.3); border-radius: 50%; cursor: pointer; font-size: 14px; transition: all 0.2s; display: flex; align-items: center; justify-content: center;" title="Inserir coração">♥</button>
      <button id="btn-infinito" type="button" style="width: 32px; height: 32px; background: transparent; color: #60a5fa; border: 1px solid rgba(96,165,250,0.3); border-radius: 50%; cursor: pointer; font-size: 14px; transition: all 0.2s; display: flex; align-items: center; justify-content: center;" title="Inserir infinito">∞</button>
      <button id="btn-formatar-tudo" type="button" style="width: 32px; height: 32px; background: transparent; color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.15); border-radius: 50%; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; display: flex; align-items: center; justify-content: center;" title="Formatar todos os textos">Aa</button>
      <button id="btn-config-fefrello" type="button" style="width: 32px; height: 32px; background: transparent; color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.15); border-radius: 50%; cursor: pointer; font-size: 14px; transition: all 0.2s; display: flex; align-items: center; justify-content: center;" title="Configurações Fefrello">⚙</button>
    </div>
  `;
}

function adicionarEventosBotoesSimbolos() {
  let campoAtivo = null;

  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      campoAtivo = e.target;
    }
  });

  // NOVA FUNCIONALIDADE: Substituir corações ao colar
  document.addEventListener('paste', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      // Aguarda um pouco para o conteúdo ser colado
      setTimeout(() => {
        const campo = e.target;
        const valorOriginal = campo.value;
        
        // Lista de diferentes tipos de coração que devem ser substituídos
        const coracoes = [
          '❤️', '♥️','💗', '💕', '💖', '💘', '💝', '💞', '💟', 
          '♡', '🖤', '🤍', '🤎', '💜', '💛', '💚', '💙',
          '❣️', '💓', '💔', '❤', '🧡'
        ];
        
        let valorNovo = valorOriginal;
        
        // Substitui todos os tipos de coração pelo coração do botão
        coracoes.forEach(coracao => {
          valorNovo = valorNovo.replace(new RegExp(coracao, 'g'), '♥');
        });
        
        // Se houve mudança, atualiza o campo e mostra notificação
        if (valorNovo !== valorOriginal) {
          campo.value = valorNovo;
          mostrarNotificacaoCoracao('Corações convertidos automaticamente!');
        }
      }, 50);
    }
  });

  const btnCoracao = document.getElementById('btn-coracao');
  if (btnCoracao) {
    btnCoracao.addEventListener('click', () => {
      if (campoAtivo) {
        inserirSimboloNoCursor(campoAtivo, '♥');
      }
    });

    btnCoracao.addEventListener('mouseenter', () => {
      btnCoracao.style.background = 'rgba(244,114,182,0.15)';
    });
    btnCoracao.addEventListener('mouseleave', () => {
      btnCoracao.style.background = 'transparent';
    });
  }

  const btnInfinito = document.getElementById('btn-infinito');
  if (btnInfinito) {
    btnInfinito.addEventListener('click', () => {
      if (campoAtivo) {
        inserirSimboloNoCursor(campoAtivo, '∞');
      }
    });

    btnInfinito.addEventListener('mouseenter', () => {
      btnInfinito.style.background = 'rgba(96,165,250,0.15)';
    });
    btnInfinito.addEventListener('mouseleave', () => {
      btnInfinito.style.background = 'transparent';
    });
  }

  const btnFormatarTudo = document.getElementById('btn-formatar-tudo');
  if (btnFormatarTudo) {
    btnFormatarTudo.addEventListener('click', () => {
      document.querySelectorAll('input[type="text"]').forEach(campo => {
        if (campo.id && campo.id.startsWith('campo-valor-')) {
          campo.value = formatarTextoPrimeiraMaiuscula(campo.value);
        }
      });
      mostrarNotificacao('Todos os textos foram formatados!');
    });

    btnFormatarTudo.addEventListener('mouseenter', () => {
      btnFormatarTudo.style.background = 'rgba(255,255,255,0.1)';
    });
    btnFormatarTudo.addEventListener('mouseleave', () => {
      btnFormatarTudo.style.background = 'transparent';
    });
  }
}

function criarInterfaceAro(aro, index, isAvulso = false) {
  const tipoLabel = isAvulso ? `AVL ${index + 1}` : (aro.tipo || `ARO ${index + 1}`);
  const badgeColor = aro.tipo === 'Masculino' ? '#6366f1' : aro.tipo === 'Feminino' ? '#ec4899' : '#8b5cf6';

  let html = `<div style="margin-bottom: 8px; padding: 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(255,255,255,0.04);">`;
  html += `<span style="display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 700; letter-spacing: 1px; color: white; background: ${badgeColor}; margin-bottom: 8px; text-transform: uppercase;">${tipoLabel}</span>`;

  if (isAvulso && aro.modelo) {
    html += `<div style="margin-bottom: 8px;">`;
    html += `<label style="display: block; margin-bottom: 3px; font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4);">MODELO</label>`;
    html += `<input type="text" id="campo-modelo-aro-${index}" value="${aro.modelo}" style="width: 100%; padding: 6px 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 12px; box-sizing: border-box; outline: none;">`;
    html += `</div>`;
  }

  html += `<div style="margin-bottom: 5px;">
    <label style="display: block; margin-bottom: 3px; font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4);">ARO</label>
    <input type="text" id="campo-aro-${index}" value="${aro.numero}" style="width: 100%; padding: 7px 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none;">
  </div>`;
  html += `<div style="position: relative;">
    <label style="display: block; margin-bottom: 3px; font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4);">DADOS</label>
    <input type="text" id="campo-valor-${index}" value="" style="width: 100%; padding: 7px 30px 7px 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none;" placeholder="Dados...">
    <button class="btn-formatar" data-target="campo-valor-${index}" style="position: absolute; right: 4px; bottom: 4px; width: 24px; height: 24px; background: transparent; color: rgba(255,255,255,0.35); border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Formatar texto">Aa</button>
  </div>`;
  html += `</div>`;

  return html;
}

function mostrarPopup() {
  const popupExistente = document.getElementById('extensao-popup-overlay');
  if (popupExistente) {
    popupExistente.remove();
  }

  const dados = carregarDados(); // Apenas carrega os dados já salvos na sessão

  const isAvulso = dados.aros.length > 0 && !dados.aros[0].tipo;

  const container = document.createElement('div');
  container.id = 'extensao-popup-overlay';
  container.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 340px;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    z-index: 10000;
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    border-radius: 0 0 0 16px;
  `;

  const popup = document.createElement('div');
  popup.style.cssText = `
    padding: 16px;
    box-sizing: border-box;
  `;

  let arosHTML = '';
  dados.aros.forEach((aro, index) => {
    arosHTML += criarInterfaceAro(aro, index, isAvulso);
  });

  if (dados.aros.length === 0) {
    arosHTML = `
      <div style="margin-bottom: 8px; padding: 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(255,255,255,0.04);">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 700; letter-spacing: 1px; color: white; background: #6366f1; margin-bottom: 8px; text-transform: uppercase;">Masculino</span>
        <div style="margin-bottom: 5px;">
          <label style="display: block; margin-bottom: 3px; font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4);">ARO</label>
          <input type="text" id="campo-aro-0" value="" style="width: 100%; padding: 7px 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none;">
        </div>
        <div style="position: relative;">
          <label style="display: block; margin-bottom: 3px; font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4);">DADOS</label>
          <input type="text" id="campo-valor-0" value="" style="width: 100%; padding: 7px 30px 7px 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none;" placeholder="Dados...">
          <button class="btn-formatar" data-target="campo-valor-0" style="position: absolute; right: 4px; bottom: 4px; width: 24px; height: 24px; background: transparent; color: rgba(255,255,255,0.35); border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Formatar texto">Aa</button>
        </div>
      </div>
      <div style="margin-bottom: 8px; padding: 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(255,255,255,0.04);">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 700; letter-spacing: 1px; color: white; background: #ec4899; margin-bottom: 8px; text-transform: uppercase;">Feminino</span>
        <div style="margin-bottom: 5px;">
          <label style="display: block; margin-bottom: 3px; font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4);">ARO</label>
          <input type="text" id="campo-aro-1" value="" style="width: 100%; padding: 7px 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none;">
        </div>
        <div style="position: relative;">
          <label style="display: block; margin-bottom: 3px; font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4);">DADOS</label>
          <input type="text" id="campo-valor-1" value="" style="width: 100%; padding: 7px 30px 7px 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none;" placeholder="Dados...">
          <button class="btn-formatar" data-target="campo-valor-1" style="position: absolute; right: 4px; bottom: 4px; width: 24px; height: 24px; background: transparent; color: rgba(255,255,255,0.35); border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Formatar texto">Aa</button>
        </div>
      </div>
    `;
  }

  popup.innerHTML = `
    <style>
      #extensao-popup-overlay input:focus,
      #extensao-popup-overlay textarea:focus {
        border-color: rgba(99,102,241,0.5) !important;
        box-shadow: 0 0 0 2px rgba(99,102,241,0.2) !important;
      }
      #extensao-popup-overlay input::placeholder {
        color: rgba(255,255,255,0.25);
      }
      #extensao-popup-overlay .btn-formatar:hover {
        color: rgba(255,255,255,0.7) !important;
        background: rgba(255,255,255,0.08) !important;
      }
      #extensao-popup-overlay select:focus {
        border-color: rgba(99,102,241,0.5) !important;
        box-shadow: 0 0 0 2px rgba(99,102,241,0.2) !important;
      }
      #extensao-popup-overlay select option {
        background: #1a1a2e;
        color: #fff;
      }
    </style>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      ${criarBotoesSimbolos()}
      <button id="fechar-popup" style="width: 28px; height: 28px; background: transparent; color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.12); border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0;">✕</button>
    </div>

    <div id="conteudo-principal">
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 3px; font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4);">LOGIN</label>
        <input type="text" id="campo-login" value="${dados.login}" style="width: 100%; padding: 7px 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none;">
      </div>

      ${(!isAvulso || !dados.aros.some(aro => aro.modelo)) ?
      `<div style="margin-bottom: 10px;">
          <label style="display: block; margin-bottom: 3px; font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4);">MODELO</label>
          <textarea id="campo-modelo" style="width: 100%; padding: 7px 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none; max-height: 50px; resize: none; line-height: 1.4;">${dados.modelo}</textarea>
        </div>` :
      ''}

      ${arosHTML}

      <input type="hidden" id="campo-url" value="${dados.url}">
    </div>

    <div id="footer-principal" style="display: flex; gap: 6px; margin-top: 12px;">
      <button id="recapturar-dados" style="flex: 0 0 auto; background: transparent; color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 10px 12px; cursor: pointer; font-size: 11px; font-weight: 500; transition: all 0.2s;">Recapturar</button>
      <button id="criar-card-fefrello" style="flex: 1; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; border-radius: 10px; padding: 10px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">Criar Card</button>
      <button id="copiar-dados" style="flex: 1; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; border: none; border-radius: 10px; padding: 10px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; box-shadow: 0 2px 8px rgba(99,102,241,0.3);">Copiar e Fechar</button>
    </div>

    <div id="view-config-fefrello" style="display: none;">
      <div style="margin-bottom: 14px;">
        <span style="font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.6);">Configurações Fefrello</span>
      </div>
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 3px; font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4);">BOARD</label>
        <select id="config-board" style="width: 100%; padding: 7px 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none; cursor: pointer;">
          <option value="">Carregando...</option>
        </select>
      </div>
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 3px; font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4);">LISTA (COLUNA)</label>
        <select id="config-coluna" style="width: 100%; padding: 7px 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none; cursor: pointer;" disabled>
          <option value="">Selecione um board primeiro</option>
        </select>
      </div>
      <div style="margin-bottom: 14px;">
        <label style="display: block; margin-bottom: 3px; font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.4);">RESPONSÁVEL</label>
        <select id="config-responsavel" style="width: 100%; padding: 7px 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; box-sizing: border-box; outline: none; cursor: pointer;">
          <option value="">Selecione...</option>
          ${RESPONSAVEIS_FEFRELLO.map(r => `<option value="${r}">${r}</option>`).join('')}
        </select>
      </div>
      <button id="salvar-config-fefrello" style="width: 100%; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; border: none; border-radius: 10px; padding: 10px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; box-shadow: 0 2px 8px rgba(99,102,241,0.3);">Salvar Configurações</button>
    </div>
  `;

  container.appendChild(popup);
  document.body.appendChild(container);

  adicionarEventosBotoesSimbolos();

  document.querySelectorAll('.btn-formatar').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const campo = document.getElementById(targetId);
      if (campo) {
        campo.value = formatarTextoPrimeiraMaiuscula(campo.value);
        campo.focus();
      }
    });
  });

  const fecharBtn = document.getElementById('fechar-popup');
  fecharBtn.addEventListener('click', () => {
    container.remove();
  });
  fecharBtn.addEventListener('mouseenter', () => {
    fecharBtn.style.background = 'rgba(239,68,68,0.2)';
    fecharBtn.style.color = '#f87171';
    fecharBtn.style.borderColor = 'rgba(239,68,68,0.4)';
  });
  fecharBtn.addEventListener('mouseleave', () => {
    fecharBtn.style.background = 'transparent';
    fecharBtn.style.color = 'rgba(255,255,255,0.4)';
    fecharBtn.style.borderColor = 'rgba(255,255,255,0.12)';
  });

  const recapturarBtn = document.getElementById('recapturar-dados');
  recapturarBtn.addEventListener('mouseenter', () => {
    recapturarBtn.style.background = 'rgba(255,255,255,0.08)';
    recapturarBtn.style.color = 'rgba(255,255,255,0.9)';
  });
  recapturarBtn.addEventListener('mouseleave', () => {
    recapturarBtn.style.background = 'transparent';
    recapturarBtn.style.color = 'rgba(255,255,255,0.6)';
  });

  const copiarBtn = document.getElementById('copiar-dados');
  copiarBtn.addEventListener('mouseenter', () => {
    copiarBtn.style.boxShadow = '0 4px 16px rgba(99,102,241,0.45)';
    copiarBtn.style.transform = 'translateY(-1px)';
  });
  copiarBtn.addEventListener('mouseleave', () => {
    copiarBtn.style.boxShadow = '0 2px 8px rgba(99,102,241,0.3)';
    copiarBtn.style.transform = 'translateY(0)';
  });

  // --- NOVO EVENTO PARA RECAPTURAR DADOS ---
  recapturarBtn.addEventListener('click', () => {
    const popupOverlay = document.getElementById('extensao-popup-overlay');
    if (popupOverlay) {
      popupOverlay.remove();
    }
    const novosDados = capturarDados();
    salvarDados(novosDados);
    mostrarPopup(); // Reabre o popup com os novos dados
    mostrarNotificacao('Dados da página foram recapturados!');
  });


  copiarBtn.addEventListener('click', () => {
    const dadosParaCopiar = coletarDadosDaInterface(dados);
    const textoFormatado = formatarTextoParaCopia(dadosParaCopiar);

    navigator.clipboard.writeText(textoFormatado).then(() => {
      mostrarNotificacao('Dados copiados com sucesso!');
      limparDadosSalvos(); // Limpa os dados após copiar
      container.remove();
    }).catch(err => {
      const textarea = document.createElement('textarea');
      textarea.value = textoFormatado;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      mostrarNotificacao('Dados copiados com sucesso!');
      limparDadosSalvos(); // Limpa os dados após copiar
      container.remove();
    });
  });

  // --- TOGGLE CONFIG FEFRELLO ---
  const viewConfig = document.getElementById('view-config-fefrello');
  const btnConfig = document.getElementById('btn-config-fefrello');
  let configAberta = false;

  if (btnConfig) {
    btnConfig.addEventListener('click', async () => {
      configAberta = !configAberta;
      if (configAberta) {
        btnConfig.style.background = 'rgba(255,255,255,0.15)';
        btnConfig.style.color = '#fff';
        // Esconder view principal (exceto header e footer) — mostra config
        const conteudoPrincipal = document.getElementById('conteudo-principal');
        const footerPrincipal = document.getElementById('footer-principal');
        if (conteudoPrincipal) conteudoPrincipal.style.display = 'none';
        if (footerPrincipal) footerPrincipal.style.display = 'none';
        viewConfig.style.display = 'block';
        // Carregar dados
        await carregarDadosConfig();
      } else {
        btnConfig.style.background = 'transparent';
        btnConfig.style.color = 'rgba(255,255,255,0.5)';
        const conteudoPrincipal = document.getElementById('conteudo-principal');
        const footerPrincipal = document.getElementById('footer-principal');
        if (conteudoPrincipal) conteudoPrincipal.style.display = 'block';
        if (footerPrincipal) footerPrincipal.style.display = 'flex';
        viewConfig.style.display = 'none';
      }
    });

    btnConfig.addEventListener('mouseenter', () => {
      if (!configAberta) btnConfig.style.background = 'rgba(255,255,255,0.1)';
    });
    btnConfig.addEventListener('mouseleave', () => {
      if (!configAberta) btnConfig.style.background = 'transparent';
    });
  }

  async function carregarDadosConfig() {
    const selectBoard = document.getElementById('config-board');
    const selectColuna = document.getElementById('config-coluna');
    const selectResponsavel = document.getElementById('config-responsavel');

    const configSalva = await carregarConfigFefrello();

    // Carregar boards
    selectBoard.innerHTML = '<option value="">Carregando...</option>';
    try {
      const boards = await carregarBoards();
      selectBoard.innerHTML = '<option value="">Selecione o board...</option>';
      boards.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        if (configSalva && configSalva.boardId === b.id) opt.selected = true;
        selectBoard.appendChild(opt);
      });

      // Se tem board salvo, carregar colunas
      if (configSalva && configSalva.boardId) {
        await carregarColunasNoSelect(configSalva.boardId, configSalva.columnId);
      }

      // Se tem responsavel salvo
      if (configSalva && configSalva.responsible) {
        selectResponsavel.value = configSalva.responsible;
      }
    } catch (e) {
      selectBoard.innerHTML = '<option value="">Erro ao carregar boards</option>';
      mostrarNotificacao('Erro ao carregar boards: ' + e.message, 'error');
    }

    // Evento ao trocar board
    selectBoard.addEventListener('change', async () => {
      const boardId = selectBoard.value;
      if (boardId) {
        await carregarColunasNoSelect(boardId);
      } else {
        selectColuna.innerHTML = '<option value="">Selecione um board primeiro</option>';
        selectColuna.disabled = true;
      }
    });
  }

  async function carregarColunasNoSelect(boardId, columnIdSalva) {
    const selectColuna = document.getElementById('config-coluna');
    selectColuna.innerHTML = '<option value="">Carregando...</option>';
    selectColuna.disabled = true;
    try {
      const colunas = await carregarColunas(boardId);
      selectColuna.innerHTML = '<option value="">Selecione a coluna...</option>';
      colunas.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.title;
        if (columnIdSalva && columnIdSalva === c.id) opt.selected = true;
        selectColuna.appendChild(opt);
      });
      selectColuna.disabled = false;
    } catch (e) {
      selectColuna.innerHTML = '<option value="">Erro ao carregar colunas</option>';
      mostrarNotificacao('Erro ao carregar colunas: ' + e.message, 'error');
    }
  }

  // Salvar config
  const salvarConfigBtn = document.getElementById('salvar-config-fefrello');
  if (salvarConfigBtn) {
    salvarConfigBtn.addEventListener('click', async () => {
      const boardId = document.getElementById('config-board').value;
      const columnId = document.getElementById('config-coluna').value;
      const responsible = document.getElementById('config-responsavel').value;

      if (!boardId || !columnId) {
        mostrarNotificacao('Selecione board e coluna', 'error');
        return;
      }

      await salvarConfigFefrello({ boardId, columnId, responsible });
      mostrarNotificacao('Configurações salvas!');

      // Voltar para view principal
      configAberta = false;
      btnConfig.style.background = 'transparent';
      btnConfig.style.color = 'rgba(255,255,255,0.5)';
      const conteudoPrincipal = document.getElementById('conteudo-principal');
      const footerPrincipal = document.getElementById('footer-principal');
      if (conteudoPrincipal) conteudoPrincipal.style.display = 'block';
      if (footerPrincipal) footerPrincipal.style.display = 'flex';
      viewConfig.style.display = 'none';
    });
  }

  // --- CRIAR CARD FEFRELLO ---
  const criarCardBtn = document.getElementById('criar-card-fefrello');
  if (criarCardBtn) {
    criarCardBtn.addEventListener('mouseenter', () => {
      criarCardBtn.style.boxShadow = '0 4px 16px rgba(16,185,129,0.45)';
      criarCardBtn.style.transform = 'translateY(-1px)';
    });
    criarCardBtn.addEventListener('mouseleave', () => {
      criarCardBtn.style.boxShadow = '0 2px 8px rgba(16,185,129,0.3)';
      criarCardBtn.style.transform = 'translateY(0)';
    });

    criarCardBtn.addEventListener('click', async () => {
      const config = await carregarConfigFefrello();
      if (!config || !config.boardId || !config.columnId) {
        mostrarNotificacao('Configure o Fefrello primeiro (⚙)', 'error');
        return;
      }

      const dadosParaCopiar = coletarDadosDaInterface(dados);
      const descricao = formatarTextoParaCopia(dadosParaCopiar);
      const titulo = document.getElementById('campo-login')?.value || 'Sem título';

      // Feedback visual
      criarCardBtn.disabled = true;
      const textoOriginal = criarCardBtn.textContent;
      criarCardBtn.textContent = 'Criando...';
      criarCardBtn.style.opacity = '0.7';

      try {
        await criarCardFefrello(config.boardId, config.columnId, titulo, descricao, config.responsible);
        mostrarNotificacao('Card criado com sucesso!');
        limparDadosSalvos();
        container.remove();
      } catch (e) {
        mostrarNotificacao('Erro ao criar card: ' + e.message, 'error');
        criarCardBtn.disabled = false;
        criarCardBtn.textContent = textoOriginal;
        criarCardBtn.style.opacity = '1';
      }
    });
  }
}

function coletarDadosDaInterface(dadosOriginais) {
  const login = document.getElementById('campo-login')?.value || '';
  const modelo = document.getElementById('campo-modelo')?.value || '';
  const url = document.getElementById('campo-url')?.value || '';

  const aros = [];
  if (dadosOriginais.aros.length > 0) {
    dadosOriginais.aros.forEach((aro, index) => {
      const campoAro = document.getElementById(`campo-aro-${index}`);
      const campoValor = document.getElementById(`campo-valor-${index}`);
      const campoModeloAro = document.getElementById(`campo-modelo-aro-${index}`);

      if (campoAro) {
        const aroTexto = campoAro.value.trim();
        const valorTexto = campoValor ? campoValor.value.trim() : '';
        const novoAro = {
          numero: aroTexto,
          valor: valorTexto,
          tipo: aro.tipo,
          modelo: campoModeloAro ? campoModeloAro.value : aro.modelo
        };
        aros.push(novoAro);
      }
    });
  } else {
    const campoAroMasc = document.getElementById('campo-aro-0');
    const campoValorMasc = document.getElementById('campo-valor-0');
    const campoAroFem = document.getElementById('campo-aro-1');
    const campoValorFem = document.getElementById('campo-valor-1');

    aros.push({
      numero: campoAroMasc ? campoAroMasc.value.trim() : '',
      valor: campoValorMasc ? campoValorMasc.value.trim() : '',
      tipo: 'Masculino',
      modelo: modelo
    });

    aros.push({
      numero: campoAroFem ? campoAroFem.value.trim() : '',
      valor: campoValorFem ? campoValorFem.value.trim() : '',
      tipo: 'Feminino',
      modelo: modelo
    });
  }


  return {
    login,
    modelo,
    aros,
    url
  };
}

function mostrarNotificacao(mensagem, tipo = 'success') {
  const notificacaoExistente = document.getElementById('extensao-notificacao');
  if (notificacaoExistente) {
    notificacaoExistente.remove();
  }

  const notificacao = document.createElement('div');
  notificacao.id = 'extensao-notificacao';
  notificacao.style.cssText = `
    position: fixed;
    top: 20px;
    right: 360px;
    background: ${tipo === 'success' ? 'rgba(99,102,241,0.95)' : 'rgba(239,68,68,0.95)'};
    color: white;
    padding: 10px 16px;
    border-radius: 10px;
    z-index: 10001;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    backdrop-filter: blur(8px);
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.3s ease;
  `;

  notificacao.textContent = mensagem;
  document.body.appendChild(notificacao);

  setTimeout(() => {
    notificacao.style.opacity = '1';
    notificacao.style.transform = 'translateY(0)';
  }, 10);

  setTimeout(() => {
    notificacao.style.opacity = '0';
    notificacao.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      if (notificacao.parentNode) {
        notificacao.remove();
      }
    }, 300);
  }, 3000);
}

// ===============================================
// Lógica para o botão flutuante e interações
// ===============================================

function createFloatingButton() {
  const button = document.createElement('button');
  button.id = 'extensao-floating-button';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #007cba;
    color: white;
    border: none;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    z-index: 9999;
    transition: background 0.2s;
  `;
  button.innerHTML = '📋'; // Clipboard icon

  const handle = document.createElement('div');
  handle.id = 'extensao-button-handle';
  handle.style.cssText = `
    position: absolute;
    top: 0px;
    left: 0px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    cursor: grab;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #333;
    line-height: 1;
    opacity: 0;
    transition: opacity 0.2s;
  `;
  handle.innerHTML = '&#x22EF;'; // Three dots vertical

  button.appendChild(handle);
  document.body.appendChild(button);

  let isDragging = false;
  let offsetX, offsetY;

  // Show handle on hover
  button.addEventListener('mouseenter', () => {
    handle.style.opacity = '1';
  });

  button.addEventListener('mouseleave', () => {
    if (!isDragging) {
      handle.style.opacity = '0';
    }
  });

  handle.addEventListener('mousedown', (e) => {
    isDragging = true;
    handle.style.cursor = 'grabbing';
    offsetX = e.clientX - button.getBoundingClientRect().left;
    offsetY = e.clientY - button.getBoundingClientRect().top;
    button.style.transition = 'none'; // Disable transition during drag
    e.preventDefault(); // Prevent text selection
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;

    // Boundary checks to keep button within viewport
    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - button.offsetWidth));
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - button.offsetHeight));

    button.style.left = `${newLeft}px`;
    button.style.top = `${newTop}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      handle.style.cursor = 'grab';
      button.style.transition = 'background 0.2s, top 0.2s, left 0.2s'; // Re-enable transition

      // Save position to Chrome local storage
      const position = {
        left: button.style.left,
        top: button.style.top
      };
      chrome.storage.local.set({
        [BUTTON_POSITION_STORAGE_KEY]: position
      });
    }
  });

  button.addEventListener('click', (e) => {
    // Ação principal: Apenas abrir o popup com os dados já capturados
    if (!isDragging && e.target !== handle) {
      mostrarPopup();
    }
  });

  // Load saved position
  chrome.storage.local.get([BUTTON_POSITION_STORAGE_KEY], (result) => {
    if (result[BUTTON_POSITION_STORAGE_KEY]) {
      button.style.left = result[BUTTON_POSITION_STORAGE_KEY].left;
      button.style.top = result[BUTTON_POSITION_STORAGE_KEY].top;
      button.style.right = 'auto'; // Disable right/bottom if left/top are set
      button.style.bottom = 'auto';
    }
  });
}

// ===============================================
// NOVA FUNCIONALIDADE: Monitoramento de mudanças de URL
// ===============================================

let urlAtual = window.location.href;

function monitorarMudancasURL() {
  // Verifica mudanças de URL a cada 500ms
  setInterval(() => {
    const novaURL = window.location.href;
    if (novaURL !== urlAtual) {
      urlAtual = novaURL;
      
      // Só atualiza o URL se já tiver dados salvos na sessão
      const dadosExistentes = carregarDados();
      if (dadosExistentes && (dadosExistentes.login || dadosExistentes.modelo)) {
        const foiAtualizado = atualizarApenasURL(novaURL);
        if (foiAtualizado) {
          console.log('URL atualizado automaticamente:', novaURL);
          // Mostra uma pequena notificação discreta
          mostrarNotificacaoURL('URL atualizado');
        }
      }
    }
  }, 500);
}

function mostrarNotificacaoCoracao(mensagem) {
  const notificacaoExistente = document.getElementById('extensao-notificacao-coracao');
  if (notificacaoExistente) {
    notificacaoExistente.remove();
  }

  const notificacao = document.createElement('div');
  notificacao.id = 'extensao-notificacao-coracao';
  notificacao.style.cssText = `
    position: fixed;
    top: 60px;
    right: 20px;
    background: #ff6b6b;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    z-index: 10001;
    font-family: Arial, sans-serif;
    font-size: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    opacity: 0;
    transform: translateX(20px);
    transition: all 0.3s ease;
  `;

  notificacao.innerHTML = `♥ ${mensagem}`;
  document.body.appendChild(notificacao);

  setTimeout(() => {
    notificacao.style.opacity = '1';
    notificacao.style.transform = 'translateX(0)';
  }, 10);

  setTimeout(() => {
    notificacao.style.opacity = '0';
    notificacao.style.transform = 'translateX(20px)';
    setTimeout(() => {
      if (notificacao.parentNode) {
        notificacao.remove();
      }
    }, 300);
  }, 2000);
}

function mostrarNotificacaoURL(mensagem) {
  const notificacaoExistente = document.getElementById('extensao-notificacao-url');
  if (notificacaoExistente) {
    notificacaoExistente.remove();
  }

  const notificacao = document.createElement('div');
  notificacao.id = 'extensao-notificacao-url';
  notificacao.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #17a2b8;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    z-index: 10001;
    font-family: Arial, sans-serif;
    font-size: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    opacity: 0;
    transform: translateX(20px);
    transition: all 0.3s ease;
  `;

  notificacao.textContent = mensagem;
  document.body.appendChild(notificacao);

  setTimeout(() => {
    notificacao.style.opacity = '1';
    notificacao.style.transform = 'translateX(0)';
  }, 10);

  setTimeout(() => {
    notificacao.style.opacity = '0';
    notificacao.style.transform = 'translateX(20px)';
    setTimeout(() => {
      if (notificacao.parentNode) {
        notificacao.remove();
      }
    }, 300);
  }, 1500);
}

// ===============================================
// Lógica Principal de Execução
// ===============================================
if (window.location.hostname.includes('mercadolivre.com.br') || window.location.hostname.includes('mercadolibre.com')) {
  window.addEventListener('load', () => {
    // Cria o botão flutuante em todas as páginas relevantes
    createFloatingButton();
    
    // Inicia o monitoramento de mudanças de URL
    monitorarMudancasURL();

    // Verifica se os dados já foram capturados nesta sessão da aba
    const dadosJaSalvos = carregarDados();
    
    // Captura e salva os dados apenas se não houver nada salvo na sessão da aba
    if (!dadosJaSalvos || !dadosJaSalvos.url) {
      const dadosPagina = capturarDados();
      // Só salva se tiver capturado um login ou um modelo, para evitar salvar em páginas erradas
      if (dadosPagina.login || dadosPagina.modelo) {
        salvarDados(dadosPagina);
        mostrarNotificacao('Dados da página capturados em segundo plano!');
      }
    } else {
      // Se já tem dados salvos, apenas atualiza o URL se for diferente
      if (dadosJaSalvos.url !== window.location.href) {
        atualizarApenasURL(window.location.href);
      }
    }
  });
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capturar_e_copiar') { // Esta ação agora apenas abre o popup
    try {
      mostrarPopup();
      sendResponse({
        success: true
      });
    } catch (error) {
      console.error('Erro ao mostrar o popup:', error);
      mostrarNotificacao('Erro ao abrir a interface', 'error');
      sendResponse({
        success: false,
        error: error.message
      });
    }

    return true; // Indica resposta assíncrona
  }
});