/**
 * Estado da interface da aba de Memória de Cálculo
 * Armazena o estado atual da visualização e filtros aplicados
 */
let interfaceState = {
    simulacaoRealizada: false,
    anoSelecionado: null,
    filtros: {
        sistemaTributario: 'todos', // 'todos', 'atual', 'ivaSplit', 'ivaSemSplit'
        origemCalculo: 'todos',      // 'todos', 'simulacao', 'estrategias', etc.
        detalhamento: 'normal'       // 'normal', 'detalhado', 'resumido'
    },
    ultimaAtualizacao: null
};

const MemoriaCalculoController = {
    
    /**
     * Inicializa o controlador de Memória de Cálculo
     * Configura o estado inicial e carrega dados do repositório
     */
    inicializar: function() {
        console.log('Inicializando controlador de Memória de Cálculo');

        // Obter estado da interface do repositório se disponível
        if (window.SimuladorRepository && typeof window.SimuladorRepository.obterSecao === 'function') {
            const estadoSalvo = window.SimuladorRepository.obterSecao('interfaceState');
            if (estadoSalvo) {
                // Usar estrutura aninhada através do DataManager para garantir consistência
                if (window.DataManager && typeof window.DataManager.validarDadosSecao === 'function') {
                    const estadoValidado = window.DataManager.validarDadosSecao('interfaceState', estadoSalvo);

                    // Atualizar interfaceState com dados validados
                    Object.assign(interfaceState, estadoValidado);
                    console.log('Estado da interface carregado e validado pelo DataManager');
                } else {
                    // Fallback se DataManager não estiver disponível
                    Object.assign(interfaceState, estadoSalvo);
                    console.log('Estado da interface carregado do repositório (sem validação)');
                }
            }
        }

        // Verificar se há uma simulação realizada
        this.verificarSimulacaoRealizada();

        // Inicializar componentes de interface
        this.inicializarComponentes();

        // Inicializar eventos
        this.inicializarEventos();

        // Atualizar dropdown de anos
        this.atualizarDropdownAnos();

        // Atualizar filtros de visualização
        this.inicializarFiltros();

        console.log('Controlador de Memória de Cálculo inicializado');
    },
    
    /**
     * Inicializa os componentes de interface relacionados à memória de cálculo
     * Cria elementos adicionais necessários para filtros e visualização
     */
    inicializarComponentes: function() {
        // Criar os elementos de filtro se ainda não existirem
        const divFiltrosMemoria = document.getElementById('filtros-memoria');
        if (!divFiltrosMemoria) {
            // Criar container para filtros
            const divFiltros = document.createElement('div');
            divFiltros.id = 'filtros-memoria';
            divFiltros.className = 'filtros-container';

            // Adicionar HTML para filtros
            divFiltros.innerHTML = `
                <div class="form-row">
                    <div class="form-column">
                        <div class="form-group">
                            <label for="filtro-sistema">Sistema Tributário:</label>
                            <select id="filtro-sistema" class="form-control">
                                <option value="todos">Todos os Sistemas</option>
                                <option value="atual">Sistema Atual</option>
                                <option value="ivaSplit">IVA com Split Payment</option>
                                <option value="ivaSemSplit">IVA sem Split Payment</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-column">
                        <div class="form-group">
                            <label for="filtro-origem">Origem dos Cálculos:</label>
                            <select id="filtro-origem" class="form-control">
                                <option value="todos">Todas as Origens</option>
                                <option value="simulacao">Simulação Principal</option>
                                <option value="estrategias">Estratégias de Mitigação</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-column">
                        <div class="form-group">
                            <label for="filtro-detalhamento">Nível de Detalhamento:</label>
                            <select id="filtro-detalhamento" class="form-control">
                                <option value="normal">Normal</option>
                                <option value="detalhado">Detalhado</option>
                                <option value="resumido">Resumido</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;

            // Inserir antes do container de memória
            const containerMemoria = document.getElementById('memoria-calculo');
            if (containerMemoria && containerMemoria.parentNode) {
                containerMemoria.parentNode.insertBefore(divFiltros, containerMemoria);
            }
        }

        // Adicionar o container para resultados estruturados se não existir
        const divResultadosEstruturados = document.getElementById('resultados-estruturados');
        if (!divResultadosEstruturados) {
            const divResultados = document.createElement('div');
            divResultados.id = 'resultados-estruturados';
            divResultados.className = 'memoria-resultados-grid';

            // Inserir após o container de memória
            const containerMemoria = document.getElementById('memoria-calculo');
            if (containerMemoria && containerMemoria.parentNode) {
                containerMemoria.parentNode.insertBefore(divResultados, containerMemoria.nextSibling);
            }
        }
    },
    
    /**
     * Inicializa os filtros de visualização da memória de cálculo
     * Configura eventos e valores iniciais com base no estado da interface
     */
    inicializarFiltros: function() {
        // Inicializar filtro de sistema tributário
        const filtroSistema = document.getElementById('filtro-sistema');
        if (filtroSistema) {
            // Configurar valor inicial
            filtroSistema.value = interfaceState.filtros.sistemaTributario;

            // Adicionar evento para atualizar a visualização
            filtroSistema.addEventListener('change', () => {
                interfaceState.filtros.sistemaTributario = filtroSistema.value;
                this.salvarEstadoInterface();
                this.exibirMemoriaCalculo(interfaceState.anoSelecionado);
            });
        }

        // Inicializar filtro de origem dos cálculos
        const filtroOrigem = document.getElementById('filtro-origem');
        if (filtroOrigem) {
            // Configurar valor inicial
            filtroOrigem.value = interfaceState.filtros.origemCalculo;

            // Adicionar evento para atualizar a visualização
            filtroOrigem.addEventListener('change', () => {
                interfaceState.filtros.origemCalculo = filtroOrigem.value;
                this.salvarEstadoInterface();
                this.exibirMemoriaCalculo(interfaceState.anoSelecionado);
            });
        }

        // Inicializar filtro de nível de detalhamento
        const filtroDetalhamento = document.getElementById('filtro-detalhamento');
        if (filtroDetalhamento) {
            // Configurar valor inicial
            filtroDetalhamento.value = interfaceState.filtros.detalhamento;

            // Adicionar evento para atualizar a visualização
            filtroDetalhamento.addEventListener('change', () => {
                interfaceState.filtros.detalhamento = filtroDetalhamento.value;
                this.salvarEstadoInterface();
                this.exibirMemoriaCalculo(interfaceState.anoSelecionado);
            });
        }
    },
    
    /**
     * Salva o estado atual da interface no repositório
     * Utiliza o DataManager para normalizar os dados antes da persistência
     */
    salvarEstadoInterface: function() {
        if (window.SimuladorRepository && typeof window.SimuladorRepository.atualizarSecao === 'function') {
            // Marcar hora da última atualização
            interfaceState.ultimaAtualizacao = new Date().toISOString();

            // Salvar estado através do repositório
            if (window.DataManager && typeof window.DataManager.normalizarDadosSecao === 'function') {
                // Normalizar dados utilizando o DataManager
                const dadosNormalizados = window.DataManager.normalizarDadosSecao('interfaceState', interfaceState);
                window.SimuladorRepository.atualizarSecao('interfaceState', dadosNormalizados);
                console.log('Estado da interface salvo e normalizado pelo DataManager');
            } else {
                // Fallback se DataManager não estiver disponível
                window.SimuladorRepository.atualizarSecao('interfaceState', interfaceState);
                console.log('Estado da interface salvo no repositório (sem normalização)');
            }
        }
    },
    
    /**
     * Verifica se há uma simulação realizada e registrada
     * Atualiza o estado da interface com base na disponibilidade de dados
     * @returns {boolean} Indica se há simulação realizada disponível
     */
    verificarSimulacaoRealizada: function() {
        // Verificar se o objeto de memória de cálculo global está disponível
        const temMemoriaCalculo = window.memoriaCalculoSimulacao !== undefined && 
                                 window.memoriaCalculoSimulacao !== null;

        // Verificar se há resultados de simulação armazenados
        const temResultados = window.resultadosSimulacao !== undefined && 
                             window.resultadosSimulacao !== null;

        // Verificar o repositório se os outros métodos falharem
        let simulacaoNoRepositorio = false;
        if (window.SimuladorRepository && typeof window.SimuladorRepository.obterSecao === 'function') {
            const estadoSalvo = window.SimuladorRepository.obterSecao('interfaceState');
            simulacaoNoRepositorio = estadoSalvo && estadoSalvo.simulacaoRealizada === true;
        }

        // Atualizar o estado com base nas verificações
        interfaceState.simulacaoRealizada = temMemoriaCalculo || temResultados || simulacaoNoRepositorio;

        // Logar status para diagnóstico
        if (interfaceState.simulacaoRealizada) {
            console.log('Verificação de simulação: Dados de simulação encontrados');
        } else {
            console.log('Verificação de simulação: Nenhum dado de simulação encontrado');
        }

        return interfaceState.simulacaoRealizada;
    },
    
    /**
     * Inicializa os eventos relacionados à memória de cálculo
     * Configura listeners para botões e campos da interface
     */
    inicializarEventos: function() {
        // Botão atualizar memória
        const btnAtualizarMemoria = document.getElementById('btn-atualizar-memoria');
        if (btnAtualizarMemoria) {
            btnAtualizarMemoria.addEventListener('click', () => {
                const selectAno = document.getElementById('select-ano-memoria');
                if (selectAno) {
                    interfaceState.anoSelecionado = selectAno.value;
                    this.salvarEstadoInterface();
                    this.exibirMemoriaCalculo(selectAno.value);
                }
            });
        }

        // Select de anos
        const selectAno = document.getElementById('select-ano-memoria');
        if (selectAno) {
            selectAno.addEventListener('change', () => {
                interfaceState.anoSelecionado = selectAno.value;
                this.salvarEstadoInterface();
                this.exibirMemoriaCalculo(selectAno.value);
            });
        }

        // Botão exportar memória
        const btnExportarMemoria = document.getElementById('btn-exportar-memoria');
        if (btnExportarMemoria) {
            btnExportarMemoria.addEventListener('click', () => {
                if (typeof ExportTools !== 'undefined' && typeof ExportTools.exportarMemoriaCalculo === 'function') {
                    // Obter dados formatados para exportação usando estrutura canônica
                    const dadosExportacao = this.obterDadosFormatadosParaExportacao();

                    // Chamar ferramenta de exportação com dados formatados
                    ExportTools.exportarMemoriaCalculo(dadosExportacao);
                } else {
                    alert('Ferramenta de exportação não disponível.');
                }
            });
        }

        // Adicionar evento ao botão de feedback/estrela (se existir)
        const btnFeedback = document.getElementById('btn-feedback-memoria');
        if (btnFeedback) {
            btnFeedback.addEventListener('click', () => {
                // Abrir painel de feedback ou informações detalhadas
                this.mostrarPainelFeedback();
            });
        }
    },
    
    /**
     * Obtém os dados da memória de cálculo em formato adequado para exportação
     * Aplica filtros e formatação necessária para o formato de destino
     * @returns {Object} Dados estruturados para exportação
     */
    obterDadosFormatadosParaExportacao: function() {
        // Obter dados da memória de cálculo global
        const dadosMemoria = this.obterDadosMemoriaCalculo(interfaceState.anoSelecionado);

        // Aplicar filtros conforme selecionado na interface
        const dadosFiltrados = this.aplicarFiltrosNaMemoriaCalculo(
            dadosMemoria,
            interfaceState.filtros.sistemaTributario,
            interfaceState.filtros.origemCalculo,
            interfaceState.filtros.detalhamento
        );

        // Adicionar metadados para a exportação
        const dadosExportacao = {
            titulo: `Memória de Cálculo - Impacto do Split Payment - Ano ${interfaceState.anoSelecionado}`,
            data: new Date().toLocaleDateString('pt-BR'),
            filtros: {
                ano: interfaceState.anoSelecionado,
                sistemaTributario: interfaceState.filtros.sistemaTributario,
                origemCalculo: interfaceState.filtros.origemCalculo,
                detalhamento: interfaceState.filtros.detalhamento
            },
            conteudo: dadosFiltrados,
            parametrosSimulacao: window.resultadosSimulacao?.memoriaCalculo?.dadosEntrada?.parametrosSimulacao || {},
            empresa: window.resultadosSimulacao?.memoriaCalculo?.dadosEntrada?.empresa || {}
        };

        return dadosExportacao;
    },
    
    /**
     * Obtém os dados da memória de cálculo para um determinado ano
     * Combina dados de diferentes fontes para criar uma visão consolidada
     * @param {string|number} ano - Ano para o qual deseja obter os dados
     * @returns {Object} Dados consolidados da memória de cálculo
     */
    obterDadosMemoriaCalculo(ano) {
        console.log(`Obtendo dados da memória de cálculo para o ano ${ano}`);

        // Verificar se há dados disponíveis
        if (!window.memoriaCalculoSimulacao && !window.resultadosSimulacao) {
            console.warn('Nenhum dado de memória de cálculo disponível');
            return null;
        }

        // Converter o parâmetro ano para número se necessário
        const anoRef = parseInt(ano, 10);
        if (isNaN(anoRef)) {
            console.warn(`Ano inválido: ${ano}`);
            return null;
        }

        console.log(`Ano de referência: ${anoRef}`);

        // Tentar obter memória de cálculo diretamente do objeto global
        let memoriaCalculo = null;

        if (window.memoriaCalculoSimulacao) {
            console.log("Obtendo dados de memoriaCalculoSimulacao");
            memoriaCalculo = window.memoriaCalculoSimulacao;
        } else if (window.resultadosSimulacao && window.resultadosSimulacao.memoriaCalculo) {
            console.log("Obtendo dados de resultadosSimulacao.memoriaCalculo");
            memoriaCalculo = window.resultadosSimulacao.memoriaCalculo;
        }

        // Verificar resultados para o ano específico
        let resultadosAno = null;
        if (window.resultadosSimulacao && 
            window.resultadosSimulacao.projecaoTemporal && 
            window.resultadosSimulacao.projecaoTemporal.resultadosAnuais && 
            window.resultadosSimulacao.projecaoTemporal.resultadosAnuais[anoRef]) {

            console.log(`Dados específicos encontrados para o ano ${anoRef}`);
            resultadosAno = window.resultadosSimulacao.projecaoTemporal.resultadosAnuais[anoRef];
        }

        // Se ainda não temos dados, tentar obter do repositório
        if (!memoriaCalculo && !resultadosAno && window.SimuladorRepository) {
            console.log("Tentando obter dados do repositório");

            const historicoCalculos = window.SimuladorRepository.obterHistoricoCalculos();
            if (historicoCalculos && historicoCalculos.length > 0) {
                // Filtrar apenas os registros para o ano de referência
                const calculosAno = historicoCalculos.filter(registro => 
                    registro.year === anoRef.toString() || 
                    registro.year.split('-')[0] === anoRef.toString() ||
                    registro.inputs?.dataInicial?.split('-')[0] === anoRef.toString()
                );

                if (calculosAno.length > 0) {
                    console.log(`${calculosAno.length} registros encontrados no histórico para o ano ${anoRef}`);
                    // Construir objeto de memória de cálculo com base nos registros
                    memoriaCalculo = this.construirMemoriaCalculoDeHistorico(calculosAno);
                }
            }
        }

        // Verificar se temos dados para processar
        if (!memoriaCalculo && !resultadosAno) {
            console.warn(`Não foram encontrados dados para o ano ${anoRef}`);
            return null;
        }

        // Estruturar a memória de cálculo para o formato canônico
        const dadosEstruturados = this.estruturarMemoriaCalculo(memoriaCalculo, resultadosAno, anoRef);

        // Log para diagnóstico
        this.logEstruturaDados(dadosEstruturados, `Dados Ano ${anoRef}`);

        return dadosEstruturados;
    },
    
    /**
     * Estrutura os dados da memória de cálculo no formato canônico
     * Garante que todos os sistemas tributários e origens sejam representados
     * @param {Object} memoriaCalculo - Dados brutos da memória de cálculo
     * @param {Object} resultadosAno - Resultados específicos para o ano (opcional)
     * @param {number} ano - Ano de referência
     * @returns {Object} Memória de cálculo estruturada
     */
    estruturarMemoriaCalculo(memoriaCalculo, resultadosAno, ano) {
        console.log(`Estruturando memória de cálculo para o ano ${ano}`);

        // Se não houver dados, retornar estrutura vazia
        if (!memoriaCalculo && !resultadosAno) {
            console.warn("Sem dados para estruturar");
            return {
                ano: ano,
                dadosEntrada: {},
                sistemasTributarios: {
                    atual: { detalhes: {}, calculos: {} },
                    ivaSplit: { detalhes: {}, calculos: {} },
                    ivaSemSplit: { detalhes: {}, calculos: {} }
                },
                impactos: {
                    capital: {},
                    fluxoCaixa: {},
                    margem: {}
                },
                origens: {
                    simulacao: {},
                    estrategias: {}
                }
            };
        }

        // Combinar dados da memória de cálculo com resultados do ano específico
        const dadosCombinados = {
            impactoBase: memoriaCalculo?.impactoBase || {},
            projecaoTemporal: memoriaCalculo?.projecaoTemporal || {},
            memoriaCritica: memoriaCalculo?.memoriaCritica || {},
            dadosEntrada: memoriaCalculo?.dadosEntrada || {}
        };

        // Se temos resultados específicos para o ano, integrá-los
        if (resultadosAno) {
            console.log(`Integrando resultados específicos para o ano ${ano}`);

            // Sobrescrever dados específicos do ano quando disponíveis
            dadosCombinados.resultadoAno = resultadosAno;

            // Extrair informações de impacto
            if (!dadosCombinados.impactoBase.diferencaCapitalGiro && resultadosAno.diferencaCapitalGiro) {
                dadosCombinados.impactoBase.diferencaCapitalGiro = resultadosAno.diferencaCapitalGiro;
            }

            if (!dadosCombinados.impactoBase.percentualImpacto && resultadosAno.percentualImpacto) {
                dadosCombinados.impactoBase.percentualImpacto = resultadosAno.percentualImpacto;
            }

            if (!dadosCombinados.impactoBase.impactoDiasFaturamento && resultadosAno.impactoDiasFaturamento) {
                dadosCombinados.impactoBase.impactoDiasFaturamento = resultadosAno.impactoDiasFaturamento;
            }

            if (!dadosCombinados.impactoBase.necessidadeAdicionalCapitalGiro && resultadosAno.necessidadeAdicionalCapitalGiro) {
                dadosCombinados.impactoBase.necessidadeAdicionalCapitalGiro = resultadosAno.necessidadeAdicionalCapitalGiro;
            }

            // Dados específicos dos sistemas tributários
            if (resultadosAno.resultadoAtual) {
                dadosCombinados.impactoBase.resultadoAtual = resultadosAno.resultadoAtual;
            }

            if (resultadosAno.resultadoSplitPayment) {
                dadosCombinados.impactoBase.resultadoSplitPayment = resultadosAno.resultadoSplitPayment;
            }

            if (resultadosAno.resultadoIVASemSplit) {
                dadosCombinados.impactoBase.resultadoIVASemSplit = resultadosAno.resultadoIVASemSplit;
            }
        }

        // Estrutura base para organizar os dados
        const estrutura = {
            ano: ano,
            dadosEntrada: dadosCombinados.dadosEntrada || {},
            sistemasTributarios: {
                atual: {
                    detalhes: this.extrairCalculosSistema(dadosCombinados, 'atual', ano),
                    calculos: {} // Pode ser preenchido com cálculos detalhados se necessário
                },
                ivaSplit: {
                    detalhes: this.extrairCalculosSistema(dadosCombinados, 'ivaSplit', ano),
                    calculos: {}
                },
                ivaSemSplit: {
                    detalhes: this.extrairCalculosSistema(dadosCombinados, 'ivaSemSplit', ano),
                    calculos: {}
                }
            },
            impactos: {
                capital: {
                    diferencaCapitalGiro: dadosCombinados.impactoBase?.diferencaCapitalGiro || resultadosAno?.diferencaCapitalGiro || 0,
                    diferencaCapitalGiroIVASemSplit: dadosCombinados.impactoBase?.diferencaCapitalGiroIVASemSplit || resultadosAno?.diferencaCapitalGiroIVASemSplit || 0,
                    percentualImpacto: dadosCombinados.impactoBase?.percentualImpacto || resultadosAno?.percentualImpacto || 0,
                    percentualImpactoIVASemSplit: dadosCombinados.impactoBase?.percentualImpactoIVASemSplit || resultadosAno?.percentualImpactoIVASemSplit || 0,
                    impactoDiasFaturamento: dadosCombinados.impactoBase?.impactoDiasFaturamento || resultadosAno?.impactoDiasFaturamento || 0,
                    necessidadeAdicionalCapitalGiro: dadosCombinados.impactoBase?.necessidadeAdicionalCapitalGiro || resultadosAno?.necessidadeAdicionalCapitalGiro || 0,
                    necessidadeAdicionalCapitalGiroIVASemSplit: dadosCombinados.impactoBase?.necessidadeAdicionalCapitalGiroIVASemSplit || resultadosAno?.necessidadeAdicionalCapitalGiroIVASemSplit || 0
                },
                fluxoCaixa: this.extrairImpactoFluxoCaixa(dadosCombinados, resultadosAno, ano),
                margem: {
                    margemOriginal: dadosCombinados.impactoBase?.margemOperacionalOriginal || resultadosAno?.margemOperacionalOriginal || 0,
                    margemAjustada: dadosCombinados.impactoBase?.margemOperacionalAjustada || resultadosAno?.margemOperacionalAjustada || 0,
                    impactoMargem: dadosCombinados.impactoBase?.impactoMargem || resultadosAno?.impactoMargem || 0
                }
            },
            origens: {
                simulacao: this.extrairDadosMemoriaPorOrigem(dadosCombinados, 'simulacao', ano),
                estrategias: this.extrairDadosMemoriaPorOrigem(dadosCombinados, 'estrategias', ano)
            },
            projecaoTemporal: dadosCombinados.projecaoTemporal || {},
            memoriaCritica: dadosCombinados.memoriaCritica || {
                formula: "Cálculo do impacto do Split Payment no fluxo de caixa",
                passoAPasso: [],
                observacoes: []
            }
        };

        return estrutura;
    },
    
    /**
     * Extrai os cálculos específicos de um sistema tributário
     * @param {Object} memoriaCalculo - Dados da memória de cálculo
     * @param {string} sistema - Sistema tributário ('atual', 'ivaSplit', 'ivaSemSplit')
     * @param {number} ano - Ano de referência
     * @returns {Object} Cálculos do sistema tributário especificado
     */
    extrairCalculosSistema(memoriaCalculo, sistema, ano) {
        // Mapeamento de nomes de sistemas
        const mapeamentoSistemas = {
            'atual': 'resultadoAtual',
            'ivaSplit': 'resultadoSplitPayment',
            'ivaSemSplit': 'resultadoIVASemSplit'
        };

        // Nome do sistema no objeto de memória
        const nomeSistema = mapeamentoSistemas[sistema];
        if (!nomeSistema) {
            console.warn(`Sistema tributário não reconhecido: ${sistema}`);
            return {};
        }

        // Log para diagnóstico
        console.log(`Extraindo dados do sistema: ${sistema} (${nomeSistema}) para o ano ${ano}`);

        // Inicializar com dados vazios
        let dadosSistema = {
            descricao: sistema === 'atual' ? 'Sistema Tributário Atual' : 
                       sistema === 'ivaSplit' ? 'Sistema IVA Dual com Split Payment' : 
                       'Sistema IVA Dual sem Split Payment',
            capitalGiroDisponivel: 0,
            impostos: { total: 0 },
            origem: 'N/A'
        };

        // Extrair dados do impactoBase
        if (memoriaCalculo.impactoBase && memoriaCalculo.impactoBase[nomeSistema]) {
            console.log(`Dados encontrados em impactoBase.${nomeSistema}`);

            const dadosImpactoBase = memoriaCalculo.impactoBase[nomeSistema];
            dadosSistema = {
                ...dadosSistema,
                ...dadosImpactoBase,
                origem: 'impactoBase'
            };

            // Garantir que impostos existe
            if (!dadosSistema.impostos) {
                dadosSistema.impostos = { total: dadosSistema.valorImpostoTotal || 0 };
            }
        }

        // Verificar se há dados na projeção temporal
        if (memoriaCalculo.projecaoTemporal && 
            memoriaCalculo.projecaoTemporal.resultadosAnuais && 
            memoriaCalculo.projecaoTemporal.resultadosAnuais[ano]) {

            const resultadoAno = memoriaCalculo.projecaoTemporal.resultadosAnuais[ano];
            console.log(`Dados encontrados em projecaoTemporal.resultadosAnuais[${ano}].${nomeSistema}`);

            if (resultadoAno[nomeSistema]) {
                // Mesclar com dados do resultado anual, priorizando-os
                dadosSistema = {
                    ...dadosSistema,
                    ...resultadoAno[nomeSistema],
                    origem: 'projecaoTemporal'
                };

                // Garantir que impostos existe
                if (!dadosSistema.impostos) {
                    dadosSistema.impostos = { total: dadosSistema.valorImpostoTotal || 0 };
                }
            }
        }

        // Log dos dados extraídos para diagnóstico
        console.log(`Dados extraídos para ${sistema}:`, dadosSistema);

        return dadosSistema;
    },

    /**
     * Extrai informações sobre impacto no fluxo de caixa
     * @param {Object} memoriaCalculo - Dados da memória de cálculo
     * @param {Object} resultadoAno - Resultados específicos para o ano (opcional)
     * @param {number} ano - Ano de referência
     * @returns {Object} Dados de impacto no fluxo de caixa
     */
    extrairImpactoFluxoCaixa(memoriaCalculo, resultadoAno, ano) {
        // Dados de impacto no fluxo de caixa
        let impactoFluxo = {
            splitConsiderado: true,  // Valor padrão
            impactoSplitPayment: 0,
            impactoIVASemSplit: 0,
            impactoAno: 0,
            percentualAno: 0,
            necessidadeAdicionalAno: 0
        };

        // Extrair do impactoBase se disponível
        if (memoriaCalculo.impactoBase) {
            impactoFluxo = {
                ...impactoFluxo,
                splitConsiderado: memoriaCalculo.impactoBase.splitPaymentConsiderado !== false,
                impactoSplitPayment: memoriaCalculo.impactoBase.diferencaCapitalGiro || 0,
                impactoIVASemSplit: memoriaCalculo.impactoBase.diferencaCapitalGiroIVASemSplit || 0
            };
        }

        // Usar dados do resultado específico do ano se disponível
        if (resultadoAno) {
            impactoFluxo = {
                ...impactoFluxo,
                impactoAno: resultadoAno.diferencaCapitalGiro || 0,
                percentualAno: resultadoAno.percentualImpacto || 0,
                necessidadeAdicionalAno: resultadoAno.necessidadeAdicionalCapitalGiro || 0,
                splitConsiderado: resultadoAno.splitPaymentConsiderado !== false,
                impactoSplitPayment: resultadoAno.diferencaCapitalGiro || impactoFluxo.impactoSplitPayment,
                impactoIVASemSplit: resultadoAno.diferencaCapitalGiroIVASemSplit || impactoFluxo.impactoIVASemSplit
            };
        }

        // Adicionar dados de projeção temporal se disponíveis
        if (memoriaCalculo.projecaoTemporal && 
            memoriaCalculo.projecaoTemporal.resultadosAnuais && 
            memoriaCalculo.projecaoTemporal.resultadosAnuais[ano]) {

            const resultadoProjecao = memoriaCalculo.projecaoTemporal.resultadosAnuais[ano];

            // Priorizar dados da projeção temporal se o resultado específico não estiver disponível
            if (!resultadoAno) {
                impactoFluxo = {
                    ...impactoFluxo,
                    impactoAno: resultadoProjecao.diferencaCapitalGiro || impactoFluxo.impactoAno,
                    percentualAno: resultadoProjecao.percentualImpacto || impactoFluxo.percentualAno,
                    necessidadeAdicionalAno: resultadoProjecao.necessidadeAdicionalCapitalGiro || impactoFluxo.necessidadeAdicionalAno
                };
            }
        }

        return impactoFluxo;
    },

    /**
     * Extrai dados da memória de cálculo por origem
     * @param {Object} memoriaCalculo - Dados da memória de cálculo
     * @param {string} origem - Origem dos dados ('simulacao', 'estrategias')
     * @param {number} ano - Ano de referência
     * @returns {Object} Dados de memória de cálculo para a origem especificada
     */
    extrairDadosMemoriaPorOrigem: function(memoriaCalculo, origem, ano) {
        // Estrutura base
        const dadosOrigem = {
            calculos: [],
            resultados: {}
        };

        // Extrair dados da simulação principal
        if (origem === 'simulacao' && memoriaCalculo.impactoBase) {
            // Adicionar os cálculos realizados na simulação principal
            dadosOrigem.calculos.push({
                descricao: 'Cálculo do Impacto Base',
                parametros: memoriaCalculo.dadosEntrada?.parametrosSimulacao || {},
                resultados: {
                    capitalGiroAtual: memoriaCalculo.impactoBase.resultadoAtual?.capitalGiroDisponivel,
                    capitalGiroSplit: memoriaCalculo.impactoBase.resultadoSplitPayment?.capitalGiroDisponivel,
                    diferencaCapitalGiro: memoriaCalculo.impactoBase.diferencaCapitalGiro,
                    percentualImpacto: memoriaCalculo.impactoBase.percentualImpacto
                }
            });

            // Adicionar memória crítica se disponível
            if (memoriaCalculo.memoriaCritica) {
                dadosOrigem.memoriaCritica = memoriaCalculo.memoriaCritica;
            }
        }

        // Extrair dados das estratégias de mitigação
        if (origem === 'estrategias' && window.lastStrategyResults) {
            const estrategias = window.lastStrategyResults;

            // Dados consolidados de estratégias
            dadosOrigem.resultados = {
                efetividadeTotal: estrategias.efeitividadeCombinada?.efetividadePercentual || 0,
                mitigacaoTotal: estrategias.efeitividadeCombinada?.mitigacaoTotal || 0,
                custoTotal: estrategias.efeitividadeCombinada?.custoTotal || 0,
                relacaoCustoBeneficio: estrategias.efeitividadeCombinada?.custoBeneficio || 0
            };

            // Detalhamento por estratégia
            if (estrategias.resultadosEstrategias) {
                Object.entries(estrategias.resultadosEstrategias).forEach(([nomeEstrategia, resultado]) => {
                    if (resultado) {
                        dadosOrigem.calculos.push({
                            estrategia: nomeEstrategia,
                            descricao: this.traduzirNomeEstrategia(nomeEstrategia),
                            efetividade: resultado.efetividadePercentual || 0,
                            valorMitigado: resultado.valorMitigado || 0,
                            custoImplementacao: resultado.custoImplementacao || 0
                        });
                    }
                });
            }
        }

        return dadosOrigem;
    },

    /**
     * Traduz o nome técnico da estratégia para um nome amigável
     * @param {string} nomeTecnico - Nome técnico da estratégia
     * @returns {string} Nome amigável para exibição
     */
    traduzirNomeEstrategia: function(nomeTecnico) {
        const traducoes = {
            'ajustePrecos': 'Ajuste de Preços',
            'renegociacaoPrazos': 'Renegociação de Prazos',
            'antecipacaoRecebiveis': 'Antecipação de Recebíveis',
            'capitalGiro': 'Capital de Giro',
            'mixProdutos': 'Mix de Produtos',
            'meiosPagamento': 'Meios de Pagamento'
        };

        return traducoes[nomeTecnico] || nomeTecnico;
    },
    
    /**
     * Aplica os filtros selecionados aos dados da memória de cálculo
     * @param {Object} dadosMemoria - Dados completos da memória de cálculo
     * @param {string} filtroSistema - Filtro de sistema tributário
     * @param {string} filtroOrigem - Filtro de origem dos dados
     * @param {string} filtroDetalhamento - Nível de detalhamento
     * @returns {Object} Dados filtrados da memória de cálculo
     */
    aplicarFiltrosNaMemoriaCalculo(dadosMemoria, filtroSistema, filtroOrigem, filtroDetalhamento) {
        // Se não houver dados, retornar null
        if (!dadosMemoria) {
            console.warn("Não há dados de memória para aplicar filtros");
            return null;
        }

        // Clonar os dados originais para não modificá-los
        const dadosFiltrados = JSON.parse(JSON.stringify(dadosMemoria));

        console.log(`Aplicando filtros: sistema=${filtroSistema}, origem=${filtroOrigem}, detalhamento=${filtroDetalhamento}`);
        console.log("Dados antes dos filtros:", dadosFiltrados);

        // Aplicar filtro de sistema tributário
        if (filtroSistema !== 'todos') {
            console.log(`Filtrando para sistema: ${filtroSistema}`);

            // Verificar se o sistema selecionado existe
            if (dadosFiltrados.sistemasTributarios[filtroSistema]) {
                // Manter apenas o sistema selecionado
                const sistemaSelecionado = dadosFiltrados.sistemasTributarios[filtroSistema];
                dadosFiltrados.sistemasTributarios = {
                    [filtroSistema]: sistemaSelecionado
                };
            } else {
                console.warn(`Sistema tributário selecionado não encontrado: ${filtroSistema}`);
                // Manter todos os sistemas se o selecionado não existir
            }
        }

        // Aplicar filtro de origem
        if (filtroOrigem !== 'todos') {
            console.log(`Filtrando para origem: ${filtroOrigem}`);

            // Verificar se a origem selecionada existe
            if (dadosFiltrados.origens[filtroOrigem]) {
                // Manter apenas a origem selecionada
                const origemSelecionada = dadosFiltrados.origens[filtroOrigem];
                dadosFiltrados.origens = {
                    [filtroOrigem]: origemSelecionada
                };
            } else {
                console.warn(`Origem selecionada não encontrada: ${filtroOrigem}`);
                // Manter todas as origens se a selecionada não existir
            }
        }

        // Aplicar nível de detalhamento
        console.log(`Aplicando nível de detalhamento: ${filtroDetalhamento}`);

        if (filtroDetalhamento === 'resumido') {
            // Remover detalhes de cálculos para exibição resumida
            delete dadosFiltrados.memoriaCritica;

            // Simplificar as estruturas mantendo apenas os resultados principais
            Object.keys(dadosFiltrados.sistemasTributarios).forEach(sistema => {
                // Manter apenas campos essenciais nos detalhes do sistema
                if (dadosFiltrados.sistemasTributarios[sistema].detalhes) {
                    const detalhes = dadosFiltrados.sistemasTributarios[sistema].detalhes;
                    dadosFiltrados.sistemasTributarios[sistema].detalhes = {
                        descricao: detalhes.descricao || `Sistema ${sistema}`,
                        impostos: detalhes.impostos || { total: 0 },
                        capitalGiroDisponivel: detalhes.capitalGiroDisponivel || 0
                    };
                }

                // Remover cálculos detalhados
                delete dadosFiltrados.sistemasTributarios[sistema].calculos;
            });

            // Simplificar origens mantendo apenas resultados
            Object.keys(dadosFiltrados.origens).forEach(origem => {
                delete dadosFiltrados.origens[origem].calculos;
            });

        } else if (filtroDetalhamento === 'detalhado') {
            // Nível detalhado: manter todos os detalhes, sem alterações
            console.log("Mantendo todos os detalhes");
        } else {
            // Nível normal: incluir detalhes principais mas não passos intermediários
            console.log("Aplicando nível normal de detalhamento");

            // Remover passos intermediários da memória crítica
            if (dadosFiltrados.memoriaCritica) {
                delete dadosFiltrados.memoriaCritica.passoAPasso;
            }
        }

        console.log("Dados após aplicação dos filtros:", dadosFiltrados);
        return dadosFiltrados;
    },
    
    /**
     * Constrói um objeto de memória de cálculo a partir do histórico de cálculos
     * @param {Array} historico - Registros do histórico de cálculos
     * @returns {Object} Objeto estruturado de memória de cálculo
     */
    construirMemoriaCalculoDeHistorico: function(historico) {
        // Se não houver histórico, retornar null
        if (!historico || historico.length === 0) {
            return null;
        }

        // Estrutura base para a memória de cálculo
        const memoriaCalculo = {
            dadosEntrada: {},
            impactoBase: {
                resultadoAtual: {},
                resultadoSplitPayment: {},
                resultadoIVASemSplit: {}
            },
            projecaoTemporal: {
                parametros: {},
                resultadosAnuais: {}
            },
            memoriaCritica: {
                formula: 'Construído a partir do histórico de cálculos',
                observacoes: [
                    'Esta memória de cálculo foi reconstruída a partir do histórico de registros de cálculo.'
                ]
            }
        };

        // Processar cada registro do histórico
        historico.forEach((registro, index) => {
            // Extrair dados de entrada
            if (index === 0 || !memoriaCalculo.dadosEntrada.empresa) {
                memoriaCalculo.dadosEntrada = {
                    empresa: registro.inputs?.empresa || {},
                    cicloFinanceiro: registro.inputs?.cicloFinanceiro || {},
                    parametrosFiscais: registro.inputs?.parametrosFiscais || {},
                    parametrosSimulacao: registro.inputs?.parametrosSimulacao || {}
                };
            }

            // Adicionar resultados de acordo com o sistema tributário
            if (registro.calculationSource === 'Simulação Principal') {
                // Classificar por sistema tributário
                switch (registro.taxationSystem) {
                    case 'Sistema Atual':
                        memoriaCalculo.impactoBase.resultadoAtual = {
                            ...memoriaCalculo.impactoBase.resultadoAtual,
                            ...registro.outputs,
                            descricao: 'Sistema Tributário Atual'
                        };
                        break;
                    case 'IVA Dual com Split Payment':
                        memoriaCalculo.impactoBase.resultadoSplitPayment = {
                            ...memoriaCalculo.impactoBase.resultadoSplitPayment,
                            ...registro.outputs,
                            descricao: 'Sistema IVA Dual com Split Payment'
                        };
                        break;
                    case 'IVA Dual sem Split Payment':
                        memoriaCalculo.impactoBase.resultadoIVASemSplit = {
                            ...memoriaCalculo.impactoBase.resultadoIVASemSplit,
                            ...registro.outputs,
                            descricao: 'Sistema IVA Dual sem Split Payment'
                        };
                        break;
                }

                // Atualizar dados de impacto se disponíveis
                if (registro.outputs.diferencaCapitalGiro && !memoriaCalculo.impactoBase.diferencaCapitalGiro) {
                    memoriaCalculo.impactoBase.diferencaCapitalGiro = registro.outputs.diferencaCapitalGiro;
                    memoriaCalculo.impactoBase.percentualImpacto = registro.outputs.percentualImpacto;
                    memoriaCalculo.impactoBase.impactoDiasFaturamento = registro.outputs.impactoDiasFaturamento;
                    memoriaCalculo.impactoBase.necessidadeAdicionalCapitalGiro = registro.outputs.necessidadeAdicionalCapitalGiro;
                }
            } else if (registro.calculationSource === 'Projeção Temporal') {
                // Extrair ano do registro
                const anoRegistro = registro.year.split('-')[0] || registro.year;

                // Inicializar estrutura do ano se não existir
                if (!memoriaCalculo.projecaoTemporal.resultadosAnuais[anoRegistro]) {
                    memoriaCalculo.projecaoTemporal.resultadosAnuais[anoRegistro] = {
                        resultadoAtual: {},
                        resultadoSplitPayment: {},
                        resultadoIVASemSplit: {}
                    };
                }

                // Classificar por sistema tributário
                switch (registro.taxationSystem) {
                    case 'Sistema Atual':
                        memoriaCalculo.projecaoTemporal.resultadosAnuais[anoRegistro].resultadoAtual = {
                            ...memoriaCalculo.projecaoTemporal.resultadosAnuais[anoRegistro].resultadoAtual,
                            ...registro.outputs
                        };
                        break;
                    case 'IVA Dual com Split Payment':
                        memoriaCalculo.projecaoTemporal.resultadosAnuais[anoRegistro].resultadoSplitPayment = {
                            ...memoriaCalculo.projecaoTemporal.resultadosAnuais[anoRegistro].resultadoSplitPayment,
                            ...registro.outputs
                        };
                        break;
                    case 'IVA Dual sem Split Payment':
                        memoriaCalculo.projecaoTemporal.resultadosAnuais[anoRegistro].resultadoIVASemSplit = {
                            ...memoriaCalculo.projecaoTemporal.resultadosAnuais[anoRegistro].resultadoIVASemSplit,
                            ...registro.outputs
                        };
                        break;
                }

                // Atualizar parâmetros de projeção
                if (registro.inputs?.parametrosSimulacao) {
                    memoriaCalculo.projecaoTemporal.parametros = {
                        ...memoriaCalculo.projecaoTemporal.parametros,
                        anoInicial: registro.inputs.parametrosSimulacao.dataInicial?.split('-')[0] || '2026',
                        anoFinal: registro.inputs.parametrosSimulacao.dataFinal?.split('-')[0] || '2033',
                        cenarioTaxaCrescimento: registro.inputs.parametrosSimulacao.cenario || 'moderado',
                        taxaCrescimento: registro.inputs.parametrosSimulacao.taxaCrescimento || 0.05
                    };
                }
            }
        });

        return memoriaCalculo;
    },
    
    /**
     * Atualiza o dropdown de seleção de anos com base nos dados disponíveis
     * Obtém anos de todas as fontes possíveis para garantir completude
     */
    atualizarDropdownAnos: function() {
        // Verificar se há uma simulação realizada
        if (!this.verificarSimulacaoRealizada()) {
            return;
        }

        // Conjunto para armazenar anos únicos
        const anosUnicos = new Set();

        // 1. Obter anos dos resultados de simulação
        if (window.resultadosSimulacao && window.resultadosSimulacao.projecaoTemporal) {
            // Adicionar anos da projeção temporal
            const anoInicial = parseInt(window.resultadosSimulacao.projecaoTemporal.parametros?.anoInicial, 10) || 2026;
            const anoFinal = parseInt(window.resultadosSimulacao.projecaoTemporal.parametros?.anoFinal, 10) || 2033;

            for (let ano = anoInicial; ano <= anoFinal; ano++) {
                anosUnicos.add(ano);
            }

            // Adicionar anos que tenham resultados específicos
            if (window.resultadosSimulacao.projecaoTemporal.resultadosAnuais) {
                Object.keys(window.resultadosSimulacao.projecaoTemporal.resultadosAnuais)
                    .forEach(ano => anosUnicos.add(parseInt(ano, 10)));
            }
        }

        // 2. Obter anos dos parâmetros de simulação do repositório
        if (window.SimuladorRepository && typeof window.SimuladorRepository.obterSecao === 'function') {
            const parametrosSimulacao = window.SimuladorRepository.obterSecao('parametrosSimulacao');
            if (parametrosSimulacao && parametrosSimulacao.dataInicial && parametrosSimulacao.dataFinal) {
                const anoInicial = parseInt(parametrosSimulacao.dataInicial.split('-')[0], 10) || 2026;
                const anoFinal = parseInt(parametrosSimulacao.dataFinal.split('-')[0], 10) || 2033;

                for (let ano = anoInicial; ano <= anoFinal; ano++) {
                    anosUnicos.add(ano);
                }
            }
        }

        // 3. Obter anos do histórico de cálculos
        if (window.SimuladorRepository && typeof window.SimuladorRepository.obterHistoricoCalculos === 'function') {
            const historicoCalculos = window.SimuladorRepository.obterHistoricoCalculos();

            if (historicoCalculos && historicoCalculos.length > 0) {
                historicoCalculos.forEach(registro => {
                    // Extrair ano do registro
                    const ano = parseInt(registro.year?.split('-')[0], 10) || 
                               parseInt(registro.inputs?.parametrosSimulacao?.dataInicial?.split('-')[0], 10);

                    if (!isNaN(ano)) {
                        anosUnicos.add(ano);
                    }
                });
            }
        }

        // 4. Se ainda não temos anos, utilizar o período padrão da transição
        if (anosUnicos.size === 0) {
            for (let ano = 2026; ano <= 2033; ano++) {
                anosUnicos.add(ano);
            }
        }

        // Ordenar os anos
        const anosOrdenados = Array.from(anosUnicos).sort((a, b) => a - b);

        // Atualizar o dropdown
        const selectAno = document.getElementById('select-ano-memoria');
        if (selectAno) {
            // Salvar valor atual (se existir)
            const valorAtual = selectAno.value;

            // Limpar opções existentes
            selectAno.innerHTML = '';

            // Adicionar opções para cada ano
            anosOrdenados.forEach(ano => {
                const option = document.createElement('option');
                option.value = ano;

                // Adicionar indicação de percentual de implementação para anos da transição
                const percentualImplementacao = this.obterPercentualImplementacao(ano);
                const textoPorcentagem = percentualImplementacao ? ` (${percentualImplementacao}%)` : '';

                option.textContent = `${ano}${textoPorcentagem}`;
                selectAno.appendChild(option);
            });

            // Tentar restaurar o valor anterior
            if (valorAtual && anosOrdenados.includes(parseInt(valorAtual, 10))) {
                selectAno.value = valorAtual;
            } else if (interfaceState.anoSelecionado && anosOrdenados.includes(parseInt(interfaceState.anoSelecionado, 10))) {
                // Usar valor do estado da interface
                selectAno.value = interfaceState.anoSelecionado;
            } else {
                // Selecionar o primeiro ano
                interfaceState.anoSelecionado = anosOrdenados[0];
            }

            // Exibir memória para o ano selecionado
            this.exibirMemoriaCalculo(selectAno.value);
        }
    },

    /**
     * Obtém o percentual de implementação do Split Payment para um determinado ano
     * @param {number} ano - Ano para o qual se deseja o percentual
     * @returns {number} Percentual de implementação
     */
    obterPercentualImplementacao: function(ano) {
        // Percentuais padrão do cronograma de implementação
        const percentuaisPadrao = {
            2026: 10,
            2027: 25,
            2028: 40,
            2029: 55,
            2030: 70,
            2031: 85,
            2032: 95,
            2033: 100
        };

        // Tentar obter do repositório
        if (window.SimuladorRepository && typeof window.SimuladorRepository.obterSecao === 'function') {
            const cronograma = window.SimuladorRepository.obterSecao('cronogramaImplementacao');
            if (cronograma && ano in cronograma) {
                // Converter para percentual inteiro (0-100)
                const percentual = cronograma[ano];
                return percentual <= 1 ? Math.round(percentual * 100) : Math.round(percentual);
            }
        }

        // Valor padrão
        return percentuaisPadrao[ano] || null;
    },
    
    /**
     * Exibe a memória de cálculo para o ano selecionado
     * Formata e apresenta os dados de acordo com os filtros selecionados
     * @param {string|number} ano - Ano para o qual exibir a memória de cálculo
     */
    exibirMemoriaCalculo(ano) {
        try {
            // Atualizar o ano selecionado no estado da interface
            interfaceState.anoSelecionado = ano;
            console.log(`Exibindo memória de cálculo para o ano: ${ano}`);

            // Verificar se há uma simulação realizada
            if (!this.verificarSimulacaoRealizada()) {
                document.getElementById('memoria-calculo').innerHTML = 
                    '<p class="text-muted">Realize uma simulação para gerar a memória de cálculo detalhada.</p>';

                // Limpar área de resultados estruturados
                const divResultadosEstruturados = document.getElementById('resultados-estruturados');
                if (divResultadosEstruturados) {
                    divResultadosEstruturados.innerHTML = '';
                }

                return;
            }

            // Obter dados da memória de cálculo com log de diagnóstico
            console.log(`Obtendo dados da memória de cálculo para o ano ${ano}...`);
            const dadosMemoria = this.obterDadosMemoriaCalculo(ano);

            if (!dadosMemoria) {
                console.warn(`Não foram encontrados dados para o ano ${ano}`);
                document.getElementById('memoria-calculo').innerHTML = 
                    `<p class="text-muted">Dados não disponíveis para o ano ${ano}.</p>`;
                return;
            }

            console.log(`Dados obtidos para o ano ${ano}:`, dadosMemoria);

            // Aplicar filtros selecionados
            const filtroSistema = document.getElementById('filtro-sistema')?.value || 'todos';
            const filtroOrigem = document.getElementById('filtro-origem')?.value || 'todos';
            const filtroDetalhamento = document.getElementById('filtro-detalhamento')?.value || 'normal';

            console.log(`Aplicando filtros: sistema=${filtroSistema}, origem=${filtroOrigem}, detalhamento=${filtroDetalhamento}`);

            const dadosFiltrados = this.aplicarFiltrosNaMemoriaCalculo(
                dadosMemoria, 
                filtroSistema, 
                filtroOrigem, 
                filtroDetalhamento
            );

            if (!dadosFiltrados) {
                console.warn("Falha ao aplicar filtros aos dados");
                document.getElementById('memoria-calculo').innerHTML = 
                    '<p class="text-danger">Erro ao processar dados da memória de cálculo.</p>';
                return;
            }

            console.log("Dados após aplicação de filtros:", dadosFiltrados);

            // Atualizar a memória de cálculo textual
            this.atualizarMemoriaCalculoTextual(dadosFiltrados, ano);

            // Atualizar a visualização estruturada
            this.atualizarVisualizacaoEstruturada(dadosFiltrados, ano);

            // Atualizar os filtros com base nos dados disponíveis
            this.atualizarDisponibilidadeFiltros(dadosMemoria);

            // Salvar o estado da interface
            this.salvarEstadoInterface();

            console.log(`Memória de cálculo exibida com sucesso para o ano ${ano}`);
        } catch (error) {
            console.error('Erro ao exibir memória de cálculo:', error);
            document.getElementById('memoria-calculo').innerHTML = 
                `<p class="text-danger">Erro ao gerar memória de cálculo: ${error.message}</p>`;
        }
    },

    /**
     * Atualiza a área de memória de cálculo textual com dados formatados
     * @param {Object} dados - Dados da memória de cálculo
     * @param {string|number} ano - Ano de referência
     */
    atualizarMemoriaCalculoTextual(dados, ano) {
        const containerMemoria = document.getElementById('memoria-calculo');
        if (!containerMemoria) {
            console.error("Elemento #memoria-calculo não encontrado");
            return;
        }

        // Se não há dados, mostrar mensagem
        if (!dados) {
            containerMemoria.innerHTML = '<p class="text-muted">Dados não disponíveis para o ano selecionado.</p>';
            return;
        }

        // Funções auxiliares para formatação de valores
        const formatarMoeda = (valor) => {
            if (valor === undefined || valor === null || isNaN(valor)) return 'N/A';

            if (window.DataManager && typeof window.DataManager.formatarMoeda === 'function') {
                return window.DataManager.formatarMoeda(valor);
            } else if (window.CalculationCore && typeof window.CalculationCore.formatarMoeda === 'function') {
                return window.CalculationCore.formatarMoeda(valor);
            } else {
                return valor ? new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                }).format(valor) : 'R$ 0,00';
            }
        };

        const formatarPercentual = (valor) => {
            if (typeof valor !== 'number' || isNaN(valor)) return 'N/A';

            // Se for um valor muito pequeno, tratar como zero
            if (Math.abs(valor) < 0.0001) return '0,00%';

            // Determinar se o valor já está em formato percentual (>1) ou decimal (<1)
            const valorNormalizado = Math.abs(valor) < 1 ? valor * 100 : valor;

            // Formatar usando o DataManager se disponível
            if (window.DataManager && typeof window.DataManager.formatarPercentual === 'function') {
                return window.DataManager.formatarPercentual(valorNormalizado);
            } else {
                // Formatar com duas casas decimais e substituir ponto por vírgula (formato BR)
                return `${valorNormalizado.toFixed(2).replace('.', ',')}%`;
            }
        };

        // Construir conteúdo HTML para a memória de cálculo
        let conteudo = `
            <div class="memory-section">
                <h3>1. Dados de Entrada</h3>
                <div class="memory-content">
                    <p><strong>Empresa:</strong> ${dados.dadosEntrada?.empresa?.nome || 'N/A'}</p>
                    <p><strong>Faturamento:</strong> ${formatarMoeda(dados.dadosEntrada?.empresa?.faturamento)}</p>
                    <p><strong>Margem Operacional:</strong> ${formatarPercentual(dados.dadosEntrada?.empresa?.margem)}</p>
                    <p><strong>Ciclo Financeiro:</strong> PMR = ${dados.dadosEntrada?.cicloFinanceiro?.pmr || 'N/A'}, 
                       PMP = ${dados.dadosEntrada?.cicloFinanceiro?.pmp || 'N/A'}, 
                       PME = ${dados.dadosEntrada?.cicloFinanceiro?.pme || 'N/A'}</p>
                    <p><strong>Distribuição de Vendas:</strong> À Vista = ${formatarPercentual(dados.dadosEntrada?.cicloFinanceiro?.percVista)}, 
                       A Prazo = ${formatarPercentual(dados.dadosEntrada?.cicloFinanceiro?.percPrazo)}</p>
                    <p><strong>Alíquota Efetiva:</strong> ${formatarPercentual(dados.dadosEntrada?.parametrosFiscais?.aliquota)}</p>
                </div>
            </div>

            <div class="memory-section">
                <h3>2. Cálculo do Impacto Base</h3>
                <div class="memory-content">
                    <p><strong>Diferença no Capital de Giro:</strong> ${formatarMoeda(dados.impactos?.capital?.diferencaCapitalGiro)}</p>
                    <p><strong>Percentual de Impacto:</strong> ${formatarPercentual(dados.impactos?.capital?.percentualImpacto)}</p>
                    <p><strong>Impacto em Dias de Faturamento:</strong> ${dados.impactos?.capital?.impactoDiasFaturamento ? 
                       dados.impactos?.capital?.impactoDiasFaturamento.toFixed(1) + ' dias' : 'N/A'}</p>
                    <p><strong>Necessidade Adicional de Capital:</strong> ${formatarMoeda(dados.impactos?.capital?.necessidadeAdicionalCapitalGiro)}</p>
                </div>
            </div>

            <div class="memory-section">
                <h3>3. Comparação de Sistemas Tributários</h3>
                <div class="memory-content">
                    <div class="comparison-table">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Sistema</th>
                                    <th>Capital de Giro Disponível</th>
                                    <th>Valor de Impostos</th>
                                    <th>Diferença Capital</th>
                                </tr>
                            </thead>
                            <tbody>`;

        // Adicionar linha para sistema atual se disponível
        if (dados.sistemasTributarios.atual && dados.sistemasTributarios.atual.detalhes) {
            conteudo += `
                <tr>
                    <td>${dados.sistemasTributarios.atual.detalhes.descricao || 'Sistema Atual'}</td>
                    <td>${formatarMoeda(dados.sistemasTributarios.atual.detalhes.capitalGiroDisponivel)}</td>
                    <td>${formatarMoeda(dados.sistemasTributarios.atual.detalhes.impostos?.total || 
                                       dados.sistemasTributarios.atual.detalhes.valorImpostoTotal || 0)}</td>
                    <td>Referência</td>
                </tr>`;
        }

        // Adicionar linha para IVA com Split Payment se disponível
        if (dados.sistemasTributarios.ivaSplit && dados.sistemasTributarios.ivaSplit.detalhes) {
            conteudo += `
                <tr>
                    <td>${dados.sistemasTributarios.ivaSplit.detalhes.descricao || 'IVA com Split Payment'}</td>
                    <td>${formatarMoeda(dados.sistemasTributarios.ivaSplit.detalhes.capitalGiroDisponivel)}</td>
                    <td>${formatarMoeda(dados.sistemasTributarios.ivaSplit.detalhes.impostos?.total || 
                                       dados.sistemasTributarios.ivaSplit.detalhes.valorImpostoTotal || 0)}</td>
                    <td>${formatarMoeda(dados.impactos?.capital?.diferencaCapitalGiro || 0)}</td>
                </tr>`;
        }

        // Adicionar linha para IVA sem Split Payment se disponível
        if (dados.sistemasTributarios.ivaSemSplit && dados.sistemasTributarios.ivaSemSplit.detalhes) {
            conteudo += `
                <tr>
                    <td>${dados.sistemasTributarios.ivaSemSplit.detalhes.descricao || 'IVA sem Split Payment'}</td>
                    <td>${formatarMoeda(dados.sistemasTributarios.ivaSemSplit.detalhes.capitalGiroDisponivel)}</td>
                    <td>${formatarMoeda(dados.sistemasTributarios.ivaSemSplit.detalhes.impostos?.total || 
                                       dados.sistemasTributarios.ivaSemSplit.detalhes.valorImpostoTotal || 0)}</td>
                    <td>${formatarMoeda(dados.impactos?.capital?.diferencaCapitalGiroIVASemSplit || 0)}</td>
                </tr>`;
        }

        conteudo += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;

        // Adicionar seção de projeção temporal se disponível
        if (dados.projecaoTemporal && 
            (dados.projecaoTemporal.parametros || dados.projecaoTemporal.impactoAcumulado)) {

            conteudo += `
                <div class="memory-section">
                    <h3>4. Projeção Temporal</h3>
                    <div class="memory-content">
                        <p><strong>Cenário:</strong> ${dados.projecaoTemporal?.parametros?.cenarioTaxaCrescimento || 'N/A'}</p>
                        <p><strong>Taxa de Crescimento:</strong> ${formatarPercentual(dados.projecaoTemporal?.parametros?.taxaCrescimento)}</p>
                        <p><strong>Período:</strong> ${dados.projecaoTemporal?.parametros?.anoInicial || ''} a ${dados.projecaoTemporal?.parametros?.anoFinal || ''}</p>
                        <p><strong>Necessidade Total de Capital de Giro:</strong> ${formatarMoeda(dados.projecaoTemporal?.impactoAcumulado?.totalNecessidadeCapitalGiro)}</p>
                        <p><strong>Custo Financeiro Total:</strong> ${formatarMoeda(dados.projecaoTemporal?.impactoAcumulado?.custoFinanceiroTotal)}</p>
                    </div>
                </div>`;
        }

        // Adicionar memória crítica se disponível e filtro permitir
        if (dados.memoriaCritica) {
            conteudo += `
                <div class="memory-section">
                    <h3>5. Memória Crítica de Cálculo</h3>
                    <div class="memory-content">
                        <p><strong>Fórmula:</strong> ${dados.memoriaCritica?.formula || 'Não disponível'}</p>`;

            // Incluir passo a passo se disponível
            if (dados.memoriaCritica?.passoAPasso && dados.memoriaCritica.passoAPasso.length > 0) {
                conteudo += `
                        <div class="steps-container">
                            <p><strong>Passo a Passo:</strong></p>
                            <ol>
                                ${dados.memoriaCritica.passoAPasso.map(passo => `<li>${passo}</li>`).join('')}
                            </ol>
                        </div>`;
            }

            // Incluir observações se disponíveis
            if (dados.memoriaCritica?.observacoes && dados.memoriaCritica.observacoes.length > 0) {
                conteudo += `
                        <div class="observations-container">
                            <p><strong>Observações:</strong></p>
                            <ul>
                                ${dados.memoriaCritica.observacoes.map(obs => `<li>${obs}</li>`).join('')}
                            </ul>
                        </div>`;
            }

            conteudo += `
                    </div>
                </div>`;
        }

        // Seção de estratégias se disponível
        if (dados.origens.estrategias && 
            dados.origens.estrategias.calculos && 
            dados.origens.estrategias.calculos.length > 0) {

            conteudo += `
                <div class="memory-section">
                    <h3>6. Estratégias de Mitigação</h3>
                    <div class="memory-content">
                        <p><strong>Efetividade Combinada:</strong> ${formatarPercentual(dados.origens.estrategias.resultados?.efetividadeTotal)}</p>
                        <p><strong>Valor Total Mitigado:</strong> ${formatarMoeda(dados.origens.estrategias.resultados?.mitigacaoTotal)}</p>
                        <p><strong>Custo Total de Implementação:</strong> ${formatarMoeda(dados.origens.estrategias.resultados?.custoTotal)}</p>

                        <div class="strategies-table">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Estratégia</th>
                                        <th>Efetividade</th>
                                        <th>Valor Mitigado</th>
                                        <th>Custo</th>
                                    </tr>
                                </thead>
                                <tbody>`;

            // Adicionar linha para cada estratégia
            dados.origens.estrategias.calculos.forEach(estrategia => {
                conteudo += `
                                    <tr>
                                        <td>${estrategia.descricao}</td>
                                        <td>${formatarPercentual(estrategia.efetividade)}</td>
                                        <td>${formatarMoeda(estrategia.valorMitigado)}</td>
                                        <td>${formatarMoeda(estrategia.custoImplementacao)}</td>
                                    </tr>`;
            });

            conteudo += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>`;
        }

        // Inserir o conteúdo na página
        containerMemoria.innerHTML = conteudo;

        console.log("Memória de cálculo atualizada para o ano:", ano);
    },

    /**
     * Atualiza a visualização estruturada dos dados da memória de cálculo
     * @param {Object} dados - Dados da memória de cálculo
     * @param {string|number} ano - Ano de referência
     */
    atualizarVisualizacaoEstruturada(dados, ano) {
        const divResultados = document.getElementById('resultados-estruturados');
        if (!divResultados) {
            console.error("Elemento #resultados-estruturados não encontrado");
            return;
        }

        // Se não há dados, limpar a visualização
        if (!dados) {
            divResultados.innerHTML = '';
            return;
        }

        // Formatar valores para exibição
        const formatarMoeda = valor => {
            if (typeof valor !== 'number' || isNaN(valor)) return 'N/A';

            if (window.DataManager && typeof window.DataManager.formatarMoeda === 'function') {
                return window.DataManager.formatarMoeda(valor);
            } else if (window.CalculationCore && typeof window.CalculationCore.formatarMoeda === 'function') {
                return window.CalculationCore.formatarMoeda(valor);
            } else {
                return valor ? new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                }).format(valor) : 'R$ 0,00';
            }
        };

        const formatarPercentual = valor => {
            if (typeof valor !== 'number' || isNaN(valor)) return 'N/A';

            // Se for um valor muito pequeno, tratar como zero
            if (Math.abs(valor) < 0.0001) return '0,00%';

            // Determinar se o valor já está em formato percentual (>1) ou decimal (<1)
            const valorNormalizado = Math.abs(valor) < 1 ? valor * 100 : valor;

            return `${valorNormalizado.toFixed(2).replace('.', ',')}%`;
        };

        // Construir visualização estruturada com cards
        let html = '<div class="resultados-grid">';

        // Card para impacto no capital de giro (destaque)
        const diferencaCapitalGiro = dados.impactos?.capital?.diferencaCapitalGiro || 0;
        const classeDiferenca = diferencaCapitalGiro < 0 ? 'negative' : 'positive';

        html += `
            <div class="result-card highlight-card">
                <h4>Impacto no Capital de Giro - ${ano}</h4>
                <div class="value-display ${classeDiferenca}">
                    ${formatarMoeda(diferencaCapitalGiro)}
                </div>
                <div class="metadata">
                    <div class="metadata-item">
                        <span class="label">Percentual:</span>
                        <span class="value">${formatarPercentual(dados.impactos?.capital?.percentualImpacto || 0)}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">Dias de Faturamento:</span>
                        <span class="value">${(dados.impactos?.capital?.impactoDiasFaturamento || 0).toFixed(1)} dias</span>
                    </div>
                </div>
            </div>`;

        // Card para necessidade adicional de capital
        html += `
            <div class="result-card">
                <h4>Necessidade Adicional de Capital</h4>
                <div class="value-display ${classeDiferenca}">
                    ${formatarMoeda(dados.impactos?.capital?.necessidadeAdicionalCapitalGiro || 0)}
                </div>
                <div class="metadata">
                    <div class="metadata-item">
                        <span class="label">Custo Financeiro:</span>
                        <span class="value">${formatarMoeda(dados.projecaoTemporal?.impactoAcumulado?.custoFinanceiroTotal || 0)}</span>
                    </div>
                </div>
            </div>`;

        // Card para comparação de sistemas (se disponível)
        if (Object.keys(dados.sistemasTributarios).length > 0) {
            html += `
                <div class="result-card wide-card">
                    <h4>Sistemas Tributários - ${ano}</h4>
                    <div class="comparison-grid">`;

            // Adicionar cada sistema disponível
            Object.entries(dados.sistemasTributarios).forEach(([sistema, info]) => {
                const nomeSistema = sistema === 'atual' ? 'Sistema Atual' : 
                                   sistema === 'ivaSplit' ? 'IVA com Split' : 'IVA sem Split';

                const capitalGiro = info.detalhes?.capitalGiroDisponivel || 0;
                const impostos = info.detalhes?.impostos?.total || info.detalhes?.valorImpostoTotal || 0;

                html += `
                    <div class="system-item">
                        <div class="system-name">${nomeSistema}</div>
                        <div class="system-value">${formatarMoeda(capitalGiro)}</div>
                        <div class="system-label">Capital de Giro</div>
                        <div class="system-value">${formatarMoeda(impostos)}</div>
                        <div class="system-label">Impostos</div>
                    </div>`;
            });

            html += `
                    </div>
                </div>`;
        }

        // Fechar grid
        html += '</div>';

        // Inserir na página
        divResultados.innerHTML = html;

        // Adicionar estilos específicos para esta visualização
        const style = document.createElement('style');
        style.textContent = `
            .resultados-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .wide-card {
                grid-column: 1 / -1;
            }

            .comparison-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }

            .system-item {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                text-align: center;
            }

            .system-name {
                font-weight: bold;
                margin-bottom: 10px;
                font-size: 16px;
            }

            .system-value {
                font-size: 18px;
                font-weight: bold;
                margin: 5px 0;
            }

            .system-label {
                font-size: 12px;
                color: #666;
                margin-bottom: 10px;
            }
        `;

        // Adicionar apenas se ainda não existir
        if (!document.querySelector('style[data-id="resultados-estruturados"]')) {
            style.setAttribute('data-id', 'resultados-estruturados');
            document.head.appendChild(style);
        }
    },

    /**
     * Atualiza a disponibilidade de filtros com base nos dados disponíveis
     * @param {Object} dados - Dados da memória de cálculo
     */
    atualizarDisponibilidadeFiltros: function(dados) {
        // Filtro de sistema tributário
        const filtroSistema = document.getElementById('filtro-sistema');
        if (filtroSistema) {
            // Verificar quais sistemas estão disponíveis
            const sistemasDisponiveis = {
                atual: !!dados?.sistemasTributarios?.atual?.detalhes?.capitalGiroDisponivel,
                ivaSplit: !!dados?.sistemasTributarios?.ivaSplit?.detalhes?.capitalGiroDisponivel,
                ivaSemSplit: !!dados?.sistemasTributarios?.ivaSemSplit?.detalhes?.capitalGiroDisponivel
            };

            // Atualizar disponibilidade das opções
            Array.from(filtroSistema.options).forEach(option => {
                if (option.value === 'todos') return; // Sempre manter "Todos"

                if (!sistemasDisponiveis[option.value]) {
                    option.disabled = true;
                } else {
                    option.disabled = false;
                }
            });
        }

        // Filtro de origem dos cálculos
        const filtroOrigem = document.getElementById('filtro-origem');
        if (filtroOrigem) {
            // Verificar quais origens estão disponíveis
            const origensDisponiveis = {
                simulacao: Object.keys(dados?.origens?.simulacao || {}).length > 0,
                estrategias: !!(dados?.origens?.estrategias?.calculos?.length > 0)
            };

            // Atualizar disponibilidade das opções
            Array.from(filtroOrigem.options).forEach(option => {
                if (option.value === 'todos') return; // Sempre manter "Todos"

                if (!origensDisponiveis[option.value]) {
                    option.disabled = true;
                } else {
                    option.disabled = false;
                }
            });
        }
    },

    /**
     * Mostra painel de feedback ou informações detalhadas
     * Método para uso futuro com recursos avançados
     */
    mostrarPainelFeedback: function() {
        alert('Funcionalidade de feedback ainda não implementada.');
    },
    
    /**
     * Função auxiliar para diagnóstico da estrutura de dados
     * Exibe no console a estrutura completa dos dados da memória de cálculo
     * @param {Object} dados - Objeto com dados da memória de cálculo
     * @param {string} contexto - Contexto da exibição (identificador para o log)
     */
    logEstruturaDados(dados, contexto = 'Diagnóstico') {
        console.group(`[${contexto}] Estrutura de Dados da Memória de Cálculo`);

        // Verificar se há dados
        if (!dados) {
            console.warn('Não há dados disponíveis');
            console.groupEnd();
            return;
        }

        // Verificar formato dos dados
        console.log('Formato dos dados:', 
                    dados.empresa !== undefined ? 'Aninhado' : 
                    dados.sistemasTributarios !== undefined ? 'Estruturado' : 'Desconhecido');

        // Listar seções disponíveis
        console.log('Seções disponíveis:', Object.keys(dados));

        // Verificar sistemas tributários
        if (dados.sistemasTributarios) {
            console.group('Sistemas Tributários');
            console.log('Sistemas disponíveis:', Object.keys(dados.sistemasTributarios));

            // Verificar cada sistema
            Object.entries(dados.sistemasTributarios).forEach(([sistema, info]) => {
                console.group(`Sistema: ${sistema}`);
                console.log('Detalhes disponíveis:', Object.keys(info.detalhes || {}));

                // Verificar valores críticos
                if (info.detalhes) {
                    console.log('Capital de Giro:', info.detalhes.capitalGiroDisponivel);
                    console.log('Impostos:', info.detalhes.impostos?.total || info.detalhes.valorImpostoTotal);
                }

                console.groupEnd();
            });

            console.groupEnd();
        }

        // Verificar impactos
        if (dados.impactos) {
            console.group('Impactos');
            console.log('Tipos de impacto:', Object.keys(dados.impactos));

            // Verificar impacto no capital
            if (dados.impactos.capital) {
                console.group('Capital');
                console.log('Diferença Capital Giro:', dados.impactos.capital.diferencaCapitalGiro);
                console.log('Percentual Impacto:', dados.impactos.capital.percentualImpacto);
                console.log('Impacto Dias Faturamento:', dados.impactos.capital.impactoDiasFaturamento);
                console.groupEnd();
            }

            console.groupEnd();
        }

        // Verificar memória crítica
        if (dados.memoriaCritica) {
            console.group('Memória Crítica');
            console.log('Componentes:', Object.keys(dados.memoriaCritica));
            console.log('Fórmula:', dados.memoriaCritica.formula);
            console.log('Passos:', (dados.memoriaCritica.passoAPasso || []).length);
            console.log('Observações:', (dados.memoriaCritica.observacoes || []).length);
            console.groupEnd();
        }

        console.groupEnd();
    }
};

// Adicionar CSS específico para a aba de memória de cálculo
document.addEventListener('DOMContentLoaded', function() {
    // Criar elemento de estilo
    const style = document.createElement('style');
    style.textContent = `
        /* Estilos para a Memória de Cálculo */
        #memoria-calculo {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
        }
        
        .memory-section {
            margin-bottom: 25px;
            border-bottom: 1px solid #eee;
            padding-bottom: 15px;
        }
        
        .memory-section h3 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #0056b3;
            font-size: 1.4em;
        }
        
        .memory-content {
            padding-left: 15px;
        }
        
        .memory-content p {
            margin: 8px 0;
        }
        
        .comparison-table, .strategies-table {
            margin: 15px 0;
            width: 100%;
            border-collapse: collapse;
        }
        
        .comparison-table th, .strategies-table th {
            background-color: #f5f5f5;
            padding: 10px;
            text-align: left;
            border-bottom: 2px solid #ddd;
        }
        
        .comparison-table td, .strategies-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #ddd;
        }
        
        .steps-container, .observations-container {
            margin-top: 15px;
        }
        
        .steps-container ol, .observations-container ul {
            margin-top: 5px;
            padding-left: 25px;
        }
        
        .steps-container li, .observations-container li {
            margin-bottom: 5px;
        }
        
        /* Estilos para filtros */
        .filtros-container {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
            border: 1px solid #dee2e6;
        }
        
        .filtros-container select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ced4da;
            border-radius: 4px;
        }
        
        /* Estilos para resultados estruturados */
        .resultados-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .result-card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            padding: 20px;
        }
        
        .highlight-card {
            border-left: 5px solid #0056b3;
        }
        
        .value-display {
            font-size: 24px;
            font-weight: bold;
            margin: 15px 0;
            text-align: center;
        }
        
        .value-display.negative {
            color: #dc3545;
        }
        
        .value-display.positive {
            color: #28a745;
        }
        
        .metadata {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
        }
        
        .metadata-item {
            display: flex;
            flex-direction: column;
        }
        
        .metadata-item .label {
            font-size: 12px;
            color: #6c757d;
        }
        
        .metadata-item .value {
            font-weight: bold;
        }
    `;
    
    // Adicionar ao head do documento
    document.head.appendChild(style);
});

// Inicialização automática quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar apenas quando a aba estiver ativa
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            if (this.getAttribute('data-tab') === 'memoria') {
                MemoriaCalculoController.inicializar();
            }
        });
    });
    
    // Se a aba de memória já estiver ativa, inicializar o controlador
    if (document.querySelector('.tab-button[data-tab="memoria"].active')) {
        MemoriaCalculoController.inicializar();
    }
});