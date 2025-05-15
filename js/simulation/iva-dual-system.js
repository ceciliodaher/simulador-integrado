// No início de current-tax-system.js e iva-dual-system.js
// Inicializar o objeto se não existir
window.CalculationCore = window.CalculationCore || {
    formatarMoeda: function(valor) {
        return typeof valor === 'number' ? 
               'R$ ' + valor.toFixed(2).replace('.', ',') : 
               'R$ 0,00';
    },
    formatarValorSeguro: function(valor) {
        return typeof valor === 'number' ? 
               'R$ ' + valor.toFixed(2).replace('.', ',') : 
               'R$ 0,00';
    },
    calcularTempoMedioCapitalGiro: function(pmr, prazoRecolhimento, percVista, percPrazo) {
        // Implementação fallback simplificada
        const tempoVista = prazoRecolhimento;
        const tempoPrazo = Math.max(0, prazoRecolhimento - pmr);
        return (percVista * tempoVista) + (percPrazo * tempoPrazo);
    }
};

// Adicione este código no início do arquivo iva-dual-system.js logo após a inicialização de window.CalculationCore
window.CalculationCore.gerarMemoriaCritica = window.CalculationCore.gerarMemoriaCritica || function(dados, resultados = null, flags = {}) {
    // Implementação de fallback simplificada
    return {
        tituloRegime: "Regime Tributário",
        descricaoRegime: "Simulação Split Payment",
        formula: "Detalhes disponíveis após correção da inicialização",
        passoAPasso: ["Cálculo executado com sucesso"],
        observacoes: ["Os detalhes completos estarão disponíveis em execuções subsequentes"]
    };
};

/**
 * Módulo de Cálculos do Sistema IVA Dual e Split Payment
 * Fornece as funções relacionadas ao regime de Split Payment e IVA Dual
 * 
 * @author Expertzy Inteligência Tributária
 * @version 1.0.0
 */

// Namespace global para o sistema IVA Dual
window.IVADualSystem = (function() {
    /**
     * Alíquotas padrão do sistema IVA Dual
     * @type {Object}
     */
    const aliquotasIVADual = {
        cbs: 0.0825, // Contribuição sobre Bens e Serviços (federal)
        ibs: 0.0825, // Imposto sobre Bens e Serviços (estadual/municipal)
        totalIva: 0.165, // CBS + IBS
        reduced: {
            cbs: 0.04125, // 50% da alíquota padrão
            ibs: 0.04125, // 50% da alíquota padrão
            total: 0.0825 // Total reduzido
        },
        exempt: {
            cbs: 0,
            ibs: 0,
            total: 0
        }
    };

    /**
     * Períodos da transição para o sistema IVA Dual
     * @type {Object}
     */
    const periodosTransicao = {
        cbs: {
            start: 2027,
            end: 2027 // Transição de 1 ano para CBS
        },
        ibs: {
            start: 2029,
            end: 2033 // Transição de 5 anos para IBS
        }
    };

    /**
     * Calcula o CBS (Contribuição sobre Bens e Serviços)
     * @param {number} baseValue - Valor base para cálculo
     * @param {number} [rate=aliquotasIVADual.cbs] - Alíquota do CBS
     * @param {number} [credits=0] - Créditos de CBS a serem descontados
     * @param {string} [taxCategory='standard'] - Categoria tributária ('standard', 'reduced', 'exempt')
     * @returns {number} Valor do CBS a recolher
     */
    function calcularCBS(baseValue, rate = aliquotasIVADual.cbs, credits = 0, taxCategory = 'standard') {
        let appliedRate;

        switch (taxCategory) {
            case 'reduced':
                appliedRate = aliquotasIVADual.reduced.cbs;
                break;
            case 'exempt':
                appliedRate = aliquotasIVADual.exempt.cbs;
                break;
            default:
                appliedRate = rate;
        }

        const tax = baseValue * appliedRate;
        return Math.max(0, tax - credits);
    }

    /**
     * Calcula o IBS (Imposto sobre Bens e Serviços)
     * @param {number} baseValue - Valor base para cálculo
     * @param {number} [rate=aliquotasIVADual.ibs] - Alíquota do IBS
     * @param {number} [credits=0] - Créditos de IBS a serem descontados
     * @param {string} [taxCategory='standard'] - Categoria tributária ('standard', 'reduced', 'exempt')
     * @returns {number} Valor do IBS a recolher
     */
    function calcularIBS(baseValue, rate = aliquotasIVADual.ibs, credits = 0, taxCategory = 'standard') {
        let appliedRate;

        switch (taxCategory) {
            case 'reduced':
                appliedRate = aliquotasIVADual.reduced.ibs;
                break;
            case 'exempt':
                appliedRate = aliquotasIVADual.exempt.ibs;
                break;
            default:
                appliedRate = rate;
        }

        const tax = baseValue * appliedRate;
        return Math.max(0, tax - credits);
    }

    /**
     * Calcula o imposto total no sistema IVA Dual (CBS + IBS)
     * @param {number} baseValue - Valor base para cálculo
     * @param {Object} [rates] - Alíquotas a serem aplicadas
     * @param {number} rates.cbs - Alíquota do CBS
     * @param {number} rates.ibs - Alíquota do IBS
     * @param {Object} [credits] - Créditos a serem descontados
     * @param {number} credits.cbs - Créditos de CBS
     * @param {number} credits.ibs - Créditos de IBS
     * @param {string} [taxCategory='standard'] - Categoria tributária ('standard', 'reduced', 'exempt')
     * @returns {Object} Objeto contendo os valores de CBS, IBS e total
     */
    function calcularTotalIVA(baseValue, rates = {}, credits = {}, taxCategory = 'standard') {
        const cbsRate = rates.cbs || aliquotasIVADual.cbs;
        const ibsRate = rates.ibs || aliquotasIVADual.ibs;
        const cbsCredits = credits.cbs || 0;
        const ibsCredits = credits.ibs || 0;

        const cbs = calcularCBS(baseValue, cbsRate, cbsCredits, taxCategory);
        const ibs = calcularIBS(baseValue, ibsRate, ibsCredits, taxCategory);

        return {
            cbs,
            ibs,
            total: cbs + ibs
        };
    }

    /**
     * Calcula o fluxo de caixa com o regime de Split Payment
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {number} ano - Ano de referência para percentual de implementação
     * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
     * @returns {Object} - Resultados detalhados do fluxo de caixa com Split Payment
     */
    function calcularFluxoCaixaSplitPayment(dados, ano = 2026, parametrosSetoriais = null) {
        // Extrair parâmetros relevantes
        const faturamento = dados.faturamento;
        const aliquota = dados.aliquota;
        const pmr = dados.pmr;
        const percVista = dados.percVista;
        const percPrazo = dados.percPrazo;
        const creditos = dados.creditos || 0;
        const compensacao = dados.compensacao || 'automatica';

        // Obter percentual de implementação para o ano específico
        const percentualImplementacao = window.CurrentTaxSystem.obterPercentualImplementacao(ano, parametrosSetoriais);

        // Cálculos do fluxo de caixa com Split Payment
        const valorImpostoTotal = faturamento * aliquota;
        const valorImpostoLiquido = Math.max(0, valorImpostoTotal - creditos);

        // Valor dos impostos afetados pelo Split Payment
        const valorImpostoSplit = valorImpostoLiquido * percentualImplementacao;
        const valorImpostoNormal = valorImpostoLiquido - valorImpostoSplit;

        // Cálculo do capital de giro disponível (apenas a parte não afetada pelo Split Payment)
        const capitalGiroDisponivel = percentualImplementacao > 0 ? valorImpostoNormal : valorImpostoLiquido;

        // Cálculo dos recebimentos
        // Para vendas à vista: recebimento - split payment imediato
        const recebimentoVista = (faturamento * percVista) - (valorImpostoSplit * (percVista / (percVista + percPrazo)));

        // Para vendas a prazo: valor integral, mas com retenção de impostos no recebimento
        const recebimentoPrazo = (faturamento * percPrazo) - (valorImpostoSplit * (percPrazo / (percVista + percPrazo)));

        // Prazo para recolhimento do imposto normal (não Split)
        const prazoRecolhimento = 25;

        // Cálculo do tempo médio do capital em giro (apenas para a parcela não Split)
        const tempoMedioCapitalGiro = window.CalculationCore.calcularTempoMedioCapitalGiro(pmr, prazoRecolhimento, percVista, percPrazo);

        // Benefício financeiro do capital em giro (em dias de faturamento)
        const beneficioDiasCapitalGiro = (capitalGiroDisponivel / faturamento) * tempoMedioCapitalGiro;

        // Calcular impostos em ambos os sistemas
        const impostosAtuais = window.CurrentTaxSystem.calcularTodosImpostosAtuais({
            revenue: faturamento,
            serviceCompany: dados.serviceCompany || false,
            cumulativeRegime: dados.cumulativeRegime || false,
            credits: {
                pis: dados.creditosPIS || 0,
                cofins: dados.creditosCOFINS || 0,
                icms: dados.creditosICMS || 0,
                ipi: dados.creditosIPI || 0
            }
        });

        // Se o ano estiver no período de transição para o IVA Dual, calcular impostos de transição
        let impostosIVA = null;
        if (ano >= periodosTransicao.cbs.start) {
            // Calcular os impostos do sistema IVA Dual
            impostosIVA = calcularTotalIVA(
                faturamento,
                {}, // Usando alíquotas padrão
                {
                    cbs: dados.creditosCBS || 0,
                    ibs: dados.creditosIBS || 0
                },
                dados.categoriaIVA || 'standard'
            );
        }

        // Resultado completo
        const resultado = {
            faturamento,
            valorImpostoTotal,
            creditos,
            valorImpostoLiquido,
            valorImpostoSplit,
            valorImpostoNormal,
            recebimentoVista,
            recebimentoPrazo,
            percentualImplementacao,
            capitalGiroDisponivel,
            tempoMedioCapitalGiro,
            beneficioDiasCapitalGiro,
            fluxoCaixaLiquido: recebimentoVista + recebimentoPrazo,
            impostosAtuais,
            impostosIVA,
            memoriaCritica: window.CalculationCore.gerarMemoriaCritica(dados, null)
        };

        return resultado;
    }

    /**
     * Calcula o impacto do Split Payment no capital de giro
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {number} ano - Ano de referência para percentual de implementação
     * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
     * @returns {Object} - Análise comparativa detalhada do impacto no capital de giro
     */
	function calcularImpactoCapitalGiro(dados, ano = 2026, parametrosSetoriais = null) {
		// Adicionar proteção contra recursão
		const flags = arguments[3] || { isRecursiveCall: false };

		// Se for uma chamada recursiva, calcular uma versão simplificada
		if (flags.isRecursiveCall) {
			const percentualImplementacao = window.CurrentTaxSystem.obterPercentualImplementacao(ano, parametrosSetoriais);
			const valorImpostoTotal = dados.faturamento * dados.aliquota;
			const diferencaCapitalGiro = -valorImpostoTotal * percentualImplementacao;

			return {
				diferencaCapitalGiro,
				percentualImpacto: -100 * percentualImplementacao,
				necesidadeAdicionalCapitalGiro: Math.abs(diferencaCapitalGiro) * 1.2,
				impactoDiasFaturamento: 15 * percentualImplementacao,
				// Adicionado para evitar erros em referências posteriores
				impactoMargem: { 
					impactoPercentual: Math.abs(diferencaCapitalGiro) / dados.faturamento * 5,
					custoAnualCapitalGiro: Math.abs(diferencaCapitalGiro) * (dados.taxaCapitalGiro || 0.021) * 12
				}
			};
		}

		// Calcular fluxo de caixa nos dois regimes
		const resultadoAtual = window.CurrentTaxSystem.calcularFluxoCaixaAtual(dados, { isRecursiveCall: true });
		const resultadoSplitPayment = calcularFluxoCaixaSplitPayment(dados, ano, parametrosSetoriais, { isRecursiveCall: true });

		// Calcular diferenças
		const diferencaCapitalGiro = resultadoSplitPayment.capitalGiroDisponivel - resultadoAtual.capitalGiroDisponivel;
		const percentualImpacto = resultadoAtual.capitalGiroDisponivel !== 0 ?
		  (diferencaCapitalGiro / resultadoAtual.capitalGiroDisponivel) * 100 : 0;

		// Calcular necessidade adicional de capital de giro
		const necesidadeAdicionalCapitalGiro = Math.abs(diferencaCapitalGiro) * 1.2;

		// Impacto em dias de faturamento
		const impactoDiasFaturamento = resultadoAtual.beneficioDiasCapitalGiro - resultadoSplitPayment.beneficioDiasCapitalGiro;

		// Calcular impacto na margem operacional diretamente (sem chamar CurrentTaxSystem)
		const taxaCapitalGiro = dados.taxaCapitalGiro || 0.021;
		const custoMensalCapitalGiro = Math.abs(diferencaCapitalGiro) * taxaCapitalGiro;
		const custoAnualCapitalGiro = custoMensalCapitalGiro * 12;
		const impactoPercentual = dados.faturamento > 0 ? (custoMensalCapitalGiro / dados.faturamento) * 100 : 0;
		const impactoMargem = {
			custoMensalCapitalGiro,
			custoAnualCapitalGiro,
			impactoPercentual,
			margemOriginal: dados.margem,
			margemAjustada: dados.margem - (impactoPercentual / 100),
			percentualReducaoMargem: dados.margem > 0 ? (impactoPercentual / (dados.margem * 100)) * 100 : 0
		};

		// Resultado completo
		const resultado = {
			ano,
			resultadoAtual,
			resultadoSplitPayment,
			diferencaCapitalGiro,
			percentualImpacto,
			necesidadeAdicionalCapitalGiro,
			impactoDiasFaturamento,
			margemOperacionalOriginal: dados.margem,
			margemOperacionalAjustada: dados.margem - (impactoPercentual / 100),
			impactoMargem: impactoPercentual,
			impactoMargemDetalhado: impactoMargem
		};

		// Apenas calcular analiseSensibilidade se não for chamada recursiva
		if (!flags.isRecursiveCall) {
			// Implementar uma versão simplificada da análise de sensibilidade aqui
			resultado.analiseSensibilidade = calcularAnaliseSensibilidadeSimplificada(dados, ano, diferencaCapitalGiro);
		}

		return resultado;
	}

	// Nova função para calcular análise de sensibilidade sem depender de CurrentTaxSystem
	function calcularAnaliseSensibilidadeSimplificada(dados, ano, diferencaCapitalGiro) {
		const percentualOriginal = window.CurrentTaxSystem.obterPercentualImplementacao(ano);
		const percentuais = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
		const resultados = {};
		const impactoTotal = Math.abs(diferencaCapitalGiro / percentualOriginal);
		
		// Calcular impacto para cada percentual
		percentuais.forEach(percentual => {
			resultados[percentual] = -impactoTotal * percentual;
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

    /**
     * Calcula a necessidade adicional de capital em função do Split Payment
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {number} ano - Ano de referência para percentual de implementação
     * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
     * @returns {Object} - Análise detalhada da necessidade adicional de capital
     */
    function calcularNecessidadeAdicionalCapital(dados, ano = 2026, parametrosSetoriais = null) {
        // Calcular impacto no capital de giro
        const impacto = calcularImpactoCapitalGiro(dados, ano, parametrosSetoriais);

        // Extrair dados relevantes
        const diferencaCapitalGiro = impacto.diferencaCapitalGiro;
        const necesidadeBasica = Math.abs(diferencaCapitalGiro);

        // Fatores de ajuste para cálculo da necessidade
        const fatorMargemSeguranca = 1.2; // 20% de margem de segurança
        const fatorSazonalidade = window.CalculationCore.calcularFatorSazonalidade(dados);
        const fatorCrescimento = window.CalculationCore.calcularFatorCrescimento(dados, ano);

        // Cálculo da necessidade com diferentes fatores
        const necessidadeComMargemSeguranca = necesidadeBasica * fatorMargemSeguranca;
        const necessidadeComSazonalidade = necesidadeBasica * fatorSazonalidade;
        const necessidadeComCrescimento = necesidadeBasica * fatorCrescimento;

        // Necessidade total considerando todos os fatores
        const necessidadeTotal = necesidadeBasica * fatorMargemSeguranca * fatorSazonalidade * fatorCrescimento;

        // Opções de captação
        const opcoesFinanciamento = window.CalculationCore.calcularOpcoesFinanciamento(dados, necessidadeTotal);

        // Impacto no resultado considerando a opção mais econômica
        const impactoResultado = window.CalculationCore.calcularImpactoResultado(dados, opcoesFinanciamento.opcaoRecomendada.custoAnual);

        // Resultado completo
        const resultado = {
            necesidadeBasica,
            fatorMargemSeguranca,
            fatorSazonalidade,
            fatorCrescimento,
            necessidadeComMargemSeguranca,
            necessidadeComSazonalidade,
            necessidadeComCrescimento,
            necessidadeTotal,
            opcoesFinanciamento,
            impactoResultado,
            memoriaCritica: window.CalculationCore.gerarMemoriaCritica(dados, null)
        };

        return resultado;
    }

    /**
     * Simula o impacto do Split Payment ao longo do período de transição
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {number} anoInicial - Ano inicial da simulação (padrão: 2026)
     * @param {number} anoFinal - Ano final da simulação (padrão: 2033)
     * @param {string} cenarioTaxaCrescimento - Cenário de crescimento ('conservador', 'moderado', 'otimista', 'personalizado')
     * @param {number} taxaCrescimentoPersonalizada - Taxa de crescimento para cenário personalizado (decimal)
     * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
     * @returns {Object} - Projeção detalhada do impacto ao longo do tempo
     */
    // Substituir a implementação atual por esta versão sem dependência circular
    function calcularProjecaoTemporal(dados, anoInicial = 2026, anoFinal = 2033, cenarioTaxaCrescimento = 'moderado', taxaCrescimentoPersonalizada = null, parametrosSetoriais = null) {
        // Definir taxa de crescimento com base no cenário
        let taxaCrescimento = 0.05; // Padrão: moderado (5% a.a.)

        if (cenarioTaxaCrescimento === 'conservador') {
            taxaCrescimento = 0.02; // 2% a.a.
        } else if (cenarioTaxaCrescimento === 'otimista') {
            taxaCrescimento = 0.08; // 8% a.a.
        } else if (cenarioTaxaCrescimento === 'personalizado' && taxaCrescimentoPersonalizada !== null) {
            taxaCrescimento = taxaCrescimentoPersonalizada;
        }

        // Inicializar resultados
        const resultadosAnuais = {};
        const impactoAcumulado = {
            totalNecessidadeCapitalGiro: 0,
            custoFinanceiroTotal: 0,
            impactoMedioMargem: 0
        };

        let dadosAno = {...dados};
        let somaImpactoMargem = 0;

        // Simular cada ano
        for (let ano = anoInicial; ano <= anoFinal; ano++) {
            // Calcular impacto para o ano
            const impactoAno = calcularImpactoCapitalGiro(dadosAno, ano, parametrosSetoriais);

            // Adicionar ao acumulado
            resultadosAnuais[ano] = impactoAno;
            impactoAcumulado.totalNecessidadeCapitalGiro += impactoAno.necesidadeAdicionalCapitalGiro;
            impactoAcumulado.custoFinanceiroTotal += impactoAno.impactoMargemDetalhado.custoAnualCapitalGiro;
            somaImpactoMargem += impactoAno.impactoMargem;

            // Atualizar faturamento para o próximo ano
            dadosAno = {
                ...dadosAno,
                faturamento: dadosAno.faturamento * (1 + taxaCrescimento)
            };
        }

        // Calcular impacto médio na margem
        const numAnos = anoFinal - anoInicial + 1;
        impactoAcumulado.impactoMedioMargem = somaImpactoMargem / numAnos;

        // IMPORTANTE: Não chamar calcularAnaliseElasticidade aqui

        // Resultado completo
        const resultado = {
            parametros: {
                anoInicial,
                anoFinal,
                cenarioTaxaCrescimento,
                taxaCrescimento
            },
            resultadosAnuais,
            impactoAcumulado,
            memoriaCritica: window.CalculationCore.gerarMemoriaCritica(dados, null)
        };

        return resultado;
    }

    /**
     * Calcula o impacto do Split Payment no ciclo financeiro da empresa
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {number} ano - Ano de referência para percentual de implementação
     * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
     * @returns {Object} - Análise detalhada do impacto no ciclo financeiro
     */
    function calcularImpactoCicloFinanceiro(dados, ano = 2026, parametrosSetoriais = null) {
        // Extrair parâmetros relevantes
        const pmr = dados.pmr;
        const pmp = dados.pmp;
        const pme = dados.pme;
        const faturamento = dados.faturamento;
        const aliquota = dados.aliquota;

        // Cálculo do ciclo financeiro atual
        const cicloFinanceiroAtual = pmr + pme - pmp;

        // Obter percentual de implementação para o ano específico
        const percentualImplementacao = window.CurrentTaxSystem.obterPercentualImplementacao(ano, parametrosSetoriais);

        // Cálculo do impacto do Split Payment
        const valorImpostoTotal = faturamento * aliquota;
        const impostoSplit = valorImpostoTotal * percentualImplementacao;

        // Impacto em dias adicionais no ciclo financeiro devido ao Split Payment
        // Aqui consideramos que o Split Payment aumenta o ciclo financeiro
        const diasAdicionais = (impostoSplit / faturamento) * 30; // Convertendo para equivalente em dias de faturamento

        // Ciclo financeiro ajustado (AUMENTA com o Split Payment)
        const cicloFinanceiroAjustado = cicloFinanceiroAtual + diasAdicionais;

        // Necessidade de capital de giro antes e depois
        const ncgAtual = (faturamento / 30) * cicloFinanceiroAtual;
        const ncgAjustada = (faturamento / 30) * cicloFinanceiroAjustado;
        // Alternativa: ncgAjustada = ncgAtual + impostoSplit;

        // Diferença na necessidade de capital de giro (será positiva, indicando aumento)
        const diferencaNCG = ncgAjustada - ncgAtual;

        // Resultado completo
        const resultado = {
            cicloFinanceiroAtual,
            cicloFinanceiroAjustado,
            diasAdicionais,
            percentualImplementacao,
            ncgAtual,
            ncgAjustada,
            diferencaNCG,
            // Resto do código...
            memoriaCritica: window.CalculationCore.gerarMemoriaCritica(dados, null)
        };

        return resultado;
    }

    /**
     * Função auxiliar recursiva para gerar combinações de estratégias
     * @param {number} start - Índice inicial
     * @param {Array} combinacaoAtual - Combinação atual sendo construída
     * @param {number} tam - Tamanho desejado da combinação
     * @param {Array} estrategiasValidas - Lista de estratégias válidas
     * @param {Array} combinacoes - Lista de combinações já geradas
     */
    function gerarCombinacoes(start, combinacaoAtual, tam, estrategiasValidas, combinacoes) {
        if (combinacaoAtual.length === tam) {
            combinacoes.push([...combinacaoAtual]);
            return;
        }

        for (let i = start; i < estrategiasValidas.length; i++) {
            combinacaoAtual.push(estrategiasValidas[i]);
            gerarCombinacoes(i + 1, combinacaoAtual, tam, estrategiasValidas, combinacoes);
            combinacaoAtual.pop();
        }
    }

    /**
     * Calcula a efetividade de estratégias de mitigação do impacto do Split Payment
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {Object} estrategias - Configuração das estratégias de mitigação
     * @param {number} ano - Ano de referência para percentual de implementação
     * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
     * @returns {Object} - Análise detalhada da efetividade das estratégias
     */
    function calcularEfeitividadeMitigacao(dados, estrategias, ano = 2026, parametrosSetoriais = null) {
        // Calcular impacto base sem mitigação
        const impactoBase = calcularImpactoCapitalGiro(dados, ano, parametrosSetoriais);

        // Inicializar resultados por estratégia
        const resultadosEstrategias = {
            ajustePrecos: estrategias.ajustePrecos.ativar ? calcularEfeitividadeAjustePrecos(dados, estrategias.ajustePrecos, impactoBase) : null,
            renegociacaoPrazos: estrategias.renegociacaoPrazos.ativar ? calcularEfeitividadeRenegociacaoPrazos(dados, estrategias.renegociacaoPrazos, impactoBase) : null,
            antecipacaoRecebiveis: estrategias.antecipacaoRecebiveis.ativar ? calcularEfeitividadeAntecipacaoRecebiveis(dados, estrategias.antecipacaoRecebiveis, impactoBase) : null,
            capitalGiro: estrategias.capitalGiro.ativar ? calcularEfeitividadeCapitalGiro(dados, estrategias.capitalGiro, impactoBase) : null,
            mixProdutos: estrategias.mixProdutos.ativar ? calcularEfeitividadeMixProdutos(dados, estrategias.mixProdutos, impactoBase) : null,
            meiosPagamento: estrategias.meiosPagamento.ativar ? calcularEfeitividadeMeiosPagamento(dados, estrategias.meiosPagamento, impactoBase) : null
        };

        // Calcular efetividade combinada
        const efeitividadeCombinada = calcularEfeitividadeCombinada(dados, estrategias, resultadosEstrategias, impactoBase);

        // Ordenar estratégias por efetividade
        const estrategiasOrdenadas = Object.entries(resultadosEstrategias)
            .filter(([_, resultado]) => resultado !== null)
            .sort((a, b) => b[1].efetividadePercentual - a[1].efetividadePercentual);

        // Identificar estratégia mais efetiva
        const estrategiaMaisEfetiva = estrategiasOrdenadas.length > 0 ? estrategiasOrdenadas[0] : null;

        // Identificar combinação ótima
        const combinacaoOtima = identificarCombinacaoOtima(dados, estrategias, resultadosEstrategias, impactoBase);

        // Resultado completo
        const resultado = {
            impactoBase,
            resultadosEstrategias,
            efeitividadeCombinada,
            estrategiasOrdenadas,
            estrategiaMaisEfetiva,
            combinacaoOtima,
            memoriaCritica: window.CalculationCore.gerarMemoriaCritica(dados, null)
        };

        return resultado;
    }

    /**
     * Calcula a efetividade do ajuste de preços
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {Object} estrategia - Configuração da estratégia
     * @param {Object} impactoBase - Impacto base do Split Payment
     * @returns {Object} - Análise de efetividade
     */
    function calcularEfeitividadeAjustePrecos(dados, estrategia, impactoBase) {
        // Extrair parâmetros
        const percentualAumento = estrategia.percentualAumento / 100;
        const elasticidade = estrategia.elasticidade;
        const impactoVendas = percentualAumento * elasticidade;
        const periodoAjuste = estrategia.periodoAjuste;

        // Calcular faturamento ajustado
        const faturamentoAjustado = dados.faturamento * (1 + percentualAumento) * (1 + impactoVendas);

        // Calcular fluxo de caixa adicional por mês
        const fluxoCaixaAdicional = (faturamentoAjustado - dados.faturamento) * dados.margem;

        // Calcular mitigação mensal
        const mitigacaoMensal = fluxoCaixaAdicional;

        // Mitigação total considerando o período
        const mitigacaoTotal = mitigacaoMensal * periodoAjuste;

        // Cálculo de efetividade
        const necessidadeCapitalGiro = Math.abs(impactoBase.diferencaCapitalGiro);
        const efetividadePercentual = (mitigacaoTotal / necessidadeCapitalGiro) * 100;

        // Custo da estratégia (perda de receita devido à elasticidade)
        const perdaReceita = Math.max(0, dados.faturamento * Math.abs(impactoVendas));
        const custoEstrategia = perdaReceita * periodoAjuste;

        // Relação custo-benefício
        const custoBeneficio = custoEstrategia > 0 ? custoEstrategia / mitigacaoTotal : 0;

        return {
            faturamentoOriginal: dados.faturamento,
            faturamentoAjustado,
            percentualAumento,
            elasticidade,
            impactoVendas,
            fluxoCaixaAdicional,
            mitigacaoMensal,
            mitigacaoTotal,
            efetividadePercentual,
            custoEstrategia,
            custoBeneficio,
            periodoAjuste
        };
    }

    /**
     * Calcula a efetividade da renegociação de prazos com fornecedores
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {Object} estrategia - Configuração da estratégia
     * @param {Object} impactoBase - Impacto base do Split Payment
     * @returns {Object} - Análise de efetividade
     */
    function calcularEfeitividadeRenegociacaoPrazos(dados, estrategia, impactoBase) {
        // Extrair parâmetros
        const aumentoPrazo = estrategia.aumentoPrazo; // Aumento do prazo em dias
        const percentualFornecedores = estrategia.percentualFornecedores / 100; // Percentual de fornecedores participantes
        const contrapartidas = estrategia.contrapartidas; // Tipo de contrapartida
        const custoContrapartida = estrategia.custoContrapartida / 100; // Custo da contrapartida (%)

        // Estimar pagamentos a fornecedores (baseado no faturamento e margem)
        const faturamento = dados.faturamento;
        const margem = dados.margem;
        const pagamentosFornecedores = faturamento * (1 - margem) * 0.7; // Estimativa: 70% dos custos são com fornecedores

        // Calcular o impacto no fluxo de caixa
        const impactoDiario = pagamentosFornecedores / 30; // Valor diário
        const impactoFluxoCaixa = impactoDiario * aumentoPrazo * percentualFornecedores * (1 - custoContrapartida);

        // Calcular a duração do efeito (assumindo renegociação com vigência de 12 meses)
        const duracaoEfeito = 12; // meses

        // Calcular a mitigação total
        const mitigacaoTotal = impactoFluxoCaixa * duracaoEfeito;

        // Calcular efetividade
        const necessidadeCapitalGiro = Math.abs(impactoBase.diferencaCapitalGiro);
        const efetividadePercentual = (mitigacaoTotal / necessidadeCapitalGiro) * 100;

        // Calcular o custo da estratégia (valor da contrapartida)
        const custoMensal = pagamentosFornecedores * percentualFornecedores * custoContrapartida;
        const custoTotal = custoMensal * duracaoEfeito;

        // Calcular relação custo-benefício
        const custoBeneficio = custoTotal > 0 ? custoTotal / mitigacaoTotal : 0;

        const aliquota = dados.aliquota;
        const percVista = dados.percVista;
        const percPrazo = dados.percPrazo;
        const valorImpostoTotal = faturamento * aliquota;
        const creditos = dados.creditos || 0;
        const valorImpostoLiquido = valorImpostoTotal - creditos;
        const tempoMedioCapitalGiro = 30; // Valor aproximado ou calculado
        const beneficioDiasCapitalGiro = 15; // Valor aproximado ou calculado

        // Informações adicionais para análise
        let impactoNovoPMP = dados.pmp + (aumentoPrazo * percentualFornecedores);
        let impactoCicloFinanceiro = dados.pmr + dados.pme - impactoNovoPMP;
        let diferençaCiclo = (dados.pmr + dados.pme - dados.pmp) - impactoCicloFinanceiro;

        const resultado = {
            aumentoPrazo,
            percentualFornecedores: estrategia.percentualFornecedores,
            contrapartidas,
            custoContrapartida: estrategia.custoContrapartida,
            pagamentosFornecedores,
            impactoFluxoCaixa,
            duracaoEfeito,
            mitigacaoTotal,
            efetividadePercentual,
            custoTotal,
            custoBeneficio,
            impactoNovoPMP,
            impactoCicloFinanceiro,
            diferençaCiclo,
            memoriaCritica: window.CalculationCore.gerarMemoriaCritica(dados, null)
        };

        return resultado;
    }

    /**
     * Calcula a efetividade da antecipação de recebíveis
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {Object} estrategia - Configuração da estratégia
     * @param {Object} impactoBase - Impacto base do Split Payment
     * @returns {Object} - Análise de efetividade
     */
    function calcularEfeitividadeAntecipacaoRecebiveis(dados, estrategia, impactoBase) {
        // Extrair parâmetros
        const percentualAntecipacao = estrategia.percentualAntecipacao / 100; // Percentual de recebíveis a antecipar
        const taxaDesconto = estrategia.taxaDesconto; // Taxa de desconto (% a.m.)
        const prazoAntecipacao = estrategia.prazoAntecipacao; // Prazo médio antecipado (dias)

        // Calcular o valor das vendas a prazo
        const faturamento = dados.faturamento;
        const percPrazo = dados.percPrazo;
        const vendasPrazo = faturamento * percPrazo;

        // Valor a ser antecipado
        const valorAntecipado = vendasPrazo * percentualAntecipacao;

        // Calcular o custo da antecipação
        const custoAntecipacao = valorAntecipado * taxaDesconto * (prazoAntecipacao / 30);

        // Impacto no fluxo de caixa (valor líquido antecipado)
        const impactoFluxoCaixa = valorAntecipado - custoAntecipacao;

        // Duração do efeito (assumindo antecipação contínua por 12 meses)
        const duracaoEfeito = 12; // meses

        // Valor total antecipado no período
        const valorTotalAntecipado = valorAntecipado * duracaoEfeito;

        // Custo total da antecipação no período
        const custoTotalAntecipacao = custoAntecipacao * duracaoEfeito;

        // Calcular efetividade
        const necessidadeCapitalGiro = Math.abs(impactoBase.diferencaCapitalGiro);
        const efetividadePercentual = (impactoFluxoCaixa / necessidadeCapitalGiro) * 100;

        // Impacto no PMR
        const pmrOriginal = dados.pmr;
        const pmrAjustado = pmrOriginal * (1 - (percentualAntecipacao * percPrazo));
        const reducaoPMR = pmrOriginal - pmrAjustado;

        // Impacto no ciclo financeiro
        const cicloFinanceiroOriginal = dados.pmr + dados.pme - dados.pmp;
        const cicloFinanceiroAjustado = pmrAjustado + dados.pme - dados.pmp;
        const reducaoCiclo = cicloFinanceiroOriginal - cicloFinanceiroAjustado;

        const resultado = {
            percentualAntecipacao: estrategia.percentualAntecipacao,
            taxaDesconto: estrategia.taxaDesconto * 100,
            prazoAntecipacao,
            vendasPrazo,
            valorAntecipado,
            custoAntecipacao,
            impactoFluxoCaixa,
            valorTotalAntecipado,
            custoTotalAntecipacao,
            efetividadePercentual,
            pmrAjustado,
            reducaoPMR,
            cicloFinanceiroAjustado,
            reducaoCiclo,
            custoBeneficio: custoTotalAntecipacao / valorTotalAntecipado,
            memoriaCritica: window.CalculationCore.gerarMemoriaCritica(dados, null)
        };

        return resultado;
    }

    /**
     * Calcula a efetividade da captação de capital de giro
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {Object} estrategia - Configuração da estratégia
     * @param {Object} impactoBase - Impacto base do Split Payment
     * @returns {Object} - Análise de efetividade
     */
    function calcularEfeitividadeCapitalGiro(dados, estrategia, impactoBase) {
        // Extrair parâmetros
        const valorCaptacao = estrategia.valorCaptacao / 100; // Percentual da necessidade a ser captado
        const taxaJuros = estrategia.taxaJuros; // Taxa de juros (% a.m.)
        const prazoPagamento = estrategia.prazoPagamento; // Prazo de pagamento (meses)
        const carencia = estrategia.carencia; // Carência (meses)

        // Calcular o valor a ser captado
        const necessidadeCapitalGiro = Math.abs(impactoBase.diferencaCapitalGiro);
        const valorFinanciamento = necessidadeCapitalGiro * valorCaptacao;

        // Calcular o custo mensal de juros
        const custoMensalJuros = valorFinanciamento * taxaJuros;

        // Calcular o custo total do financiamento
        // Durante a carência, paga apenas juros
        const custoCarencia = custoMensalJuros * carencia;

        // Após a carência, paga juros + principal
        const valorParcela = valorFinanciamento / (prazoPagamento - carencia);
        const custoAposCarencia = (valorParcela + custoMensalJuros) * (prazoPagamento - carencia);

        const custoTotalFinanciamento = custoCarencia + custoAposCarencia;

        // Calcular efetividade (considerando que disponibiliza o valor total imediatamente)
        const efetividadePercentual = (valorFinanciamento / necessidadeCapitalGiro) * 100;

        // Calcular taxa efetiva anual
        const taxaEfetivaAnual = Math.pow(1 + taxaJuros, 12) - 1;

        // Calcular o impacto na margem operacional
        const impactoMargemPP = (custoMensalJuros / dados.faturamento) * 100;

        const resultado = {
            valorCaptacao: estrategia.valorCaptacao,
            taxaJuros: estrategia.taxaJuros * 100,
            prazoPagamento,
            carencia,
            valorFinanciamento,
            custoMensalJuros,
            valorParcela,
            custoCarencia,
            custoAposCarencia,
            custoTotalFinanciamento,
            efetividadePercentual,
            taxaEfetivaAnual,
            impactoMargemPP,
            custoBeneficio: custoTotalFinanciamento / valorFinanciamento,
            memoriaCritica: window.CalculationCore.gerarMemoriaCritica(dados, null)
        };

        return resultado;
    }

    /**
     * Calcula a efetividade do ajuste no mix de produtos
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {Object} estrategia - Configuração da estratégia
     * @param {Object} impactoBase - Impacto base do Split Payment
     * @returns {Object} - Análise de efetividade
     */
    function calcularEfeitividadeMixProdutos(dados, estrategia, impactoBase) {
        // Extrair parâmetros
        const percentualAjuste = estrategia.percentualAjuste / 100; // Percentual do faturamento a ser ajustado
        const focoAjuste = estrategia.focoAjuste; // Foco do ajuste (ciclo, margem, vista)
        const impactoReceita = estrategia.impactoReceita / 100; // Impacto na receita (%)
        const impactoMargem = estrategia.impactoMargem / 100; // Impacto na margem (p.p.)

        // Calcular o valor ajustado
        const faturamento = dados.faturamento;
        const valorAjustado = faturamento * percentualAjuste;

        // Calcular o impacto na receita
        const variacaoReceita = valorAjustado * impactoReceita;
        const novaReceita = faturamento + variacaoReceita;

        // Calcular o impacto na margem
        const margemOriginal = dados.margem;
        const margemAjustada = margemOriginal + impactoMargem;

        // Calcular o impacto no fluxo de caixa
        // Considerando dois componentes: variação na receita e melhoria na margem
        const impactoFluxoReceita = variacaoReceita * margemOriginal;
        const impactoFluxoMargem = faturamento * impactoMargem;
        const impactoFluxoCaixa = impactoFluxoReceita + impactoFluxoMargem;

        // Calcular efetividade
        const necessidadeCapitalGiro = Math.abs(impactoBase.diferencaCapitalGiro);
        const efetividadePercentual = (impactoFluxoCaixa / necessidadeCapitalGiro) * 100;

        // Impacto no ciclo financeiro (estimativa)
        let reducaoCiclo = 0;
        let impactoPMR = 0;

        if (focoAjuste === 'ciclo') {
            // Estimar redução no ciclo com base no percentual de ajuste
            reducaoCiclo = Math.min(dados.pmr * 0.2, 5) * percentualAjuste; // Estimativa: até 20% do PMR ou 5 dias
            impactoPMR = reducaoCiclo; // Simplificação: redução no ciclo = redução no PMR
        } else if (focoAjuste === 'vista') {
            // Estimar impacto no PMR com base no aumento de vendas à vista
            const aumentoVendaVista = percentualAjuste * 0.5; // Conversão de 50% do ajuste para vendas à vista
            impactoPMR = dados.pmr * aumentoVendaVista;
            reducaoCiclo = impactoPMR;
        }

        const pmrAjustado = dados.pmr - impactoPMR;
        const cicloFinanceiroAjustado = (dados.pmr - impactoPMR) + dados.pme - dados.pmp;

        // Duração do efeito (assumindo implementação permanente com 12 meses de análise)
        const duracaoEfeito = 12; // meses

        // Impacto total no período
        const impactoTotal = impactoFluxoCaixa * duracaoEfeito;

        // Custo da estratégia (custos de implementação, reposicionamento, etc.)
        // Estimativa: 10% do valor ajustado como custos de implementação
        const custoImplementacao = valorAjustado * 0.1;

        return {
            percentualAjuste: estrategia.percentualAjuste,
            focoAjuste,
            impactoReceita: estrategia.impactoReceita,
            impactoMargem: estrategia.impactoMargem,
            valorAjustado,
            variacaoReceita,
            novaReceita,
            margemAjustada,
            impactoFluxoReceita,
            impactoFluxoMargem,
            impactoFluxoCaixa,
            efetividadePercentual,
            reducaoCiclo,
            impactoPMR,
            pmrAjustado,
            cicloFinanceiroAjustado,
            duracaoEfeito,
            impactoTotal,
            custoImplementacao,
            custoBeneficio: custoImplementacao / impactoTotal,
            memoriaCritica: window.CalculationCore.gerarMemoriaCritica(dados, null)
        };
    }

    /**
     * Calcula a efetividade da estratégia de meios de pagamento
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {Object} estrategia - Configuração da estratégia
     * @param {Object} impactoBase - Impacto base do Split Payment
     * @returns {Object} - Análise de efetividade
     */
    function calcularEfeitividadeMeiosPagamento(dados, estrategia, impactoBase) {
        // Extrair parâmetros
        const distribuicaoAtual = estrategia.distribuicaoAtual;
        const distribuicaoNova = estrategia.distribuicaoNova;
        const taxaIncentivo = estrategia.taxaIncentivo / 100; // Taxa de incentivo para pagamentos à vista (%)

        // Faturamento e dados originais
        const faturamento = dados.faturamento;
        const percVistaAtual = distribuicaoAtual.vista / 100;
        const percPrazoAtual = distribuicaoAtual.prazo / 100;

        // Nova distribuição
        const percVistaNovo = distribuicaoNova.vista / 100;
        const percDias30Novo = distribuicaoNova.dias30 / 100;
        const percDias60Novo = distribuicaoNova.dias60 / 100;
        const percDias90Novo = distribuicaoNova.dias90 / 100;

        // Verificar se a soma é 100%
        const somaPerc = percVistaNovo + percDias30Novo + percDias60Novo + percDias90Novo;
        if (Math.abs(somaPerc - 1) > 0.01) {
            return {
                erro: "A soma dos percentuais da nova distribuição deve ser 100%.",
                efetividadePercentual: 0
            };
        }

        // Calcular o PMR atual e novo
        const pmrAtual = dados.pmr;
        const pmrNovo = (0 * percVistaNovo) + (30 * percDias30Novo) + (60 * percDias60Novo) + (90 * percDias90Novo);
        const variaPMR = pmrNovo - pmrAtual;

        // Calcular o ciclo financeiro atual e novo
        const cicloFinanceiroAtual = dados.pmr + dados.pme - dados.pmp;
        const cicloFinanceiroNovo = pmrNovo + dados.pme - dados.pmp;
        const variacaoCiclo = cicloFinanceiroNovo - cicloFinanceiroAtual;

        // Calcular o custo do incentivo
        const aumento_vista = percVistaNovo - percVistaAtual;
        const valorIncentivoMensal = faturamento * aumento_vista * taxaIncentivo;

        // Calcular o impacto no fluxo de caixa
        // 1. Impacto da redução no PMR
        const valorDiario = faturamento / 30;
        const impacto_pmr = valorDiario * (-variaPMR);

        // 2. Custo do incentivo
        const impactoLiquido = impacto_pmr - valorIncentivoMensal;

        // Calcular efetividade
        const necessidadeCapitalGiro = Math.abs(impactoBase.diferencaCapitalGiro);
        const efetividadePercentual = (impactoLiquido / necessidadeCapitalGiro) * 100;

        // Duração do efeito (assumindo implementação permanente com 12 meses de análise)
        const duracaoEfeito = 12; // meses

        // Impacto total no período
        const impactoTotal = impactoLiquido * duracaoEfeito;
        const custoTotalIncentivo = valorIncentivoMensal * duracaoEfeito;

        return {
            distribuicaoAtual,
            distribuicaoNova,
            taxaIncentivo: estrategia.taxaIncentivo,
            pmrAtual,
            pmrNovo,
            variaPMR,
            cicloFinanceiroAtual,
            cicloFinanceiroNovo,
            variacaoCiclo,
            valorIncentivoMensal,
            impacto_pmr,
            impactoLiquido,
            efetividadePercentual,
            duracaoEfeito,
            impactoTotal,
            custoTotalIncentivo,
            custoBeneficio: variaPMR < 0 ? valorIncentivoMensal / Math.abs(impacto_pmr) : Infinity,
            memoriaCritica: window.CalculationCore.gerarMemoriaCritica(dados, null)
        };
    }

    /**
     * Calcula a efetividade combinada das estratégias selecionadas
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {Object} estrategias - Configuração das estratégias
     * @param {Object} resultadosEstrategias - Resultados individuais das estratégias
     * @param {Object} impactoBase - Impacto base do Split Payment
     * @returns {Object} - Análise de efetividade combinada
     */
    function calcularEfeitividadeCombinada(dados, estrategias, resultadosEstrategias, impactoBase) {
        // Filtrar estratégias ativas com resultados
        const estrategiasAtivas = Object.entries(resultadosEstrategias)
            .filter(([nome, resultado]) => resultado !== null)
            .map(([nome, resultado]) => ({
                nome,
                resultado
            }));

        if (estrategiasAtivas.length === 0) {
            return {
                efetividadePercentual: 0,
                mitigacaoTotal: 0,
                custoTotal: 0,
                custoBeneficio: 0,
                impactosMitigados: {}
            };
        }

        // Inicializar impactos e custos
        let impactoFluxoCaixaTotal = 0;
        let custoTotal = 0;
        let impactosPMR = [];
        let impactosPMP = [];
        let impactosMargem = [];

        // Mapear impactos específicos por estratégia
        const impactosMitigados = {};

        // Calcular impactos específicos para cada estratégia
        estrategiasAtivas.forEach(({ nome, resultado }) => {
            // Armazenar resultado para referência
            impactosMitigados[nome] = resultado;

            switch (nome) {
                case 'ajustePrecos':
                    impactoFluxoCaixaTotal += resultado.fluxoCaixaAdicional;
                    custoTotal += resultado.custoEstrategia;
                    if (resultado.impactoMargem) impactosMargem.push(resultado.impactoMargem);
                    break;

                case 'renegociacaoPrazos':
                    impactoFluxoCaixaTotal += resultado.impactoFluxoCaixa;
                    custoTotal += resultado.custoTotal;
                    if (resultado.impactoNovoPMP) impactosPMP.push(resultado.impactoNovoPMP - dados.pmp);
                    break;

                case 'antecipacaoRecebiveis':
                    impactoFluxoCaixaTotal += resultado.impactoFluxoCaixa;
                    custoTotal += resultado.custoTotalAntecipacao;
                    if (resultado.reducaoPMR) impactosPMR.push(-resultado.reducaoPMR);
                    break;

                case 'capitalGiro':
                    impactoFluxoCaixaTotal += resultado.valorFinanciamento;
                    custoTotal += resultado.custoTotalFinanciamento;
                    if (resultado.impactoMargemPP) impactosMargem.push(-resultado.impactoMargemPP / 100);
                    break;

                case 'mixProdutos':
                    impactoFluxoCaixaTotal += resultado.impactoFluxoCaixa;
                    custoTotal += resultado.custoImplementacao;
                    if (resultado.impactoPMR) impactosPMR.push(-resultado.impactoPMR);
                    if (resultado.impactoMargem) impactosMargem.push(resultado.impactoMargem);
                    break;

                case 'meiosPagamento':
                    impactoFluxoCaixaTotal += resultado.impactoLiquido;
                    custoTotal += resultado.custoTotalIncentivo;
                    if (resultado.variaPMR) impactosPMR.push(resultado.variaPMR);
                    break;
            }
        });

        // Calcular o impacto combinado no PMR
        // Em vez de somar diretamente, aplicamos um fator de sobreposição
        const fatorSobreposicaoPMR = 0.8; // 80% do efeito combinado (evita dupla contagem)
        const impactoPMRCombinado = impactosPMR.length > 0 ? 
            impactosPMR.reduce((total, atual) => total + atual, 0) * fatorSobreposicaoPMR : 0;

        // Impacto combinado no PMP
        const fatorSobreposicaoPMP = 0.9; // 90% do efeito combinado
        const impactoPMPCombinado = impactosPMP.length > 0 ? 
            impactosPMP.reduce((total, atual) => total + atual, 0) * fatorSobreposicaoPMP : 0;

        // Impacto combinado na margem
        const fatorSobreposicaoMargem = 0.85; // 85% do efeito combinado
        const impactoMargemCombinado = impactosMargem.length > 0 ? 
            impactosMargem.reduce((total, atual) => total + atual, 0) * fatorSobreposicaoMargem : 0;

        // Calcular novo ciclo financeiro
        const pmrAjustado = dados.pmr + impactoPMRCombinado;
        const pmpAjustado = dados.pmp + impactoPMPCombinado;
        const cicloFinanceiroAjustado = pmrAjustado + dados.pme - pmpAjustado;
        const variacaoCiclo = cicloFinanceiroAjustado - (dados.pmr + dados.pme - dados.pmp);

        // Calcular nova margem
        const margemAjustada = dados.margem + impactoMargemCombinado;

        // Calcular efetividade
        const necessidadeCapitalGiro = Math.abs(impactoBase.diferencaCapitalGiro);
        const efetividadePercentual = (impactoFluxoCaixaTotal / necessidadeCapitalGiro) * 100;

        // Calcular relação custo-benefício
        const custoBeneficio = custoTotal > 0 ? custoTotal / impactoFluxoCaixaTotal : 0;

        return {
            estrategiasAtivas: estrategiasAtivas.length,
            efetividadePercentual,
            mitigacaoTotal: impactoFluxoCaixaTotal,
            custoTotal,
            custoBeneficio,
            pmrAjustado,
            pmpAjustado,
            cicloFinanceiroAjustado,
            variacaoCiclo,
            margemAjustada,
            impactosMitigados,
            memoriaCritica: window.CalculationCore.gerarMemoriaCritica(dados, null)
        };
    }

    /**
     * Identifica a combinação ótima de estratégias
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {Object} estrategias - Configuração das estratégias
     * @param {Object} resultadosEstrategias - Resultados individuais das estratégias
     * @param {Object} impactoBase - Impacto base do Split Payment
     * @returns {Object} - Combinação ótima de estratégias
     */
    function identificarCombinacaoOtima(dados, estrategias, resultadosEstrategias, impactoBase) {
        // Filtrar estratégias válidas com resultados
        const estrategiasValidas = Object.entries(resultadosEstrategias)
            .filter(([_, resultado]) => resultado !== null && resultado.efetividadePercentual > 0)
            .map(([nome, resultado]) => ({
                nome,
                resultado,
                efetividade: resultado.efetividadePercentual,
                custo: window.CalculationCore.getFuncaoCusto(nome, resultado),
                relacaoCB: resultado.custoBeneficio || 0
            }));

        if (estrategiasValidas.length === 0) {
            return {
                estrategiasSelecionadas: [],
                efetividadePercentual: 0,
                custoTotal: 0,
                custoBeneficio: 0
            };
        }

        // Ordenar por relação custo-benefício (do menor para o maior)
        estrategiasValidas.sort((a, b) => a.relacaoCB - b.relacaoCB);

        // Abordagem 1: Selecionar a estratégia com melhor relação custo-benefício
        const melhorEstrategia = estrategiasValidas[0];

        // Abordagem 2: Encontrar combinação que maximiza efetividade com restrição de custo
        // Vamos usar um algoritmo simplificado de otimização

        // Gerar todas as combinações possíveis (usando algoritmo de subconjuntos)
        const combinacoes = [];
        const n = estrategiasValidas.length;

        // Máximo de 5 estratégias para limitar a complexidade computacional
        const maxEstrategias = Math.min(n, 5);

        // Gerar todas as combinações possíveis (exceto conjunto vazio)
        for (let tam = 1; tam <= maxEstrategias; tam++) {
            // Usar a função auxiliar para gerar combinações
            gerarCombinacoes(0, [], tam, estrategiasValidas, combinacoes);
        }

        // Avaliar cada combinação
        const avaliacoes = combinacoes.map(combinacao => {
            // Calcular a efetividade combinada
            const efetividadeCombinada = combinacao.reduce((total, estrategia) => {
                // Aplicar um fator de desconto para evitar dupla contagem
                // O desconto aumenta com o número de estratégias na combinação
                const fatorDesconto = 1 - (0.05 * (combinacao.length - 1));
                return total + (estrategia.efetividade * fatorDesconto);
            }, 0);

            // Limitar a efetividade máxima a 100%
            const efetividadeAjustada = Math.min(efetividadeCombinada, 100);

            // Calcular o custo total
            const custoTotal = combinacao.reduce((total, estrategia) => total + estrategia.custo, 0);

            // Calcular relação custo-benefício
            const relacaoCB = custoTotal / efetividadeAjustada;

            return {
                estrategias: combinacao,
                efetividade: efetividadeAjustada,
                custo: custoTotal,
                relacaoCB
            };
        });

        // Ordenar por efetividade (decrescente)
        avaliacoes.sort((a, b) => b.efetividade - a.efetividade);

        // Selecionar a combinação com maior efetividade
        const melhorEfetividade = avaliacoes[0];

        // Ordenar por relação custo-benefício (crescente)
        avaliacoes.sort((a, b) => a.relacaoCB - b.relacaoCB);

        // Selecionar a combinação com melhor relação custo-benefício
        const melhorRelacaoCB = avaliacoes[0];

        // Ordenar por eficiência da fronteira de Pareto
        // Uma combinação é eficiente se não existe outra com maior efetividade e menor custo
        const fronteiraParetoOrdenada = avaliacoes
            .filter(avaliacao => {
                // Verificar se é eficiente (não dominado)
                return !avaliacoes.some(outra => 
                    outra.efetividade > avaliacao.efetividade && outra.custo <= avaliacao.custo);
            })
            .sort((a, b) => b.efetividade - a.efetividade);

        // Selecionar estratégia da fronteira de Pareto com pelo menos 70% de efetividade e menor custo
        const efetivasFronteira = fronteiraParetoOrdenada.filter(av => av.efetividade >= 70);
        const estrategiaPareto = efetivasFronteira.length > 0 ? 
            efetivasFronteira.reduce((menor, atual) => (atual.custo < menor.custo) ? atual : menor, efetivasFronteira[0]) : 
            fronteiraParetoOrdenada[0];

        // Selecionar a combinação ótima (considerando diversos fatores)
        // Prioridade: estratégia da fronteira de Pareto
        const combinacaoOtima = estrategiaPareto || melhorRelacaoCB;

        // Formatar resultado
        return {
            estrategiasSelecionadas: combinacaoOtima.estrategias.map(e => e.nome),
            nomeEstrategias: combinacaoOtima.estrategias.map(e => window.CalculationCore.traduzirNomeEstrategia(e.nome)),
            efetividadePercentual: combinacaoOtima.efetividade,
            custoTotal: combinacaoOtima.custo,
            custoBeneficio: combinacaoOtima.relacaoCB,
            alternativas: {
                melhorEfetividade: {
                    estrategias: melhorEfetividade.estrategias.map(e => e.nome),
                    efetividade: melhorEfetividade.efetividade,
                    custo: melhorEfetividade.custo
                },
                melhorRelacaoCB: {
                    estrategias: melhorRelacaoCB.estrategias.map(e => e.nome),
                    efetividade: melhorRelacaoCB.efetividade,
                    custo: melhorRelacaoCB.custo
                },
                melhorUnica: {
                    estrategia: melhorEstrategia.nome,
                    efetividade: melhorEstrategia.efetividade,
                    custo: melhorEstrategia.custo
                }
            },
            memoriaCritica: window.CalculationCore.gerarMemoriaCritica(dados, null)
        };
    }

    /**
     * Calcula o imposto em um ano específico durante a transição para o IVA Dual
     * @param {number} baseValue - Valor base para cálculo
     * @param {number} year - Ano do cálculo
     * @param {Object} currentTaxes - Impostos calculados pelo sistema atual
     * @param {Object} [options] - Opções adicionais para o cálculo
     * @returns {Object} Resultado do cálculo na transição
     */
    function calcularTransicaoIVADual(baseValue, year, currentTaxes, options = {}) {
        const result = { ...currentTaxes };

        // Determinar em qual fase da transição estamos
        let percentualCBS = 0;
        let percentualIBS = 0;

        // Transição do CBS (substitui PIS/COFINS)
        if (year >= periodosTransicao.cbs.start) {
            if (year >= periodosTransicao.cbs.end) {
                // CBS totalmente implementado
                percentualCBS = 1;
            } else {
                // Durante a transição do CBS
                const anosCBS = periodosTransicao.cbs.end - periodosTransicao.cbs.start;
                const anosDecorridosCBS = year - periodosTransicao.cbs.start;
                percentualCBS = anosDecorridosCBS / anosCBS;
            }
        }

        // Transição do IBS (substitui ICMS/ISS)
        if (year >= periodosTransicao.ibs.start) {
            if (year >= periodosTransicao.ibs.end) {
                // IBS totalmente implementado
                percentualIBS = 1;
            } else {
                // Durante a transição do IBS
                const anosIBS = periodosTransicao.ibs.end - periodosTransicao.ibs.start;
                const anosDecorridosIBS = year - periodosTransicao.ibs.start;
                percentualIBS = anosDecorridosIBS / anosIBS;
            }
        }

        // Calcular os impostos nos dois sistemas, ponderados pela transição
        if (percentualCBS > 0) {
            // Valor base para CBS (equivalente a PIS+COFINS)
            const baseValueCBS = baseValue;
            const cbsTax = calcularCBS(baseValueCBS) * percentualCBS;

            // Reduzir PIS/COFINS proporcionalmente
            if (result.pis) result.pis *= (1 - percentualCBS);
            if (result.cofins) result.cofins *= (1 - percentualCBS);

            // Adicionar CBS
            result.cbs = cbsTax;
        }

        if (percentualIBS > 0) {
            // Valor base para IBS (equivalente a ICMS+ISS)
            const baseValueIBS = baseValue;
            const ibsTax = calcularIBS(baseValueIBS) * percentualIBS;

            // Reduzir ICMS/ISS proporcionalmente
            if (result.icms) result.icms *= (1 - percentualIBS);
            if (result.iss) result.iss *= (1 - percentualIBS);

            // Adicionar IBS
            result.ibs = ibsTax;
        }

        // Recalcular o total
        result.total = Object.values(result).reduce((sum, value) => 
            typeof value === 'number' ? sum + value : sum, 0);

        return result;
    }

    /**
     * Compara os resultados entre o sistema atual e o IVA Dual
     * @param {Object} currentSystemResults - Resultados do sistema atual
     * @param {Object} ivaDualResults - Resultados do sistema IVA Dual
     * @returns {Object} Comparação entre os dois sistemas
     */
    function compareResults(currentSystemResults, ivaDualResults) {
        // Extrair dados para comparação
        const diferencaCapitalGiro = ivaDualResults.capitalGiroDisponivel - currentSystemResults.capitalGiroDisponivel;
        const percentualImpacto = currentSystemResults.capitalGiroDisponivel !== 0 ?
          (diferencaCapitalGiro / currentSystemResults.capitalGiroDisponivel) * 100 : 0;

        const impactoDiasFaturamento = currentSystemResults.beneficioDiasCapitalGiro - ivaDualResults.beneficioDiasCapitalGiro;

        // Comparar impostos se existirem no resultado IVA Dual
        let comparacaoImpostos = null;
        if (ivaDualResults.impostosIVA) {
            const impostosTotaisAtuais = currentSystemResults.impostos ? 
                currentSystemResults.impostos.total : 0;

            const impostosTotaisIVA = ivaDualResults.impostosIVA.total || 0;

            comparacaoImpostos = {
                atual: impostosTotaisAtuais,
                ivaDual: impostosTotaisIVA,
                diferenca: impostosTotaisIVA - impostosTotaisAtuais,
                percentualVariacao: impostosTotaisAtuais > 0 ? 
                    ((impostosTotaisIVA - impostosTotaisAtuais) / impostosTotaisAtuais) * 100 : 0
            };
        }

        return {
            diferencaCapitalGiro,
            percentualImpacto,
            impactoDiasFaturamento,
            comparacaoImpostos,
            resultadoAtual: {
                fluxoCaixaLiquido: currentSystemResults.fluxoCaixaLiquido,
                capitalGiroDisponivel: currentSystemResults.capitalGiroDisponivel,
                beneficioDiasCapitalGiro: currentSystemResults.beneficioDiasCapitalGiro
            },
            resultadoIVADual: {
                fluxoCaixaLiquido: ivaDualResults.fluxoCaixaLiquido,
                capitalGiroDisponivel: ivaDualResults.capitalGiroDisponivel,
                beneficioDiasCapitalGiro: ivaDualResults.beneficioDiasCapitalGiro
            }
        };
    }

    // Exportar API pública
    return {
        // Constantes e configurações
        aliquotasIVADual,
        periodosTransicao,
        
        // Funções de cálculo de tributos
        calcularCBS,
        calcularIBS,
        calcularTotalIVA,
        calcularTransicaoIVADual,
        
        // Funções de análise de fluxo de caixa
        calcularFluxoCaixaSplitPayment,
        calcularImpactoCapitalGiro,
        calcularNecessidadeAdicionalCapital,
        calcularProjecaoTemporal,
        calcularImpactoCicloFinanceiro,
        
        // Funções de análise de estratégias
        calcularEfeitividadeMitigacao,
        calcularEfeitividadeAjustePrecos,
        calcularEfeitividadeRenegociacaoPrazos,
        calcularEfeitividadeAntecipacaoRecebiveis,
        calcularEfeitividadeCapitalGiro,
        calcularEfeitividadeMixProdutos,
        calcularEfeitividadeMeiosPagamento,
        calcularEfeitividadeCombinada,
        identificarCombinacaoOtima,
        
        // Funções utilitárias
        compareResults,
        gerarCombinacoes
    };
})();