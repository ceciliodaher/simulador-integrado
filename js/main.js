// Verificação imediata
console.log('main.js carregado, SimuladorFluxoCaixa disponível?', !!window.SimuladorFluxoCaixa);
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, SimuladorFluxoCaixa disponível?', !!window.SimuladorFluxoCaixa);
});

document.addEventListener('DOMContentLoaded', function() {
    // Resetar repositório antes de qualquer operação
    if (window.SimuladorRepository) {
        SimuladorRepository.inicializar(); // Usa o método público existente
        SimuladorRepository.atualizarSecao('empresa', { faturamento: 0 }); // [3][4]
    }
});


function inicializarModulos() {
    console.log('Inicializando módulos do sistema...');
    
    // Verificar se o CalculationCore está disponível
    if (!window.CalculationCore) {
        console.warn('CalculationCore não encontrado. Algumas funcionalidades podem estar limitadas.');
    }

    // Verificar se o DataManager está disponível
    if (!window.DataManager) {
        console.error('DataManager não encontrado. O simulador pode não funcionar corretamente.');
    } else {
        console.log('DataManager disponível. Modo debug:', window.location.search.includes('debug=true'));
    }

    console.log('Módulos inicializados com sucesso');
    return true;
}

// Chamar no carregamento da página
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar módulos básicos na ordem correta
    inicializarModulos();
    
    // Inicializar repository com integração ao DataManager
    inicializarRepository();
    
    // Inicializar simulador
    if (window.SimuladorFluxoCaixa && typeof window.SimuladorFluxoCaixa.init === 'function') {
        window.SimuladorFluxoCaixa.init();
    }
    
    // Inicializar gerenciador de setores (após repository para carregar dados persistidos)
    if (typeof SetoresManager !== 'undefined') {
        SetoresManager.inicializar();
        
        // Preencher dropdown de setores na aba de simulação
        SetoresManager.preencherDropdownSetores('setor');
    }
    
    // Inicializar UI components
    const uiComponents = [
        { name: 'TabsManager', method: 'inicializar' },
        { name: 'FormsManager', method: 'inicializar' },
        { name: 'ModalManager', method: 'inicializar' }
    ];
    
    uiComponents.forEach(component => {
        if (typeof window[component.name] !== 'undefined') {
            window[component.name][component.method]();
            console.log(`${component.name} inicializado`);
        } else {
            console.warn(`${component.name} não encontrado`);
        }
    });
    
    // Inicializar eventos principais
    inicializarEventosPrincipais();
    
    // Configurar observadores
    observarMudancasDeAba();
    observarCamposCriticos();
    
    // Inicializar campos específicos com base na estrutura canônica do DataManager
    const dadosPadrao = window.DataManager.obterEstruturaAninhadaPadrao();
    
    // Aplicar valores padrão aos campos se não tiverem sido carregados do repository
    atualizarCamposComDadosPadrao(dadosPadrao);
    
    // Inicializar campos específicos
    ajustarCamposTributarios();
    ajustarCamposOperacao();
    calcularCreditosTributarios();
    
    // Inicializar formatação de moeda
    if (window.CurrencyFormatter && typeof window.CurrencyFormatter.inicializar === 'function') {
        window.CurrencyFormatter.inicializar();
    }
    
    console.log('Inicialização completa com arquitetura de dados padronizada');
});

/**
 * Atualiza os campos da interface com os valores padrão da estrutura canônica
 * @param {Object} dadosPadrao - Estrutura canônica com valores padrão
 */
function atualizarCamposComDadosPadrao(dadosPadrao) {
    // Mapear os campos principais da interface com suas seções e propriedades na estrutura canônica
    const mapeamentoCampos = [
        { id: 'faturamento', secao: 'empresa', prop: 'faturamento', tipo: 'monetario' },
        { id: 'margem', secao: 'empresa', prop: 'margem', tipo: 'percentual' },
        { id: 'pmr', secao: 'cicloFinanceiro', prop: 'pmr', tipo: 'numero' },
        { id: 'pmp', secao: 'cicloFinanceiro', prop: 'pmp', tipo: 'numero' },
        { id: 'pme', secao: 'cicloFinanceiro', prop: 'pme', tipo: 'numero' },
        { id: 'perc-vista', secao: 'cicloFinanceiro', prop: 'percVista', tipo: 'percentual' }
        // Adicionar outros campos conforme necessário
    ];
    
    mapeamentoCampos.forEach(campo => {
        const elemento = document.getElementById(campo.id);
        if (!elemento) return;
        
        // Obter valor padrão da estrutura canônica
        const valorPadrao = dadosPadrao[campo.secao]?.[campo.prop];
        if (valorPadrao === undefined) return;
        
        // Não sobrescrever valores já existentes
        if (elemento.value && elemento.value !== '0' && elemento.value !== '0,00' && elemento.value !== 'R$ 0,00') {
            return;
        }
        
        // Formatar o valor de acordo com o tipo
        switch (campo.tipo) {
            case 'monetario':
                elemento.value = window.DataManager.formatarMoeda(valorPadrao);
                break;
            case 'percentual':
                elemento.value = valorPadrao <= 1 ? (valorPadrao * 100).toFixed(2) : valorPadrao.toFixed(2);
                break;
            case 'numero':
                elemento.value = valorPadrao.toString();
                break;
            default:
                elemento.value = valorPadrao;
        }
        
        // Salvar o valor normalizado no dataset
        elemento.dataset.valorNormalizado = valorPadrao;
    });
    
    // Inicializar campos tributários e de operação após atualizar valores
    ajustarCamposTributarios();
    ajustarCamposOperacao();
    calcularCreditosTributarios();
}

/**
 * Inicializa eventos específicos da página principal
 */
function inicializarEventosPrincipais() {
    console.log('Inicializando eventos principais');
    
    // Evento para o botão Simular
    const btnSimular = document.getElementById('btn-simular');
    if (btnSimular) {
        btnSimular.addEventListener('click', function() {
            console.log('Botão Simular clicado');

            try {
                // Verificar se o simulador está disponível
                if (!window.SimuladorFluxoCaixa) {
                    throw new Error('Simulador não inicializado corretamente');
                }

                // Verificar disponibilidade do DataManager (componente obrigatório)
                if (!window.DataManager) {
                    throw new Error('DataManager não disponível. A simulação não pode continuar.');
                }

                // Obter dados usando o DataManager (estrutura aninhada)
                const dadosAninhados = window.DataManager.obterDadosDoFormulario();
                console.log('Dados obtidos do formulário (estrutura aninhada):', dadosAninhados);

                // Se o repositório estiver disponível, atualizar com os novos dados
                if (typeof SimuladorRepository !== 'undefined') {
                    // Atualizar cada seção com os dados validados
                    Object.keys(dadosAninhados).forEach(secao => {
                        if (dadosAninhados[secao]) {
                            SimuladorRepository.atualizarSecao(secao, dadosAninhados[secao]);
                        }
                    });
                    console.log('Repositório atualizado com os dados do formulário');
                }

                // Executar simulação, passando os dados obtidos
                const resultado = window.SimuladorFluxoCaixa.simular(dadosAninhados);

                if (!resultado) {
                    throw new Error('A simulação não retornou resultados');
                }

                // Processar resultados
                atualizarInterface(resultado);

                // Atualizar gráficos se o ChartManager estiver disponível
                if (typeof window.ChartManager !== 'undefined' && typeof window.ChartManager.renderizarGraficos === 'function') {
                    window.ChartManager.renderizarGraficos(resultado);
                } else {
                    console.warn('ChartManager não encontrado ou função renderizarGraficos indisponível');
                }

            } catch (erro) {
                console.error('Erro ao executar simulação:', erro);
                alert('Não foi possível realizar a simulação: ' + erro.message);
            }
        });
    } else {
        console.error('Botão Simular não encontrado no DOM');
    }
    
    // Evento para o botão Limpar
    const btnLimpar = document.getElementById('btn-limpar');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', function() {
            console.log('Botão Limpar clicado');

            try {
                // 1. Limpar localStorage
                if (typeof SimuladorRepository !== 'undefined') {
                    // Opção 1: Remover completamente os dados salvos
                    localStorage.removeItem(SimuladorRepository.STORAGE_KEY);

                    // Opção 2: Restaurar para valores padrão (alternativa à remoção)
                    const dadosPadrao = window.DataManager.obterEstruturaAninhadaPadrao();
                    Object.keys(dadosPadrao).forEach(secao => {
                        SimuladorRepository.atualizarSecao(secao, dadosPadrao[secao]);
                    });

                    console.log('Dados do repositório limpos');
                }

                // 2. Limpar formulários
                const camposFormulario = [
                    'faturamento', 'margem', 'tipo-empresa', 'tipo-operacao', 'regime',
                    'aliquota-simples', 'pmr', 'pmp', 'pme', 'perc-vista',
                    'cenario', 'taxa-crescimento', 'data-inicial', 'data-final'
                ];

                camposFormulario.forEach(id => {
                    const campo = document.getElementById(id);
                    if (campo) {
                        if (campo.type === 'checkbox') {
                            campo.checked = false;
                        } else if (campo.tagName === 'SELECT') {
                            campo.selectedIndex = 0;
                        } else {
                            campo.value = '';
                        }

                        // Disparar evento de mudança para atualizar campos dependentes
                        const event = new Event('change');
                        campo.dispatchEvent(event);
                    }
                });

                // 3. Redefinir valores padrão específicos
                const campoFaturamento = document.getElementById('faturamento');
                if (campoFaturamento) {
                    campoFaturamento.value = 'R$ 0,00';
                    if (campoFaturamento.dataset) campoFaturamento.dataset.rawValue = '0';
                }

                document.getElementById('margem').value = '15';
                document.getElementById('pmr').value = '30';
                document.getElementById('pmp').value = '30';
                document.getElementById('pme').value = '30';
                document.getElementById('perc-vista').value = '30';

                // 4. Atualizar campos de ciclo financeiro e outros dependentes
                const cicloFinanceiro = document.getElementById('ciclo-financeiro');
                if (cicloFinanceiro) cicloFinanceiro.value = '30';

                const percPrazo = document.getElementById('perc-prazo');
                if (percPrazo) percPrazo.value = '70%';

                // 5. Limpar área de resultados
                const divResultadosDetalhados = document.getElementById('resultados-detalhados');
                if (divResultadosDetalhados) {
                    divResultadosDetalhados.style.display = 'none';
                }

                // 6. Limpar gráficos se o ChartManager estiver disponível
                if (typeof window.ChartManager !== 'undefined' && typeof window.ChartManager.limparGraficos === 'function') {
                    window.ChartManager.limparGraficos();
                }

                console.log('Formulários limpos com sucesso');
                alert('Os dados foram limpos. Você pode iniciar uma nova simulação.');

            } catch (erro) {
                console.error('Erro ao limpar formulários:', erro);
                alert('Ocorreu um erro ao limpar os formulários: ' + erro.message);
            }
        });
    } else {
        console.error('Botão Limpar não encontrado no DOM');
    }
    
    // Eventos para exportação
    const btnExportarPDF = document.getElementById('btn-exportar-pdf');
    if (btnExportarPDF) {
        btnExportarPDF.addEventListener('click', function() {
            if (typeof ExportTools !== 'undefined') {
                ExportTools.exportarParaPDF();
            }
        });
    }
    
    const btnExportarExcel = document.getElementById('btn-exportar-excel');
    if (btnExportarExcel) {
        btnExportarExcel.addEventListener('click', function() {
            if (typeof ExportTools !== 'undefined') {
                ExportTools.exportarParaExcel();
            }
        });
    }
    
    const btnExportarMemoria = document.getElementById('btn-exportar-memoria');
    if (btnExportarMemoria) {
        btnExportarMemoria.addEventListener('click', function() {
            if (typeof ExportTools !== 'undefined') {
                ExportTools.exportarMemoriaCalculo();
            }
        });
    }
    
    // Evento para atualização de estratégias ao mudar o ano
    const selectAnoEstrategias = document.getElementById('ano-visualizacao-estrategias');
    if (selectAnoEstrategias) {
        selectAnoEstrategias.addEventListener('change', atualizarVisualizacaoEstrategias);
    }
    
    // Eventos para exportação de estratégias
    const btnExportarEstrategiasPDF = document.getElementById('btn-exportar-estrategias-pdf');
    if (btnExportarEstrategiasPDF) {
        btnExportarEstrategiasPDF.addEventListener('click', function() {
            if (typeof ExportTools !== 'undefined') {
                // Chamar a mesma função da aba Simulação
                ExportTools.exportarParaPDF();
            }
        });
    }

    const btnExportarEstrategiasExcel = document.getElementById('btn-exportar-estrategias-excel');
    if (btnExportarEstrategiasExcel) {
        btnExportarEstrategiasExcel.addEventListener('click', function() {
            if (typeof ExportTools !== 'undefined') {
                // Chamar a mesma função da aba Simulação
                ExportTools.exportarParaExcel();
            }
        });
    }
    
    // Evento para atualização da memória de cálculo
    const btnAtualizarMemoria = document.getElementById('btn-atualizar-memoria');
    if (btnAtualizarMemoria) {
        btnAtualizarMemoria.addEventListener('click', function() {
            atualizarExibicaoMemoriaCalculo();
        });
    }
    
    // Evento para select de anos da memória
    const selectAnoMemoria = document.getElementById('select-ano-memoria');
    if (selectAnoMemoria) {
        selectAnoMemoria.addEventListener('change', function() {
            atualizarExibicaoMemoriaCalculo();
        });
    }
    
    // Função para atualizar exibição da memória de cálculo
    // Adicionar ao main.js
    function atualizarExibicaoMemoriaCalculo() {
        const selectAno = document.getElementById('select-ano-memoria');
        if (!selectAno) return;

        const anoSelecionado = selectAno.value;
        console.log('Atualizando memória para o ano:', anoSelecionado);

        // Verificar se temos dados de memória de cálculo disponíveis
        if (!window.memoriaCalculoSimulacao) {
            const conteudo = '<p class="text-muted">Realize uma simulação para gerar a memória de cálculo detalhada.</p>';
            document.getElementById('memoria-calculo').innerHTML = conteudo;
            return;
        }

        // Extrair dados de memória
        const memoria = window.memoriaCalculoSimulacao;

        // Formatar valores usando o DataManager
        const formatarMoeda = window.DataManager.formatarMoeda;
        const formatarPercentual = valor => {
            return valor ? window.DataManager.formatarPercentual(valor) : 'N/A';
        };

        // Gerar conteúdo HTML para a memória de cálculo
        let conteudo = `
            <div class="memory-section">
                <h3>1. Dados de Entrada</h3>
                <div class="memory-content">
                    <p><strong>Empresa:</strong> ${memoria.dadosEntrada?.empresa?.faturamento ? formatarMoeda(memoria.dadosEntrada.empresa.faturamento) : 'N/A'}</p>
                    <p><strong>Margem:</strong> ${memoria.dadosEntrada?.empresa?.margem ? formatarPercentual(memoria.dadosEntrada.empresa.margem) : 'N/A'}</p>
                    <p><strong>Ciclo Financeiro:</strong> PMR = ${memoria.dadosEntrada?.cicloFinanceiro?.pmr || 'N/A'}, 
                       PMP = ${memoria.dadosEntrada?.cicloFinanceiro?.pmp || 'N/A'}, 
                       PME = ${memoria.dadosEntrada?.cicloFinanceiro?.pme || 'N/A'}</p>
                    <p><strong>Distribuição de Vendas:</strong> À Vista = ${memoria.dadosEntrada?.cicloFinanceiro?.percVista ? formatarPercentual(memoria.dadosEntrada.cicloFinanceiro.percVista) : 'N/A'}, 
                       A Prazo = ${memoria.dadosEntrada?.cicloFinanceiro?.percPrazo ? formatarPercentual(memoria.dadosEntrada.cicloFinanceiro.percPrazo) : 'N/A'}</p>
                    <p><strong>Alíquota:</strong> ${memoria.dadosEntrada?.parametrosFiscais?.aliquota ? formatarPercentual(memoria.dadosEntrada.parametrosFiscais.aliquota) : 'N/A'}</p>
                </div>
            </div>

            <div class="memory-section">
                <h3>2. Cálculo do Impacto Base</h3>
                <div class="memory-content">
                    <p><strong>Diferença no Capital de Giro:</strong> ${memoria.impactoBase?.diferencaCapitalGiro ? formatarMoeda(memoria.impactoBase.diferencaCapitalGiro) : 'N/A'}</p>
                    <p><strong>Percentual de Impacto:</strong> ${memoria.impactoBase?.percentualImpacto ? formatarPercentual(memoria.impactoBase.percentualImpacto/100) : 'N/A'}</p>
                    <p><strong>Impacto em Dias de Faturamento:</strong> ${memoria.impactoBase?.impactoDiasFaturamento ? memoria.impactoBase.impactoDiasFaturamento.toFixed(1) + ' dias' : 'N/A'}</p>
                </div>
            </div>

            <div class="memory-section">
                <h3>3. Projeção Temporal</h3>
                <div class="memory-content">
                    <p><strong>Cenário:</strong> ${memoria.projecaoTemporal?.parametros?.cenarioTaxaCrescimento || 'N/A'}</p>
                    <p><strong>Taxa de Crescimento:</strong> ${memoria.projecaoTemporal?.parametros?.taxaCrescimento ? formatarPercentual(memoria.projecaoTemporal.parametros.taxaCrescimento) : 'N/A'}</p>
                    <p><strong>Necessidade Total de Capital de Giro:</strong> ${memoria.projecaoTemporal?.impactoAcumulado?.totalNecessidadeCapitalGiro ? formatarMoeda(memoria.projecaoTemporal.impactoAcumulado.totalNecessidadeCapitalGiro) : 'N/A'}</p>
                    <p><strong>Custo Financeiro Total:</strong> ${memoria.projecaoTemporal?.impactoAcumulado?.custoFinanceiroTotal ? formatarMoeda(memoria.projecaoTemporal.impactoAcumulado.custoFinanceiroTotal) : 'N/A'}</p>
                </div>
            </div>

            <div class="memory-section">
                <h3>4. Memória Crítica de Cálculo</h3>
                <div class="memory-content">
                    <p><strong>Fórmula:</strong> ${memoria.memoriaCritica?.formula || 'N/A'}</p>
                    <div class="steps-container">
                        <p><strong>Passo a Passo:</strong></p>
                        <ol>
                            ${(memoria.memoriaCritica?.passoAPasso || []).map(passo => `<li>${passo}</li>`).join('')}
                        </ol>
                    </div>
                    <div class="observations-container">
                        <p><strong>Observações:</strong></p>
                        <ul>
                            ${(memoria.memoriaCritica?.observacoes || []).map(obs => `<li>${obs}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;

        // Adicionar o conteúdo à div de memória de cálculo
        document.getElementById('memoria-calculo').innerHTML = conteudo;
    }
    
    // Exportar a função para o escopo global
    window.exibirMemoriaCalculo = atualizarExibicaoMemoriaCalculo;
    
    // Evento para simulação de estratégias
    const btnSimularEstrategias = document.getElementById('btn-simular-estrategias');
    if (btnSimularEstrategias) {
        btnSimularEstrategias.addEventListener('click', function() {
            // Verificar se o simulador está disponível
            if (window.SimuladorFluxoCaixa && typeof window.SimuladorFluxoCaixa.simularEstrategias === 'function') {
                try {
                    // Verificar se temos resultados principais
                    if (!window.resultadosSimulacao || !window.resultadosSimulacao.impactoBase) {
                        alert('É necessário realizar uma simulação principal antes de simular estratégias. Por favor, acesse a aba "Simulação" e execute a simulação principal.');

                        // Redirecionar para a aba de simulação
                        const tabBtn = document.querySelector('.tab-button[data-tab="simulacao"]');
                        if (tabBtn) tabBtn.click();
                        return;
                    }

                    // Mostrar indicador de carregamento se disponível
                    const loader = document.getElementById('estrategias-loader');
                    if (loader) loader.style.display = 'block';

                    // Executar simulação de estratégias com tratamento de erro explícito
                    const resultados = window.SimuladorFluxoCaixa.simularEstrategias();

                    // Ocultar indicador de carregamento
                    if (loader) loader.style.display = 'none';

                    if (!resultados) {
                        console.error('A simulação de estratégias não retornou resultados');

                        // Verificar se temos estratégias ativas
                        let estrategiasAtivas = false;
                        const seletores = ['ap-ativar', 'rp-ativar', 'ar-ativar', 'cg-ativar', 'mp-ativar', 'mp-pag-ativar'];

                        seletores.forEach(id => {
                            const seletor = document.getElementById(id);
                            if (seletor && seletor.value === '1') {
                                estrategiasAtivas = true;
                            }
                        });

                        if (!estrategiasAtivas) {
                            alert('Ative pelo menos uma estratégia de mitigação antes de simular.');
                        } else {
                            alert('Não foi possível simular as estratégias. Verifique se todos os campos estão preenchidos corretamente e tente novamente.');
                        }
                    } else {
                        // Se temos o seletor de ano, atualizar para refletir as mudanças
                        const seletorAno = document.getElementById('ano-visualizacao-estrategias');
                        if (seletorAno) {
                            // Disparar evento de mudança para atualizar a visualização
                            const evento = new Event('change');
                            seletorAno.dispatchEvent(evento);
                        } else {
                            // Se não temos o seletor, atualizar a visualização diretamente
                            atualizarVisualizacaoEstrategias();
                        }
                    }
                } catch (erro) {
                    console.error('Erro ao simular estratégias:', erro);
                    alert('Ocorreu um erro durante a simulação de estratégias: ' + erro.message);

                    // Ocultar indicador de carregamento em caso de erro
                    const loader = document.getElementById('estrategias-loader');
                    if (loader) loader.style.display = 'none';
                }
            } else {
                console.error('Função de simulação de estratégias não encontrada');
                alert('Não foi possível simular estratégias. Verifique se todos os módulos foram carregados corretamente.');
            }
        });
    }
    
/**
 * Inicializa eventos específicos para os campos de estratégias
 */
function inicializarEventosEstrategias() {
    console.log('Inicializando eventos específicos para estratégias');

    try {
        // Mapear os seletores de ativação das estratégias
        const seletoresAtivacao = [
            'ap-ativar', 'rp-ativar', 'ar-ativar', 
            'cg-ativar', 'mp-ativar', 'mp-pag-ativar'
        ];

        // Adicionar evento de mudança para cada seletor
        seletoresAtivacao.forEach(id => {
            const seletor = document.getElementById(id);
            if (seletor) {
                seletor.addEventListener('change', function() {
                    console.log(`Estratégia ${id} alterada: ${this.value}`);

                    // Atualizar configurações no formulário
                    if (window.SimuladorFluxoCaixa && window.SimuladorFluxoCaixa.extrairConfiguracoesEstrategias) {
                        const dadosAninhados = window.DataManager.obterDadosDoFormulario();
                        const estrategias = window.SimuladorFluxoCaixa.extrairConfiguracoesEstrategias(dadosAninhados);

                        // Salvar no repositório
                        if (window.SimuladorFluxoCaixa.salvarEstrategiasNoRepositorio) {
                            window.SimuladorFluxoCaixa.salvarEstrategiasNoRepositorio(estrategias);
                        }
                    }
                });
            }
        });

        // Adicionar eventos para campos numéricos (percentuais, valores)
        const camposNumericos = [
            'ap-percentual', 'ap-elasticidade', 'rp-aumento-prazo', 'rp-percentual',
            'ar-percentual', 'ar-taxa', 'ar-prazo', 'cg-valor', 'cg-taxa',
            'cg-prazo', 'cg-carencia', 'mp-percentual', 'mp-impacto-receita',
            'mp-impacto-margem', 'mp-pag-vista-novo', 'mp-pag-30-novo',
            'mp-pag-60-novo', 'mp-pag-90-novo', 'mp-pag-taxa-incentivo'
        ];

        // Debounce para evitar muitas atualizações
        let debounceTimeout;

        // Adicionar eventos para os campos numéricos
        camposNumericos.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) {
                campo.addEventListener('change', function() {
                    clearTimeout(debounceTimeout);
                    debounceTimeout = setTimeout(() => {
                        // Extrair e salvar automaticamente
                        if (window.SimuladorFluxoCaixa && window.SimuladorFluxoCaixa.extrairConfiguracoesEstrategias) {
                            const dadosAninhados = window.DataManager.obterDadosDoFormulario();
                            const estrategias = window.SimuladorFluxoCaixa.extrairConfiguracoesEstrategias(dadosAninhados);

                            // Salvar no repositório
                            if (window.SimuladorFluxoCaixa.salvarEstrategiasNoRepositorio) {
                                window.SimuladorFluxoCaixa.salvarEstrategiasNoRepositorio(estrategias);
                            }
                        }
                    }, 300);
                });
            }
        });

        console.log('Eventos de estratégias inicializados com sucesso');
    } catch (erro) {
        console.error('Erro ao inicializar eventos de estratégias:', erro);
    }
}

// Adicionar evento para salvar setores que atualize os dropdowns
const btnSalvarSetor = document.getElementById('btn-salvar-setor');
if (btnSalvarSetor) {
    btnSalvarSetor.addEventListener('click', function() {
        // Após salvar o setor, atualizar dropdown na aba de simulação
        setTimeout(function() {
            SetoresManager.preencherDropdownSetores('setor');
        }, 100);
    });
}

// No final da função inicializarEventosPrincipais() no main.js
// Adicionar:
if (window.CurrencyFormatter) {
    CurrencyFormatter.inicializar();
}

console.log('Eventos principais inicializados');
}

/**
 * Cria e gerencia um indicador de carregamento para operações assíncronas
 * @returns {Object} Métodos para controlar o indicador de carregamento
 */
function criarGerenciadorLoader() {
    // Verificar se o loader já existe
    let loader = document.getElementById('estrategias-loader');
    
    // Criar o loader se não existir
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'estrategias-loader';
        loader.className = 'loader';
        loader.innerHTML = '<div class="spinner"></div><div class="loader-text">Processando simulação...</div>';
        loader.style.display = 'none';
        
        // Adicionar estilos se não existirem
        if (!document.getElementById('loader-styles')) {
            const estilos = document.createElement('style');
            estilos.id = 'loader-styles';
            estilos.textContent = `
                .loader {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(255, 255, 255, 0.8);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                }
                
                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 5px solid #f3f3f3;
                    border-top: 5px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                .loader-text {
                    margin-top: 15px;
                    font-size: 16px;
                    color: #333;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(estilos);
        }
        
        // Adicionar à página
        document.body.appendChild(loader);
    }
    
    return {
        mostrar: function(mensagem = null) {
            if (mensagem) {
                const textoLoader = loader.querySelector('.loader-text');
                if (textoLoader) {
                    textoLoader.textContent = mensagem;
                }
            }
            loader.style.display = 'flex';
        },
        
        ocultar: function() {
            loader.style.display = 'none';
        },
        
        atualizar: function(mensagem) {
            const textoLoader = loader.querySelector('.loader-text');
            if (textoLoader) {
                textoLoader.textContent = mensagem;
            }
        }
    };
}

// Inicializar o gerenciador de loader
window.LoaderManager = criarGerenciadorLoader();

/**
 * Atualiza os resultados exibidos com base no ano selecionado
 */
function atualizarResultadosPorAno() {
    const anoSelecionado = parseInt(document.getElementById('ano-visualizacao').value);
    
    // Se não há resultados calculados, retornar
    if (!window.resultadosSimulacao || !window.resultadosSimulacao.projecaoTemporal) {
        console.warn('Sem resultados de simulação para exibir');
        return;
    }
    
    // Verificar se a estrutura resultadosAnuais existe
    if (!window.resultadosSimulacao.projecaoTemporal.resultadosAnuais) {
        console.warn('Estrutura de resultados anuais não disponível');
        return;
    }
    
    // Obter resultados para o ano selecionado
    const resultadosAno = window.resultadosSimulacao.projecaoTemporal.resultadosAnuais[anoSelecionado];
    
    if (!resultadosAno) {
        console.warn(`Não há resultados para o ano ${anoSelecionado}`);
        return;
    }
    
    // Atualizar os campos de resultado na interface
    const formatarMoeda = window.DataManager.formatarMoeda;
    const formatarPercentual = window.DataManager.formatarPercentual;
    
    // Função auxiliar para atualizar texto de elemento se existir
    function atualizarTextoSeElementoExistir(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    }
    
    // Verificar se temos acesso a impactoBase no resultadosSimulacao
    if (!window.resultadosSimulacao.impactoBase) {
        console.warn('Dados de impacto base não disponíveis');
        return;
    }
    
    // Usar o impactoBase do resultadosSimulacao
    const impactoBase = window.resultadosSimulacao.impactoBase;
    
    // Atualizar elementos de comparação de sistemas tributários
    atualizarTextoSeElementoExistir('tributo-atual', formatarMoeda(impactoBase.resultadoAtual?.impostos?.total || 0));
    atualizarTextoSeElementoExistir('tributo-dual', formatarMoeda(impactoBase.resultadoSplitPayment?.impostos?.total || 0));
    atualizarTextoSeElementoExistir('tributo-iva-sem-split', formatarMoeda(impactoBase.resultadoIVASemSplit?.impostos?.total || 0));
    atualizarTextoSeElementoExistir('tributo-diferenca', formatarMoeda(
        (impactoBase.resultadoSplitPayment?.impostos?.total || 0) - 
        (impactoBase.resultadoAtual?.impostos?.total || 0)
    ));
    atualizarTextoSeElementoExistir('tributo-diferenca-iva-sem-split', formatarMoeda(
        (impactoBase.resultadoIVASemSplit?.impostos?.total || 0) - 
        (impactoBase.resultadoAtual?.impostos?.total || 0)
    ));

    // Atualizar elementos de impacto no capital de giro
    atualizarTextoSeElementoExistir('capital-giro-atual', formatarMoeda(impactoBase.resultadoAtual?.capitalGiroDisponivel || 0));
    atualizarTextoSeElementoExistir('capital-giro-split', formatarMoeda(impactoBase.resultadoSplitPayment?.capitalGiroDisponivel || 0));
    atualizarTextoSeElementoExistir('capital-giro-iva-sem-split', formatarMoeda(impactoBase.resultadoIVASemSplit?.capitalGiroDisponivel || 0));
    atualizarTextoSeElementoExistir('capital-giro-impacto', formatarMoeda(impactoBase.diferencaCapitalGiro || 0));
    atualizarTextoSeElementoExistir('capital-giro-impacto-iva-sem-split', formatarMoeda(impactoBase.diferencaCapitalGiroIVASemSplit || 0));
    atualizarTextoSeElementoExistir('capital-giro-necessidade', formatarMoeda(impactoBase.necessidadeAdicionalCapitalGiro || 0));
    
    // Adicionar classe CSS baseada no valor
    const impactoElement = document.getElementById('capital-giro-impacto');
    if (impactoElement) {
        if ((impactoBase.diferencaCapitalGiro || 0) < 0) {
            impactoElement.classList.add('valor-negativo');
        } else {
            impactoElement.classList.remove('valor-negativo');
        }
    }
    
    // Atualizar elementos de impacto na margem operacional
    atualizarTextoSeElementoExistir('margem-atual', formatarPercentual(resultadosAno.margemOperacionalOriginal * 100 || 0));
    atualizarTextoSeElementoExistir('margem-ajustada', formatarPercentual(resultadosAno.margemOperacionalAjustada * 100 || 0));
    atualizarTextoSeElementoExistir('margem-impacto', formatarPercentual(resultadosAno.impactoMargem || 0));
    
    // Atualizar elementos da análise de impacto detalhada
    atualizarTextoSeElementoExistir('percentual-impacto', formatarPercentual(resultadosAno.percentualImpacto || 0));
    
    // Usar o normalizador de valor para exibir os dias corretamente
    const diasFaturamento = window.DataManager.normalizarValor(
        resultadosAno.impactoDiasFaturamento || 0, 
        'numero'
    );
    atualizarTextoSeElementoExistir('impacto-dias-faturamento', diasFaturamento.toFixed(1) + ' dias');
    
    // Obter o percentual de implementação do Split Payment para o ano
    const percentualImplementacao = window.resultadosSimulacao.projecaoTemporal.resultadosAnuais[anoSelecionado]?.percentualImplementacao || 
        window.CurrentTaxSystem.obterPercentualImplementacao(anoSelecionado);
    
    // Mostrar que estamos visualizando resultados de um ano específico
    const tituloResultados = document.querySelector('#resultados h3');
    if (tituloResultados) {
        tituloResultados.textContent = `Resultados da Simulação (${anoSelecionado} - ${(percentualImplementacao*100).toFixed(0)}%)`;
    }
    
    // Verificar se temos a estrutura de comparação entre regimes
    if (window.resultadosSimulacao.projecaoTemporal.comparacaoRegimes) {
        // Atualizar o índice correspondente ao ano selecionado
        const indiceAno = window.resultadosSimulacao.projecaoTemporal.comparacaoRegimes.anos.indexOf(anoSelecionado);
        
        if (indiceAno >= 0) {
            // Atualizar dados de comparação para o ano específico
            const comparacaoRegimes = window.resultadosSimulacao.projecaoTemporal.comparacaoRegimes;
            
            // Atualizar dados adicionais se disponíveis
            const dadosComparativos = document.getElementById('dados-comparativos');
            if (dadosComparativos) {
                let htmlComparativo = `
                    <h4>Dados Comparativos - ${anoSelecionado}</h4>
                    <div class="comparativo-grid">
                        <div class="comparativo-item">
                            <div class="label">Capital de Giro (Atual):</div>
                            <div class="value">${formatarMoeda(comparacaoRegimes.atual.capitalGiro[indiceAno])}</div>
                        </div>
                        <div class="comparativo-item">
                            <div class="label">Capital de Giro (Split Payment):</div>
                            <div class="value">${formatarMoeda(comparacaoRegimes.splitPayment.capitalGiro[indiceAno])}</div>
                        </div>
                        <div class="comparativo-item">
                            <div class="label">Capital de Giro (IVA sem Split):</div>
                            <div class="value">${formatarMoeda(comparacaoRegimes.ivaSemSplit.capitalGiro[indiceAno])}</div>
                        </div>
                        <div class="comparativo-item">
                            <div class="label">Impostos (Atual):</div>
                            <div class="value">${formatarMoeda(comparacaoRegimes.atual.impostos[indiceAno])}</div>
                        </div>
                        <div class="comparativo-item">
                            <div class="label">Impostos (Split Payment):</div>
                            <div class="value">${formatarMoeda(comparacaoRegimes.splitPayment.impostos[indiceAno])}</div>
                        </div>
                        <div class="comparativo-item">
                            <div class="label">Impostos (IVA sem Split):</div>
                            <div class="value">${formatarMoeda(comparacaoRegimes.ivaSemSplit.impostos[indiceAno])}</div>
                        </div>
                    </div>
                `;
                
                dadosComparativos.innerHTML = htmlComparativo;
                dadosComparativos.style.display = 'block';
            }
        }
    }
    
    console.log(`Resultados atualizados para o ano ${anoSelecionado}`);
}

/**
 * Atualiza a interface com os resultados da simulação
 * @param {Object} resultados - Resultados da simulação
 */
function atualizarInterface(resultados) {
    console.log('Atualizando interface com resultados');
    try {
        // Verifica se temos resultados válidos
        if (!resultados || !resultados.impactoBase) {
            console.error('Resultados inválidos ou incompletos:', resultados);
            alert('Não foi possível processar os resultados da simulação. Verifique o console para detalhes.');
            return;
        }

        // Armazenar resultados globalmente para acesso posterior
        // Esta linha é crucial para garantir que os resultados estejam disponíveis
        window.resultadosSimulacao = resultados;
        
        // Função auxiliar para atualizar texto de elemento se existir
        function atualizarTextoSeElementoExistir(id, valor) {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = valor;
            }
        }
        
        // Usar sempre as funções de formatação do DataManager
        const formatarMoeda = window.DataManager.formatarMoeda;
        const formatarPercentual = window.DataManager.formatarPercentual;
        
        // Verificar se split-payment foi considerado
        const splitPaymentConsiderado = resultados.impactoBase.splitPaymentConsiderado !== false;       
        
        // Se split-payment não foi considerado, mostrar aviso
        const divResultados = document.getElementById('resultados');
        if (divResultados) {
            // Remover aviso anterior se existir
            const avisoExistente = divResultados.querySelector('.split-payment-notice');
            if (avisoExistente) avisoExistente.remove();
            
            if (!splitPaymentConsiderado) {
                const aviso = document.createElement('div');
                aviso.className = 'alert alert-warning split-payment-notice';
                aviso.innerHTML = '<strong>Atenção:</strong> Simulação executada sem considerar o mecanismo de Split Payment.';
                divResultados.insertBefore(aviso, divResultados.firstChild);
            }
        }
        
        // Obter o ano selecionado (ou usar o primeiro ano disponível)
        const seletorAno = document.getElementById('ano-visualizacao');
        const anoSelecionado = seletorAno ? parseInt(seletorAno.value) : (resultados.projecaoTemporal?.parametros?.anoInicial || 2026);
        
        // Se temos resultados por ano, usar o ano selecionado, caso contrário usar o impactoBase
        if (resultados.projecaoTemporal && resultados.projecaoTemporal.resultadosAnuais && 
            resultados.projecaoTemporal.resultadosAnuais[anoSelecionado]) {
            
            // Chamar a função que atualiza resultados por ano
            atualizarResultadosPorAno();
            
        } else {
            // Atualizar elementos de comparação de sistemas tributários
            atualizarTextoSeElementoExistir('tributo-atual', formatarMoeda(resultados.impactoBase.resultadoAtual?.impostos?.total || 0));
            atualizarTextoSeElementoExistir('tributo-dual', formatarMoeda(resultados.impactoBase.resultadoSplitPayment?.impostos?.total || 0));
            atualizarTextoSeElementoExistir('tributo-diferenca', formatarMoeda(
                (resultados.impactoBase.resultadoSplitPayment?.impostos?.total || 0) - 
                (resultados.impactoBase.resultadoAtual?.impostos?.total || 0)
            ));
            
            // Atualizar elementos de impacto no capital de giro
            atualizarTextoSeElementoExistir('capital-giro-atual', formatarMoeda(resultados.impactoBase.resultadoAtual?.capitalGiroDisponivel || 0));
            atualizarTextoSeElementoExistir('capital-giro-split', formatarMoeda(resultados.impactoBase.resultadoSplitPayment?.capitalGiroDisponivel || 0));
            atualizarTextoSeElementoExistir('capital-giro-iva-sem-split', formatarMoeda(resultados.impactoBase.resultadoIVASemSplit?.capitalGiroDisponivel || 0));
            atualizarTextoSeElementoExistir('capital-giro-impacto', formatarMoeda(resultados.impactoBase.diferencaCapitalGiro || 0));
            atualizarTextoSeElementoExistir('capital-giro-necessidade', formatarMoeda(resultados.impactoBase.necessidadeAdicionalCapitalGiro || 0));
            
            // Adicionar classe CSS baseada no valor
            const impactoElement = document.getElementById('capital-giro-impacto');
            if (impactoElement) {
                if ((resultados.impactoBase.diferencaCapitalGiro || 0) < 0) {
                    impactoElement.classList.add('valor-negativo');
                } else {
                    impactoElement.classList.remove('valor-negativo');
                }
            }
            
            // Atualizar elementos de impacto na margem operacional
            atualizarTextoSeElementoExistir('margem-atual', formatarPercentual(resultados.impactoBase.margemOperacionalOriginal * 100 || 0));
            atualizarTextoSeElementoExistir('margem-ajustada', formatarPercentual(resultados.impactoBase.margemOperacionalAjustada * 100 || 0));
            atualizarTextoSeElementoExistir('margem-impacto', formatarPercentual(resultados.impactoBase.impactoMargem || 0));
            
            // Atualizar elementos da análise de impacto detalhada
            atualizarTextoSeElementoExistir('percentual-impacto', formatarPercentual(resultados.impactoBase.percentualImpacto || 0));
            
            // Usar o normalizador de valor para exibir os dias corretamente
            const diasFaturamento = window.DataManager.normalizarValor(
                resultados.impactoBase.impactoDiasFaturamento || 0, 
                'numero'
            );
            atualizarTextoSeElementoExistir('impacto-dias-faturamento', diasFaturamento.toFixed(1) + ' dias');
        }
        
        // Atualizar seção de projeção temporal
        if (resultados.projecaoTemporal && resultados.projecaoTemporal.impactoAcumulado) {
            // Verificar se temos a nova estrutura de comparação entre regimes
            if (resultados.projecaoTemporal.comparacaoRegimes) {
                // Preencher o seletor de anos com os anos disponíveis
                const selectAnoVisualizacao = document.getElementById('ano-visualizacao');
                if (selectAnoVisualizacao) {
                    // Limpar opções existentes
                    selectAnoVisualizacao.innerHTML = '';
                    
                    // Adicionar opções para cada ano
                    resultados.projecaoTemporal.comparacaoRegimes.anos.forEach(ano => {
                        const option = document.createElement('option');
                        option.value = ano;
                        
                        // Obter o percentual de implementação para este ano
                        const percentualImplementacao = window.CurrentTaxSystem.obterPercentualImplementacao(ano) * 100;
                        option.textContent = `${ano} (${percentualImplementacao.toFixed(0)}%)`;
                        
                        // Selecionar o primeiro ano por padrão
                        if (ano === resultados.projecaoTemporal.parametros.anoInicial) {
                            option.selected = true;
                        }
                        
                        selectAnoVisualizacao.appendChild(option);
                    });
                    
                    // Disparar evento de mudança para atualizar visualização
                    const event = new Event('change');
                    selectAnoVisualizacao.dispatchEvent(event);
                }
            }
            
            // Preencher dados de impacto acumulado
            atualizarTextoSeElementoExistir('total-necessidade-giro', formatarMoeda(
                resultados.projecaoTemporal.impactoAcumulado.totalNecessidadeCapitalGiro || 0
            ));
            
            atualizarTextoSeElementoExistir('custo-financeiro-total', formatarMoeda(
                resultados.projecaoTemporal.impactoAcumulado.custoFinanceiroTotal || 0
            ));
            
            // Preencher dados de impacto médio na margem
            const impactoMedioMargem = resultados.projecaoTemporal.impactoAcumulado.impactoMedioMargem || 0;
            const elementoImpactoMedioMargem = document.getElementById('impacto-medio-margem');
            if (elementoImpactoMedioMargem) {
                elementoImpactoMedioMargem.textContent = formatarPercentual(impactoMedioMargem);
            }
        }
        
        // Se split-payment não for considerado, ajustar labels
        if (!splitPaymentConsiderado) {
            // Mudar o título da coluna de comparação
            const labelSistema = document.querySelector('.result-card:first-child h4');
            if (labelSistema) labelSistema.textContent = 'Impacto do Novo Sistema Tributário';
            
            // Atualizar labels específicos
            const labelSegundoSistema = document.querySelector('.result-card:first-child .result-grid .result-item:nth-child(2) .label');
            if (labelSegundoSistema) labelSegundoSistema.textContent = 'Sistema IVA Sem Split:';
            
            const labelCapitalGiroSplit = document.querySelector('.result-card:nth-child(2) .result-grid .result-item:nth-child(2) .label');
            if (labelCapitalGiroSplit) labelCapitalGiroSplit.textContent = 'Sistema IVA:';
        }
        
        // Mostrar div de resultados detalhados
        const divResultadosDetalhados = document.getElementById('resultados-detalhados');
        if (divResultadosDetalhados) {
            divResultadosDetalhados.style.display = 'block';
        }
        
        // Armazenar resultados para memória de cálculo
        window.memoriaCalculoSimulacao = resultados.memoriaCalculo;
        
        console.log('Interface atualizada com sucesso');
    } catch (erro) {
        console.error('Erro ao atualizar interface:', erro);
        alert('Ocorreu um erro ao exibir os resultados: ' + erro.message);
    }
}

// Exportar a função para o escopo global
window.atualizarInterface = atualizarInterface;

function inicializarRepository() {
    // Verificar se o repository já existe
    if (typeof SimuladorRepository !== 'undefined') {
        console.log('SimuladorRepository já existe. Integrando com DataManager...');
        
        // Se o DataManager estiver disponível, integrar com o repositório
        if (window.DataManager) {
            // Sobrescrever métodos do repositório para usar o DataManager
            const originalObterSecao = SimuladorRepository.obterSecao;
            const originalAtualizarSecao = SimuladorRepository.atualizarSecao;
            
            // Sobrescrever método obterSecao para normalizar dados via DataManager
            SimuladorRepository.obterSecao = function(nome) {
                const dados = originalObterSecao.call(this, nome);
                // Normalizar dados via DataManager
                return window.DataManager.normalizarDadosSecao(nome, dados);
            };
            
            // Sobrescrever método atualizarSecao para validar dados via DataManager
            SimuladorRepository.atualizarSecao = function(nome, dados) {
                // Validar dados via DataManager
                const dadosValidados = window.DataManager.validarDadosSecao(nome, dados);
                return originalAtualizarSecao.call(this, nome, dadosValidados);
            };
            
            console.log('SimuladorRepository integrado com DataManager com sucesso.');
        }
        
        return true;
    }

    // Criar repository básico se não existir, usando a estrutura canônica do DataManager
    window.SimuladorRepository = {
        dados: window.DataManager.obterEstruturaAninhadaPadrao(),

        obterSecao: function(nome) {
            const dadosSecao = this.dados[nome] || {};
            // Normalizar dados via DataManager
            return window.DataManager.normalizarDadosSecao(nome, dadosSecao);
        },

        atualizarSecao: function(nome, dados) {
            // Validar dados via DataManager
            this.dados[nome] = window.DataManager.validarDadosSecao(nome, dados);
            
            return this.dados[nome];
        }
    };

    console.log('Repository inicializado com estrutura canônica padrão.');
    return true;
}

/**
 * Observar mudanças de aba para atualizar dados quando necessário
 */
function observarMudancasDeAba() {
    // Observar eventos de mudança de aba
    document.addEventListener('tabChange', function(event) {
        const tabId = event.detail.tab;
        
        // Se a aba de simulação for ativada, garantir que o dropdown esteja atualizado
        if (tabId === 'simulacao') {
            SetoresManager.preencherDropdownSetores('setor');
            console.log('Dropdown de setores atualizado na aba de simulação');
        }
    });
}

function observarCamposCriticos() {
    console.log('Configurando observadores para campos críticos');
    
    // Lista de campos críticos que precisam de normalização
    const camposCriticos = [
        { id: 'faturamento', tipo: 'monetario', secao: 'empresa' },
        { id: 'margem', tipo: 'percentual', secao: 'empresa' },
        { id: 'aliquota', tipo: 'percentual', secao: 'parametrosFiscais' },
        { id: 'perc-vista', tipo: 'percentual', secao: 'cicloFinanceiro' },
        { id: 'taxa-crescimento', tipo: 'percentual', secao: 'parametrosSimulacao' },
        // Campos adicionais da estrutura canônica
        { id: 'pmr', tipo: 'numero', secao: 'cicloFinanceiro' },
        { id: 'pmp', tipo: 'numero', secao: 'cicloFinanceiro' },
        { id: 'pme', tipo: 'numero', secao: 'cicloFinanceiro' },
        { id: 'data-inicial', tipo: 'texto', secao: 'parametrosSimulacao' },
        { id: 'data-final', tipo: 'texto', secao: 'parametrosSimulacao' }
    ];
    
    // Configurar observadores para cada campo
    camposCriticos.forEach(campo => {
        const elemento = document.getElementById(campo.id);
        if (!elemento) {
            console.warn(`Campo crítico #${campo.id} não encontrado no DOM.`);
            return;
        }
        
        // Adicionar evento para normalizar valor após alteração
        elemento.addEventListener('change', function() {
            console.log(`Normalizando campo crítico: ${campo.id}`);
            
            try {
                // Obter valor atual usando as funções específicas do DataManager por tipo
                let valorAtual;
                switch (campo.tipo) {
                    case 'monetario':
                        // Usar o rawValue do dataset se disponível, pois contém o valor correto
                        if (elemento.dataset && elemento.dataset.rawValue !== undefined) {
                            valorAtual = parseFloat(elemento.dataset.rawValue);
                        } else {
                            valorAtual = window.DataManager.extrairValorMonetario(elemento.value);
                        }
                        break;
                    case 'percentual':
                        valorAtual = window.DataManager.extrairValorPercentual(elemento.value);
                        break;
                    case 'numero':
                        valorAtual = window.DataManager.extrairValorNumerico(campo.id);
                        break;
                    default:
                        valorAtual = elemento.value;
                }
                
                // Normalizar valor
                const valorNormalizado = window.DataManager.normalizarValor(valorAtual, campo.tipo);
                
                // Atualizar exibição usando formatadores do DataManager
                switch (campo.tipo) {
                    case 'monetario':
                        elemento.value = window.DataManager.formatarMoeda(valorNormalizado);
                        break;
                    case 'percentual':
                        if (elemento.type !== 'range') {
                            // Exibir como percentual para inputs de texto
                            elemento.value = valorNormalizado <= 1 ? 
                                (valorNormalizado * 100).toFixed(2) : 
                                valorNormalizado.toFixed(2);
                        }
                        break;
                    case 'numero':
                        if (elemento.type !== 'range') {
                            elemento.value = valorNormalizado.toString();
                        }
                        break;
                }
                
                // Registrar valor normalizado no dataset para uso posterior
                elemento.dataset.valorNormalizado = valorNormalizado;
                
                // Notificar outros componentes através de um evento personalizado
                const eventoMudanca = new CustomEvent('valorNormalizado', {
                    detail: {
                        campo: campo.id,
                        tipo: campo.tipo,
                        secao: campo.secao,
                        valor: valorNormalizado
                    }
                });
                elemento.dispatchEvent(eventoMudanca);
                
                // Atualizar o repositório com o novo valor
                atualizarRepositorioComValorCampo(campo.secao, campo.id, valorNormalizado);
                
                console.log(`Campo ${campo.id} normalizado: ${valorNormalizado}`);
            } catch (erro) {
                console.error(`Erro ao normalizar campo ${campo.id}:`, erro);
            }
        });
        
        // Inicializar o campo com o valor do repositório, se existir
        try {
            const secao = window.SimuladorRepository.obterSecao(campo.secao);
            if (secao) {
                const valorDoRepositorio = obterValorDePropertyPath(secao, campo.id);
                if (valorDoRepositorio !== undefined) {
                    // Normalizar e formatar o valor para exibição
                    const valorNormalizado = window.DataManager.normalizarValor(valorDoRepositorio, campo.tipo);
                    
                    // Atualizar a exibição de acordo com o tipo
                    switch (campo.tipo) {
                        case 'monetario':
                            elemento.value = window.DataManager.formatarMoeda(valorNormalizado);
                            break;
                        case 'percentual':
                            if (elemento.type !== 'range') {
                                elemento.value = valorNormalizado <= 1 ? 
                                    (valorNormalizado * 100).toFixed(2) : 
                                    valorNormalizado.toFixed(2);
                            } else {
                                elemento.value = valorNormalizado <= 1 ? 
                                    (valorNormalizado * 100) : 
                                    valorNormalizado;
                            }
                            break;
                        case 'numero':
                            elemento.value = valorNormalizado.toString();
                            break;
                        default:
                            elemento.value = valorDoRepositorio !== null ? valorDoRepositorio.toString() : '';
                    }
                    
                    // Salvar o valor normalizado no dataset
                    elemento.dataset.valorNormalizado = valorNormalizado;
                }
            }
        } catch (erro) {
            console.warn(`Não foi possível inicializar o campo ${campo.id} com valor do repositório:`, erro);
        }
        
        console.log(`Observador configurado para campo crítico: ${campo.id}`);
    });
    
    console.log('Configuração de observadores para campos críticos concluída');
}

/**
 * Função auxiliar para atualizar o repositório com um valor de campo
 * @param {string} secao - Nome da seção no repositório
 * @param {string} campo - Nome do campo
 * @param {any} valor - Valor normalizado
 */
function atualizarRepositorioComValorCampo(secao, campo, valor) {
    try {
        // Obter a seção atual do repositório
        const dadosSecao = window.SimuladorRepository.obterSecao(secao);
        
        // Atualizar o campo específico
        dadosSecao[campo] = valor;
        
        // Atualizar a seção no repositório
        window.SimuladorRepository.atualizarSecao(secao, dadosSecao);
        
        console.log(`Repositório atualizado: ${secao}.${campo} = ${valor}`);
    } catch (erro) {
        console.error(`Erro ao atualizar repositório para ${secao}.${campo}:`, erro);
    }
}

/**
 * Função auxiliar para obter um valor de um caminho de propriedade
 * @param {Object} objeto - Objeto a ser acessado
 * @param {string} caminho - Caminho da propriedade (pode ser aninhado com '.')
 * @returns {any} - Valor da propriedade ou undefined se não encontrado
 */
function obterValorDePropertyPath(objeto, caminho) {
    if (!objeto || !caminho) return undefined;
    
    // Se o caminho não contiver ponto, acessar diretamente
    if (!caminho.includes('.')) {
        return objeto[caminho];
    }
    
    // Caso contrário, dividir e acessar recursivamente
    const partes = caminho.split('.');
    let valorAtual = objeto;
    
    for (const parte of partes) {
        if (valorAtual === undefined || valorAtual === null) {
            return undefined;
        }
        valorAtual = valorAtual[parte];
    }
    
    return valorAtual;
}

/**
 * Verifica e cria elementos necessários para a aba de estratégias
 * Garante que todos os elementos DOM requeridos existam antes de prosseguir
 */
function verificarElementosEstrategias() {
    console.log('Verificando elementos necessários para estratégias...');
    
    // Verificar container de resultados
    const containerResultados = document.getElementById('resultados-estrategias');
    if (!containerResultados) {
        console.warn('Container de resultados de estratégias não encontrado. Criando...');
        
        // Buscar o container pai na aba de estratégias
        const tabEstrategias = document.getElementById('estrategias');
        if (tabEstrategias) {
            const divResultados = document.createElement('div');
            divResultados.id = 'resultados-estrategias';
            divResultados.className = 'estrategias-resultados';
            divResultados.innerHTML = '<p class="text-muted">Selecione as estratégias de mitigação e simule para ver os resultados estimados.</p>';
            
            // Buscar onde inserir - após h3 ou após o primeiro filho
            const titulo = tabEstrategias.querySelector('h3') || tabEstrategias.querySelector('h4');
            if (titulo) {
                titulo.parentNode.insertBefore(divResultados, titulo.nextSibling);
            } else {
                tabEstrategias.appendChild(divResultados);
            }
        }
    }
    
    // Verificar container para dados comparativos
    const dadosComparativos = document.getElementById('dados-comparativos-estrategias');
    if (!dadosComparativos) {
        console.warn('Container de dados comparativos não encontrado. Criando...');
        
        // Criar após o container de resultados
        const novoContainer = document.createElement('div');
        novoContainer.id = 'dados-comparativos-estrategias';
        novoContainer.style.display = 'none';
        
        if (containerResultados && containerResultados.parentNode) {
            containerResultados.parentNode.insertBefore(novoContainer, containerResultados.nextSibling);
        } else {
            // Buscar o container pai na aba de estratégias como fallback
            const tabEstrategias = document.getElementById('estrategias');
            if (tabEstrategias) {
                tabEstrategias.appendChild(novoContainer);
            }
        }
    }
    
    // Verificar seletor de ano
    const seletorAno = document.getElementById('ano-visualizacao-estrategias');
    if (!seletorAno) {
        console.warn('Seletor de ano para estratégias não encontrado');
        // Isso não é crítico, então apenas logamos o aviso
    }
    
    // Verificar os containers para gráficos
    const graficosIds = [
        'grafico-efetividade-estrategias',
        'grafico-comparacao-estrategias',
        'grafico-evolucao-estrategias'
    ];
    
    const containersGraficos = document.querySelector('.charts-grid');
    if (containersGraficos) {
        // Verificar cada gráfico
        graficosIds.forEach(id => {
            if (!document.getElementById(id)) {
                console.warn(`Canvas para ${id} não encontrado. Criando...`);
                
                const container = document.createElement('div');
                container.className = 'chart-container';
                
                const canvas = document.createElement('canvas');
                canvas.id = id;
                
                container.appendChild(canvas);
                containersGraficos.appendChild(container);
            }
        });
    } else {
        console.warn('Container para gráficos não encontrado');
    }
    
    console.log('Verificação de elementos para estratégias concluída');
}

/**
 * Atualiza os resultados de estratégias conforme o ano selecionado
 */
function atualizarVisualizacaoEstrategias() {
    console.log('Atualizando visualização de estratégias...');
    
    // 1. Verificar se temos o simulador disponível
    if (!window.SimuladorFluxoCaixa || typeof window.SimuladorFluxoCaixa.simularEstrategias !== 'function') {
        console.error('Simulador não disponível para atualizar estratégias');
        // Exibir mensagem para o usuário
        const divResultados = document.getElementById('resultados-estrategias');
        if (divResultados) {
            divResultados.innerHTML = `
                <div class="alert alert-warning">
                    <strong>Atenção:</strong> Não foi possível carregar o componente de simulação. 
                    Tente atualizar a página e executar a simulação novamente.
                </div>
            `;
        }
        return;
    }
    
    try {
        // 2. Obter o ano selecionado para visualização
        const seletorAno = document.getElementById('ano-visualizacao-estrategias');
        if (!seletorAno) {
            console.error('Seletor de ano para estratégias não encontrado');
            return;
        }
        
        // 3. Verificar se há resultados de simulação disponíveis
        if (!window.resultadosSimulacao || !window.resultadosSimulacao.impactoBase) {
            console.warn('Sem resultados de simulação disponíveis. Execute uma simulação primeiro.');
            
            // Exibir mensagem ao usuário
            const divResultados = document.getElementById('resultados-estrategias');
            if (divResultados) {
                divResultados.innerHTML = `
                    <div class="alert alert-warning">
                        <strong>Atenção:</strong> É necessário executar uma simulação na aba "Simulação" 
                        antes de aplicar estratégias de mitigação.
                    </div>
                    <p class="text-muted">Acesse a aba "Simulação", configure os parâmetros e clique em 
                    "Simular Impacto no Fluxo de Caixa" antes de prosseguir com as estratégias.</p>
                `;
            }
            return;
        }
        
        // 4. Obter dados do formulário através do DataManager com tratamento de erro
        let dadosAninhados;
        try {
            dadosAninhados = window.DataManager.obterDadosDoFormulario();
            if (!dadosAninhados) throw new Error('Não foi possível obter dados do formulário');
        } catch (erroForm) {
            console.error('Erro ao obter dados do formulário:', erroForm);
            return;
        }
        
        // 5. Garantir que as estratégias sejam extraídas do formulário
        let estrategiasConfiguradas;
        if (window.SimuladorFluxoCaixa.extrairConfiguracoesEstrategias) {
            estrategiasConfiguradas = window.SimuladorFluxoCaixa.extrairConfiguracoesEstrategias(dadosAninhados);
            console.log('Estratégias extraídas:', estrategiasConfiguradas);
            
            // Adicionar as estratégias aos dados aninhados para uso posterior
            if (!dadosAninhados.estrategias && estrategiasConfiguradas) {
                dadosAninhados.estrategias = estrategiasConfiguradas;
            }
        }
        
        // 6. Verificar se há estratégias ativas antes de prosseguir
        const temEstrategiasAtivas = estrategiasConfiguradas && 
                                   Object.values(estrategiasConfiguradas)
                                   .some(e => e && e.ativar === true);
        
        if (!temEstrategiasAtivas) {
            console.warn('Nenhuma estratégia ativa configurada');
            // Exibir aviso apenas se já houver uma simulação de base
            const divResultados = document.getElementById('resultados-estrategias');
            if (divResultados) {
                divResultados.innerHTML = `
                    <div class="alert alert-info">
                        <strong>Informação:</strong> Selecione pelo menos uma estratégia de mitigação ativando-a 
                        com o seletor "Ativar Estratégia" em cada seção e configure seus parâmetros.
                    </div>
                    <p class="text-muted">Após ativar estratégias, clique em "Simular Estratégias" para visualizar os resultados.</p>
                `;
            }
            return;
        }
        
        // 7. Re-executar simulação com as estratégias atuais
        // Mostrar indicador de carregamento, se existir
        const loader = document.getElementById('estrategias-loader');
        if (loader) loader.style.display = 'block';
        
        // Chamar a simulação de estratégias com tratamento explícito de erro
        const resultadoEstrategias = window.SimuladorFluxoCaixa.simularEstrategias();
        
        // Ocultar indicador de carregamento
        if (loader) loader.style.display = 'none';
        
        // 8. Verificar se obteve resultados
        if (!resultadoEstrategias) {
            console.error('Não foi possível obter resultados da simulação de estratégias');
            // Exibir mensagem ao usuário
            const divResultados = document.getElementById('resultados-estrategias');
            if (divResultados && !divResultados.querySelector('.alert-danger')) {
                divResultados.innerHTML = `
                    <div class="alert alert-danger">
                        <strong>Erro:</strong> Não foi possível calcular os resultados das estratégias.
                        <br>Verifique se todos os campos estão preenchidos corretamente e tente novamente.
                    </div>
                `;
            }
            return;
        }
        
        // 9. Atualizar gráficos de estratégias apenas se houver resultados
        if (typeof window.ChartManager !== 'undefined' && 
            typeof window.ChartManager.renderizarGraficoEstrategias === 'function' &&
            resultadoEstrategias && window.resultadosSimulacao.impactoBase) {
            
            try {
                window.ChartManager.renderizarGraficoEstrategias(
                    resultadoEstrategias, 
                    window.resultadosSimulacao.impactoBase
                );
                console.log('Gráficos de estratégias renderizados com sucesso');
            } catch (erroChart) {
                console.warn('Erro ao renderizar gráficos de estratégias:', erroChart);
            }
        } else {
            console.warn('ChartManager não disponível ou dados insuficientes para renderizar gráficos');
        }
        
        console.log('Visualização de estratégias atualizada com sucesso');
    } catch (erro) {
        console.error('Erro ao atualizar visualização de estratégias:', erro);
        // Exibir mensagem ao usuário
        const divResultados = document.getElementById('resultados-estrategias');
        if (divResultados) {
            if (!divResultados.querySelector('.alert-danger')) {
                divResultados.innerHTML = `
                    <div class="alert alert-danger">
                        <strong>Erro:</strong> Ocorreu um problema ao atualizar as estratégias.
                        <br>Detalhes: ${erro.message}
                    </div>
                ` + (divResultados.innerHTML || '');
            }
        }
    }
}

// Adicionar estilos para a visualização de estratégias
function adicionarEstilosEstrategias() {
    // Verificar se os estilos já foram adicionados
    if (document.getElementById('estilos-estrategias')) {
        return;
    }
    
    const estilos = `
    <style id="estilos-estrategias">
        .resumo-estrategias {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
            border: 1px solid #ddd;
        }
        
        .resumo-valores {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
            margin: 15px 0;
        }
        
        .resumo-item {
            background-color: #fff;
            padding: 10px;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .detalhamento-estrategias {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        .detalhamento-estrategias th,
        .detalhamento-estrategias td {
            padding: 8px 12px;
            border: 1px solid #ddd;
            text-align: left;
        }
        
        .detalhamento-estrategias th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        
        .detalhamento-estrategias tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .valor-positivo {
            color: #28a745;
        }
        
        .valor-negativo {
            color: #dc3545;
        }
        
        .resumo-geral {
            background-color: #e9f7ef;
            padding: 10px 15px;
            border-radius: 4px;
            margin-bottom: 15px;
            border-left: 4px solid #28a745;
        }
    </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', estilos);
}

// Chamar a função no momento apropriado
document.addEventListener('DOMContentLoaded', function() {
    adicionarEstilosEstrategias();
});