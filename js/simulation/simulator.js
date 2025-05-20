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
                cbs: dadosValidados.ivaConfig?.cbs,
                ibs: dadosValidados.ivaConfig?.ibs,
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
                            (impactoBase.necesidadeAdicionalCapitalGiro || 0) *
                            (anoFinal - anoInicial + 1),
                        custoFinanceiroTotal:
                            (impactoBase.necesidadeAdicionalCapitalGiro || 0) *
                            (dadosPlanos.taxaCapitalGiro || 0.021) *
                            12 *
                            (anoFinal - anoInicial + 1),
                        impactoMedioMargem: impactoBase.impactoMargem || 0
                    }
                };
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
                        percentualImpacto: impactoBase.percentualImpacto
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
            const estrategiasConfiguradas = dadosAninhados.estrategias;

            if (!estrategiasConfiguradas) {
                throw new Error('Não foi possível obter configurações das estratégias');
            }

            // 3. Converter para formato plano
            const dadosPlanos = window.DataManager.converterParaEstruturaPlana(dadosAninhados);

            // 4. Usar IVADualSystem para calcular efetividade
            const impactoBase = window.IVADualSystem.calcularImpactoCapitalGiro(
                dadosPlanos,
                parseInt(dadosPlanos.dataInicial?.split('-')[0], 10) || 2026
            );

            // Filter for active strategies
            const activeStrategies = {};
            let anyStrategyActive = false;
            if (estrategiasConfiguradas) { // Ensure estrategiasConfiguradas is not null/undefined
                for (const key in estrategiasConfiguradas) {
                    if (estrategiasConfiguradas.hasOwnProperty(key) && estrategiasConfiguradas[key].ativar === true) {
                        activeStrategies[key] = estrategiasConfiguradas[key];
                        anyStrategyActive = true;
                    }
                }
            }

            // Handle case where no strategies are active
            if (!anyStrategyActive) {
                const divResultados = document.getElementById('resultados-estrategias');
                if (divResultados) {
                    divResultados.innerHTML = '<p class="text-muted">Nenhuma estratégia de mitigação foi selecionada para simulação. Ative uma ou mais estratégias e simule novamente.</p>';
                }
                
                // Clear or update the strategies chart
                if (typeof window.ChartManager !== 'undefined' && 
                    typeof window.ChartManager.renderizarGraficoEstrategias === 'function') {
                    // Pass null for strategy results, but impactoBase might still be relevant for context
                    window.ChartManager.renderizarGraficoEstrategias(null, impactoBase); 
                }
                
                console.log('Simulação de estratégias concluída: Nenhuma estratégia ativa.');
                return { 
                    semEstrategiasAtivas: true,
                    mensagem: "Nenhuma estratégia ativa.",
                    efeitividadeCombinada: { 
                        efetividadePercentual: 0, 
                        mitigacaoTotal: 0, 
                        custoTotal: 0, 
                        custoBeneficio: 0 
                    },
                    detalhesPorEstrategia: {}
                    // This structure should be compatible with downstream UI updates.
                    // It mirrors the expected structure from calcularEfeitividadeMitigacao.
                };
            }

            // 5. Calcular efetividade das estratégias (using activeStrategies)
            const resultadoEstrategias = window.IVADualSystem.calcularEfeitividadeMitigacao(
                dadosPlanos,
                activeStrategies, // Changed from estrategiasConfiguradas
                parseInt(dadosPlanos.dataInicial?.split('-')[0], 10) || 2026
            );

            // 6. Atualizar interface com resultados (elemento específico)
            const divResultados = document.getElementById('resultados-estrategias');
            if (divResultados) {
                // Formatar e exibir resultados
                let html = '<h4>Resultados das Estratégias</h4>';

                // Detalhar impacto das estratégias
                html += '<div class="estrategias-resumo">';
                html += `<p><strong>Impacto Original:</strong> ${window.CalculationCore.formatarMoeda(Math.abs(impactoBase.diferencaCapitalGiro))}</p>`;
                html += `<p><strong>Efetividade da Mitigação:</strong> ${resultadoEstrategias.efeitividadeCombinada.efetividadePercentual.toFixed(1)}%</p>`;
                html += `<p><strong>Impacto Mitigado:</strong> ${window.CalculationCore.formatarMoeda(resultadoEstrategias.efeitividadeCombinada.mitigacaoTotal)}</p>`;
                html += `<p><strong>Impacto Residual:</strong> ${window.CalculationCore.formatarMoeda(Math.abs(impactoBase.diferencaCapitalGiro) - resultadoEstrategias.efeitividadeCombinada.mitigacaoTotal)}</p>`;
                html += '</div>';

                // Mostrar custo das estratégias
                html += '<div class="estrategias-custo">';
                html += `<p><strong>Custo Total das Estratégias:</strong> ${window.CalculationCore.formatarMoeda(resultadoEstrategias.efeitividadeCombinada.custoTotal)}</p>`;
                html += `<p><strong>Relação Custo-Benefício:</strong> ${resultadoEstrategias.efeitividadeCombinada.custoBeneficio.toFixed(2)}</p>`;
                html += '</div>';

                divResultados.innerHTML = html;
            }

            // 7. Atualizar gráfico de estratégias
            if (typeof window.ChartManager !== 'undefined' && 
                typeof window.ChartManager.renderizarGraficoEstrategias === 'function') {
                window.ChartManager.renderizarGraficoEstrategias(resultadoEstrategias, impactoBase);
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