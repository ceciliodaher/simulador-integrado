// Novo arquivo: js/simulation/mitigation-strategies.js

/**
 * Módulo de Estratégias de Mitigação
 * Implementa análise completa de estratégias conforme a seção 6 da metodologia
 */
const MitigationStrategiesModule = (function() {
    
    /**
     * Calcula a combinação ótima de estratégias de mitigação
     * @param {Object} dadosPlanos - Dados base da simulação em formato plano
     * @param {Object} estrategiasPlanas - Configurações das estratégias em formato plano
     * @param {Object} impactoBase - Resultado do impacto base sem mitigação
     * @returns {Object} - Análise da combinação ótima
     * @throws {Error} - Se os dados não estiverem no formato plano esperado
     */
    function calcularCombinacaoOtima(dadosPlanos, estrategiasPlanas, impactoBase) {
        // Validar formato dos dados
        validarEstruturaDadosPlanos(dadosPlanos, 'dadosPlanos');
        validarEstruturaEstrategiasPlanas(estrategiasPlanas, 'estrategiasPlanas');

        // Normalizar dados críticos para cálculos
        const dadosNormalizados = normalizarDadosParaCalculo(dadosPlanos);

        // Estrutura para armazenar resultados por estratégia
        const resultadosIndividuais = {};
        let estrategiasAtivas = [];

        // Verificar cada estratégia
        // Ajuste de Preços
        if (estrategiasPlanas.apAtivar) {
            resultadosIndividuais.ajustePrecos = calcularEfeitividadeAjustePrecos(
                dadosNormalizados, 
                {
                    percentualAumento: estrategiasPlanas.apPercentualAumento,
                    elasticidade: estrategiasPlanas.apElasticidade,
                    impactoVendas: estrategiasPlanas.apImpactoVendas,
                    periodo: estrategiasPlanas.apPeriodo
                }, 
                impactoBase
            );
            estrategiasAtivas.push('ajustePrecos');
        }

        // Renegociação de Prazos
        if (estrategiasPlanas.rpAtivar) {
            resultadosIndividuais.renegociacaoPrazos = calcularEfeitividadeRenegociacaoPrazos(
                dadosNormalizados, 
                {
                    aumentoPrazo: estrategiasPlanas.rpAumentoPrazo,
                    percentualFornecedores: estrategiasPlanas.rpPercentualFornecedores,
                    contrapartidas: estrategiasPlanas.rpContrapartidas,
                    custo: estrategiasPlanas.rpCusto
                }, 
                impactoBase
            );
            estrategiasAtivas.push('renegociacaoPrazos');
        }

        // Antecipação de Recebíveis
        if (estrategiasPlanas.arAtivar) {
            resultadosIndividuais.antecipacaoRecebiveis = calcularEfeitividadeAntecipacaoRecebiveis(
                dadosNormalizados, 
                {
                    percentualAntecipacao: estrategiasPlanas.arPercentualAntecipacao,
                    taxaDesconto: estrategiasPlanas.arTaxaDesconto,
                    prazo: estrategiasPlanas.arPrazo
                }, 
                impactoBase
            );
            estrategiasAtivas.push('antecipacaoRecebiveis');
        }

        // Capital de Giro
        if (estrategiasPlanas.cgAtivar) {
            resultadosIndividuais.capitalGiro = calcularEfeitividadeCapitalGiro(
                dadosNormalizados, 
                {
                    valorCaptacao: estrategiasPlanas.cgValorCaptacao,
                    taxaJuros: estrategiasPlanas.cgTaxaJuros,
                    prazo: estrategiasPlanas.cgPrazo,
                    carencia: estrategiasPlanas.cgCarencia
                }, 
                impactoBase
            );
            estrategiasAtivas.push('capitalGiro');
        }

        // Mix de Produtos
        if (estrategiasPlanas.mpAtivar) {
            resultadosIndividuais.mixProdutos = calcularEfeitividadeMixProdutos(
                dadosNormalizados, 
                {
                    percentualAjuste: estrategiasPlanas.mpPercentualAjuste,
                    foco: estrategiasPlanas.mpFoco,
                    impactoReceita: estrategiasPlanas.mpImpactoReceita,
                    impactoMargem: estrategiasPlanas.mpImpactoMargem
                }, 
                impactoBase
            );
            estrategiasAtivas.push('mixProdutos');
        }

        // Meios de Pagamento
        if (estrategiasPlanas.mpagAtivar) {
            resultadosIndividuais.meiosPagamento = calcularEfeitividadeMeiosPagamento(
                dadosNormalizados, 
                {
                    distribuicaoAtual: {
                        vista: estrategiasPlanas.mpagVistaAtual,
                        prazo: estrategiasPlanas.mpagPrazoAtual
                    },
                    distribuicaoNova: {
                        vista: estrategiasPlanas.mpagVistaNovo,
                        dias30: estrategiasPlanas.mpagDias30Novo,
                        dias60: estrategiasPlanas.mpagDias60Novo,
                        dias90: estrategiasPlanas.mpagDias90Novo
                    },
                    taxaIncentivo: estrategiasPlanas.mpagTaxaIncentivo
                }, 
                impactoBase
            );
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
            const relacaoCustoBeneficio = efetividadeTotal > 0 ? custoTotal / efetividadeTotal : Infinity;

            resultadosCombinacoes.push({
                combinacao,
                efetividadeTotal,
                custoTotal,
                relacaoCustoBeneficio
            });
        }

        // Ordenar combinações por relação custo-benefício (menor = melhor)
        resultadosCombinacoes.sort((a, b) => a.relacaoCustoBeneficio - b.relacaoCustoBeneficio);

        // Se não houver resultados válidos, retornar objeto vazio
        if (resultadosCombinacoes.length === 0) {
            return {
                estrategiasOtimas: [],
                efetividadeTotal: 0,
                custoTotal: 0,
                relacaoCustoBeneficio: 0,
                resultadosIndividuais: {},
                todasCombinacoes: []
            };
        }

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
     * Valida se os dados estão no formato plano esperado
     * @param {Object} dados - Dados a serem validados
     * @param {string} contexto - Contexto da validação para mensagens de erro
     * @throws {Error} - Se os dados não estiverem no formato esperado
     */
    function validarEstruturaDadosPlanos(dados, contexto) {
        if (!dados) {
            throw new Error(`${contexto}: Dados não fornecidos`);
        }

        // Verificar se está em formato plano (não aninhado)
        if (dados.empresa !== undefined) {
            throw new Error(`${contexto}: Formato de dados aninhado detectado. Utilize DataManager.converterParaEstruturaPlana() antes de chamar esta função.`);
        }

        // Verificar campos essenciais
        const camposEssenciais = ['faturamento', 'margem'];
        for (const campo of camposEssenciais) {
            if (dados[campo] === undefined) {
                throw new Error(`${contexto}: Campo obrigatório ausente: ${campo}`);
            }
        }

        // Verificar tipos de dados críticos
        if (typeof dados.faturamento !== 'number' || isNaN(dados.faturamento)) {
            throw new TypeError(`${contexto}: Faturamento deve ser numérico, recebido: ${typeof dados.faturamento}`);
        }

        if (typeof dados.margem !== 'number' || isNaN(dados.margem) || dados.margem < 0 || dados.margem > 1) {
            throw new RangeError(`${contexto}: Margem operacional fora do intervalo válido (0-1): ${dados.margem}`);
        }
    }

    /**
     * Valida se as estratégias estão no formato plano esperado
     * @param {Object} estrategias - Estratégias a serem validadas
     * @param {string} contexto - Contexto da validação para mensagens de erro
     * @throws {Error} - Se as estratégias não estiverem no formato esperado
     */
    function validarEstruturaEstrategiasPlanas(estrategias, contexto) {
        if (!estrategias) {
            throw new Error(`${contexto}: Estratégias não fornecidas`);
        }

        // Verificar se está em formato plano (não aninhado)
        if (estrategias.estrategias !== undefined || estrategias.ajustePrecos !== undefined) {
            throw new Error(`${contexto}: Formato de estratégias aninhado detectado. Utilize DataManager.converterParaEstruturaPlana() antes de chamar esta função.`);
        }

        // Verificar campos de ativação de estratégias
        const camposAtivacao = ['apAtivar', 'rpAtivar', 'arAtivar', 'cgAtivar', 'mpAtivar', 'mpagAtivar'];
        let estrategiaEncontrada = false;

        for (const campo of camposAtivacao) {
            if (estrategias[campo] !== undefined) {
                estrategiaEncontrada = true;

                // Verificar se é booleano ou pode ser convertido para booleano
                estrategias[campo] = !!estrategias[campo];
            }
        }

        if (!estrategiaEncontrada) {
            throw new Error(`${contexto}: Nenhuma estratégia de mitigação encontrada nas configurações`);
        }
    }

    /**
     * Normaliza dados críticos para cálculos
     * @param {Object} dados - Dados em formato plano
     * @returns {Object} - Dados normalizados para cálculos
     */
    function normalizarDadosParaCalculo(dados) {
        // Criar cópia para não modificar o original
        const dadosNormalizados = {...dados};

        // Garantir que campos numéricos sejam números
        const camposNumericos = [
            'faturamento', 'margem', 'pmr', 'pmp', 'pme', 
            'percVista', 'percPrazo', 'aliquota', 'taxaCapitalGiro', 
            'taxaAntecipacao'
        ];

        for (const campo of camposNumericos) {
            if (dadosNormalizados[campo] !== undefined) {
                // Garantir que é um número e não NaN
                if (typeof dadosNormalizados[campo] !== 'number' || isNaN(dadosNormalizados[campo])) {
                    dadosNormalizados[campo] = 0;
                }
            }
        }

        // Garantir que percentuais estejam em formato decimal (0-1)
        const camposPercentuais = ['margem', 'percVista', 'percPrazo', 'aliquota', 'taxaCapitalGiro', 'taxaAntecipacao'];

        for (const campo of camposPercentuais) {
            if (dadosNormalizados[campo] !== undefined) {
                // Se valor > 1, assumir que está em percentual (0-100) e converter para decimal
                if (dadosNormalizados[campo] > 1) {
                    dadosNormalizados[campo] = dadosNormalizados[campo] / 100;
                }

                // Limitar ao intervalo 0-1
                dadosNormalizados[campo] = Math.max(0, Math.min(1, dadosNormalizados[campo]));
            }
        }

        // Garantir que a soma de percentuais complementares seja 1
        if (dadosNormalizados.percVista !== undefined && dadosNormalizados.percPrazo !== undefined) {
            if (Math.abs(dadosNormalizados.percVista + dadosNormalizados.percPrazo - 1) > 0.001) {
                // Ajustar percPrazo para complementar percVista
                dadosNormalizados.percPrazo = 1 - dadosNormalizados.percVista;
            }
        }

        return dadosNormalizados;
    }
    
    /**
     * Calcula a efetividade do ajuste de preços
     * Implementa a seção 6.1 da metodologia
     * @param {Object} dadosPlanos - Dados da simulação em formato plano
     * @param {Object} estrategia - Configuração da estratégia
     * @param {Object} impactoBase - Resultado do impacto base sem mitigação
     * @returns {Object} - Análise de efetividade
     */
    function calcularEfeitividadeAjustePrecos(dadosPlanos, estrategia, impactoBase) {
        // Validar parâmetros essenciais
        if (!dadosPlanos || !estrategia || !impactoBase) {
            throw new Error('Parâmetros incompletos para cálculo de efetividade de ajuste de preços');
        }

        // Extrair e normalizar parâmetros
        const faturamento = Number(dadosPlanos.faturamento) || 0;
        const margem = Number(dadosPlanos.margem) || 0;

        const percentualAumento = Number(estrategia.percentualAumento) || 0;
        const elasticidade = Number(estrategia.elasticidade) || 0;
        const periodo = Number(estrategia.periodo) || 0;

        // Calcular impacto nas vendas baseado na elasticidade
        const impactoVendasPercentual = percentualAumento * elasticidade / 100;

        // Calcular faturamento ajustado
        const faturamentoAjustado = faturamento * (1 + percentualAumento/100) * (1 + impactoVendasPercentual);

        // Calcular fluxo de caixa adicional por mês
        const fluxoCaixaAdicional = (faturamentoAjustado - faturamento) * margem;

        // Calcular mitigação mensal e total
        const mitigacaoMensal = fluxoCaixaAdicional;
        const mitigacaoTotal = mitigacaoMensal * periodo;

        // Calcular efetividade em relação ao impacto base
        const necessidadeCapitalGiro = Math.abs(impactoBase.diferencaCapitalGiro || 0);
        const efetividadePercentual = necessidadeCapitalGiro > 0 ? 
                                      (mitigacaoTotal / necessidadeCapitalGiro) * 100 : 0;

        // Calcular custo da estratégia (perda de receita devido à elasticidade negativa)
        const perdaReceita = impactoVendasPercentual < 0 ? 
                             Math.abs(faturamento * impactoVendasPercentual) * periodo : 0;

        // Relação custo-benefício
        const custoEstrategia = perdaReceita;
        const custoBeneficio = mitigacaoTotal > 0 ? custoEstrategia / mitigacaoTotal : Infinity;

        // Resultado detalhado
        return {
            percentualAumento,
            elasticidade,
            impactoVendasPercentual,
            faturamentoOriginal: faturamento,
            faturamentoAjustado,
            fluxoCaixaAdicional,
            mitigacaoMensal,
            mitigacaoTotal,
            efetividadePercentual,
            custoEstrategia,
            custoBeneficio,
            periodo
        };
    }
    
    /**
     * Wrapper de compatibilidade para calcular a combinação ótima
     * Aceita dados em formato aninhado e os converte para formato plano
     * @param {Object} dadosAninhados - Dados da simulação em formato aninhado ou plano
     * @param {Object} impactoBase - Resultado do impacto base sem mitigação
     * @returns {Object} - Análise da combinação ótima
     */
    function calcularCombinacaoOtimaCompat(dadosAninhados, impactoBase) {
        // Verificar se os dados já estão em formato plano
        const ehFormatoPlano = dadosAninhados.empresa === undefined;

        let dadosPlanos, estrategiasPlanas;

        if (ehFormatoPlano) {
            // Dados já estão em formato plano
            dadosPlanos = {...dadosAninhados};
            estrategiasPlanas = dadosAninhados; // Assumindo que estratégias estão no mesmo objeto
        } else {
            // Converter dados e estratégias para formato plano
            try {
                dadosPlanos = window.DataManager.converterParaEstruturaPlana(dadosAninhados);

                // Estratégias estão dentro do objeto aninhado, então já foram convertidas junto
                estrategiasPlanas = dadosPlanos;
            } catch (erro) {
                console.error('Erro ao converter dados aninhados para formato plano:', erro);
                throw new Error('Falha na conversão de dados: ' + erro.message);
            }
        }

        // Chamar a implementação interna com dados em formato plano
        return calcularCombinacaoOtima(dadosPlanos, estrategiasPlanas, impactoBase);
    }
    
    // Demais funções de cálculo de efetividade para cada estratégia
    // ...
    
    // API pública
    return {
        calcularCombinacaoOtima,
        calcularCombinacaoOtimaCompat, // Nova função wrapper
        calcularEfeitividadeAjustePrecos,
        calcularEfeitividadeRenegociacaoPrazos,
        calcularEfeitividadeAntecipacaoRecebiveis,
        calcularEfeitividadeCapitalGiro,
        calcularEfeitividadeMixProdutos,
        calcularEfeitividadeMeiosPagamento,
        // Funções auxiliares de validação
        validarEstruturaDadosPlanos,
        validarEstruturaEstrategiasPlanas,
        normalizarDadosParaCalculo
    };
})();