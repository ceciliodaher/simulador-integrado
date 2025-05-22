// Verificação imediata
console.log('main.js carregado, SimuladorFluxoCaixa disponível?', !!window.SimuladorFluxoCaixa);
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, SimuladorFluxoCaixa disponível?', !!window.SimuladorFluxoCaixa);
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
    
    // Inicializa o ImportacaoController
    if (typeof ImportacaoController !== 'undefined' && ImportacaoController.inicializar) {
        ImportacaoController.inicializar();
    }
    
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
                let dadosAninhados = window.DataManager.obterDadosDoFormulario();
                console.log('Dados obtidos do formulário (estrutura aninhada):', dadosAninhados);

                // NOVA FUNCIONALIDADE: Integrar dados do SPED se disponíveis
                dadosAninhados = integrarDadosSpedNaEstruturaPadrao(dadosAninhados);

                // Verificar se há dados do SPED e notificar
                if (dadosAninhados.dadosSpedImportados) {
                    console.log('Dados do SPED detectados e integrados à simulação');
                    adicionarNotificacaoSped();
                }

                // Se o repositório estiver disponível, atualizar com os novos dados
                if (typeof SimuladorRepository !== 'undefined') {
                    Object.keys(dadosAninhados).forEach(secao => {
                        if (dadosAninhados[secao]) {
                            SimuladorRepository.atualizarSecao(secao, dadosAninhados[secao]);
                        }
                    });
                    console.log('Repositório atualizado com os dados do formulário e SPED');
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
            console.log('Botão Exportar PDF clicado');
            if (typeof window.ExportTools !== 'undefined' && typeof window.ExportTools.exportarParaPDF === 'function') {
                window.ExportTools.exportarParaPDF();
            } else {
                console.error('ExportTools não disponível ou método exportarParaPDF não encontrado');
                alert('Ferramenta de exportação PDF não está disponível no momento.');
            }
        });
    } else {
        console.warn('Botão Exportar PDF não encontrado no DOM');
    }

    const btnExportarExcel = document.getElementById('btn-exportar-excel');
    if (btnExportarExcel) {
        btnExportarExcel.addEventListener('click', function() {
            console.log('Botão Exportar Excel clicado');
            if (typeof window.ExportTools !== 'undefined' && typeof window.ExportTools.exportarParaExcel === 'function') {
                window.ExportTools.exportarParaExcel();
            } else {
                console.error('ExportTools não disponível ou método exportarParaExcel não encontrado');
                alert('Ferramenta de exportação Excel não está disponível no momento.');
            }
        });
    } else {
        console.warn('Botão Exportar Excel não encontrado no DOM');
    }
    
    const btnExportarMemoria = document.getElementById('btn-exportar-memoria');
    if (btnExportarMemoria) {
        btnExportarMemoria.addEventListener('click', function() {
            if (typeof ExportTools !== 'undefined') {
                ExportTools.exportarMemoriaCalculo();
            }
        });
    }
    
    // Eventos para exportação de estratégias
    const btnExportarEstrategiasPDF = document.getElementById('btn-exportar-estrategias-pdf');
    if (btnExportarEstrategiasPDF) {
        btnExportarEstrategiasPDF.addEventListener('click', function() {
            console.log('Botão Exportar Estratégias PDF clicado');
            if (typeof window.ExportTools !== 'undefined' && typeof window.ExportTools.exportarParaPDF === 'function') {
                window.ExportTools.exportarParaPDF();
            } else {
                console.error('ExportTools não disponível ou método exportarParaPDF não encontrado');
                alert('Ferramenta de exportação PDF não está disponível no momento.');
            }
        });
    }

    const btnExportarEstrategiasExcel = document.getElementById('btn-exportar-estrategias-excel');
    if (btnExportarEstrategiasExcel) {
        btnExportarEstrategiasExcel.addEventListener('click', function() {
            console.log('Botão Exportar Estratégias Excel clicado');
            if (typeof window.ExportTools !== 'undefined' && typeof window.ExportTools.exportarParaExcel === 'function') {
                window.ExportTools.exportarParaExcel();
            } else {
                console.error('ExportTools não disponível ou método exportarParaExcel não encontrado');
                alert('Ferramenta de exportação Excel não está disponível no momento.');
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
            // Corrigir a referência para a função
            if (window.SimuladorFluxoCaixa && typeof window.SimuladorFluxoCaixa.simularEstrategias === 'function') {
                window.SimuladorFluxoCaixa.simularEstrategias();
            } else {
                console.error('Função de simulação de estratégias não encontrada');
                alert('Não foi possível simular estratégias. Verifique se todos os módulos foram carregados corretamente.');
            }
        });
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
 * Adiciona notificação visual sobre uso de dados do SPED
 */
function adicionarNotificacaoSped() {
    // Remover notificação anterior se existir
    const notificacaoExistente = document.querySelector('.notificacao-sped');
    if (notificacaoExistente) {
        notificacaoExistente.remove();
    }

    // Criar nova notificação
    const notificacao = document.createElement('div');
    notificacao.className = 'alert alert-info notificacao-sped';
    notificacao.innerHTML = `
        <strong><i class="icon-info-circle"></i> Dados SPED Integrados:</strong> 
        A simulação está utilizando dados tributários reais extraídos dos arquivos SPED importados, 
        proporcionando maior precisão nos cálculos.
    `;

    // Inserir no início da área de resultados
    const divResultados = document.getElementById('resultados');
    if (divResultados) {
        divResultados.insertBefore(notificacao, divResultados.firstChild);
    }
}

/**
 * Atualiza os resultados exibidos com base no ano selecionado
 */
function atualizarResultadosPorAno() {
    // Obter o ano selecionado
    const anoSelecionado = document.getElementById('ano-visualizacao').value;
    
    // Verificar se há resultados carregados
    if (!window.SimuladorFluxoCaixa || !window.resultadosSimulacao) {
        console.warn('Não há resultados disponíveis para atualizar.');
        return;
    }
    
    const resultadosAnuais = window.resultadosSimulacao.projecaoTemporal?.resultadosAnuais;
    if (!resultadosAnuais || !resultadosAnuais[anoSelecionado]) {
        console.warn(`Não há resultados disponíveis para o ano ${anoSelecionado}.`);
        return;
    }
    
    const resultadoAno = resultadosAnuais[anoSelecionado];
    
    // Formatador de moeda para garantir consistência
    const formatarMoeda = window.CalculationCore.formatarMoeda;
    
    // Atualizar valores na interface - Comparação de Sistemas Tributários
    document.getElementById('tributo-atual').textContent = formatarMoeda(resultadoAno.resultadoAtual?.impostos?.total || 0);
    document.getElementById('tributo-dual').textContent = formatarMoeda(resultadoAno.resultadoSplitPayment?.impostos?.total || 0);
    document.getElementById('tributo-diferenca').textContent = formatarMoeda(
        (resultadoAno.resultadoSplitPayment?.impostos?.total || 0) - 
        (resultadoAno.resultadoAtual?.impostos?.total || 0)
    );
    
    // Valores para IVA sem Split
    document.getElementById('tributo-iva-sem-split').textContent = formatarMoeda(resultadoAno.resultadoIVASemSplit?.impostos?.total || 0);
    document.getElementById('tributo-diferenca-iva-sem-split').textContent = formatarMoeda(
        (resultadoAno.resultadoIVASemSplit?.impostos?.total || 0) - 
        (resultadoAno.resultadoAtual?.impostos?.total || 0)
    );
    
    // Atualizar valores na interface - Impacto no Capital de Giro
    document.getElementById('capital-giro-atual').textContent = formatarMoeda(resultadoAno.resultadoAtual?.capitalGiroDisponivel || 0);
    document.getElementById('capital-giro-iva-sem-split').textContent = formatarMoeda(resultadoAno.resultadoIVASemSplit?.capitalGiroDisponivel || 0);
    document.getElementById('capital-giro-split').textContent = formatarMoeda(resultadoAno.resultadoSplitPayment?.capitalGiroDisponivel || 0);
    document.getElementById('capital-giro-impacto').textContent = formatarMoeda(resultadoAno.diferencaCapitalGiro || 0);
    document.getElementById('capital-giro-impacto-iva-sem-split').textContent = formatarMoeda(resultadoAno.diferencaCapitalGiroIVASemSplit || 0);
    document.getElementById('capital-giro-necessidade').textContent = formatarMoeda(resultadoAno.necessidadeAdicionalCapitalGiro || 0);
    
    // Atualizar valores na interface - Impacto na Margem Operacional
    document.getElementById('margem-atual').textContent = ((resultadoAno.margemOperacionalOriginal || 0) * 100).toFixed(2) + '%';
    document.getElementById('margem-ajustada').textContent = ((resultadoAno.margemOperacionalAjustada || 0) * 100).toFixed(2) + '%';
    document.getElementById('margem-impacto').textContent = (resultadoAno.impactoMargem || 0).toFixed(2) + ' p.p.';
    
    // Atualizar valores na interface - Análise de Impacto Detalhada
    document.getElementById('percentual-impacto').textContent = (resultadoAno.percentualImpacto || 0).toFixed(2) + '%';
    document.getElementById('impacto-dias-faturamento').textContent = (resultadoAno.impactoDiasFaturamento || 0).toFixed(1) + ' dias';
    
    // Atualizar valores na interface - Projeção Temporal do Impacto
    const projecao = window.resultadosSimulacao.projecaoTemporal?.impactoAcumulado;
    if (projecao) {
        document.getElementById('total-necessidade-giro').textContent = formatarMoeda(projecao.totalNecessidadeCapitalGiro || 0);
        document.getElementById('custo-financeiro-total').textContent = formatarMoeda(projecao.custoFinanceiroTotal || 0);
    }
}

function atualizarInterface(resultado) {
    console.log('Atualizando interface com resultados');
    
    if (!resultado || !resultado.impactoBase) {
        console.error('Resultados inválidos ou incompletos:', resultado);
        alert('Não foi possível processar os resultados da simulação. Verifique o console para detalhes.');
        return;
    }
    
    try {
        window.resultadosSimulacao = resultado;
        
        const formatarMoeda = window.DataManager.formatarMoeda;
        const formatarPercentual = window.DataManager.formatarPercentual;
        
        const splitPaymentConsiderado = resultado.impactoBase.splitPaymentConsiderado !== false;
        
        const divResultados = document.getElementById('resultados');
        if (divResultados) {
            const avisoExistente = divResultados.querySelector('.split-payment-notice');
            if (avisoExistente) avisoExistente.remove();
            
            if (!splitPaymentConsiderado) {
                const aviso = document.createElement('div');
                aviso.className = 'alert alert-warning split-payment-notice';
                aviso.innerHTML = '<strong>Atenção:</strong> Simulação executada sem considerar o mecanismo de Split Payment.';
                divResultados.insertBefore(aviso, divResultados.firstChild);
            }
        }
        
        const seletorAno = document.getElementById('ano-visualizacao');
        const anoSelecionado = seletorAno ? parseInt(seletorAno.value) : resultado.projecaoTemporal?.parametros?.anoInicial || 2026;
        
        const dadosAno = obterDadosAnoSeguro(resultado, anoSelecionado);
        
        // Atualizar elementos existentes
        document.getElementById('tributo-atual').textContent = formatarMoeda(dadosAno.valorImpostoAtual);
        document.getElementById('tributo-dual').textContent = formatarMoeda(dadosAno.valorImpostoSplit);
        document.getElementById('tributo-diferenca').textContent = formatarMoeda(dadosAno.diferencaImposto);
        document.getElementById('tributo-iva-sem-split').textContent = formatarMoeda(dadosAno.valorImpostoIVASemSplit);
        document.getElementById('tributo-diferenca-iva-sem-split').textContent = formatarMoeda(dadosAno.diferencaImpostoIVASemSplit);
        
        // Atualizar capital de giro
        document.getElementById('capital-giro-atual').textContent = formatarMoeda(dadosAno.capitalGiroAtual);
        document.getElementById('capital-giro-iva-sem-split').textContent = formatarMoeda(dadosAno.capitalGiroIVASemSplit);
        document.getElementById('capital-giro-split').textContent = formatarMoeda(dadosAno.capitalGiroSplit);
        document.getElementById('capital-giro-impacto').textContent = formatarMoeda(dadosAno.diferencaCapitalGiro);
        document.getElementById('capital-giro-impacto-iva-sem-split').textContent = formatarMoeda(dadosAno.diferencaCapitalGiroIVASemSplit);
        document.getElementById('capital-giro-necessidade').textContent = formatarMoeda(dadosAno.necessidadeAdicionalCapitalGiro);
        
        aplicarClassesCondicionais(dadosAno);
        
        // Atualizar margem operacional
        document.getElementById('margem-atual').textContent = formatarPercentual(dadosAno.margemOriginal);
        document.getElementById('margem-ajustada').textContent = formatarPercentual(dadosAno.margemAjustada);
        document.getElementById('margem-impacto').textContent = formatarPercentual(dadosAno.impactoMargem);
        
        // Atualizar análise detalhada
        document.getElementById('percentual-impacto').textContent = formatarPercentual(dadosAno.percentualImpacto);
        document.getElementById('impacto-dias-faturamento').textContent = (dadosAno.impactoDiasFaturamento || 0).toFixed(1) + ' dias';
        
        // Atualizar projeção temporal
        document.getElementById('total-necessidade-giro').textContent = formatarMoeda(dadosAno.totalNecessidadeGiro);
        document.getElementById('custo-financeiro-total').textContent = formatarMoeda(dadosAno.custoFinanceiroTotal);
        
        // NOVA FUNCIONALIDADE: Atualizar tabela de transição
        atualizarTabelaTransicao(resultado);
        
        // NOVA FUNCIONALIDADE: Atualizar débitos, créditos e alíquotas efetivas
        atualizarComposicaoTributaria(resultado, anoSelecionado);
        
        const divResultadosDetalhados = document.getElementById('resultados-detalhados');
        if (divResultadosDetalhados) {
            divResultadosDetalhados.style.display = 'block';
        }
        
        // Mostrar seções de transição
        const divTransicao = document.getElementById('transicao-tributaria');
        const divDetalhamento = document.getElementById('detalhamento-impostos-transicao');
        if (divTransicao) divTransicao.style.display = 'block';
        if (divDetalhamento) divDetalhamento.style.display = 'block';
        
        window.memoriaCalculoSimulacao = resultado.memoriaCalculo;
        
        garantirEstruturaExportacao(resultado);
        
        window.DataManager.logTransformacao(
            resultado, 
            'Interface Atualizada', 
            'Atualização da Interface com Resultados'
        );
        
        console.log('Interface atualizada com sucesso');
    } catch (erro) {
        console.error('Erro ao atualizar interface:', erro);
        alert('Ocorreu um erro ao exibir os resultados: ' + erro.message);
    }
}

/**
 * Obtém dados do ano de forma segura, verificando múltiplas estruturas
 * @param {Object} resultado - Resultado da simulação
 * @param {number} ano - Ano selecionado
 * @returns {Object} Dados do ano com valores seguros
 */
function obterDadosAnoSeguro(resultado, ano) {
    // Valores padrão seguros
    const dadosSeguro = {
        valorImpostoAtual: 0,
        valorImpostoSplit: 0,
        valorImpostoIVASemSplit: 0,
        diferencaImposto: 0,
        diferencaImpostoIVASemSplit: 0,
        capitalGiroAtual: 0,
        capitalGiroSplit: 0,
        capitalGiroIVASemSplit: 0,
        diferencaCapitalGiro: 0,
        diferencaCapitalGiroIVASemSplit: 0,
        necessidadeAdicionalCapitalGiro: 0,
        margemOriginal: 0,
        margemAjustada: 0,
        impactoMargem: 0,
        percentualImpacto: 0,
        impactoDiasFaturamento: 0,
        totalNecessidadeGiro: 0,
        custoFinanceiroTotal: 0
    };
    
    try {
        // Tentar obter dados anuais específicos
        if (resultado.projecaoTemporal?.resultadosAnuais?.[ano]) {
            const dadosAno = resultado.projecaoTemporal.resultadosAnuais[ano];
            
            dadosSeguro.valorImpostoAtual = dadosAno.resultadoAtual?.impostos?.total || dadosAno.resultadoAtual?.valorImpostoTotal || 0;
            dadosSeguro.valorImpostoSplit = dadosAno.resultadoSplitPayment?.impostos?.total || dadosAno.resultadoSplitPayment?.valorImpostoTotal || 0;
            dadosSeguro.valorImpostoIVASemSplit = dadosAno.resultadoIVASemSplit?.impostos?.total || dadosAno.resultadoIVASemSplit?.valorImpostoTotal || dadosSeguro.valorImpostoAtual;
            
            dadosSeguro.capitalGiroAtual = dadosAno.resultadoAtual?.capitalGiroDisponivel || 0;
            dadosSeguro.capitalGiroSplit = dadosAno.resultadoSplitPayment?.capitalGiroDisponivel || 0;
            dadosSeguro.capitalGiroIVASemSplit = dadosAno.resultadoIVASemSplit?.capitalGiroDisponivel || dadosSeguro.capitalGiroAtual;
            
            dadosSeguro.diferencaCapitalGiro = dadosAno.diferencaCapitalGiro || (dadosSeguro.capitalGiroSplit - dadosSeguro.capitalGiroAtual);
            dadosSeguro.diferencaCapitalGiroIVASemSplit = dadosAno.diferencaCapitalGiroIVASemSplit || (dadosSeguro.capitalGiroIVASemSplit - dadosSeguro.capitalGiroAtual);
            dadosSeguro.necessidadeAdicionalCapitalGiro = dadosAno.necessidadeAdicionalCapitalGiro || Math.abs(dadosSeguro.diferencaCapitalGiro) * 1.2;
            
            dadosSeguro.percentualImpacto = dadosAno.percentualImpacto || 0;
            dadosSeguro.impactoDiasFaturamento = dadosAno.impactoDiasFaturamento || 0;
        } else {
            // Usar dados do impacto base como fallback
            const impactoBase = resultado.impactoBase;
            
            dadosSeguro.valorImpostoAtual = impactoBase.resultadoAtual?.impostos?.total || impactoBase.resultadoAtual?.valorImpostoTotal || 0;
            dadosSeguro.valorImpostoSplit = impactoBase.resultadoSplitPayment?.impostos?.total || impactoBase.resultadoSplitPayment?.valorImpostoTotal || 0;
            dadosSeguro.valorImpostoIVASemSplit = impactoBase.resultadoIVASemSplit?.impostos?.total || impactoBase.resultadoIVASemSplit?.valorImpostoTotal || dadosSeguro.valorImpostoAtual;
            
            dadosSeguro.capitalGiroAtual = impactoBase.resultadoAtual?.capitalGiroDisponivel || 0;
            dadosSeguro.capitalGiroSplit = impactoBase.resultadoSplitPayment?.capitalGiroDisponivel || 0;
            dadosSeguro.capitalGiroIVASemSplit = impactoBase.resultadoIVASemSplit?.capitalGiroDisponivel || dadosSeguro.capitalGiroAtual;
            
            dadosSeguro.diferencaCapitalGiro = impactoBase.diferencaCapitalGiro || 0;
            dadosSeguro.diferencaCapitalGiroIVASemSplit = impactoBase.diferencaCapitalGiroIVASemSplit || 0;
            dadosSeguro.necessidadeAdicionalCapitalGiro = impactoBase.necessidadeAdicionalCapitalGiro || 0;
            
            dadosSeguro.margemOriginal = (impactoBase.margemOperacionalOriginal || 0) * 100;
            dadosSeguro.margemAjustada = (impactoBase.margemOperacionalAjustada || 0) * 100;
            dadosSeguro.impactoMargem = impactoBase.impactoMargem || 0;
            
            dadosSeguro.percentualImpacto = impactoBase.percentualImpacto || 0;
            dadosSeguro.impactoDiasFaturamento = impactoBase.impactoDiasFaturamento || 0;
        }
        
        // Calcular diferenças de impostos
        dadosSeguro.diferencaImposto = dadosSeguro.valorImpostoSplit - dadosSeguro.valorImpostoAtual;
        dadosSeguro.diferencaImpostoIVASemSplit = dadosSeguro.valorImpostoIVASemSplit - dadosSeguro.valorImpostoAtual;
        
        // Obter dados da projeção temporal
        if (resultado.projecaoTemporal?.impactoAcumulado) {
            dadosSeguro.totalNecessidadeGiro = resultado.projecaoTemporal.impactoAcumulado.totalNecessidadeCapitalGiro || 0;
            dadosSeguro.custoFinanceiroTotal = resultado.projecaoTemporal.impactoAcumulado.custoFinanceiroTotal || 0;
        }
        
    } catch (erro) {
        console.warn('Erro ao obter dados do ano, usando valores padrão:', erro);
    }
    
    return dadosSeguro;
}

/**
 * Aplica classes CSS condicionais baseadas nos valores
 * @param {Object} dadosAno - Dados do ano
 */
function aplicarClassesCondicionais(dadosAno) {
    const impactoElement = document.getElementById('capital-giro-impacto');
    if (impactoElement) {
        impactoElement.classList.remove('valor-negativo', 'valor-positivo');
        if (dadosAno.diferencaCapitalGiro < 0) {
            impactoElement.classList.add('valor-negativo');
        } else if (dadosAno.diferencaCapitalGiro > 0) {
            impactoElement.classList.add('valor-positivo');
        }
    }
    
    const impactoIVASemSplitElement = document.getElementById('capital-giro-impacto-iva-sem-split');
    if (impactoIVASemSplitElement) {
        impactoIVASemSplitElement.classList.remove('valor-negativo', 'valor-positivo');
        if (dadosAno.diferencaCapitalGiroIVASemSplit < 0) {
            impactoIVASemSplitElement.classList.add('valor-negativo');
        } else if (dadosAno.diferencaCapitalGiroIVASemSplit > 0) {
            impactoIVASemSplitElement.classList.add('valor-positivo');
        }
    }
}

/**
 * Garante que existe estrutura adequada para exportação
 * @param {Object} resultado - Resultado da simulação
 */
function garantirEstruturaExportacao(resultado) {
    if (!resultado.resultadosExportacao && resultado.projecaoTemporal?.resultadosAnuais) {
        const anos = Object.keys(resultado.projecaoTemporal.resultadosAnuais).sort();
        const resultadosPorAno = {};
        
        anos.forEach(ano => {
            const dadosAno = resultado.projecaoTemporal.resultadosAnuais[ano];
            resultadosPorAno[ano] = {
                capitalGiroSplitPayment: dadosAno.resultadoSplitPayment?.capitalGiroDisponivel || 0,
                capitalGiroAtual: dadosAno.resultadoAtual?.capitalGiroDisponivel || 0,
                capitalGiroIVASemSplit: dadosAno.resultadoIVASemSplit?.capitalGiroDisponivel || dadosAno.resultadoAtual?.capitalGiroDisponivel || 0,
                diferenca: dadosAno.diferencaCapitalGiro || 0,
                diferencaIVASemSplit: dadosAno.diferencaCapitalGiroIVASemSplit || 0,
                percentualImpacto: dadosAno.percentualImpacto || 0,
                impostoDevido: dadosAno.resultadoSplitPayment?.impostos?.total || 0,
                sistemaAtual: dadosAno.resultadoAtual?.impostos?.total || 0
            };
        });
        
        resultado.resultadosExportacao = {
            anos: anos,
            resultadosPorAno: resultadosPorAno,
            resumo: {
                variacaoTotal: Object.values(resultadosPorAno).reduce((acc, ano) => acc + ano.diferenca, 0),
                tendenciaGeral: Object.values(resultadosPorAno).reduce((acc, ano) => acc + ano.diferenca, 0) > 0 ? "aumento" : "redução"
            }
        };
        
        console.log('Estrutura de exportação gerada automaticamente');
    }
}

function atualizarInterface(resultado) {
    console.log('Atualizando interface com resultados');
    
    // Verifica se temos resultados válidos
    if (!resultado || !resultado.impactoBase) {
        console.error('Resultados inválidos ou incompletos:', resultado);
        alert('Não foi possível processar os resultados da simulação. Verifique o console para detalhes.');
        return;
    }
    
    try {
        // Armazenar resultados globalmente para acesso posterior
        window.resultadosSimulacao = resultado;
        
        // Usar sempre as funções de formatação do DataManager
        const formatarMoeda = window.DataManager.formatarMoeda;
        const formatarPercentual = window.DataManager.formatarPercentual;
        
        // Verificar se split-payment foi considerado
        const splitPaymentConsiderado = resultado.impactoBase.splitPaymentConsiderado !== false;
        
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
        const anoSelecionado = seletorAno ? parseInt(seletorAno.value) : resultado.projecaoTemporal?.parametros?.anoInicial || 2026;
        
        // Atualizar com dados robustos, verificando múltiplas estruturas possíveis
        const dadosAno = obterDadosAnoSeguro(resultado, anoSelecionado);
        
        // Atualizar elementos de comparação de sistemas tributários
        document.getElementById('tributo-atual').textContent = formatarMoeda(dadosAno.valorImpostoAtual);
        document.getElementById('tributo-dual').textContent = formatarMoeda(dadosAno.valorImpostoSplit);
        document.getElementById('tributo-diferenca').textContent = formatarMoeda(dadosAno.diferencaImposto);
        document.getElementById('tributo-iva-sem-split').textContent = formatarMoeda(dadosAno.valorImpostoIVASemSplit);
        document.getElementById('tributo-diferenca-iva-sem-split').textContent = formatarMoeda(dadosAno.diferencaImpostoIVASemSplit);
        
        // Atualizar elementos de impacto no capital de giro
        document.getElementById('capital-giro-atual').textContent = formatarMoeda(dadosAno.capitalGiroAtual);
        document.getElementById('capital-giro-iva-sem-split').textContent = formatarMoeda(dadosAno.capitalGiroIVASemSplit);
        document.getElementById('capital-giro-split').textContent = formatarMoeda(dadosAno.capitalGiroSplit);
        document.getElementById('capital-giro-impacto').textContent = formatarMoeda(dadosAno.diferencaCapitalGiro);
        document.getElementById('capital-giro-impacto-iva-sem-split').textContent = formatarMoeda(dadosAno.diferencaCapitalGiroIVASemSplit);
        document.getElementById('capital-giro-necessidade').textContent = formatarMoeda(dadosAno.necessidadeAdicionalCapitalGiro);
        
        // Adicionar classe CSS baseada no valor
        aplicarClassesCondicionais(dadosAno);
        
        // Atualizar elementos de impacto na margem operacional
        document.getElementById('margem-atual').textContent = formatarPercentual(dadosAno.margemOriginal);
        document.getElementById('margem-ajustada').textContent = formatarPercentual(dadosAno.margemAjustada);
        document.getElementById('margem-impacto').textContent = formatarPercentual(dadosAno.impactoMargem);
        
        // Atualizar elementos da análise de impacto detalhada
        document.getElementById('percentual-impacto').textContent = formatarPercentual(dadosAno.percentualImpacto);
        document.getElementById('impacto-dias-faturamento').textContent = (dadosAno.impactoDiasFaturamento || 0).toFixed(1) + ' dias';
        
        // Atualizar elementos da projeção temporal do impacto
        document.getElementById('total-necessidade-giro').textContent = formatarMoeda(dadosAno.totalNecessidadeGiro);
        document.getElementById('custo-financeiro-total').textContent = formatarMoeda(dadosAno.custoFinanceiroTotal);
        
        // Mostrar div de resultados detalhados
        const divResultadosDetalhados = document.getElementById('resultados-detalhados');
        if (divResultadosDetalhados) {
            divResultadosDetalhados.style.display = 'block';
        }
        
        // Armazenar resultados para memória de cálculo
        window.memoriaCalculoSimulacao = resultado.memoriaCalculo;
        
        // Garantir que temos estrutura de exportação
        garantirEstruturaExportacao(resultado);
        
        // Registrar log de diagnóstico
        window.DataManager.logTransformacao(
            resultado, 
            'Interface Atualizada', 
            'Atualização da Interface com Resultados'
        );
        
        console.log('Interface atualizada com sucesso');
    } catch (erro) {
        console.error('Erro ao atualizar interface:', erro);
        alert('Ocorreu um erro ao exibir os resultados: ' + erro.message);
    }
}

// Exportar a função para o escopo global
window.atualizarInterface = atualizarInterface;

// Exportar a função para o escopo global
window.atualizarInterface = atualizarInterface;

/**
 * Atualiza os resultados de estratégias conforme o ano selecionado
 */
function atualizarVisualizacaoEstrategias() {
    console.log('MAIN.JS: Iniciando atualização de visualização de estratégias...');

    // 1. Verificar se o SimuladorFluxoCaixa está disponível
    if (!window.SimuladorFluxoCaixa) {
        console.error('MAIN.JS: SimuladorFluxoCaixa não encontrado.');
        const divResultados = document.getElementById('resultados-estrategias');
        if (divResultados) {
            divResultados.innerHTML = `<div class="alert alert-danger"><strong>Erro Crítico:</strong> Componente de simulação não carregado.</div>`;
        }
        return;
    }

    try {
        const divResultados = document.getElementById('resultados-estrategias');
        if (!divResultados) {
            console.error('MAIN.JS: Elemento #resultados-estrategias não encontrado no DOM.');
            return;
        }

        // 2. Verificar se há resultados da SIMULAÇÃO PRINCIPAL disponíveis
        if (!window.resultadosSimulacao || !window.resultadosSimulacao.impactoBase) {
            console.warn('MAIN.JS: Resultados da simulação principal não encontrados. Solicitando execução.');
            divResultados.innerHTML = `
                <div class="alert alert-warning">
                    <strong>Atenção:</strong> É necessário executar uma simulação na aba "Simulação" 
                    antes de visualizar ou aplicar estratégias de mitigação.
                </div>
                <p class="text-muted">Acesse a aba "Simulação", configure os parâmetros e clique em 
                "Simular Impacto no Fluxo de Caixa".</p>
            `;
            // Limpar ou inicializar gráficos em estado vazio
            if (typeof window.ChartManager !== 'undefined' && typeof window.ChartManager.renderizarGraficoEstrategias === 'function') {
                window.ChartManager.renderizarGraficoEstrategias(null, null);
            }
            return;
        }

        // 3. Verificar se existem resultados de estratégias usando a classe específica
        const hasActualResults = divResultados.querySelector('.estrategias-resumo');
        
        // 4. Se existem resultados, apenas atualizar os gráficos (não sobrescrever HTML)
        if (hasActualResults) {
            console.log('MAIN.JS: Resultados detalhados de estratégias encontrados. Atualizando visualização...');
            
            // Atualizar visualização para o ano selecionado (se aplicável)
            const seletorAno = document.getElementById('ano-visualizacao-estrategias');
            if (seletorAno) {
                const anoSelecionado = parseInt(seletorAno.value);
                console.log(`MAIN.JS: Ano de visualização selecionado: ${anoSelecionado}`);
                
                // Implementar lógica específica para atualização por ano, se necessário
                // ...
            }
            
            // Renderizar novamente os gráficos com os resultados existentes
            if (window.lastStrategyResults && window.resultadosSimulacao && window.resultadosSimulacao.impactoBase &&
                typeof window.ChartManager !== 'undefined' && 
                typeof window.ChartManager.renderizarGraficoEstrategias === 'function') {
                
                console.log('MAIN.JS: Re-renderizando gráficos de estratégias com dados existentes.');
                try {
                    window.ChartManager.renderizarGraficoEstrategias(
                        window.lastStrategyResults, 
                        window.resultadosSimulacao.impactoBase
                    );
                } catch (erroChart) {
                    console.warn('MAIN.JS: Erro ao re-renderizar gráficos de estratégias:', erroChart);
                }
            } else {
                console.warn('MAIN.JS: Dados insuficientes para re-renderizar gráficos.');
            }
            
            return;
        }

        // 5. Se não há resultados, exibir mensagem informativa
        console.log('MAIN.JS: Nenhum resultado detalhado de estratégia encontrado. Exibindo mensagem informativa.');
        
        // Verificar se há estratégias ativas configuradas
        const dadosAninhados = window.DataManager.obterDadosDoFormulario();
        let temEstrategiasAtivas = false;
        
        if (dadosAninhados && dadosAninhados.estrategias) {
            temEstrategiasAtivas = Object.values(dadosAninhados.estrategias).some(
                estrategia => estrategia && estrategia.ativar === true
            );
        }
        
        // Exibir mensagem adequada com base no estado das estratégias
        if (temEstrategiasAtivas) {
            divResultados.innerHTML = `
                <div class="alert alert-info">
                    <strong>Informação:</strong> Estratégias de mitigação configuradas. 
                    Clique no botão "Simular Estratégias" para visualizar os resultados.
                </div>
            `;
        } else {
            divResultados.innerHTML = `
                <div class="alert alert-info">
                    <strong>Informação:</strong> Selecione pelo menos uma estratégia de mitigação ativando-a 
                    com o seletor "Ativar Estratégia" em cada seção e configure seus parâmetros.
                </div>
                <p class="text-muted">Após ativar estratégias e configurar seus parâmetros, clique no botão "Simular Estratégias" para visualizar os resultados.</p>
            `;
        }
        
        // Inicializar gráficos em estado vazio ou com dados básicos
        if (typeof window.ChartManager !== 'undefined' && 
            typeof window.ChartManager.renderizarGraficoEstrategias === 'function') {
            window.ChartManager.renderizarGraficoEstrategias(null, window.resultadosSimulacao.impactoBase);
        }

        console.log('MAIN.JS: Visualização de estratégias atualizada com sucesso.');

    } catch (erro) {
        console.error('MAIN.JS: Erro fatal ao tentar atualizar visualização de estratégias:', erro);
        const divResultados = document.getElementById('resultados-estrategias');
        if (divResultados) {
            divResultados.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Erro Inesperado:</strong> Ocorreu um problema ao tentar preparar a visualização das estratégias.
                    <br>Detalhes: ${erro.message}
                </div>
            `;
        }
    }
}

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
 * Atualiza a tabela de transição tributária
 * @param {Object} resultado - Resultados da simulação
 */
function atualizarTabelaTransicao(resultado) {
    const tabela = document.getElementById('tabela-transicao');
    if (!tabela || !resultado.projecaoTemporal?.resultadosAnuais) return;
    
    const tbody = tabela.querySelector('tbody');
    tbody.innerHTML = '';
    
    const cronograma = {
        2026: 0.10, 2027: 0.25, 2028: 0.40, 2029: 0.55,
        2030: 0.70, 2031: 0.85, 2032: 0.95, 2033: 1.00
    };
    
    const formatarMoeda = window.DataManager.formatarMoeda;
    
    Object.keys(resultado.projecaoTemporal.resultadosAnuais).sort().forEach(ano => {
        const dadosAno = resultado.projecaoTemporal.resultadosAnuais[ano];
        const percIVA = cronograma[ano] || 0;
        const percAtual = 1 - percIVA;
        
        const tributosAtuais = (dadosAno.resultadoAtual?.impostos?.total || 0) * percAtual;
        const ivaTotal = (dadosAno.resultadoSplitPayment?.impostos?.total || 0) * percIVA;
        const totalImpostos = tributosAtuais + ivaTotal;
        
        const faturamento = resultado.memoriaCalculo?.dadosEntrada?.empresa?.faturamento || 0;
        const aliquotaEfetiva = faturamento > 0 ? (totalImpostos / faturamento) * 100 : 0;
        
        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td>${ano}</td>
            <td>${(percAtual * 100).toFixed(1)}%</td>
            <td>${(percIVA * 100).toFixed(1)}%</td>
            <td>${formatarMoeda(tributosAtuais)}</td>
            <td>${formatarMoeda(ivaTotal)}</td>
            <td>${formatarMoeda(totalImpostos)}</td>
            <td>${aliquotaEfetiva.toFixed(2)}%</td>
        `;
        tbody.appendChild(linha);
    });
}

/**
 * Atualiza a composição tributária detalhada
 * @param {Object} resultado - Resultados da simulação
 * @param {number} ano - Ano selecionado
 */
function atualizarComposicaoTributaria(resultado, ano) {
    const formatarMoeda = window.DataManager.formatarMoeda;
    
    // Obter dados do sistema atual para o ano selecionado
    const dadosAno = resultado.projecaoTemporal?.resultadosAnuais?.[ano];
    if (!dadosAno) return;
    
    const impostos = dadosAno.resultadoAtual?.decomposicaoImpostos || {};
    const creditos = dadosAno.resultadoAtual?.decomposicaoCreditos || {};
    const faturamento = resultado.memoriaCalculo?.dadosEntrada?.empresa?.faturamento || 0;
    
    // Atualizar débitos
    document.getElementById('debito-pis').value = formatarMoeda(impostos.pis || 0);
    document.getElementById('debito-cofins').value = formatarMoeda(impostos.cofins || 0);
    document.getElementById('debito-icms').value = formatarMoeda(impostos.icms || 0);
    document.getElementById('debito-ipi').value = formatarMoeda(impostos.ipi || 0);
    document.getElementById('debito-iss').value = formatarMoeda(impostos.iss || 0);
    
    // Atualizar créditos
    document.getElementById('credito-pis').value = formatarMoeda(creditos.pis || 0);
    document.getElementById('credito-cofins').value = formatarMoeda(creditos.cofins || 0);
    document.getElementById('credito-icms').value = formatarMoeda(creditos.icms || 0);
    document.getElementById('credito-ipi').value = formatarMoeda(creditos.ipi || 0);
    document.getElementById('credito-iss').value = formatarMoeda(creditos.iss || 0);
    
    // Calcular e atualizar alíquotas efetivas
    if (faturamento > 0) {
        document.getElementById('aliquota-efetiva-pis').value = ((impostos.pis || 0) / faturamento * 100).toFixed(3);
        document.getElementById('aliquota-efetiva-cofins').value = ((impostos.cofins || 0) / faturamento * 100).toFixed(3);
        document.getElementById('aliquota-efetiva-icms').value = ((impostos.icms || 0) / faturamento * 100).toFixed(3);
        document.getElementById('aliquota-efetiva-ipi').value = ((impostos.ipi || 0) / faturamento * 100).toFixed(3);
        document.getElementById('aliquota-efetiva-iss').value = ((impostos.iss || 0) / faturamento * 100).toFixed(3);
    }
    
    // Calcular totais
    const totalDebitos = Object.values(impostos).reduce((sum, val) => sum + (val || 0), 0);
    const totalCreditos = Object.values(creditos).reduce((sum, val) => sum + (val || 0), 0);
    
    document.getElementById('total-debitos').value = formatarMoeda(totalDebitos);
    document.getElementById('total-creditos').value = formatarMoeda(totalCreditos);
    
    if (faturamento > 0) {
        const aliquotaEfetivaTotal = (totalDebitos / faturamento) * 100;
        document.getElementById('aliquota-efetiva-total').value = aliquotaEfetivaTotal.toFixed(3);
    }
}

/**
 * Verifica se há dados do SPED disponíveis e os prioriza nos cálculos
 * @returns {Object|null} Dados do SPED se disponíveis
 */
function obterDadosSpedPrioritarios() {
    // Verificar se há dados marcados como vindos do SPED
    const camposSpedData = document.querySelectorAll('.sped-data');
    if (camposSpedData.length === 0) {
        return null;
    }

    // Extrair dados do painel de composição tributária detalhada
    const extrairValorMonetario = (id) => {
        const elemento = document.getElementById(id);
        if (!elemento || !elemento.value) return 0;
        
        // Usar o mesmo método do DataManager para extrair valor
        if (window.DataManager && window.DataManager.extrairValorMonetario) {
            return window.DataManager.extrairValorMonetario(elemento.value);
        }
        
        // Fallback: extrair valor manualmente
        return parseFloat(elemento.value.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    };

    const extrairValorPercentual = (id) => {
        const elemento = document.getElementById(id);
        if (!elemento || !elemento.value) return 0;
        return parseFloat(elemento.value) || 0;
    };

    return {
        // Sinalizar que são dados do SPED
        origemSped: true,
        
        // Débitos mensais
        debitos: {
            pis: extrairValorMonetario('debito-pis'),
            cofins: extrairValorMonetario('debito-cofins'),
            icms: extrairValorMonetario('debito-icms'),
            ipi: extrairValorMonetario('debito-ipi'),
            iss: extrairValorMonetario('debito-iss')
        },
        
        // Créditos mensais
        creditos: {
            pis: extrairValorMonetario('credito-pis'),
            cofins: extrairValorMonetario('credito-cofins'),
            icms: extrairValorMonetario('credito-icms'),
            ipi: extrairValorMonetario('credito-ipi'),
            iss: extrairValorMonetario('credito-iss')
        },
        
        // Alíquotas efetivas
        aliquotasEfetivas: {
            pis: extrairValorPercentual('aliquota-efetiva-pis'),
            cofins: extrairValorPercentual('aliquota-efetiva-cofins'),
            icms: extrairValorPercentual('aliquota-efetiva-icms'),
            ipi: extrairValorPercentual('aliquota-efetiva-ipi'),
            iss: extrairValorPercentual('aliquota-efetiva-iss'),
            total: extrairValorPercentual('aliquota-efetiva-total')
        },
        
        // Totais
        totalDebitos: extrairValorMonetario('total-debitos'),
        totalCreditos: extrairValorMonetario('total-creditos')
    };
}

/**
 * Integra dados do SPED na estrutura canônica do DataManager
 * @param {Object} dadosFormulario - Dados do formulário em estrutura aninhada
 * @returns {Object} Dados integrados com priorização do SPED
 */
function integrarDadosSpedNaEstruturaPadrao(dadosFormulario) {
    const dadosSped = obterDadosSpedPrioritarios();
    
    if (!dadosSped) {
        return dadosFormulario; // Retorna dados originais se não há SPED
    }

    // Criar cópia profunda para não modificar o original
    const dadosIntegrados = JSON.parse(JSON.stringify(dadosFormulario));

    // Adicionar seção específica para dados do SPED
    dadosIntegrados.dadosSpedImportados = {
        composicaoTributaria: {
            debitos: dadosSped.debitos,
            creditos: dadosSped.creditos,
            aliquotasEfetivas: dadosSped.aliquotasEfetivas,
            totalDebitos: dadosSped.totalDebitos,
            totalCreditos: dadosSped.totalCreditos
        },
        origemDados: 'sped',
        timestampImportacao: new Date().toISOString()
    };

    // Atualizar parâmetros fiscais baseados no SPED
    if (!dadosIntegrados.parametrosFiscais) {
        dadosIntegrados.parametrosFiscais = {};
    }

    // Sobrescrever valores de débitos e créditos com dados do SPED
    dadosIntegrados.parametrosFiscais.creditos = {
        ...dadosIntegrados.parametrosFiscais.creditos,
        ...dadosSped.creditos
    };

    // Adicionar flag indicando que há dados do SPED
    dadosIntegrados.parametrosFiscais.temDadosSped = true;
    dadosIntegrados.parametrosFiscais.aliquotaEfetivaTotal = dadosSped.aliquotasEfetivas.total / 100;

    return dadosIntegrados;
}

// Garantir que ExportTools seja inicializado
document.addEventListener('DOMContentLoaded', function() {
    // Garantir que ExportTools seja inicializado corretamente
    if (typeof window.ExportTools !== 'undefined' && typeof window.ExportTools.inicializar === 'function') {
        console.log('Inicializando ExportTools via main.js');
        const exportInitResult = window.ExportTools.inicializar();
        if (exportInitResult) {
            console.log('ExportTools inicializado com sucesso');
        } else {
            console.error('Falha na inicialização do ExportTools');
        }
    } else {
        console.warn('ExportTools não disponível. Certifique-se de importar export-tools.js antes de main.js');
    }
});