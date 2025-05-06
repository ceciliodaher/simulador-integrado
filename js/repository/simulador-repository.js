// js/repository/simulador-repository.js
window.SimuladorRepository = {
    // Chave utilizada para armazenamento no localStorage
    STORAGE_KEY: 'split-payment-simulator-data',
    
    // Estrutura de dados principal
    _dadosSimulador: {
        // Copie a estrutura de dados do arquivo original...
    },
    
    /**
     * Inicializa o repositório
     */
    inicializar: function() {
        this._carregar();
        console.log('SimuladorRepository inicializado');
    },
    
    /**
     * Carrega os dados do localStorage
     * @returns {boolean} - Sucesso da operação
     */
    _carregar: function() {
        try {
            const dadosSalvos = localStorage.getItem(this.STORAGE_KEY);
            if (dadosSalvos) {
                // Mesclar dados salvos com a estrutura atual para preservar campos novos
                const dadosCarregados = JSON.parse(dadosSalvos);
                
                // Mesclar cada seção separadamente para não perder novos campos da estrutura
                Object.keys(dadosCarregados).forEach(secao => {
                    if (this._dadosSimulador[secao]) {
                        this._dadosSimulador[secao] = {
                            ...this._dadosSimulador[secao],
                            ...dadosCarregados[secao]
                        };
                    }
                });
                
                console.log('Dados carregados com sucesso do localStorage');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao carregar dados do localStorage:', error);
            return false;
        }
    },
    
    // Adicione os outros métodos aqui, adaptando para o novo formato...
    
    /**
     * Obtém uma seção completa dos dados
     * @param {string} secao - Nome da seção a obter
     * @returns {Object} - Dados da seção ou null se não existir
     */
    obterSecao: function(secao) {
        return this._dadosSimulador[secao] || null;
    },
    
    // Adicione os outros métodos aqui...
};