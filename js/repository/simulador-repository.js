// js/repository/simulador-repository.js
window.SimuladorRepository = {
    // Chave utilizada para armazenamento no localStorage
    STORAGE_KEY: 'split-payment-simulator-data',

    // Estrutura esperada para um CalculationRecord:
    // {
    //   timestamp: new Date().toISOString(),
    //   year: String, // Ano ou intervalo de anos relevante, ex: "2026" ou "2026-2033"
    //   taxationSystem: String, // Ex: "Lucro Real", "Simples Nacional", "IVA Dual"
    //   calculationSource: String, // Ex: "Simulação Principal", "Estratégias de Mitigação"
    //   inputs: {
    //     // Chaves e valores relevantes dos dados de entrada
    //     // Ex: faturamento: 100000, aliquota: 0.10, ...
    //   },
    //   outputs: {
    //     // Chaves e valores relevantes dos resultados
    //     // Ex: impactoCapitalGiro: -5000, impostoDevido: 1000, ...
    //   }
    // }

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
        },
        historicoCalculos: [] // Novo campo para o histórico de cálculos
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
            let dadosCarregados = dadosSalvos ? JSON.parse(dadosSalvos) : {};

            // Forçar reset do faturamento independentemente da origem dos dados
            if (dadosCarregados.empresa) {
                dadosCarregados.empresa.faturamento = 0;
            }

            // Mesclar dados preservando a estrutura padrão e garantindo que historicoCalculos seja um array
            const defaultStructure = JSON.parse(JSON.stringify(this._dadosSimulador)); // Deep copy
            this._dadosSimulador = {
                ...defaultStructure, // Começa com a estrutura padrão (incluindo historicoCalculos: [])
                ...dadosCarregados,  // Sobrescreve com dados salvos
            };
            
            // Garantir que historicoCalculos seja sempre um array, mesmo que dadosCarregados não o tenha ou tenha algo inválido
            if (!Array.isArray(this._dadosSimulador.historicoCalculos)) {
                this._dadosSimulador.historicoCalculos = [];
            }


            console.log('Dados carregados do localStorage. Histórico de cálculos possui ' + (this._dadosSimulador.historicoCalculos ? this._dadosSimulador.historicoCalculos.length : 0) + ' itens.');
            return true;
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            // Em caso de erro, redefinir para o padrão para evitar estado inconsistente
            this._dadosSimulador = JSON.parse(JSON.stringify(window.SimuladorRepository._dadosSimulador)); // Reset to initial default
            if (!Array.isArray(this._dadosSimulador.historicoCalculos)) { // Ensure historicoCalculos is an array after reset
                 this._dadosSimulador.historicoCalculos = [];
            }
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
        if (!this._dadosSimulador[secao]) {
            this._dadosSimulador[secao] = {};
        }
        this._dadosSimulador[secao] = {
            ...this._dadosSimulador[secao],
            ...dados
        };
        this.salvar();
    },

    /**
     * Atualiza um campo específico em uma seção
     * @param {string} secao - Nome da seção
     * @param {string} campo - Nome do campo
     * @param {*} valor - Valor a ser armazenado
     */
    atualizarCampo: function(secao, campo, valor) {
        if (!this._dadosSimulador[secao]) {
            this._dadosSimulador[secao] = {};
        }
        this._dadosSimulador[secao][campo] = valor;
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
    },

    /**
     * Adiciona um registro de cálculo ao histórico
     * @param {Object} registro - O registro de cálculo a ser adicionado
     */
    adicionarRegistroCalculo: function(registro) {
        if (!this._dadosSimulador.historicoCalculos || !Array.isArray(this._dadosSimulador.historicoCalculos)) {
            this._dadosSimulador.historicoCalculos = []; // Garante que é um array
        }
        this._dadosSimulador.historicoCalculos.push(registro);
        this.salvar();
        console.log('Novo registro de cálculo adicionado ao histórico.');
    },

    /**
     * Obtém todo o histórico de cálculos
     * @returns {Array} - Array contendo todos os registros de cálculo
     */
    obterHistoricoCalculos: function() {
        return this._dadosSimulador.historicoCalculos || [];
    },

    /**
     * Limpa todo o histórico de cálculos
     */
    limparHistoricoCalculos: function() {
        this._dadosSimulador.historicoCalculos = [];
        this.salvar();
        console.log('Histórico de cálculos limpo.');
    }
};

// Inicializar o repositório quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    SimuladorRepository.inicializar();
});