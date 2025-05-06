/**
 * Gerenciador do sistema de abas
 */
const TabsManager = {
    /**
     * Inicializa o sistema de abas
     */
    inicializar: function() {
        console.log('Inicializando sistema de abas');
        
        // Inicialização das abas principais
        this.inicializarAbasPrincipais();
        
        // Inicialização das abas de estratégias
        this.inicializarAbasEstrategias();
        
        console.log('Sistema de abas inicializado');
    },

    /**
     * Configura as abas principais com eventos personalizados
     */
    // Substitua a função inicializarAbasPrincipais no arquivo tabs-manager.js
    inicializarAbasPrincipais: function() {
        const botoes = document.querySelectorAll('.tab-button');
        const conteudos = document.querySelectorAll('.tab-content');

        botoes.forEach(botao => {
            botao.addEventListener('click', () => {
                const tabId = botao.getAttribute('data-tab');
                console.log('Mudando para a aba:', tabId);

                // Reset de estados ativos
                botoes.forEach(b => b.classList.remove('active'));
                conteudos.forEach(c => c.classList.remove('active'));

                // Ativação dos elementos selecionados
                botao.classList.add('active');
                const conteudoAlvo = document.getElementById(tabId);
                if (conteudoAlvo) {
                    conteudoAlvo.classList.add('active');
                    console.log('Ativando conteúdo:', tabId);
                } else {
                    console.error('Conteúdo da aba não encontrado:', tabId);
                }

                // Disparo de evento personalizado
                const event = new CustomEvent('tabChange', {
                    detail: { tab: tabId }
                });
                document.dispatchEvent(event);
            });
        });
    },

    /**
     * Configura as abas de estratégias com eventos específicos
     */
    inicializarAbasEstrategias: function() {
        const botoes = document.querySelectorAll('.strategy-tab-button');
        const conteudos = document.querySelectorAll('.strategy-tab-content');

        botoes.forEach(botao => {
            botao.addEventListener('click', () => {
                const tabId = botao.getAttribute('data-strategy-tab');

                // Reset de estados ativos
                botoes.forEach(b => b.classList.remove('active'));
                conteudos.forEach(c => c.classList.remove('active'));

                // Ativação dos elementos selecionados
                botao.classList.add('active');
                document.getElementById('estrategia-' + tabId).classList.add('active');

                // Disparo de evento personalizado
                const event = new CustomEvent('strategyTabChange', {
                    detail: { tab: tabId }
                });
                document.dispatchEvent(event);
            });
        });
    },

    /**
     * Método para mudança programática de abas
     * @param {string} tabId - ID da aba a ser ativada
     */
    mudarPara: function(tabId) {
        const botao = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        if (botao) {
            botao.click();
        }
    } // Fechamento correto do método mudarPara
}; // Fechamento correto do objeto TabsManager