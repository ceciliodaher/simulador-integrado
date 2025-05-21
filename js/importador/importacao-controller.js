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
     * Combina os resultados de múltiplos arquivos SPED
     * @param {Array} resultados - Array de resultados por arquivo
     * @returns {Object} Dados combinados
     */
    function combinarResultados(resultados) {
        // Inicializa objeto combinado
        const combinado = {
            empresa: {},
            documentos: [],
            itens: [],
            impostos: {},
            creditos: {}
        };
        
        // Combina os resultados
        resultados.forEach(resultado => {
            // Dados da empresa (preferência para o primeiro arquivo com dados)
            if (Object.keys(resultado.empresa).length > 0 && Object.keys(combinado.empresa).length === 0) {
                combinado.empresa = {...resultado.empresa};
            }
            
            // Documentos e itens (concatena todos)
            combinado.documentos = combinado.documentos.concat(resultado.documentos || []);
            combinado.itens = combinado.itens.concat(resultado.itens || []);
            
            // Impostos e créditos (mescla por categoria)
            if (resultado.impostos) {
                Object.entries(resultado.impostos).forEach(([categoria, valores]) => {
                    if (!combinado.impostos[categoria]) {
                        combinado.impostos[categoria] = [];
                    }
                    combinado.impostos[categoria] = combinado.impostos[categoria].concat(valores);
                });
            }
            
            if (resultado.creditos) {
                Object.entries(resultado.creditos).forEach(([categoria, valores]) => {
                    if (!combinado.creditos[categoria]) {
                        combinado.creditos[categoria] = [];
                    }
                    combinado.creditos[categoria] = combinado.creditos[categoria].concat(valores);
                });
            }
        });
        
        return combinado;
    }
    
    /**
     * Preenche os campos do simulador com os dados extraídos
     * @param {Object} dados - Dados formatados para o simulador
     */
    function preencherCamposSimulador(dados) {
        adicionarLog('Preenchendo campos do simulador...', 'info');
        
        try {
            // Dados da empresa
            if (dados.empresa && elements.importEmpresa.checked) {
                document.getElementById('empresa').value = dados.empresa.nome;
                
                // Formata o faturamento como moeda
                const faturamento = document.getElementById('faturamento');
                if (faturamento) {
                    // Verifica se há uma função de formatação de moeda disponível
                    if (typeof CurrencyFormatter !== 'undefined' && CurrencyFormatter.formatarMoeda) {
                        faturamento.value = CurrencyFormatter.formatarMoeda(dados.empresa.faturamento);
                    } else {
                        // Formato básico
                        faturamento.value = formatarMoeda(dados.empresa.faturamento);
                    }
                }
                
                // Seleciona o tipo de empresa
                const tipoEmpresa = document.getElementById('tipo-empresa');
                if (tipoEmpresa) {
                    tipoEmpresa.value = dados.empresa.tipoEmpresa;
                    // Dispara o evento de mudança para atualizar campos dependentes
                    tipoEmpresa.dispatchEvent(new Event('change'));
                }
                
                // Margem operacional (convertido para percentual)
                const margem = document.getElementById('margem');
                if (margem) {
                    margem.value = (dados.empresa.margem * 100).toFixed(2);
                }
                
                // Regime tributário
                const regime = document.getElementById('regime');
                if (regime) {
                    regime.value = dados.empresa.regime;
                    // Dispara o evento de mudança para atualizar campos dependentes
                    regime.dispatchEvent(new Event('change'));
                }
                
                adicionarLog('Dados da empresa preenchidos com sucesso.', 'success');
            }
            
            // Parâmetros fiscais
            if (dados.parametrosFiscais && elements.importImpostos.checked) {
                // Tipo de operação
                const tipoOperacao = document.getElementById('tipo-operacao');
                if (tipoOperacao) {
                    tipoOperacao.value = dados.parametrosFiscais.tipoOperacao;
                    tipoOperacao.dispatchEvent(new Event('change'));
                }
                
                // Regime PIS/COFINS
                const pisCofinsRegime = document.getElementById('pis-cofins-regime');
                if (pisCofinsRegime) {
                    pisCofinsRegime.value = dados.parametrosFiscais.regimePisCofins;
                    pisCofinsRegime.dispatchEvent(new Event('change'));
                }
                
                // Créditos
                const credPisCofins = document.getElementById('creditos-pis-cofins-calc');
                if (credPisCofins) {
                    const valorCreditos = dados.parametrosFiscais.creditos.pis + dados.parametrosFiscais.creditos.cofins;
                    credPisCofins.value = formatarMoeda(valorCreditos);
                }
                
                const credIcms = document.getElementById('creditos-icms-calc');
                if (credIcms) {
                    credIcms.value = formatarMoeda(dados.parametrosFiscais.creditos.icms);
                }
                
                const credIpi = document.getElementById('creditos-ipi-calc');
                if (credIpi) {
                    credIpi.value = formatarMoeda(dados.parametrosFiscais.creditos.ipi);
                }
                
                adicionarLog('Parâmetros fiscais preenchidos com sucesso.', 'success');
            }
            
            // Ciclo financeiro
            if (dados.cicloFinanceiro && elements.importCiclo.checked) {
                const pmr = document.getElementById('pmr');
                if (pmr) {
                    pmr.value = dados.cicloFinanceiro.pmr;
                    pmr.dispatchEvent(new Event('input'));
                }
                
                const pmp = document.getElementById('pmp');
                if (pmp) {
                    pmp.value = dados.cicloFinanceiro.pmp;
                    pmp.dispatchEvent(new Event('input'));
                }
                
                const pme = document.getElementById('pme');
                if (pme) {
                    pme.value = dados.cicloFinanceiro.pme;
                    pme.dispatchEvent(new Event('input'));
                }
                
                const percVista = document.getElementById('perc-vista');
                if (percVista) {
                    percVista.value = (dados.cicloFinanceiro.percVista * 100).toFixed(0);
                    percVista.dispatchEvent(new Event('input'));
                }
                
                adicionarLog('Dados do ciclo financeiro preenchidos com sucesso.', 'success');
            }
            
            // Rolar para a aba de simulação após preencher
            setTimeout(() => {
                const abaPrincipal = document.querySelector('.tab-button[data-tab="simulacao"]');
                if (abaPrincipal) {
                    abaPrincipal.click();
                }
            }, 1000);
            
        } catch (erro) {
            adicionarLog('Erro ao preencher campos do simulador: ' + erro.message, 'error');
            console.error('Erro ao preencher campos:', erro);
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