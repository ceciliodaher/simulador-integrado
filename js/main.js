// Verificação imediata
console.log('main.js carregado, SimuladorFluxoCaixa disponível?', !!window.SimuladorFluxoCaixa);
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, SimuladorFluxoCaixa disponível?', !!window.SimuladorFluxoCaixa);
});

/**
 * Script principal do simulador de Split Payment
 * Inicializa todos os módulos e estabelece as relações entre eles
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando Simulador de Split Payment');
    
    // Inicializar gerenciador de setores
    if (typeof SetoresManager !== 'undefined') {
        SetoresManager.inicializar();
        
        // Preencher dropdown de setores na aba de simulação
        SetoresManager.preencherDropdownSetores('setor');
    }
    
    // Inicializar sistema de abas
    if (typeof TabsManager !== 'undefined') {
        TabsManager.inicializar();
    }
    
    // Inicializar gerenciador de formulários
    if (typeof FormsManager !== 'undefined') {
        FormsManager.inicializar();
    }
    
    // Inicializar gerenciador de modais
    if (typeof ModalManager !== 'undefined') {
        ModalManager.inicializar();
    }
    
    // Inicializar gerenciador de gráficos
    if (typeof ChartsManager !== 'undefined') {
        ChartsManager.init();
    }
    
    // Inicializar eventos específicos da página principal
    inicializarEventosPrincipais();
    
    // Adicionar observadores para mudanças de aba
    observarMudancasDeAba();
    
    // Inicializar estratégias de mitigação
    inicializarEstrategiasMitigacao();
    
    console.log('Simulador de Split Payment inicializado com sucesso');
});

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

            // Verificação explícita da disponibilidade
            if (window.SimuladorFluxoCaixa && typeof window.SimuladorFluxoCaixa.simularImpacto === 'function') {
                // Chamada explícita usando window
                window.SimuladorFluxoCaixa.simularImpacto();
            } else {
                console.error('SimuladorFluxoCaixa não está definido corretamente', window.SimuladorFluxoCaixa);
                alert('Erro ao iniciar a simulação. Verifique o console para mais detalhes.');
            }
        });
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
    
    // Eventos para exportação de estratégias
    const btnExportarEstrategiasPDF = document.getElementById('btn-exportar-estrategias-pdf');
    if (btnExportarEstrategiasPDF) {
        btnExportarEstrategiasPDF.addEventListener('click', function() {
            if (typeof ExportTools !== 'undefined') {
                ExportTools.exportarEstrategiasParaPDF();
            }
        });
    }

    const btnExportarEstrategiasExcel = document.getElementById('btn-exportar-estrategias-excel');
    if (btnExportarEstrategiasExcel) {
        btnExportarEstrategiasExcel.addEventListener('click', function() {
            if (typeof ExportTools !== 'undefined') {
                ExportTools.exportarEstrategiasParaExcel();
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
    function atualizarExibicaoMemoriaCalculo() {
        const selectAno = document.getElementById('select-ano-memoria');
        if (!selectAno) return;
        
        const anoSelecionado = selectAno.value;
        console.log('Atualizando memória para o ano:', anoSelecionado);
        
        if (window.SimuladorFluxoCaixa && window.memoriaCalculoSimulacao) {
            window.SimuladorFluxoCaixa.exibirMemoriaCalculo(anoSelecionado);
        } else {
            console.error('Não há memória de cálculo disponível ou o simulador não está inicializado');
            document.getElementById('memoria-calculo').innerHTML = '<p>Realize uma simulação antes de visualizar a memória de cálculo.</p>';
        }
    }
    
    // Evento para simulação de estratégias
    const btnSimularEstrategias = document.getElementById('btn-simular-estrategias');
    if (btnSimularEstrategias) {
        btnSimularEstrategias.addEventListener('click', function() {
            simularEstrategias();
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
 * Inicialização das estratégias de mitigação
 */
function inicializarEstrategiasMitigacao() {
    // Verificar se a simulação já foi realizada
    if (!window.interfaceState || !window.interfaceState.resultadosSimulacao) {
        console.log("Simulação não realizada. Estratégias de mitigação não inicializadas.");
        return;
    }

    // Verificar se o elemento existe antes de tentar acessá-lo
    const containerEstrategias = document.getElementById('estrategias-container');
    if (!containerEstrategias) {
        console.log("Elemento 'estrategias-container' não encontrado. Tentando novamente em 500ms...");
        // Tentar novamente após um curto delay para dar tempo ao DOM de carregar
        setTimeout(inicializarEstrategiasMitigacao, 500);
        return;
    }

    console.log('Inicializando gerenciador de estratégias de mitigação');
    
    // Configuração dos botões de estratégias
    document.querySelectorAll('.strategy-tab-button').forEach(button => {
        button.addEventListener('click', function() {
            // Remover classe ativa de todos os botões
            document.querySelectorAll('.strategy-tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Adicionar classe ativa ao botão clicado
            this.classList.add('active');
            
            // Esconder todos os conteúdos
            document.querySelectorAll('.strategy-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            // Mostrar o conteúdo correspondente
            const estrategiaId = this.getAttribute('data-strategy-tab');
            document.getElementById('strategy-' + estrategiaId).style.display = 'block';
        });
    });
    
    // Inicializar botões de cálculo de estratégias
    inicializarBotaoAjustePrecos();
    inicializarBotaoRenegociacaoPrazos();
    
    console.log('Gerenciador de estratégias de mitigação inicializado');
}

/**
 * Inicializa o botão de ajuste de preços
 */
function inicializarBotaoAjustePrecos() {
    const btnAjustePrecos = document.getElementById('btn-calcular-ajuste-precos');
    if (btnAjustePrecos) {
        btnAjustePrecos.addEventListener('click', function() {
            console.log('Calculando estratégia de ajuste de preços');
            
            // Verificar se ChartsManager está disponível
            if (typeof ChartsManager !== 'undefined') {
                ChartsManager.renderizarGraficoAjustePrecos();
            } else {
                console.error('ChartsManager não está disponível');
            }
        });
    }
}

/**
 * Inicializa o botão de renegociação de prazos
 */
function inicializarBotaoRenegociacaoPrazos() {
    const btnRenegociacaoPrazos = document.getElementById('btn-calcular-renegociacao-prazos');
    if (btnRenegociacaoPrazos) {
        btnRenegociacaoPrazos.addEventListener('click', function() {
            console.log('Calculando estratégia de renegociação de prazos');
            
            // Verificar se ChartsManager está disponível
            if (typeof ChartsManager !== 'undefined') {
                ChartsManager.renderizarGraficoRenegociacaoPrazos();
            } else {
                console.error('ChartsManager não está disponível');
            }
        });
    }
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
        
        // Se a aba de estratégias for ativada, atualizar os gráficos
        if (tabId === 'estrategias') {
            if (typeof ChartsManager !== 'undefined') {
                ChartsManager.atualizarTodosGraficos();
                console.log('Gráficos de estratégias atualizados');
            }
        }
    });
}
