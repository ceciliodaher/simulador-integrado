/**
 * Módulo de Cálculos Fundamentais para o Simulador de Split Payment
 * Fornece todas as funções necessárias para calcular o impacto no fluxo de caixa e capital de giro
 * 
 * @author Expertzy Inteligência Tributária
 * @version 1.0.0
 */
const CalculationModule = (function() {
    // Variáveis para armazenar resultados intermediários
    let _resultadoAtual = null;
    let _resultadoSplitPayment = null;
    
    // Método para obter dados do repositório
    function obterDadosDoRepositorio() {
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
    }

    // API pública modificada
    return {
        // Métodos originais
        calcularFluxoCaixaAtual,
        calcularFluxoCaixaSplitPayment,
        calcularImpactoCapitalGiro,
        calcularImpactoMargem,
        calcularNecessidadeAdicionalCapital,
        calcularProjecaoTemporal,
        calcularImpactoCicloFinanceiro,
        calcularEfeitividadeMitigacao,
        
        // Métodos adicionais para integração
        simular: function() {
            // Obter dados consolidados do repositório
            const dados = obterDadosDoRepositorio();
            
            // Extrair ano inicial e final para simulação
            const anoInicial = parseInt(dados.parametrosSimulacao.dataInicial.split('-')[0]) || 2026;
            const anoFinal = parseInt(dados.parametrosSimulacao.dataFinal.split('-')[0]) || 2033;
            
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
                taxaCapitalGiro: dados.parametrosFinanceiros?.taxaCapitalGiro || 0.021
            };
            
            // Obter parâmetros setoriais, se aplicável
            const parametrosSetoriais = dados.empresa.setor ? 
                dados.setoresEspeciais[dados.empresa.setor] : null;
            
            // Calcular impacto inicial
            const impactoBase = calcularImpactoCapitalGiro(dadosSimulacao, anoInicial, parametrosSetoriais);
            
            // Simular período de transição
            const projecaoTemporal = calcularProjecaoTemporal(
                dadosSimulacao, 
                anoInicial, 
                anoFinal, 
                dados.parametrosSimulacao.cenario, 
                dados.parametrosSimulacao.taxaCrescimento,
                parametrosSetoriais
            );
            
            // Gerar memória de cálculo
            const memoriaCalculo = gerarMemoriaCalculo(dadosSimulacao, anoInicial, anoFinal);
            
            // Estruturar resultados
            return {
                impactoBase,
                projecaoTemporal,
                memoriaCalculo,
                dadosUtilizados: dadosSimulacao,
                parametrosSetoriais
            };
        },
        
        // Getter para resultados intermediários (para depuração)
        getResultadoAtual: function() { return _resultadoAtual; },
        getResultadoSplitPayment: function() { return _resultadoSplitPayment; }
    };
})();

/**
 * Calcula o fluxo de caixa no regime tributário atual (pré-Split Payment)
 * 
 * @param {Object} dados - Dados da empresa e parâmetros de simulação
 * @returns {Object} - Resultados detalhados do fluxo de caixa atual
 */
function calcularFluxoCaixaAtual(dados) {
    // Extrair parâmetros relevantes
    const faturamento = dados.faturamento;
    const aliquota = dados.aliquota;
    const pmr = dados.pmr;
    const percVista = dados.percVista;
    const percPrazo = dados.percPrazo;
    const creditos = dados.creditos || 0;
    
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
    const tempoMedioCapitalGiro = calcularTempoMedioCapitalGiro(pmr, prazoRecolhimento, percVista, percPrazo);
    
    // Benefício financeiro do capital em giro (em dias de faturamento)
    const beneficioDiasCapitalGiro = (capitalGiroImpostos / faturamento) * tempoMedioCapitalGiro;
    
    // Resultado completo
    return {
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
        memoriaCritica: {
            tituloRegime: "Regime Atual (Pré-Split Payment)",
            descricaoRegime: "No regime atual, o tributo é recolhido no mês subsequente (normalmente até o dia 25).",
            tituloCalculo: "Cálculo do Capital de Giro Disponível",
            formula: `Capital de Giro = Valor do Imposto Líquido (${formatarMoeda(valorImpostoLiquido)})`,
            observacoes: [
                `O valor do imposto fica disponível para uso como capital de giro por aproximadamente ${tempoMedioCapitalGiro.toFixed(1)} dias.`,
                `Isso representa ${beneficioDiasCapitalGiro.toFixed(1)} dias de faturamento em capital de giro.`
            ]
        }
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
    const percentualImplementacao = obterPercentualImplementacao(ano, parametrosSetoriais);
    
    // Cálculos do fluxo de caixa com Split Payment
    const valorImpostoTotal = faturamento * aliquota;
    const valorImpostoLiquido = Math.max(0, valorImpostoTotal - creditos);
    
    // Valor dos impostos afetados pelo Split Payment
    const valorImpostoSplit = valorImpostoLiquido * percentualImplementacao;
    const valorImpostoNormal = valorImpostoLiquido - valorImpostoSplit;
    
    // Cálculo do capital de giro disponível (apenas a parte não afetada pelo Split Payment)
    const capitalGiroDisponivel = valorImpostoNormal;
    
    // Cálculo dos recebimentos
    // Para vendas à vista: recebimento - split payment imediato
    const recebimentoVista = (faturamento * percVista) - (valorImpostoSplit * (percVista / (percVista + percPrazo)));
    
    // Para vendas a prazo: valor integral, mas com retenção de impostos no recebimento
    const recebimentoPrazo = (faturamento * percPrazo) - (valorImpostoSplit * (percPrazo / (percVista + percPrazo)));
    
    // Prazo para recolhimento do imposto normal (não Split)
    const prazoRecolhimento = 25;
    
    // Cálculo do tempo médio do capital em giro (apenas para a parcela não Split)
    const tempoMedioCapitalGiro = calcularTempoMedioCapitalGiro(pmr, prazoRecolhimento, percVista, percPrazo);
    
    // Benefício financeiro do capital em giro (em dias de faturamento)
    const beneficioDiasCapitalGiro = (capitalGiroDisponivel / faturamento) * tempoMedioCapitalGiro;
    
    // Resultado completo
    return {
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
        memoriaCritica: {
            tituloRegime: `Regime Split Payment (${ano})`,
            descricaoRegime: `No regime de Split Payment, ${(percentualImplementacao*100).toFixed(1)}% do tributo é retido no momento da transação.`,
            tituloCalculo: "Cálculo do Capital de Giro Disponível",
            formula: `Capital de Giro = Valor do Imposto Não-Split (${formatarMoeda(valorImpostoNormal)})`,
            observacoes: [
                `O valor do imposto não afetado pelo Split (${formatarMoeda(valorImpostoNormal)}) fica disponível para uso como capital de giro por aproximadamente ${tempoMedioCapitalGiro.toFixed(1)} dias.`,
                `O valor do imposto afetado pelo Split (${formatarMoeda(valorImpostoSplit)}) não fica disponível para uso como capital de giro.`,
                `O Split Payment reduz o benefício de capital de giro em ${(percentualImplementacao*100).toFixed(1)}%.`
            ]
        }
    };
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
    // Calcular fluxo de caixa nos dois regimes
    const resultadoAtual = calcularFluxoCaixaAtual(dados);
    const resultadoSplitPayment = calcularFluxoCaixaSplitPayment(dados, ano, parametrosSetoriais);
    
    // Calcular diferenças
    const diferencaCapitalGiro = resultadoSplitPayment.capitalGiroDisponivel - resultadoAtual.capitalGiroDisponivel;
    const percentualImpacto = (diferencaCapitalGiro / resultadoAtual.capitalGiroDisponivel) * 100;
    
    // Calcular necessidade adicional de capital de giro (com margem de segurança)
    const necesidadeAdicionalCapitalGiro = Math.abs(diferencaCapitalGiro) * 1.2;
    
    // Impacto em dias de faturamento
    const impactoDiasFaturamento = resultadoAtual.beneficioDiasCapitalGiro - resultadoSplitPayment.beneficioDiasCapitalGiro;
    
    // Análise de sensibilidade: variação no impacto com diferentes percentuais de implementação
    const analiseSensibilidade = calcularAnaliseSensibilidade(dados, ano, parametrosSetoriais);
    
    // Calcular impacto na margem operacional
    const impactoMargem = calcularImpactoMargem(dados, diferencaCapitalGiro);
    
    // Resultado completo
    return {
        ano,
        resultadoAtual,
        resultadoSplitPayment,
        diferencaCapitalGiro,
        percentualImpacto,
        necesidadeAdicionalCapitalGiro,
        impactoDiasFaturamento,
        margemOperacionalOriginal: dados.margem,
        margemOperacionalAjustada: dados.margem - (impactoMargem.impactoPercentual / 100),
        impactoMargem: impactoMargem.impactoPercentual,
        analiseSensibilidade,
        memoriaCritica: {
            tituloPrincipal: `Análise de Impacto do Split Payment (${ano})`,
            descricaoImpacto: `O Split Payment reduz o capital de giro disponível em ${formatarMoeda(Math.abs(diferencaCapitalGiro))} (${Math.abs(percentualImpacto).toFixed(2)}%).`,
            tituloNecessidade: "Necessidade Adicional de Capital de Giro",
            formulaNecessidade: `Necessidade = |Diferença de Capital| × 1,2 (margem de segurança) = ${formatarMoeda(necesidadeAdicionalCapitalGiro)}`,
            tituloImpactoMargem: "Impacto na Margem Operacional",
            descricaoImpactoMargem: `A margem operacional é reduzida de ${(dados.margem*100).toFixed(2)}% para ${((dados.margem - impactoMargem.impactoPercentual/100)*100).toFixed(2)}% devido ao custo financeiro adicional.`,
            observacoes: [
                `O impacto representa ${impactoDiasFaturamento.toFixed(1)} dias de faturamento em capital de giro.`,
                `A necessidade adicional de capital de giro é de ${formatarMoeda(necesidadeAdicionalCapitalGiro)}.`,
                `Para cada 10% de implementação do Split Payment, o impacto no capital de giro é de aproximadamente ${formatarMoeda(analiseSensibilidade.impactoPor10Percent)}.`
            ]
        }
    };
}

/**
 * Calcula o impacto do Split Payment na margem operacional
 * 
 * @param {Object} dados - Dados da empresa e parâmetros de simulação
 * @param {number} diferencaCapitalGiro - Diferença no capital de giro
 * @returns {Object} - Análise detalhada do impacto na margem operacional
 */
function calcularImpactoMargem(dados, diferencaCapitalGiro) {
    // Extrair parâmetros relevantes
    const faturamento = dados.faturamento;
    const margem = dados.margem;
    const taxaCapitalGiro = dados.taxaCapitalGiro || 0.021; // 2,1% a.m. é o padrão
    
    // Cálculo do custo mensal do capital de giro adicional
    const custoMensalCapitalGiro = Math.abs(diferencaCapitalGiro) * taxaCapitalGiro;
    
    // Cálculo do custo anual
    const custoAnualCapitalGiro = custoMensalCapitalGiro * 12;
    
    // Cálculo do impacto percentual na margem
    const impactoPercentual = (custoMensalCapitalGiro / faturamento) * 100;
    
    // Cálculo da margem ajustada
    const margemAjustada = margem - (impactoPercentual / 100);
    
    // Percentual de redução da margem
    const percentualReducaoMargem = (impactoPercentual / (margem * 100)) * 100;
    
    // Resultado completo
    return {
        custoMensalCapitalGiro,
        custoAnualCapitalGiro,
        impactoPercentual,
        margemOriginal: margem,
        margemAjustada,
        percentualReducaoMargem,
        memoriaCritica: {
            tituloCalculo: "Cálculo do Impacto na Margem Operacional",
            descricaoImpacto: "A necessidade de obtenção de capital de giro adicional gera um custo financeiro que impacta diretamente a margem operacional da empresa.",
            formulaCusto: `Custo Mensal = |Diferença Capital de Giro| × Taxa do Capital de Giro = ${formatarMoeda(Math.abs(diferencaCapitalGiro))} × ${(taxaCapitalGiro*100).toFixed(1)}% = ${formatarMoeda(custoMensalCapitalGiro)}`,
            formulaImpacto: `Impacto na Margem (p.p.) = (Custo Mensal / Faturamento) × 100 = (${formatarMoeda(custoMensalCapitalGiro)} / ${formatarMoeda(faturamento)}) × 100 = ${impactoPercentual.toFixed(2)} p.p.`,
            observacoes: [
                `A margem operacional é reduzida de ${(margem*100).toFixed(2)}% para ${(margemAjustada*100).toFixed(2)}%.`,
                `Isso representa uma redução de ${percentualReducaoMargem.toFixed(2)}% na margem operacional original.`,
                `O custo anual estimado é de ${formatarMoeda(custoAnualCapitalGiro)}.`
            ]
        }
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
    const fatorSazonalidade = calcularFatorSazonalidade(dados);
    const fatorCrescimento = calcularFatorCrescimento(dados, ano);
    
    // Cálculo da necessidade com diferentes fatores
    const necessidadeComMargemSeguranca = necesidadeBasica * fatorMargemSeguranca;
    const necessidadeComSazonalidade = necesidadeBasica * fatorSazonalidade;
    const necessidadeComCrescimento = necesidadeBasica * fatorCrescimento;
    
    // Necessidade total considerando todos os fatores
    const necessidadeTotal = necesidadeBasica * fatorMargemSeguranca * fatorSazonalidade * fatorCrescimento;
    
    // Opções de captação
    const opcoesFinanciamento = calcularOpcoesFinanciamento(dados, necessidadeTotal);
    
    // Impacto no resultado considerando a opção mais econômica
    const impactoResultado = calcularImpactoResultado(dados, opcoesFinanciamento.opcaoRecomendada.custoAnual);
    
    // Resultado completo
    return {
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
        memoriaCritica: {
            tituloCalculo: "Cálculo da Necessidade Adicional de Capital",
            formulaBase: `Necessidade Base = |Diferença Capital de Giro| = ${formatarMoeda(necesidadeBasica)}`,
            formulaTotal: `Necessidade Total = Necessidade Base × Fatores de Ajuste = ${formatarMoeda(necesidadeBasica)} × ${fatorMargemSeguranca.toFixed(2)} (segurança) × ${fatorSazonalidade.toFixed(2)} (sazonalidade) × ${fatorCrescimento.toFixed(2)} (crescimento) = ${formatarMoeda(necessidadeTotal)}`,
            tituloOpcoes: "Opções de Financiamento",
            descricaoRecomendada: `A opção recomendada é ${opcoesFinanciamento.opcaoRecomendada.tipo}, com custo anual de ${formatarMoeda(opcoesFinanciamento.opcaoRecomendada.custoAnual)}.`,
            tituloImpacto: "Impacto no Resultado",
            descricaoImpacto: `O custo de financiamento representará ${impactoResultado.percentualDaReceita.toFixed(2)}% da receita e ${impactoResultado.percentualDoLucro.toFixed(2)}% do lucro operacional.`,
            observacoes: [
                `Considerando a sazonalidade, a necessidade pode chegar a ${formatarMoeda(necessidadeComSazonalidade)}.`,
                `O crescimento projetado para ${ano} aumenta a necessidade para ${formatarMoeda(necessidadeComCrescimento)}.`,
                `A necessidade total, com todos os fatores, é de ${formatarMoeda(necessidadeTotal)}.`
            ]
        }
    };
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
        impactoAcumulado.custoFinanceiroTotal += impactoAno.impactoMargem.custoAnualCapitalGiro;
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
    
    // Análise de elasticidade: impacto de diferentes taxas de crescimento
    const analiseElasticidade = calcularAnaliseElasticidade(dados, anoInicial, anoFinal, parametrosSetoriais);
    
    // Resultado completo
    return {
        parametros: {
            anoInicial,
            anoFinal,
            cenarioTaxaCrescimento,
            taxaCrescimento
        },
        resultadosAnuais,
        impactoAcumulado,
        analiseElasticidade,
        memoriaCritica: {
            tituloProjecao: `Projeção Temporal (${anoInicial}-${anoFinal})`,
            descricaoCenario: `Cenário de crescimento: ${cenarioTaxaCrescimento} (${(taxaCrescimento*100).toFixed(1)}% a.a.)`,
            tituloImpactoAcumulado: "Impacto Acumulado",
            descricaoImpactoAcumulado: `O impacto acumulado ao longo do período é de ${formatarMoeda(impactoAcumulado.totalNecessidadeCapitalGiro)} em necessidade de capital de giro.`,
            tituloCustoFinanceiro: "Custo Financeiro Total",
            descricaoCustoFinanceiro: `O custo financeiro total estimado é de ${formatarMoeda(impactoAcumulado.custoFinanceiroTotal)}.`,
            tituloImpactoMargem: "Impacto Médio na Margem",
            descricaoImpactoMargem: `O impacto médio na margem operacional é de ${impactoAcumulado.impactoMedioMargem.toFixed(2)} pontos percentuais.`,
            observacoes: [
                `A necessidade de capital de giro aumenta ao longo do tempo devido à combinação do aumento do percentual de implementação do Split Payment e do crescimento do faturamento.`,
                `O impacto é mais significativo nos anos finais da transição (2031-2033).`,
                `O custo financeiro representa ${((impactoAcumulado.custoFinanceiroTotal / (dados.faturamento * numAnos * (1 + taxaCrescimento/2))) * 100).toFixed(2)}% do faturamento acumulado no período.`
            ]
        }
    };
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
    const percentualImplementacao = obterPercentualImplementacao(ano, parametrosSetoriais);
    
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
    return {
        cicloFinanceiroAtual,
        cicloFinanceiroAjustado,
        diasAdicionais,
        percentualImplementacao,
        ncgAtual,
        ncgAjustada,
        diferencaNCG,
        // Resto do código...
        memoriaCritica: {
            tituloCalculo: "Cálculo do Impacto no Ciclo Financeiro",
            formulaCicloAtual: `Ciclo Financeiro Atual = PMR + PME - PMP = ${pmr} + ${pme} - ${pmp} = ${cicloFinanceiroAtual} dias`,
            formulaImpactoDias: `Impacto em Dias Adicionais = (Imposto Split / Faturamento) × 30 = (${formatarMoeda(impostoSplit)} / ${formatarMoeda(faturamento)}) × 30 = ${diasAdicionais.toFixed(2)} dias`,
            formulaCicloAjustado: `Ciclo Financeiro Ajustado = Ciclo Atual + Dias Adicionais = ${cicloFinanceiroAtual} + ${diasAdicionais.toFixed(2)} = ${cicloFinanceiroAjustado.toFixed(2)} dias`,
            tituloImpactoNCG: "Impacto na Necessidade de Capital de Giro (NCG)",
            formulaNCGAtual: `NCG Atual = (Faturamento / 30) × Ciclo Atual = (${formatarMoeda(faturamento)} / 30) × ${cicloFinanceiroAtual} = ${formatarMoeda(ncgAtual)}`,
            formulaNCGAjustada: `NCG Ajustada = (Faturamento / 30) × Ciclo Ajustado = (${formatarMoeda(faturamento)} / 30) × ${cicloFinanceiroAjustado.toFixed(2)} = ${formatarMoeda(ncgAjustada)}`,
            observacoes: [
                `O Split Payment aumenta o ciclo financeiro em ${diasAdicionais.toFixed(2)} dias.`,
                `A necessidade de capital de giro aumenta em ${formatarMoeda(diferencaNCG)}.`,
                `Este aumento ocorre porque a empresa deixa de ter disponível o valor dos impostos como capital de giro.`
            ]
        }
    };
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
    return {
        impactoBase,
        resultadosEstrategias,
        efeitividadeCombinada,
        estrategiasOrdenadas,
        estrategiaMaisEfetiva,
        combinacaoOtima,
        memoriaCritica: {
            tituloAnalise: "Análise de Efetividade das Estratégias de Mitigação",
            descricaoImpactoBase: `O impacto base do Split Payment é uma redução de ${formatarMoeda(Math.abs(impactoBase.diferencaCapitalGiro))} no capital de giro.`,
            tituloEfetividadeCombinada: "Efetividade Combinada das Estratégias",
            descricaoEfetividadeCombinada: `A aplicação combinada das estratégias selecionadas mitiga ${efeitividadeCombinada.efetividadePercentual.toFixed(2)}% do impacto.`,
            tituloEstrategiaMaisEfetiva: "Estratégia Mais Efetiva",
            descricaoEstrategiaMaisEfetiva: estrategiaMaisEfetiva ? 
                `A estratégia mais efetiva é ${traduzirNomeEstrategia(estrategiaMaisEfetiva[0])}, com efetividade de ${estrategiaMaisEfetiva[1].efetividadePercentual.toFixed(2)}%.` : 
                "Nenhuma estratégia foi selecionada.",
            tituloCombinacaoOtima: "Combinação Ótima de Estratégias",
            descricaoCombinacaoOtima: `A combinação ótima de estratégias mitiga ${combinacaoOtima.efetividadePercentual.toFixed(2)}% do impacto, com custo total de ${formatarMoeda(combinacaoOtima.custoTotal)}.`,
            observacoes: [
                `As estratégias combinadas têm um custo total de ${formatarMoeda(efeitividadeCombinada.custoTotal)}.`,
                `A relação custo-benefício das estratégias combinadas é de ${(efeitividadeCombinada.custoBeneficio).toFixed(2)} (quanto menor, melhor).`,
                `A melhor estratégia individual é ${estrategiaMaisEfetiva ? traduzirNomeEstrategia(estrategiaMaisEfetiva[0]) : "nenhuma"}.`
            ]
        }
    };
}

/**
 * Obtém o percentual de implementação do Split Payment para um determinado ano
 * 
 * @param {number} ano - Ano para obter o percentual
 * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
 * @returns {number} - Percentual de implementação (decimal)
 */
function obterPercentualImplementacao(ano, parametrosSetoriais = null) {
    // Cronograma padrão de implementação
    const cronogramaPadrao = {
        2026: 0.10,
        2027: 0.25,
        2028: 0.40,
        2029: 0.55,
        2030: 0.70,
        2031: 0.85,
        2032: 0.95,
        2033: 1.00
    };
    
    // Se houver parâmetros setoriais com cronograma próprio, utilizar
    if (parametrosSetoriais && parametrosSetoriais.cronogramaProprio && parametrosSetoriais.cronograma && parametrosSetoriais.cronograma[ano]) {
        return parametrosSetoriais.cronograma[ano];
    }
    
    // Caso contrário, utilizar o cronograma padrão
    return cronogramaPadrao[ano] || 0;
}

/**
 * Calcula o tempo médio do capital em giro
 * 
 * @param {number} pmr - Prazo Médio de Recebimento
 * @param {number} prazoRecolhimento - Prazo para recolhimento do imposto
 * @param {number} percVista - Percentual de vendas à vista
 * @param {number} percPrazo - Percentual de vendas a prazo
 * @returns {number} - Tempo médio em dias
 */
function calcularTempoMedioCapitalGiro(pmr, prazoRecolhimento, percVista, percPrazo) {
    // Para vendas à vista: tempo = prazo recolhimento
    // Para vendas a prazo: tempo = prazo recolhimento - pmr (se pmr < prazo recolhimento)
    // Para vendas a prazo: tempo = 0 (se pmr >= prazo recolhimento)
    
    const tempoVista = prazoRecolhimento;
    const tempoPrazo = Math.max(0, prazoRecolhimento - pmr);
    
    // Tempo médio ponderado
    return (percVista * tempoVista) + (percPrazo * tempoPrazo);
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
    // Obter parâmetros originais
    const percentualOriginal = obterPercentualImplementacao(ano, parametrosSetoriais);
    
    // Criar dados com diferentes percentuais
    const percentuais = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const resultados = {};
    
    // Calcular impacto para cada percentual
    percentuais.forEach(percentual => {
        // Simular implementação modificada
        const parametrosModificados = parametrosSetoriais ? 
            {...parametrosSetoriais, cronogramaProprio: true, cronograma: {...parametrosSetoriais.cronograma, [ano]: percentual}} : 
            {cronogramaProprio: true, cronograma: {[ano]: percentual}};
            
        // Calcular impacto
        const impacto = calcularImpactoCapitalGiro(dados, ano, parametrosModificados);
        
        // Armazenar resultado
        resultados[percentual] = impacto.diferencaCapitalGiro;
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
 * Calcula o fator de sazonalidade para ajuste da necessidade de capital
 * 
 * @param {Object} dados - Dados da empresa e parâmetros de simulação
 * @returns {number} - Fator de sazonalidade
 */
function calcularFatorSazonalidade(dados) {
    // Implementação básica: fator padrão de 1.3 (30% de aumento)
    // Em uma implementação real, este cálculo seria baseado em dados históricos
    // de sazonalidade específicos da empresa ou do setor
    return 1.3;
}

/**
 * Calcula o fator de crescimento para ajuste da necessidade de capital
 * 
 * @param {Object} dados - Dados da empresa e parâmetros de simulação
 * @param {number} ano - Ano de referência
 * @returns {number} - Fator de crescimento
 */
function calcularFatorCrescimento(dados, ano) {
    // Definir taxa de crescimento com base no cenário
    let taxaCrescimento = 0.05; // Padrão: moderado (5% a.a.)
    
    if (dados.cenario === 'conservador') {
        taxaCrescimento = 0.02; // 2% a.a.
    } else if (dados.cenario === 'otimista') {
        taxaCrescimento = 0.08; // 8% a.a.
    } else if (dados.cenario === 'personalizado' && dados.taxaCrescimento !== null) {
        taxaCrescimento = dados.taxaCrescimento;
    }
    
    // Calcular fator para o ano de referência
    // Considerando crescimento proporcional ao avanço da implementação
    const anoInicial = 2026;
    const anosDecorridos = ano - anoInicial;
    
    // Crescimento composto para o número de anos
    return Math.pow(1 + taxaCrescimento, anosDecorridos);
}

/**
 * Calcula as opções de financiamento para a necessidade de capital
 * 
 * @param {Object} dados - Dados da empresa e parâmetros de simulação
 * @param {number} valorNecessidade - Valor da necessidade de capital
 * @returns {Object} - Opções de financiamento
 */
function calcularOpcoesFinanciamento(dados, valorNecessidade) {
    // Definir opções de financiamento disponíveis
    const opcoes = [
        {
            tipo: "Capital de Giro",
            taxaMensal: dados.taxaCapitalGiro || 0.021,
            prazo: 12,
            carencia: 3,
            valorMaximo: valorNecessidade * 1.5
        },
        {
            tipo: "Antecipação de Recebíveis",
            taxaMensal: dados.taxaAntecipacao || 0.018,
            prazo: 6,
            carencia: 0,
            valorMaximo: dados.faturamento * dados.percPrazo * 3
        },
        {
            tipo: "Empréstimo Bancário",
            taxaMensal: (dados.taxaCapitalGiro || 0.021) + (dados.spreadBancario || 0.005),
            prazo: 24,
            carencia: 6,
            valorMaximo: valorNecessidade * 2
        }
    ];
    
    // Calcular custo para cada opção
    opcoes.forEach(opcao => {
        // Verificar limite de valor
        opcao.valorAprovado = Math.min(valorNecessidade, opcao.valorMaximo);
        
        // Calcular custo mensal
        opcao.custoMensal = opcao.valorAprovado * opcao.taxaMensal;
        
        // Calcular custo total (considerando carência)
        opcao.custoTotal = opcao.custoMensal * (opcao.prazo - opcao.carencia);
        
        // Calcular custo anual
        opcao.custoAnual = opcao.custoMensal * 12;
        
        // Calcular taxa efetiva anual
        opcao.taxaEfetivaAnual = Math.pow(1 + opcao.taxaMensal, 12) - 1;
        
        // Calcular parcela
        opcao.valorParcela = opcao.valorAprovado / opcao.prazo + opcao.custoMensal;
    });
    
    // Ordenar opções por custo total
    opcoes.sort((a, b) => a.custoTotal - b.custoTotal);
    
    // Identificar opção recomendada (menor custo)
    const opcaoRecomendada = opcoes[0];
    
    return {
        opcoes,
        opcaoRecomendada
    };
}

/**
 * Calcula o impacto no resultado de um custo financeiro
 * 
 * @param {Object} dados - Dados da empresa e parâmetros de simulação
 * @param {number} custoAnual - Custo financeiro anual
 * @returns {Object} - Análise de impacto no resultado
 */
function calcularImpactoResultado(dados, custoAnual) {
    // Calcular faturamento anual
    const faturamentoAnual = dados.faturamento * 12;
    
    // Calcular lucro operacional anual
    const lucroOperacionalAnual = faturamentoAnual * dados.margem;
    
    // Calcular percentuais
    const percentualDaReceita = (custoAnual / faturamentoAnual) * 100;
    const percentualDoLucro = (custoAnual / lucroOperacionalAnual) * 100;
    
    // Calcular resultado ajustado
    const resultadoAjustado = lucroOperacionalAnual - custoAnual;
    const margemAjustada = resultadoAjustado / faturamentoAnual;
    
    return {
        faturamentoAnual,
        lucroOperacionalAnual,
        custoAnual,
        percentualDaReceita,
        percentualDoLucro,
        resultadoAjustado,
        margemAjustada
    };
}

/**
 * Calcula a análise de elasticidade para diferentes cenários de crescimento
 * 
 * @param {Object} dados - Dados da empresa e parâmetros de simulação
 * @param {number} anoInicial - Ano inicial da simulação
 * @param {number} anoFinal - Ano final da simulação
 * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
 * @returns {Object} - Análise de elasticidade
 */
function calcularAnaliseElasticidade(dados, anoInicial, anoFinal, parametrosSetoriais = null) {
    // Definir cenários de taxa de crescimento
    const cenarios = [
        { nome: "Recessão", taxa: -0.02 },
        { nome: "Estagnação", taxa: 0.00 },
        { nome: "Conservador", taxa: 0.02 },
        { nome: "Moderado", taxa: 0.05 },
        { nome: "Otimista", taxa: 0.08 },
        { nome: "Acelerado", taxa: 0.12 }
    ];
    
    // Calcular projeção para cada cenário
    const resultados = {};
    
    cenarios.forEach(cenario => {
        // Simular projeção com esta taxa
        const projecao = calcularProjecaoTemporal(
            dados, 
            anoInicial, 
            anoFinal, 
            'personalizado', 
            cenario.taxa, 
            parametrosSetoriais
        );
        
        // Armazenar resultado
        resultados[cenario.nome] = {
            taxa: cenario.taxa,
            impactoAcumulado: projecao.impactoAcumulado.totalNecessidadeCapitalGiro,
            custoFinanceiroTotal: projecao.impactoAcumulado.custoFinanceiroTotal,
            impactoMedioMargem: projecao.impactoAcumulado.impactoMedioMargem
        };
    });
    
    // Calcular elasticidade (variação percentual do impacto / variação percentual da taxa)
    const elasticidades = {};
    
    // Usar o cenário "Moderado" como referência
    const referenciaImpacto = resultados.Moderado.impactoAcumulado;
    const referenciaTaxa = resultados.Moderado.taxa;
    
    cenarios.forEach(cenario => {
        if (cenario.nome !== "Moderado") {
            const variacaoImpacto = (resultados[cenario.nome].impactoAcumulado - referenciaImpacto) / referenciaImpacto;
            const variacaoTaxa = (cenario.taxa - referenciaTaxa) / referenciaTaxa;
            
            // Evitar divisão por zero
            elasticidades[cenario.nome] = variacaoTaxa !== 0 ? variacaoImpacto / variacaoTaxa : 0;
        }
    });
    
    return {
        cenarios,
        resultados,
        elasticidades
    };
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
    
    // Informações adicionais para análise
    let impactoNovoPMP = dados.pmp + (aumentoPrazo * percentualFornecedores);
    let impactoCicloFinanceiro = dados.pmr + dados.pme - impactoNovoPMP;
    let diferençaCiclo = (dados.pmr + dados.pme - dados.pmp) - impactoCicloFinanceiro;
    
    return {
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
        memoriaCritica: {
            tituloCalculo: "Cálculo da Efetividade da Renegociação de Prazos",
            formulaImpacto: `Impacto no Fluxo de Caixa = (Pagamentos a Fornecedores / 30) × Aumento de Prazo × % Fornecedores × (1 - Custo Contrapartida)`,
            valorCalculado: `= (${formatarMoeda(pagamentosFornecedores)} / 30) × ${aumentoPrazo} × ${percentualFornecedores} × (1 - ${custoContrapartida}) = ${formatarMoeda(impactoFluxoCaixa)}`,
            observacoes: [
                `Esta estratégia aumenta o PMP de ${dados.pmp} para ${impactoNovoPMP.toFixed(1)} dias.`,
                `O ciclo financeiro é reduzido em ${diferençaCiclo.toFixed(1)} dias.`,
                `O custo total da contrapartida é de ${formatarMoeda(custoTotal)}.`
            ]
        }
    };
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
    
    return {
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
        memoriaCritica: {
            tituloCalculo: "Cálculo da Efetividade da Antecipação de Recebíveis",
            formulaImpacto: `Impacto no Fluxo de Caixa = Valor Antecipado - Custo da Antecipação`,
            valorCalculado: `= ${formatarMoeda(valorAntecipado)} - ${formatarMoeda(custoAntecipacao)} = ${formatarMoeda(impactoFluxoCaixa)}`,
            formulaReducaoPMR: `Redução no PMR = PMR Original × (% Antecipação × % Vendas a Prazo)`,
            valorReducaoPMR: `= ${pmrOriginal} × (${percentualAntecipacao} × ${percPrazo}) = ${reducaoPMR.toFixed(1)} dias`,
            observacoes: [
                `Esta estratégia reduz o PMR de ${pmrOriginal} para ${pmrAjustado.toFixed(1)} dias.`,
                `O ciclo financeiro é reduzido em ${reducaoCiclo.toFixed(1)} dias.`,
                `O custo total da antecipação é de ${formatarMoeda(custoTotalAntecipacao)} para um valor antecipado de ${formatarMoeda(valorTotalAntecipado)}.`
            ]
        }
    };
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
    
    return {
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
        memoriaCritica: {
            tituloCalculo: "Cálculo da Efetividade da Captação de Capital de Giro",
            formulaValor: `Valor do Financiamento = Necessidade de Capital de Giro × % Captação`,
            valorCalculado: `= ${formatarMoeda(necessidadeCapitalGiro)} × ${valorCaptacao} = ${formatarMoeda(valorFinanciamento)}`,
            formulaCusto: `Custo Total = (Juros × Carência) + ((Parcela + Juros) × (Prazo - Carência))`,
            valorCusto: `= (${formatarMoeda(custoMensalJuros)} × ${carencia}) + ((${formatarMoeda(valorParcela)} + ${formatarMoeda(custoMensalJuros)}) × ${prazoPagamento - carencia}) = ${formatarMoeda(custoTotalFinanciamento)}`,
            observacoes: [
                `Esta estratégia disponibiliza imediatamente ${formatarMoeda(valorFinanciamento)} para capital de giro.`,
                `O custo mensal de juros é de ${formatarMoeda(custoMensalJuros)}, impactando a margem em ${impactoMargemPP.toFixed(2)} pontos percentuais.`,
                `A taxa efetiva anual do financiamento é de ${(taxaEfetivaAnual * 100).toFixed(2)}%.`
            ]
        }
    };
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
        memoriaCritica: {
            tituloCalculo: "Cálculo da Efetividade do Ajuste no Mix de Produtos",
            formulaImpacto: `Impacto no Fluxo de Caixa = Impacto Receita + Impacto Margem`,
            valorCalculado: `= ${formatarMoeda(impactoFluxoReceita)} + ${formatarMoeda(impactoFluxoMargem)} = ${formatarMoeda(impactoFluxoCaixa)}`,
            observacoes: [
                `Esta estratégia ${impactoReceita >= 0 ? 'aumenta' : 'reduz'} a receita em ${Math.abs(estrategia.impactoReceita).toFixed(1)}% e ${impactoMargem >= 0 ? 'aumenta' : 'reduz'} a margem em ${Math.abs(estrategia.impactoMargem).toFixed(1)} pontos percentuais.`,
                `O foco em "${focoAjuste}" ${reducaoCiclo > 0 ? 'reduz' : 'aumenta'} o ciclo financeiro em ${Math.abs(reducaoCiclo).toFixed(1)} dias.`,
                `O custo estimado de implementação é de ${formatarMoeda(custoImplementacao)}.`
            ]
        }
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
        memoriaCritica: {
            tituloCalculo: "Cálculo da Efetividade da Estratégia de Meios de Pagamento",
            formulaPMR: `PMR Novo = (0 × % Vista) + (30 × % 30 dias) + (60 × % 60 dias) + (90 × % 90 dias)`,
            valorPMR: `= (0 × ${percVistaNovo}) + (30 × ${percDias30Novo}) + (60 × ${percDias60Novo}) + (90 × ${percDias90Novo}) = ${pmrNovo.toFixed(1)} dias`,
            formulaImpacto: `Impacto Líquido = Impacto da Redução no PMR - Custo do Incentivo`,
            valorImpacto: `= ${formatarMoeda(impacto_pmr)} - ${formatarMoeda(valorIncentivoMensal)} = ${formatarMoeda(impactoLiquido)}`,
            observacoes: [
                `Esta estratégia ${variaPMR < 0 ? 'reduz' : 'aumenta'} o PMR em ${Math.abs(variaPMR).toFixed(1)} dias.`,
                `O ciclo financeiro ${variacaoCiclo < 0 ? 'reduz' : 'aumenta'} em ${Math.abs(variacaoCiclo).toFixed(1)} dias.`,
                `O custo mensal do incentivo para pagamentos à vista é de ${formatarMoeda(valorIncentivoMensal)}.`
            ]
        }
    };
}

// Demais funções de efetividade...

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
        memoriaCritica: {
            tituloAnalise: "Análise da Combinação de Estratégias",
            estrategiasSelecionadas: `${estrategiasAtivas.length} estratégias selecionadas: ${estrategiasAtivas.map(e => traduzirNomeEstrategia(e.nome)).join(', ')}`,
            formulaEfetividade: `Efetividade Total = (Impacto Combinado / Necessidade de Capital de Giro) × 100`,
            valorEfetividade: `= (${formatarMoeda(impactoFluxoCaixaTotal)} / ${formatarMoeda(necessidadeCapitalGiro)}) × 100 = ${efetividadePercentual.toFixed(2)}%`,
            observacoes: [
                `A combinação de estratégias mitiga ${efetividadePercentual.toFixed(2)}% do impacto do Split Payment.`,
                `O custo total das estratégias é de ${formatarMoeda(custoTotal)}, com uma relação custo-benefício de ${custoBeneficio.toFixed(2)}.`,
                `O ciclo financeiro ${variacaoCiclo < 0 ? 'reduz' : 'aumenta'} em ${Math.abs(variacaoCiclo).toFixed(1)} dias.`,
                `A margem operacional ${impactoMargemCombinado >= 0 ? 'aumenta' : 'diminui'} em ${Math.abs(impactoMargemCombinado * 100).toFixed(2)} pontos percentuais.`
            ]
        }
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
            custo: getFuncaoCusto(nome, resultado),
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
    
    // Função auxiliar para obter o custo da estratégia
    function getFuncaoCusto(nome, resultado) {
        switch (nome) {
            case 'ajustePrecos': return resultado.custoEstrategia || 0;
            case 'renegociacaoPrazos': return resultado.custoTotal || 0;
            case 'antecipacaoRecebiveis': return resultado.custoTotalAntecipacao || 0;
            case 'capitalGiro': return resultado.custoTotalFinanciamento || 0;
            case 'mixProdutos': return resultado.custoImplementacao || 0;
            case 'meiosPagamento': return resultado.custoTotalIncentivo || 0;
            default: return 0;
        }
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
        // Função para gerar combinações de tamanho 'tam'
        function gerarCombinacoes(start, combinacaoAtual) {
            if (combinacaoAtual.length === tam) {
                combinacoes.push([...combinacaoAtual]);
                return;
            }
            
            for (let i = start; i < n; i++) {
                combinacaoAtual.push(estrategiasValidas[i]);
                gerarCombinacoes(i + 1, combinacaoAtual);
                combinacaoAtual.pop();
            }
        }
        
        gerarCombinacoes(0, []);
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
        nomeEstrategias: combinacaoOtima.estrategias.map(e => traduzirNomeEstrategia(e.nome)),
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
        memoriaCritica: {
            tituloAnalise: "Análise de Combinação Ótima de Estratégias",
            descricaoCombinacao: `A combinação ótima inclui ${combinacaoOtima.estrategias.length} estratégias: ${combinacaoOtima.estrategias.map(e => traduzirNomeEstrategia(e.nome)).join(', ')}`,
            motivoSelecao: "Esta combinação foi selecionada por apresentar o melhor equilíbrio entre efetividade de mitigação e custo de implementação.",
            efetividade: `Efetividade Total: ${combinacaoOtima.efetividade.toFixed(2)}%`,
            custo: `Custo Total: ${formatarMoeda(combinacaoOtima.custo)}`,
            relacaoCB: `Relação Custo-Benefício: ${combinacaoOtima.relacaoCB.toFixed(2)}`,
            observacoes: [
                `Foram analisadas ${combinacoes.length} combinações possíveis de estratégias.`,
                `A combinação com maior efetividade (${melhorEfetividade.efetividade.toFixed(2)}%) tem um custo de ${formatarMoeda(melhorEfetividade.custo)}.`,
                `A combinação com melhor relação custo-benefício (${melhorRelacaoCB.relacaoCB.toFixed(2)}) tem uma efetividade de ${melhorRelacaoCB.efetividade.toFixed(2)}%.`,
                `A melhor estratégia individual é "${traduzirNomeEstrategia(melhorEstrategia.nome)}" com efetividade de ${melhorEstrategia.efetividade.toFixed(2)}%.`
            ]
        }
    };
}

/**
 * Calcula o impacto do split payment no capital de giro usando o modelo matemático ampliado
 * ΔCG = VT × (PMR + PR - PMR')
 * @param {Object} dados - Dados da simulação
 * @param {number} ano - Ano de referência para o cálculo
 * @returns {Object} Resultado do impacto no capital de giro
 */
function calcularImpactoCapitalGiroAmpliado(dados, ano) {
    console.log('Calculando impacto ampliado no capital de giro para o ano:', ano);
    
    // Extrair parâmetros dos dados
    const faturamentoMensal = parseFloat(dados.faturamentoMensal);
    const setorSelecionado = this.obterConfiguracoesSetor(dados.setor);
    const aliquotaEfetiva = setorSelecionado.aliquota;
    const prazoMedioRecebimento = parseFloat(dados.prazoMedioRecebimento);
    const prazoRecolhimento = 25; // Prazo de recolhimento no regime atual (25 do mês seguinte)
    
    // Valor tributário sujeito ao split payment
    const valorTributario = faturamentoMensal * aliquotaEfetiva;
    
    // Prazo médio de recebimento ajustado para o split payment (geralmente zero, pois o tributo é retido imediatamente)
    const prazoMedioRecebimentoAjustado = 0;
    
    // Calcular o impacto no capital de giro usando a fórmula ampliada
    const impactoCapitalGiro = valorTributario * (prazoMedioRecebimento + prazoRecolhimento - prazoMedioRecebimentoAjustado) / 30;
    
    // Calcular o percentual de implementação para o ano
    const percentualImplementacao = this.obterPercentualImplementacao(ano);
    
    // Aplicar o percentual de implementação
    const impactoEfetivo = impactoCapitalGiro * percentualImplementacao;
    
    // Impacto em dias de faturamento
    const impactoDiasFaturamento = (prazoMedioRecebimento * percentualImplementacao);
    
    return {
        valorTributario: valorTributario,
        impactoBruto: impactoCapitalGiro,
        percentualImplementacao: percentualImplementacao,
        impactoEfetivo: impactoEfetivo,
        impactoDiasFaturamento: impactoDiasFaturamento
    };
}

/**
 * Calcula o impacto no ciclo financeiro da empresa
 * CF_split = PME + PMR - PMP - (PMR × VTR/VT)
 * @param {Object} dados - Dados da simulação
 * @param {number} ano - Ano de referência para o cálculo
 * @returns {Object} Resultado do impacto no ciclo financeiro
 */
function calcularImpactoCicloFinanceiro(dados, ano) {
    console.log('Calculando impacto no ciclo financeiro para o ano:', ano);
    
    // Extrair parâmetros dos dados
    const prazoMedioEstoque = parseFloat(dados.prazoMedioEstoque) || 0;
    const prazoMedioRecebimento = parseFloat(dados.prazoMedioRecebimento) || 0;
    const prazoMedioPagamento = parseFloat(dados.prazoMedioPagamento) || 0;
    const setorSelecionado = this.obterConfiguracoesSetor(dados.setor);
    const aliquotaEfetiva = setorSelecionado.aliquota;
    
    // Percentual de implementação para o ano
    const percentualImplementacao = this.obterPercentualImplementacao(ano);
    
    // Ciclo financeiro atual
    const cicloFinanceiroAtual = prazoMedioEstoque + prazoMedioRecebimento - prazoMedioPagamento;
    
    // Redução do ciclo devido ao split payment
    const reducaoCiclo = prazoMedioRecebimento * aliquotaEfetiva * percentualImplementacao;
    
    // Ciclo financeiro após implementação do split payment
    const cicloFinanceiroSplit = cicloFinanceiroAtual - reducaoCiclo;
    
    return {
        cicloFinanceiroAtual: cicloFinanceiroAtual,
        reducaoCiclo: reducaoCiclo,
        cicloFinanceiroSplit: cicloFinanceiroSplit,
        percentualReducao: (reducaoCiclo / cicloFinanceiroAtual) * 100
    };
}

/**
 * Calcula o Fluxo de Caixa Descontado Ajustado para o split payment
 * FCDaj = Σ(FCO_t - VTR_t × (1 - CT_t/VTR_t))/(1 + TMA)^t
 * @param {Object} dados - Dados da simulação
 * @param {number} anoInicial - Ano inicial da projeção
 * @param {number} anoFinal - Ano final da projeção
 * @returns {Array} Array de objetos com os valores do FCD Ajustado por ano
 */
function calcularFluxoCaixaDescontadoAjustado(dados, anoInicial, anoFinal) {
    console.log('Calculando FCD Ajustado de', anoInicial, 'a', anoFinal);
    
    const faturamentoMensal = parseFloat(dados.faturamentoMensal);
    const taxaCrescimento = parseFloat(dados.taxaCrescimento) / 100;
    const setorSelecionado = this.obterConfiguracoesSetor(dados.setor);
    const aliquotaEfetiva = setorSelecionado.aliquota;
    const margemOperacional = parseFloat(dados.margemOperacional) / 100;
    const taxaMinAtrat = 0.1; // Taxa mínima de atratividade (10% a.a.)
    
    const resultado = [];
    
    for (let ano = anoInicial; ano <= anoFinal; ano++) {
        // Fator de crescimento acumulado
        const fatorCrescimento = Math.pow(1 + taxaCrescimento, ano - anoInicial);
        
        // Faturamento anual ajustado pelo crescimento
        const faturamentoAnual = faturamentoMensal * 12 * fatorCrescimento;
        
        // Fluxo de caixa operacional (simplificado como faturamento * margem)
        const fco = faturamentoAnual * margemOperacional;
        
        // Valor tributário retido
        const valorTributario = faturamentoAnual * aliquotaEfetiva;
        
        // Créditos tributários (simplificado como percentual do valor tributário)
        const creditosTributarios = valorTributario * 0.3; // 30% de créditos
        
        // Percentual de implementação
        const percentualImplementacao = this.obterPercentualImplementacao(ano);
        
        // Valor efetivamente retido considerando implementação gradual
        const valorRetido = (valorTributario - creditosTributarios) * percentualImplementacao;
        
        // Fator de desconto
        const fatorDesconto = Math.pow(1 + taxaMinAtrat, ano - anoInicial);
        
        // Fluxo de caixa descontado ajustado
        const fcdAjustado = (fco - valorRetido) / fatorDesconto;
        
        resultado.push({
            ano: ano,
            faturamentoAnual: faturamentoAnual,
            fco: fco,
            valorTributario: valorTributario,
            creditosTributarios: creditosTributarios,
            valorRetido: valorRetido,
            fatorDesconto: fatorDesconto,
            fcdAjustado: fcdAjustado
        });
    }
    
    return resultado;
}

/**
 * Obtém o percentual de implementação do split payment para um determinado ano
 * @param {number} ano - Ano de referência
 * @returns {number} Percentual de implementação
 */
function obterPercentualImplementacao(ano) {
    const cronograma = {
        2026: 0.10, // 10% em 2026
        2027: 0.25, // 25% em 2027
        2028: 0.40, // 40% em 2028
        2029: 0.55, // 55% em 2029
        2030: 0.70, // 70% em 2030
        2031: 0.85, // 85% em 2031
        2032: 0.95, // 95% em 2032
        2033: 1.00  // 100% em 2033
    };
    
    return cronograma[ano] || 0;
}

/**
 * Calcula o Índice de Sensibilidade Setorial
 * IS = (AE_s × PMR)/(CO × ML × 100)
 * @param {Object} dados - Dados da simulação
 * @returns {Object} Resultado do cálculo do índice de sensibilidade
 */
function calcularIndiceSensibilidadeSetorial(dados) {
    const setorSelecionado = this.obterConfiguracoesSetor(dados.setor);
    const aliquotaEfetiva = setorSelecionado.aliquota;
    const prazoMedioRecebimento = parseFloat(dados.prazoMedioRecebimento) || 0;
    const cicloOperacional = parseFloat(dados.prazoMedioEstoque || 0) + prazoMedioRecebimento;
    const margemLiquida = parseFloat(dados.margemLiquida || dados.margemOperacional) / 100;
    
    // Calcular o índice de sensibilidade
    let indiceSensibilidade = 0;
    if (cicloOperacional > 0 && margemLiquida > 0) {
        indiceSensibilidade = (aliquotaEfetiva * prazoMedioRecebimento) / (cicloOperacional * margemLiquida * 100);
    }
    
    // Classificar o índice
    let classificacao = 'Baixo';
    if (indiceSensibilidade > 0.3) {
        classificacao = 'Alto';
    } else if (indiceSensibilidade > 0.15) {
        classificacao = 'Médio-Alto';
    } else if (indiceSensibilidade > 0.05) {
        classificacao = 'Médio';
    } else if (indiceSensibilidade > 0.02) {
        classificacao = 'Médio-Baixo';
    }
    
    return {
        valor: indiceSensibilidade,
        classificacao: classificacao,
        aliquotaEfetiva: aliquotaEfetiva,
        prazoMedioRecebimento: prazoMedioRecebimento,
        cicloOperacional: cicloOperacional,
        margemLiquida: margemLiquida
    };
}

/**
 * Formata um valor numérico como moeda (R$)
 * 
 * @param {number} valor - Valor numérico
 * @returns {string} - Valor formatado
 */
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Traduz o nome da estratégia para exibição
 * 
 * @param {string} estrategia - Nome interno da estratégia
 * @returns {string} - Nome traduzido
 */
function traduzirNomeEstrategia(estrategia) {
    const traducoes = {
        ajustePrecos: "Ajuste de Preços",
        renegociacaoPrazos: "Renegociação de Prazos",
        antecipacaoRecebiveis: "Antecipação de Recebíveis",
        capitalGiro: "Capital de Giro",
        mixProdutos: "Mix de Produtos",
        meiosPagamento: "Meios de Pagamento"
    };
    
    return traducoes[estrategia] || estrategia;
}

// Integração com o módulo de cálculos
function inicializarIntegracaoCalculos() {
    console.log('Inicializando integração com o módulo de cálculos...');
    
    // Verificar se o módulo está disponível
    if (typeof CalculationModule === 'undefined') {
        console.error('Módulo de cálculos não encontrado. Algumas funcionalidades podem não funcionar corretamente.');
        return;
    }
    
    // Registrar o módulo no simulador
    if (typeof SimuladorFluxoCaixa !== 'undefined') {
        // Associar as funções de cálculo ao simulador
        SimuladorFluxoCaixa._calcularFluxoCaixaAtual = CalculationModule.calcularFluxoCaixaAtual;
        SimuladorFluxoCaixa._calcularFluxoCaixaSplitPayment = CalculationModule.calcularFluxoCaixaSplitPayment;
        SimuladorFluxoCaixa._calcularImpactoCapitalGiro = CalculationModule.calcularImpactoCapitalGiro;
        SimuladorFluxoCaixa._calcularProjecaoTemporal = CalculationModule.calcularProjecaoTemporal;
        
        console.log('Módulo de cálculos integrado com sucesso ao simulador.');
    } else {
        console.error('Simulador não encontrado. Não foi possível integrar o módulo de cálculos.');
    }
}

// Adicionar a inicialização à carga da página
document.addEventListener('DOMContentLoaded', function() {
    // Inicialização existente...
    
    // Inicializar integração com o módulo de cálculos
    inicializarIntegracaoCalculos();
});