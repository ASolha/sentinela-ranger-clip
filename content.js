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

  const formatarAro = (numero, tipo, modeloEspecifico) => {
    const padrao = /^(\d+)\s*(.*)/;
    const [, num, resto] = numero.match(padrao) || [];

    const temPedra = resto.toLowerCase().includes('com pedra');
    const complemento = resto.replace(/com\s+pedra/gi, '').trim();

    return {
      numero: num,
      comPedra: temPedra ? ' com pedra' : '',
      complemento: complemento,
      modelo: modeloEspecifico
    };
  };

  dados.aros.filter(a => a.tipo).forEach(aro => {
    const {
      numero,
      comPedra,
      complemento
    } = formatarAro(aro.numero);
    // Alterado para usar 20 espaços após o hífen
    texto += `${aro.tipo} ${numero}${comPedra} -                    ${complemento}\n`;
  });

  const avulsos = dados.aros.filter(a => !a.tipo);
  avulsos.forEach((aro, i) => {
    const {
      numero,
      comPedra,
      complemento,
      modelo
    } = formatarAro(aro.numero, null, aro.modelo);

    if (i > 0) texto += '\n';
    texto += `Aro avulso ${i+1}\n`;
    if (modelo) texto += `Modelo ${modelo}\n`;
    // Alterado para usar 20 espaços após o hífen
    texto += `${numero}${comPedra} -                    ${complemento}\n`;
  });

  return texto + `\n${dados.login}`;
}

const SESSION_STORAGE_KEY = 'extensao_dados_capturados_sessao';
const BUTTON_POSITION_STORAGE_KEY = 'extensao_button_position';

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
  const partes = texto.split(' - ');
  if (partes.length < 2) return texto;

  const textoParaFormatar = partes[1];
  const textoFormatado = textoParaFormatar.toLowerCase()
    .split(' ')
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(' ');

  return `${partes[0]} - ${textoFormatado}`;
}

function criarBotoesSimbolos() {
  return `
    <div style="display: flex; gap: 8px; margin-bottom: 15px; justify-content: center;">
      <button id="btn-coracao" type="button" style="background: #ff6b6b; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer; font-size: 16px; transition: background 0.2s;" title="Inserir coração">♥</button>
      <button id="btn-infinito" type="button" style="background: #4dabf7; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer; font-size: 16px; transition: background 0.2s;" title="Inserir infinito">∞</button>
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
      btnCoracao.style.background = '#ff5252';
    });
    btnCoracao.addEventListener('mouseleave', () => {
      btnCoracao.style.background = '#ff6b6b';
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
      btnInfinito.style.background = '#339af0';
    });
    btnInfinito.addEventListener('mouseleave', () => {
      btnInfinito.style.background = '#4dabf7';
    });
  }

  const btnFormatarTudo = document.getElementById('btn-formatar-tudo');
  if (btnFormatarTudo) {
    btnFormatarTudo.addEventListener('click', () => {
      document.querySelectorAll('input[type="text"], textarea').forEach(campo => {
        if (campo.id !== 'campo-url') {
          campo.value = formatarTextoPrimeiraMaiuscula(campo.value);
        }
      });
      mostrarNotificacao('Todos os textos foram formatados!');
    });

    btnFormatarTudo.addEventListener('mouseenter', () => {
      btnFormatarTudo.style.background = '#5a6268';
    });
    btnFormatarTudo.addEventListener('mouseleave', () => {
      btnFormatarTudo.style.background = '#6c757d';
    });
  }
}

function criarInterfaceAro(aro, index, isAvulso = false) {
  const tipoLabel = isAvulso ? `Aro Avulso ${index + 1}` : (aro.tipo || `Aro ${index + 1}`);

  let html = `<div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background: #f9f9f9;">`;
  html += `<label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">${tipoLabel}:</label>`;

  if (isAvulso && aro.modelo) {
    html += `<div style="margin-bottom: 10px;">`;
    html += `<label style="display: block; margin-bottom: 3px; font-size: 12px; color: #666;">Modelo:</label>`;
    html += `<div style="display: flex; gap: 5px; align-items: center;">
      <input type="text" id="campo-modelo-aro-${index}" value="${aro.modelo}" style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box; font-size: 13px;">
    </div>`;
    html += `</div>`;
  }

  html += `<div style="display: flex; gap: 5px; align-items: center;">
    <input type="text" id="campo-aro-${index}" value="${aro.numero} - " style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 14px;">
    <button class="btn-formatar" data-target="campo-aro-${index}" style="background: #6c757d; color: white; border: none; border-radius: 4px; padding: 8px 10px; cursor: pointer; font-size: 14px;" title="Formatar texto">Aa</button>
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
    width: 350px;
    height: 100vh;
    background: rgba(255, 255, 255, 0.98);
    z-index: 10000;
    box-shadow: -3px 0 15px rgba(0, 0, 0, 0.2);
    overflow-y: auto;
    font-family: Arial, sans-serif;
  `;

  const popup = document.createElement('div');
  popup.style.cssText = `
    padding: 20px;
    height: 100%;
    box-sizing: border-box;
  `;

  let arosHTML = '';
  dados.aros.forEach((aro, index) => {
    arosHTML += criarInterfaceAro(aro, index, isAvulso);
  });

  if (dados.aros.length === 0) {
    arosHTML = `
      <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background: #f9f9f9;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Masculino:</label>
        <div style="display: flex; gap: 5px; align-items: center;">
          <input type="text" id="campo-aro-0" value=" - " style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 14px;">
          <button class="btn-formatar" data-target="campo-aro-0" style="background: #6c757d; color: white; border: none; border-radius: 4px; padding: 8px 10px; cursor: pointer; font-size: 14px;" title="Formatar texto">Aa</button>
        </div>
      </div>
      <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background: #f9f9f9;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Feminino:</label>
        <div style="display: flex; gap: 5px; align-items: center;">
          <input type="text" id="campo-aro-1" value=" - " style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 14px;">
          <button class="btn-formatar" data-target="campo-aro-1" style="background: #6c757d; color: white; border: none; border-radius: 4px; padding: 8px 10px; cursor: pointer; font-size: 14px;" title="Formatar texto">Aa</button>
        </div>
      </div>
    `;
  }

  popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #007cba; padding-bottom: 10px;">
      <h2 style="margin: 0; color: #007cba; font-size: 18px;">Capturador de Dados</h2>
      <button id="fechar-popup" style="background: #ff4444; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 14px;">✕</button>
    </div>

    ${criarBotoesSimbolos()}

    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Login:</label>
      <div style="display: flex; gap: 5px; align-items: center;">
        <input type="text" id="campo-login" value="${dados.login}" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 14px;">
      </div>
    </div>

    ${(!isAvulso || !dados.aros.some(aro => aro.modelo)) ?
    `<div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Modelo da Aliança:</label>
        <div style="display: flex; gap: 5px; align-items: flex-start;">
          <textarea id="campo-modelo" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 14px; min-height: 60px; resize: vertical;">${dados.modelo}</textarea>
        </div>
      </div>` :
    ''}

    ${arosHTML}

    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">URL Capturada:</label>
      <textarea id="campo-url" readonly style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 12px; min-height: 40px; background: #f5f5f5; resize: vertical;">${dados.url}</textarea>
    </div>

    <div style="display: flex; flex-direction: column; gap: 10px;">
      <button id="recapturar-dados" style="background: #f0ad4e; color: white; border: none; border-radius: 5px; padding: 10px; cursor: pointer; font-size: 14px;">🔄 Recapturar Dados</button>
      <button id="copiar-dados" style="background: #4CAF50; color: white; border: none; border-radius: 5px; padding: 10px; cursor: pointer; font-size: 14px;">📋 Copiar e Fechar</button>
    </div>

    <div style="margin-top: 15px; padding: 10px; background: #e8f4fd; border-radius: 5px; font-size: 12px; color: #0056b3;">
      💡 <strong>Dica:</strong> O URL é atualizado automaticamente ao navegar. Use "Recapturar Dados" para atualizar login/modelo/aros.
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

  document.getElementById('fechar-popup').addEventListener('click', () => {
    container.remove(); // Apenas fecha o popup, não limpa os dados da sessão
  });

  // --- NOVO EVENTO PARA RECAPTURAR DADOS ---
  document.getElementById('recapturar-dados').addEventListener('click', () => {
    const popupOverlay = document.getElementById('extensao-popup-overlay');
    if (popupOverlay) {
      popupOverlay.remove();
    }
    const novosDados = capturarDados();
    salvarDados(novosDados);
    mostrarPopup(); // Reabre o popup com os novos dados
    mostrarNotificacao('Dados da página foram recapturados!');
  });


  document.getElementById('copiar-dados').addEventListener('click', () => {
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
}

function coletarDadosDaInterface(dadosOriginais) {
  const login = document.getElementById('campo-login')?.value || '';
  const modelo = document.getElementById('campo-modelo')?.value || '';
  const url = document.getElementById('campo-url')?.value || '';

  const aros = [];
  if (dadosOriginais.aros.length > 0) {
    dadosOriginais.aros.forEach((aro, index) => {
      const campoAro = document.getElementById(`campo-aro-${index}`);
      const campoModeloAro = document.getElementById(`campo-modelo-aro-${index}`);

      if (campoAro) {
        const novoAro = {
          numero: campoAro.value.startsWith(`${aro.numero} - `) ?
            aro.numero + ' ' + campoAro.value.split(' - ')[1] :
            campoAro.value,
          tipo: aro.tipo,
          modelo: campoModeloAro ? campoModeloAro.value : aro.modelo
        };
        aros.push(novoAro);
      }
    });
  } else {
    // Caso especial para quando não há aros capturados e a interface é gerada manualmente
    const campoMasc = document.getElementById('campo-aro-0');
    const campoFem = document.getElementById('campo-aro-1');

    if (campoMasc && campoMasc.value.trim() !== '-') {
      aros.push({
        numero: campoMasc.value.replace(' - ', '').trim(),
        tipo: 'Masculino',
        modelo: modelo // Usa o modelo principal
      });
    }

    if (campoFem && campoFem.value.trim() !== '-') {
      aros.push({
        numero: campoFem.value.replace(' - ', '').trim(),
        tipo: 'Feminino',
        modelo: modelo // Usa o modelo principal
      });
    }
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
    right: 370px;
    background: ${tipo === 'success' ? '#4CAF50' : '#f44336'};
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    z-index: 10001;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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