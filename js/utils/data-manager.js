/**
 * @fileoverview Gerenciador centralizado de estruturas de dados do simulador
 * Responsável pela validação, conversão e normalização das estruturas de dados
 * 
 * @module data-manager
 * @author Expertzy Inteligência Tributária
 * @version 1.0.0
 */

window.DataManager = (function() {
    /**
     * Estrutura canônica padrão de dados
     * Utilizada como base para validação e criação de novas estruturas
     */
    const estruturaPadrao = {
        empresa: {
            faturamento: 0,           // Valor monetário (R$)
            margem: 0,                // Decimal (0-1)
            setor: '',                // Código alfanumérico 
            tipoEmpresa: '',          // 'comercio', 'industria', 'servicos'
            regime: ''                // 'simples', 'presumido', 'real'
        },
        cicloFinanceiro: {
            pmr: 30,                  // Dias
            pmp: 30,                  // Dias
            pme: 30,                  // Dias
            percVista: 0.3,           // Decimal (0-1)
            percPrazo: 0.7            // Decimal (0-1)
        },
        parametrosFiscais: {
            aliquota: 0.265,          // Decimal (0-1)
            tipoOperacao: '',         // 'b2b', 'b2c', 'mista'
            regimePisCofins: '',      // 'cumulativo', 'nao-cumulativo'
            creditos: {               // Valores monetários (R$)
                pis: 0,               
                cofins: 0,            
                icms: 0,              
                ipi: 0,               
                cbs: 0,               
                ibs: 0                
            }
        },
        parametrosSimulacao: {
            cenario: 'moderado',      // 'conservador', 'moderado', 'otimista', 'personalizado'
            taxaCrescimento: 0.05,    // Decimal (0-1)
            dataInicial: '2026-01-01',// ISO 8601
            dataFinal: '2033-12-31',  // ISO 8601
            splitPayment: true        // Booleano
        },
        parametrosFinanceiros: {
            taxaCapitalGiro: 0.021,   // Decimal (0-1)
            taxaAntecipacao: 0.018,   // Decimal (0-1)
            spreadBancario: 0.005     // Decimal (0-1)
        },
        ivaConfig: {
            cbs: 0.088,               // Decimal (0-1)
            ibs: 0.177,               // Decimal (0-1)
            categoriaIva: 'standard', // 'standard', 'reduced', 'exempt'
            reducaoEspecial: 0        // Decimal (0-1)
        },
        estrategias: {
            ajustePrecos: {
                ativar: false,            // Booleano
                percentualAumento: 5,     // Percentual inteiro (%)
                elasticidade: -1.2,       // Decimal
                impactoVendas: 0,         // Calculado
                periodo: 3                // Meses
            },
            renegociacaoPrazos: {
                ativar: false,            // Booleano
                aumentoPrazo: 15,         // Dias
                percentualFornecedores: 60,// Percentual inteiro (%)
                contrapartidas: "nenhuma", // "nenhuma", "volume", "precos", "contratos"
                custoContrapartida: 0     // Decimal (0-1)
            },
            antecipacaoRecebiveis: {
                ativar: false,            // Booleano
                percentualAntecipacao: 50,// Percentual inteiro (%)
                taxaDesconto: 1.8,        // Percentual (%)
                prazoAntecipacao: 25      // Dias
            },
            capitalGiro: {
                ativar: false,            // Booleano
                valorCaptacao: 100,       // Percentual inteiro (%)
                taxaJuros: 2.1,           // Percentual (% a.m.)
                prazoPagamento: 12,       // Meses
                carencia: 3               // Meses
            },
            mixProdutos: {
                ativar: false,            // Booleano
                percentualAjuste: 30,     // Percentual inteiro (%)
                focoAjuste: "ciclo",      // "ciclo", "margem", "vista"
                impactoReceita: -5,       // Percentual (%)
                impactoMargem: 3.5        // Pontos percentuais
            },
            meiosPagamento: {
                ativar: false,            // Booleano
                distribuicaoAtual: {
                    vista: 30,            // Percentual inteiro (%)
                    prazo: 70             // Percentual inteiro (%)
                },
                distribuicaoNova: {
                    vista: 40,            // Percentual inteiro (%)
                    dias30: 30,           // Percentual inteiro (%)
                    dias60: 20,           // Percentual inteiro (%)
                    dias90: 10            // Percentual inteiro (%)
                },
                taxaIncentivo: 3          // Percentual (%)
            }
        },
        cronogramaImplementacao: {
            2026: 0.10,               // Decimal (0-1)
            2027: 0.25,               // Decimal (0-1)
            2028: 0.40,               // Decimal (0-1)
            2029: 0.55,               // Decimal (0-1)
            2030: 0.70,               // Decimal (0-1)
            2031: 0.85,               // Decimal (0-1)
            2032: 0.95,               // Decimal (0-1)
            2033: 1.00                // Decimal (0-1)
        }
    };

    /**
     * Retorna uma cópia profunda da estrutura aninhada padrão
     * @returns {Object} - Estrutura aninhada padrão
     */
    function obterEstruturaAninhadaPadrao() {
        return JSON.parse(JSON.stringify(estruturaPadrao));
    }

    /**
     * Converte a estrutura aninhada para estrutura plana para cálculos
     * @param {Object} dadosAninhados - Dados na estrutura aninhada
     * @returns {Object} - Dados na estrutura plana para cálculos
     */
    function converterParaEstruturaPlana(dadosAninhados) {
        // Verificar se já é uma estrutura plana
        if (dadosAninhados.empresa === undefined) {
            return JSON.parse(JSON.stringify(dadosAninhados)); // Cópia defensiva de estrutura já plana
        }

        // Iniciar com objeto vazio
        const plano = {};
        
        // Empresa
        if (dadosAninhados.empresa) {
            plano.faturamento = dadosAninhados.empresa.faturamento !== undefined ? 
                dadosAninhados.empresa.faturamento : 0;
            plano.margem = dadosAninhados.empresa.margem || 0;
            plano.setor = dadosAninhados.empresa.setor || '';
            plano.tipoEmpresa = dadosAninhados.empresa.tipoEmpresa || '';
            plano.regime = dadosAninhados.empresa.regime || '';
        }
        
        // Ciclo Financeiro
        if (dadosAninhados.cicloFinanceiro) {
            plano.pmr = dadosAninhados.cicloFinanceiro.pmr || 30;
            plano.pmp = dadosAninhados.cicloFinanceiro.pmp || 30;
            plano.pme = dadosAninhados.cicloFinanceiro.pme || 30;
            plano.percVista = dadosAninhados.cicloFinanceiro.percVista || 0.3;
            plano.percPrazo = dadosAninhados.cicloFinanceiro.percPrazo || 0.7;
        }
        
        // Parâmetros Fiscais
        if (dadosAninhados.parametrosFiscais) {
            plano.aliquota = dadosAninhados.parametrosFiscais.aliquota || 0.265;
            plano.tipoOperacao = dadosAninhados.parametrosFiscais.tipoOperacao || '';
            plano.regimePisCofins = dadosAninhados.parametrosFiscais.regimePisCofins || '';
            
            // Tratar créditos separadamente
            if (dadosAninhados.parametrosFiscais.creditos) {
                const creditos = dadosAninhados.parametrosFiscais.creditos;
                plano.creditosPIS = creditos.pis || 0;
                plano.creditosCOFINS = creditos.cofins || 0;
                plano.creditosICMS = creditos.icms || 0;
                plano.creditosIPI = creditos.ipi || 0;
                plano.creditosCBS = creditos.cbs || 0;
                plano.creditosIBS = creditos.ibs || 0;
                
                // Também adicionar um campo total de créditos por conveniência
                plano.creditos = Object.values(creditos).reduce((sum, val) => sum + (val || 0), 0);
            } else {
                plano.creditosPIS = 0;
                plano.creditosCOFINS = 0;
                plano.creditosICMS = 0;
                plano.creditosIPI = 0;
                plano.creditosCBS = 0;
                plano.creditosIBS = 0;
                plano.creditos = 0;
            }
        }
        
        // Parâmetros de Simulação
        if (dadosAninhados.parametrosSimulacao) {
            
            // Parâmetros de Simulação
            if (dadosAninhados.parametrosSimulacao) {
                plano.cenario = dadosAninhados.parametrosSimulacao.cenario || 'moderado';
                plano.taxaCrescimento = dadosAninhados.parametrosSimulacao.taxaCrescimento || 0.05;
                plano.dataInicial = dadosAninhados.parametrosSimulacao.dataInicial || '2026-01-01';
                plano.dataFinal = dadosAninhados.parametrosSimulacao.dataFinal || '2033-12-31';
                plano.splitPayment = dadosAninhados.parametrosSimulacao.splitPayment !== false; // Default true
            }
        }
        
        // Parâmetros Financeiros
        if (dadosAninhados.parametrosFinanceiros) {
            plano.taxaCapitalGiro = dadosAninhados.parametrosFinanceiros.taxaCapitalGiro || 0.021;
            plano.taxaAntecipacao = dadosAninhados.parametrosFinanceiros.taxaAntecipacao || 0.018;
            plano.spreadBancario = dadosAninhados.parametrosFinanceiros.spreadBancario || 0.005;
        }
        
        // IVA Config
        if (dadosAninhados.ivaConfig) {
            // Garantir conversão para números
            // Modificar esta parte para garantir a conversão adequada
            plano.aliquotaCBS = typeof dadosAninhados.ivaConfig.cbs === 'string' ? 
                               parseFloat(dadosAninhados.ivaConfig.cbs.replace(',', '.')) / 100 : 
                               dadosAninhados.ivaConfig.cbs || 0.088;

            plano.aliquotaIBS = typeof dadosAninhados.ivaConfig.ibs === 'string' ? 
                               parseFloat(dadosAninhados.ivaConfig.ibs.replace(',', '.')) / 100 : 
                               dadosAninhados.ivaConfig.ibs || 0.177;

            plano.categoriaIVA = dadosAninhados.ivaConfig.categoriaIva || 'standard';
            plano.reducaoEspecial = dadosAninhados.ivaConfig.reducaoEspecial || 0;
        }
        
        // Estratégias (apenas se necessário para algum módulo específico)
        if (dadosAninhados.estrategias) {
            plano.estrategias = JSON.parse(JSON.stringify(dadosAninhados.estrategias));
        }
        
        // Cronograma (apenas se necessário para algum módulo específico)
        if (dadosAninhados.cronogramaImplementacao) {
            plano.cronogramaImplementacao = JSON.parse(JSON.stringify(dadosAninhados.cronogramaImplementacao));
        }
        
        // Adicionar campos derivados
        plano.serviceCompany = plano.tipoEmpresa === 'servicos';
        plano.cumulativeRegime = plano.regimePisCofins === 'cumulativo';
        
        // Registrar conversão para depuração se o modo de debug estiver ativo
        logTransformacao(dadosAninhados, plano, 'Aninhada → Plana');
        
        return plano;
    }
    
    /**
     * Converte a estrutura plana para estrutura aninhada
     * @param {Object} dadosPlanos - Dados na estrutura plana
     * @returns {Object} - Dados na estrutura aninhada
     */
    function converterParaEstruturaAninhada(dadosPlanos) {
        // Verificar se já é uma estrutura aninhada
        if (dadosPlanos.empresa !== undefined) {
            return JSON.parse(JSON.stringify(dadosPlanos)); // Cópia defensiva
        }

        // Iniciar com uma cópia da estrutura padrão
        const aninhado = JSON.parse(JSON.stringify(estruturaPadrao));
        
        // Empresa
        aninhado.empresa = {
            faturamento: dadosPlanos.faturamento !== undefined ? dadosPlanos.faturamento : 0,
            margem: dadosPlanos.margem !== undefined ? dadosPlanos.margem : 0,
            setor: dadosPlanos.setor || '',
            tipoEmpresa: dadosPlanos.tipoEmpresa || '',
            regime: dadosPlanos.regime || ''
        };
        
        // Ciclo Financeiro
        aninhado.cicloFinanceiro = {
            pmr: dadosPlanos.pmr !== undefined ? dadosPlanos.pmr : 30,
            pmp: dadosPlanos.pmp !== undefined ? dadosPlanos.pmp : 30,
            pme: dadosPlanos.pme !== undefined ? dadosPlanos.pme : 30,
            percVista: dadosPlanos.percVista !== undefined ? dadosPlanos.percVista : 0.3,
            percPrazo: dadosPlanos.percPrazo !== undefined ? dadosPlanos.percPrazo : 0.7
        };
        
        // Parâmetros Fiscais
        aninhado.parametrosFiscais = {
            aliquota: dadosPlanos.aliquota !== undefined ? dadosPlanos.aliquota : 0.265,
            tipoOperacao: dadosPlanos.tipoOperacao || '',
            regimePisCofins: dadosPlanos.regimePisCofins || '',
            creditos: {
                pis: dadosPlanos.creditosPIS || 0,
                cofins: dadosPlanos.creditosCOFINS || 0,
                icms: dadosPlanos.creditosICMS || 0,
                ipi: dadosPlanos.creditosIPI || 0,
                cbs: dadosPlanos.creditosCBS || 0,
                ibs: dadosPlanos.creditosIBS || 0
            }
        };
        
        // Parâmetros de Simulação
        aninhado.parametrosSimulacao = {
            cenario: dadosPlanos.cenario || 'moderado',
            taxaCrescimento: dadosPlanos.taxaCrescimento !== undefined ? dadosPlanos.taxaCrescimento : 0.05,
            dataInicial: dadosPlanos.dataInicial || '2026-01-01',
            dataFinal: dadosPlanos.dataFinal || '2033-12-31',
            splitPayment: dadosPlanos.splitPayment !== false // Default true
        };
        
        // Parâmetros Financeiros
        aninhado.parametrosFinanceiros = {
            taxaCapitalGiro: dadosPlanos.taxaCapitalGiro !== undefined ? dadosPlanos.taxaCapitalGiro : 0.021,
            taxaAntecipacao: dadosPlanos.taxaAntecipacao !== undefined ? dadosPlanos.taxaAntecipacao : 0.018,
            spreadBancario: dadosPlanos.spreadBancario !== undefined ? dadosPlanos.spreadBancario : 0.005
        };
        
        // IVA Config
        aninhado.ivaConfig = {
            cbs: dadosPlanos.aliquotaCBS !== undefined ? dadosPlanos.aliquotaCBS : 0.088,
            ibs: dadosPlanos.aliquotaIBS !== undefined ? dadosPlanos.aliquotaIBS : 0.177,
            categoriaIva: dadosPlanos.categoriaIVA || 'standard',
            reducaoEspecial: dadosPlanos.reducaoEspecial !== undefined ? dadosPlanos.reducaoEspecial : 0
        };
        
        // Estratégias e Cronograma (manter se forem fornecidos)
        if (dadosPlanos.estrategias) {
            aninhado.estrategias = JSON.parse(JSON.stringify(dadosPlanos.estrategias));
        }
        
        if (dadosPlanos.cronogramaImplementacao) {
            aninhado.cronogramaImplementacao = JSON.parse(JSON.stringify(dadosPlanos.cronogramaImplementacao));
        }
        
        // Registrar conversão para depuração
        logTransformacao(dadosPlanos, aninhado, 'Plana → Aninhada');
        
        return aninhado;
    }
    
    /**
     * Valida e normaliza os dados na estrutura aninhada
     * @param {Object} dados - Dados a serem validados
     * @returns {Object} - Dados validados e normalizados
     */
    function validarENormalizar(dados) {
        // Fazer uma cópia defensiva
        const resultado = JSON.parse(JSON.stringify(dados || {}));
        
        // Validação de Empresa
        if (!resultado.empresa) resultado.empresa = {...estruturaPadrao.empresa};
        
        // Garantir que faturamento seja numérico
        if (typeof resultado.empresa.faturamento === 'string') {
            resultado.empresa.faturamento = parseFloat(resultado.empresa.faturamento.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        }
        
        // Converter porcentagens para decimal se necessário
        if (resultado.empresa.margem > 1) {
            resultado.empresa.margem = resultado.empresa.margem / 100;
        }
        
        // Garantir valores não-negativos
        resultado.empresa.faturamento = Math.max(0, resultado.empresa.faturamento);
        resultado.empresa.margem = Math.max(0, Math.min(1, resultado.empresa.margem)); // Entre 0 e 1
        
        // Validar tipo de empresa
        const tiposEmpresaValidos = ['comercio', 'industria', 'servicos'];
        if (!tiposEmpresaValidos.includes(resultado.empresa.tipoEmpresa)) {
            console.warn(`Tipo de empresa inválido: "${resultado.empresa.tipoEmpresa}". Utilizando valor padrão vazio.`);
            resultado.empresa.tipoEmpresa = '';
        }
        
        // Validar regime tributário
        const regimesTributariosValidos = ['simples', 'presumido', 'real'];
        if (!regimesTributariosValidos.includes(resultado.empresa.regime)) {
            console.warn(`Regime tributário inválido: "${resultado.empresa.regime}". Utilizando valor padrão vazio.`);
            resultado.empresa.regime = '';
        }
        
        // Validação Ciclo Financeiro
        if (!resultado.cicloFinanceiro) resultado.cicloFinanceiro = {...estruturaPadrao.cicloFinanceiro};
        
        // Garantir valores não-negativos para prazos
        resultado.cicloFinanceiro.pmr = Math.max(0, resultado.cicloFinanceiro.pmr || 0);
        resultado.cicloFinanceiro.pmp = Math.max(0, resultado.cicloFinanceiro.pmp || 0);
        resultado.cicloFinanceiro.pme = Math.max(0, resultado.cicloFinanceiro.pme || 0);
        
        // Converter porcentagens para decimal
        if (resultado.cicloFinanceiro.percVista > 1) {
            resultado.cicloFinanceiro.percVista = resultado.cicloFinanceiro.percVista / 100;
        }
        
        if (resultado.cicloFinanceiro.percPrazo > 1) {
            resultado.cicloFinanceiro.percPrazo = resultado.cicloFinanceiro.percPrazo / 100;
        }
        
        // Garantir percentuais entre 0 e 1
        resultado.cicloFinanceiro.percVista = Math.max(0, Math.min(1, resultado.cicloFinanceiro.percVista));
        resultado.cicloFinanceiro.percPrazo = Math.max(0, Math.min(1, resultado.cicloFinanceiro.percPrazo));
        
        // Garantir que a soma seja 1
        const somaPercs = resultado.cicloFinanceiro.percVista + resultado.cicloFinanceiro.percPrazo;
        if (Math.abs(somaPercs - 1) > 0.01) {
            // Ajustar para garantir soma = 1
            console.warn(`Soma dos percentuais de vendas (${somaPercs}) não é 1. Ajustando...`);
            
            if (somaPercs === 0) {
                // Se ambos são zero, usar valores padrão
                resultado.cicloFinanceiro.percVista = 0.3;
                resultado.cicloFinanceiro.percPrazo = 0.7;
            } else {
                // Normalizar proporcionalmente
                resultado.cicloFinanceiro.percVista = resultado.cicloFinanceiro.percVista / somaPercs;
                resultado.cicloFinanceiro.percPrazo = resultado.cicloFinanceiro.percPrazo / somaPercs;
            }
        }
        
        // Validação Parâmetros Fiscais
        if (!resultado.parametrosFiscais) resultado.parametrosFiscais = {...estruturaPadrao.parametrosFiscais};
        
        // Converter alíquota para decimal se necessário
        if (resultado.parametrosFiscais.aliquota > 1) {
            resultado.parametrosFiscais.aliquota = resultado.parametrosFiscais.aliquota / 100;
        }
        
        // Garantir alíquota entre 0 e 1
        resultado.parametrosFiscais.aliquota = Math.max(0, Math.min(1, resultado.parametrosFiscais.aliquota));
        
        // Validar tipo de operação
        const tiposOperacaoValidos = ['b2b', 'b2c', 'mista'];
        if (resultado.parametrosFiscais.tipoOperacao && !tiposOperacaoValidos.includes(resultado.parametrosFiscais.tipoOperacao)) {
            console.warn(`Tipo de operação inválido: "${resultado.parametrosFiscais.tipoOperacao}". Utilizando valor padrão vazio.`);
            resultado.parametrosFiscais.tipoOperacao = '';
        }
        
        // Validar regime PIS/COFINS
        const regimesPisCofinsValidos = ['cumulativo', 'nao-cumulativo'];
        if (resultado.parametrosFiscais.regimePisCofins && !regimesPisCofinsValidos.includes(resultado.parametrosFiscais.regimePisCofins)) {
            console.warn(`Regime PIS/COFINS inválido: "${resultado.parametrosFiscais.regimePisCofins}". Utilizando valor padrão vazio.`);
            resultado.parametrosFiscais.regimePisCofins = '';
        }
        
        // Garantir que créditos existam e sejam não-negativos
        if (!resultado.parametrosFiscais.creditos) {
            resultado.parametrosFiscais.creditos = {...estruturaPadrao.parametrosFiscais.creditos};
        } else {
            // Normalizar todos os valores de créditos
            Object.keys(estruturaPadrao.parametrosFiscais.creditos).forEach(key => {
                if (resultado.parametrosFiscais.creditos[key] === undefined) {
                    resultado.parametrosFiscais.creditos[key] = 0;
                } else if (typeof resultado.parametrosFiscais.creditos[key] === 'string') {
                    resultado.parametrosFiscais.creditos[key] = parseFloat(resultado.parametrosFiscais.creditos[key].replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                }
                
                // Garantir valores não-negativos
                resultado.parametrosFiscais.creditos[key] = Math.max(0, resultado.parametrosFiscais.creditos[key]);
            });
        }
        
        // Validação Parâmetros Simulação
        if (!resultado.parametrosSimulacao) resultado.parametrosSimulacao = {...estruturaPadrao.parametrosSimulacao};
        
        // Validar cenário
        const cenariosValidos = ['conservador', 'moderado', 'otimista', 'personalizado'];
        if (!cenariosValidos.includes(resultado.parametrosSimulacao.cenario)) {
            console.warn(`Cenário inválido: "${resultado.parametrosSimulacao.cenario}". Utilizando valor padrão "moderado".`);
            resultado.parametrosSimulacao.cenario = 'moderado';
        }
        
        // Converter taxa de crescimento para decimal se necessário
        if (resultado.parametrosSimulacao.taxaCrescimento > 1) {
            resultado.parametrosSimulacao.taxaCrescimento = resultado.parametrosSimulacao.taxaCrescimento / 100;
        }
        
        // Garantir taxa entre 0 e 1
        resultado.parametrosSimulacao.taxaCrescimento = Math.max(0, Math.min(1, resultado.parametrosSimulacao.taxaCrescimento));
        
        // Validar formato de datas
        const regexData = /^\d{4}-\d{2}-\d{2}$/;
        if (!regexData.test(resultado.parametrosSimulacao.dataInicial)) {
            console.warn(`Data inicial inválida: "${resultado.parametrosSimulacao.dataInicial}". Utilizando valor padrão "2026-01-01".`);
            resultado.parametrosSimulacao.dataInicial = '2026-01-01';
        }
        
        if (!regexData.test(resultado.parametrosSimulacao.dataFinal)) {
            console.warn(`Data final inválida: "${resultado.parametrosSimulacao.dataFinal}". Utilizando valor padrão "2033-12-31".`);
            resultado.parametrosSimulacao.dataFinal = '2033-12-31';
        }
        
        // Garantir que data final seja posterior à data inicial
        if (resultado.parametrosSimulacao.dataFinal < resultado.parametrosSimulacao.dataInicial) {
            console.warn(`Data final (${resultado.parametrosSimulacao.dataFinal}) é anterior à data inicial (${resultado.parametrosSimulacao.dataInicial}). Invertendo datas.`);
            [resultado.parametrosSimulacao.dataInicial, resultado.parametrosSimulacao.dataFinal] = 
            [resultado.parametrosSimulacao.dataFinal, resultado.parametrosSimulacao.dataInicial];
        }
        
        // Validação Parâmetros Financeiros
        if (!resultado.parametrosFinanceiros) resultado.parametrosFinanceiros = {...estruturaPadrao.parametrosFinanceiros};
        
        // Converter taxas para decimal se necessário
        if (resultado.parametrosFinanceiros.taxaCapitalGiro > 1) {
            resultado.parametrosFinanceiros.taxaCapitalGiro = resultado.parametrosFinanceiros.taxaCapitalGiro / 100;
        }
        
        if (resultado.parametrosFinanceiros.taxaAntecipacao > 1) {
            resultado.parametrosFinanceiros.taxaAntecipacao = resultado.parametrosFinanceiros.taxaAntecipacao / 100;
        }
        
        if (resultado.parametrosFinanceiros.spreadBancario > 1) {
            resultado.parametrosFinanceiros.spreadBancario = resultado.parametrosFinanceiros.spreadBancario / 100;
        }
        
        // Garantir taxas não-negativas
        resultado.parametrosFinanceiros.taxaCapitalGiro = Math.max(0, resultado.parametrosFinanceiros.taxaCapitalGiro);
        resultado.parametrosFinanceiros.taxaAntecipacao = Math.max(0, resultado.parametrosFinanceiros.taxaAntecipacao);
        resultado.parametrosFinanceiros.spreadBancario = Math.max(0, resultado.parametrosFinanceiros.spreadBancario);
        
        // Validação IVA Config
        if (!resultado.ivaConfig) resultado.ivaConfig = {...estruturaPadrao.ivaConfig};
        
        // Converter alíquotas para decimal se necessário
        if (resultado.ivaConfig.cbs > 1) {
            resultado.ivaConfig.cbs = resultado.ivaConfig.cbs / 100;
        }
        
        if (resultado.ivaConfig.ibs > 1) {
            resultado.ivaConfig.ibs = resultado.ivaConfig.ibs / 100;
        }
        
        if (resultado.ivaConfig.reducaoEspecial > 1) {
            resultado.ivaConfig.reducaoEspecial = resultado.ivaConfig.reducaoEspecial / 100;
        }
        
        // Garantir alíquotas entre 0 e 1
        resultado.ivaConfig.cbs = Math.max(0, Math.min(1, resultado.ivaConfig.cbs));
        resultado.ivaConfig.ibs = Math.max(0, Math.min(1, resultado.ivaConfig.ibs));
        resultado.ivaConfig.reducaoEspecial = Math.max(0, Math.min(1, resultado.ivaConfig.reducaoEspecial));
        
        // Validar categoria IVA
        const categoriasIvaValidas = ['standard', 'reduced', 'exempt'];
        if (!categoriasIvaValidas.includes(resultado.ivaConfig.categoriaIva)) {
            console.warn(`Categoria IVA inválida: "${resultado.ivaConfig.categoriaIva}". Utilizando valor padrão "standard".`);
            resultado.ivaConfig.categoriaIva = 'standard';
        }
        
        // Validação do Cronograma
        if (!resultado.cronogramaImplementacao) {
            resultado.cronogramaImplementacao = {...estruturaPadrao.cronogramaImplementacao};
        } else {
            // Garantir que todos os anos de 2026 a 2033 estão presentes
            for (let ano = 2026; ano <= 2033; ano++) {
                if (resultado.cronogramaImplementacao[ano] === undefined) {
                    resultado.cronogramaImplementacao[ano] = estruturaPadrao.cronogramaImplementacao[ano];
                } else {
                    // Converter para decimal se necessário
                    if (resultado.cronogramaImplementacao[ano] > 1) {
                        resultado.cronogramaImplementacao[ano] = resultado.cronogramaImplementacao[ano] / 100;
                    }
                    
                    // Garantir valores entre 0 e 1
                    resultado.cronogramaImplementacao[ano] = Math.max(0, Math.min(1, resultado.cronogramaImplementacao[ano]));
                }
            }
            
            // Verificar se o cronograma tem uma progressão crescente
            let valorAnterior = 0;
            let progressaoCrescente = true;
            
            for (let ano = 2026; ano <= 2033; ano++) {
                if (resultado.cronogramaImplementacao[ano] < valorAnterior) {
                    progressaoCrescente = false;
                    break;
                }
                valorAnterior = resultado.cronogramaImplementacao[ano];
            }
            
            if (!progressaoCrescente) {
                console.warn('Cronograma não tem progressão crescente. Ajustando...');
                resultado.cronogramaImplementacao = {...estruturaPadrao.cronogramaImplementacao};
            }
        }
        
        // Validação de Estratégias
        if (!resultado.estrategias) {
            resultado.estrategias = JSON.parse(JSON.stringify(estruturaPadrao.estrategias));
        } else {
            // Garantir que todas as estratégias existem
            Object.keys(estruturaPadrao.estrategias).forEach(estrategiaKey => {
                if (!resultado.estrategias[estrategiaKey]) {
                    resultado.estrategias[estrategiaKey] = {...estruturaPadrao.estrategias[estrategiaKey]};
                } else {
                    // Garantir que todos os campos da estratégia existem
                    Object.keys(estruturaPadrao.estrategias[estrategiaKey]).forEach(campoKey => {
                        if (resultado.estrategias[estrategiaKey][campoKey] === undefined) {
                            resultado.estrategias[estrategiaKey][campoKey] = estruturaPadrao.estrategias[estrategiaKey][campoKey];
                        }
                    });
                    
                    // Validações específicas para cada estratégia poderiam ser adicionadas aqui
                }
            });
        }
        
        return resultado;
    }
    
    /**
     * Obtém dados do DOM e retorna na estrutura aninhada padronizada
     * @returns {Object} - Dados na estrutura aninhada
     */
    function obterDadosDoFormulario() {
        const dados = JSON.parse(JSON.stringify(estruturaPadrao)); // Começar com valores padrão
        
        try {
            // Empresa
            dados.empresa.faturamento = extrairValorNumerico('faturamento');
            dados.empresa.margem = parseFloat(document.getElementById('margem')?.value || 0) / 100;
            dados.empresa.setor = document.getElementById('setor')?.value || '';
            dados.empresa.tipoEmpresa = document.getElementById('tipo-empresa')?.value || '';
            dados.empresa.regime = document.getElementById('regime')?.value || '';
            
            // Ciclo Financeiro
            dados.cicloFinanceiro.pmr = parseInt(document.getElementById('pmr')?.value || '30');
            dados.cicloFinanceiro.pmp = parseInt(document.getElementById('pmp')?.value || '30');
            dados.cicloFinanceiro.pme = parseInt(document.getElementById('pme')?.value || '30');
            dados.cicloFinanceiro.percVista = parseFloat(document.getElementById('perc-vista')?.value || '30') / 100;
            dados.cicloFinanceiro.percPrazo = 1 - dados.cicloFinanceiro.percVista;
            
            // Parâmetros Fiscais - depende do regime selecionado
            const regime = dados.empresa.regime;
            
            if (regime === 'simples') {
                dados.parametrosFiscais.aliquota = parseFloat(document.getElementById('aliquota-simples')?.value || '0') / 100;
            } else {
                // Alíquota é calculada com base no IVA Dual
                dados.parametrosFiscais.aliquota = parseFloat(document.getElementById('aliquota')?.value || '0') / 100;
                
                // PIS/COFINS
                dados.parametrosFiscais.regimePisCofins = document.getElementById('pis-cofins-regime')?.value || '';
                
                // Créditos
                if (dados.parametrosFiscais.regimePisCofins === 'nao-cumulativo') {
                    const baseCalcPisCofins = parseFloat(document.getElementById('pis-cofins-base-calc')?.value || '0') / 100;
                    const percCreditoPisCofins = parseFloat(document.getElementById('pis-cofins-perc-credito')?.value || '0') / 100;
                    const aliquotaPIS = parseFloat(document.getElementById('pis-aliquota')?.value || '0') / 100;
                    const aliquotaCOFINS = parseFloat(document.getElementById('cofins-aliquota')?.value || '0') / 100;
                    
                    dados.parametrosFiscais.creditos.pis = dados.empresa.faturamento * baseCalcPisCofins * aliquotaPIS * percCreditoPisCofins;
                    dados.parametrosFiscais.creditos.cofins = dados.empresa.faturamento * baseCalcPisCofins * aliquotaCOFINS * percCreditoPisCofins;
                }
                
                // ICMS (para empresas comerciais/industriais)
                if (dados.empresa.tipoEmpresa === 'comercio' || dados.empresa.tipoEmpresa === 'industria') {
                    const baseCalcICMS = parseFloat(document.getElementById('icms-base-calc')?.value || '0') / 100;
                    const percCreditoICMS = parseFloat(document.getElementById('icms-perc-credito')?.value || '0') / 100;
                    let aliquotaICMS = parseFloat(document.getElementById('aliquota-icms')?.value || '0') / 100;
                    
                    // Aplicar incentivo fiscal se existir
                    if (document.getElementById('possui-incentivo-icms')?.checked) {
                        const incentivo = parseFloat(document.getElementById('incentivo-icms')?.value || '0') / 100;
                        aliquotaICMS *= (1 - incentivo);
                    }
                    
                    dados.parametrosFiscais.creditos.icms = dados.empresa.faturamento * baseCalcICMS * aliquotaICMS * percCreditoICMS;
                    
                    // IPI (apenas para indústria)
                    if (dados.empresa.tipoEmpresa === 'industria') {
                        const baseCalcIPI = parseFloat(document.getElementById('ipi-base-calc')?.value || '0') / 100;
                        const percCreditoIPI = parseFloat(document.getElementById('ipi-perc-credito')?.value || '0') / 100;
                        const aliquotaIPI = parseFloat(document.getElementById('aliquota-ipi')?.value || '0') / 100;
                        
                        dados.parametrosFiscais.creditos.ipi = dados.empresa.faturamento * baseCalcIPI * aliquotaIPI * percCreditoIPI;
                    }
                }
            }
            
            // Tipo de Operação
            dados.parametrosFiscais.tipoOperacao = document.getElementById('tipo-operacao')?.value || '';
            
            // Parâmetros de Simulação
            dados.parametrosSimulacao.cenario = document.getElementById('cenario')?.value || 'moderado';            
            dados.parametrosSimulacao.splitPayment = document.getElementById('considerar-split')?.checked !== false;
            
            // Taxa de crescimento baseada no cenário ou valor personalizado
            if (dados.parametrosSimulacao.cenario === 'conservador') {
                dados.parametrosSimulacao.taxaCrescimento = 0.02;
            } else if (dados.parametrosSimulacao.cenario === 'moderado') {
                dados.parametrosSimulacao.taxaCrescimento = 0.05;
            } else if (dados.parametrosSimulacao.cenario === 'otimista') {
                dados.parametrosSimulacao.taxaCrescimento = 0.08;
            } else if (dados.parametrosSimulacao.cenario === 'personalizado') {
                dados.parametrosSimulacao.taxaCrescimento = parseFloat(document.getElementById('taxa-crescimento')?.value || '5') / 100;
            }
            
            // Datas
            dados.parametrosSimulacao.dataInicial = document.getElementById('data-inicial')?.value || '2026-01-01';
            dados.parametrosSimulacao.dataFinal = document.getElementById('data-final')?.value || '2033-12-31';
            
            // Split Payment
            dados.parametrosSimulacao.splitPayment = document.getElementById('considerar-split')?.checked !== false;
            
            // IVA Config
            dados.ivaConfig.cbs = parseFloat(document.getElementById('aliquota-cbs')?.value || '0') / 100;
            dados.ivaConfig.ibs = parseFloat(document.getElementById('aliquota-ibs')?.value || '0') / 100;
            dados.ivaConfig.categoriaIva = document.getElementById('categoria-iva')?.value || 'standard';
            dados.ivaConfig.reducaoEspecial = parseFloat(document.getElementById('reducao')?.value || '0') / 100;
            
            // Estratégias não são capturadas aqui, pois têm sua própria tela/lógica
            
            // Cumpensação
            dados.parametrosFinanceiros.tipoCompensacao = document.getElementById('compensacao')?.value || 'automatica';
            
        } catch (erro) {
            console.error('Erro ao obter dados do formulário:', erro);
        }
        
        // Validar e normalizar os dados obtidos
        return validarENormalizar(dados);
    }
    
    /**
     * Preenche os campos do formulário com os dados da estrutura aninhada
     * @param {Object} dados - Dados na estrutura aninhada
     */
    function preencherFormulario(dados) {
        try {
            // Validar e normalizar os dados antes de preencher
            const dadosValidados = validarENormalizar(dados);
            
            // Empresa
            if (dadosValidados.empresa) {
                const elFaturamento = document.getElementById('faturamento');
                if (elFaturamento) {
                    if (typeof window.CurrencyFormatter !== 'undefined' && typeof window.CurrencyFormatter.formatarValorMonetario === 'function') {
                        elFaturamento.value = window.CurrencyFormatter.formatarValorMonetario(dadosValidados.empresa.faturamento * 100);
                    } else {
                        elFaturamento.value = dadosValidados.empresa.faturamento.toFixed(2);
                    }
                }
                
                const elMargem = document.getElementById('margem');
                if (elMargem) {
                    elMargem.value = (dadosValidados.empresa.margem * 100).toFixed(2);
                }
                
                const elSetor = document.getElementById('setor');
                if (elSetor) {
                    elSetor.value = dadosValidados.empresa.setor;
                }
                
                const elTipoEmpresa = document.getElementById('tipo-empresa');
                if (elTipoEmpresa) {
                    elTipoEmpresa.value = dadosValidados.empresa.tipoEmpresa;
                    
                    // Disparar evento de mudança para atualizar campos dependentes
                    const event = new Event('change');
                    elTipoEmpresa.dispatchEvent(event);
                }
                
                const elRegime = document.getElementById('regime');
                if (elRegime) {
                    elRegime.value = dadosValidados.empresa.regime;
                    
                    // Disparar evento de mudança para atualizar campos dependentes
                    const event = new Event('change');
                    elRegime.dispatchEvent(event);
                }
            }
            
            // Ciclo Financeiro
            if (dadosValidados.cicloFinanceiro) {
                const elPmr = document.getElementById('pmr');
                if (elPmr) {
                    elPmr.value = dadosValidados.cicloFinanceiro.pmr;
                }
                
                const elPmp = document.getElementById('pmp');
                if (elPmp) {
                    elPmp.value = dadosValidados.cicloFinanceiro.pmp;
                }
                
                const elPme = document.getElementById('pme');
                if (elPme) {
                    elPme.value = dadosValidados.cicloFinanceiro.pme;
                }
                
                const elPercVista = document.getElementById('perc-vista');
                if (elPercVista) {
                    elPercVista.value = (dadosValidados.cicloFinanceiro.percVista * 100).toFixed(1);
                    
                    // Disparar evento de input para atualizar campos dependentes
                    const event = new Event('input');
                    elPercVista.dispatchEvent(event);
                }
            }
            
            // Parâmetros de Simulação
            if (dadosValidados.parametrosSimulacao) {
                const elCenario = document.getElementById('cenario');
                if (elCenario) {
                    elCenario.value = dadosValidados.parametrosSimulacao.cenario;
                    
                    // Mostrar/ocultar campo de taxa personalizada
                    if (dadosValidados.parametrosSimulacao.cenario === 'personalizado') {
                        const elCenarioPersonalizado = document.getElementById('cenario-personalizado');
                        if (elCenarioPersonalizado) {
                            elCenarioPersonalizado.style.display = 'block';
                        }
                        
                        const elTaxaCrescimento = document.getElementById('taxa-crescimento');
                        if (elTaxaCrescimento) {
                            elTaxaCrescimento.value = (dadosValidados.parametrosSimulacao.taxaCrescimento * 100).toFixed(1);
                        }
                    }
                }
                
                const elDataInicial = document.getElementById('data-inicial');
                if (elDataInicial) {
                    elDataInicial.value = dadosValidados.parametrosSimulacao.dataInicial;
                }
                
                const elDataFinal = document.getElementById('data-final');
                if (elDataFinal) {
                    elDataFinal.value = dadosValidados.parametrosSimulacao.dataFinal;
                }
                
                const elConsiderarSplit = document.getElementById('considerar-split');
                if (elConsiderarSplit) {
                    elConsiderarSplit.checked = dadosValidados.parametrosSimulacao.splitPayment;
                }
            }
            
            // Adicionar mais campos conforme necessário...
            
            console.log('Formulário preenchido com sucesso');
        } catch (erro) {
            console.error('Erro ao preencher formulário:', erro);
        }
    }
    
    /**
     * Detecta e extrai o tipo de estrutura de dados (aninhada ou plana)
     * @param {Object} dados - Dados a serem analisados
     * @returns {string} - "aninhada" ou "plana"
     */
    function detectarTipoEstrutura(dados) {
        if (!dados) return null;
        
        // Verificar se tem campos aninhados típicos
        if (dados.empresa !== undefined || dados.cicloFinanceiro !== undefined || 
            dados.parametrosFiscais !== undefined || dados.parametrosSimulacao !== undefined) {
            return "aninhada";
        }
        
        // Verificar se tem campos planos típicos
        if ((dados.faturamento !== undefined && dados.empresa === undefined) || 
            (dados.pmr !== undefined && dados.cicloFinanceiro === undefined)) {
            return "plana";
        }
        
        // Se não for possível determinar
        console.warn("Não foi possível determinar o tipo de estrutura dos dados");
        return null;
    }
    
    /**
     * Função auxiliar para extrair valor numérico de elemento do DOM
     * @param {string} id - ID do elemento
     * @returns {number} - Valor numérico
     */
    function extrairValorNumerico(id) {
        const elemento = document.getElementById(id);
        if (!elemento) {
            console.warn(`Elemento com id ${id} não encontrado`);
            return 0;
        }

        // 1. PRIORIZAR: Primeiro verificar se temos dataset.rawValue (do CurrencyFormatter)
        if (elemento.dataset && elemento.dataset.rawValue !== undefined) {
            const valor = parseFloat(elemento.dataset.rawValue);
            // Importante: Log para debug
            console.log(`Extraindo valor de ${id} do dataset.rawValue: ${valor}`);
            return isNaN(valor) ? 0 : valor;
        }

        // 2. CORRIGIR: Para campos formatados como moeda, extrair corretamente
        if (elemento.value && (elemento.classList.contains('money-input') || 
            elemento.dataset.currencyInitialized === 'true' || 
            elemento.value.includes('R$'))) {

            // Remover todos caracteres não numéricos exceto vírgula/ponto
            const valorLimpo = elemento.value.replace(/[^\d,.-]/g, '').replace(',', '.');
            const valorNumerico = parseFloat(valorLimpo);

            // Importante: Log para debug
            console.log(`Extraindo valor monetário de ${id}: ${valorNumerico} (original: ${elemento.value})`);
            return isNaN(valorNumerico) ? 0 : valorNumerico;
        }

        // 3. MANTER: Processamento padrão para outros tipos de campos
        const valorOriginal = elemento.value;
        if (valorOriginal === '') return 0;

        const valorNumerico = parseFloat(valorOriginal);
        return isNaN(valorNumerico) ? 0 : valorNumerico;
    }

    /**
     * Extrai valor monetário de uma string formatada
     * @param {string|number} valor - Valor a ser extraído 
     * @returns {number} - Valor numérico
     */
    function extrairValorMonetario(valor) {
        if (typeof valor === 'number') return valor;
        
        if (typeof valor === 'string') {
            // Remover tudo que não for dígito, vírgula ou ponto
            const valorLimpo = valor.replace(/[^\d,.-]/g, '').replace(',', '.');
            const resultado = parseFloat(valorLimpo);
            return isNaN(resultado) ? 0 : resultado;
        }
        
        return 0;
    }
    
    /**
     * Extrai valor percentual de uma string formatada
     * @param {string|number} valor - Valor a ser extraído
     * @returns {number} - Valor decimal (entre 0 e 1)
     */
    function extrairValorPercentual(valor) {
        if (typeof valor === 'number') {
            // Se já for número, normalizar para decimal
            return valor > 1 ? valor / 100 : valor;
        }
        
        if (typeof valor === 'string') {
            // Remover símbolo de porcentagem e converter
            const valorLimpo = valor.replace('%', '').trim();
            const resultado = parseFloat(valorLimpo) / 100;
            return isNaN(resultado) ? 0 : resultado;
        }
        
        return 0;
    }
    
    /**
     * Normaliza um valor de acordo com seu tipo
     * @param {any} valor - Valor a ser normalizado
     * @param {string} tipo - Tipo do valor ('monetario', 'percentual', 'numero', etc.)
     * @returns {number} - Valor normalizado
     */
    function normalizarValor(valor, tipo) {
        switch (tipo) {
            case 'monetario':
                return extrairValorMonetario(valor);
            case 'percentual':
                return extrairValorPercentual(valor);
            case 'numero':
                return typeof valor === 'string' ? parseFloat(valor) || 0 : (valor || 0);
            default:
                return valor;
        }
    }
    
    /**
     * Formata um valor numérico como moeda
     * @param {number} valor - Valor a ser formatado em reais (não em centavos)
     * @returns {string} - Valor formatado como moeda
     */
    function formatarMoeda(valor) {
        // Verificar se o valor é um número válido
        if (isNaN(valor)) {
            valor = 0;
        }

        // Se o CurrencyFormatter estiver disponível, usá-lo, mas evitar chamadas recursivas
        if (window.CurrencyFormatter && typeof window.CurrencyFormatter.formatarValorMonetario === 'function') {
            // Convertemos para centavos, pois o CurrencyFormatter espera valores em centavos
            return window.CurrencyFormatter.formatarValorMonetario(Math.round(valor * 100).toString());
        }

        // Fallback para formatação padrão
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    }
    
    /**
     * Formata um valor decimal como percentual
     * @param {number} valor - Valor decimal a ser formatado
     * @returns {string} - Valor formatado como percentual
     */
    function formatarPercentual(valor) {
        return (valor).toFixed(2) + '%';
    }
    
    /**
     * Valida dados específicos de uma seção
     * @param {string} secao - Nome da seção a ser validada
     * @param {Object} dados - Dados da seção
     * @returns {Object} - Dados validados
     */
    function validarDadosSecao(secao, dados) {
        if (!dados) return {};
        
        // Cria um objeto temporário com a estrutura canônica
        const objTemp = JSON.parse(JSON.stringify(estruturaPadrao));
        
        // Substitui a seção específica pelos dados fornecidos
        objTemp[secao] = dados;
        
        // Valida todo o objeto
        const objValidado = validarENormalizar(objTemp);
        
        // Retorna apenas a seção validada
        return objValidado[secao];
    }
    
    /**
     * Normaliza dados específicos de uma seção
     * @param {string} secao - Nome da seção
     * @param {Object} dados - Dados da seção
     * @returns {Object} - Dados normalizados
     */
    function normalizarDadosSecao(secao, dados) {
        if (!dados) return {};
        
        // Implementação similar ao validarDadosSecao, mas focado apenas na normalização
        return validarDadosSecao(secao, dados);
    }
    
    /**
     * Função de log para transformações de dados
     * @param {Object} origem - Dados de origem
     * @param {Object} destino - Dados resultantes
     * @param {string} contexto - Descrição do contexto da transformação
     */
    function logTransformacao(origem, destino, contexto) {
        // Verificar se modo debug está ativo
        if (window.DEBUG_MODE) {
            console.group(`Transformação de Dados: ${contexto}`);
            console.log('Origem:', origem);
            console.log('Destino:', destino);
            console.groupEnd();
        }
    }
    
    /**
     * Clona profundamente um objeto sem referências circulares
     * @param {Object} obj - Objeto a ser clonado
     * @returns {Object} - Objeto clonado
     */
    function cloneProfundo(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    
    // Interface pública do módulo
    return {
        estruturaPadrao,
        converterParaEstruturaPlana,
        converterParaEstruturaAninhada,
        validarENormalizar,
        obterDadosDoFormulario,
        preencherFormulario,
        detectarTipoEstrutura,
        extrairValorNumerico,
        cloneProfundo,
        // Métodos adicionados para resolver os erros
        obterEstruturaAninhadaPadrao,
        extrairValorMonetario,
        validarDadosSecao,
        normalizarDadosSecao,
        formatarMoeda,
        formatarPercentual,
        normalizarValor,
        extrairValorPercentual,
        logTransformacao
    };
})();

// Configuração inicial (opcional)
document.addEventListener('DOMContentLoaded', function() {
    console.log('DataManager inicializado com sucesso');
    
    // Opcional: definir modo de debug com base em parâmetros de URL ou localStorage
    window.DEBUG_MODE = localStorage.getItem('debug_mode') === 'true' || 
                        window.location.search.indexOf('debug=true') >= 0;
});