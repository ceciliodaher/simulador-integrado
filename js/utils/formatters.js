/**
 * Utilitários para formatação de valores
 */
const FormatacaoHelper = {
    /**
     * Formata um valor numérico como moeda (R$)
     * @param {number} valor - Valor numérico para formatar
     * @returns {string} - Valor formatado como moeda
     */
    formatarMoeda: function(valor) {
        if (valor === undefined || valor === null) {
            return 'R$ 0,00';
        }
        return valor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },
    
    // Adicionar ao FormatacaoHelper em formatters.js
    formatarInputMonetarioLive: function(input) {
        if (window.CurrencyFormatter) {
            CurrencyFormatter.aplicarFormatacaoMoeda(input);
        } else {
            // Fallback para o método antigo
            this.formatarInputMonetario(input);
        }
    },
    
    /**
     * Formata um valor numérico como percentual
     * @param {number} valor - Valor numérico para formatar (decimal)
     * @returns {string} - Valor formatado como percentual
     */
    formatarPercentual: function(valor) {
        return (valor * 100).toLocaleString('pt-BR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }) + '%';
    },
    
    /**
     * Extrai o valor numérico de uma string formatada
     * @param {string} texto - Texto formatado (ex: "R$ 1.234,56" ou "12,5%")
     * @returns {number} - Valor numérico extraído
     */
    extrairValorNumerico: function(texto) {
        if (typeof texto === 'number') return texto;
        
        // Remover símbolos e substituir vírgula por ponto
        const valor = texto.replace(/[^\d,-]/g, '').replace(',', '.');
        return parseFloat(valor) || 0;
    },
    
    /**
     * Adiciona formatação monetária a um campo de entrada
     * @param {HTMLElement} input - Elemento de input para formatação
     */
    formatarInputMonetario: function(input) {
        input.addEventListener('blur', function() {
            const valor = FormatacaoHelper.extrairValorNumerico(this.value);
            this.value = FormatacaoHelper.formatarMoeda(valor);
        });
        
        // Formatar valor inicial
        if (input.value) {
            const valor = FormatacaoHelper.extrairValorNumerico(input.value);
            input.value = FormatacaoHelper.formatarMoeda(valor);
        }
    },
    
    /**
     * Adiciona formatação percentual a um campo de entrada
     * @param {HTMLElement} input - Elemento de input para formatação
     */
    formatarInputPercentual: function(input) {
        input.addEventListener('blur', function() {
            let valor = FormatacaoHelper.extrairValorNumerico(this.value);
            
            // Se o valor estiver entre 0 e 1, consideramos como decimal
            if (valor > 0 && valor < 1) {
                valor = valor * 100;
            }
            
            this.value = valor.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            }) + '%';
        });
        
        // Formatar valor inicial
        if (input.value) {
            let valor = FormatacaoHelper.extrairValorNumerico(input.value);
            
            // Se o valor estiver entre 0 e 1, consideramos como decimal
            if (valor > 0 && valor < 1) {
                valor = valor * 100;
            }
            
            input.value = valor.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            }) + '%';
        }
    }
};