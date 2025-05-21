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
        const anoSelecionado = seletorAno ? parseInt(seletorAno.value) : resultado.projecaoTemporal.parametros.anoInicial;
        
        // Se temos resultados por ano, usar o ano selecionado, caso contrário usar o impactoBase
        if (resultado.projecaoTemporal && resultado.projecaoTemporal.resultadosAnuais && 
            resultado.projecaoTemporal.resultadosAnuais[anoSelecionado]) {
            
            // Chamar a função que atualiza resultados por ano
            atualizarResultadosPorAno();
            
        } else {
            // Atualizar elementos de comparação de sistemas tributários
            const valorImpostoAtual = resultado.impactoBase.resultadoAtual?.valorImpostoTotal || 0;
            const valorImpostoSplit = resultado.impactoBase.resultadoSplitPayment?.valorImpostoTotal || 0;
            const valorImpostoIVASemSplit = resultado.impactoBase.resultadoIVASemSplit?.valorImpostoTotal || 0;
            
            document.getElementById('tributo-atual').textContent = formatarMoeda(valorImpostoAtual);
            document.getElementById('tributo-dual').textContent = formatarMoeda(valorImpostoSplit);
            document.getElementById('tributo-diferenca').textContent = formatarMoeda(valorImpostoSplit - valorImpostoAtual);
            document.getElementById('tributo-iva-sem-split').textContent = formatarMoeda(valorImpostoIVASemSplit);
            document.getElementById('tributo-diferenca-iva-sem-split').textContent = formatarMoeda(valorImpostoIVASemSplit - valorImpostoAtual);
            
            // Atualizar elementos de impacto no capital de giro
            const capitalGiroAtual = resultado.impactoBase.resultadoAtual?.capitalGiroDisponivel || 0;
            const capitalGiroSplit = resultado.impactoBase.resultadoSplitPayment?.capitalGiroDisponivel || 0;
            const capitalGiroIVASemSplit = resultado.impactoBase.resultadoIVASemSplit?.capitalGiroDisponivel || 0;
            const diferencaCapitalGiro = resultado.impactoBase.diferencaCapitalGiro || 0;
            const diferencaCapitalGiroIVASemSplit = resultado.impactoBase.diferencaCapitalGiroIVASemSplit || 0;
            const necessidadeAdicionalCapitalGiro = resultado.impactoBase.necessidadeAdicionalCapitalGiro || 0;
            
            document.getElementById('capital-giro-atual').textContent = formatarMoeda(capitalGiroAtual);
            document.getElementById('capital-giro-iva-sem-split').textContent = formatarMoeda(capitalGiroIVASemSplit);
            document.getElementById('capital-giro-split').textContent = formatarMoeda(capitalGiroSplit);
            document.getElementById('capital-giro-impacto').textContent = formatarMoeda(diferencaCapitalGiro);
            document.getElementById('capital-giro-impacto-iva-sem-split').textContent = formatarMoeda(diferencaCapitalGiroIVASemSplit);
            document.getElementById('capital-giro-necessidade').textContent = formatarMoeda(necessidadeAdicionalCapitalGiro);
            
            // Adicionar classe CSS baseada no valor
            const impactoElement = document.getElementById('capital-giro-impacto');
            if (impactoElement) {
                if (diferencaCapitalGiro < 0) {
                    impactoElement.classList.add('valor-negativo');
                } else {
                    impactoElement.classList.remove('valor-negativo');
                }
            }
            
            const impactoIVASemSplitElement = document.getElementById('capital-giro-impacto-iva-sem-split');
            if (impactoIVASemSplitElement) {
                if (diferencaCapitalGiroIVASemSplit < 0) {
                    impactoIVASemSplitElement.classList.add('valor-negativo');
                } else {
                    impactoIVASemSplitElement.classList.remove('valor-negativo');
                }
            }
            
            // Atualizar elementos de impacto na margem operacional
            const margemOriginal = resultado.impactoBase.margemOperacionalOriginal * 100 || 0;
            const margemAjustada = resultado.impactoBase.margemOperacionalAjustada * 100 || 0;
            const impactoMargem = resultado.impactoBase.impactoMargem || 0;
            
            document.getElementById('margem-atual').textContent = formatarPercentual(margemOriginal);
            document.getElementById('margem-ajustada').textContent = formatarPercentual(margemAjustada);
            document.getElementById('margem-impacto').textContent = formatarPercentual(impactoMargem);
            
            // Atualizar elementos da análise de impacto detalhada
            const percentualImpacto = resultado.impactoBase.percentualImpacto || 0;
            const impactoDiasFaturamento = resultado.impactoBase.impactoDiasFaturamento || 0;
            
            document.getElementById('percentual-impacto').textContent = formatarPercentual(percentualImpacto);
            document.getElementById('impacto-dias-faturamento').textContent = impactoDiasFaturamento.toFixed(1) + ' dias';
            
            // Atualizar elementos da projeção temporal do impacto
            const totalNecessidadeGiro = resultado.projecaoTemporal?.impactoAcumulado?.totalNecessidadeCapitalGiro || 0;
            const custoFinanceiroTotal = resultado.projecaoTemporal?.impactoAcumulado?.custoFinanceiroTotal || 0;
            
            document.getElementById('total-necessidade-giro').textContent = formatarMoeda(totalNecessidadeGiro);
            document.getElementById('custo-financeiro-total').textContent = formatarMoeda(custoFinanceiroTotal);
        }
        
        // Se split-payment não for considerado, ajustar labels
        if (!splitPaymentConsiderado) {
            // Mudar o título da coluna de comparação
            const labelSistema = document.querySelector('.result-card:first-child h4');
            if (labelSistema) labelSistema.textContent = 'Impacto do Novo Sistema Tributário';
            
            // Atualizar labels específicos
            const labelSegundoSistema = document.querySelector('.result-card:first-child .result-grid .result-item:nth-child(2) .label');
            if (labelSegundoSistema) labelSegundoSistema.textContent = 'Sistema IVA Sem Split:';
            
            const labelCapitalGiroSplit = document.querySelector('.result-card:nth-child(2) .result-grid .result-item:nth-child(3) .label');
            if (labelCapitalGiroSplit) labelCapitalGiroSplit.textContent = 'Sistema IVA:';
        }
        
        // Mostrar div de resultados detalhados
        const divResultadosDetalhados = document.getElementById('resultados-detalhados');
        if (divResultadosDetalhados) {
            divResultadosDetalhados.style.display = 'block';
        }
        
        // Armazenar resultados para memória de cálculo
        window.memoriaCalculoSimulacao = resultado.memoriaCalculo;
        
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

// Garantir que ExportTools seja inicializado
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.ExportTools !== 'undefined' && typeof window.ExportTools.inicializar === 'function') {
        console.log('Inicializando ExportTools via main.js');
        window.ExportTools.inicializar();
    } else {
        console.warn('ExportTools não disponível. Certifique-se de importar export-tools.js antes de main.js');
    }
});