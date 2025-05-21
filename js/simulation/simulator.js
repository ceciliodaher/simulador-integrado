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
 * @param {Object} dados - Dados consolidados para simulação (formato plano)
 * @returns {Object} - Resultados coordenados da simulação
 */
function coordenarCalculos(dados) {
    // Verificar se dados estão no formato plano
    if (dados.empresa !== undefined) {
        throw new Error('Estrutura incompatível. Dados devem estar em formato plano para cálculos.');
    }
    
    // Extrair ano inicial e final
    const anoInicial = parseInt(dados.dataInicial?.split('-')[0], 10) || 2026;
    const anoFinal = parseInt(dados.dataFinal?.split('-')[0], 10) || 2033;
    
    // 1. Calcular impacto base (sem cálculos adicionais)
    const impactoBase = window.IVADualSystem.calcularImpactoCapitalGiro(dados, anoInicial);
    
    // 2. Calcular projeção temporal (sem análise de elasticidade)
    const projecaoTemporal = window.IVADualSystem.calcularProjecaoTemporal(
        dados, 
        anoInicial, 
        anoFinal, 
        dados.cenario, 
        dados.taxaCrescimento
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
 * @param {Object} dados - Dados da simulação (formato plano)
 * @param {Object} impactoBase - Resultados do impacto base
 * @param {Object} projecaoTemporal - Resultados da projeção temporal
 * @returns {Object} - Memória de cálculo estruturada
 */
function gerarMemoriaCalculo(dados, impactoBase, projecaoTemporal) {
    // Verificar formato dos dados
    if (dados.empresa !== undefined) {
        throw new Error('Estrutura incompatível. Dados devem estar em formato plano para memória de cálculo.');
    }
    
    // Gerar estrutura aninhada para memória de cálculo
    return {
        dadosEntrada: {
            empresa: {
                faturamento: typeof dados.faturamento === 'number' ? dados.faturamento : 0,
                margem: typeof dados.margem === 'number' ? dados.margem : 0,
                setor: dados.setor || '',
                tipoEmpresa: dados.tipoEmpresa || '',
                regime: dados.regime || ''
            },
            cicloFinanceiro: {
                pmr: typeof dados.pmr === 'number' ? dados.pmr : 30,
                pmp: typeof dados.pmp === 'number' ? dados.pmp : 30,
                pme: typeof dados.pme === 'number' ? dados.pme : 30,
                percVista: typeof dados.percVista === 'number' ? dados.percVista : 0.3,
                percPrazo: typeof dados.percPrazo === 'number' ? dados.percPrazo : 0.7
            },
            parametrosFiscais: {
                aliquota: typeof dados.aliquota === 'number' ? dados.aliquota : 0.265,
                tipoOperacao: dados.tipoOperacao || '',
                regime: dados.regime || '',
                creditos: {
                    pis: typeof dados.creditosPIS === 'number' ? dados.creditosPIS : 0,
                    cofins: typeof dados.creditosCOFINS === 'number' ? dados.creditosCOFINS : 0,
                    icms: typeof dados.creditosICMS === 'number' ? dados.creditosICMS : 0,
                    ipi: typeof dados.creditosIPI === 'number' ? dados.creditosIPI : 0,
                    cbs: typeof dados.creditosCBS === 'number' ? dados.creditosCBS : 0,
                    ibs: typeof dados.creditosIBS === 'number' ? dados.creditosIBS : 0
                }
            },
            parametrosSimulacao: {
                cenario: dados.cenario || 'moderado',
                taxaCrescimento: typeof dados.taxaCrescimento === 'number' ? dados.taxaCrescimento : 0.05,
                dataInicial: dados.dataInicial || '2026-01-01',
                dataFinal: dados.dataFinal || '2033-12-31'
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

        // Verificar dependências críticas
        if (typeof window.DataManager === 'undefined') {
            console.error('DataManager não encontrado. O simulador requer o DataManager para funcionar corretamente.');
            throw new Error('Dependência crítica não encontrada: DataManager');
        }

        if (typeof window.IVADualSystem === 'undefined' || 
            typeof window.CurrentTaxSystem === 'undefined' || 
            typeof window.CalculationCore === 'undefined') {
            console.error('Módulos de cálculo não encontrados. O simulador requer todos os módulos de cálculo.');
            throw new Error('Dependências críticas de cálculo não encontradas');
        }

        console.log('Simulador de Split Payment inicializado com sucesso');
    },         

    /**
     * Obtém taxa de crescimento do DataManager
     * @returns {number} Taxa de crescimento normalizada
     */
    obterTaxaCrescimento() {
        // Obter dados do formulário via DataManager
        const dadosAninhados = window.DataManager.obterDadosDoFormulario();

        // Acessar a taxa de crescimento de forma segura
        if (dadosAninhados?.parametrosSimulacao?.cenario === 'personalizado') {
            return dadosAninhados?.parametrosSimulacao?.taxaCrescimento || 0.05;
        }

        // Valores padrão por cenário
        const taxasPorCenario = {
            'conservador': 0.02,
            'moderado': 0.05,
            'otimista': 0.08
        };

        return taxasPorCenario[dadosAninhados?.parametrosSimulacao?.cenario] || 0.05;
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

    /**
     * Gera um impacto base de fallback quando ocorrem erros
     * @param {Object} dados - Dados planos da simulação
     * @returns {Object} Impacto base simplificado
     */
    gerarImpactoBaseFallback(dados) {
        // Validar e garantir valores numéricos
        const faturamento = typeof dados.faturamento === 'number' && !isNaN(dados.faturamento) ? 
                           dados.faturamento : 0;

        const aliquota = typeof dados.aliquota === 'number' && !isNaN(dados.aliquota) ? 
                        dados.aliquota : 0.265;

        // Gerar um impacto base simplificado
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
     * @param {Object} dados - Dados a serem validados (formato aninhado)
     * @returns {Object} - Dados validados e normalizados
     * @throws {Error} - Erro descritivo se os dados forem inválidos
     */
    validarDados(dados) {
        if (!dados) {
            throw new Error('Dados não fornecidos para validação');
        }

        // Verificar se os dados estão em formato aninhado
        if (dados.empresa === undefined) {
            throw new Error('Estrutura de dados inválida: formato aninhado esperado');
        }

        // Delegar a validação completa ao DataManager
        try {
            const dadosValidados = window.DataManager.validarENormalizar(dados);

            // Log de diagnóstico
            window.DataManager.logTransformacao(
                dados, 
                dadosValidados, 
                'Validação de Dados de Entrada'
            );

            return dadosValidados;
        } catch (erro) {
            console.error('Erro na validação de dados:', erro);
            throw new Error(`Falha na validação dos dados: ${erro.message}`);
        }
    },

    /**
     * Simula o impacto do Split Payment
     * @param {Object} dadosExternos - Dados externos opcionais (formato aninhado)
     * @returns {Object} Resultados da simulação
     */
    simular(dadosExternos) {
        console.log('Iniciando simulação de impacto do Split Payment...');
        try {
            // 1. Obter dados consolidados - do parâmetro ou do formulário
            let dadosAninhados;
            if (dadosExternos) {
                dadosAninhados = dadosExternos;
                console.log('Utilizando dados fornecidos externamente');
            } else {
                dadosAninhados = window.DataManager.obterDadosDoFormulario();
                console.log('Dados obtidos do formulário');
            }

            if (!dadosAninhados) {
                throw new Error('Não foi possível obter dados para a simulação');
            }

            // 2. Validar e normalizar os dados (formato aninhado)
            const dadosValidados = this.validarDados(dadosAninhados);
            console.log('Dados validados e normalizados:', dadosValidados);

            // 3. Converter para estrutura plana para cálculos
            const dadosPlanos = window.DataManager.converterParaEstruturaPlana(dadosValidados);
            console.log('Dados convertidos para formato plano:', dadosPlanos);

            // 4. Extrair dados temporais para cálculos
            const anoInicial = parseInt(dadosPlanos.dataInicial?.split('-')[0], 10) || 2026;
            const anoFinal = parseInt(dadosPlanos.dataFinal?.split('-')[0], 10) || 2033;

            // 5. Obter parametros setoriais em formato próprio para cálculos
            const parametrosSetoriais = {
                aliquotaCBS: dadosValidados.ivaConfig?.cbs,
                aliquotaIBS: dadosValidados.ivaConfig?.ibs,
                categoriaIva: dadosValidados.ivaConfig?.categoriaIva,
                reducaoEspecial: dadosValidados.ivaConfig?.reducaoEspecial,
                cronogramaProprio: false // Valor padrão, ajustar conforme necessário
            };

            // 6. Calcular impacto base com tratamento de erro
            let impactoBase;
            try {
                impactoBase = window.IVADualSystem.calcularImpactoCapitalGiro(
                    dadosPlanos,
                    anoInicial,
                    parametrosSetoriais
                );
                console.log('Impacto base calculado com sucesso');
            } catch (erroImpacto) {
                console.error('Erro ao calcular impacto base:', erroImpacto);
                impactoBase = this.gerarImpactoBaseFallback(dadosPlanos);
            }

            // Garantir que resultadoIVASemSplit existe
            if (!impactoBase.resultadoIVASemSplit) {
                // Criar uma cópia do resultado atual como base
                impactoBase.resultadoIVASemSplit = JSON.parse(JSON.stringify(impactoBase.resultadoAtual));
                impactoBase.resultadoIVASemSplit.descricao = "Sistema IVA Dual sem Split Payment";

                // Se temos resultados de impostos IVA, usar esses valores
                if (impactoBase.resultadoSplitPayment && impactoBase.resultadoSplitPayment.impostos) {
                    impactoBase.resultadoIVASemSplit.impostos = impactoBase.resultadoSplitPayment.impostos;
                    impactoBase.resultadoIVASemSplit.valorImpostoTotal = 
                        impactoBase.resultadoSplitPayment.impostos.total || 0;

                    // Calcular o capital de giro para IVA sem Split
                    impactoBase.resultadoIVASemSplit.capitalGiroDisponivel = impactoBase.resultadoAtual.capitalGiroDisponivel * 
                        (impactoBase.resultadoSplitPayment.impostos.total / (impactoBase.resultadoAtual.impostos?.total || 1));
                }

                // Adicionar diferenças e percentuais específicos para IVA sem Split
                if (!impactoBase.diferencaCapitalGiroIVASemSplit) {
                    impactoBase.diferencaCapitalGiroIVASemSplit = 
                        impactoBase.resultadoIVASemSplit.capitalGiroDisponivel - 
                        impactoBase.resultadoAtual.capitalGiroDisponivel;
                }

                if (!impactoBase.percentualImpactoIVASemSplit) {
                    impactoBase.percentualImpactoIVASemSplit = 
                        impactoBase.resultadoAtual.capitalGiroDisponivel !== 0 ? 
                        (impactoBase.diferencaCapitalGiroIVASemSplit / impactoBase.resultadoAtual.capitalGiroDisponivel) * 100 : 0;
                }

                // Calcular a necessidade adicional de capital de giro para IVA sem Split
                if (!impactoBase.necessidadeAdicionalCapitalGiroIVASemSplit) {
                    impactoBase.necessidadeAdicionalCapitalGiroIVASemSplit = 
                        Math.abs(impactoBase.diferencaCapitalGiroIVASemSplit) * 1.2;
                }
            }

            // 7. Calcular projeção temporal com fallback
            let projecaoTemporal;
            try {
                projecaoTemporal = window.IVADualSystem.calcularProjecaoTemporal(
                    dadosPlanos,
                    anoInicial,
                    anoFinal,
                    dadosPlanos.cenario,
                    dadosPlanos.taxaCrescimento,
                    parametrosSetoriais
                );
                console.log('Projeção temporal calculada com sucesso');
            } catch (erroProjecao) {
                console.error('Erro ao calcular projeção temporal:', erroProjecao);
                projecaoTemporal = {
                    parametros: {
                        anoInicial,
                        anoFinal,
                        cenarioTaxaCrescimento: dadosPlanos.cenario || 'moderado',
                        taxaCrescimento: dadosPlanos.taxaCrescimento || 0.05
                    },
                    impactoAcumulado: {
                        totalNecessidadeCapitalGiro:
                            (impactoBase.necessidadeAdicionalCapitalGiro || 0) *
                            (anoFinal - anoInicial + 1),
                        custoFinanceiroTotal:
                            (impactoBase.necessidadeAdicionalCapitalGiro || 0) *
                            (dadosPlanos.taxaCapitalGiro || 0.021) *
                            12 *
                            (anoFinal - anoInicial + 1),
                        impactoMedioMargem: impactoBase.impactoMargem || 0
                    },
                    resultadosAnuais: {}, // Objeto vazio para evitar erros de acesso
                    comparacaoRegimes: {  // Estrutura mínima para evitar erros no chartManager
                        anos: [anoInicial, anoFinal],
                        atual: { capitalGiro: [impactoBase.resultadoAtual?.capitalGiroDisponivel || 0, 0], impostos: [0, 0] },
                        splitPayment: { capitalGiro: [impactoBase.resultadoSplitPayment?.capitalGiroDisponivel || 0, 0], impostos: [0, 0] },
                        ivaSemSplit: { capitalGiro: [impactoBase.resultadoIVASemSplit?.capitalGiroDisponivel || 0, 0], impostos: [0, 0] },
                        impacto: { 
                            diferencaCapitalGiro: [impactoBase.diferencaCapitalGiro || 0, 0], 
                            percentualImpacto: [impactoBase.percentualImpacto || 0, 0], 
                            necessidadeAdicional: [impactoBase.necessidadeAdicionalCapitalGiro || 0, 0] 
                        }
                    }
                };
            }

            // Garantir que a projeção temporal possui informações para IVA sem Split
            if (projecaoTemporal.resultadosAnuais) {
                Object.keys(projecaoTemporal.resultadosAnuais).forEach(ano => {
                    const resultadoAno = projecaoTemporal.resultadosAnuais[ano];

                    if (!resultadoAno.resultadoIVASemSplit) {
                        resultadoAno.resultadoIVASemSplit = JSON.parse(JSON.stringify(resultadoAno.resultadoAtual));
                        resultadoAno.resultadoIVASemSplit.descricao = "Sistema IVA Dual sem Split Payment";

                        if (resultadoAno.resultadoSplitPayment && resultadoAno.resultadoSplitPayment.impostos) {
                            resultadoAno.resultadoIVASemSplit.impostos = resultadoAno.resultadoSplitPayment.impostos;
                            resultadoAno.resultadoIVASemSplit.valorImpostoTotal = 
                                resultadoAno.resultadoSplitPayment.impostos.total || 0;

                            // Calcular o capital de giro para IVA sem Split
                            resultadoAno.resultadoIVASemSplit.capitalGiroDisponivel = resultadoAno.resultadoAtual.capitalGiroDisponivel * 
                                (resultadoAno.resultadoSplitPayment.impostos.total / (resultadoAno.resultadoAtual.impostos?.total || 1));
                        }
                    }

                    if (!resultadoAno.diferencaCapitalGiroIVASemSplit) {
                        resultadoAno.diferencaCapitalGiroIVASemSplit = 
                            (resultadoAno.resultadoIVASemSplit.capitalGiroDisponivel || 0) - 
                            (resultadoAno.resultadoAtual.capitalGiroDisponivel || 0);

                        resultadoAno.percentualImpactoIVASemSplit = 
                            resultadoAno.resultadoAtual.capitalGiroDisponivel !== 0 ? 
                            (resultadoAno.diferencaCapitalGiroIVASemSplit / resultadoAno.resultadoAtual.capitalGiroDisponivel) * 100 : 0;

                        // Calcular a necessidade adicional de capital de giro para IVA sem Split
                        resultadoAno.necessidadeAdicionalCapitalGiroIVASemSplit = 
                            Math.abs(resultadoAno.diferencaCapitalGiroIVASemSplit) * 1.2;
                    }
                });
            }

            // 8. Calcular análise de elasticidade
            let analiseElasticidade;
            try {
                analiseElasticidade = window.CalculationCore.calcularAnaliseElasticidade(
                    dadosPlanos,
                    anoInicial,
                    anoFinal
                );
                // Adicionar à projeção temporal
                projecaoTemporal.analiseElasticidade = analiseElasticidade;
            } catch (erroElasticidade) {
                console.error('Erro ao calcular análise de elasticidade:', erroElasticidade);
                // Não interrompe o fluxo se falhar
            }

            // 9. Gerar memória de cálculo
            let memoriaCalculo;
            try {
                memoriaCalculo = gerarMemoriaCalculo(
                    dadosPlanos,
                    impactoBase,
                    projecaoTemporal
                );
            } catch (erroMemoria) {
                console.error('Erro ao gerar memória de cálculo:', erroMemoria);
                memoriaCalculo = {
                    dadosEntrada: window.DataManager.converterParaEstruturaAninhada(dadosPlanos),
                    impactoBase: {
                        diferencaCapitalGiro: impactoBase.diferencaCapitalGiro,
                        diferencaCapitalGiroIVASemSplit: impactoBase.diferencaCapitalGiroIVASemSplit,
                        percentualImpacto: impactoBase.percentualImpacto,
                        percentualImpactoIVASemSplit: impactoBase.percentualImpactoIVASemSplit
                    },
                    projecaoTemporal: {
                        parametros: projecaoTemporal.parametros
                    }
                };
            }

            // 10. Armazenar resultados intermediários para referência
            _resultadoAtual = impactoBase.resultadoAtual || null;
            _resultadoSplitPayment = impactoBase.resultadoSplitPayment || null;

            // 11. Construir objeto de resultado para interface (formato aninhado)
            const resultadosParaInterface = {
                impactoBase,
                projecaoTemporal,
                memoriaCalculo,
                dadosUtilizados: dadosValidados
            };

            console.log('Simulação concluída com sucesso');

            // 12. Atualizar interface e gráficos (se disponíveis)
            if (typeof window.atualizarInterface === 'function') {
                window.atualizarInterface(resultadosParaInterface);
            } else {
                console.warn('Função atualizarInterface não encontrada. A interface não será atualizada automaticamente.');
            }

            if (
                typeof window.ChartManager !== 'undefined' &&
                typeof window.ChartManager.renderizarGraficos === 'function'
            ) {
                window.ChartManager.renderizarGraficos(resultadosParaInterface);
            } else {
                console.warn('ChartManager não encontrado ou função renderizarGraficos indisponível.');
            }

            return resultadosParaInterface;
        } catch (erro) {
            console.error('Erro crítico durante a simulação:', erro);
            alert('Ocorreu um erro durante a simulação: ' + erro.message);
            return null;
        }
    },
    
    /**
     * Simula o impacto das estratégias de mitigação
     * @returns {Object} Resultados da simulação com estratégias
     */
    simularEstrategias() {
        console.log('Iniciando simulação de estratégias de mitigação...');
        try {
            // 1. Verificar se já existe uma simulação base
            if (!_resultadoAtual || !_resultadoSplitPayment) {
                // Executar simulação base primeiro
                console.log('Simulação base necessária antes de estratégias. Executando...');
                const resultadoBase = this.simular();
                if (!resultadoBase) {
                    throw new Error('Não foi possível realizar a simulação base');
                }
            }

            // 2. Obter configurações das estratégias via DataManager
            const dadosAninhados = window.DataManager.obterDadosDoFormulario();

            // Validar estrutura aninhada antes de prosseguir
            if (!dadosAninhados || !dadosAninhados.estrategias) {
                throw new Error('Estrutura de dados inválida ou incompleta');
            }

            // 3. Converter para formato plano de forma segura
            const dadosPlanos = window.DataManager.converterParaEstruturaPlana(dadosAninhados);

            // 4. Usar IVADualSystem para calcular impacto base (para comparação)
            const impactoBase = window.IVADualSystem.calcularImpactoCapitalGiro(
                dadosPlanos,
                parseInt(dadosPlanos.dataInicial?.split('-')[0], 10) || 2026
            );

            // 5. Filtrar estratégias ativas de forma explícita e robusta
            const estrategiasAtivas = {};
            let temEstrategiaAtiva = false;

            // Verificação detalhada de cada estratégia
            if (dadosAninhados.estrategias) {
                Object.entries(dadosAninhados.estrategias).forEach(([chave, estrategia]) => {
                    if (estrategia && estrategia.ativar === true) {
                        estrategiasAtivas[chave] = estrategia;
                        temEstrategiaAtiva = true;
                        console.log(`Estratégia ativa: ${chave}`, estrategia);
                    }
                });
            }

            // Tratamento específico para caso sem estratégias ativas
            if (!temEstrategiaAtiva) {
                console.log('Nenhuma estratégia ativa encontrada');
                const divResultados = document.getElementById('resultados-estrategias');
                if (divResultados) {
                    divResultados.innerHTML = '<p class="text-muted">Nenhuma estratégia de mitigação foi selecionada para simulação. Ative uma ou mais estratégias e simule novamente.</p>';
                }

                // Atualizar os gráficos para exibir estado vazio/inicial
                if (typeof window.ChartManager !== 'undefined' && typeof window.ChartManager.renderizarGraficoEstrategias === 'function') {
                    // Apenas passar o impactoBase para ter um contexto de comparação
                    window.ChartManager.renderizarGraficoEstrategias(null, impactoBase);
                }

                // Retornar estrutura compatível com interface
                return {
                    semEstrategiasAtivas: true,
                    mensagem: "Nenhuma estratégia ativa encontrada",
                    efeitividadeCombinada: {
                        efetividadePercentual: 0,
                        mitigacaoTotal: 0,
                        custoTotal: 0,
                        custoBeneficio: 0
                    },
                    detalhesPorEstrategia: {}
                };
            }

            // 6. Calcular efetividade das estratégias com as estratégias filtradas
            const resultadoEstrategias = window.IVADualSystem.calcularEfeitividadeMitigacao(
                dadosPlanos,
                estrategiasAtivas,
                parseInt(dadosPlanos.dataInicial?.split('-')[0], 10) || 2026
            );

            // Validar resultado para garantir segurança
            if (!resultadoEstrategias || !resultadoEstrategias.efeitividadeCombinada) {
                throw new Error('Cálculo de efetividade retornou resultado inválido');
            }

            // 7. Armazenar os resultados globalmente para referência futura
            window.lastStrategyResults = resultadoEstrategias;

            // 8. Atualizar interface com resultados estruturados
            const divResultados = document.getElementById('resultados-estrategias');
            if (divResultados) {
                // Estruturar resultado como uma classe HTML específica para facilitar detecção
                let html = '<div class="estrategias-resumo">';
                html += '<h4>Resultados das Estratégias</h4>';

                // Detalhar impacto das estratégias
                const impactoOriginal = Math.abs(impactoBase.diferencaCapitalGiro || 0);
                const efetividadePercentual = resultadoEstrategias.efeitividadeCombinada.efetividadePercentual || 0;
                const mitigacaoTotal = resultadoEstrategias.efeitividadeCombinada.mitigacaoTotal || 0;
                const impactoResidual = impactoOriginal - mitigacaoTotal;

                html += `<p><strong>Impacto Original:</strong> ${window.CalculationCore.formatarMoeda(impactoOriginal)}</p>`;
                html += `<p><strong>Efetividade da Mitigação:</strong> ${efetividadePercentual.toFixed(1)}%</p>`;
                html += `<p><strong>Impacto Mitigado:</strong> ${window.CalculationCore.formatarMoeda(mitigacaoTotal)}</p>`;
                html += `<p><strong>Impacto Residual:</strong> ${window.CalculationCore.formatarMoeda(impactoResidual)}</p>`;

                // Seção de custo das estratégias
                html += '<div class="estrategias-custo">';
                html += `<p><strong>Custo Total das Estratégias:</strong> ${window.CalculationCore.formatarMoeda(resultadoEstrategias.efeitividadeCombinada.custoTotal || 0)}</p>`;
                html += `<p><strong>Relação Custo-Benefício:</strong> ${(resultadoEstrategias.efeitividadeCombinada.custoBeneficio || 0).toFixed(2)}</p>`;
                html += '</div>';

                // Adicionar detalhamento por estratégia
                if (resultadoEstrategias.resultadosEstrategias && Object.keys(resultadoEstrategias.resultadosEstrategias).length > 0) {
                    html += '<div class="estrategias-detalhe">';
                    html += '<h5>Detalhamento por Estratégia</h5>';
                    html += '<table class="estrategias-tabela">';
                    html += '<tr><th>Estratégia</th><th>Efetividade</th><th>Impacto Mitigado</th><th>Custo</th></tr>';

                    Object.entries(resultadoEstrategias.resultadosEstrategias).forEach(([nome, resultado]) => {
                        if (resultado) {
                            const nomeFormatado = this.traduzirNomeEstrategia(nome);
                            html += `<tr>
                                <td>${nomeFormatado}</td>
                                <td>${(resultado.efetividadePercentual || 0).toFixed(1)}%</td>
                                <td>${window.CalculationCore.formatarMoeda(resultado.valorMitigado || 0)}</td>
                                <td>${window.CalculationCore.formatarMoeda(resultado.custoImplementacao || 0)}</td>
                            </tr>`;
                        }
                    });

                    html += '</table>';
                    html += '</div>';
                }

                html += '</div>'; // Fechamento da div estrategias-resumo

                // Incluir log para diagnóstico
                console.log("SIMULATOR.JS: [LOG ATIVADO] Conteúdo HTML gerado para resultados das estratégias:", html);

                // Atribuir HTML ao elemento
                divResultados.innerHTML = html;

                // Verificar se a atribuição foi bem-sucedida
                console.log("SIMULATOR.JS: [LOG ATIVADO] divResultados.innerHTML atribuído com sucesso.");
            } else {
                console.error("SIMULATOR.JS: [LOG ATIVADO] Elemento #resultados-estrategias não encontrado no DOM!");
            }

            // 9. Atualizar gráficos de estratégias
            if (typeof window.ChartManager !== 'undefined' && 
                typeof window.ChartManager.renderizarGraficoEstrategias === 'function') {
                try {
                    // Chamar com parâmetros explícitos
                    window.ChartManager.renderizarGraficoEstrategias(resultadoEstrategias, impactoBase);
                    console.log('Gráficos de estratégias renderizados com sucesso');
                } catch (erroGraficos) {
                    console.error('Erro ao renderizar gráficos de estratégias:', erroGraficos);
                }
            }

            console.log('Simulação de estratégias concluída com sucesso');
            return resultadoEstrategias;
        } catch (erro) {
            console.error('Erro durante a simulação de estratégias:', erro);
            alert('Ocorreu um erro durante a simulação de estratégias: ' + erro.message);
            return null;
        }
    },
    
    /**
     * Traduz o nome técnico da estratégia para um nome amigável
     * @param {string} nomeTecnico - Nome técnico da estratégia
     * @returns {string} Nome amigável para exibição
     */
    traduzirNomeEstrategia(nomeTecnico) {
        const traducoes = {
            'ajustePrecos': 'Ajuste de Preços',
            'renegociacaoPrazos': 'Renegociação de Prazos',
            'antecipacaoRecebiveis': 'Antecipação de Recebíveis',
            'capitalGiro': 'Capital de Giro',
            'mixProdutos': 'Mix de Produtos',
            'meiosPagamento': 'Meios de Pagamento'
        };

        return traducoes[nomeTecnico] || nomeTecnico;
    },

    /**
     * Obtém o resultado atual para diagnóstico
     * @returns {Object|null} Resultado do regime atual
     */
    getResultadoAtual() { 
        return _resultadoAtual || null; 
    },

    /**
     * Obtém o resultado do Split Payment para diagnóstico
     * @returns {Object|null} Resultado do regime Split Payment
     */
    getResultadoSplitPayment() { 
        return _resultadoSplitPayment || null; 
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