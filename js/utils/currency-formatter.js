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
        
        // Aplicar formatação inicial se houver valor
        if (campo.value) {
            let valor = this.extrairNumeros(campo.value);
            if (valor) {
                campo.value = this.formatarValorMonetario(valor);
            } else {
                campo.value = '';
            }
        }
        
        // Adicionar listeners para formatação em tempo real
        campo.addEventListener('input', function(e) {
            let valor = CurrencyFormatter.extrairNumeros(this.value);
            
            // Se não houver valor, deixar vazio
            if (!valor) {
                this.value = '';
                return;
            }
            
            // Formatar e atualizar o campo
            this.value = CurrencyFormatter.formatarValorMonetario(valor);
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
        return texto.replace(/\D/g, '');
    },
    
    /**
     * Formata um valor numérico como moeda brasileira
     * @param {string} valor - Valor em string (apenas dígitos)
     * @returns {string} - Valor formatado (ex: R$ 1.234,56)
     */
    formatarValorMonetario: function(valor) {
        // Converter para número e dividir por 100 (para considerar centavos)
        const valorNumerico = parseFloat(valor) / 100;
        
        // Formatar no padrão brasileiro
        return valorNumerico.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
};

// Inicializar automaticamente quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    CurrencyFormatter.inicializar();
});