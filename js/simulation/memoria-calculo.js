/**
 * Módulo de geração de memória de cálculo detalhada
 */
const MemoriaCalculoManager = {
    /**
     * Gera a memória de cálculo para um determinado ano
     * @param {Object} dados - Dados da simulação
     * @param {number} ano - Ano para geração da memória
     * @returns {string} Texto formatado da memória de cálculo
     */
    gerarMemoriaCalculo: function(dados, ano) {
        console.log('Gerando memória de cálculo para o ano:', ano);

        // Obter configurações e parâmetros
        const faturamentoMensal = parseFloat(dados.faturamentoMensal);
        const faturamentoAnual = faturamentoMensal * 12;
        const setor = dados.setor;
        const configSetor = SetoresUI.obterConfiguracoesSetor(setor);
        const aliquotaEfetiva = configSetor.aliquota;
        const prazoMedioRecebimento = parseFloat(dados.prazoMedioRecebimento) || 0;
        const prazoMedioPagamento = parseFloat(dados.prazoMedioPagamento) || 0;
        const prazoMedioEstoque = parseFloat(dados.prazoMedioEstoque) || 0;
        const cicloFinanceiro = prazoMedioEstoque + prazoMedioRecebimento - prazoMedioPagamento;
        const percentualVendaVista = parseFloat(dados.percentualVendaVista) || 30;
        const percentualVendaPrazo = 100 - percentualVendaVista;
        const margemOperacional = parseFloat(dados.margemOperacional) || 10;

        // Calcular impacto
        const valorImpostoMensal = faturamentoMensal * aliquotaEfetiva;
        const valorImpostoAnual = valorImpostoMensal * 12;
        const percentualImplementacao = SimulatorManager.obterPercentualImplementacao(ano);
        const impactoAnual = valorImpostoAnual * percentualImplementacao;

        // Cálculo do capital de giro
        const impactoRelativo = aliquotaEfetiva * percentualImplementacao;
        const impactoDias = prazoMedioRecebimento * impactoRelativo;
        const necessidadeCapitalGiro = (faturamentoMensal / 30) * impactoDias;

        // Impacto na rentabilidade
        const custoFinanceiroMensal = 0.02; // 2% a.m.
        const custoMensalCapitalGiro = impactoAnual / 12 * custoFinanceiroMensal;
        const custoAnualCapitalGiro = custoMensalCapitalGiro * 12;
        const impactoMargem = (custoAnualCapitalGiro / faturamentoAnual) * 100;
        const margemAjustada = margemOperacional - impactoMargem;

        // Formatar a memória de cálculo
        let memoria = '';

        memoria += `=== MEMÓRIA DE CÁLCULO - ANO ${ano} ===\n\n`;

        memoria += `=== PARÂMETROS BÁSICOS ===\n`;
        memoria += `Faturamento Mensal: R$ ${Formatters.formatarMoeda(faturamentoMensal)}\n`;
        memoria += `Alíquota Efetiva: ${Formatters.formatarPercentual(aliquotaEfetiva * 100)}\n`;
        memoria += `Prazo Médio de Recebimento: ${prazoMedioRecebimento} dias\n`;
        memoria += `Prazo Médio de Pagamento: ${prazoMedioPagamento} dias\n`;
        memoria += `Prazo Médio de Estoque: ${prazoMedioEstoque} dias\n`;
        memoria += `Ciclo Financeiro: ${cicloFinanceiro} dias\n`;
        memoria += `Percentual de Vendas à Vista: ${percentualVendaVista}%\n`;
        memoria += `Percentual de Vendas a Prazo: ${percentualVendaPrazo}%\n\n`;

        memoria += `=== CÁLCULO DO IMPACTO NO FLUXO DE CAIXA ===\n`;
        memoria += `Valor do Imposto Mensal: R$ ${Formatters.formatarMoeda(faturamentoMensal)} × ${Formatters.formatarPercentual(aliquotaEfetiva * 100)} = R$ ${Formatters.formatarMoeda(valorImpostoMensal)}\n`;
        memoria += `Percentual de Implementação (${ano}): ${Formatters.formatarPercentual(percentualImplementacao * 100)}\n`;
        memoria += `Impacto no Fluxo de Caixa: R$ ${Formatters.formatarMoeda(valorImpostoAnual)} × ${Formatters.formatarPercentual(percentualImplementacao * 100)} = R$ ${Formatters.formatarMoeda(impactoAnual)}\n\n`;

        memoria += `=== ANÁLISE DO CAPITAL DE GIRO ===\n`;
        memoria += `Impacto em Dias de Faturamento: ${prazoMedioRecebimento} × ${Formatters.formatarPercentual(impactoRelativo * 100)} = ${Formatters.formatarNumero(impactoDias, 2)} dias\n`;
        memoria += `Necessidade Adicional de Capital de Giro: R$ ${Formatters.formatarMoeda(necessidadeCapitalGiro)}\n\n`;

        memoria += `=== IMPACTO NA RENTABILIDADE ===\n`;
        memoria += `Margem Operacional Original: ${Formatters.formatarPercentual(margemOperacional)}\n`;
        memoria += `Custo Financeiro Mensal: R$ ${Formatters.formatarMoeda(impactoAnual / 12)} × ${Formatters.formatarPercentual(custoFinanceiroMensal * 100)} = R$ ${Formatters.formatarMoeda(custoMensalCapitalGiro)}\n`;
        memoria += `Custo Financeiro Anual: R$ ${Formatters.formatarMoeda(custoMensalCapitalGiro)} × 12 = R$ ${Formatters.formatarMoeda(custoAnualCapitalGiro)}\n`;
        memoria += `Impacto na Margem: R$ ${Formatters.formatarMoeda(custoAnualCapitalGiro)} ÷ R$ ${Formatters.formatarMoeda(faturamentoAnual)} = ${Formatters.formatarPercentual(impactoMargem)}\n`;
        memoria += `Margem Ajustada: ${Formatters.formatarPercentual(margemOperacional)} - ${Formatters.formatarPercentual(impactoMargem)} = ${Formatters.formatarPercentual(margemAjustada)}\n`;

        return memoria;
    },

    /**
     * Gera a memória de cálculo para as estratégias de mitigação
     * @param {Object} dados - Dados da simulação
     * @param {Object} estrategias - Resultados das estratégias de mitigação
     * @returns {string} Texto formatado da memória de cálculo das estratégias
     */
    gerarMemoriaCalculoEstrategias: function(dados, estrategias) {
        console.log('Gerando memória de cálculo para estratégias:', estrategias);

        let memoria = '';

        memoria += `=== IMPACTO DAS ESTRATÉGIAS DE MITIGAÇÃO ===\n\n`;

        // Ajuste de Preços
        if (estrategias.ajustePrecos) {
            const e = estrategias.ajustePrecos;
            memoria += `=== AJUSTE DE PREÇOS ===\n`;
            memoria += `Percentual de Aumento: ${Formatters.formatarPercentual(e.percentualAumento)}\n`;
            memoria += `Elasticidade-Preço: ${Formatters.formatarNumero(e.elasticidadePreco, 2)}\n`;
            memoria += `Impacto nas Vendas: ${Formatters.formatarPercentual(e.impactoDemanda)}\n`;
            memoria += `Efeito Líquido no Fluxo: R$ ${Formatters.formatarMoeda(e.compensacao)}\n\n`;
        }

        // Renegociação de Prazos
        if (estrategias.renegociacaoPrazos) {
            const e = estrategias.renegociacaoPrazos;
            memoria += `=== RENEGOCIAÇÃO DE PRAZOS ===\n`;
            memoria += `Aumento do Prazo: ${e.aumentoPrazo} dias\n`;
            memoria += `Percentual de Fornecedores: ${Formatters.formatarPercentual(e.percentualFornecedores)}\n`;
            memoria += `Custo da Contrapartida: ${Formatters.formatarPercentual(e.custoContrapartida)}\n`;
            memoria += `Efeito Líquido no Fluxo: R$ ${Formatters.formatarMoeda(e.impactoLiquido)}\n\n`;
        }

        // Antecipação de Recebíveis
        if (estrategias.antecipacaoRecebiveis) {
            const e = estrategias.antecipacaoRecebiveis;
            memoria += `=== ANTECIPAÇÃO DE RECEBÍVEIS ===\n`;
            memoria += `Percentual de Antecipação: ${Formatters.formatarPercentual(e.percentualAntecipacao)}\n`;
            memoria += `Taxa de Desconto: ${Formatters.formatarPercentual(e.taxaDesconto)} a.m.\n`;
            memoria += `Prazo Médio Antecipado: ${e.prazoMedioAntecipado} dias\n`;
            memoria += `Efeito Líquido no Fluxo: R$ ${Formatters.formatarMoeda(e.beneficioAntecipacao)}\n\n`;
        }

        // Resultado Combinado
        if (estrategias.combinada) {
            const e = estrategias.combinada;
            memoria += `=== RESULTADO COMBINADO ===\n`;
            memoria += `Impacto Original do Split Payment: R$ ${Formatters.formatarMoeda(e.impactoOriginal)}\n`;
            memoria += `Mitigação Total: R$ ${Formatters.formatarMoeda(e.impactoCombinado)}\n`;
            memoria += `Impacto Residual: R$ ${Formatters.formatarMoeda(e.impactoResidual)} (${Formatters.formatarPercentual(100 - e.percentualMitigacao)} do impacto original)\n`;
        }

        return memoria;
    }
};