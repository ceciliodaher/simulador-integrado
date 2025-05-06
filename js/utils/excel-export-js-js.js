/**
 * Adiciona logo à planilha
 * @private
 * @param {Object} ws - Planilha alvo
 * @param {HTMLImageElement} logoImg - Elemento de imagem do logo
 * @param {Object} range - Range onde adicionar o logo
 */
_adicionarLogo: function(ws, logoImg, range) {
    try {
        // Verificar se a biblioteca XLSX suporta imagens
        if (!XLSX.utils || !XLSX.utils.sheet_add_image) {
            console.warn('Versão da biblioteca XLSX não suporta adição de imagens');
            return;
        }
        
        // Criar um canvas para converter a imagem
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Definir tamanho do canvas
        canvas.width = this.config.logoSize.width;
        canvas.height = this.config.logoSize.height;
        
        // Desenhar a imagem no canvas
        ctx.drawImage(logoImg, 0, 0, canvas.width, canvas.height);
        
        // Converter para base64
        const imgBase64 = canvas.toDataURL('image/png').split(',')[1];
        
        // Adicionar a imagem à planilha
        const imgOpts = {
            name: 'LogoExpertzy',
            data: imgBase64,
            opts: {
                base64: true,
                position: {
                    type: 'twoCellAnchor',
                    from: { col: range.s.c, row: range.s.r },
                    to: { col: range.e.c, row: range.e.r }
                }
            }
        };
        
        // Adicionar a imagem à planilha
        XLSX.utils.sheet_add_image(ws, imgOpts);
    } catch (e) {
        console.warn('Erro ao adicionar logo:', e);
    }
},

/**
 * Formata data no padrão brasileiro
 * @private
 * @param {Date} data - Data a ser formatada
 * @returns {string} Data formatada
 */
_formatarData: function(data) {
    if (!data || !(data instanceof Date)) {
        data = new Date();
    }
    
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const minuto = String(data.getMinutes()).padStart(2, '0');
    
    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
},

/**
 * Capitaliza a primeira letra de uma string
 * @private
 * @param {string} texto - Texto a ser capitalizado
 * @returns {string} Texto com a primeira letra maiúscula
 */
_capitalizarPrimeiraLetra: function(texto) {
    if (!texto || typeof texto !== 'string') {
        return '';
    }
    
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
},

/**
 * Obtém o nome formatado do regime tributário
 * @private
 * @param {string} regime - Código do regime tributário
 * @returns {string} Nome formatado do regime
 */
_obterRegimeTributarioFormatado: function(regime) {
    const regimes = {
        'real': 'Lucro Real',
        'presumido': 'Lucro Presumido',
        'simples': 'Simples Nacional',
        'mei': 'Microempreendedor Individual',
        'imune': 'Entidade Imune/Isenta'
    };
    
    return regimes[regime] || regime;
}
// Formatar tabela de impactos
for (let r = 35; r < 35 + impactos.length; r++) {
    // Alternar cores de fundo
    if ((r - 35) % 2 === 0) {
        estilos.push({ 
            range: { s: { r: r, c: 0 }, e: { r: r, c: 4 } },
            style: { 
                fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
            }
        });
    }
}

// Formatar texto de considerações
for (let r = 41; r <= 45; r += 2) {
    if (r <= 44) {
        estilos.push({ 
            range: { s: { r: r, c: 0 }, e: { r: r, c: 4 } },
            style: { 
                alignment: { wrapText: true }
            }
        });
    }
}

// Copyright
const copyrightRow = 45;
estilos.push({ 
    range: { s: { r: copyrightRow, c: 0 }, e: { r: copyrightRow, c: 4 } },
    style: { 
        font: { italic: true, sz: 9, color: { rgb: this.config.colors.neutral } },
        alignment: { horizontal: "center", vertical: "center" }
    }
});

// Mesclar células para títulos e textos longos
const mesclagens = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },    // Título principal
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },    // Subtítulo
    { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } },    // 1. CRONOGRAMA DE IMPLEMENTAÇÃO
    { s: { r: 14, c: 0 }, e: { r: 14, c: 4 } },  // 2. REDUÇÃO PROGRESSIVA DOS IMPOSTOS ATUAIS
    { s: { r: 25, c: 0 }, e: { r: 25, c: 4 } },  // 3. SISTEMA DE CRÉDITOS CRUZADOS
    { s: { r: 33, c: 0 }, e: { r: 33, c: 4 } },  // 4. IMPACTOS ESPERADOS DURANTE A TRANSIÇÃO
    { s: { r: 40, c: 0 }, e: { r: 40, c: 4 } },  // 5. CONSIDERAÇÕES SOBRE O PROCESSO DE TRANSIÇÃO
    { s: { r: 41, c: 0 }, e: { r: 41, c: 4 } },  // Consideração 1
    { s: { r: 43, c: 0 }, e: { r: 43, c: 4 } },  // Consideração 2
    { s: { r: copyrightRow, c: 0 }, e: { r: copyrightRow, c: 4 } }  // Copyright
];

// Adicionar mesclagens à planilha
ws['!merges'] = mesclagens;

// Aplicar largura personalizada para colunas
ws['!cols'] = [
    { wch: 20 },  // Coluna A
    { wch: 25 },  // Coluna B
    { wch: 25 },  // Coluna C
    { wch: 25 },  // Coluna D
    { wch: 40 }   // Coluna E (mais larga para observações)
];

// Logo (se disponível)
try {
    if (this.config.logoEnabled) {
        const logoImg = document.querySelector('img.logo');
        if (logoImg) {
            // Adicionar logo
            if (typeof this._adicionarLogo === 'function') {
                this._adicionarLogo(ws, logoImg, { s: { r: 2, c: 1 }, e: { r: 2, c: 4 } });
            }
        }
    }
} catch (e) {
    console.warn('Falha ao adicionar logo:', e);
}

return ws;

/**
 * Obtém a versão do simulador
 * @returns {string} Versão atual do simulador
 */
obterVersao: function() {
    return '1.0.0';
},

/**
 * Obtém informações sobre o exportador
 * @returns {Object} Informações do exportador
 */
obterInfo: function() {
    return {
        nome: 'ExcelExporter',
        versao: this.obterVersao(),
        descricao: 'Módulo de exportação para Excel do Simulador de Split Payment',
        autor: 'Expertzy Inteligência Tributária',
        copyright: '© 2025 Expertzy Inteligência Tributária'
    };
}