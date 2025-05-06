/**
 * Configuração de Dependências
 * Define a ordem de carregamento dos scripts e suas dependências
 */
const DependenciesConfig = {
    // Ordem de carregamento dos módulos
    loadOrder: [
        // Core (núcleo do sistema)
        'js/core/state-manager.js',
        'js/core/event-bus.js',
        'js/utils/dom-utils.js',
        
        // Utilitários
        'js/utils/formatters.js',
        'js/utils/validators.js',
        'js/utils/export-tools.js',
        'js/utils/currency-formatter.js',
        
        // Repositórios e gerenciadores de configuração
        'js/config/setores-repository.js',
        'js/repository/simulador-repository.js',
        'js/config/configuracoes-setoriais.js',
        'js/config/setores-manager.js',
        'js/config/config-manager.js',
        
        // Gerenciadores de UI
        'js/ui/tabs-manager.js',
        'js/ui/forms-manager.js',
        'js/ui/charts-manager.js',
        'js/ui/modal-manager.js',
        'js/ui/setores-ui.js',
        
        // Controladores
        'js/ui/simulacao-controller.js',
        'js/ui/memoria-controller.js',
        'js/ui/estrategias-controller.js',
        
        // Módulos de simulação
        'js/simulation/calculation.js',
        'js/simulation/simulator.js',
        'js/simulation/simulador-modulo.js',
        'js/simulation/strategies.js',
        
        // Integração
        'js/core/app-integrator.js',
        'js/integration.js',
        
        // Principal
        'js/main.js'
    ],
    
    // Dependências entre módulos
    dependencies: {
        'js/core/app-integrator.js': [
            'js/core/state-manager.js',
            'js/core/event-bus.js',
            'js/utils/dom-utils.js'
        ],
        'js/ui/simulacao-controller.js': [
            'js/core/state-manager.js',
            'js/core/event-bus.js',
            'js/utils/dom-utils.js'
        ],
        'js/ui/memoria-controller.js': [
            'js/core/state-manager.js',
            'js/core/event-bus.js',
            'js/utils/dom-utils.js'
        ],
        'js/ui/estrategias-controller.js': [
            'js/core/state-manager.js',
            'js/core/event-bus.js',
            'js/utils/dom-utils.js'
        ],
        'js/main.js': [
            'js/core/app-integrator.js'
        ]
    },
    
    /**
     * Verifica se todas as dependências de um módulo estão carregadas
     * @param {string} module - Caminho do módulo
     * @returns {boolean} - Se as dependências estão carregadas
     */
    areDependenciesLoaded: function(module) {
        if (!this.dependencies[module]) return true;
        
        return this.dependencies[module].every(dependency => {
            // Verificar se o script está carregado
            const scripts = document.querySelectorAll('script[src]');
            for (let i = 0; i < scripts.length; i++) {
                if (scripts[i].src.endsWith(dependency)) {
                    return true;
                }
            }
            
            return false;
        });
    },
    
    /**
     * Carrega dinamicamente um script
     * @param {string} src - Caminho do script
     * @returns {Promise} - Promise resolvida quando o script for carregado
     */
    loadScript: function(src) {
        return new Promise((resolve, reject) => {
            // Verificar se o script já está carregado
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }
            
            // Criar novo elemento script
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            // Configurar eventos
            script.onload = resolve;
            script.onerror = reject;
            
            // Adicionar à página
            document.head.appendChild(script);
        });
    },
    
    /**
     * Carrega todos os scripts na ordem definida
     * @returns {Promise} - Promise resolvida quando todos os scripts forem carregados
     */
    loadAllScripts: function() {
        return new Promise(async (resolve, reject) => {
            try {
                for (const script of this.loadOrder) {
                    await this.loadScript(script);
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }
};

// Inicializar carregamento quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    DependenciesConfig.loadAllScripts().then(() => {
        console.log('Todos os scripts carregados com sucesso');
    }).catch(error => {
        console.error('Erro ao carregar scripts:', error);
    });
});