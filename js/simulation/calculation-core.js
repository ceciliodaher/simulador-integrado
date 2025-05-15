/**
 * Módulo de Cálculos Fundamentais para o Simulador de Split Payment
 * Fornece as funções matemáticas e utilitários básicos para os cálculos
 * 
 * @author Expertzy Inteligência Tributária
 * @version 1.0.0
 */

// No início do arquivo calculation-core.js (antes de qualquer código)
// Garantir que o objeto exista antes de qualquer tentativa de acesso
window.CalculationCore = window.CalculationCore || {};

// Resto do código do módulo
window.CalculationCore = (function() {
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
    // Substituir a implementação atual por esta versão sem dependência circular
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

        // Resultados por cenário (simplificado, sem chamar projeção temporal)
        const resultados = {};

        cenarios.forEach(cenario => {
            // Cálculo simplificado do impacto
            const impactoBase = dados.faturamento * dados.aliquota;
            const fatorCrescimento = Math.pow(1 + cenario.taxa, (anoFinal - anoInicial));
            const impactoEstimado = impactoBase * fatorCrescimento * (anoFinal - anoInicial + 1) * 0.5;

            resultados[cenario.nome] = {
                taxa: cenario.taxa,
                impactoAcumulado: impactoEstimado,
                custoFinanceiroTotal: impactoEstimado * (dados.taxaCapitalGiro || 0.021) * 12,
                impactoMedioMargem: (impactoEstimado / dados.faturamento) * (dados.taxaCapitalGiro || 0.021)
            };
        });

        // Calcular elasticidade (variação percentual do impacto / variação percentual da taxa)
        const elasticidades = {};
        const referenciaImpacto = resultados.Moderado.impactoAcumulado;
        const referenciaTaxa = resultados.Moderado.taxa;

        cenarios.forEach(cenario => {
            if (cenario.nome !== "Moderado") {
                const variacaoImpacto = (resultados[cenario.nome].impactoAcumulado - referenciaImpacto) / referenciaImpacto;
                const variacaoTaxa = (cenario.taxa - referenciaTaxa) / referenciaTaxa;
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
     * Gera memória crítica de cálculo
     * @param {Object} dados - Dados da simulação
     * @param {Object} resultados - Resultados das estratégias (opcional)
     * @param {Object} flags - Flags de controle para evitar recursão (opcional)
     * @returns {Object} - Memória crítica de cálculo
     */
    // Implementação simplificada e isolada
    function gerarMemoriaCritica(dados, valores = null) {
        // Extrair ou definir valores seguros
        const faturamento = dados?.faturamento || 0;
        const aliquota = dados?.aliquota || 0;
        const creditos = dados?.creditos || 0;
        const percVista = dados?.percVista || 0;
        const percPrazo = dados?.percPrazo || 0;

        // Calcular valores básicos sem recursão
        const valorImpostoTotal = faturamento * aliquota;
        const valorImpostoLiquido = Math.max(0, valorImpostoTotal - creditos);

        // Formatação direta sem chamar outras funções
        const formatoMoeda = (valor) => {
            const num = parseFloat(valor) || 0;
            return 'R$ ' + num.toFixed(2).replace('.', ',');
        };

        // Criar o objeto base de memória crítica
        return {
            tituloRegime: "Regime Tributário",
            descricaoRegime: "Simulação de Split Payment e Reforma Tributária",
            formula: `Impacto = Valor do Imposto × Percentual de Implementação`,
            passoAPasso: [
                `1. Cálculo do Imposto Total: ${formatoMoeda(faturamento)} × ${(aliquota*100).toFixed(2)}% = ${formatoMoeda(valorImpostoTotal)}`,
                `2. Cálculo do Imposto Líquido: ${formatoMoeda(valorImpostoTotal)} - ${formatoMoeda(creditos)} = ${formatoMoeda(valorImpostoLiquido)}`
            ],
            observacoes: [
                `Distribuição de vendas: ${(percVista*100).toFixed(1)}% à vista e ${(percPrazo*100).toFixed(1)}% a prazo.`
            ]
        };
    }

    /**
     * Gera seção de análise de sensibilidade
     * @param {Object} dados - Dados da simulação
     * @param {number} diferencaCapitalGiro - Diferença no capital de giro
     * @param {number} ano - Ano da simulação
     * @returns {string} - Texto formatado
     */
    function gerarSecaoAnaliseSensibilidade(dados, diferencaCapitalGiro, ano) {
        let texto = '';

        // Tabela de sensibilidade para diferentes percentuais de implementação
        texto += `6.1. SENSIBILIDADE A DIFERENTES PERCENTUAIS DE IMPLEMENTAÇÃO:\n`;
        texto += `A tabela abaixo mostra o impacto no capital de giro para diferentes percentuais de implementação do Split Payment.\n\n`;
        texto += `| % Implementação | Impacto no Capital de Giro | % do Impacto Total |\n`;
        texto += `|----------------|----------------------------|--------------------|\n`;

        const impactoTotal = Math.abs(diferencaCapitalGiro / window.CurrentTaxSystem.obterPercentualImplementacao(ano));

        [10, 25, 40, 55, 70, 85, 100].forEach(percentual => {
            const impactoPercentual = impactoTotal * (percentual / 100);
            texto += `| ${percentual.toString().padStart(2, ' ')}%            | ${formatarMoeda(impactoPercentual).padEnd(28, ' ')} | ${percentual.toString().padStart(3, ' ')}%               |\n`;
        });

        texto += `\n`;

        // Sensibilidade a diferentes taxas de crescimento
        texto += `6.2. SENSIBILIDADE A DIFERENTES TAXAS DE CRESCIMENTO:\n`;
        texto += `A tabela abaixo mostra o impacto acumulado para diferentes cenários de crescimento.\n\n`;
        texto += `| Cenário       | Taxa de Crescimento | Impacto Acumulado (${ano}-2033) |\n`;
        texto += `|--------------|--------------------|---------------------------------|\n`;

        const cenarios = [
            { nome: "Recessão", taxa: -0.02 },
            { nome: "Conservador", taxa: 0.02 },
            { nome: "Moderado", taxa: 0.05 },
            { nome: "Otimista", taxa: 0.08 }
        ];

        cenarios.forEach(cenario => {
            // Cálculo simplificado do impacto acumulado
            const anos = 2033 - ano + 1;
            const fatorAcumulado = (1 - Math.pow(1 + cenario.taxa, anos)) / (1 - (1 + cenario.taxa));
            const impactoAcumulado = Math.abs(diferencaCapitalGiro) * fatorAcumulado;

            texto += `| ${cenario.nome.padEnd(14, ' ')} | ${(cenario.taxa * 100).toFixed(1).padStart(2, ' ')}%                | ${formatarMoeda(impactoAcumulado).padEnd(33, ' ')} |\n`;
        });

        return texto;
    }

    /**
     * Gera seção de projeção temporal
     * @param {Object} dados - Dados da simulação
     * @param {number} ano - Ano da simulação
     * @returns {string} - Texto formatado
     */
    function gerarSecaoProjecaoTemporal(dados, ano) {
        let texto = '';

        // Projeção anual até 2033
        texto += `7.1. PROJEÇÃO ANUAL DO IMPACTO NO CAPITAL DE GIRO:\n`;
        texto += `A tabela abaixo mostra a projeção do impacto no capital de giro até a implementação completa do Split Payment.\n\n`;
        texto += `| Ano  | % Implementação | Faturamento Projetado | Impacto no Capital de Giro | Necessidade Adicional |\n`;
        texto += `|------|----------------|------------------------|----------------------------|------------------------|\n`;

        let faturamentoAtual = dados.faturamento;
        const taxaCrescimento = dados.taxaCrescimento || (dados.cenario === 'conservador' ? 0.02 : dados.cenario === 'otimista' ? 0.08 : 0.05);

        for (let anoProj = ano; anoProj <= 2033; anoProj++) {
            const percentualImplementacao = window.CurrentTaxSystem.obterPercentualImplementacao(anoProj);
            const valorImposto = faturamentoAtual * dados.aliquota;
            const impactoCapitalGiro = -valorImposto * percentualImplementacao;
            const necessidadeAdicional = Math.abs(impactoCapitalGiro) * 1.2;

            texto += `| ${anoProj} | ${(percentualImplementacao * 100).toFixed(0).padStart(2, ' ')}%            | ${formatarMoeda(faturamentoAtual).padEnd(24, ' ')} | ${formatarMoeda(impactoCapitalGiro).padEnd(28, ' ')} | ${formatarMoeda(necessidadeAdicional).padEnd(24, ' ')} |\n`;

            // Atualizar faturamento para o próximo ano
            faturamentoAtual *= (1 + taxaCrescimento);
        }

        texto += `\n`;

        // Cálculo do impacto acumulado
        texto += `7.2. CÁLCULO DO IMPACTO ACUMULADO (${ano}-2033):\n`;

        let impactoAcumulado = 0;
        let custoFinanceiroAcumulado = 0;
        faturamentoAtual = dados.faturamento;

        for (let anoProj = ano; anoProj <= 2033; anoProj++) {
            const percentualImplementacao = window.CurrentTaxSystem.obterPercentualImplementacao(anoProj);
            const valorImposto = faturamentoAtual * dados.aliquota;
            const impactoCapitalGiro = -valorImposto * percentualImplementacao;
            const necessidadeAdicional = Math.abs(impactoCapitalGiro) * 1.2;
            const custoMensal = necessidadeAdicional * (dados.taxaCapitalGiro || 0.021);
            const custoAnual = custoMensal * 12;

            impactoAcumulado += necessidadeAdicional;
            custoFinanceiroAcumulado += custoAnual;

            // Atualizar faturamento para o próximo ano
            faturamentoAtual *= (1 + taxaCrescimento);
        }

        texto += `Necessidade Total de Capital de Giro: ${formatarMoeda(impactoAcumulado)}\n`;
        texto += `Custo Financeiro Total: ${formatarMoeda(custoFinanceiroAcumulado)}\n`;
        texto += `O cálculo considera o crescimento projetado do faturamento de ${(taxaCrescimento * 100).toFixed(1)}% ao ano.\n`;

        return texto;
    }

	 /* Formata um valor numérico para o formato monetário brasileiro (R$)
	 * @param {number|string} valor - Valor a ser formatado
	 * @returns {string} - Valor formatado como moeda
	 */
	 // Nova implementação da função de formatação
     // Nova implementação da função de formatação
    function formatarMoeda(valor) {
        // Verificação rápida
        if (valor === undefined || valor === null) {
            return 'R$ 0,00';
        }
        
        // Se já for string formatada como moeda
        if (typeof valor === 'string' && valor.indexOf('R$') >= 0) {
            return valor;
        }
        
        // Conversão simples e direta
        let num = 0;
        try {
            num = typeof valor === 'number' ? valor : 
                  parseFloat(String(valor).replace(/[^\d,.-]/g, '').replace(',', '.'));
        } catch (e) {
            return 'R$ 0,00';
        }
        
        if (isNaN(num)) {
            return 'R$ 0,00';
        }
        
        // Formatação direta sem regex
        const inteiro = Math.abs(Math.floor(num)).toString();
        const decimal = Math.abs(num).toFixed(2).slice(-2);
        
        // Formatação manual da parte inteira
        let resultado = '';
        for (let i = 0; i < inteiro.length; i++) {
            if (i > 0 && (inteiro.length - i) % 3 === 0) {
                resultado += '.';
            }
            resultado += inteiro.charAt(i);
        }
        
        if (num < 0) resultado = '-' + resultado;
        return 'R$ ' + resultado + ',' + decimal;
    }
    

    /**
     * Traduz o nome da estratégia para exibição
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

    /**
     * Função auxiliar para o cálculo do custo de uma estratégia
     * @param {string} nome - Nome da estratégia
     * @param {Object} resultado - Resultado da estratégia
     * @returns {number} - Custo da estratégia
     */
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

    // Retornar o objeto com funções públicas
    return {
        calcularTempoMedioCapitalGiro,
        calcularFatorSazonalidade,
        calcularFatorCrescimento,
        calcularOpcoesFinanciamento,
        calcularImpactoResultado,
        calcularAnaliseElasticidade,
        gerarMemoriaCritica,
        gerarSecaoAnaliseSensibilidade,
        gerarSecaoProjecaoTemporal,        
        traduzirNomeEstrategia,
		formatarMoeda: formatarMoeda,
		formatarValorSeguro: formatarMoeda, // Ambos apontam para a mesma função
        getFuncaoCusto		
    };
})();