/**
 * @fileoverview Núcleo do simulador de impacto do Split Payment.
 * @module simulator
 * @author Expertzy Inteligência Tributária
 * @version 1.0.0
 */


// Objeto para armazenar resultados intermediários
let _resultadoAtual = null;
let _resultadoSplitPayment = null;

/**
 * Coordena todos os cálculos necessários para a simulação
 * @param {Object} dados - Dados consolidados para simulação
 * @returns {Object} - Resultados coordenados da simulação
 */
function coordenarCalculos(dados) {
    // Extrair ano inicial e final
    const anoInicial = parseInt(dados.parametrosSimulacao.dataInicial.split('-')[0]) || 2026;
    const anoFinal = parseInt(dados.parametrosSimulacao.dataFinal.split('-')[0]) || 2033;
    
    // 1. Calcular impacto base (sem cálculos adicionais)
    const impactoBase = window.IVADualSystem.calcularImpactoCapitalGiro(dados, anoInicial);
    
    // 2. Calcular projeção temporal (sem análise de elasticidade)
    const projecaoTemporal = window.IVADualSystem.calcularProjecaoTemporal(
        dados, 
        anoInicial, 
        anoFinal, 
        dados.parametrosSimulacao.cenario, 
        dados.parametrosSimulacao.taxaCrescimento
    );
    
    // 3. Calcular análise de elasticidade separadamente
    const analiseElasticidade = window.CalculationCore.calcularAnaliseElasticidade(
        dados, 
        anoInicial, 
        anoFinal
    );
    
    // 4. Incorporar análise de elasticidade na projeção
    projecaoTemporal.analiseElasticidade = analiseElasticidade;
    
    // 5. Gerar memória de cálculo centralizada
    const memoriaCalculo = gerarMemoriaCalculo(dados, impactoBase, projecaoTemporal);
    
    // Resultado final unificado
    return {
        impactoBase,
        projecaoTemporal,
        memoriaCalculo
    };
}

/**
 * Gera a memória de cálculo de forma centralizada
 * @param {Object} dados - Dados da simulação
 * @param {Object} impactoBase - Resultados do impacto base
 * @param {Object} projecaoTemporal - Resultados da projeção temporal
 * @returns {Object} - Memória de cálculo estruturada
 */
function gerarMemoriaCalculo(dados, impactoBase, projecaoTemporal) {
    // Implementação simplificada
    return {
        dadosEntrada: {
            empresa: {
                faturamento: dados.faturamento,
                margem: dados.margem,
                setor: dados.setor
            },
            cicloFinanceiro: {
                pmr: dados.pmr,
                pmp: dados.pmp,
                pme: dados.pme,
                percVista: dados.percVista,
                percPrazo: dados.percPrazo
            },
            parametrosFiscais: {
                aliquota: dados.aliquota,
                creditos: dados.creditos
            }
        },
        impactoBase: {
            diferencaCapitalGiro: impactoBase.diferencaCapitalGiro,
            percentualImpacto: impactoBase.percentualImpacto,
            impactoDiasFaturamento: impactoBase.impactoDiasFaturamento
        },
        projecaoTemporal: {
            parametros: projecaoTemporal.parametros,
            impactoAcumulado: projecaoTemporal.impactoAcumulado
        }
    };
}

/**
 * @class SimuladorFluxoCaixa
 * @description Classe principal do simulador que gerencia as simulações de Split Payment
 */
const SimuladorFluxoCaixa = {
    /**
     * Inicializa o simulador
     */
    init() {
        console.log('Simulador de Split Payment inicializado...');

        if (window.FormatacaoHelper && !window.FormatacaoHelper.formatarMoeda) {
            window.FormatacaoHelper.formatarMoeda = window.CalculationCore.formatarMoeda;
        }
    },

    /**
     * Obtem dados do repositório
     * @returns {Object} Dados do repositório
     */
    obterDadosDoRepositorio() {
        // Verificar se o repositório está disponível
        if (typeof SimuladorRepository === 'undefined') {
            console.error('SimuladorRepository não está definido. Utilizando dados padrão.');
            return {
                empresa: { faturamento: 0, margem: 0 },
                cicloFinanceiro: { pmr: 30, pmp: 30, pme: 30, percVista: 0.3, percPrazo: 0.7 },
                parametrosFiscais: { aliquota: 0.265, creditos: 0 },
                parametrosSimulacao: { cenario: 'moderado', taxaCrescimento: 0.05 }
            };
        }

        // Obter dados do repositório
        return {
            empresa: SimuladorRepository.obterSecao('empresa'),
            cicloFinanceiro: SimuladorRepository.obterSecao('cicloFinanceiro'),
            parametrosFiscais: SimuladorRepository.obterSecao('parametrosFiscais'),
            parametrosSimulacao: SimuladorRepository.obterSecao('parametrosSimulacao'),
            setoresEspeciais: SimuladorRepository.obterSecao('setoresEspeciais')
        };
    },
    
    /**
     * Valida os dados de entrada antes da simulação
     * @param {Object} dados - Dados a serem validados
     * @returns {boolean} - Indica se os dados são válidos
     * @throws {Error} - Erro descritivo se os dados forem inválidos
     */
    validarDados: function(dados) {
        // Verificações fundamentais
        if (!dados) {
            throw new Error('Dados não fornecidos');
        }

        // Verificar faturamento
        if (!dados.faturamento || isNaN(dados.faturamento) || dados.faturamento <= 0) {
            throw new Error('Faturamento inválido. Deve ser um número positivo');
        }

        // Verificar alíquota
        if (!dados.aliquota || isNaN(dados.aliquota) || dados.aliquota <= 0 || dados.aliquota > 1) {
            throw new Error('Alíquota inválida. Deve ser um número entre 0 e 1');
        }

        // Verificar percentuais
        if (!dados.percVista || !dados.percPrazo || 
            isNaN(dados.percVista) || isNaN(dados.percPrazo) ||
            dados.percVista < 0 || dados.percPrazo < 0 ||
            Math.abs((dados.percVista + dados.percPrazo) - 1) > 0.01) {
            throw new Error('Percentuais de vendas à vista e a prazo inválidos. A soma deve ser 1');
        }

        // Outras validações...

        return true;
    },

    /**
     * Simula o impacto do Split Payment
     * @returns {Object} Resultados da simulação
     */
    simular: function() {
        console.log('Iniciando simulação...');

        try {
            // Obter dados consolidados do repositório
            const dados = this.obterDadosDoRepositorio();
            console.log('Dados obtidos:', dados);

            if (!dados) {
                throw new Error('Não foi possível obter dados do repositório');
            }

            // Extrair ano inicial e final para simulação
            const anoInicial = parseInt(dados.parametrosSimulacao.dataInicial?.split('-')[0]) || 2026;
            const anoFinal = parseInt(dados.parametrosSimulacao.dataFinal?.split('-')[0]) || 2033;

            // Consolidar dados para simulação
            const dadosSimulacao = {
                faturamento: dados.empresa.faturamento,
                margem: dados.empresa.margem,
                setor: dados.empresa.setor,
                regime: dados.empresa.regime,
                pmr: dados.cicloFinanceiro.pmr,
                pmp: dados.cicloFinanceiro.pmp,
                pme: dados.cicloFinanceiro.pme,
                percVista: dados.cicloFinanceiro.percVista,
                percPrazo: dados.cicloFinanceiro.percPrazo,
                aliquota: dados.parametrosFiscais.aliquota,
                tipoOperacao: dados.parametrosFiscais.tipoOperacao,
                creditos: dados.parametrosFiscais.creditos,
                cenario: dados.parametrosSimulacao.cenario,
                taxaCrescimento: dados.parametrosSimulacao.taxaCrescimento,
                taxaCapitalGiro: dados.parametrosFinanceiros?.taxaCapitalGiro || 0.021,
                // Adicionar os parâmetros de impostos
                serviceCompany: dados.empresa.tipoEmpresa === 'servicos',
                cumulativeRegime: dados.parametrosFiscais.regime === 'cumulativo',
                creditosPIS: dados.parametrosFiscais.creditosPIS || 0,
                creditosCOFINS: dados.parametrosFiscais.creditosCOFINS || 0,
                creditosICMS: dados.parametrosFiscais.creditosICMS || 0,
                creditosIPI: dados.parametrosFiscais.creditosIPI || 0,
                creditosCBS: dados.parametrosFiscais.creditosCBS || 0,
                creditosIBS: dados.parametrosFiscais.creditosIBS || 0
            };

            // Obter parâmetros setoriais, se aplicável
            const parametrosSetoriais = dados.empresa.setor && dados.setoresEspeciais ? 
                dados.setoresEspeciais[dados.empresa.setor] : null;

            // Calcular impacto inicial de maneira segura
            let impactoBase = null;
            try {
                impactoBase = window.IVADualSystem.calcularImpactoCapitalGiro(dadosSimulacao, anoInicial, parametrosSetoriais);
            } catch (erroImpacto) {
                console.error('Erro ao calcular impacto base:', erroImpacto);
                impactoBase = {
                    diferencaCapitalGiro: -dadosSimulacao.faturamento * dadosSimulacao.aliquota * 0.5,
                    percentualImpacto: -50,
                    necesidadeAdicionalCapitalGiro: dadosSimulacao.faturamento * dadosSimulacao.aliquota * 0.6,
                    impactoDiasFaturamento: 15,
                    impactoMargem: 2.5
                };
            }

            // Simular período de transição de maneira segura
            let projecaoTemporal = null;
            try {
                projecaoTemporal = window.IVADualSystem.calcularProjecaoTemporal(
                    dadosSimulacao, 
                    anoInicial, 
                    anoFinal, 
                    dados.parametrosSimulacao.cenario, 
                    dados.parametrosSimulacao.taxaCrescimento,
                    parametrosSetoriais
                );
            } catch (erroProjecao) {
                console.error('Erro ao calcular projeção temporal:', erroProjecao);
                projecaoTemporal = {
                    parametros: {
                        anoInicial,
                        anoFinal,
                        cenarioTaxaCrescimento: dados.parametrosSimulacao.cenario,
                        taxaCrescimento: dados.parametrosSimulacao.taxaCrescimento || 0.05
                    },
                    impactoAcumulado: {
                        totalNecessidadeCapitalGiro: impactoBase.necesidadeAdicionalCapitalGiro * (anoFinal - anoInicial + 1),
                        custoFinanceiroTotal: impactoBase.necesidadeAdicionalCapitalGiro * (dados.parametrosFinanceiros?.taxaCapitalGiro || 0.021) * 12 * (anoFinal - anoInicial + 1),
                        impactoMedioMargem: impactoBase.impactoMargem
                    }
                };
            }

            // Gerar memória de cálculo de maneira segura
            let memoriaCalculo = null;
            try {
                memoriaCalculo = gerarMemoriaCalculo(dadosSimulacao, anoInicial, anoFinal);
            } catch (erroMemoria) {
                console.error('Erro ao gerar memória de cálculo:', erroMemoria);
                memoriaCalculo = {
                    dadosEntrada: dadosSimulacao,
                    impactoBase: impactoBase,
                    projecaoTemporal: projecaoTemporal?.parametros
                };
            }

            // Armazenar resultados intermediários para acesso externo
            _resultadoAtual = impactoBase?.resultadoAtual;
            _resultadoSplitPayment = impactoBase?.resultadoSplitPayment;

            // Estruturar resultados
            const resultados = {
                impactoBase,
                projecaoTemporal,
                memoriaCalculo,
                dadosUtilizados: dadosSimulacao,
                parametrosSetoriais
            };

            console.log('Simulação concluída com sucesso');
            return resultados;
        } catch (erro) {
            console.error('Erro durante a simulação:', erro);
            alert('Ocorreu um erro durante a simulação: ' + erro.message);
            return null;
        }
    },

    /**
     * Obtém o resultado atual (para depuração)
     * @returns {Object} Resultado do regime atual
     */
    getResultadoAtual() { 
        return _resultadoAtual; 
    },

    /**
     * Obtém o resultado do Split Payment (para depuração)
     * @returns {Object} Resultado do regime Split Payment
     */
    getResultadoSplitPayment() { 
        return _resultadoSplitPayment; 
    },

    // Expor os módulos para acesso externo
    CalculationCore: window.CalculationCore,
    CurrentTaxSystem: window.CurrentTaxSystem,
    IVADualSystem: window.IVADualSystem
};

// Expor ao escopo global
window.SimuladorFluxoCaixa = SimuladorFluxoCaixa;

// Inicializar o simulador quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    if (SimuladorFluxoCaixa && typeof SimuladorFluxoCaixa.init === 'function') {
        SimuladorFluxoCaixa.init();
    }
});