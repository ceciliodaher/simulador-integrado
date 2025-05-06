// Novo arquivo: js/simulation/credit-compensation.js

/**
 * Módulo de Compensação de Créditos Inteligente
 * Implementa o modelo de compensação de créditos conforme a seção 3.2.2 da metodologia
 */
const CreditCompensationModule = (function() {
    
    /**
     * Calcula a retenção efetiva considerando compensação de créditos
     * @param {number} debitoTributario - Valor do débito tributário
     * @param {number} creditosDisponiveis - Valor dos créditos disponíveis
     * @param {string} tipoCompensacao - Tipo de compensação ('automatica', 'mensal', 'trimestral')
     * @returns {Object} - Resultado da compensação
     */
    function calcularRetencaoEfetiva(debitoTributario, creditosDisponiveis, tipoCompensacao = 'automatica') {
        let retencaoEfetiva = 0;
        let creditosUtilizados = 0;
        let creditosRemanescentes = 0;
        
        // Compensação automática (em tempo real)
        if (tipoCompensacao === 'automatica') {
            if (creditosDisponiveis >= debitoTributario) {
                retencaoEfetiva = 0;
                creditosUtilizados = debitoTributario;
            } else {
                retencaoEfetiva = debitoTributario - creditosDisponiveis;
                creditosUtilizados = creditosDisponiveis;
            }
            creditosRemanescentes = Math.max(0, creditosDisponiveis - creditosUtilizados);
        } 
        // Compensação mensal (pós-retenção)
        else if (tipoCompensacao === 'mensal') {
            // No regime mensal, a retenção ocorre normalmente e a compensação é posterior
            retencaoEfetiva = debitoTributario;
            
            // Mas calculamos o benefício líquido para o fluxo de caixa
            creditosUtilizados = Math.min(creditosDisponiveis, debitoTributario);
            creditosRemanescentes = Math.max(0, creditosDisponiveis - creditosUtilizados);
        }
        // Compensação trimestral (pós-retenção)
        else if (tipoCompensacao === 'trimestral') {
            // No regime trimestral, a retenção ocorre normalmente
            retencaoEfetiva = debitoTributario;
            
            // Mas o benefício da compensação é futuro e diluído
            creditosUtilizados = Math.min(creditosDisponiveis, debitoTributario);
            creditosRemanescentes = Math.max(0, creditosDisponiveis - creditosUtilizados);
        }
        
        return {
            debitoTributario,
            creditosDisponiveis,
            retencaoEfetiva,
            creditosUtilizados,
            creditosRemanescentes,
            tipoCompensacao
        };
    }
    
    /**
     * Calcula o impacto no fluxo de caixa considerando o regime de compensação
     * @param {Object} resultado - Resultado de calcularRetencaoEfetiva
     * @returns {Object} - Impacto no fluxo de caixa
     */
    function calcularImpactoFluxoCaixa(resultado) {
        let impactoImediato = resultado.retencaoEfetiva;
        let beneficioFuturo = 0;
        let prazoRecebimentoBeneficio = 0;
        
        // Impacto varia conforme o tipo de compensação
        if (resultado.tipoCompensacao === 'automatica') {
            // Em compensação automática, o benefício é imediato (redução da retenção)
            // Não há benefício futuro específico a calcular
            beneficioFuturo = 0;
            prazoRecebimentoBeneficio = 0;
        } 
        else if (resultado.tipoCompensacao === 'mensal') {
            // Em compensação mensal, o benefício vem no próximo mês
            beneficioFuturo = resultado.creditosUtilizados;
            prazoRecebimentoBeneficio = 30; // 30 dias
        }
        else if (resultado.tipoCompensacao === 'trimestral') {
            // Em compensação trimestral, o benefício vem em 3 meses
            beneficioFuturo = resultado.creditosUtilizados;
            prazoRecebimentoBeneficio = 90; // 90 dias
        }
        
        return {
            impactoImediato,
            beneficioFuturo,
            prazoRecebimentoBeneficio,
            impactoLiquidoDescontado: impactoImediato - (beneficioFuturo / (1 + 0.01) ** (prazoRecebimentoBeneficio / 30)),
            tipoCompensacao: resultado.tipoCompensacao
        };
    }
    
    // API pública
    return {
        calcularRetencaoEfetiva,
        calcularImpactoFluxoCaixa
    };
})();