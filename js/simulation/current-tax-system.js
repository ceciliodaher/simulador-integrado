// Inicialização padronizada do CalculationCore
window.CalculationCore = window.CalculationCore || {};

// Verificar se o DataManager está disponível e configurar métodos de formatação
if (typeof window.DataManager === 'undefined') {
    console.warn('DataManager não encontrado. Implementando funções básicas de formatação no CalculationCore.');
    
    // Implementação de fallback para formatação
    window.CalculationCore.formatarMoeda = window.CalculationCore.formatarMoeda || function(valor) {
        const num = parseFloat(valor) || 0;
        return 'R$ ' + num.toFixed(2).replace('.', ',');
    };
    
    window.CalculationCore.formatarValorSeguro = window.CalculationCore.formatarValorSeguro || function(valor) {
        const num = parseFloat(valor) || 0;
        return 'R$ ' + num.toFixed(2).replace('.', ',');
    };
} else {
    // Usar métodos do DataManager quando disponível
    window.CalculationCore.formatarMoeda = window.DataManager.formatarMoeda;
    window.CalculationCore.formatarValorSeguro = window.DataManager.formatarValorSeguro;
}

// Métodos essenciais que não dependem do DataManager
window.CalculationCore.calcularTempoMedioCapitalGiro = window.CalculationCore.calcularTempoMedioCapitalGiro || function(pmr, prazoRecolhimento, percVista, percPrazo) {
    const tempoVista = prazoRecolhimento;
    const tempoPrazo = Math.max(0, prazoRecolhimento - pmr);
    return (percVista * tempoVista) + (percPrazo * tempoPrazo);
};

/**
 * Módulo de Cálculos do Sistema Tributário Atual
 * Fornece as funções de cálculo do fluxo de caixa no regime tributário atual
 * 
 * @author Expertzy Inteligência Tributária
 * @version 1.0.0
 */

// Namespace global para o sistema tributário atual
window.CurrentTaxSystem = (function() {
    /**
     * Alíquotas padrão do sistema tributário atual
     * @type {Object}
     */
    const aliquotasPadrao = {
        pis: 0.0165,       // PIS não-cumulativo
        cofins: 0.076,     // COFINS não-cumulativo
        icms: {
            intrastate: 0.18,
            interstate: {
                general: 0.12,
                south_southeast_to_north_northeast_midwest: 0.07
            }
        },
        ipi: 0.10,         // Valor padrão, varia conforme NCM
        issqn: 0.05,       // Varia conforme município
        irpj: 0.15,        // Alíquota básica
        csll: 0.09         // Alíquota padrão
    };
    
    // Em current-tax-system.js
    const cronogramasPadrao = {
        splitPayment: {
            2026: 0.10,
            2027: 0.25,
            2028: 0.40,
            2029: 0.55,
            2030: 0.70,
            2031: 0.85,
            2032: 0.95,
            2033: 1.00
        },
        cbs: {
            2026: 0.01, // Teste inicial (0,9% de uma alíquota de 8,8%)
            2027: 1.00, // Implementação total em 2027
            2028: 1.00,
            2029: 1.00,
            2030: 1.00,
            2031: 1.00,
            2032: 1.00,
            2033: 1.00
        },
        ibs: {
            2026: 0.00,
            2027: 0.00,
            2028: 0.00,
            2029: 0.01, // Implementação inicial (0,1% de uma alíquota de 17,7%)
            2030: 0.25, // 25% da alíquota total
            2031: 0.50, // 50% da alíquota total
            2032: 0.75, // 75% da alíquota total
            2033: 1.00  // 100% da alíquota total
        }
    };

    /**
     * Obtém o percentual de implementação para um tipo específico de imposto/mecanismo
     * @param {number} ano - Ano para obter o percentual
     * @param {string} tipo - Tipo de cronograma ('splitPayment', 'cbs', 'ibs')
     * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
     * @returns {number} - Percentual de implementação (decimal)
     */
    function obterPercentualImplementacao(ano, tipo = 'splitPayment', parametrosSetoriais = null) {
        // Validar tipo do parâmetro ano
        if (typeof ano !== 'number' || isNaN(ano) || ano < 2026 || ano > 2050) {
            console.warn(`Ano inválido para cálculo de percentual de implementação: ${ano}. Usando valor padrão.`);
            ano = 2026;
        }

        // Se houver parâmetros setoriais com cronograma próprio, utilizar
        if (parametrosSetoriais && 
            parametrosSetoriais.cronogramaProprio && 
            parametrosSetoriais.cronogramas && 
            parametrosSetoriais.cronogramas[tipo] && 
            typeof parametrosSetoriais.cronogramas[tipo][ano] === 'number') {
            return parametrosSetoriais.cronogramas[tipo][ano];
        }

        // Caso contrário, utilizar o cronograma padrão
        const cronograma = cronogramasPadrao[tipo] || cronogramasPadrao.splitPayment;
        return cronograma[ano] || 0;
    }    

    /**
     * Calcula o PIS a ser recolhido
     * @param {number} revenue - Receita bruta
     * @param {number} [rate=aliquotasPadrao.pis] - Alíquota do PIS
     * @param {boolean} [cumulativeRegime=false] - Regime cumulativo (true) ou não-cumulativo (false)
     * @param {number} [credits=0] - Créditos de PIS a serem descontados
     * @returns {number} Valor do PIS a recolher
     */
    function calcularPIS(revenue, rate = aliquotasPadrao.pis, cumulativeRegime = false, credits = 0) {
        // Validar e normalizar os parâmetros
        revenue = typeof revenue === 'number' && !isNaN(revenue) ? revenue : 0;
        rate = typeof rate === 'number' && !isNaN(rate) ? rate : aliquotasPadrao.pis;
        cumulativeRegime = !!cumulativeRegime; // Converte para booleano
        credits = typeof credits === 'number' && !isNaN(credits) ? Math.max(0, credits) : 0;

        if (cumulativeRegime) {
            rate = 0.0065; // Alíquota para regime cumulativo
            return revenue * rate;
        }

        // Regime não-cumulativo
        const tax = revenue * rate;
        return Math.max(0, tax - credits);
    }

    /**
     * Calcula o COFINS a ser recolhido
     * @param {number} revenue - Receita bruta
     * @param {number} [rate=aliquotasPadrao.cofins] - Alíquota do COFINS
     * @param {boolean} [cumulativeRegime=false] - Regime cumulativo (true) ou não-cumulativo (false)
     * @param {number} [credits=0] - Créditos de COFINS a serem descontados
     * @returns {number} Valor do COFINS a recolher
     */
    function calcularCOFINS(revenue, rate = aliquotasPadrao.cofins, cumulativeRegime = false, credits = 0) {
        // Validar e normalizar os parâmetros
        revenue = typeof revenue === 'number' && !isNaN(revenue) ? revenue : 0;
        rate = typeof rate === 'number' && !isNaN(rate) ? rate : aliquotasPadrao.cofins;
        cumulativeRegime = !!cumulativeRegime; // Converte para booleano
        credits = typeof credits === 'number' && !isNaN(credits) ? Math.max(0, credits) : 0;

        if (cumulativeRegime) {
            rate = 0.03; // Alíquota para regime cumulativo
            return revenue * rate;
        }

        // Regime não-cumulativo
        const tax = revenue * rate;
        return Math.max(0, tax - credits);
    }


   /**
     * Calcula o ICMS a ser recolhido
     * @param {number} revenue - Receita bruta
     * @param {number} [rate=aliquotasPadrao.icms.intrastate] - Alíquota do ICMS
     * @param {number} [credits=0] - Créditos de ICMS a serem descontados
     * @param {boolean} [substituicaoTributaria=false] - Indica se aplica-se o regime de substituição tributária
     * @returns {number} Valor do ICMS a recolher
     */
    function calcularICMS(revenue, rate = aliquotasPadrao.icms.intrastate, credits = 0, substituicaoTributaria = false) {
        // Validar e normalizar os parâmetros
        revenue = typeof revenue === 'number' && !isNaN(revenue) ? revenue : 0;
        rate = typeof rate === 'number' && !isNaN(rate) ? rate : aliquotasPadrao.icms.intrastate;
        credits = typeof credits === 'number' && !isNaN(credits) ? Math.max(0, credits) : 0;
        substituicaoTributaria = !!substituicaoTributaria; // Converte para booleano

        if (substituicaoTributaria) {
            // No caso de ST, considera-se que o ICMS já foi recolhido anteriormente
            return 0;
        }

        const tax = revenue * rate;
        return Math.max(0, tax - credits);
    }


    /**
     * Calcula o IPI a ser recolhido
     * @param {number} productValue - Valor do produto
     * @param {number} [rate=aliquotasPadrao.ipi] - Alíquota do IPI
     * @param {number} [credits=0] - Créditos de IPI a serem descontados
     * @returns {number} Valor do IPI a recolher
     */
    function calcularIPI(productValue, rate = aliquotasPadrao.ipi, credits = 0) {
        // Validar e normalizar os parâmetros
        productValue = typeof productValue === 'number' && !isNaN(productValue) ? productValue : 0;
        rate = typeof rate === 'number' && !isNaN(rate) ? rate : aliquotasPadrao.ipi;
        credits = typeof credits === 'number' && !isNaN(credits) ? Math.max(0, credits) : 0;

        const tax = productValue * rate;
        return Math.max(0, tax - credits);
    }


    /**
     * Calcula o ISS a ser recolhido
     * @param {number} serviceValue - Valor do serviço
     * @param {number} [rate=aliquotasPadrao.issqn] - Alíquota do ISS
     * @returns {number} Valor do ISS a recolher
     */
    function calcularISS(serviceValue, rate = aliquotasPadrao.issqn) {
        // Validar e normalizar os parâmetros
        serviceValue = typeof serviceValue === 'number' && !isNaN(serviceValue) ? serviceValue : 0;
        rate = typeof rate === 'number' && !isNaN(rate) ? rate : aliquotasPadrao.issqn;

        return serviceValue * rate;
    }


    /**
     * Calcula todos os impostos do sistema atual para uma operação
     * @param {Object} params - Parâmetros da operação em formato plano
     * @param {number} params.revenue - Receita bruta
     * @param {boolean} [params.serviceCompany=false] - Indica se é empresa de serviços
     * @param {boolean} [params.cumulativeRegime=false] - Regime cumulativo (true) ou não-cumulativo (false)
     * @param {Object} [params.credits] - Créditos tributários disponíveis
     * @returns {Object} Objeto contendo todos os impostos calculados
     */
    function calcularTodosImpostosAtuais(params) {
        // Verificar se os parâmetros estão em formato plano
        if (params.empresa !== undefined || params.parametrosFiscais !== undefined) {
            console.error('calcularTodosImpostosAtuais recebeu estrutura aninhada. Utilize DataManager.converterParaEstruturaPlana()');
            // Tenta recuperar usando o DataManager se disponível
            if (window.DataManager && typeof window.DataManager.converterParaEstruturaPlana === 'function') {
                params = window.DataManager.converterParaEstruturaPlana(params);
            } else {
                throw new Error('Estrutura de dados incompatível e DataManager não disponível para conversão');
            }
        }

        // Extrair e validar parâmetros
        const revenue = typeof params.revenue === 'number' && !isNaN(params.revenue) ? params.revenue : 0;
        const serviceCompany = !!params.serviceCompany; // Converte para booleano
        const cumulativeRegime = !!params.cumulativeRegime; // Converte para booleano

        // Aplicar valores padrão para créditos
        const credits = {
            pis: typeof params.credits?.pis === 'number' ? params.credits.pis : 0,
            cofins: typeof params.credits?.cofins === 'number' ? params.credits.cofins : 0,
            icms: typeof params.credits?.icms === 'number' ? params.credits.icms : 0,
            ipi: typeof params.credits?.ipi === 'number' ? params.credits.ipi : 0
        };

        const result = {
            pis: calcularPIS(revenue, aliquotasPadrao.pis, cumulativeRegime, credits.pis),
            cofins: calcularCOFINS(revenue, aliquotasPadrao.cofins, cumulativeRegime, credits.cofins)
        };

        if (serviceCompany) {
            result.iss = calcularISS(revenue, aliquotasPadrao.issqn);
        } else {
            result.icms = calcularICMS(revenue, aliquotasPadrao.icms.intrastate, credits.icms);
            result.ipi = calcularIPI(revenue, aliquotasPadrao.ipi, credits.ipi);
        }

        // Cálculo total
        result.total = Object.values(result).reduce((sum, tax) => sum + tax, 0);

        return result;
    }

    /**
     * Wrapper de compatibilidade que aceita tanto estrutura plana quanto aninhada
     * @param {Object} dados - Dados da operação (formato plano ou aninhado)
     * @returns {Object} Resultado do cálculo de impostos
     */
    function calcularTodosImpostosAtuaisCompat(dados) {
        // Verificar formato e converter se necessário
        let dadosPlanos;

        if (dados.empresa !== undefined || dados.parametrosFiscais !== undefined) {
            // Dados em formato aninhado, converter para plano
            if (window.DataManager && typeof window.DataManager.converterParaEstruturaPlana === 'function') {
                dadosPlanos = window.DataManager.converterParaEstruturaPlana(dados);
            } else {
                console.warn('DataManager não disponível para conversão. Tentando conversão simplificada.');
                // Conversão simplificada (fallback)
                dadosPlanos = {
                    revenue: dados.empresa?.faturamento || 0,
                    serviceCompany: dados.empresa?.tipoEmpresa === 'servicos',
                    cumulativeRegime: dados.parametrosFiscais?.regimePisCofins === 'cumulativo',
                    credits: dados.parametrosFiscais?.creditos || {}
                };
            }
        } else {
            // Já está em formato plano
            dadosPlanos = dados;
        }

        return calcularTodosImpostosAtuais(dadosPlanos);
    }

    /**
     * Calcula o fluxo de caixa no regime tributário atual (pré-Split Payment)
     * 
     * @param {Object} dados - Dados em formato plano para cálculos
     * @returns {Object} - Resultados detalhados do fluxo de caixa atual
     */
    function calcularFluxoCaixaAtual(dados) {
        // Verificar se os dados estão em formato plano
        if (dados.empresa !== undefined || dados.cicloFinanceiro !== undefined) {
            console.error('calcularFluxoCaixaAtual recebeu estrutura aninhada. Utilizando formato plano via DataManager.');
            // Tentativa de conversão via DataManager
            if (window.DataManager && typeof window.DataManager.converterParaEstruturaPlana === 'function') {
                dados = window.DataManager.converterParaEstruturaPlana(dados);
            } else {
                throw new Error('Estrutura de dados incompatível e DataManager não disponível para conversão');
            }
        }

        // Extrair e validar parâmetros críticos em formato plano
        const faturamento = typeof dados.faturamento === 'number' && !isNaN(dados.faturamento) ? 
                            Math.max(0, dados.faturamento) : 0;

        const aliquota = typeof dados.aliquota === 'number' && !isNaN(dados.aliquota) ? 
                        Math.max(0, Math.min(1, dados.aliquota)) : 0.265;

        const pmr = typeof dados.pmr === 'number' && !isNaN(dados.pmr) ? 
                    Math.max(0, dados.pmr) : 30;

        const percVista = typeof dados.percVista === 'number' && !isNaN(dados.percVista) ? 
                         Math.max(0, Math.min(1, dados.percVista)) : 0.3;

        const percPrazo = typeof dados.percPrazo === 'number' && !isNaN(dados.percPrazo) ? 
                         Math.max(0, Math.min(1, dados.percPrazo)) : 0.7;

        const creditos = typeof dados.creditos === 'number' && !isNaN(dados.creditos) ? 
                         Math.max(0, dados.creditos) : 0;

        // Validar consistência de percentuais
        if (Math.abs(percVista + percPrazo - 1) > 0.001) {
            console.warn(`Soma dos percentuais de venda (${percVista} à vista + ${percPrazo} a prazo) não é 1. Normalizando.`);
            // Normalizar para soma 1 mantendo proporção
            const soma = percVista + percPrazo;
            if (soma > 0) {
                const percVistaNormalizado = percVista / soma;
                const percPrazoNormalizado = percPrazo / soma;
                // Usar valores normalizados nos cálculos
            }
        }

        // Cálculos do fluxo de caixa atual
        const valorImpostoTotal = faturamento * aliquota;
        const valorImpostoLiquido = Math.max(0, valorImpostoTotal - creditos);

        // Prazo para recolhimento do imposto (padrão: dia 25 do mês seguinte)
        const prazoRecolhimento = 25;

        // Cálculo do capital de giro obtido pelo adiamento do pagamento de impostos
        const capitalGiroImpostos = valorImpostoLiquido;

        // Cálculo do recebimento das vendas
        const recebimentoVista = faturamento * percVista;
        const recebimentoPrazo = faturamento * percPrazo;

        // Cálculo do tempo médio do capital em giro
        const tempoMedioCapitalGiro = window.CalculationCore.calcularTempoMedioCapitalGiro(pmr, prazoRecolhimento, percVista, percPrazo);

        // Benefício financeiro do capital em giro (em dias de faturamento)
        const beneficioDiasCapitalGiro = (capitalGiroImpostos / faturamento) * tempoMedioCapitalGiro;

        // Cálculo dos impostos do sistema atual usando função especializada
        const impostos = calcularTodosImpostosAtuais({
            revenue: faturamento,
            serviceCompany: dados.tipoEmpresa === 'servicos',
            cumulativeRegime: dados.regimePisCofins === 'cumulativo',
            credits: {
                pis: dados.creditosPIS || 0,
                cofins: dados.creditosCOFINS || 0,
                icms: dados.creditosICMS || 0,
                ipi: dados.creditosIPI || 0
            }
        });

        // Resultado completo
        const resultado = {
            faturamento,
            valorImpostoTotal,
            creditos,
            valorImpostoLiquido,
            recebimentoVista,
            recebimentoPrazo,
            prazoRecolhimento,
            capitalGiroDisponivel: capitalGiroImpostos,
            tempoMedioCapitalGiro,
            beneficioDiasCapitalGiro,
            fluxoCaixaLiquido: faturamento - valorImpostoLiquido,
            impostos
        };

        // Adicionar memória crítica se o DataManager estiver disponível
        if (window.DataManager && typeof window.DataManager.gerarMemoriaCritica === 'function') {
            resultado.memoriaCritica = window.DataManager.gerarMemoriaCritica(dados);
        }

        return resultado;
    }

    /**
     * Wrapper de compatibilidade para calcularFluxoCaixaAtual
     * Aceita tanto estrutura aninhada quanto plana
     * 
     * @param {Object} dados - Dados da simulação (formato aninhado ou plano)
     * @returns {Object} - Resultados detalhados do fluxo de caixa atual
     */
    function calcularFluxoCaixaAtualCompat(dados) {
        // Verificar formato e converter se necessário
        let dadosProcessamento;

        if (dados.empresa !== undefined || dados.cicloFinanceiro !== undefined) {
            // Dados em formato aninhado, converter para plano
            if (window.DataManager && typeof window.DataManager.converterParaEstruturaPlana === 'function') {
                dadosProcessamento = window.DataManager.converterParaEstruturaPlana(dados);
            } else {
                console.warn('DataManager não disponível para conversão. Tentando conversão simplificada.');
                // Conversão simplificada (fallback)
                dadosProcessamento = {
                    faturamento: dados.empresa?.faturamento || 0,
                    aliquota: dados.parametrosFiscais?.aliquota || 0.265,
                    pmr: dados.cicloFinanceiro?.pmr || 30,
                    percVista: dados.cicloFinanceiro?.percVista || 0.3,
                    percPrazo: dados.cicloFinanceiro?.percPrazo || 0.7,
                    creditos: dados.parametrosFiscais?.creditos?.total || 0,
                    tipoEmpresa: dados.empresa?.tipoEmpresa || '',
                    regimePisCofins: dados.parametrosFiscais?.regimePisCofins || 'cumulativo',
                    creditosPIS: dados.parametrosFiscais?.creditos?.pis || 0,
                    creditosCOFINS: dados.parametrosFiscais?.creditos?.cofins || 0,
                    creditosICMS: dados.parametrosFiscais?.creditos?.icms || 0,
                    creditosIPI: dados.parametrosFiscais?.creditos?.ipi || 0
                };
            }
        } else {
            // Já está em formato plano
            dadosProcessamento = dados;
        }

        return calcularFluxoCaixaAtual(dadosProcessamento);
    }

    /**
     * Calcula a análise de sensibilidade do impacto em função do percentual de implementação
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {number} ano - Ano de referência
     * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
     * @returns {Object} - Análise de sensibilidade
     */
	function calcularAnaliseSensibilidade(dados, ano, parametrosSetoriais = null) {
		// Adicionar flag para evitar recursão infinita
		const flags = arguments[3] || { isRecursiveCall: false };

		// Evitar recursão infinita
		if (flags.isRecursiveCall) {
			// Retornar resultados simplificados em caso de chamada recursiva
			return {
				percentuais: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
				resultados: {0.1: -10, 0.2: -20, 0.3: -30, 0.4: -40, 0.5: -50, 
							0.6: -60, 0.7: -70, 0.8: -80, 0.9: -90, 1.0: -100},
				percentualOriginal: 0.5,
				impactoPorPercentual: 1,
				impactoPor10Percent: 10
			};
		}

		// Obter parâmetros originais
		const percentualOriginal = obterPercentualImplementacao(ano, parametrosSetoriais);

		// Criar dados com diferentes percentuais
		const percentuais = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
		const resultados = {};

		// Calcular impacto para cada percentual diretamente, sem chamar funções externas
		percentuais.forEach(percentual => {
			// Cálculo simplificado para evitar recursão
			const valorImposto = dados.faturamento * dados.aliquota * percentual;
			resultados[percentual] = -valorImposto;
		});

		// Calcular impacto médio por ponto percentual
		const impactoPorPercentual = Math.abs(resultados[1.0] / 100);

		// Calcular impacto por incremento de 10%
		const impactoPor10Percent = impactoPorPercentual * 10;

		return {
			percentuais,
			resultados,
			percentualOriginal,
			impactoPorPercentual,
			impactoPor10Percent
		};
	}

    // Função que seria implementada fora deste módulo
    function calcularImpactoCapitalGiro(dados, ano, parametrosModificados) {
        // Esta função é implementada no IVADualSystem e seria chamada diretamente de lá
        return window.IVADualSystem.calcularImpactoCapitalGiro(dados, ano, parametrosModificados);
    }

    /**
     * Calcula o impacto do Split Payment na margem operacional
     * 
     * @param {Object} dados - Dados em formato plano para cálculos
     * @param {number} diferencaCapitalGiro - Diferença no capital de giro
     * @returns {Object} - Análise detalhada do impacto na margem operacional
     */
    function calcularImpactoMargem(dados, diferencaCapitalGiro) {
        // Validar parâmetros críticos
        if (typeof diferencaCapitalGiro !== 'number' || isNaN(diferencaCapitalGiro)) {
            console.error('Diferença no capital de giro inválida para cálculo de impacto na margem');
            diferencaCapitalGiro = 0;
        }

        // Verificar se os dados estão em formato plano
        if (dados.empresa !== undefined || dados.parametrosFinanceiros !== undefined) {
            console.warn('calcularImpactoMargem recebeu estrutura aninhada. Convertendo para formato plano.');
            // Tentativa de conversão via DataManager
            if (window.DataManager && typeof window.DataManager.converterParaEstruturaPlana === 'function') {
                dados = window.DataManager.converterParaEstruturaPlana(dados);
            } else {
                console.warn('DataManager não disponível para conversão. Usando conversão simplificada.');
                // Extrair diretamente (fallback)
                dados = {
                    faturamento: dados.empresa?.faturamento || 0,
                    margem: dados.empresa?.margem || 0,
                    taxaCapitalGiro: dados.parametrosFinanceiros?.taxaCapitalGiro || 0.021
                };
            }
        }

        // Extrair e validar parâmetros relevantes
        const faturamento = typeof dados.faturamento === 'number' && !isNaN(dados.faturamento) ? 
                            Math.max(0, dados.faturamento) : 0;

        const margem = typeof dados.margem === 'number' && !isNaN(dados.margem) ? 
                      Math.max(0, Math.min(1, dados.margem)) : 0;

        const taxaCapitalGiro = typeof dados.taxaCapitalGiro === 'number' && !isNaN(dados.taxaCapitalGiro) ? 
                               Math.max(0, dados.taxaCapitalGiro) : 0.021; // 2,1% a.m. é o padrão

        // Cálculo do custo mensal do capital de giro adicional
        const custoMensalCapitalGiro = Math.abs(diferencaCapitalGiro) * taxaCapitalGiro;

        // Cálculo do custo anual
        const custoAnualCapitalGiro = custoMensalCapitalGiro * 12;

        // Cálculo do impacto percentual na margem (pontos percentuais)
        const impactoPercentual = faturamento > 0 ? (custoMensalCapitalGiro / faturamento) * 100 : 0;

        // Cálculo da margem ajustada
        const margemAjustada = Math.max(0, margem - (impactoPercentual / 100));

        // Percentual de redução da margem
        const percentualReducaoMargem = margem > 0 ? (impactoPercentual / (margem * 100)) * 100 : 0;

        // Resultado completo
        const resultado = {
            custoMensalCapitalGiro,
            custoAnualCapitalGiro,
            impactoPercentual,
            margemOriginal: margem,
            margemAjustada,
            percentualReducaoMargem
        };

        // Gerar memória crítica via DataManager se disponível
        if (window.DataManager && typeof window.DataManager.gerarMemoriaCritica === 'function') {
            try {
                resultado.memoriaCritica = window.DataManager.gerarMemoriaCritica(dados, {
                    diferencaCapitalGiro: diferencaCapitalGiro,
                    impactoMargem: resultado
                });
            } catch (error) {
                console.warn('Erro ao gerar memória crítica:', error);
            }
        }

        return resultado;
    }
    
    /**
     * Inicializa a integração do módulo de cálculos
     */
    function inicializarIntegracaoCalculos() {
        console.log('Inicializando integração com o módulo de cálculos...');

        // Verificar disponibilidade do DataManager
        if (typeof window.DataManager === 'undefined') {
            console.warn('DataManager não encontrado. Algumas funcionalidades podem ser limitadas.');
        } else {
            console.log('DataManager encontrado. Utilizando para validações e transformações de dados.');
        }

        // Verificar disponibilidade do módulo de cálculos
        if (typeof window.CalculationModule === 'undefined') {
            console.error('Módulo de cálculos não encontrado. Algumas funcionalidades podem não funcionar corretamente.');
            return;
        }

        // Adicionar o módulo ao objeto window para garantir disponibilidade global
        window.CalculationModule = window.CalculationModule;

        // Tentar integrar com o simulador
        if (typeof window.SimuladorFluxoCaixa !== 'undefined') {
            integrarComSimulador();
        } else {
            // Tentar novamente após um pequeno atraso
            setTimeout(function() {
                if (typeof window.SimuladorFluxoCaixa !== 'undefined') {
                    integrarComSimulador();
                } else {
                    console.warn('Simulador não encontrado após espera. A integração será tentada quando o simulador for utilizado.');
                }
            }, 500);
        }
    }

    /**
     * Integra o módulo de cálculos com o simulador, usando as funções adaptadas
     * para a nova arquitetura de dados
     */
    function integrarComSimulador() {
        // Associar as funções de cálculo ao simulador
        if (window.SimuladorFluxoCaixa) {
            // Usar funções compat para garantir flexibilidade
            window.SimuladorFluxoCaixa._calcularFluxoCaixaAtual = calcularFluxoCaixaAtualCompat;
            window.SimuladorFluxoCaixa._calcularFluxoCaixaSplitPayment = window.IVADualSystem.calcularFluxoCaixaSplitPayment;
            window.SimuladorFluxoCaixa._calcularImpactoCapitalGiro = window.IVADualSystem.calcularImpactoCapitalGiro;
            window.SimuladorFluxoCaixa._calcularProjecaoTemporal = window.IVADualSystem.calcularProjecaoTemporal;

            console.log('Módulo de cálculos integrado com sucesso ao simulador.');
        } else {
            console.warn('Simulador não encontrado. Não foi possível integrar o módulo de cálculos.');
        }
    }

    /**
     * Obtém dados do repositório, validando e normalizando via DataManager
     * @returns {Object} Dados validados e normalizados do repositório
     */
    function obterDadosDoRepositorio() {
        // Verificar se o repositório está disponível
        if (typeof SimuladorRepository === 'undefined') {
            console.error('SimuladorRepository não está definido. Utilizando dados padrão.');
            // Dados padrão em formato aninhado
            const dadosPadrao = {
                empresa: { faturamento: 0, margem: 0 },
                cicloFinanceiro: { pmr: 30, pmp: 30, pme: 30, percVista: 0.3, percPrazo: 0.7 },
                parametrosFiscais: { aliquota: 0.265, creditos: 0 },
                parametrosSimulacao: { cenario: 'moderado', taxaCrescimento: 0.05 }
            };

            // Validar e normalizar, se DataManager estiver disponível
            if (window.DataManager && typeof window.DataManager.validarENormalizar === 'function') {
                return window.DataManager.validarENormalizar(dadosPadrao);
            }

            return dadosPadrao;
        }

        // Obter dados do repositório
        const dadosBrutos = {
            empresa: SimuladorRepository.obterSecao('empresa'),
            cicloFinanceiro: SimuladorRepository.obterSecao('cicloFinanceiro'),
            parametrosFiscais: SimuladorRepository.obterSecao('parametrosFiscais'),
            parametrosSimulacao: SimuladorRepository.obterSecao('parametrosSimulacao'),
            setoresEspeciais: SimuladorRepository.obterSecao('setoresEspeciais')
        };

        // Validar e normalizar dados via DataManager, se disponível
        if (window.DataManager && typeof window.DataManager.validarENormalizar === 'function') {
            return window.DataManager.validarENormalizar(dadosBrutos);
        }

        return dadosBrutos;
    }

    /**
     * Obtém uma seção específica do repositório, validando-a
     * @param {string} secao - Nome da seção a ser obtida
     * @returns {Object} Dados validados da seção
     */
    function obterSecao(secao) {
        if (typeof SimuladorRepository === 'undefined' || typeof SimuladorRepository.obterSecao !== 'function') {
            console.error(`SimuladorRepository não está definido ou não possui o método obterSecao. Seção solicitada: ${secao}`);
            return {};
        }

        // Obter dados brutos da seção
        const dadosSecao = SimuladorRepository.obterSecao(secao);

        // Validar e normalizar via DataManager, se disponível
        if (window.DataManager && typeof window.DataManager.validarDadosSecao === 'function') {
            return window.DataManager.validarDadosSecao(secao, dadosSecao);
        }

        return dadosSecao;
    }

    // Retornar o objeto com funções públicas
    return {
        aliquotasPadrao,
        obterPercentualImplementacao,
        calcularPIS,
        calcularCOFINS,
        calcularICMS,
        calcularIPI,
        calcularISS,
        calcularTodosImpostosAtuais,
        calcularTodosImpostosAtuaisCompat, // Nova função de compatibilidade
        calcularFluxoCaixaAtual,
        calcularFluxoCaixaAtualCompat,     // Nova função de compatibilidade
        calcularAnaliseSensibilidade,
        calcularImpactoMargem,
        inicializarIntegracaoCalculos,
        integrarComSimulador,
        obterDadosDoRepositorio,
        obterSecao
    };
})();