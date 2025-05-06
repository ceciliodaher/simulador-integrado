/**
 * Módulo de estratégias de mitigação do impacto do Split Payment
 * Implementa os cálculos detalhados para cada estratégia
 */
const StrategiesManager = {
    /**
     * Calcula o impacto da estratégia de ajuste de preços
     * Compensacao_AP = F × AP × (1 + (EP × AP)/100)
     * @param {Object} dados - Dados da simulação
     * @param {Object} parametros - Parâmetros específicos da estratégia
     * @returns {Object} Resultado do cálculo
     */
    calcularAjustePrecos: function(dados, parametros) {
        console.log('Calculando estratégia de ajuste de preços', parametros);

        const faturamentoMensal = parseFloat(dados.faturamentoMensal);
        const percentualAumento = parseFloat(parametros.percentualAumento) / 100;
        const elasticidadePreco = parseFloat(parametros.elasticidadePreco);

        // Calcular o impacto na demanda
        const impactoDemanda = percentualAumento * elasticidadePreco;

        // Calcular a compensação pelo ajuste de preços
        const compensacao = faturamentoMensal * percentualAumento * (1 + (elasticidadePreco * percentualAumento) / 100);

        return {
            faturamentoOriginal: faturamentoMensal,
            percentualAumento: percentualAumento * 100,
            elasticidadePreco: elasticidadePreco,
            impactoDemanda: impactoDemanda * 100,
            faturamentoAjustado: faturamentoMensal * (1 + percentualAumento) * (1 - impactoDemanda),
            compensacao: compensacao,
            eficacia: (compensacao / (faturamentoMensal * 0.265)) * 100 // Eficácia em relação ao impacto típico
        };
    },

    /**
     * Calcula o impacto da estratégia de renegociação de prazos com fornecedores
     * Impacto_RP = PF × (AP/30) × PP × (1 - CP/100)
     * @param {Object} dados - Dados da simulação
     * @param {Object} parametros - Parâmetros específicos da estratégia
     * @returns {Object} Resultado do cálculo
     */
    calcularRenegociacaoPrazos: function(dados, parametros) {
        console.log('Calculando estratégia de renegociação de prazos', parametros);

        const pagamentosFornecedores = parseFloat(dados.custosMensais || dados.faturamentoMensal * 0.7); // 70% do faturamento se não informado
        const aumentoPrazo = parseFloat(parametros.aumentoPrazo);
        const percentualFornecedores = parseFloat(parametros.percentualFornecedores) / 100;
        const custoContrapartida = parseFloat(parametros.custoContrapartida) / 100;

        // Calcular o impacto da renegociação
        const impactoBruto = pagamentosFornecedores * (aumentoPrazo / 30) * percentualFornecedores;
        const custoTotal = impactoBruto * custoContrapartida;
        const impactoLiquido = impactoBruto - custoTotal;

        return {
            pagamentosFornecedores: pagamentosFornecedores,
            aumentoPrazo: aumentoPrazo,
            percentualFornecedores: percentualFornecedores * 100,
            custoContrapartida: custoContrapartida * 100,
            impactoBruto: impactoBruto,
            custoTotal: custoTotal,
            impactoLiquido: impactoLiquido,
            eficacia: (impactoLiquido / (dados.faturamentoMensal * 0.265)) * 100 // Eficácia em relação ao impacto típico
        };
    },

    /**
     * Calcula o impacto da estratégia de antecipação de recebíveis
     * Impacto_AR = F × (PP/100) × PA × PMA × (1 - (TA × PMA)/(30 × 100))
     * @param {Object} dados - Dados da simulação
     * @param {Object} parametros - Parâmetros específicos da estratégia
     * @returns {Object} Resultado do cálculo
     */
    calcularAntecipacaoRecebiveis: function(dados, parametros) {
        console.log('Calculando estratégia de antecipação de recebíveis', parametros);

        const faturamentoMensal = parseFloat(dados.faturamentoMensal);
        const percentualPrazo = parseFloat(parametros.percentualPrazo) / 100;
        const percentualAntecipacao = parseFloat(parametros.percentualAntecipacao) / 100;
        const prazoMedioAntecipado = parseFloat(parametros.prazoMedioAntecipado);
        const taxaDesconto = parseFloat(parametros.taxaDesconto) / 100;

        // Calcular o impacto da antecipação
        const valorAntecipado = faturamentoMensal * percentualPrazo * percentualAntecipacao;
        const custoAntecipacao = valorAntecipado * (taxaDesconto * prazoMedioAntecipado) / 30;
        const beneficioAntecipacao = valorAntecipado * (1 - (taxaDesconto * prazoMedioAntecipado) / (30 * 100));

        return {
            faturamentoMensal: faturamentoMensal,
            percentualPrazo: percentualPrazo * 100,
            percentualAntecipacao: percentualAntecipacao * 100,
            prazoMedioAntecipado: prazoMedioAntecipado,
            taxaDesconto: taxaDesconto * 100,
            valorAntecipado: valorAntecipado,
            custoAntecipacao: custoAntecipacao,
            beneficioAntecipacao: beneficioAntecipacao,
            eficacia: (beneficioAntecipacao / (faturamentoMensal * 0.265)) * 100 // Eficácia em relação ao impacto típico
        };
    },

    /**
     * Calcula a eficácia combinada de múltiplas estratégias
     * @param {Object} dados - Dados da simulação
     * @param {Array} estrategias - Array de resultados das estratégias individuais
     * @returns {Object} Resultado do cálculo da estratégia combinada
     */
    calcularEstrategiaCombinada: function(dados, estrategias) {
        console.log('Calculando eficácia combinada das estratégias', estrategias);

        const impactoOriginal = parseFloat(dados.impactoCapitalGiro || dados.faturamentoMensal * 0.265);

        // Calcular o impacto combinado considerando fatores de interação
        let impactoCombinado = 0;
        let eficaciaCombinada = 0;

        // Fatores de interação para evitar dupla contagem
        const fatoresInteracao = {
            'ajustePrecos': 1.0,
            'renegociacaoPrazos': 0.9,
            'antecipacaoRecebiveis': 0.8,
            'capitalGiro': 0.7,
            'ajusteMixProdutos': 0.9,
            'incentivoMeiosPagamento': 0.8
        };

        // Calcular o impacto combinado
        estrategias.forEach((estrategia) => {
            const tipoEstrategia = Object.keys(estrategia)[0];
            const resultado = estrategia[tipoEstrategia];

            // Aplicar o fator de interação
            const fatorInteracao = fatoresInteracao[tipoEstrategia] || 0.8;

            // Verificar eficácia ou impacto líquido, dependendo da estratégia
            let contribuicao = 0;
            if (resultado.eficacia) {
                contribuicao = (resultado.eficacia / 100) * impactoOriginal * fatorInteracao;
            } else if (resultado.impactoLiquido) {
                contribuicao = resultado.impactoLiquido * fatorInteracao;
            } else if (resultado.beneficioLiquido) {
                contribuicao = resultado.beneficioLiquido * fatorInteracao;
            }

            impactoCombinado += contribuicao;
        });

        // Calcular a eficácia combinada
        eficaciaCombinada = (impactoCombinado / impactoOriginal) * 100;

        return {
            impactoOriginal: impactoOriginal,
            impactoCombinado: impactoCombinado,
            eficaciaCombinada: eficaciaCombinada,
            impactoResidual: impactoOriginal - impactoCombinado,
            percentualMitigacao: eficaciaCombinada
        };
    }
};