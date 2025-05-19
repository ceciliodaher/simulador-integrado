/**
 * Módulo de Cálculos Fundamentais para o Simulador de Split Payment
 * Fornece as funções matemáticas e utilitários básicos para os cálculos
 * 
 * @author Expertzy Inteligência Tributária
 * @version 1.0.0
 */

// No início do arquivo calculation-core.js (antes de qualquer código)
// Garantir que o objeto exista antes de qualquer tentativa de acesso
// Inicializar o objeto se não existir
window.CalculationCore = window.CalculationCore || {
    formatarMoeda: function(valor) {
        return typeof valor === 'number' ? 
               'R$ ' + valor.toFixed(2).replace('.', ',') : 
               'R$ 0,00';
    }
};

// Verificar disponibilidade do DataManager
if (typeof window.DataManager === 'undefined') {
    console.warn('DataManager não encontrado. Algumas validações de dados podem não funcionar corretamente.');
}

// Módulo principal
window.CalculationCore = (function() {
    
    /**
     * Calcula o tempo médio do capital em giro
     * @param {number} pmr - Prazo Médio de Recebimento em dias
     * @param {number} prazoRecolhimento - Prazo para recolhimento do imposto em dias
     * @param {number} percVista - Percentual de vendas à vista (decimal 0-1)
     * @param {number} percPrazo - Percentual de vendas a prazo (decimal 0-1)
     * @returns {number} - Tempo médio em dias
     */
    function calcularTempoMedioCapitalGiro(pmr, prazoRecolhimento, percVista, percPrazo) {
        // Validar e normalizar entradas
        pmr = typeof pmr === 'number' && !isNaN(pmr) ? pmr : 0;
        prazoRecolhimento = typeof prazoRecolhimento === 'number' && !isNaN(prazoRecolhimento) ? prazoRecolhimento : 0;
        percVista = typeof percVista === 'number' && !isNaN(percVista) ? percVista : 0;
        percPrazo = typeof percPrazo === 'number' && !isNaN(percPrazo) ? percPrazo : 0;

        // Para vendas à vista: tempo = prazo recolhimento
        const tempoVista = prazoRecolhimento;

        // Para vendas a prazo: tempo = prazo recolhimento - pmr (se pmr < prazo recolhimento)
        // Para vendas a prazo: tempo = 0 (se pmr >= prazo recolhimento)
        const tempoPrazo = Math.max(0, prazoRecolhimento - pmr);

        // Tempo médio ponderado
        return (percVista * tempoVista) + (percPrazo * tempoPrazo);
    }

    /**
     * Calcula o fator de sazonalidade para ajuste da necessidade de capital
     * @param {Object} dados - Dados planos de simulação
     * @returns {number} - Fator de sazonalidade
     */
    function calcularFatorSazonalidade(dados) {
        // Validar dados de entrada
        if (!dados || typeof dados !== 'object') {
            console.warn('Dados inválidos fornecidos para calcularFatorSazonalidade. Usando valor padrão.');
            return 1.3;
        }

        // Certificar-se de que estamos trabalhando com a estrutura plana
        if (dados.empresa !== undefined) {
            console.warn('Estrutura aninhada detectada em calcularFatorSazonalidade. Use DataManager.converterParaEstruturaPlana().');
            return 1.3;
        }

        // Implementação básica: fator padrão de 1.3 (30% de aumento)
        // Em uma implementação real, este cálculo seria baseado em dados históricos
        // de sazonalidade específicos da empresa ou do setor
        return 1.3;
    }

    /**
     * Calcula o fator de crescimento para ajuste da necessidade de capital
     * @param {Object} dados - Dados planos de simulação
     * @param {number} ano - Ano de referência
     * @returns {number} - Fator de crescimento
     */
    function calcularFatorCrescimento(dados, ano) {
        // Validar dados de entrada
        if (!dados || typeof dados !== 'object') {
            console.warn('Dados inválidos fornecidos para calcularFatorCrescimento. Usando cenário moderado.');
            return Math.pow(1 + 0.05, (ano - 2026));
        }

        // Certificar-se de que estamos trabalhando com a estrutura plana
        if (dados.empresa !== undefined) {
            console.warn('Estrutura aninhada detectada em calcularFatorCrescimento. Use DataManager.converterParaEstruturaPlana().');
            // Tenta extrair os dados necessários da estrutura aninhada como fallback
            const dadosPlanos = window.DataManager ? 
                window.DataManager.converterParaEstruturaPlana(dados) : 
                { cenario: 'moderado', taxaCrescimento: 0.05 };

            return calcularFatorCrescimento(dadosPlanos, ano);
        }

        // Normalizar dados
        ano = typeof ano === 'number' && !isNaN(ano) ? ano : 2026;
        const cenario = dados.cenario || 'moderado';
        const taxaCrescimentoPersonalizada = typeof dados.taxaCrescimento === 'number' && !isNaN(dados.taxaCrescimento) ? 
                                            dados.taxaCrescimento : null;

        // Definir taxa de crescimento com base no cenário
        let taxaCrescimento = 0.05; // Padrão: moderado (5% a.a.)

        if (cenario === 'conservador') {
            taxaCrescimento = 0.02; // 2% a.a.
        } else if (cenario === 'otimista') {
            taxaCrescimento = 0.08; // 8% a.a.
        } else if (cenario === 'personalizado' && taxaCrescimentoPersonalizada !== null) {
            taxaCrescimento = taxaCrescimentoPersonalizada;
        }

        // Calcular fator para o ano de referência
        const anoInicial = 2026;
        const anosDecorridos = ano - anoInicial;

        // Crescimento composto para o número de anos
        return Math.pow(1 + taxaCrescimento, anosDecorridos);
    }

    /**
     * Calcula as opções de financiamento para a necessidade de capital
     * @param {Object} dados - Dados planos de simulação
     * @param {number} valorNecessidade - Valor da necessidade de capital
     * @returns {Object} - Opções de financiamento
     */
    function calcularOpcoesFinanciamento(dados, valorNecessidade) {
        // Validar dados de entrada
        if (!dados || typeof dados !== 'object') {
            console.warn('Dados inválidos fornecidos para calcularOpcoesFinanciamento. Usando valores padrão.');
            dados = {};
        }

        // Certificar-se de que estamos trabalhando com a estrutura plana
        if (dados.empresa !== undefined) {
            console.warn('Estrutura aninhada detectada em calcularOpcoesFinanciamento. Use DataManager.converterParaEstruturaPlana().');
            // Tenta extrair os dados necessários da estrutura aninhada como fallback
            const dadosPlanos = window.DataManager ? 
                window.DataManager.converterParaEstruturaPlana(dados) : 
                {};

            return calcularOpcoesFinanciamento(dadosPlanos, valorNecessidade);
        }

        // Normalizar valor de necessidade
        valorNecessidade = typeof valorNecessidade === 'number' && !isNaN(valorNecessidade) ? 
                          valorNecessidade : 0;

        // Extrair e normalizar parâmetros relevantes do objeto plano
        const taxaCapitalGiro = typeof dados.taxaCapitalGiro === 'number' && !isNaN(dados.taxaCapitalGiro) ? 
                               dados.taxaCapitalGiro : 0.021;
        const taxaAntecipacao = typeof dados.taxaAntecipacao === 'number' && !isNaN(dados.taxaAntecipacao) ? 
                               dados.taxaAntecipacao : 0.018;
        const spreadBancario = typeof dados.spreadBancario === 'number' && !isNaN(dados.spreadBancario) ? 
                              dados.spreadBancario : 0.005;
        const faturamento = typeof dados.faturamento === 'number' && !isNaN(dados.faturamento) ? 
                           dados.faturamento : 0;
        const percPrazo = typeof dados.percPrazo === 'number' && !isNaN(dados.percPrazo) ? 
                         dados.percPrazo : 0.7;

        // Definir opções de financiamento disponíveis
        const opcoes = [
            {
                tipo: "Capital de Giro",
                taxaMensal: taxaCapitalGiro,
                prazo: 12,
                carencia: 3,
                valorMaximo: valorNecessidade * 1.5
            },
            {
                tipo: "Antecipação de Recebíveis",
                taxaMensal: taxaAntecipacao,
                prazo: 6,
                carencia: 0,
                valorMaximo: faturamento * percPrazo * 3
            },
            {
                tipo: "Empréstimo Bancário",
                taxaMensal: taxaCapitalGiro + spreadBancario,
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
     * @param {Object} dados - Dados planos de simulação
     * @param {number} custoAnual - Custo financeiro anual
     * @returns {Object} - Análise de impacto no resultado
     */
    function calcularImpactoResultado(dados, custoAnual) {
        // Validar dados de entrada
        if (!dados || typeof dados !== 'object') {
            console.warn('Dados inválidos fornecidos para calcularImpactoResultado. Usando valores padrão.');
            dados = {};
        }

        // Certificar-se de que estamos trabalhando com a estrutura plana
        if (dados.empresa !== undefined) {
            console.warn('Estrutura aninhada detectada em calcularImpactoResultado. Use DataManager.converterParaEstruturaPlana().');
            const dadosPlanos = window.DataManager ? 
                window.DataManager.converterParaEstruturaPlana(dados) : 
                { faturamento: 0, margem: 0 };

            return calcularImpactoResultado(dadosPlanos, custoAnual);
        }

        // Normalizar parâmetros
        custoAnual = typeof custoAnual === 'number' && !isNaN(custoAnual) ? custoAnual : 0;
        const faturamento = typeof dados.faturamento === 'number' && !isNaN(dados.faturamento) ? 
                           dados.faturamento : 0;
        const margem = typeof dados.margem === 'number' && !isNaN(dados.margem) ? 
                      dados.margem : 0;

        // Calcular faturamento anual
        const faturamentoAnual = faturamento * 12;

        // Calcular lucro operacional anual
        const lucroOperacionalAnual = faturamentoAnual * margem;

        // Calcular percentuais com proteção contra divisão por zero
        const percentualDaReceita = faturamentoAnual > 0 ? 
                                  (custoAnual / faturamentoAnual) * 100 : 0;
        const percentualDoLucro = lucroOperacionalAnual > 0 ? 
                                (custoAnual / lucroOperacionalAnual) * 100 : 0;

        // Calcular resultado ajustado
        const resultadoAjustado = lucroOperacionalAnual - custoAnual;
        const margemAjustada = faturamentoAnual > 0 ? 
                              resultadoAjustado / faturamentoAnual : 0;

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
     * @param {Object} dados - Dados planos de simulação
     * @param {number} anoInicial - Ano inicial da simulação
     * @param {number} anoFinal - Ano final da simulação
     * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
     * @returns {Object} - Análise de elasticidade
     */
    function calcularAnaliseElasticidade(dados, anoInicial, anoFinal, parametrosSetoriais = null) {
        // Validar dados de entrada
        if (!dados || typeof dados !== 'object') {
            console.warn('Dados inválidos fornecidos para calcularAnaliseElasticidade. Usando valores padrão.');
            dados = {};
        }

        // Certificar-se de que estamos trabalhando com a estrutura plana
        if (dados.empresa !== undefined) {
            console.warn('Estrutura aninhada detectada em calcularAnaliseElasticidade. Use DataManager.converterParaEstruturaPlana().');
            const dadosPlanos = window.DataManager ? 
                window.DataManager.converterParaEstruturaPlana(dados) : 
                { faturamento: 0, aliquota: 0.265, taxaCapitalGiro: 0.021 };

            return calcularAnaliseElasticidade(dadosPlanos, anoInicial, anoFinal, parametrosSetoriais);
        }

        // Normalizar parâmetros
        anoInicial = typeof anoInicial === 'number' && !isNaN(anoInicial) ? anoInicial : 2026;
        anoFinal = typeof anoFinal === 'number' && !isNaN(anoFinal) ? anoFinal : 2033;
        const faturamento = typeof dados.faturamento === 'number' && !isNaN(dados.faturamento) ? 
                           dados.faturamento : 0;
        const aliquota = typeof dados.aliquota === 'number' && !isNaN(dados.aliquota) ? 
                        dados.aliquota : 0.265;
        const taxaCapitalGiro = typeof dados.taxaCapitalGiro === 'number' && !isNaN(dados.taxaCapitalGiro) ? 
                               dados.taxaCapitalGiro : 0.021;

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
            const impactoBase = faturamento * aliquota;
            const fatorCrescimento = Math.pow(1 + cenario.taxa, (anoFinal - anoInicial));
            const impactoEstimado = impactoBase * fatorCrescimento * (anoFinal - anoInicial + 1) * 0.5;

            resultados[cenario.nome] = {
                taxa: cenario.taxa,
                impactoAcumulado: impactoEstimado,
                custoFinanceiroTotal: impactoEstimado * taxaCapitalGiro * 12,
                impactoMedioMargem: faturamento > 0 ? 
                                   (impactoEstimado / faturamento) * taxaCapitalGiro : 0
            };
        });

        // Calcular elasticidade (variação percentual do impacto / variação percentual da taxa)
        const elasticidades = {};
        const referenciaImpacto = resultados.Moderado.impactoAcumulado;
        const referenciaTaxa = resultados.Moderado.taxa;

        cenarios.forEach(cenario => {
            if (cenario.nome !== "Moderado") {
                const variacaoImpacto = referenciaImpacto > 0 ? 
                                      (resultados[cenario.nome].impactoAcumulado - referenciaImpacto) / referenciaImpacto : 0;
                const variacaoTaxa = referenciaTaxa !== 0 ? 
                                   (cenario.taxa - referenciaTaxa) / referenciaTaxa : 0;
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
     * @param {Object} dados - Dados planos de simulação
     * @param {Object} valores - Valores adicionais para cálculo (opcional)
     * @returns {Object} - Memória crítica de cálculo
     */
    function gerarMemoriaCritica(dados, valores = null) {
        // Validar dados de entrada
        if (!dados || typeof dados !== 'object') {
            console.warn('Dados inválidos fornecidos para gerarMemoriaCritica. Usando valores padrão.');
            dados = {};
        }

        // Certificar-se de que estamos trabalhando com a estrutura plana
        if (dados.empresa !== undefined) {
            console.warn('Estrutura aninhada detectada em gerarMemoriaCritica. Use DataManager.converterParaEstruturaPlana().');
            const dadosPlanos = window.DataManager ? 
                window.DataManager.converterParaEstruturaPlana(dados) : 
                {};

            return gerarMemoriaCritica(dadosPlanos, valores);
        }

        // Extrair parâmetros relevantes com validação
        const faturamento = typeof dados.faturamento === 'number' && !isNaN(dados.faturamento) ? 
                           dados.faturamento : 0;
        const aliquota = typeof dados.aliquota === 'number' && !isNaN(dados.aliquota) ? 
                        dados.aliquota : 0;
        const creditos = typeof dados.creditos === 'number' && !isNaN(dados.creditos) ? 
                        dados.creditos : 0;
        const percVista = typeof dados.percVista === 'number' && !isNaN(dados.percVista) ? 
                         dados.percVista : 0;
        const percPrazo = typeof dados.percPrazo === 'number' && !isNaN(dados.percPrazo) ? 
                         dados.percPrazo : 0;

        // Calcular valores básicos sem recursão
        const valorImpostoTotal = faturamento * aliquota;
        const valorImpostoLiquido = Math.max(0, valorImpostoTotal - creditos);

        // Usar função formatarMoeda do DataManager se disponível, senão usar implementação local
        const formatoMoeda = window.DataManager?.formatarMoeda || function(valor) {
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

	/**
     * Formata um valor numérico para o formato monetário brasileiro (R$)
     * @param {number|string} valor - Valor a ser formatado
     * @returns {string} - Valor formatado como moeda
     */
    function formatarMoeda(valor) {
        // Utilizar formatador do DataManager se disponível
        if (window.DataManager && typeof window.DataManager.formatarMoeda === 'function') {
            return window.DataManager.formatarMoeda(valor);
        }

        // Implementação local (fallback)
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