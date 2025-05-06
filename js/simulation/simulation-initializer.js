/**
 * Inicializador do Módulo de Simulação
 * Estabelece conexões entre os componentes do sistema de simulação e o repositório central
 */
const SimulationInitializer = {
    /**
     * Inicializa o módulo de simulação
     */
    inicializar: function() {
        console.log('Inicializando módulo de simulação...');
        
        // Verificar disponibilidade dos componentes
        if (typeof CalculationModule === 'undefined') {
            console.error('CalculationModule não está disponível. A simulação não funcionará corretamente.');
            return false;
        }
        
        if (typeof SimuladorRepository === 'undefined') {
            console.error('SimuladorRepository não está disponível. A conexão com o repositório central não será estabelecida.');
            return false;
        }
        
        // Criar objeto SimuladorModulo como interface pública para o sistema
        window.SimuladorModulo = {
            /**
             * Executa a simulação com base nos dados do repositório
             * @returns {Object} Resultados da simulação
             */
            simular: function() {
                console.log('Iniciando simulação através do módulo integrado...');
                
                // Verificar se as configurações necessárias estão presentes
                this._verificarPrecondições();
                
                // Executar a simulação via CalculationModule
                const resultados = CalculationModule.simular();
                
                console.log('Simulação concluída com sucesso');
                return resultados;
            },
            
            /**
             * Verifica se todas as pré-condições para simulação estão satisfeitas
             * @private
             */
            _verificarPrecondições: function() {
                const dadosEmpresa = SimuladorRepository.obterSecao('empresa');
                const parametrosFiscais = SimuladorRepository.obterSecao('parametrosFiscais');
                
                if (!dadosEmpresa.nome || !dadosEmpresa.setor) {
                    throw new Error('Configurações da empresa incompletas. Verifique nome e setor.');
                }
                
                if (isNaN(dadosEmpresa.faturamento) || dadosEmpresa.faturamento <= 0) {
                    throw new Error('Faturamento inválido. Deve ser um valor numérico positivo.');
                }
                
                if (isNaN(parametrosFiscais.aliquota) || parametrosFiscais.aliquota <= 0) {
                    throw new Error('Alíquota inválida. Deve ser um valor numérico positivo.');
                }
            },
            
            /**
             * Executa a simulação de estratégias de mitigação
             * @param {Object} estrategias - Configuração das estratégias
             * @returns {Object} Resultados da simulação de estratégias
             */
            simularEstrategias: function(estrategias) {
                console.log('Iniciando simulação de estratégias...');
                
                // Verificar se há uma simulação base realizada
                const interfaceState = SimuladorRepository.obterSecao('interfaceState');
                if (!interfaceState.simulacaoRealizada) {
                    throw new Error('É necessário realizar uma simulação principal antes de simular estratégias.');
                }
                
                // Obter dados consolidados
                const dados = {
                    empresa: SimuladorRepository.obterSecao('empresa'),
                    cicloFinanceiro: SimuladorRepository.obterSecao('cicloFinanceiro'),
                    parametrosFiscais: SimuladorRepository.obterSecao('parametrosFiscais'),
                    parametrosSimulacao: SimuladorRepository.obterSecao('parametrosSimulacao')
                };
                
                // Preparar dados para simulação de estratégias
                const dadosConsolidados = {
                    faturamento: dados.empresa.faturamento,
                    margem: dados.empresa.margem,
                    setor: dados.empresa.setor,
                    pmr: dados.cicloFinanceiro.pmr,
                    pmp: dados.cicloFinanceiro.pmp,
                    pme: dados.cicloFinanceiro.pme,
                    percVista: dados.cicloFinanceiro.percVista,
                    percPrazo: dados.cicloFinanceiro.percPrazo,
                    aliquota: dados.parametrosFiscais.aliquota,
                    creditos: dados.parametrosFiscais.creditos,
                    tipoOperacao: dados.parametrosFiscais.tipoOperacao
                };
                
                // Obter o ano inicial
                const anoInicial = parseInt(dados.parametrosSimulacao.dataInicial.split('-')[0]) || 2026;
                
                // Executar simulação de estratégias
                const resultados = CalculationModule.calcularEfeitividadeMitigacao(
                    dadosConsolidados, 
                    estrategias, 
                    anoInicial
                );
                
                console.log('Simulação de estratégias concluída com sucesso');
                return resultados;
            },
            
            /**
             * Gera a memória de cálculo para um ano específico
             * @param {number} ano - Ano para geração da memória de cálculo
             * @returns {string} - Texto da memória de cálculo
             */
            gerarMemoriaCalculo: function(ano) {
                // Obter dados do repositório
                const resultadosSimulacao = SimuladorRepository.obterSecao('resultadosSimulacao');
                
                if (!resultadosSimulacao || !resultadosSimulacao.memoriaCalculo) {
                    throw new Error('Nenhuma simulação realizada. Não há memória de cálculo disponível.');
                }
                
                // Verificar se há memória para o ano solicitado
                if (!resultadosSimulacao.memoriaCalculo[ano]) {
                    throw new Error(`Não há memória de cálculo disponível para o ano ${ano}.`);
                }
                
                return resultadosSimulacao.memoriaCalculo[ano];
            }
        };
        
        console.log('Módulo de simulação inicializado com sucesso');
        return true;
    }
};

// Adicionar inicialização automática
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar após o carregamento do repositório
    if (typeof SimuladorRepository !== 'undefined' && SimuladorRepository.carregar) {
        SimuladorRepository.observar('*', function() {
            // Inicializar após o primeiro carregamento
            SimulationInitializer.inicializar();
        });
    } else {
        console.warn('SimuladorRepository não disponível. Inicialização postergada.');
        
        // Tentar inicializar em 1 segundo, caso o repositório seja carregado após este script
        setTimeout(function() {
            if (typeof SimuladorRepository !== 'undefined') {
                SimulationInitializer.inicializar();
            } else {
                console.error('SimuladorRepository não disponível após espera. Inicialização falhou.');
            }
        }, 1000);
    }
});
