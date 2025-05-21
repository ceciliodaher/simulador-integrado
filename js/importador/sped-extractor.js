/**
 * SpedExtractor - Módulo para extração de dados úteis para o simulador
 * a partir dos dados brutos extraídos pelo SpedParser
 */
const SpedExtractor = (function() {
    /**
     * Extrai dados relevantes para o simulador a partir dos dados SPED
     * @param {Object} dadosSped - Dados extraídos pelo SpedParser
     * @returns {Object} Objeto formatado para o simulador
     */
    function extrairDadosParaSimulador(dadosSped) {
        return {
            empresa: extrairDadosEmpresa(dadosSped),
            parametrosFiscais: extrairParametrosFiscais(dadosSped),
            cicloFinanceiro: extrairCicloFinanceiro(dadosSped)
        };
    }

    /**
     * Extrai dados da empresa
     * @param {Object} dadosSped - Dados SPED
     * @returns {Object} Dados da empresa formatados
     */
    function extrairDadosEmpresa(dadosSped) {
        const empresa = dadosSped.empresa || {};
        const documentos = dadosSped.documentos || [];
        
        // Calcula faturamento com base nos documentos
        let faturamentoTotal = 0;
        let countDocumentosSaida = 0;
        
        documentos.forEach(doc => {
            if (doc.indOper === '1') { // Saída
                faturamentoTotal += doc.valorTotal || 0;
                countDocumentosSaida++;
            }
        });
        
        // Faturamento mensal estimado (média)
        const faturamentoMensal = countDocumentosSaida > 0 ? 
            faturamentoTotal / Math.ceil(countDocumentosSaida / 30) : 0;
        
        // Determina tipo de empresa com base na atividade predominante
        const tipoEmpresa = determinarTipoEmpresa(dadosSped);
        
        // Determina regime tributário com base nas informações disponíveis
        const regimeTributario = determinarRegimeTributario(dadosSped);
        
        return {
            nome: empresa.nome || '',
            cnpj: empresa.cnpj || '',
            faturamento: faturamentoMensal,
            margem: 0.15, // Valor padrão, deve ser ajustado pelo usuário
            tipoEmpresa: tipoEmpresa,
            regime: regimeTributario
        };
    }

    /**
     * Determina o tipo de empresa com base nos dados SPED
     * @param {Object} dadosSped - Dados SPED
     * @returns {string} Tipo de empresa (comercio, industria, servicos)
     */
    function determinarTipoEmpresa(dadosSped) {
        const itens = dadosSped.itens || [];
        const cfops = new Set();
        
        // Coleta todos os CFOPs utilizados
        itens.forEach(item => {
            if (item.cfop) {
                cfops.add(item.cfop);
            }
        });
        
        // Verifica CFOPs típicos de cada atividade
        const cfopsIndustria = ['5101', '5102', '5401', '5402'];
        const cfopsServicos = ['5933', '5932', '5933', '6933'];
        
        let countIndustria = 0;
        let countServicos = 0;
        let countComercio = 0;
        
        cfops.forEach(cfop => {
            if (cfopsIndustria.includes(cfop)) countIndustria++;
            else if (cfopsServicos.includes(cfop)) countServicos++;
            else countComercio++;
        });
        
        // Determina tipo predominante
        if (countIndustria > countComercio && countIndustria > countServicos) {
            return 'industria';
        } else if (countServicos > countComercio && countServicos > countIndustria) {
            return 'servicos';
        } else {
            return 'comercio';
        }
    }

    /**
     * Determina o regime tributário com base nos dados SPED
     * @param {Object} dadosSped - Dados SPED
     * @returns {string} Regime tributário (simples, presumido, real)
     */
    function determinarRegimeTributario(dadosSped) {
        const empresa = dadosSped.empresa || {};
        
        // Verifica se há informação explícita
        if (empresa.regimeTributacao) {
            if (empresa.regimeTributacao === '1') return 'simples';
            if (empresa.regimeTributacao === '2') return 'presumido';
            if (empresa.regimeTributacao === '3') return 'real';
        }
        
        // Tenta inferir pelo padrão de tributos
        const impostos = dadosSped.impostos || {};
        const creditos = dadosSped.creditos || {};
        
        if (impostos.simples && impostos.simples.length > 0) {
            return 'simples';
        }
        
        // Verifica se há créditos de PIS/COFINS não-cumulativos
        if (creditos.pis && creditos.pis.length > 0 && creditos.cofins && creditos.cofins.length > 0) {
            // Verifica alíquotas para diferenciar presumido de real
            const pisSample = creditos.pis[0];
            if (pisSample.aliquotaPis > 1.0) {
                return 'real'; // Alíquotas maiores indicam não-cumulativo (Real)
            } else {
                return 'presumido';
            }
        }
        
        return 'presumido'; // Valor padrão se não conseguir determinar
    }

    /**
     * Extrai parâmetros fiscais
     * @param {Object} dadosSped - Dados SPED
     * @returns {Object} Parâmetros fiscais formatados
     */
    function extrairParametrosFiscais(dadosSped) {
        const impostos = dadosSped.impostos || {};
        const creditos = dadosSped.creditos || {};
        const regimeTributario = determinarRegimeTributario(dadosSped);
        
        // Alíquotas e créditos padrão
        let parametros = {
            tipoOperacao: 'b2b', // Padrão, deve ser ajustado pelo usuário
            regimePisCofins: 'cumulativo',
            creditos: {
                pis: 0,
                cofins: 0,
                icms: 0,
                ipi: 0
            }
        };
        
        // Ajusta parâmetros de acordo com o regime
        if (regimeTributario === 'simples') {
            parametros.aliquota = 0.06; // Alíquota padrão do Simples, deve ser ajustada
        } else if (regimeTributario === 'presumido') {
            parametros.regimePisCofins = 'cumulativo';
            
            // Calcula créditos de impostos
            if (impostos.icms && impostos.icms.length > 0) {
                parametros.creditos.icms = impostos.icms.reduce((sum, imp) => sum + (imp.valorTotalCreditos || 0), 0);
            }
            
            if (creditos.pis && creditos.pis.length > 0) {
                parametros.creditos.pis = creditos.pis.reduce((sum, cred) => sum + (cred.valorCredito || 0), 0);
            }
            
            if (creditos.cofins && creditos.cofins.length > 0) {
                parametros.creditos.cofins = creditos.cofins.reduce((sum, cred) => sum + (cred.valorCredito || 0), 0);
            }
        } else if (regimeTributario === 'real') {
            parametros.regimePisCofins = 'nao-cumulativo';
            
            // Calcula créditos de impostos
            if (impostos.icms && impostos.icms.length > 0) {
                parametros.creditos.icms = impostos.icms.reduce((sum, imp) => sum + (imp.valorTotalCreditos || 0), 0);
            }
            
            if (creditos.pis && creditos.pis.length > 0) {
                parametros.creditos.pis = creditos.pis.reduce((sum, cred) => sum + (cred.valorCredito || 0), 0);
            }
            
            if (creditos.cofins && creditos.cofins.length > 0) {
                parametros.creditos.cofins = creditos.cofins.reduce((sum, cred) => sum + (cred.valorCredito || 0), 0);
            }
            
            if (impostos.ipi && impostos.ipi.length > 0) {
                parametros.creditos.ipi = impostos.ipi.reduce((sum, imp) => sum + (imp.valorCredito || 0), 0);
            }
        }
        
        return parametros;
    }

    /**
     * Extrai dados do ciclo financeiro
     * @param {Object} dadosSped - Dados SPED
     * @returns {Object} Dados do ciclo financeiro formatados
     */
    function extrairCicloFinanceiro(dadosSped) {
        const documentos = dadosSped.documentos || [];
        
        // Valores padrão
        let ciclo = {
            pmr: 30, // Prazo médio de recebimento
            pmp: 30, // Prazo médio de pagamento
            pme: 30, // Prazo médio de estoque
            percVista: 0.3, // Percentual de vendas à vista
            percPrazo: 0.7 // Percentual de vendas a prazo
        };
        
        // Tenta extrair informações de prazo de documentos
        if (documentos.length > 0) {
            // Cálculos mais avançados seriam necessários para determinar prazos reais
            // Este é apenas um exemplo simplificado
        }
        
        return ciclo;
    }

    // Interface pública
    return {
        extrairDadosParaSimulador
    };
})();