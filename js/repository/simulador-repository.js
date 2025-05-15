// js/repository/simulador-repository.js
window.SimuladorRepository = {
    // Chave utilizada para armazenamento no localStorage
    STORAGE_KEY: 'split-payment-simulator-data',
    
    // Estrutura de dados principal
    _dadosSimulador: {
        empresa: {
            nome: '',
            cnpj: '',
            setor: '',
            regime: '',
            tipoEmpresa: '',
            faturamento: 0,
            margem: 0.15
        },
        cicloFinanceiro: {
            pmr: 30,
            pmp: 30,
            pme: 30,
            percVista: 0.3,
            percPrazo: 0.7
        },
        parametrosFiscais: {
            aliquota: 0.265,
            creditos: 0,
            regime: 'lucro_real',
            tipoOperacao: 'comercial',
            cumulativeRegime: false,
            serviceCompany: false,
            possuiIncentivoICMS: false,
            percentualIncentivoICMS: 0
        },
        parametrosSimulacao: {
            dataInicial: '2026-01-01',
            dataFinal: '2033-12-31',
            cenario: 'moderado',
            taxaCrescimento: 0.05
        },
        interfaceState: {
            simulacaoRealizada: false
        }
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
    
    /**
     * Obtém uma seção completa dos dados
     * @param {string} secao - Nome da seção a obter
     * @returns {Object} - Dados da seção ou null se não existir
     */
    obterSecao: function(secao) {
        return this._dadosSimulador[secao] || null;
    },
    
    /**
     * Atualiza uma seção completa dos dados
     * @param {string} secao - Nome da seção a ser atualizada
     * @param {Object} dados - Novos dados para a seção
     */
    atualizarSecao: function(secao, dados) {
        // Verificar se a seção existe, caso contrário, criá-la
        if (!this._dadosSimulador[secao]) {
            this._dadosSimulador[secao] = {};
        }
        
        // Mesclar os dados preservando a estrutura
        this._dadosSimulador[secao] = {
            ...this._dadosSimulador[secao],
            ...dados
        };
        
        // Salvar automaticamente depois de cada atualização
        this.salvar();
    },
    
    /**
     * Atualiza um campo específico em uma seção
     * @param {string} secao - Nome da seção
     * @param {string} campo - Nome do campo 
     * @param {*} valor - Valor a ser armazenado
     */
    atualizarCampo: function(secao, campo, valor) {
        // Verificar se a seção existe, caso contrário, criá-la
        if (!this._dadosSimulador[secao]) {
            this._dadosSimulador[secao] = {};
        }
        
        // Atualizar o campo específico
        this._dadosSimulador[secao][campo] = valor;
        
        // Salvar automaticamente depois de cada atualização
        this.salvar();
    },
    
    /**
     * Salva os dados no localStorage
     * @returns {boolean} - Sucesso da operação
     */
    salvar: function() {
        try {
            const dadosJSON = JSON.stringify(this._dadosSimulador);
            localStorage.setItem(this.STORAGE_KEY, dadosJSON);
            console.log('Dados salvos com sucesso no localStorage');
            return true;
        } catch (error) {
            console.error('Erro ao salvar dados no localStorage:', error);
            return false;
        }
    }
};

// Inicializar o repositório quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    SimuladorRepository.inicializar();
});