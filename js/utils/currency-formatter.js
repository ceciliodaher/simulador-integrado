/**
 * Formatador de Moeda em Tempo Real
 * Implementa formatação monetária à medida que o usuário digita
 */
const CurrencyFormatter = {
    /**
     * Inicializa o formatador em campos monetários específicos
     */
    inicializar: function() {
        console.log('Inicializando formatador de moeda em tempo real');

        // Verificar se DataManager está disponível
        if (window.DataManager) {
            console.log('DataManager disponível, utilizando suas funções para formatação monetária');
        } else {
            console.warn('DataManager não encontrado, utilizando formatação monetária independente');
        }

        // Selecionar todos os campos monetários pelo seletor de classe
        const camposMoeda = document.querySelectorAll('.money-input');

        // Aplicar formatação a cada campo
        camposMoeda.forEach(campo => {
            this.aplicarFormatacaoMoeda(campo);
        });

        // Campos específicos por ID (garantia extra)
        const camposEspecificos = [
            'faturamento',
            'faturamento-config', 
            'creditos',
            'creditos-config'
        ];

        camposEspecificos.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) {
                this.aplicarFormatacaoMoeda(campo);
            }
        });

        console.log('Formatador de moeda em tempo real inicializado');
    },
    
    /**
     * Aplica a formatação monetária a um campo específico
     * @param {HTMLElement} campo - Campo de entrada (input)
     */
    aplicarFormatacaoMoeda: function(campo) {
        // Verificar se já foi inicializado
        if (campo.dataset.currencyInitialized === 'true') {
            return;
        }

        // Aplicar a classe money-input caso não tenha
        if (!campo.classList.contains('money-input')) {
            campo.classList.add('money-input');
        }

        // Adicionar container se não existir
        const parent = campo.parentElement;
        if (!parent.classList.contains('money-input-container')) {
            // Envolver o campo em um container
            const container = document.createElement('div');
            container.className = 'money-input-container';
            parent.insertBefore(container, campo);
            container.appendChild(campo);

            // Adicionar o prefixo R$
            const prefix = document.createElement('span');
            prefix.className = 'money-prefix';
            prefix.textContent = 'R$';
            container.appendChild(prefix);
        }

        // Função de formatação que prioriza DataManager ou usa a nossa própria
        const formatarValor = (valor) => {
            if (window.DataManager && window.DataManager.formatarMoeda) {
                // Importante: DataManager.formatarMoeda espera valor em reais, não em centavos
                return window.DataManager.formatarMoeda(valor);
            } else {
                return this.formatarValorMonetario(Math.round(valor * 100).toString());
            }
        };

        // Função de extração que usa nosso próprio método para evitar referência circular
        const extrairValor = (texto) => {
            return parseFloat(this.extrairNumeros(texto)) / 100;
        };

        // Aplicar formatação inicial se houver valor
        if (campo.value) {
            const valorNumerico = extrairValor(campo.value);
            if (valorNumerico > 0) {
                campo.value = formatarValor(valorNumerico);
                campo.dataset.rawValue = valorNumerico.toString();
            } else {
                campo.value = '';
                campo.dataset.rawValue = '0';
            }
        }

        // No arquivo currency-formatter.js

        campo.addEventListener('input', function(e) {
            // Obter somente os dígitos do valor atual digitado
            const valorDigitado = this.value.replace(/\D/g, '');

            // Se não houver valor, deixar vazio ou zero formatado
            if (!valorDigitado) {
                this.value = '';
                this.dataset.rawValue = '0';
                return;
            }

            // Converter para valor numérico (em reais)
            const valorNumerico = parseFloat(valorDigitado) / 100;

            // Armazenar o valor numérico normalizado
            this.dataset.rawValue = valorNumerico.toString();

            // Formatar e atualizar o campo
            this.value = formatarValor(valorNumerico);

            // Disparar evento de normalização para integração
            const eventoNormalizacao = new CustomEvent('valorNormalizado', {
                detail: {
                    campo: this.id,
                    tipo: 'monetario',
                    valor: valorNumerico
                }
            });
            this.dispatchEvent(eventoNormalizacao);
        });

        // Selecionar todo o conteúdo ao focar
        campo.addEventListener('focus', function() {
            this.select();
        });

        // Marcar como inicializado
        campo.dataset.currencyInitialized = 'true';
    },
    
    /**
     * Extrai apenas os dígitos de uma string
     * @param {string} texto - Texto a ser processado
     * @returns {string} - Apenas os dígitos
     */
    extrairNumeros: function(texto) {
        // Se o DataManager estiver disponível, tentar usar sua função
        if (window.DataManager && window.DataManager.extrairValorMonetario) {
            // A função do DataManager retorna o valor em reais (não em centavos)
            // Converter para formato de centavos (string) para manter compatibilidade
            const valorEmReais = window.DataManager.extrairValorMonetario(texto);
            return Math.round(valorEmReais * 100).toString();
        }                       
        return texto.replace(/\D/g, '');
    },
    
    /**
     * Formata um valor numérico como moeda brasileira
     * @param {string} valor - Valor em string (apenas dígitos)
     * @returns {string} - Valor formatado (ex: R$ 1.234,56)
     */
    formatarValorMonetario: function(valor) {
        // Se o DataManager estiver disponível, usar sua implementação
        if (window.DataManager && window.DataManager.formatarMoeda) {
            // Converter de centavos para reais, pois o DataManager espera valor em reais
            const valorEmReais = parseFloat(valor) / 100;
            return window.DataManager.formatarMoeda(valorEmReais);
        }

        // Implementação original como fallback
        // Converter para número e dividir por 100 (para considerar centavos)
        const valorNumerico = parseFloat(valor) / 100;

        // Formatar no padrão brasileiro
        return valorNumerico.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },
    
    obterValorNumerico: function(campo) {
        // Se o campo tiver um rawValue no dataset, usar esse valor
        if (campo && campo.dataset && campo.dataset.rawValue) {
            return parseFloat(campo.dataset.rawValue) || 0;
        }

        // Caso contrário, extrair o valor diretamente do campo
        if (!campo) return 0;

        // Usar DataManager se disponível ou extrair diretamente
        return window.DataManager ? 
            window.DataManager.extrairValorMonetario(campo.value) : 
            parseFloat(this.extrairNumeros(campo.value)) / 100;
    }
};

// Inicializar automaticamente quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    CurrencyFormatter.inicializar();
});