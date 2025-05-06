/**
 * Módulo simplificado que serve como adaptador para o CalculationModule
 * Mantém a API pública compatível com o resto da aplicação
 */
window.SimuladorModulo = (function() {
    return {
        /**
         * Realiza uma simulação completa delegando para o CalculationModule
         * @param {Object} dadosEntrada - Dados de entrada (opcional)
         * @returns {Object} - Resultados da simulação
         */
        simular: function(dadosEntrada) {
            console.log('Iniciando simulação via SimuladorModulo...');
            
            // Obter dados de entrada
            let dados = dadosEntrada || null;
            
            // Se não foram fornecidos dados de entrada, tentar obter do repositório
            if (!dados && typeof SimuladorRepository !== 'undefined') {
                // Usar o repositório central se disponível
                const dadosEmpresa = SimuladorRepository.obterSecao('empresa');
                const cicloFinanceiro = SimuladorRepository.obterSecao('cicloFinanceiro');
                const parametrosFiscais = SimuladorRepository.obterSecao('parametrosFiscais');
                const parametrosSimulacao = SimuladorRepository.obterSecao('parametrosSimulacao');
                const parametrosFinanceiros = SimuladorRepository.obterSecao('parametrosFinanceiros') || {};
                
                // Preparar dados para simulação
                dados = {
                    empresa: dadosEmpresa.nome,
                    setor: dadosEmpresa.setor,
                    regime: dadosEmpresa.regime,
                    faturamento: dadosEmpresa.faturamento,
                    margem: dadosEmpresa.margem,
                    pmr: cicloFinanceiro.pmr,
                    pmp: cicloFinanceiro.pmp,
                    pme: cicloFinanceiro.pme,
                    percVista: cicloFinanceiro.percVista,
                    percPrazo: cicloFinanceiro.percPrazo,
                    aliquota: parametrosFiscais.aliquota,
                    tipoOperacao: parametrosFiscais.tipoOperacao,
                    creditos: parametrosFiscais.creditos,
                    dataInicial: parametrosSimulacao.dataInicial,
                    dataFinal: parametrosSimulacao.dataFinal,
                    cenario: parametrosSimulacao.cenario,
                    taxaCrescimento: parametrosSimulacao.taxaCrescimento,
                    taxaCapitalGiro: parametrosFinanceiros.taxaCapitalGiro || 0.021
                };
            }
            
            // Se ainda não temos dados, não podemos continuar
            if (!dados) {
                throw new Error('Não foi possível obter dados para a simulação');
            }
            
            // Delegar a simulação para o CalculationModule
            let resultados = null;
            
            if (typeof CalculationModule !== 'undefined' && typeof CalculationModule.simular === 'function') {
                resultados = CalculationModule.simular(dados);
            } else {
                console.error('CalculationModule não disponível ou método simular não encontrado');
                throw new Error('Módulo de cálculo não disponível');
            }
            
            // Atualizar o repositório com os resultados se disponível
            if (typeof SimuladorRepository !== 'undefined') {
                SimuladorRepository.atualizarSecao('resultadosSimulacao', resultados);
                SimuladorRepository.atualizarCampo('interfaceState', 'simulacaoRealizada', true);
                SimuladorRepository.salvar();
            }
            
            console.log('Simulação concluída com sucesso no SimuladorModulo');
            return resultados;
        },
        
        /**
         * Simula o impacto das estratégias de mitigação
         * @param {Object} estrategias - Configuração das estratégias
         * @returns {Object} - Resultados da simulação de estratégias
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
            
            // Delegar cálculo para o CalculationModule
            return CalculationModule.calcularEfeitividadeMitigacao(
                dadosConsolidados, 
                estrategias, 
                anoInicial
            );
        },
        
        /**
         * Gera a memória de cálculo para um ano específico
         * @param {number} ano - Ano para geração da memória
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
})();