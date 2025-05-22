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
 * Detecta e integra dados do SPED nos cálculos do simulador
 * @param {Object} dadosAninhados - Dados em estrutura aninhada
 * @returns {Object} Dados processados com integração SPED
 */
function processarDadosComIntegracaoSped(dadosAninhados) {
    // Verificar se há dados do SPED
    if (!dadosAninhados.dadosSpedImportados) {
        console.log('Simulação executada sem dados SPED - usando parâmetros configurados manualmente');
        return dadosAninhados;
    }

    console.log('Simulação executada com dados SPED - priorizando dados reais extraídos');
    
    // Criar cópia para processamento
    const dadosProcessados = JSON.parse(JSON.stringify(dadosAninhados));
    const dadosSped = dadosAninhados.dadosSpedImportados.composicaoTributaria;

    // Sobrescrever parâmetros fiscais com dados do SPED
    if (!dadosProcessados.parametrosFiscais) {
        dadosProcessados.parametrosFiscais = {};
    }

    // Priorizar débitos reais do SPED
    dadosProcessados.parametrosFiscais.debitosReais = dadosSped.debitos;
    dadosProcessados.parametrosFiscais.creditosReais = dadosSped.creditos;
    dadosProcessados.parametrosFiscais.aliquotasEfetivasReais = dadosSped.aliquotasEfetivas;

    // Calcular alíquota total real baseada nos dados do SPED
    const faturamento = dadosProcessados.empresa?.faturamento || 0;
    if (faturamento > 0 && dadosSped.totalDebitos > 0) {
        dadosProcessados.parametrosFiscais.aliquotaEfetivaReal = dadosSped.totalDebitos / faturamento;
        dadosProcessados.parametrosFiscais.usarAliquotaReal = true;
    }

    // Adicionar metadados para rastreamento
    dadosProcessados.metadados = {
        ...dadosProcessados.metadados,
        fonteDadosTributarios: 'sped',
        precisaoCalculos: 'alta',
        timestampProcessamento: new Date().toISOString()
    };

    return dadosProcessados;
}

/**
 * Gera a memória de cálculo de forma centralizada
 * @param {Object} dados - Dados da simulação (formato plano)
 * @param {Object} impactoBase - Resultados do impacto base
 * @param {Object} projecaoTemporal - Resultados da projeção temporal
 * @returns {Object} - Memória de cálculo estruturada
 */
function gerarMemoriaCalculo(dados, impactoBase, projecaoTemporal) {
    if (dados.empresa !== undefined) {
        throw new Error('Estrutura incompatível. Dados devem estar em formato plano para memória de cálculo.');
    }
    
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
                },
                // NOVA SEÇÃO: Débitos tributários
                debitos: {
                    pis: typeof dados.debitosPIS === 'number' ? dados.debitosPIS : 0,
                    cofins: typeof dados.debitosCOFINS === 'number' ? dados.debitosCOFINS : 0,
                    icms: typeof dados.debitosICMS === 'number' ? dados.debitosICMS : 0,
                    ipi: typeof dados.debitosIPI === 'number' ? dados.debitosIPI : 0,
                    iss: typeof dados.debitosISS === 'number' ? dados.debitosISS : 0
                },
                // NOVA SEÇÃO: Cronograma de transição
                cronogramaTransicao: {
                    2026: 0.10, 2027: 0.25, 2028: 0.40, 2029: 0.55,
                    2030: 0.70, 2031: 0.85, 2032: 0.95, 2033: 1.00
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
        },
        // NOVA SEÇÃO: Memória crítica com cálculos de transição
        memoriaCritica: {
            formula: "Impacto Transição = (Sistema Atual × % Atual) + (IVA Dual × % IVA) - Sistema Atual Original",
            passoAPasso: [
                "1. Calcular débitos e créditos por imposto no sistema atual",
                "2. Calcular alíquotas efetivas por imposto",
                "3. Determinar percentual de transição para o ano (10% em 2026 até 100% em 2033)",
                "4. Calcular valor híbrido: (Tributos Atuais × % Sistema Atual) + (IVA Dual × % Sistema Novo)",
                "5. Determinar impacto no capital de giro considerando a transição progressiva",
                "6. Projetar impactos ao longo dos 8 anos de transição"
            ],
            observacoes: [
                "Durante a transição, empresas pagarão ambos os sistemas simultaneamente",
                "O percentual do sistema atual diminui gradualmente de 90% (2026) para 0% (2033)",
                "O percentual do IVA Dual aumenta gradualmente de 10% (2026) para 100% (2033)",
                "Cálculos baseiam-se na LC 214/2025 e regulamentação posterior",
                "Valores podem variar conforme alterações na regulamentação"
            ]
        }
    };
}

/**
 * Integra dados do SPED na estrutura plana para cálculos
 * @param {Object} dadosPlanos - Estrutura plana de dados
 * @param {Object} dadosSpedImportados - Dados importados do SPED
 */
function integrarDadosSpedNaEstruturaPlana(dadosPlanos, dadosSpedImportados) {
    const composicao = dadosSpedImportados.composicaoTributaria;
    
    // Adicionar débitos e créditos específicos
    dadosPlanos.debitosPIS = composicao.debitos.pis || 0;
    dadosPlanos.debitosCOFINS = composicao.debitos.cofins || 0;
    dadosPlanos.debitosICMS = composicao.debitos.icms || 0;
    dadosPlanos.debitosIPI = composicao.debitos.ipi || 0;
    dadosPlanos.debitosISS = composicao.debitos.iss || 0;
    
    dadosPlanos.creditosPIS = composicao.creditos.pis || 0;
    dadosPlanos.creditosCOFINS = composicao.creditos.cofins || 0;
    dadosPlanos.creditosICMS = composicao.creditos.icms || 0;
    dadosPlanos.creditosIPI = composicao.creditos.ipi || 0;
    
    // Sobrescrever alíquota se disponível dados reais
    if (composicao.aliquotasEfetivas.total > 0) {
        dadosPlanos.aliquota = composicao.aliquotasEfetivas.total / 100;
        dadosPlanos.aliquotaOrigem = 'sped';
    }
    
    // Flags de controle
    dadosPlanos.temDadosSped = true;
    dadosPlanos.fonteDados = 'sped';
    
    console.log('Dados do SPED integrados na estrutura plana para cálculos');
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

                // 1.5. NOVA ETAPA: Processar integração com dados SPED
                dadosAninhados = processarDadosComIntegracaoSped(dadosAninhados);

                // 2. Validar e normalizar os dados (formato aninhado)
                const dadosValidados = this.validarDados(dadosAninhados);
                console.log('Dados validados e normalizados:', dadosValidados);

                // 3. Converter para estrutura plana para cálculos
                const dadosPlanos = window.DataManager.converterParaEstruturaPlana(dadosValidados);
                console.log('Dados convertidos para formato plano:', dadosPlanos);

                // 3.5. NOVA ETAPA: Adicionar dados SPED à estrutura plana
                if (dadosValidados.dadosSpedImportados) {
                    integrarDadosSpedNaEstruturaPlana(dadosPlanos, dadosValidados.dadosSpedImportados);
                }

                // 4. Extrair dados temporais para cálculos
                const anoInicial = parseInt(dadosPlanos.dataInicial?.split('-')[0], 10) || 2026;
                const anoFinal = parseInt(dadosPlanos.dataFinal?.split('-')[0], 10) || 2033;

                // 5. Obter parametros setoriais em formato próprio para cálculos
                const parametrosSetoriais = {
                    aliquotaCBS: dadosValidados.ivaConfig?.cbs || 0.088,
                    aliquotaIBS: dadosValidados.ivaConfig?.ibs || 0.177,
                    categoriaIva: dadosValidados.ivaConfig?.categoriaIva || 'standard',
                    reducaoEspecial: dadosValidados.ivaConfig?.reducaoEspecial || 0,
                    cronogramaProprio: false
                };

                // 6. Calcular impacto base com tratamento de erro robusto
                let impactoBase;
                try {
                    impactoBase = window.IVADualSystem.calcularImpactoCapitalGiro(
                        dadosPlanos,
                        anoInicial,
                        parametrosSetoriais
                    );
                    console.log('Impacto base calculado com sucesso');

                    // Validar estrutura do impacto base
                    this._validarImpactoBase(impactoBase);

                } catch (erroImpacto) {
                    console.error('Erro ao calcular impacto base:', erroImpacto);
                    impactoBase = this.gerarImpactoBaseFallback(dadosPlanos);
                    console.log('Usando impacto base de fallback');
                }

                // 7. Garantir que resultadoIVASemSplit existe e está completo
                impactoBase = this._garantirResultadoIVASemSplit(impactoBase);

                // 8. Calcular projeção temporal com fallback robusto
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

                    // Validar e completar projeção temporal
                    projecaoTemporal = this._validarECompletarProjecaoTemporal(projecaoTemporal, impactoBase, anoInicial, anoFinal);

                } catch (erroProjecao) {
                    console.error('Erro ao calcular projeção temporal:', erroProjecao);
                    projecaoTemporal = this._gerarProjecaoTemporalFallback(impactoBase, dadosPlanos, anoInicial, anoFinal);
                }

                // 9. Calcular análise de elasticidade
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

                // 10. Gerar memória de cálculo
                let memoriaCalculo;
                try {
                    memoriaCalculo = gerarMemoriaCalculo(
                        dadosPlanos,
                        impactoBase,
                        projecaoTemporal
                    );
                } catch (erroMemoria) {
                    console.error('Erro ao gerar memória de cálculo:', erroMemoria);
                    memoriaCalculo = this._gerarMemoriaCalculoFallback(dadosPlanos, impactoBase, projecaoTemporal);
                }

                // 11. Armazenar resultados intermediários para referência
                _resultadoAtual = impactoBase.resultadoAtual || null;
                _resultadoSplitPayment = impactoBase.resultadoSplitPayment || null;

                // 12. Construir objeto de resultado para interface (formato aninhado)
                const resultadosParaInterface = {
                    impactoBase,
                    projecaoTemporal,
                    memoriaCalculo,
                    dadosUtilizados: dadosValidados,
                    // Garantir estrutura de exportação
                    resultadosExportacao: this._gerarEstruturaExportacao(impactoBase, projecaoTemporal)
                };

                console.log('Simulação concluída com sucesso');

                // 13. Atualizar interface e gráficos (se disponíveis)
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
     * Valida a estrutura do impacto base
     * @private
     * @param {Object} impactoBase - Impacto base calculado
     * @throws {Error} Se a estrutura for inválida
     */
    _validarImpactoBase(impactoBase) {
        if (!impactoBase) {
            throw new Error('Impacto base não foi calculado');
        }

        const camposObrigatorios = ['diferencaCapitalGiro', 'percentualImpacto', 'resultadoAtual', 'resultadoSplitPayment'];

        camposObrigatorios.forEach(campo => {
            if (impactoBase[campo] === undefined) {
                throw new Error(`Campo obrigatório ausente no impacto base: ${campo}`);
            }
        });

        // Validar estruturas de resultado
        if (!impactoBase.resultadoAtual.capitalGiroDisponivel && impactoBase.resultadoAtual.capitalGiroDisponivel !== 0) {
            throw new Error('Capital de giro atual não calculado');
        }

        if (!impactoBase.resultadoSplitPayment.capitalGiroDisponivel && impactoBase.resultadoSplitPayment.capitalGiroDisponivel !== 0) {
            throw new Error('Capital de giro Split Payment não calculado');
        }
    },

    /**
     * Garante que o resultado IVA sem Split existe e está completo
     * @private
     * @param {Object} impactoBase - Impacto base
     * @returns {Object} Impacto base com resultado IVA sem Split garantido
     */
    _garantirResultadoIVASemSplit(impactoBase) {
        if (!impactoBase.resultadoIVASemSplit) {
            // Criar uma cópia do resultado atual como base
            impactoBase.resultadoIVASemSplit = {
                ...JSON.parse(JSON.stringify(impactoBase.resultadoAtual)),
                descricao: "Sistema IVA Dual sem Split Payment"
            };

            // Se temos resultados de impostos IVA, usar esses valores
            if (impactoBase.resultadoSplitPayment?.impostos) {
                impactoBase.resultadoIVASemSplit.impostos = { ...impactoBase.resultadoSplitPayment.impostos };
                impactoBase.resultadoIVASemSplit.valorImpostoTotal = impactoBase.resultadoSplitPayment.impostos.total || 0;

                // Calcular o capital de giro para IVA sem Split
                const fatorImposto = impactoBase.resultadoSplitPayment.impostos.total / (impactoBase.resultadoAtual.impostos?.total || 1);
                impactoBase.resultadoIVASemSplit.capitalGiroDisponivel = impactoBase.resultadoAtual.capitalGiroDisponivel * fatorImposto;
            }
        }

        // Garantir campos de diferença
        if (!impactoBase.diferencaCapitalGiroIVASemSplit) {
            impactoBase.diferencaCapitalGiroIVASemSplit = 
                (impactoBase.resultadoIVASemSplit.capitalGiroDisponivel || 0) - 
                (impactoBase.resultadoAtual.capitalGiroDisponivel || 0);
        }

        if (!impactoBase.percentualImpactoIVASemSplit) {
            impactoBase.percentualImpactoIVASemSplit = 
                impactoBase.resultadoAtual.capitalGiroDisponivel !== 0 ? 
                (impactoBase.diferencaCapitalGiroIVASemSplit / impactoBase.resultadoAtual.capitalGiroDisponivel) * 100 : 0;
        }

        if (!impactoBase.necessidadeAdicionalCapitalGiroIVASemSplit) {
            impactoBase.necessidadeAdicionalCapitalGiroIVASemSplit = 
                Math.abs(impactoBase.diferencaCapitalGiroIVASemSplit) * 1.2;
        }

        return impactoBase;
    },

    /**
     * Valida e completa a projeção temporal
     * @private
     * @param {Object} projecaoTemporal - Projeção temporal calculada
     * @param {Object} impactoBase - Impacto base
     * @param {number} anoInicial - Ano inicial
     * @param {number} anoFinal - Ano final
     * @returns {Object} Projeção temporal validada e completa
     */
    _validarECompletarProjecaoTemporal(projecaoTemporal, impactoBase, anoInicial, anoFinal) {
        // Garantir que existe resultadosAnuais
        if (!projecaoTemporal.resultadosAnuais) {
            projecaoTemporal.resultadosAnuais = {};
        }

        // Garantir que todos os anos têm dados
        for (let ano = anoInicial; ano <= anoFinal; ano++) {
            if (!projecaoTemporal.resultadosAnuais[ano]) {
                projecaoTemporal.resultadosAnuais[ano] = this._gerarDadosAnoFallback(impactoBase, ano, anoInicial);
            } else {
                // Garantir que cada ano tem resultado IVA sem Split
                const resultadoAno = projecaoTemporal.resultadosAnuais[ano];
                if (!resultadoAno.resultadoIVASemSplit) {
                    resultadoAno.resultadoIVASemSplit = {
                        ...JSON.parse(JSON.stringify(resultadoAno.resultadoAtual)),
                        descricao: "Sistema IVA Dual sem Split Payment"
                    };

                    if (resultadoAno.resultadoSplitPayment?.impostos) {
                        resultadoAno.resultadoIVASemSplit.impostos = { ...resultadoAno.resultadoSplitPayment.impostos };
                        resultadoAno.resultadoIVASemSplit.valorImpostoTotal = resultadoAno.resultadoSplitPayment.impostos.total || 0;

                        const fatorImposto = resultadoAno.resultadoSplitPayment.impostos.total / (resultadoAno.resultadoAtual.impostos?.total || 1);
                        resultadoAno.resultadoIVASemSplit.capitalGiroDisponivel = resultadoAno.resultadoAtual.capitalGiroDisponivel * fatorImposto;
                    }

                    // Calcular diferenças
                    resultadoAno.diferencaCapitalGiroIVASemSplit = 
                        (resultadoAno.resultadoIVASemSplit.capitalGiroDisponivel || 0) - 
                        (resultadoAno.resultadoAtual.capitalGiroDisponivel || 0);

                    resultadoAno.percentualImpactoIVASemSplit = 
                        resultadoAno.resultadoAtual.capitalGiroDisponivel !== 0 ? 
                        (resultadoAno.diferencaCapitalGiroIVASemSplit / resultadoAno.resultadoAtual.capitalGiroDisponivel) * 100 : 0;

                    resultadoAno.necessidadeAdicionalCapitalGiroIVASemSplit = 
                        Math.abs(resultadoAno.diferencaCapitalGiroIVASemSplit) * 1.2;
                }
            }
        }

        // Garantir impactoAcumulado
        if (!projecaoTemporal.impactoAcumulado) {
            projecaoTemporal.impactoAcumulado = this._calcularImpactoAcumulado(projecaoTemporal.resultadosAnuais);
        }

        return projecaoTemporal;
    },

    /**
     * Gera dados de ano como fallback
     * @private
     * @param {Object} impactoBase - Impacto base
     * @param {number} ano - Ano
     * @param {number} anoInicial - Ano inicial
     * @returns {Object} Dados do ano
     */
    _gerarDadosAnoFallback(impactoBase, ano, anoInicial) {
        const fatorTempo = Math.pow(1.05, ano - anoInicial); // 5% de crescimento padrão

        return {
            resultadoAtual: {
                ...impactoBase.resultadoAtual,
                capitalGiroDisponivel: (impactoBase.resultadoAtual.capitalGiroDisponivel || 0) * fatorTempo,
                impostos: impactoBase.resultadoAtual.impostos ? 
                    { ...impactoBase.resultadoAtual.impostos, total: (impactoBase.resultadoAtual.impostos.total || 0) * fatorTempo } : 
                    { total: 0 }
            },
            resultadoSplitPayment: {
                ...impactoBase.resultadoSplitPayment,
                capitalGiroDisponivel: (impactoBase.resultadoSplitPayment.capitalGiroDisponivel || 0) * fatorTempo,
                impostos: impactoBase.resultadoSplitPayment.impostos ? 
                    { ...impactoBase.resultadoSplitPayment.impostos, total: (impactoBase.resultadoSplitPayment.impostos.total || 0) * fatorTempo } : 
                    { total: 0 }
            },
            resultadoIVASemSplit: {
                ...impactoBase.resultadoIVASemSplit,
                capitalGiroDisponivel: (impactoBase.resultadoIVASemSplit.capitalGiroDisponivel || 0) * fatorTempo,
                impostos: impactoBase.resultadoIVASemSplit.impostos ? 
                    { ...impactoBase.resultadoIVASemSplit.impostos, total: (impactoBase.resultadoIVASemSplit.impostos.total || 0) * fatorTempo } : 
                    { total: 0 }
            },
            diferencaCapitalGiro: (impactoBase.diferencaCapitalGiro || 0) * fatorTempo,
            diferencaCapitalGiroIVASemSplit: (impactoBase.diferencaCapitalGiroIVASemSplit || 0) * fatorTempo,
            percentualImpacto: impactoBase.percentualImpacto || 0,
            percentualImpactoIVASemSplit: impactoBase.percentualImpactoIVASemSplit || 0,
            impactoDiasFaturamento: impactoBase.impactoDiasFaturamento || 0,
            necessidadeAdicionalCapitalGiro: (impactoBase.necessidadeAdicionalCapitalGiro || 0) * fatorTempo,
            necessidadeAdicionalCapitalGiroIVASemSplit: (impactoBase.necessidadeAdicionalCapitalGiroIVASemSplit || 0) * fatorTempo
        };
    },

    /**
     * Calcula o impacto acumulado
     * @private
     * @param {Object} resultadosAnuais - Resultados anuais
     * @returns {Object} Impacto acumulado
     */
    _calcularImpactoAcumulado(resultadosAnuais) {
        const anos = Object.keys(resultadosAnuais);

        const totalNecessidadeCapitalGiro = anos.reduce((acc, ano) => {
            return acc + (resultadosAnuais[ano].necessidadeAdicionalCapitalGiro || 0);
        }, 0);

        const custoFinanceiroTotal = totalNecessidadeCapitalGiro * 0.021 * 12; // Taxa padrão 2,1% a.m.

        return {
            totalNecessidadeCapitalGiro,
            custoFinanceiroTotal,
            impactoMedioMargem: anos.reduce((acc, ano) => {
                return acc + (resultadosAnuais[ano].impactoMargem || 0);
            }, 0) / anos.length
        };
    },

    /**
     * Gera estrutura de exportação
     * @private
     * @param {Object} impactoBase - Impacto base
     * @param {Object} projecaoTemporal - Projeção temporal
     * @returns {Object} Estrutura de exportação
     */
    _gerarEstruturaExportacao(impactoBase, projecaoTemporal) {
        if (!projecaoTemporal.resultadosAnuais) {
            return null;
        }

        const anos = Object.keys(projecaoTemporal.resultadosAnuais).sort();
        const resultadosPorAno = {};

        anos.forEach(ano => {
            const dadosAno = projecaoTemporal.resultadosAnuais[ano];
            resultadosPorAno[ano] = {
                capitalGiroSplitPayment: dadosAno.resultadoSplitPayment?.capitalGiroDisponivel || 0,
                capitalGiroAtual: dadosAno.resultadoAtual?.capitalGiroDisponivel || 0,
                capitalGiroIVASemSplit: dadosAno.resultadoIVASemSplit?.capitalGiroDisponivel || 0,
                diferenca: dadosAno.diferencaCapitalGiro || 0,
                diferencaIVASemSplit: dadosAno.diferencaCapitalGiroIVASemSplit || 0,
                percentualImpacto: dadosAno.percentualImpacto || 0,
                impostoDevido: dadosAno.resultadoSplitPayment?.impostos?.total || 0,
                sistemaAtual: dadosAno.resultadoAtual?.impostos?.total || 0,
                ivaSemsplit: dadosAno.resultadoIVASemSplit?.impostos?.total || 0
            };
        });

        return {
            anos: anos,
            resultadosPorAno: resultadosPorAno,
            resumo: {
                variacaoTotal: Object.values(resultadosPorAno).reduce((acc, ano) => acc + ano.diferenca, 0),
                variacaoTotalIVASemSplit: Object.values(resultadosPorAno).reduce((acc, ano) => acc + ano.diferencaIVASemSplit, 0),
                tendenciaGeral: Object.values(resultadosPorAno).reduce((acc, ano) => acc + ano.diferenca, 0) > 0 ? "aumento" : "redução"
            }
        };
    },

    /**
     * Gera projeção temporal de fallback
     * @private
     * @param {Object} impactoBase - Impacto base
     * @param {Object} dadosPlanos - Dados planos
     * @param {number} anoInicial - Ano inicial
     * @param {number} anoFinal - Ano final
     * @returns {Object} Projeção temporal de fallback
     */
    _gerarProjecaoTemporalFallback(impactoBase, dadosPlanos, anoInicial, anoFinal) {
        const resultadosAnuais = {};

        for (let ano = anoInicial; ano <= anoFinal; ano++) {
            resultadosAnuais[ano] = this._gerarDadosAnoFallback(impactoBase, ano, anoInicial);
        }

        return {
            parametros: {
                anoInicial,
                anoFinal,
                cenarioTaxaCrescimento: dadosPlanos.cenario || 'moderado',
                taxaCrescimento: dadosPlanos.taxaCrescimento || 0.05
            },
            resultadosAnuais,
            impactoAcumulado: this._calcularImpactoAcumulado(resultadosAnuais),
            comparacaoRegimes: this._gerarComparacaoRegimes(resultadosAnuais, anoInicial, anoFinal)
        };
    },

    /**
     * Gera comparação de regimes
     * @private
     * @param {Object} resultadosAnuais - Resultados anuais
     * @param {number} anoInicial - Ano inicial
     * @param {number} anoFinal - Ano final
     * @returns {Object} Comparação de regimes
     */
    _gerarComparacaoRegimes(resultadosAnuais, anoInicial, anoFinal) {
        const anos = Object.keys(resultadosAnuais).sort().map(Number);

        return {
            anos,
            atual: {
                capitalGiro: anos.map(ano => resultadosAnuais[ano].resultadoAtual.capitalGiroDisponivel || 0),
                impostos: anos.map(ano => resultadosAnuais[ano].resultadoAtual.impostos?.total || 0)
            },
            splitPayment: {
                capitalGiro: anos.map(ano => resultadosAnuais[ano].resultadoSplitPayment.capitalGiroDisponivel || 0),
                impostos: anos.map(ano => resultadosAnuais[ano].resultadoSplitPayment.impostos?.total || 0)
            },
            ivaSemSplit: {
                capitalGiro: anos.map(ano => resultadosAnuais[ano].resultadoIVASemSplit.capitalGiroDisponivel || 0),
                impostos: anos.map(ano => resultadosAnuais[ano].resultadoIVASemSplit.impostos?.total || 0)
            },
            impacto: {
                diferencaCapitalGiro: anos.map(ano => resultadosAnuais[ano].diferencaCapitalGiro || 0),
                percentualImpacto: anos.map(ano => resultadosAnuais[ano].percentualImpacto || 0),
                necessidadeAdicional: anos.map(ano => resultadosAnuais[ano].necessidadeAdicionalCapitalGiro || 0)
            }
        };
    },

    /**
     * Gera memória de cálculo de fallback
     * @private
     * @param {Object} dadosPlanos - Dados planos
     * @param {Object} impactoBase - Impacto base
     * @param {Object} projecaoTemporal - Projeção temporal
     * @returns {Object} Memória de cálculo
     */
    _gerarMemoriaCalculoFallback(dadosPlanos, impactoBase, projecaoTemporal) {
        return {
            dadosEntrada: window.DataManager.converterParaEstruturaAninhada(dadosPlanos),
            impactoBase: {
                diferencaCapitalGiro: impactoBase.diferencaCapitalGiro || 0,
                diferencaCapitalGiroIVASemSplit: impactoBase.diferencaCapitalGiroIVASemSplit || 0,
                percentualImpacto: impactoBase.percentualImpacto || 0,
                percentualImpactoIVASemSplit: impactoBase.percentualImpactoIVASemSplit || 0
            },
            projecaoTemporal: {
                parametros: projecaoTemporal.parametros,
                impactoAcumulado: projecaoTemporal.impactoAcumulado
            },
            memoriaCritica: {
                formula: "Impacto = (Capital Giro Split Payment - Capital Giro Atual) / Capital Giro Atual",
                passoAPasso: [
                    "1. Calcular capital de giro necessário no sistema atual",
                    "2. Calcular capital de giro necessário com Split Payment",
                    "3. Calcular capital de giro necessário com IVA sem Split Payment",
                    "4. Determinar diferenças entre os sistemas",
                    "5. Calcular percentuais de impacto",
                    "6. Projetar impactos ao longo do tempo"
                ],
                observacoes: [
                    "Cálculos baseados em dados fornecidos pelo usuário",
                    "Projeção considera cenário de crescimento selecionado",
                    "Valores podem variar conforme alterações na regulamentação",
                    "Memória de cálculo simplificada devido a limitações nos dados de entrada"
                ]
            }
        };
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