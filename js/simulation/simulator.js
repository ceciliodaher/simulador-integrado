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
    
    // Adicionar função auxiliar simplificada para extração de valores
    // No arquivo simulator.js, substituir a função extrairValorNumericoDeElemento por:
    extrairValorNumericoDeElemento: function(id) {
        const elemento = document.getElementById(id);
        if (!elemento) {
            console.warn(`Elemento com id ${id} não encontrado`);
            return 0;
        }

        console.log(`Extraindo valor do campo ${id}`);

        // 1. Verificar dataset.rawValue (adicionado pelo CurrencyFormatter)
        if (elemento.dataset.rawValue !== undefined) {
            const valor = parseFloat(elemento.dataset.rawValue);
            if (!isNaN(valor)) {
                console.log(`Valor obtido do data-raw-value: ${valor}`);
                return valor;
            }
        }

        // 2. Se o campo foi inicializado pelo CurrencyFormatter mas não tem dataset.rawValue
        if (elemento.dataset.currencyInitialized === 'true') {
            // Extrair apenas os dígitos e a vírgula decimal
            let valorTexto = elemento.value.replace(/[^\d,]/g, '').replace(',', '.');
            let valorNumerico = parseFloat(valorTexto);

            if (!isNaN(valorNumerico)) {
                console.log(`Valor extraído diretamente do campo formatado: ${valorNumerico}`);
                return valorNumerico;
            }
        }

        // 3. Tentativa final com qualquer valor
        const valorDireto = parseFloat(elemento.value.replace(/[^\d,.-]/g, '').replace(',', '.'));
        console.log(`Valor obtido por extração direta: ${valorDireto}`);
        return isNaN(valorDireto) ? 0 : valorDireto;
    },
    
    criarEstruturaPlana: function(dados) {
        // Esta função converte a estrutura aninhada em uma estrutura plana para compatibilidade
        if (!dados) return null;

        return {
            faturamento: dados.empresa?.faturamento || 0,
            margem: dados.empresa?.margem || 0,
            setor: dados.empresa?.setor || '',
            regime: dados.empresa?.regime || '',
            tipoEmpresa: dados.empresa?.tipoEmpresa || '',
            pmr: dados.cicloFinanceiro?.pmr || 0,
            pmp: dados.cicloFinanceiro?.pmp || 0,
            pme: dados.cicloFinanceiro?.pme || 0,
            percVista: dados.cicloFinanceiro?.percVista || 0,
            percPrazo: dados.cicloFinanceiro?.percPrazo || 0,
            aliquota: dados.parametrosFiscais?.aliquota || 0,
            creditos: dados.parametrosFiscais?.creditos || 0,
            tipoOperacao: dados.parametrosFiscais?.tipoOperacao || '',
            cenario: dados.parametrosSimulacao?.cenario || 'moderado',
            taxaCrescimento: dados.parametrosSimulacao?.taxaCrescimento || 0.05,
            dataInicial: dados.parametrosSimulacao?.dataInicial || '2026-01-01',
            dataFinal: dados.parametrosSimulacao?.dataFinal || '2033-12-31',
            taxaCapitalGiro: dados.parametrosFinanceiros?.taxaCapitalGiro || 0.021,
            taxaAntecipacao: dados.parametrosFinanceiros?.taxaAntecipacao || 0.018,
            // Outros campos necessários
            serviceCompany: dados.empresa.tipoEmpresa === 'servicos',
            cumulativeRegime: dados.parametrosFiscais.regime === 'cumulativo',
            creditosPIS: dados.parametrosFiscais.creditosPIS || 0,
            creditosCOFINS: dados.parametrosFiscais.creditosCOFINS || 0,
            creditosICMS: dados.parametrosFiscais.creditosICMS || 0,
            creditosIPI: dados.parametrosFiscais.creditosIPI || 0,
            creditosCBS: dados.parametrosFiscais.creditosCBS || 0,
            creditosIBS: dados.parametrosFiscais.creditosIBS || 0
        };
    },
    
    // Adicionar logo após a função extrairValorNumericoDeElemento
    garantirValorValido: function(valor, valorMinimo = 0.01) {
        // Garante que o valor seja um número válido, positivo e pelo menos igual ao mínimo
        if (typeof valor !== 'number' || isNaN(valor)) {
            return valorMinimo;
        }
        return Math.max(valor, valorMinimo);
    },
    
     // Adicionar esta nova função para obter dados diretamente do formulário
    obterDadosConsolidados: function() {
        // Extrair faturamento primeiro para identificar problemas rapidamente
        const faturamentoValor = this.extrairValorNumericoDeElemento('faturamento');
        console.log("Faturamento extraído para empresa:", faturamentoValor);

        // Obter valores do formulário
        const empresa = {
            faturamento: faturamentoValor,
            margem: parseFloat(document.getElementById('margem').value) / 100 || 0,
            setor: document.getElementById('setor').value,
            tipoEmpresa: document.getElementById('tipo-empresa').value,
            regime: document.getElementById('regime').value
        };

        // Verificação de segurança
        console.log("Empresa.faturamento após atribuição:", empresa.faturamento);

        // Resto do código permanece igual
        const cicloFinanceiro = {
            pmr: parseInt(document.getElementById('pmr').value) || 0,
            pmp: parseInt(document.getElementById('pmp').value) || 0,
            pme: parseInt(document.getElementById('pme').value) || 0,
            percVista: parseFloat(document.getElementById('perc-vista').value) / 100 || 0,
            percPrazo: (100 - (parseFloat(document.getElementById('perc-vista').value) || 0)) / 100
        };

        const parametrosFiscais = this.obterParametrosFiscais();
        const parametrosSimulacao = {
            cenario: document.getElementById('cenario').value || 'moderado',
            taxaCrescimento: this.obterTaxaCrescimento() / 100,
            dataInicial: document.getElementById('data-inicial').value || '2026-01-01',
            dataFinal: document.getElementById('data-final').value || '2033-12-31'
        };

        const parametrosFinanceiros = {
            taxaCapitalGiro: 0.021, // 2.1% a.m.
            taxaAntecipacao: 0.018  // 1.8% a.m.
        };

        const resultado = {
            empresa,
            cicloFinanceiro,
            parametrosFiscais,
            parametrosSimulacao,
            parametrosFinanceiros
        };

        // Verificação final
        console.log("Objeto final - empresa.faturamento:", resultado.empresa.faturamento);

        return resultado;
    },

    // Função para obter taxa de crescimento com base no cenário
    obterTaxaCrescimento: function() {
        const cenario = document.getElementById('cenario').value;

        if (cenario === 'conservador') {
            return 2.0;
        } else if (cenario === 'moderado') {
            return 5.0;
        } else if (cenario === 'otimista') {
            return 8.0;
        } else if (cenario === 'personalizado') {
            return parseFloat(document.getElementById('taxa-crescimento').value) || 5.0;
        }

        return 5.0; // Valor padrão (moderado)
    },

    // Função para obter parâmetros fiscais com base no regime
    obterParametrosFiscais: function() {
        const regime = document.getElementById('regime').value;
        const tipoEmpresa = document.getElementById('tipo-empresa').value;

        let parametros = {
            aliquota: 0,
            creditos: 0,
            tipoOperacao: document.getElementById('tipo-operacao').value,
            regime: ''
        };
        
        // antes do if (tipoEmpresa === ...)
        let aliquotaICMS = 0;
        let incentivoICMS = 0;

        if (regime === 'simples') {
            const aliqSimples = parseFloat(document.getElementById('aliquota-simples').value) || 0;
            parametros.aliquota = aliqSimples / 100;   // converte de % para fração
            parametros.regime = 'cumulativo';
          } else {
            // Lucro Presumido ou Real
            parametros.regime = document.getElementById('pis-cofins-regime').value;

            // Calcular alíquota total
            let aliquotaTotal = 0;

            // PIS/COFINS
            if (parametros.regime === 'cumulativo') {
                aliquotaTotal += 3.65; // 0.65% (PIS) + 3% (COFINS)
            } else {
                aliquotaTotal += 9.25; // 1.65% (PIS) + 7.6% (COFINS)
            }

            // ICMS (para empresas comerciais/industriais)
            if (tipoEmpresa === 'comercio' || tipoEmpresa === 'industria') {
                aliquotaICMS = parseFloat(document.getElementById('aliquota-icms').value) || 0;               

                // Aplicar incentivo fiscal se existir
                if (document.getElementById('possui-incentivo-icms').checked) {
                  incentivoICMS = parseFloat(document.getElementById('incentivo-icms').value) || 0;
                  aliquotaICMS *= (1 - incentivoICMS / 100);
                }

                aliquotaTotal += aliquotaICMS;

                // IPI (apenas para indústria)
                if (tipoEmpresa === 'industria') {
                    aliquotaTotal += parseFloat(document.getElementById('aliquota-ipi').value) || 0;
                }
            }

            // ISS (para empresas de serviços)
            if (tipoEmpresa === 'servicos') {
                aliquotaTotal += parseFloat(document.getElementById('aliquota-iss').value) || 0;
            }

           // atribui como fração
            parametros.aliquota = (aliquotaTotal || aliquotaSimples) / 100;

            // Adicionar créditos
            parametros.creditosPIS = this.calcularCreditoPIS();
            parametros.creditosCOFINS = this.calcularCreditoCOFINS();
            parametros.creditosICMS = this.calcularCreditoICMS();
            parametros.creditosIPI = this.calcularCreditoIPI();
        }

        return parametros;
    },

    // Funções auxiliares para cálculo de créditos
    calcularCreditoPIS: function() {
        if (document.getElementById('pis-cofins-regime').value === 'cumulativo') {
            return 0;
        }

        const faturamento = this.extrairValorNumericoDeElemento('faturamento');
        const baseCalc = parseFloat(document.getElementById('pis-cofins-base-calc').value) / 100 || 0;
        const percCredito = parseFloat(document.getElementById('pis-cofins-perc-credito').value) / 100 || 0;
        const aliquotaPIS = parseFloat(document.getElementById('pis-aliquota').value) / 100 || 0;

        return faturamento * baseCalc * aliquotaPIS * percCredito;
    },

    calcularCreditoCOFINS: function() {
        if (document.getElementById('pis-cofins-regime').value === 'cumulativo') {
            return 0;
        }

        const faturamento = this.extrairValorNumericoDeElemento('faturamento');
        const baseCalc = parseFloat(document.getElementById('pis-cofins-base-calc').value) / 100 || 0;
        const percCredito = parseFloat(document.getElementById('pis-cofins-perc-credito').value) / 100 || 0;
        const aliquotaCOFINS = parseFloat(document.getElementById('cofins-aliquota').value) / 100 || 0;

        return faturamento * baseCalc * aliquotaCOFINS * percCredito;
    },

    calcularCreditoICMS: function() {
        const faturamento = this.extrairValorNumericoDeElemento('faturamento');
        const baseCalc = parseFloat(document.getElementById('icms-base-calc').value) / 100 || 0;
        const percCredito = parseFloat(document.getElementById('icms-perc-credito').value) / 100 || 0;
        const aliquotaICMS = parseFloat(document.getElementById('aliquota-icms').value) / 100 || 0;

        return faturamento * baseCalc * aliquotaICMS * percCredito;
    },

    calcularCreditoIPI: function() {
        const faturamento = this.extrairValorNumericoDeElemento('faturamento');
        const baseCalc = parseFloat(document.getElementById('ipi-base-calc').value) / 100 || 0;
        const percCredito = parseFloat(document.getElementById('ipi-perc-credito').value) / 100 || 0;
        const aliquotaIPI = parseFloat(document.getElementById('aliquota-ipi').value) / 100 || 0;

        return faturamento * baseCalc * aliquotaIPI * percCredito;
    },

    // Função para gerar um impacto base de fallback quando ocorrem erros
    gerarImpactoBaseFallback: function(dados) {
        const faturamento = parseFloat(dados.faturamento) || 0;
        const aliquota = parseFloat(dados.aliquota) || 0.265;

        return {
            diferencaCapitalGiro: -faturamento * aliquota * 0.5,
            percentualImpacto: -50,
            necesidadeAdicionalCapitalGiro: faturamento * aliquota * 0.6,
            impactoDiasFaturamento: 15,
            impactoMargem: 2.5,
            resultadoAtual: {
                capitalGiroDisponivel: faturamento * aliquota
            },
            resultadoSplitPayment: {
                capitalGiroDisponivel: faturamento * aliquota * 0.5
            }
        };
    },
    
    /**
     * Valida os dados de entrada antes da simulação
     * @param {Object} dados - Dados a serem validados
     * @returns {boolean} - Indica se os dados são válidos
     * @throws {Error} - Erro descritivo se os dados forem inválidos
     */
    validarDados: function(dados) {
        if (!dados) {
            throw new Error('Dados não fornecidos');
        }

        console.log("Validando faturamento:", dados.faturamento, typeof dados.faturamento);

        // Garantir que o faturamento seja um número válido
        if (typeof dados.faturamento !== 'number') {
            dados.faturamento = parseFloat(dados.faturamento) || 0;
        }

        // Verificar faturamento com tolerância para valores muito pequenos
        if (isNaN(dados.faturamento) || dados.faturamento <= 0) {
            throw new Error('Faturamento inválido. Deve ser um número positivo');
        }
        
        // converte "26.5%" ou "26.5" em 0.265
        if (typeof dados.aliquota === 'string') {
          dados.aliquota = parseFloat(dados.aliquota.replace('%', '')) / 100;
        }

        // Verificar alíquota
        if (typeof dados.aliquota === 'number' && dados.aliquota > 1 && dados.aliquota <= 100) {
            console.warn('Aliquota em formato percentagem detectada, convertendo para fração');
            dados.aliquota = dados.aliquota / 100;
          }
          // verificação padrão
          if (!dados.aliquota || isNaN(dados.aliquota) || dados.aliquota <= 0 || dados.aliquota > 1) {
            throw new Error('Alíquota inválida. Deve ser um número entre 0 e 1');
          }

        // Verificar percentuais
        // antes de validar soma igual a 1
        if (isNaN(dados.percVista) ||
            isNaN(dados.percPrazo) ||
            dados.percVista < 0 ||
            dados.percPrazo < 0 ||
            Math.abs(dados.percVista + dados.percPrazo - 1) > 0.01
        ) {
          throw new Error('Percentuais de vendas inválidos. A soma deve ser 1');
        }

        // Outras validações...

        return true;
    },

    /**
     * Simula o impacto do Split Payment
     * @returns {Object} Resultados da simulação
     */
    // simulator.js - linha ~109 (função simular)
    simular: function() {
      console.log('Iniciando simulação...');
      try {
        // 1. Obter dados consolidados do formulário
        const dados = this.obterDadosConsolidados();
        console.log('Dados obtidos:', dados);
        console.log(
          'Faturamento bruto:',
          document.getElementById('faturamento').value
        );
        console.log(
          'Faturamento processado:',
          dados.empresa.faturamento,
          typeof dados.empresa.faturamento
        );

        if (!dados) {
          throw new Error('Não foi possível obter dados');
        }

        // 2. Criar estrutura plana e validar entradas
        const dadosSimulacao = this.criarEstruturaPlana(dados);
        console.log('Dados de simulação consolidados:', dadosSimulacao);
        this.validarDados(dadosSimulacao);

        // 3. Declarar anoInicial e anoFinal
        const anoInicial =
          parseInt(dadosSimulacao.dataInicial.split('-')[0], 10) || 2026;
        const anoFinal =
          parseInt(dadosSimulacao.dataFinal.split('-')[0], 10) || 2033;

        // 4. Calcular impacto base com tratamento de erro
        let impactoBase;
        try {
          impactoBase = window.IVADualSystem.calcularImpactoCapitalGiro(
            dadosSimulacao,
            anoInicial
          );
          console.log('Impacto base calculado:', impactoBase);
        } catch (erroImpacto) {
          console.error('Erro ao calcular impacto base:', erroImpacto);
          impactoBase = this.gerarImpactoBaseFallback(dadosSimulacao);
        }

        // 5. Preparar parâmetros setoriais (opcional)
        const parametrosSetoriais =
          dados.empresa.setor && dados.setoresEspeciais
            ? dados.setoresEspeciais[dados.empresa.setor]
            : null;

        // 6. Calcular projeção temporal com fallback
        let projecaoTemporal;
        try {
          projecaoTemporal = window.IVADualSystem.calcularProjecaoTemporal(
            dadosSimulacao,
            anoInicial,
            anoFinal,
            dados.parametrosSimulacao.cenario,
            dados.parametrosSimulacao.taxaCrescimento,
            parametrosSetoriais
          );
          console.log('Projeção temporal calculada:', projecaoTemporal);
        } catch (erroProjecao) {
          console.error('Erro ao calcular projeção temporal:', erroProjecao);
          projecaoTemporal = {
            parametros: {
              anoInicial,
              anoFinal,
              cenario: dados.parametrosSimulacao.cenario,
              taxaCrescimento: dados.parametrosSimulacao.taxaCrescimento || 0.05
            },
            impactoAcumulado: {
              totalNecessidadeCapitalGiro:
                impactoBase.necesidadeAdicionalCapitalGiro *
                (anoFinal - anoInicial + 1),
              custoFinanceiroTotal:
                impactoBase.necesidadeAdicionalCapitalGiro *
                  (dados.parametrosFinanceiros?.taxaCapitalGiro || 0.021) *
                  12 *
                  (anoFinal - anoInicial + 1),
              impactoMedioMargem: impactoBase.impactoMargem
            }
          };
        }

        // 7. Gerar memória de cálculo com assinatura correta
        let memoriaCalculo;
        try {
          memoriaCalculo = gerarMemoriaCalculo(
            dadosSimulacao,
            impactoBase,
            projecaoTemporal
          );
        } catch (erroMemoria) {
          console.error('Erro ao gerar memória de cálculo:', erroMemoria);
          memoriaCalculo = {
            dadosEntrada: dadosSimulacao,
            impactoBase,
            projecaoTemporal: projecaoTemporal.parametros
          };
        }

        // 8. Armazenar resultados e montar objeto de retorno
        _resultadoAtual = impactoBase.resultadoAtual;
        _resultadoSplitPayment = impactoBase.resultadoSplitPayment;
        const resultados = {
          impactoBase,
          projecaoTemporal,
          memoriaCalculo,
          dadosUtilizados: dadosSimulacao,
          parametrosSetoriais
        };

        console.log('Simulação concluída com sucesso');

        // 9. Atualizar interface e gráficos
        if (typeof window.atualizarInterface === 'function') {
          window.atualizarInterface(resultados);
        } else {
          console.error('Função atualizarInterface não encontrada');
        }

        if (
          typeof window.ChartManager !== 'undefined' &&
          typeof window.ChartManager.renderizarGraficos === 'function'
        ) {
          window.ChartManager.renderizarGraficos(resultados);
        } else {
          console.error(
            'ChartManager não encontrado ou função renderizarGraficos indisponível'
          );
        }

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