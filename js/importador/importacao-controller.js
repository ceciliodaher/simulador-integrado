/**
 * Controller do módulo de importação SPED
 * Gerencia a interface de usuário e o fluxo de importação
 */
const ImportacaoController = (function() {
    // Elementos da interface
    let elements = {};
    
    /**
     * Inicializa o controller
     */
    function inicializar() {
        // Mapeia elementos da interface
        elements = {
            // Inputs de arquivo
            spedFiscal: document.getElementById('sped-fiscal'),
            spedContribuicoes: document.getElementById('sped-contribuicoes'),
            spedEcf: document.getElementById('sped-ecf'),
            spedEcd: document.getElementById('sped-ecd'),
            
            // Checkboxes de opções
            importEmpresa: document.getElementById('import-empresa'),
            importProdutos: document.getElementById('import-produtos'),
            importImpostos: document.getElementById('import-impostos'),
            importCiclo: document.getElementById('import-ciclo'),
            
            // Controles adicionais
            periodoReferencia: document.getElementById('periodo-referencia'),
            
            // Botões
            btnImportar: document.getElementById('btn-importar-sped'),
            btnCancelar: document.getElementById('btn-cancelar-importacao'),
            
            // Área de log
            logArea: document.getElementById('import-log')
        };
        
        // Verifica se todos os elementos foram encontrados
        if (!verificarElementos()) {
            console.error('Erro ao inicializar o controller: elementos não encontrados');
            return;
        }
        
        // Adiciona event listeners
        adicionarEventListeners();
        
        console.log('ImportacaoController inicializado');
    }
    
    /**
     * Verifica se todos os elementos necessários estão presentes
     * @returns {boolean} Verdadeiro se todos os elementos foram encontrados
     */
    function verificarElementos() {
        return elements.btnImportar && elements.logArea;
    }
    
    /**
     * Adiciona os event listeners aos elementos da interface
     */
    function adicionarEventListeners() {
        elements.btnImportar.addEventListener('click', iniciarImportacao);
        elements.btnCancelar.addEventListener('click', cancelarImportacao);
    }
    
    /**
     * Inicia o processo de importação
     */
    function iniciarImportacao() {
        // Limpa o log
        limparLog();
        
        // Verifica se há arquivos selecionados
        if (!verificarArquivosSelecionados()) {
            adicionarLog('Selecione pelo menos um arquivo SPED para importação.', 'error');
            return;
        }
        
        adicionarLog('Iniciando importação de dados SPED...', 'info');
        
        // Processa cada arquivo selecionado
        const promessas = [];
        
        if (elements.spedFiscal.files.length > 0) {
            promessas.push(processarArquivoSped(elements.spedFiscal.files[0], 'fiscal'));
        }
        
        if (elements.spedContribuicoes.files.length > 0) {
            promessas.push(processarArquivoSped(elements.spedContribuicoes.files[0], 'contribuicoes'));
        }
        
        if (elements.spedEcf.files.length > 0) {
            promessas.push(processarArquivoSped(elements.spedEcf.files[0], 'ecf'));
        }
        
        if (elements.spedEcd.files.length > 0) {
            promessas.push(processarArquivoSped(elements.spedEcd.files[0], 'ecd'));
        }
        
        // Aguarda o processamento de todos os arquivos
        Promise.all(promessas)
            .then(resultados => {
                // Combina os resultados
                const dadosCombinados = combinarResultados(resultados);
                
                // Extrai dados para o simulador
                const dadosSimulador = SpedExtractor.extrairDadosParaSimulador(dadosCombinados);
                
                // Preenche os campos do simulador
                preencherCamposSimulador(dadosSimulador);
                
                adicionarLog('Importação concluída com sucesso!', 'success');
            })
            .catch(erro => {
                adicionarLog('Erro durante a importação: ' + erro.message, 'error');
                console.error('Erro na importação:', erro);
            });
    }
    
   /**
     * Processa um arquivo SPED
     * @param {File} arquivo - Arquivo a ser processado
     * @param {string} tipo - Tipo de arquivo SPED
     * @returns {Promise} Promessa com os dados extraídos
     */
    function processarArquivoSped(arquivo, tipo) {
        adicionarLog(`Processando arquivo ${arquivo.name}...`, 'info');

        return new Promise((resolve, reject) => {
            try {
                SpedParser.processarArquivo(arquivo, tipo)
                    .then(dados => {
                        // Adiciona metadados ao objeto de resultado
                        dados.metadados = {
                            nomeArquivo: arquivo.name,
                            tipoArquivo: tipo,
                            tamanhoBytes: arquivo.size,
                            dataProcessamento: new Date().toISOString()
                        };

                        // Log detalhado dos dados encontrados
                        logDadosExtraidos(dados, tipo);

                        adicionarLog(`Arquivo ${arquivo.name} processado com sucesso.`, 'success');
                        resolve(dados);
                    })
                    .catch(erro => {
                        adicionarLog(`Erro ao processar ${arquivo.name}: ${erro.message}`, 'error');
                        reject(erro);
                    });
            } catch (erro) {
                adicionarLog(`Erro ao processar ${arquivo.name}: ${erro.message}`, 'error');
                reject(erro);
            }
        });
    }
    
    /**
     * Adiciona logs detalhados sobre os dados extraídos
     * @param {Object} dados - Dados extraídos do arquivo SPED
     * @param {string} tipo - Tipo de arquivo SPED
     */
    function logDadosExtraidos(dados, tipo) {
        // Resume os principais dados encontrados para o log
        let mensagens = [];

        switch(tipo) {
            case 'fiscal':
                // Resumo de documentos
                const qtdDocumentos = (dados.documentos || []).length;
                const qtdItens = (dados.itens || []).length;
                mensagens.push(`Encontrados ${qtdDocumentos} documentos e ${qtdItens} itens.`);

                // Resumo de impostos
                if (dados.impostos && dados.impostos.icms) {
                    mensagens.push(`Encontrados ${dados.impostos.icms.length} registros de apuração de ICMS.`);
                }

                // Verificação de incentivos
                if (dados.ajustes && dados.ajustes.icms) {
                    const ajustesPositivos = dados.ajustes.icms.filter(a => a.valorAjuste > 0);
                    if (ajustesPositivos.length > 0) {
                        mensagens.push(`Encontrados ${ajustesPositivos.length} ajustes positivos, possíveis incentivos fiscais.`);
                    }
                }
                break;

            case 'contribuicoes':
                // Resumo de créditos
                if (dados.creditos) {
                    const qtdCreditosPIS = (dados.creditos.pis || []).length;
                    const qtdCreditosCOFINS = (dados.creditos.cofins || []).length;
                    mensagens.push(`Encontrados ${qtdCreditosPIS} registros de créditos de PIS e ${qtdCreditosCOFINS} de COFINS.`);
                }

                // Regime
                if (dados.regimes && dados.regimes.pis_cofins) {
                    const regimeDesc = dados.regimes.pis_cofins.codigoIncidencia === '1' ? 
                        'Não-Cumulativo' : (dados.regimes.pis_cofins.codigoIncidencia === '2' ? 'Cumulativo' : 'Misto');
                    mensagens.push(`Regime de apuração PIS/COFINS: ${regimeDesc}.`);
                }
                break;

            case 'ecf':
                // Resumo DRE
                if (dados.dre) {
                    mensagens.push('Encontrados dados da Demonstração de Resultado do Exercício (DRE).');
                }

                // Incentivos fiscais
                if (dados.incentivosFiscais && dados.incentivosFiscais.length > 0) {
                    mensagens.push(`Encontrados ${dados.incentivosFiscais.length} registros de incentivos fiscais.`);
                }

                // Apuração de impostos
                if (dados.calculoImposto) {
                    mensagens.push('Encontrados dados de apuração do IRPJ e CSLL.');
                }
                break;

            case 'ecd':
                // Resumo do balanço
                if (dados.balancoPatrimonial && dados.balancoPatrimonial.length > 0) {
                    mensagens.push(`Encontrados ${dados.balancoPatrimonial.length} contas no Balanço Patrimonial.`);
                }

                // Resumo da DRE
                if (dados.demonstracaoResultado && dados.demonstracaoResultado.length > 0) {
                    mensagens.push(`Encontrados ${dados.demonstracaoResultado.length} contas na Demonstração de Resultado.`);
                }

                // Lançamentos contábeis
                if (dados.lancamentosContabeis && dados.lancamentosContabeis.length > 0) {
                    mensagens.push(`Encontrados ${dados.lancamentosContabeis.length} lançamentos contábeis.`);
                }
                break;
        }

        // Adiciona as mensagens ao log
        mensagens.forEach(mensagem => adicionarLog(mensagem, 'info'));
    }
    
    /**
     * Combina os resultados de múltiplos arquivos SPED
     * @param {Array} resultados - Array de resultados por arquivo
     * @returns {Object} Dados combinados
     */
    function combinarResultados(resultados) {
        // Inicializa objeto combinado com estrutura expandida
        const combinado = {
            empresa: {},
            documentos: [],
            itens: [],
            itensAnaliticos: [],
            impostos: {},
            creditos: {},
            debitos: {}, // Adicionar para garantir estrutura correta
            regimes: {},
            ajustes: {},
            receitasNaoTributadas: {},
            balancoPatrimonial: [],
            demonstracaoResultado: [],
            lancamentosContabeis: [],
            partidasLancamento: [],
            calculoImposto: {},
            incentivosFiscais: [],
            participantes: [],
            inventario: [],
            discriminacaoReceita: [],
            metadados: {
                arquivosProcessados: []
            }
        };

        // Combina os resultados com validação estrutural
        resultados.forEach(resultado => {
            if (!resultado || typeof resultado !== 'object') return;

            // Registra o arquivo processado
            if (resultado.metadados) {
                combinado.metadados.arquivosProcessados.push(resultado.metadados);
            }

            // Dados da empresa - prioriza o que tem nome preenchido
            if (resultado.empresa && Object.keys(resultado.empresa).length > 0) {
                const nomeEmpresaAtual = resultado.empresa.nome || '';
                const nomeEmpresaExistente = combinado.empresa.nome || '';

                // Prioriza resultado com nome da empresa preenchido
                if (nomeEmpresaAtual && (!nomeEmpresaExistente || 
                     Object.keys(combinado.empresa).length < Object.keys(resultado.empresa).length)) {
                    combinado.empresa = {...resultado.empresa};
                }
            }

            // Arrays simples (concatena todos)
            const arrayProps = [
                'documentos', 'itens', 'itensAnaliticos', 'balancoPatrimonial', 
                'demonstracaoResultado', 'lancamentosContabeis', 'partidasLancamento',
                'incentivosFiscais', 'participantes', 'inventario', 'discriminacaoReceita'
            ];

            arrayProps.forEach(prop => {
                if (Array.isArray(resultado[prop])) {
                    combinado[prop] = combinado[prop].concat(resultado[prop] || []);
                }
            });

            // Objetos de arrays categorizados (mescla por categoria)
            const objArrayProps = ['impostos', 'creditos', 'receitasNaoTributadas', 'ajustes'];

            objArrayProps.forEach(prop => {
                if (resultado[prop] && typeof resultado[prop] === 'object') {
                    Object.entries(resultado[prop]).forEach(([categoria, valores]) => {
                        if (!combinado[prop][categoria]) {
                            combinado[prop][categoria] = [];
                        }
                        if (Array.isArray(valores)) {
                            combinado[prop][categoria] = combinado[prop][categoria].concat(valores);
                        }
                    });
                }
            });

            // Objetos simples (mescla com preferência para dados mais detalhados)
            const objProps = ['regimes', 'calculoImposto'];

            objProps.forEach(prop => {
                if (resultado[prop] && typeof resultado[prop] === 'object') {
                    if (!combinado[prop]) combinado[prop] = {};

                    Object.entries(resultado[prop]).forEach(([chave, valor]) => {
                        // Se já existir, verifica qual é mais completo
                        if (!combinado[prop][chave] || 
                            (typeof valor === 'object' && 
                             Object.keys(valor).length > Object.keys(combinado[prop][chave]).length)) {
                            combinado[prop][chave] = {...valor};
                        }
                    });
                }
            });

            // Valores calculados - propriedades numéricas no nível raiz do objeto
            const valorProps = [
                'receitaBruta', 'receitaLiquida', 'lucroBruto', 'resultadoOperacional',
                'lucroLiquido', 'saldoClientes', 'saldoEstoques', 'saldoFornecedores',
                'ativoCirculante', 'passivoCirculante', 'capitalGiro', 'aliquotaEfetivaIRPJ',
                'aliquotaEfetivaCSLL', 'percentualExportacao', 'valorTotalIncentivos'
            ];

            valorProps.forEach(prop => {
                if (typeof resultado[prop] === 'number' && (!combinado[prop] || combinado[prop] === 0)) {
                    combinado[prop] = resultado[prop];
                }
            });
        });

        // Processa relações cruzadas entre os dados após a combinação
        processarRelacoesCruzadas(combinado);

        return combinado;
    }
    
    /**
     * Processa relações cruzadas entre dados de diferentes arquivos
     * @param {Object} dados - Dados combinados
     */
    function processarRelacoesCruzadas(dados) {
        // Relaciona documentos com participantes
        if (dados.documentos.length > 0 && dados.participantes.length > 0) {
            const participantesPorCodigo = {};

            dados.participantes.forEach(participante => {
                if (participante.codigo) {
                    participantesPorCodigo[participante.codigo] = participante;
                }
            });

            dados.documentos.forEach(doc => {
                if (doc.codPart && participantesPorCodigo[doc.codPart]) {
                    doc.participante = participantesPorCodigo[doc.codPart];
                }
            });
        }

        // Relaciona itens com documentos
        if (dados.documentos.length > 0 && dados.itens.length > 0) {
            const itensPorDocumento = {};

            dados.itens.forEach(item => {
                if (item.documentoId) {
                    if (!itensPorDocumento[item.documentoId]) {
                        itensPorDocumento[item.documentoId] = [];
                    }
                    itensPorDocumento[item.documentoId].push(item);
                }
            });

            dados.documentos.forEach(doc => {
                if (doc.id && itensPorDocumento[doc.id]) {
                    doc.itens = itensPorDocumento[doc.id];
                }
            });
        }

        // Calcula valores agregados
        calcularValoresAgregados(dados);
    }
    
    /**
     * Calcula valores agregados a partir dos dados combinados
     * @param {Object} dados - Dados combinados
     */
    function calcularValoresAgregados(dados) {
        // Se não tiver dados contábeis da ECD, tenta calcular com base nos documentos fiscais
        if (!dados.receitaBruta && dados.documentos.length > 0) {
            // Calcular receita bruta com base nos documentos de saída
            const documentosSaida = dados.documentos.filter(doc => 
                doc.indOper === '1' && // Saída
                doc.situacao === '00'  // Documento regular
            );

            if (documentosSaida.length > 0) {
                // Agrupa por mês/ano
                const receitaPorMes = {};
                let dataInicial = null;
                let dataFinal = null;

                documentosSaida.forEach(doc => {
                    if (!doc.dataEmissao) return;

                    // Formata data para YYYY-MM
                    const dataEmissao = doc.dataEmissao.replace(/(\d{2})(\d{2})(\d{4})/, '$3-$2');
                    const valorDoc = doc.valorTotal || 0;

                    if (!receitaPorMes[dataEmissao]) {
                        receitaPorMes[dataEmissao] = 0;
                    }

                    receitaPorMes[dataEmissao] += valorDoc;

                    // Atualiza período de análise
                    const dataObj = new Date(doc.dataEmissao.replace(/(\d{2})(\d{2})(\d{4})/, '$2/$1/$3'));

                    if (!dataInicial || dataObj < dataInicial) {
                        dataInicial = dataObj;
                    }

                    if (!dataFinal || dataObj > dataFinal) {
                        dataFinal = dataObj;
                    }
                });

                // Calcula receita média mensal
                if (Object.keys(receitaPorMes).length > 0) {
                    const totalReceita = Object.values(receitaPorMes).reduce((sum, val) => sum + val, 0);
                    dados.receitaBruta = totalReceita * 12 / Object.keys(receitaPorMes).length;
                }
            }
        }

        // Se não tiver informações de ciclo financeiro, calcula com base nos dados disponíveis
        if (!dados.saldoClientes && dados.balancoPatrimonial && dados.balancoPatrimonial.length > 0) {
            // Busca contas de clientes no balanço
            const contasClientes = dados.balancoPatrimonial.filter(conta => 
                (conta.codigoConta.startsWith('1.1.2') || // Ativo Circulante > Créditos
                 conta.descricaoConta.toLowerCase().includes('client')) && 
                conta.naturezaSaldo === 'D' // Saldo devedor
            );

            if (contasClientes.length > 0) {
                dados.saldoClientes = contasClientes.reduce((sum, conta) => sum + conta.saldoFinal, 0);
            }
        }

        // Calcula valores para resultado operacional
        if (!dados.resultadoOperacional && dados.lucroBruto) {
            // Estimativa simples baseada em margem típica
            dados.resultadoOperacional = dados.lucroBruto * 0.7; // 70% do lucro bruto
        }
    }
    
    /**
     * Preenche os campos do simulador com os dados extraídos
     * @param {Object} dados - Dados formatados para o simulador
     */
    function preencherCamposSimulador(dados) {
        adicionarLog('Preenchendo campos do simulador...', 'info');

        try {
            // Validar estrutura dos dados
            if (!dados || typeof dados !== 'object') {
                throw new Error('Dados inválidos ou mal-formados');
            }

            // Dados da empresa
            if (dados.empresa && elements.importEmpresa.checked) {
                preencherDadosEmpresa(dados.empresa);
                adicionarLog('Dados da empresa preenchidos com sucesso.', 'success');
            }

            // Parâmetros fiscais
            if (dados.parametrosFiscais && elements.importImpostos.checked) {
                preencherParametrosFiscais(dados.parametrosFiscais);
                adicionarLog('Parâmetros fiscais preenchidos com sucesso.', 'success');
            }

            // Ciclo financeiro
            if (dados.cicloFinanceiro && elements.importCiclo.checked) {
                preencherCicloFinanceiro(dados.cicloFinanceiro);
                adicionarLog('Dados do ciclo financeiro preenchidos com sucesso.', 'success');
            }

            // IVA Dual
            if (dados.ivaConfig) {
                preencherDadosIVADual(dados.ivaConfig, dados.empresa.setor);
                adicionarLog('Configurações do IVA Dual preenchidas com sucesso.', 'success');
            }

            // Rolar para a aba de simulação após preencher
            setTimeout(() => {
                const abaPrincipal = document.querySelector('.tab-button[data-tab="simulacao"]');
                if (abaPrincipal) {
                    abaPrincipal.click();
                }

                // Verificar se deve realizar simulação automática
                const btnSimular = document.getElementById('btn-simular');
                if (btnSimular) {
                    adicionarLog('Preparação concluída. Você pode clicar em "Simular" para ver os resultados.', 'info');
                }
            }, 1000);

        } catch (erro) {
            adicionarLog('Erro ao preencher campos do simulador: ' + erro.message, 'error');
            console.error('Erro ao preencher campos:', erro);
        }
    }
    
    /**
     * Preenche os dados da empresa no formulário
     * @param {Object} dadosEmpresa - Dados da empresa
     */
    function preencherDadosEmpresa(dadosEmpresa) {
        // Nome da empresa
        const campoEmpresa = document.getElementById('empresa');
        if (campoEmpresa && dadosEmpresa.nome) {
            campoEmpresa.value = dadosEmpresa.nome;
        }

        // Faturamento mensal
        const campoFaturamento = document.getElementById('faturamento');
        if (campoFaturamento && dadosEmpresa.faturamento) {
            // Verifica se há uma função de formatação disponível
            if (typeof CurrencyFormatter !== 'undefined' && CurrencyFormatter.formatarMoeda) {
                campoFaturamento.value = CurrencyFormatter.formatarMoeda(dadosEmpresa.faturamento);
            } else {
                campoFaturamento.value = formatarMoeda(dadosEmpresa.faturamento);
            }

            // Dispara evento para recalcular valores dependentes
            campoFaturamento.dispatchEvent(new Event('input'));
        }

        // Margem operacional
        const campoMargem = document.getElementById('margem');
        if (campoMargem && dadosEmpresa.margem) {
            // Converte decimal para percentual
            campoMargem.value = (dadosEmpresa.margem * 100).toFixed(2);
        }

        // Tipo de empresa
        const campoTipoEmpresa = document.getElementById('tipo-empresa');
        if (campoTipoEmpresa && dadosEmpresa.tipoEmpresa) {
            campoTipoEmpresa.value = dadosEmpresa.tipoEmpresa;
            // Dispara evento para atualizar campos dependentes
            campoTipoEmpresa.dispatchEvent(new Event('change'));
        }

        // Regime tributário
        const campoRegime = document.getElementById('regime');
        if (campoRegime && dadosEmpresa.regime) {
            campoRegime.value = dadosEmpresa.regime;
            // Dispara evento para atualizar campos dependentes
            campoRegime.dispatchEvent(new Event('change'));
        }
    }

    /**
     * Preenche os parâmetros fiscais no formulário
     * @param {Object} parametrosFiscais - Parâmetros fiscais
     */
    function preencherParametrosFiscais(parametrosFiscais) {
        // Tipo de operação
        const campoTipoOperacao = document.getElementById('tipo-operacao');
        if (campoTipoOperacao && parametrosFiscais.tipoOperacao) {
            campoTipoOperacao.value = parametrosFiscais.tipoOperacao;
            campoTipoOperacao.dispatchEvent(new Event('change'));
        }

        // Regime PIS/COFINS
        const campoPisCofinsRegime = document.getElementById('pis-cofins-regime');
        if (campoPisCofinsRegime && parametrosFiscais.regimePisCofins) {
            campoPisCofinsRegime.value = parametrosFiscais.regimePisCofins;
            campoPisCofinsRegime.dispatchEvent(new Event('change'));
        }

        // Base de cálculo PIS/COFINS
        const campoBaseCalcPisCofins = document.getElementById('pis-cofins-base-calc');
        if (campoBaseCalcPisCofins && parametrosFiscais.baseCalculoPisCofins) {
            // Converte decimal para percentual
            campoBaseCalcPisCofins.value = (parametrosFiscais.baseCalculoPisCofins * 100).toFixed(1);
            campoBaseCalcPisCofins.dispatchEvent(new Event('input'));
        }

        // Percentual de aproveitamento PIS/COFINS
        const campoPercCreditoPisCofins = document.getElementById('pis-cofins-perc-credito');
        if (campoPercCreditoPisCofins && parametrosFiscais.percAproveitamentoPisCofins) {
            // Converte decimal para percentual
            campoPercCreditoPisCofins.value = (parametrosFiscais.percAproveitamentoPisCofins * 100).toFixed(1);
            campoPercCreditoPisCofins.dispatchEvent(new Event('input'));
        }

        // Alíquota ICMS
        const campoAliquotaIcms = document.getElementById('aliquota-icms');
        if (campoAliquotaIcms && parametrosFiscais.aliquotaIcms) {
            // Converte decimal para percentual
            campoAliquotaIcms.value = (parametrosFiscais.aliquotaIcms * 100).toFixed(1);
            campoAliquotaIcms.dispatchEvent(new Event('input'));
        }

        // Base de cálculo ICMS
        const campoBaseCalcIcms = document.getElementById('icms-base-calc');
        if (campoBaseCalcIcms && parametrosFiscais.baseCalculoIcms) {
            // Converte decimal para percentual
            campoBaseCalcIcms.value = (parametrosFiscais.baseCalculoIcms * 100).toFixed(1);
            campoBaseCalcIcms.dispatchEvent(new Event('input'));
        }

        // Percentual de aproveitamento ICMS
        const campoPercCreditoIcms = document.getElementById('icms-perc-credito');
        if (campoPercCreditoIcms && parametrosFiscais.percAproveitamentoIcms) {
            // Converte decimal para percentual
            campoPercCreditoIcms.value = (parametrosFiscais.percAproveitamentoIcms * 100).toFixed(1);
            campoPercCreditoIcms.dispatchEvent(new Event('input'));
        }

        // Incentivo ICMS
        const campoIncentivoIcms = document.getElementById('possui-incentivo-icms');
        const campoPercentualIncentivo = document.getElementById('incentivo-icms');

        if (campoIncentivoIcms && parametrosFiscais.possuiIncentivoICMS !== undefined) {
            campoIncentivoIcms.checked = parametrosFiscais.possuiIncentivoICMS;
            campoIncentivoIcms.dispatchEvent(new Event('change'));

            if (parametrosFiscais.possuiIncentivoICMS && campoPercentualIncentivo && 
                parametrosFiscais.percentualIncentivoICMS) {
                // Converte decimal para percentual
                campoPercentualIncentivo.value = (parametrosFiscais.percentualIncentivoICMS * 100).toFixed(1);
            }
        }

        // Alíquota IPI
        const campoAliquotaIpi = document.getElementById('aliquota-ipi');
        if (campoAliquotaIpi && parametrosFiscais.aliquotaIpi) {
            // Converte decimal para percentual
            campoAliquotaIpi.value = (parametrosFiscais.aliquotaIpi * 100).toFixed(1);
            campoAliquotaIpi.dispatchEvent(new Event('input'));
        }

        // Base de cálculo IPI
        const campoBaseCalcIpi = document.getElementById('ipi-base-calc');
        if (campoBaseCalcIpi && parametrosFiscais.baseCalculoIpi) {
            // Converte decimal para percentual
            campoBaseCalcIpi.value = (parametrosFiscais.baseCalculoIpi * 100).toFixed(1);
            campoBaseCalcIpi.dispatchEvent(new Event('input'));
        }

        // Percentual de aproveitamento IPI
        const campoPercCreditoIpi = document.getElementById('ipi-perc-credito');
        if (campoPercCreditoIpi && parametrosFiscais.percAproveitamentoIpi) {
            // Converte decimal para percentual
            campoPercCreditoIpi.value = (parametrosFiscais.percAproveitamentoIpi * 100).toFixed(1);
            campoPercCreditoIpi.dispatchEvent(new Event('input'));
        }

        // Alíquota ISS
        const campoAliquotaIss = document.getElementById('aliquota-iss');
        if (campoAliquotaIss && parametrosFiscais.aliquotaIss) {
            // Converte decimal para percentual
            campoAliquotaIss.value = (parametrosFiscais.aliquotaIss * 100).toFixed(1);
            campoAliquotaIss.dispatchEvent(new Event('input'));
        }
        
        // Adicionar preenchimento dos campos de débitos, se existirem no formulário
        const camposDebitos = [
            { id: 'debitos-pis-calc', valor: parametrosFiscais.debitos?.pis || 0 },
            { id: 'debitos-cofins-calc', valor: parametrosFiscais.debitos?.cofins || 0 },
            { id: 'debitos-icms-calc', valor: parametrosFiscais.debitos?.icms || 0 },
            { id: 'debitos-ipi-calc', valor: parametrosFiscais.debitos?.ipi || 0 }
        ];

        camposDebitos.forEach(campo => {
            const elemento = document.getElementById(campo.id);
            if (elemento) {
                if (typeof window.CurrencyFormatter !== 'undefined' && 
                    typeof window.CurrencyFormatter.formatarValorMonetario === 'function') {
                    elemento.value = window.CurrencyFormatter.formatarValorMonetario(campo.valor * 100);
                } else {
                    elemento.value = formatarMoeda(campo.valor);
                }
            }
        });

        // Atualiza os campos de créditos calculados
        calcularCreditosTributarios();
    }

    /**
     * Preenche os dados do ciclo financeiro no formulário
     * @param {Object} cicloFinanceiro - Dados do ciclo financeiro
     */
    function preencherCicloFinanceiro(cicloFinanceiro) {
        // PMR - Prazo Médio de Recebimento
        const campoPmr = document.getElementById('pmr');
        if (campoPmr && cicloFinanceiro.pmr) {
            campoPmr.value = Math.round(cicloFinanceiro.pmr);
            campoPmr.dispatchEvent(new Event('input'));
        }

        // PMP - Prazo Médio de Pagamento
        const campoPmp = document.getElementById('pmp');
        if (campoPmp && cicloFinanceiro.pmp) {
            campoPmp.value = Math.round(cicloFinanceiro.pmp);
            campoPmp.dispatchEvent(new Event('input'));
        }

        // PME - Prazo Médio de Estoque
        const campoPme = document.getElementById('pme');
        if (campoPme && cicloFinanceiro.pme) {
            campoPme.value = Math.round(cicloFinanceiro.pme);
            campoPme.dispatchEvent(new Event('input'));
        }

        // Percentual de vendas à vista
        const campoPercVista = document.getElementById('perc-vista');
        if (campoPercVista && cicloFinanceiro.percVista) {
            // Converte decimal para percentual
            campoPercVista.value = (cicloFinanceiro.percVista * 100).toFixed(0);
            campoPercVista.dispatchEvent(new Event('input'));
        }
    }

    /**
     * Preenche as configurações do IVA Dual no formulário
     * @param {Object} ivaConfig - Configuração do IVA
     * @param {string} setorCodigo - Código do setor
     */
    function preencherDadosIVADual(ivaConfig, setorCodigo) {
        // Seleciona o setor apropriado
        const campoSetor = document.getElementById('setor');
        if (campoSetor && setorCodigo) {
            // Busca o setor na lista
            const options = Array.from(campoSetor.options);
            const setorOption = options.find(opt => opt.value === setorCodigo);

            if (setorOption) {
                campoSetor.value = setorCodigo;
                campoSetor.dispatchEvent(new Event('change'));
            } else {
                // Se não encontrou, loga a informação
                adicionarLog(`Setor "${setorCodigo}" não encontrado na lista. Usando configuração manual do IVA.`, 'warning');

                // Preenche os campos manualmente
                if (ivaConfig) {
                    // Alíquota CBS
                    const campoAliquotaCbs = document.getElementById('aliquota-cbs');
                    if (campoAliquotaCbs && ivaConfig.cbs) {
                        campoAliquotaCbs.value = (ivaConfig.cbs * 100).toFixed(1);
                    }

                    // Alíquota IBS
                    const campoAliquotaIbs = document.getElementById('aliquota-ibs');
                    if (campoAliquotaIbs && ivaConfig.ibs) {
                        campoAliquotaIbs.value = (ivaConfig.ibs * 100).toFixed(1);
                    }

                    // Redução Especial
                    const campoReducao = document.getElementById('reducao');
                    if (campoReducao && ivaConfig.reducaoEspecial) {
                        campoReducao.value = (ivaConfig.reducaoEspecial * 100).toFixed(1);
                    }

                    // Categoria IVA
                    const campoCategoriaIva = document.getElementById('categoria-iva');
                    if (campoCategoriaIva && ivaConfig.categoriaIva) {
                        campoCategoriaIva.value = ivaConfig.categoriaIva;
                    }

                    // Calcular alíquota total
                    const campoAliquota = document.getElementById('aliquota');
                    if (campoAliquota) {
                        const aliquotaTotal = (ivaConfig.cbs + ivaConfig.ibs) * 
                                             (1 - ivaConfig.reducaoEspecial);
                        campoAliquota.value = (aliquotaTotal * 100).toFixed(1);
                    }
                }
            }
        }
    }
    
    /**
     * Cancela o processo de importação
     */
    function cancelarImportacao() {
        // Limpa os campos de arquivo
        elements.spedFiscal.value = '';
        elements.spedContribuicoes.value = '';
        elements.spedEcf.value = '';
        elements.spedEcd.value = '';
        
        // Limpa o log
        limparLog();
        
        adicionarLog('Importação cancelada pelo usuário.', 'info');
    }
    
    /**
     * Verifica se algum arquivo foi selecionado
     * @returns {boolean} Verdadeiro se há pelo menos um arquivo selecionado
     */
    function verificarArquivosSelecionados() {
        return (
            elements.spedFiscal.files.length > 0 ||
            elements.spedContribuicoes.files.length > 0 ||
            elements.spedEcf.files.length > 0 ||
            elements.spedEcd.files.length > 0
        );
    }
    
    /**
     * Adiciona uma mensagem à área de log
     * @param {string} mensagem - Mensagem a ser adicionada
     * @param {string} tipo - Tipo de mensagem (info, success, warning, error)
     */
    function adicionarLog(mensagem, tipo = 'info') {
        const logItem = document.createElement('p');
        logItem.className = `log-${tipo}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logItem.innerHTML = `<span class="log-time">[${timestamp}]</span> ${mensagem}`;
        
        elements.logArea.appendChild(logItem);
        elements.logArea.scrollTop = elements.logArea.scrollHeight;
    }
    
    /**
     * Limpa a área de log
     */
    function limparLog() {
        elements.logArea.innerHTML = '';
    }
    
    /**
     * Formata um valor numérico como moeda
     * @param {number} valor - Valor a ser formatado
     * @returns {string} Valor formatado como moeda
     */
    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }
    
    // Inicializa o controller quando o DOM estiver carregado
    document.addEventListener('DOMContentLoaded', inicializar);
    
    // Interface pública
    return {
        inicializar,
        adicionarLog
    };
})();