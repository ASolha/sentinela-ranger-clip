// content.js - Versão completa com botões de formatação de texto
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
          for (let j = Math.max(0, i-3); j <= Math.min(linhas.length-1, i+3); j++) {
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
    const { numero, comPedra, complemento } = formatarAro(aro.numero);
    texto += `${aro.tipo} ${numero}${comPedra} -     ${complemento}\n`;
  });

  const avulsos = dados.aros.filter(a => !a.tipo);
  avulsos.forEach((aro, i) => {
    const { numero, comPedra, complemento, modelo } = formatarAro(aro.numero, null, aro.modelo);
    
    if (i > 0) texto += '\n';
    texto += `Aro avulso ${i+1}\n`;
    if (modelo) texto += `Modelo ${modelo}\n`;
    texto += `${numero}${comPedra} -     ${complemento}\n`;
  });

  return texto + `\n${dados.login}`;
}

function copiarDados(dados) {
  const textoFormatado = formatarTextoParaCopia(dados);
  
  return navigator.clipboard.writeText(textoFormatado).then(() => {
    return true;
  }).catch(err => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = textoFormatado;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (e) {
      return false;
    }
  });
}

const STORAGE_KEY = 'extensao_dados_capturados';

function salvarDados(dados) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  } catch (e) {
    console.error('Erro ao salvar dados:', e);
  }
}

function carregarDados() {
  try {
    const dadosSalvos = localStorage.getItem(STORAGE_KEY);
    if (dadosSalvos) {
      return JSON.parse(dadosSalvos);
    }
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
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
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Erro ao limpar dados:', e);
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
  
  let dados = carregarDados();
  const dadosCapturados = capturarDados();
  
  dados = {
    login: dadosCapturados.login || dados.login,
    modelo: dadosCapturados.modelo || dados.modelo,
    aros: dadosCapturados.aros.length > 0 ? dadosCapturados.aros : dados.aros,
    url: dadosCapturados.url || dados.url
  };
  
  salvarDados(dados);
  
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
      </div>` 
      : ''}
    
    ${arosHTML}
    
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">URL Atual:</label>
      <textarea id="campo-url" readonly style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 12px; min-height: 40px; background: #f5f5f5; resize: vertical;">${dados.url}</textarea>
    </div>
    
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <button id="copiar-dados" style="background: #4CAF50; color: white; border: none; border-radius: 5px; padding: 10px; cursor: pointer; font-size: 14px;">📋 Copiar e Fechar</button>
    </div>
    
    <div style="margin-top: 15px; padding: 10px; background: #e8f4fd; border-radius: 5px; font-size: 12px; color: #0056b3;">
      💡 <strong>Dica:</strong> Os dados foram automaticamente copiados ao abrir. Você pode editar e copiar novamente quando quiser. Use os botões ♥, ∞ e Aa para formatar os textos.
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
    limparDadosSalvos();
    container.remove();
  });
  
  document.getElementById('copiar-dados').addEventListener('click', () => {
    const dadosParaCopiar = coletarDadosDaInterface(dados);
    const textoFormatado = formatarTextoParaCopia(dadosParaCopiar);
    
    navigator.clipboard.writeText(textoFormatado).then(() => {
      limparDadosSalvos();
      container.remove();
    }).catch(err => {
      const textarea = document.createElement('textarea');
      textarea.value = textoFormatado;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      limparDadosSalvos();
      container.remove();
    });
  });
}

function coletarDadosDaInterface(dadosOriginais) {
  const login = document.getElementById('campo-login')?.value || '';
  const modelo = document.getElementById('campo-modelo')?.value || '';
  const url = document.getElementById('campo-url')?.value || '';
  
  const aros = [];
  dadosOriginais.aros.forEach((aro, index) => {
    const campoAro = document.getElementById(`campo-aro-${index}`);
    const campoModeloAro = document.getElementById(`campo-modelo-aro-${index}`);
    
    if (campoAro) {
      const novoAro = {
        numero: campoAro.value.replace(' - ', '').trim(),
        tipo: aro.tipo,
        modelo: campoModeloAro ? campoModeloAro.value : aro.modelo
      };
      aros.push(novoAro);
    }
  });
  
  if (dadosOriginais.aros.length === 0) {
    const campoMasc = document.getElementById('campo-aro-0');
    const campoFem = document.getElementById('campo-aro-1');
    
    if (campoMasc) {
      aros.push({
        numero: campoMasc.value.replace(' - ', '').trim(),
        tipo: 'Masculino',
        modelo: ''
      });
    }
    
    if (campoFem) {
      aros.push({
        numero: campoFem.value.replace(' - ', '').trim(),
        tipo: 'Feminino',
        modelo: ''
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capturar_e_copiar') {
    try {
      limparDadosSalvos();
      const dados = capturarDados();
      
      copiarDados(dados).then(success => {
        if (success) {
          mostrarNotificacao('Dados copiados automaticamente!');
        }
      }).catch(() => {
        mostrarNotificacao('Dados capturados, mas erro ao copiar automaticamente', 'error');
      });
      
      mostrarPopup();
      
      sendResponse({success: true});
      
    } catch (error) {
      console.error('Erro ao capturar dados:', error);
      mostrarNotificacao('Erro ao capturar dados da página', 'error');
      sendResponse({success: false, error: error.message});
    }
    
    return true;
  }
});

window.addEventListener('load', () => {
  const dadosSalvos = carregarDados();
  if ((dadosSalvos.login || dadosSalvos.modelo || dadosSalvos.aros.length > 0) && !document.getElementById('extensao-popup-overlay')) {
    setTimeout(() => {
      mostrarPopup();
    }, 1000);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  capturarDados();
});