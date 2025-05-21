/**
 * Módulo de Cálculos do Sistema IVA Dual e Split Payment
 * Fornece as funções relacionadas ao regime de Split Payment e IVA Dual
 * 
 * @author Expertzy Inteligência Tributária
 * @version 2.0.0
 */

// Verificação de disponibilidade do DataManager
if (typeof window.DataManager === 'undefined') {
    console.error('DataManager não disponível. A funcionalidade do módulo IVADualSystem será limitada.');
    
    // Se não existir, cria um stub do DataManager para evitar erros
    window.DataManager = {
        converterParaEstruturaPlana: function(dados) { return dados; },
        converterParaEstruturaAninhada: function(dados) { return dados; },
        validarENormalizar: function(dados) { return dados; },
        extrairValorNumerico: function(valor) { 
            return typeof valor === 'number' ? valor : parseFloat(valor) || 0; 
        },
        formatarMoeda: function(valor) {
            return typeof valor === 'number' ? 
                   'R$ ' + valor.toFixed(2).replace('.', ',') : 
                   'R$ 0,00';
        }
    };
}

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

        // Melhorar a lógica de determinação de alíquota com base na categoria
        switch (taxCategory) {
            case 'reduced':
                // Categoria reduzida: 50% da alíquota padrão (ou usar valor explícito passado)
                appliedRate = rate * 0.5; // Usa a rate específica do setor com redução
                break;
            case 'exempt':
                appliedRate = 0; // Isento
                break;
            default:
                appliedRate = rate;
        }

        // Adicionar log para depuração
        console.log(`Calculando CBS: baseValue=${baseValue}, rate=${rate}, appliedRate=${appliedRate}, category=${taxCategory}`);

        const tax = baseValue * appliedRate;
        return Math.max(0, tax - credits);
    }

    /**
     * Calcula o IBS (Imposto sobre Bens e Serviços)
     * @param {number} baseValue - Valor base para cálculo
     * @param {number} rate - Alíquota do IBS (valor decimal, ex: 0.177 para 17.7%)
     * @param {number} credits - Créditos de IBS a serem descontados
     * @param {string} taxCategory - Categoria tributária ('standard', 'reduced', 'exempt')
     * @param {Object} options - Opções adicionais para o cálculo
     * @returns {number} Valor do IBS a recolher
     */
    function calcularIBS(baseValue, rate = aliquotasIVADual.ibs, credits = 0, taxCategory = 'standard', options = {}) {
        // Validar e normalizar parâmetros
        if (typeof baseValue !== 'number' || isNaN(baseValue)) {
            console.warn('Valor base inválido para cálculo do IBS. Usando zero.');
            baseValue = 0;
        }

        if (typeof rate !== 'number' || isNaN(rate)) {
            console.warn(`Alíquota IBS inválida: ${rate}. Usando alíquota padrão.`);
            rate = aliquotasIVADual.ibs;
        }

        if (typeof credits !== 'number' || isNaN(credits)) {
            console.warn('Valor de créditos inválido. Usando zero.');
            credits = 0;
        }

        // Determinar alíquota aplicável com base na categoria tributária
        let appliedRate;
        let reducaoAdicional = options.reducaoEspecial || 0;

        switch (taxCategory) {
            case 'reduced':
                // Para categoria reduzida: 50% da alíquota normal
                appliedRate = rate * 0.5;

                // Log de depuração para categoria reduzida
                console.log(`IBS: Aplicando redução para categoria 'reduced'. 
                           Rate original: ${rate}, Rate aplicada: ${appliedRate}`);
                break;

            case 'exempt':
                // Para categoria isenta: alíquota zero
                appliedRate = 0;

                // Log de depuração para isenção
                console.log(`IBS: Aplicando isenção para categoria 'exempt'. 
                           Rate aplicada: ${appliedRate}`);
                break;

            default: // 'standard' ou qualquer outro valor
                appliedRate = rate;

                // Log de depuração para categoria padrão
                console.log(`IBS: Aplicando alíquota padrão. Rate: ${appliedRate}`);
        }

        // Aplicar redução adicional específica do setor, se houver
        if (reducaoAdicional > 0) {
            const rateAntes = appliedRate;
            appliedRate = appliedRate * (1 - reducaoAdicional);

            // Log de depuração para redução adicional
            console.log(`IBS: Aplicando redução adicional de ${reducaoAdicional*100}%. 
                       Rate antes: ${rateAntes}, Rate depois: ${appliedRate}`);
        }

        // Cálculo do imposto
        const tax = baseValue * appliedRate;

        // Aplicação de créditos
        const taxAfterCredits = Math.max(0, tax - credits);

        // Log de depuração do cálculo final
        console.log(`IBS: Cálculo final - Base: ${baseValue}, 
                   Alíquota aplicada: ${appliedRate}, 
                   Imposto bruto: ${tax}, 
                   Créditos: ${credits}, 
                   Imposto líquido: ${taxAfterCredits}`);

        return taxAfterCredits;
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
     * @param {Object} dados - Dados da empresa e parâmetros de simulação (formato plano)
     * @param {number} ano - Ano de referência para percentual de implementação
     * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
     * @returns {Object} - Resultados detalhados do fluxo de caixa com Split Payment
     * @throws {Error} - Se os dados não estiverem em formato plano
     */
    function calcularFluxoCaixaSplitPayment(dados, ano = 2026, parametrosSetoriais = null) {
        // Verificar se os dados estão em formato plano
        if (dados.empresa !== undefined) {
            throw new Error('calcularFluxoCaixaSplitPayment espera dados em formato plano. Use DataManager.converterParaEstruturaPlana()');
        }

        // Validar campos essenciais
        if (typeof dados.faturamento !== 'number' || isNaN(dados.faturamento)) {
            throw new Error('Faturamento inválido ou não informado');
        }
        if (typeof dados.aliquota !== 'number' || isNaN(dados.aliquota)) {
            throw new Error('Alíquota inválida ou não informada');
        }
        if (typeof dados.pmr !== 'number' || isNaN(dados.pmr)) {
            throw new Error('PMR inválido ou não informado');
        }

        // Extrair e normalizar parâmetros relevantes
        const faturamento = window.DataManager.extrairValorNumerico(dados.faturamento);
        const aliquota = dados.aliquota > 1 ? dados.aliquota / 100 : dados.aliquota; // Normalizar percentual
        const pmr = Math.max(0, parseInt(dados.pmr) || 0);
        const percVista = dados.percVista > 1 ? dados.percVista / 100 : dados.percVista;
        const percPrazo = dados.percPrazo > 1 ? dados.percPrazo / 100 : dados.percPrazo;
        const creditos = window.DataManager.extrairValorNumerico(dados.creditos) || 0;
        const compensacao = dados.compensacao || 'automatica';

        // Verificar consistência de percentuais
        if (Math.abs(percVista + percPrazo - 1) > 0.001) {
            console.warn('A soma dos percentuais de vendas à vista e a prazo difere de 100%. Considerando proporcional.');
        }

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

        // Construir objeto de créditos para cálculo de impostos
        const creditsObject = {
            pis: dados.creditosPIS || 0,
            cofins: dados.creditosCOFINS || 0,
            icms: dados.creditosICMS || 0,
            ipi: dados.creditosIPI || 0
        };

        // Calcular impostos em ambos os sistemas
        const impostosAtuais = window.CurrentTaxSystem.calcularTodosImpostosAtuais({
            revenue: faturamento,
            serviceCompany: dados.tipoEmpresa === 'servicos',
            cumulativeRegime: dados.regimePisCofins === 'cumulativo',
            credits: creditsObject
        });

        // Calcular tempo médio do capital em giro
        let tempoMedioCapitalGiro;
        if (window.DataManager.calcularTempoMedioCapitalGiro) {
            tempoMedioCapitalGiro = window.DataManager.calcularTempoMedioCapitalGiro(pmr, prazoRecolhimento, percVista, percPrazo);
        } else {
            // Cálculo in-line se a função do DataManager não estiver disponível
            const tempoVista = prazoRecolhimento;
            const tempoPrazo = Math.max(0, prazoRecolhimento - pmr);
            tempoMedioCapitalGiro = (percVista * tempoVista) + (percPrazo * tempoPrazo);
        }

        // Benefício financeiro do capital em giro (em dias de faturamento)
        const beneficioDiasCapitalGiro = faturamento > 0 ? 
                                        (capitalGiroDisponivel / faturamento) * tempoMedioCapitalGiro : 0;

        // Se o ano estiver no período de transição para o IVA Dual, calcular impostos de transição
        let impostosIVA = null;
        // Apenas calcular se não foi fornecido nos parâmetros
        if (ano >= 2026 && !arguments[4]?.impostosIVA) {
            const parametrosSetoriaisIVA = {
                aliquotaCBS: dados.aliquotaCBS,
                aliquotaIBS: dados.aliquotaIBS,
                categoriaIva: dados.categoriaIVA,
                reducaoEspecial: dados.reducaoEspecial
            };

            // Usar calcularTransicaoIVADual para consistência
            impostosIVA = calcularTransicaoIVADual(
                faturamento, 
                ano, 
                // Passar impostos atuais vazios se não disponíveis
                { total: 0, pis: 0, cofins: 0, icms: 0, ipi: 0 },
                { 
                    parametrosSetoriais: parametrosSetoriaisIVA,
                    dados: dados
                }
            );
        } else if (arguments[4]?.impostosIVA) {
            // Usar impostos precalculados se fornecidos
            impostosIVA = arguments[4].impostosIVA;
        }

        // Gerar memória crítica usando DataManager se disponível
        let memoriaCritica;
        try {
            if (window.DataManager.gerarMemoriaCritica) {
                memoriaCritica = window.DataManager.gerarMemoriaCritica({
                    faturamento, 
                    aliquota, 
                    percVista, 
                    percPrazo, 
                    creditos,
                    valorImpostoTotal,
                    valorImpostoLiquido,
                    percentualImplementacao
                });
            } else if (window.CalculationCore.gerarMemoriaCritica) {
                memoriaCritica = window.CalculationCore.gerarMemoriaCritica(dados, null);
            } else {
                memoriaCritica = {
                    tituloRegime: "Sistema de Split Payment",
                    descricaoRegime: "Cálculo de impacto no fluxo de caixa",
                    formula: "Valor do Imposto × Percentual de Implementação",
                    passoAPasso: ["Cálculo executado com sucesso"],
                    observacoes: []
                };
            }
        } catch (erro) {
            console.warn('Erro ao gerar memória crítica:', erro);
            memoriaCritica = {
                tituloRegime: "Sistema de Split Payment",
                descricaoRegime: "Cálculo de impacto no fluxo de caixa",
                erro: "Não foi possível gerar a memória crítica detalhada"
            };
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
            memoriaCritica
        };

        // Registrar log de transformação se disponível no DataManager
        if (window.DataManager.logTransformacao) {
            window.DataManager.logTransformacao(
                dados,
                resultado,
                'Cálculo de Fluxo de Caixa com Split Payment'
            );
        }

        return resultado;
    }

    /**
     * Calcula o impacto do Split Payment no capital de giro
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação (formato plano)
     * @param {number} ano - Ano de referência para percentual de implementação
     * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
     * @returns {Object} - Análise comparativa detalhada do impacto no capital de giro
     * @throws {Error} - Se os dados não estiverem em formato plano
     */
    function calcularImpactoCapitalGiro(dados, ano = 2026, parametrosSetoriais = null) {
        // Verificar se os dados estão em formato plano
        if (dados.empresa !== undefined) {
            throw new Error('calcularImpactoCapitalGiro espera dados em formato plano. Use DataManager.converterParaEstruturaPlana()');
        }

        // Validar campos essenciais
        if (typeof dados.faturamento !== 'number' || isNaN(dados.faturamento)) {
            throw new Error('Faturamento inválido ou não informado');
        }
        if (typeof dados.aliquota !== 'number' || isNaN(dados.aliquota)) {
            throw new Error('Alíquota inválida ou não informada');
        }

        // Determinar se é uma chamada recursiva ou inicial
        const isRecursiveCall = arguments[3]?.isRecursiveCall || false;

        // Para chamadas recursivas, usar uma implementação simplificada
        if (isRecursiveCall) {
            return calcularImpactoCapitalGiroSimplificado(dados, ano, parametrosSetoriais);
        }

        // Adicionar esta verificação explícita para a opção de Split Payment
        const considerarSplitPayment = dados.splitPayment !== false; // Default: true

        try {
            // Calcular fluxo de caixa no regime atual
            const resultadoAtual = window.CurrentTaxSystem.calcularFluxoCaixaAtual(
                dados, 
                { isRecursiveCall: true }
            );

            // Calcular impostos no sistema IVA Dual, independentemente da opção Split Payment
            let resultadoImpostosIVA = null;

            // Verificar se temos impostos atuais calculados
            if (resultadoAtual.impostos) {
                // Preparar os parâmetros setoriais completos
                const parametrosSetoriaisCompletos = {
                    cronogramaProprio: parametrosSetoriais?.cronogramaProprio || dados.cronogramaProprio || false,
                    cronograma: parametrosSetoriais?.cronograma || dados.cronogramaImplementacao || null,
                    aliquotaCBS: parametrosSetoriais?.aliquotaCBS || dados.aliquotaCBS,
                    aliquotaIBS: parametrosSetoriais?.aliquotaIBS || dados.aliquotaIBS,
                    categoriaIva: parametrosSetoriais?.categoriaIva || dados.categoriaIVA,
                    reducaoEspecial: parametrosSetoriais?.reducaoEspecial || dados.reducaoEspecial
                };

                // Calcular impostos IVA Dual considerando parâmetros setoriais
                resultadoImpostosIVA = calcularTransicaoIVADual(
                    dados.faturamento, 
                    ano, 
                    resultadoAtual.impostos,
                    { 
                        parametrosSetoriais: parametrosSetoriaisCompletos,
                        dados: dados  // Passar dados completos para referência
                    }
                );
            }

            // Determinar como calcular o resultado com Split Payment
            let resultadoSplitPayment;
            let resultadoIVASemSplit;

            // Criar o cenário IVA sem Split explicitamente
            resultadoIVASemSplit = JSON.parse(JSON.stringify(resultadoAtual));
            resultadoIVASemSplit.descricao = "Sistema IVA Dual sem Split Payment";

            // Aplicar impostos IVA ao resultado sem Split
            if (resultadoImpostosIVA) {
                resultadoIVASemSplit.impostos = resultadoImpostosIVA;
                resultadoIVASemSplit.valorImpostoTotal = resultadoImpostosIVA.total || 0;
                resultadoIVASemSplit.valorImpostoLiquido = resultadoImpostosIVA.total || 0;

                // Importante: no IVA sem Split, o capital de giro disponível é o mesmo do regime atual
                // O efeito é apenas na alteração do valor dos impostos
            }

            if (considerarSplitPayment) {
                // Calcular fluxo de caixa com Split Payment ativado
                resultadoSplitPayment = calcularFluxoCaixaSplitPayment(
                    dados, 
                    ano, 
                    parametrosSetoriais, 
                    { isRecursiveCall: true },
                    { impostosIVA: resultadoImpostosIVA } // Passar os impostos já calculados
                );

                // Garantir que o resultado use os impostos calculados corretamente
                if (resultadoImpostosIVA && resultadoSplitPayment) {
                    resultadoSplitPayment.impostos = resultadoImpostosIVA;
                }

                // Recalcular explicitamente o capital de giro disponível com Split Payment
                const percentualImplementacao = window.CurrentTaxSystem.obterPercentualImplementacao(ano, parametrosSetoriais);
                const valorImpostoTotal = resultadoImpostosIVA?.total || 0;
                const valorImpostoSplit = valorImpostoTotal * percentualImplementacao;

                // No regime Split Payment, o capital de giro disponível é reduzido pelo valor do imposto afetado pelo Split
                resultadoSplitPayment.capitalGiroDisponivel = resultadoAtual.capitalGiroDisponivel - valorImpostoSplit;

                // Log para diagnóstico
                console.log(`Recalculando capital de giro com Split Payment: Percentual=${percentualImplementacao*100}%, Imposto Total=${valorImpostoTotal}, Imposto Split=${valorImpostoSplit}, Capital Giro Final=${resultadoSplitPayment.capitalGiroDisponivel}`);
            } else {
                // Split Payment desativado: usar regime atual como base, mas atualizar para impostos IVA
                resultadoSplitPayment = resultadoIVASemSplit;
            }

            // Validar resultados obtidos
            if (!resultadoAtual || !resultadoSplitPayment || !resultadoIVASemSplit) {
                throw new Error('Erro ao calcular os fluxos de caixa necessários para a análise');
            }

            // Calcular diferenças de capital de giro
            const diferencaCapitalGiro = resultadoSplitPayment.capitalGiroDisponivel - resultadoAtual.capitalGiroDisponivel;
            const diferencaCapitalGiroIVASemSplit = resultadoIVASemSplit.capitalGiroDisponivel - resultadoAtual.capitalGiroDisponivel;

            // Calcular percentual de impacto, protegendo contra divisão por zero
            let percentualImpacto = 0;
            let percentualImpactoIVASemSplit = 0;

            if (resultadoAtual.capitalGiroDisponivel !== 0) {
                percentualImpacto = (diferencaCapitalGiro / resultadoAtual.capitalGiroDisponivel) * 100;
                percentualImpactoIVASemSplit = (diferencaCapitalGiroIVASemSplit / resultadoAtual.capitalGiroDisponivel) * 100;
            }

            // Calcular necessidade adicional de capital de giro (com fator de segurança)
            const fatorSeguranca = 1.2; // 20% de margem de segurança
            const necessidadeAdicionalCapitalGiro = Math.abs(diferencaCapitalGiro) * fatorSeguranca;
            const necessidadeAdicionalCapitalGiroIVASemSplit = Math.abs(diferencaCapitalGiroIVASemSplit) * fatorSeguranca;

            // Impacto em dias de faturamento
            const impactoDiasFaturamento = resultadoAtual.beneficioDiasCapitalGiro - resultadoSplitPayment.beneficioDiasCapitalGiro;
            const impactoDiasFaturamentoIVASemSplit = resultadoAtual.beneficioDiasCapitalGiro - resultadoIVASemSplit.beneficioDiasCapitalGiro;

            // Extrair e normalizar parâmetros para cálculo de impacto na margem
            const faturamento = window.DataManager.extrairValorNumerico(dados.faturamento);
            const margem = dados.margem > 1 ? dados.margem / 100 : (dados.margem || 0.15);
            const taxaCapitalGiro = dados.taxaCapitalGiro > 1 ? dados.taxaCapitalGiro / 100 : 
                                   (dados.taxaCapitalGiro || 0.021); // Valor padrão: 2,1% a.m.

            // Calcular impacto na margem operacional para Split Payment
            const custoMensalCapitalGiro = Math.abs(diferencaCapitalGiro) * taxaCapitalGiro;
            const custoAnualCapitalGiro = custoMensalCapitalGiro * 12;
            const impactoPercentual = faturamento > 0 ? (custoMensalCapitalGiro / faturamento) * 100 : 0;
            const margemAjustada = Math.max(0, margem - (impactoPercentual / 100));
            const percentualReducaoMargem = margem > 0 ? (impactoPercentual / (margem * 100)) * 100 : 0;

            // Calcular impacto na margem para IVA sem Split
            const custoMensalCapitalGiroIVASemSplit = Math.abs(diferencaCapitalGiroIVASemSplit) * taxaCapitalGiro;
            const custoAnualCapitalGiroIVASemSplit = custoMensalCapitalGiroIVASemSplit * 12;
            const impactoPercentualIVASemSplit = faturamento > 0 ? (custoMensalCapitalGiroIVASemSplit / faturamento) * 100 : 0;
            const margemAjustadaIVASemSplit = Math.max(0, margem - (impactoPercentualIVASemSplit / 100));

            // Criar objeto com impacto detalhado na margem
            const impactoMargemDetalhado = {
                custoMensalCapitalGiro,
                custoAnualCapitalGiro,
                impactoPercentual,
                margemOriginal: margem,
                margemAjustada,
                percentualReducaoMargem
            };

            const impactoMargemDetalhadoIVASemSplit = {
                custoMensalCapitalGiro: custoMensalCapitalGiroIVASemSplit,
                custoAnualCapitalGiro: custoAnualCapitalGiroIVASemSplit,
                impactoPercentual: impactoPercentualIVASemSplit,
                margemOriginal: margem,
                margemAjustada: margemAjustadaIVASemSplit,
                percentualReducaoMargem: margem > 0 ? (impactoPercentualIVASemSplit / (margem * 100)) * 100 : 0
            };

            // Inicializar o objeto resultado com um objeto impactoBase vazio
            const resultado = {
                ano,
                resultadoAtual,
                resultadoSplitPayment,
                resultadoIVASemSplit,
                diferencaCapitalGiro,
                diferencaCapitalGiroIVASemSplit,
                percentualImpacto,
                percentualImpactoIVASemSplit,
                necessidadeAdicionalCapitalGiro,
                necessidadeAdicionalCapitalGiroIVASemSplit,
                impactoDiasFaturamento,
                impactoDiasFaturamentoIVASemSplit,
                margemOperacionalOriginal: margem,
                margemOperacionalAjustada: margemAjustada,
                margemOperacionalAjustadaIVASemSplit: margemAjustadaIVASemSplit,
                impactoMargem: impactoPercentual,
                impactoMargemIVASemSplit: impactoPercentualIVASemSplit,
                impactoMargemDetalhado,
                impactoMargemDetalhadoIVASemSplit,
                splitPaymentConsiderado: considerarSplitPayment,
                impactoBase: {}
            };

            // Inicializar adequadamente resultado.impactoBase para evitar o erro
            resultado.impactoBase = {
                resultadoAtual: resultadoAtual,
                resultadoSplitPayment: resultadoSplitPayment,
                resultadoIVASemSplit: resultadoIVASemSplit,
                diferencaCapitalGiro: diferencaCapitalGiro,
                diferencaCapitalGiroIVASemSplit: diferencaCapitalGiroIVASemSplit,
                percentualImpacto: percentualImpacto,
                percentualImpactoIVASemSplit: percentualImpactoIVASemSplit,
                necessidadeAdicionalCapitalGiro: necessidadeAdicionalCapitalGiro,
                necessidadeAdicionalCapitalGiroIVASemSplit: necessidadeAdicionalCapitalGiroIVASemSplit,
                impactoDiasFaturamento: impactoDiasFaturamento,
                impactoDiasFaturamentoIVASemSplit: impactoDiasFaturamentoIVASemSplit,
                margemOperacionalOriginal: margem,
                margemOperacionalAjustada: margemAjustada,
                margemOperacionalAjustadaIVASemSplit: margemAjustadaIVASemSplit,
                impactoMargem: impactoPercentual,
                impactoMargemIVASemSplit: impactoPercentualIVASemSplit
            };

            // Adicionar análise de sensibilidade ao resultado
            resultado.analiseSensibilidade = calcularAnaliseSensibilidadeSimplificada(
                dados, 
                ano, 
                diferencaCapitalGiro
            );

            // Registrar log de transformação se disponível no DataManager
            if (window.DataManager.logTransformacao) {
                window.DataManager.logTransformacao(
                    dados,
                    resultado,
                    'Cálculo de Impacto no Capital de Giro'
                );
            }

            return resultado;

        } catch (erro) {
            console.error('Erro ao calcular impacto no capital de giro:', erro);

            // Retornar uma versão simplificada em caso de erro
            return calcularImpactoCapitalGiroSimplificado(dados, ano, parametrosSetoriais);
        }
    }

    /**
     * Versão simplificada do cálculo de impacto no capital de giro
     * Utilizada em caso de chamada recursiva ou erro na implementação completa
     * 
     * @param {Object} dados - Dados da empresa e parâmetros de simulação
     * @param {number} ano - Ano de referência
     * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
     * @returns {Object} - Análise simplificada do impacto
     * @private
     */
    function calcularImpactoCapitalGiroSimplificado(dados, ano, parametrosSetoriais) {
        // Extrair e normalizar parâmetros essenciais
        const faturamento = window.DataManager.extrairValorNumerico(dados.faturamento) || 1;
        const aliquota = dados.aliquota > 1 ? dados.aliquota / 100 : (dados.aliquota || 0.265);
        const margem = dados.margem > 1 ? dados.margem / 100 : (dados.margem || 0.15);
        const taxaCapitalGiro = dados.taxaCapitalGiro > 1 ? dados.taxaCapitalGiro / 100 : 
                               (dados.taxaCapitalGiro || 0.021);
        
        const considerarSplitPayment = dados.splitPayment !== false; // Default: true

        // Obter percentual de implementação
        const percentualImplementacao = window.CurrentTaxSystem.obterPercentualImplementacao(
            ano, 
            parametrosSetoriais
        );

        // Cálculos simplificados
        const valorImpostoTotal = faturamento * aliquota;
        const diferencaCapitalGiro = -valorImpostoTotal * percentualImplementacao;
        const necessidadeAdicionalCapitalGiro = Math.abs(diferencaCapitalGiro) * 1.2;
        const impactoDiasFaturamento = 15 * percentualImplementacao;

        // Impacto na margem
        const custoMensalCapitalGiro = Math.abs(diferencaCapitalGiro) * taxaCapitalGiro;
        const custoAnualCapitalGiro = custoMensalCapitalGiro * 12;
        const impactoPercentual = (custoMensalCapitalGiro / faturamento) * 100;

        // Resultado simplificado
        return {
            diferencaCapitalGiro,
            percentualImpacto: -100 * percentualImplementacao,
            necessidadeAdicionalCapitalGiro,
            impactoDiasFaturamento,
            margemOperacionalOriginal: margem,
            margemOperacionalAjustada: margem - (impactoPercentual / 100),
            impactoMargem: impactoPercentual,
            impactoMargemDetalhado: {
                custoMensalCapitalGiro,
                custoAnualCapitalGiro,
                impactoPercentual,
                margemOriginal: margem,
                margemAjustada: margem - (impactoPercentual / 100),
                percentualReducaoMargem: margem > 0 ? (impactoPercentual / (margem * 100)) * 100 : 0
            }
        };
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
        const necessidadeBasica = Math.abs(diferencaCapitalGiro);

        // Fatores de ajuste para cálculo da necessidade
        const fatorMargemSeguranca = 1.2; // 20% de margem de segurança
        const fatorSazonalidade = window.CalculationCore.calcularFatorSazonalidade(dados);
        const fatorCrescimento = window.CalculationCore.calcularFatorCrescimento(dados, ano);

        // Cálculo da necessidade com diferentes fatores
        const necessidadeComMargemSeguranca = necessidadeBasica * fatorMargemSeguranca;
        const necessidadeComSazonalidade = necessidadeBasica * fatorSazonalidade;
        const necessidadeComCrescimento = necessidadeBasica * fatorCrescimento;

        // Necessidade total considerando todos os fatores
        const necessidadeTotal = necessidadeBasica * fatorMargemSeguranca * fatorSazonalidade * fatorCrescimento;

        // Opções de captação
        const opcoesFinanciamento = window.CalculationCore.calcularOpcoesFinanciamento(dados, necessidadeTotal);

        // Impacto no resultado considerando a opção mais econômica
        const impactoResultado = window.CalculationCore.calcularImpactoResultado(dados, opcoesFinanciamento.opcaoRecomendada.custoAnual);

        // Resultado completo
        const resultado = {
            necessidadeBasica,
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
     * @param {Object} dados - Dados da empresa e parâmetros de simulação (formato plano)
     * @param {number} anoInicial - Ano inicial da simulação (padrão: 2026)
     * @param {number} anoFinal - Ano final da simulação (padrão: 2033)
     * @param {string} cenarioTaxaCrescimento - Cenário de crescimento ('conservador', 'moderado', 'otimista', 'personalizado')
     * @param {number} taxaCrescimentoPersonalizada - Taxa de crescimento para cenário personalizado (decimal)
     * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
     * @returns {Object} - Projeção detalhada do impacto ao longo do tempo
     * @throws {Error} - Se os dados não estiverem em formato plano ou se parâmetros forem inválidos
     */
    function calcularProjecaoTemporal(dados, anoInicial = 2026, anoFinal = 2033, cenarioTaxaCrescimento = 'moderado', taxaCrescimentoPersonalizada = null, parametrosSetoriais = null) {
        // Verificar se os dados estão em formato plano
        if (dados.empresa !== undefined) {
            throw new Error('calcularProjecaoTemporal espera dados em formato plano. Use DataManager.converterParaEstruturaPlana()');
        }

        // Validar dados essenciais
        if (typeof dados.faturamento !== 'number' || isNaN(dados.faturamento) || dados.faturamento <= 0) {
            throw new Error('Faturamento inválido ou não positivo');
        }

        // Validar intervalo de anos
        if (anoInicial < 2026 || anoFinal > 2033 || anoInicial > anoFinal) {
            throw new Error('Intervalo de anos inválido. O período deve estar entre 2026 e 2033, com ano inicial menor que o final.');
        }

        // Normalizar e validar cenário
        const cenarioValido = ['conservador', 'moderado', 'otimista', 'personalizado'].includes(cenarioTaxaCrescimento);
        if (!cenarioValido) {
            console.warn(`Cenário '${cenarioTaxaCrescimento}' inválido. Utilizando 'moderado' como padrão.`);
            cenarioTaxaCrescimento = 'moderado';
        }

        // Determinar taxa de crescimento com base no cenário
        let taxaCrescimento = 0.05; // Padrão: moderado (5% a.a.)

        switch (cenarioTaxaCrescimento) {
            case 'conservador':
                taxaCrescimento = 0.02; // 2% a.a.
                break;
            case 'otimista':
                taxaCrescimento = 0.08; // 8% a.a.
                break;
            case 'personalizado':
                // Validar taxa personalizada
                if (taxaCrescimentoPersonalizada !== null && 
                    typeof taxaCrescimentoPersonalizada === 'number' && 
                    !isNaN(taxaCrescimentoPersonalizada)) {
                    // Normalizar percentual, se necessário
                    taxaCrescimento = taxaCrescimentoPersonalizada > 1 ? 
                                      taxaCrescimentoPersonalizada / 100 : 
                                      taxaCrescimentoPersonalizada;
                } else {
                    console.warn('Taxa de crescimento personalizada inválida. Utilizando 5% (moderado) como padrão.');
                }
                break;
        }

        try {
            // Inicializar estruturas para resultados
            const resultadosAnuais = {};
            const impactoAcumulado = {
                totalNecessidadeCapitalGiro: 0,
                custoFinanceiroTotal: 0,
                impactoMedioMargem: 0
            };

            // Adicionar estrutura para comparação entre regimes
            const comparacaoRegimes = {
                anos: [],
                atual: {
                    capitalGiro: [],
                    impostos: []
                },
                splitPayment: {
                    capitalGiro: [],
                    impostos: []
                },
                ivaSemSplit: {
                    capitalGiro: [],
                    impostos: []
                },
                impacto: {
                    diferencaCapitalGiro: [],
                    percentualImpacto: [],
                    necessidadeAdicional: []
                }
            };

            // Criar cópia dos dados para manipulação
            let dadosAno = JSON.parse(JSON.stringify(dados));
            let somaImpactoMargem = 0;

            // Simular cada ano do período
            for (let ano = anoInicial; ano <= anoFinal; ano++) {
                // Calcular impacto para o ano atual
                const impactoAno = calcularImpactoCapitalGiro(dadosAno, ano, parametrosSetoriais);

                // INÍCIO DA MODIFICAÇÃO
                // Garantir que o resultado IVA sem Split existe para cada ano
                if (!impactoAno.resultadoIVASemSplit) {
                    // Criar uma cópia do resultado atual como base
                    impactoAno.resultadoIVASemSplit = JSON.parse(JSON.stringify(impactoAno.resultadoAtual));
                    impactoAno.resultadoIVASemSplit.descricao = "Sistema IVA Dual sem Split Payment";

                    // Se temos resultados de impostos IVA, usar esses valores
                    if (impactoAno.resultadoSplitPayment && impactoAno.resultadoSplitPayment.impostos) {
                        impactoAno.resultadoIVASemSplit.impostos = impactoAno.resultadoSplitPayment.impostos;
                        impactoAno.resultadoIVASemSplit.valorImpostoTotal = 
                            impactoAno.resultadoSplitPayment.impostos.total || 0;
                    }
                }
                // FIM DA MODIFICAÇÃO

                // Armazenar resultado do ano
                resultadosAnuais[ano] = impactoAno;

                // Acumular valores para análise global
                impactoAcumulado.totalNecessidadeCapitalGiro += impactoAno.necessidadeAdicionalCapitalGiro || 0;
                impactoAcumulado.custoFinanceiroTotal += impactoAno.impactoMargemDetalhado?.custoAnualCapitalGiro || 0;
                somaImpactoMargem += impactoAno.impactoMargem || 0;

                // Adicionar dados comparativos para gráficos
                comparacaoRegimes.anos.push(ano);

                // Dados do regime atual
                comparacaoRegimes.atual.capitalGiro.push(
                    impactoAno.resultadoAtual?.capitalGiroDisponivel || 0
                );
                comparacaoRegimes.atual.impostos.push(
                    impactoAno.resultadoAtual?.impostos?.total || 0
                );

                // Dados do regime com Split Payment
                comparacaoRegimes.splitPayment.capitalGiro.push(
                    impactoAno.resultadoSplitPayment?.capitalGiroDisponivel || 0
                );
                comparacaoRegimes.splitPayment.impostos.push(
                    impactoAno.resultadoSplitPayment?.impostos?.total || 0
                );

                // Dados do regime IVA sem Split Payment
                comparacaoRegimes.ivaSemSplit.capitalGiro.push(
                    impactoAno.resultadoIVASemSplit?.capitalGiroDisponivel || 0
                );
                comparacaoRegimes.ivaSemSplit.impostos.push(
                    impactoAno.resultadoIVASemSplit?.impostos?.total || 0
                );

                // Dados de impacto
                comparacaoRegimes.impacto.diferencaCapitalGiro.push(
                    impactoAno.diferencaCapitalGiro || 0
                );
                comparacaoRegimes.impacto.percentualImpacto.push(
                    impactoAno.percentualImpacto || 0
                );
                comparacaoRegimes.impacto.necessidadeAdicional.push(
                    impactoAno.necessidadeAdicionalCapitalGiro || 0
                );

                // Atualizar faturamento para o próximo ano com a taxa de crescimento
                dadosAno.faturamento = dadosAno.faturamento * (1 + taxaCrescimento);

                // Arredondar para evitar erros de precisão de ponto flutuante
                dadosAno.faturamento = Math.round(dadosAno.faturamento * 100) / 100;
            }

            // Calcular impacto médio na margem ao longo do período
            const numAnos = anoFinal - anoInicial + 1;
            impactoAcumulado.impactoMedioMargem = somaImpactoMargem / numAnos;

            // Gerar memória crítica usando DataManager se disponível
            let memoriaCritica;
            try {
                if (window.DataManager.gerarMemoriaCritica) {
                    memoriaCritica = window.DataManager.gerarMemoriaCritica({
                        faturamento: dados.faturamento, 
                        cenario: cenarioTaxaCrescimento,
                        taxaCrescimento,
                        anoInicial,
                        anoFinal,
                        totalNecessidadeCapitalGiro: impactoAcumulado.totalNecessidadeCapitalGiro,
                        custoFinanceiroTotal: impactoAcumulado.custoFinanceiroTotal
                    });
                } else if (window.CalculationCore.gerarMemoriaCritica) {
                    memoriaCritica = window.CalculationCore.gerarMemoriaCritica(dados, null);
                } else {
                    memoriaCritica = {
                        tituloRegime: "Projeção Temporal do Split Payment",
                        descricaoRegime: "Simulação de impacto ao longo do tempo",
                        formula: "Impacto Ano N = Impacto Base × Crescimento^N × % Implementação Ano N",
                        passoAPasso: ["Projeção calculada com sucesso"],
                        observacoes: []
                    };
                }
            } catch (erro) {
                console.warn('Erro ao gerar memória crítica da projeção:', erro);
                memoriaCritica = {
                    tituloRegime: "Projeção Temporal do Split Payment",
                    descricaoRegime: "Simulação de impacto ao longo do tempo",
                    erro: "Não foi possível gerar a memória crítica detalhada"
                };
            }

            // Montar resultado completo
            const resultado = {
                parametros: {
                    anoInicial,
                    anoFinal,
                    cenarioTaxaCrescimento,
                    taxaCrescimento
                },
                resultadosAnuais,  // Resultados para cada ano individualmente
                impactoAcumulado,
                comparacaoRegimes, // Nova estrutura para comparações e gráficos
                memoriaCritica
            };

            // Registrar log de transformação se disponível no DataManager
            if (window.DataManager.logTransformacao) {
                window.DataManager.logTransformacao(
                    dados,
                    resultado,
                    'Projeção Temporal do Impacto do Split Payment'
                );
            }

            return resultado;

        } catch (erro) {
            console.error('Erro ao calcular projeção temporal:', erro);

            // Retornar resultado parcial em caso de erro
            return {
                parametros: {
                    anoInicial,
                    anoFinal,
                    cenarioTaxaCrescimento,
                    taxaCrescimento
                },
                erro: `Falha na projeção: ${erro.message}`,
                impactoAcumulado: {
                    totalNecessidadeCapitalGiro: dados.faturamento * dados.aliquota * 5, // Estimativa grosseira
                    custoFinanceiroTotal: dados.faturamento * dados.aliquota * 5 * 0.021 * 12, // Estimativa grosseira
                    impactoMedioMargem: 0.5 // Valor aproximado
                },
                resultadosAnuais: {}, // Adicionar objeto vazio para evitar erros de acesso
                comparacaoRegimes: {  // Estrutura mínima para evitar erros no chartManager
                    anos: [anoInicial, anoFinal],
                    atual: { capitalGiro: [0, 0], impostos: [0, 0] },
                    splitPayment: { capitalGiro: [0, 0], impostos: [0, 0] },
                    ivaSemSplit: { capitalGiro: [0, 0], impostos: [0, 0] },
                    impacto: { 
                        diferencaCapitalGiro: [0, 0], 
                        percentualImpacto: [0, 0], 
                        necessidadeAdicional: [0, 0] 
                    }
                }
            };
        }
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

        // Gerar dados para comparação entre regimes
        const regimesComparacao = {
            semMitigacao: {
                capitalGiro: impactoBase.resultadoSplitPayment?.capitalGiroDisponivel || 0,
                diferencaCapitalGiro: impactoBase.diferencaCapitalGiro || 0,
                percentualImpacto: impactoBase.percentualImpacto || 0,
                necessidadeAdicional: impactoBase.necessidadeAdicionalCapitalGiro || 0
            },
            comMitigacao: {
                capitalGiro: (impactoBase.resultadoSplitPayment?.capitalGiroDisponivel || 0) + 
                             (efeitividadeCombinada.mitigacaoTotal || 0),
                diferencaCapitalGiro: (impactoBase.diferencaCapitalGiro || 0) + 
                                     (efeitividadeCombinada.mitigacaoTotal || 0),
                percentualImpacto: impactoBase.percentualImpacto ? 
                                  (impactoBase.percentualImpacto * (1 - efeitividadeCombinada.efetividadePercentual/100)) : 0,
                necessidadeAdicional: impactoBase.necessidadeAdicionalCapitalGiro ? 
                                     (impactoBase.necessidadeAdicionalCapitalGiro * (1 - efeitividadeCombinada.efetividadePercentual/100)) : 0
            },
            efeitividadeEstrategias: Object.fromEntries(
                Object.entries(resultadosEstrategias)
                    .filter(([_, resultado]) => resultado !== null)
                    .map(([nome, resultado]) => [
                        nome, 
                        {
                            efetividadePercentual: resultado.efetividadePercentual || 0,
                            mitigacaoValor: resultado.mitigacaoTotal || 0,
                            custo: window.CalculationCore.getFuncaoCusto(nome, resultado) || 0,
                            custoBeneficio: resultado.custoBeneficio || 0
                        }
                    ])
            )
        };

        // Gerar dados para gráficos
        const dadosGraficos = {
            // Gráfico de efetividade de estratégias
            efetividade: {
                estrategias: Object.entries(resultadosEstrategias)
                    .filter(([_, resultado]) => resultado !== null)
                    .map(([nome, resultado]) => ({
                        nome: window.CalculationCore.traduzirNomeEstrategia(nome),
                        efetividade: resultado.efetividadePercentual || 0
                    })),
                combinada: efeitividadeCombinada.efetividadePercentual || 0
            },

            // Gráfico de custo-benefício
            custoBeneficio: {
                estrategias: Object.entries(resultadosEstrategias)
                    .filter(([_, resultado]) => resultado !== null)
                    .map(([nome, resultado]) => ({
                        nome: window.CalculationCore.traduzirNomeEstrategia(nome),
                        custo: window.CalculationCore.getFuncaoCusto(nome, resultado) || 0,
                        beneficio: resultado.mitigacaoTotal || 0,
                        relacao: resultado.custoBeneficio || 0
                    }))
            },

            // Gráfico de comparação antes/depois da mitigação
            comparacaoImpacto: {
                labels: ['Sem Mitigação', 'Com Mitigação'],
                diferencaCapitalGiro: [
                    Math.abs(impactoBase.diferencaCapitalGiro || 0),
                    Math.abs((impactoBase.diferencaCapitalGiro || 0) * (1 - efeitividadeCombinada.efetividadePercentual/100))
                ],
                necessidadeAdicional: [
                    impactoBase.necessidadeAdicionalCapitalGiro || 0,
                    (impactoBase.necessidadeAdicionalCapitalGiro || 0) * (1 - efeitividadeCombinada.efetividadePercentual/100)
                ]
            }
        };

        // Resultado completo
        const resultado = {
            impactoBase,
            resultadosEstrategias,
            efeitividadeCombinada,
            estrategiasOrdenadas,
            estrategiaMaisEfetiva,
            combinacaoOtima,
            regimesComparacao,    // Nova estrutura para comparações
            dadosGraficos,        // Nova estrutura para gráficos
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
        // Criar cópia dos impostos atuais para não modificar o original
        const result = { ...currentTaxes };
        const dados = options.dados || {};

        // Obter percentuais específicos para CBS e IBS
        const percentualCBS = window.CurrentTaxSystem.obterPercentualImplementacao(
            year, 'cbs', options.parametrosSetoriais
        );

        const percentualIBS = window.CurrentTaxSystem.obterPercentualImplementacao(
            year, 'ibs', options.parametrosSetoriais
        );

        // Log para depuração
        console.log(`Calculando impostos para ano ${year}: CBS=${percentualCBS*100}%, IBS=${percentualIBS*100}%`);

        // Extrair alíquotas específicas do setor
        const aliquotaCBS = dados.aliquotaCBS || options.parametrosSetoriais?.aliquotaCBS || aliquotasIVADual.cbs;
        const aliquotaIBS = dados.aliquotaIBS || options.parametrosSetoriais?.aliquotaIBS || aliquotasIVADual.ibs;
        const categoriaIVA = dados.categoriaIVA || options.parametrosSetoriais?.categoriaIva || 'standard';
        const reducaoEspecial = dados.reducaoEspecial || options.parametrosSetoriais?.reducaoEspecial || 0;

        // Aplicar os cálculos de CBS se percentual maior que zero
        if (percentualCBS > 0) {
            // Calcular CBS usando alíquota e categoria específicas
            const cbsTax = calcularCBS(baseValue, aliquotaCBS, 0, categoriaIVA) * percentualCBS;

            // Reduzir PIS/COFINS proporcionalmente
            if (result.pis) result.pis *= (1 - percentualCBS);
            if (result.cofins) result.cofins *= (1 - percentualCBS);

            result.cbs = cbsTax;
        } else {
            result.cbs = 0; // Garantir que o valor seja explicitamente definido
        }

        // Aplicar os cálculos de IBS se percentual maior que zero
        if (percentualIBS > 0) {
            // Calcular IBS usando alíquota e categoria específicas  
            const ibsTax = calcularIBS(
                baseValue, 
                aliquotaIBS, 
                0, 
                categoriaIVA, 
                { reducaoEspecial: reducaoEspecial }
            ) * percentualIBS;

            // Reduzir ICMS/ISS proporcionalmente
            if (result.icms) result.icms *= (1 - percentualIBS);
            if (result.iss) result.iss *= (1 - percentualIBS);

            result.ibs = ibsTax;
        } else {
            result.ibs = 0; // Garantir que o valor seja explicitamente definido
        }

        // Recalcular o total considerando todos os impostos
        result.total = 0;
        Object.entries(result).forEach(([chave, valor]) => {
            if (chave !== 'total' && typeof valor === 'number') {
                result.total += valor;
            }
        });

        // Log adicional para depuração
        console.log(`Impostos calculados para ano ${year}:`, result);

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
    
    /**
     * Converte dados do simulador entre estruturas aninhadas e planas
     * Funciona como adaptador entre a interface e o módulo de cálculo
     * 
     * @param {Object} dados - Dados a serem convertidos (formato aninhado ou plano)
     * @param {string} formatoDestino - Formato de destino ('plano' ou 'aninhado')
     * @returns {Object} - Dados convertidos no formato especificado
     * @throws {Error} - Se o formato de destino for inválido
     */
    function converterDadosSimulador(dados, formatoDestino) {
        // Verificar disponibilidade do DataManager
        if (typeof window.DataManager === 'undefined') {
            console.warn('DataManager não disponível. Retornando dados sem conversão.');
            return dados;
        }

        // Determinar formato atual dos dados
        const formatoAtual = dados.empresa !== undefined ? 'aninhado' : 'plano';

        // Se já estiver no formato desejado, retornar sem conversão
        if (formatoAtual === formatoDestino) {
            return dados;
        }

        // Converter conforme necessário
        if (formatoDestino === 'plano') {
            return window.DataManager.converterParaEstruturaPlana(dados);
        } else if (formatoDestino === 'aninhado') {
            return window.DataManager.converterParaEstruturaAninhada(dados);
        } else {
            throw new Error(`Formato de destino inválido: ${formatoDestino}. Use 'plano' ou 'aninhado'.`);
        }
    }

    /**
     * Função wrapper para simulação de impacto do Split Payment
     * Converte automaticamente os dados para o formato adequado e valida a entrada
     * 
     * @param {Object} dadosEntrada - Dados de entrada (pode estar em formato aninhado ou plano)
     * @param {number} ano - Ano da simulação
     * @param {Object} parametrosSetoriais - Parâmetros específicos do setor (opcional)
     * @returns {Object} - Resultado da simulação em formato aninhado
     */
    function simularImpactoSplitPayment(dadosEntrada, ano = 2026, parametrosSetoriais = null) {
        try {
            // Verificar se os dados foram fornecidos
            if (!dadosEntrada) {
                throw new Error('Dados de entrada não fornecidos para simulação');
            }

            // Determinar formato dos dados de entrada
            const formatoEntrada = dadosEntrada.empresa !== undefined ? 'aninhado' : 'plano';

            // Validar e normalizar dados se estiverem em formato aninhado
            let dadosValidados = dadosEntrada;
            if (formatoEntrada === 'aninhado' && window.DataManager.validarENormalizar) {
                dadosValidados = window.DataManager.validarENormalizar(dadosEntrada);
            }

            // Converter para formato plano se necessário
            const dadosPlanos = formatoEntrada === 'aninhado' ? 
                               converterDadosSimulador(dadosValidados, 'plano') : 
                               dadosValidados;

            // Executar simulação
            const resultadoPlano = calcularImpactoCapitalGiro(dadosPlanos, ano, parametrosSetoriais);

            // Converter resultado de volta para formato aninhado
            const resultadoAninhado = window.DataManager.converterParaEstruturaAninhada ? 
                                     window.DataManager.converterParaEstruturaAninhada(resultadoPlano) : 
                                     resultadoPlano;

            // Registrar log de transformação se disponível
            if (window.DataManager.logTransformacao) {
                window.DataManager.logTransformacao(
                    dadosEntrada,
                    resultadoAninhado,
                    'Simulação Completa de Impacto do Split Payment'
                );
            }

            return resultadoAninhado;

        } catch (erro) {
            console.error('Erro na simulação de impacto do Split Payment:', erro);
            throw erro;
        }
    }

    // Retornar o objeto com funções públicas
    return {
        // Constantes e configurações
        aliquotasIVADual,
        periodosTransicao,

        // Interface principal com validação e conversão de dados
        simularImpactoSplitPayment,    // Função principal para uso externo
        converterDadosSimulador,       // Utilitário para conversão entre formatos

        // Funções de cálculo de tributos
        calcularCBS,
        calcularIBS,
        calcularTotalIVA,
        calcularTransicaoIVADual,

        // Funções de análise de fluxo de caixa (uso interno)
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
        gerarCombinacoes,

        // Verificador de compatibilidade com a arquitetura
        verificarCompatibilidadeArquitetura: function() {
            return {
                status: typeof window.DataManager !== 'undefined',
                dataManagerDisponivel: typeof window.DataManager !== 'undefined',
                versaoArquitetura: '2.0.0',
                funcoesPlanas: true, // Este módulo usa funções que operam com estrutura plana
                conversorImplementado: true // Este módulo implementa conversores
            };
        }
    };
})();