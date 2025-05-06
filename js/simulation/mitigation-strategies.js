// Novo arquivo: js/simulation/mitigation-strategies.js

/**
 * Módulo de Estratégias de Mitigação
 * Implementa análise completa de estratégias conforme a seção 6 da metodologia
 */
const MitigationStrategiesModule = (function() {
    
    /**
     * Calcula a combinação ótima de estratégias de mitigação
     * @param {Object} dados - Dados base da simulação
     * @param {Object} estrategias - Configurações das estratégias
     * @param {Object} impactoBase - Resultado do impacto base sem mitigação
     * @returns {Object} - Análise da combinação ótima
     */
    function calcularCombinacaoOtima(dados, estrategias, impactoBase) {
        // Calcular efetividade individual de cada estratégia
        const resultadosIndividuais = {};
        let estrategiasAtivas = [];
        
        if (estrategias.ajustePrecos.ativar) {
            resultadosIndividuais.ajustePrecos = calcularEfeitividadeAjustePrecos(dados, estrategias.ajustePrecos, impactoBase);
            estrategiasAtivas.push('ajustePrecos');
        }
        
        if (estrategias.renegociacaoPrazos.ativar) {
            resultadosIndividuais.renegociacaoPrazos = calcularEfeitividadeRenegociacaoPrazos(dados, estrategias.renegociacaoPrazos, impactoBase);
            estrategiasAtivas.push('renegociacaoPrazos');
        }
        
        if (estrategias.antecipacaoRecebiveis.ativar) {
            resultadosIndividuais.antecipacaoRecebiveis = calcularEfeitividadeAntecipacaoRecebiveis(dados, estrategias.antecipacaoRecebiveis, impactoBase);
            estrategiasAtivas.push('antecipacaoRecebiveis');
        }
        
        if (estrategias.capitalGiro.ativar) {
            resultadosIndividuais.capitalGiro = calcularEfeitividadeCapitalGiro(dados, estrategias.capitalGiro, impactoBase);
            estrategiasAtivas.push('capitalGiro');
        }
        
        if (estrategias.mixProdutos.ativar) {
            resultadosIndividuais.mixProdutos = calcularEfeitividadeMixProdutos(dados, estrategias.mixProdutos, impactoBase);
            estrategiasAtivas.push('mixProdutos');
        }
        
        if (estrategias.meiosPagamento.ativar) {
            resultadosIndividuais.meiosPagamento = calcularEfeitividadeMeiosPagamento(dados, estrategias.meiosPagamento, impactoBase);
            estrategiasAtivas.push('meiosPagamento');
        }
        
        // Se não há estratégias ativas, retornar resultado vazio
        if (estrategiasAtivas.length === 0) {
            return {
                estrategiasOtimas: [],
                efetividadeTotal: 0,
                custoTotal: 0,
                relacaoCustoBeneficio: 0
            };
        }
        
        // Análise de todas as combinações possíveis
        const todasCombinacoes = gerarCombinacoes(estrategiasAtivas);
        const resultadosCombinacoes = [];
        
        for (const combinacao of todasCombinacoes) {
            if (combinacao.length === 0) continue;
            
            let efetividadeTotal = 0;
            let custoTotal = 0;
            
            // Calcular efetividade e custo da combinação
            for (const estrategia of combinacao) {
                const resultado = resultadosIndividuais[estrategia];
                
                // Aplicar fator de interação para evitar dupla contagem
                const fatorInteracao = calcularFatorInteracao(estrategia, combinacao, resultadosIndividuais);
                
                efetividadeTotal += resultado.efetividadePercentual * fatorInteracao;
                custoTotal += resultado.custoEstrategia;
            }
            
            // Limitar efetividade a 100%
            efetividadeTotal = Math.min(100, efetividadeTotal);
            
            // Relação custo-benefício
            const relacaoCustoBeneficio = custoTotal / efetividadeTotal;
            
            resultadosCombinacoes.push({
                combinacao,
                efetividadeTotal,
                custoTotal,
                relacaoCustoBeneficio
            });
        }
        
        // Ordenar combinações por relação custo-benefício (menor = melhor)
        resultadosCombinacoes.sort((a, b) => a.relacaoCustoBeneficio - b.relacaoCustoBeneficio);
        
        // Retornar a melhor combinação
        return {
            estrategiasOtimas: resultadosCombinacoes[0].combinacao,
            efetividadeTotal: resultadosCombinacoes[0].efetividadeTotal,
            custoTotal: resultadosCombinacoes[0].custoTotal,
            relacaoCustoBeneficio: resultadosCombinacoes[0].relacaoCustoBeneficio,
            resultadosIndividuais,
            todasCombinacoes: resultadosCombinacoes
        };
    }
    
    /**
     * Calcula o fator de interação entre estratégias para evitar dupla contagem
     * @param {string} estrategia - Nome da estratégia
     * @param {Array} combinacao - Lista de estratégias na combinação
     * @param {Object} resultadosIndividuais - Resultados individuais das estratégias
     * @returns {number} - Fator de interação (0-1)
     */
    function calcularFatorInteracao(estrategia, combinacao, resultadosIndividuais) {
        // Matriz de interação entre estratégias
        const matrizInteracao = {
            ajustePrecos: {
                renegociacaoPrazos: 0.9,
                antecipacaoRecebiveis: 0.8,
                capitalGiro: 1.0,
                mixProdutos: 0.7,
                meiosPagamento: 0.9
            },
            renegociacaoPrazos: {
                ajustePrecos: 0.9,
                antecipacaoRecebiveis: 0.9,
                capitalGiro: 0.95,
                mixProdutos: 0.9,
                meiosPagamento: 0.85
            },
            antecipacaoRecebiveis: {
                ajustePrecos: 0.8,
                renegociacaoPrazos: 0.9,
                capitalGiro: 0.7,
                mixProdutos: 0.9,
                meiosPagamento: 0.7
            },
            capitalGiro: {
                ajustePrecos: 1.0,
                renegociacaoPrazos: 0.95,
                antecipacaoRecebiveis: 0.7,
                mixProdutos: 1.0,
                meiosPagamento: 0.9
            },
            mixProdutos: {
                ajustePrecos: 0.7,
                renegociacaoPrazos: 0.9,
                antecipacaoRecebiveis: 0.9,
                capitalGiro: 1.0,
                meiosPagamento: 0.8
            },
            meiosPagamento: {
                ajustePrecos: 0.9,
                renegociacaoPrazos: 0.85,
                antecipacaoRecebiveis: 0.7,
                capitalGiro: 0.9,
                mixProdutos: 0.8
            }
        };
        
        // Para estratégia única, fator é 1
        if (combinacao.length === 1) {
            return 1.0;
        }
        
        // Calcular fator médio considerando todas as interações
        let fatorMedio = 1.0;
        let contadorInteracoes = 0;
        
        for (const outraEstrategia of combinacao) {
            if (outraEstrategia !== estrategia) {
                fatorMedio *= matrizInteracao[estrategia][outraEstrategia] || 0.9;
                contadorInteracoes++;
            }
        }
        
        // Se não houver interações, retornar 1
        if (contadorInteracoes === 0) {
            return 1.0;
        }
        
        return fatorMedio;
    }
    
    /**
     * Gera todas as combinações possíveis de um conjunto de elementos
     * @param {Array} elementos - Lista de elementos
     * @returns {Array} - Array de combinações
     */
    function gerarCombinacoes(elementos) {
        // Incluir o conjunto vazio
        const result = [[]];
        
        for (const elemento of elementos) {
            const novasCombinacoes = [];
            
            for (const combinacao of result) {
                novasCombinacoes.push([...combinacao, elemento]);
            }
            
            // Adicionar novas combinações ao resultado
            result.push(...novasCombinacoes);
        }
        
        // Remover o conjunto vazio
        return result.slice(1);
    }
    
    /**
     * Calcula a efetividade do ajuste de preços
     * Implementa a seção 6.1 da metodologia
     */
    function calcularEfeitividadeAjustePrecos(dados, estrategia, impactoBase) {
        // Implementação omitida por brevidade, mas seguiria a equação da seção 6.1
        // Retorna objeto com atributos como efetividadePercentual, custoEstrategia, etc.
    }
    
    // Demais funções de cálculo de efetividade para cada estratégia
    // ...
    
    // API pública
    return {
        calcularCombinacaoOtima,
        calcularEfeitividadeAjustePrecos,
        calcularEfeitividadeRenegociacaoPrazos,
        calcularEfeitividadeAntecipacaoRecebiveis,
        calcularEfeitividadeCapitalGiro,
        calcularEfeitividadeMixProdutos,
        calcularEfeitividadeMeiosPagamento
    };
})();