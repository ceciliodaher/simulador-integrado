// Verificação imediata
console.log('main.js carregado, SimuladorFluxoCaixa disponível?', !!window.SimuladorFluxoCaixa);
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, SimuladorFluxoCaixa disponível?', !!window.SimuladorFluxoCaixa);
});

// Adicionar este trecho no início de main.js, antes de qualquer outro código
function inicializarModulos() {
    // Inicializar o CalculationCore uma única vez
    window.CalculationCore = window.CalculationCore || {
        formatarMoeda: function(valor) {
            // Garantir valor numérico
            const num = parseFloat(valor) || 0;
            // Retornar formatado
            return 'R$ ' + num.toFixed(2).replace('.', ',');
        },
        formatarValorSeguro: function(valor) {
            const num = parseFloat(valor) || 0;
            return 'R$ ' + num.toFixed(2).replace('.', ',');
        },
        calcularTempoMedioCapitalGiro: function(pmr, prazoRecolhimento, percVista, percPrazo) {
            const tempoVista = prazoRecolhimento;
            const tempoPrazo = Math.max(0, prazoRecolhimento - pmr);
            return (percVista * tempoVista) + (percPrazo * tempoPrazo);
        },
        // Função simplificada de memória crítica
        gerarMemoriaCritica: function(dados, resultados) {
            return {
                tituloRegime: "Regime Tributário",
                descricaoRegime: "Simulação",
                formula: "Detalhes de cálculo",
                passoAPasso: ["Processo de cálculo executado"],
                observacoes: []
            };
        }
    };

    console.log('Módulos inicializados com sucesso');
    return true;
}

// Chamar no carregamento da página
document.addEventListener('DOMContentLoaded', function() {
    inicializarModulos();
    console.log('Inicialização de módulos completa');
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
    
    // Inicializar eventos específicos da página principal
    inicializarEventosPrincipais();
    
    // Adicionar observadores para mudanças de aba
    observarMudancasDeAba();
    
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

            try {
                // Verificar inicialização
                if (!window.SimuladorFluxoCaixa) {
                    throw new Error('Simulador não inicializado corretamente');
                }

                if (typeof window.SimuladorFluxoCaixa.simular !== 'function') {
                    throw new Error('Função de simulação não disponível');
                }

                // Executar simulação
                const resultado = window.SimuladorFluxoCaixa.simular();

                if (!resultado) {
                    throw new Error('A simulação não retornou resultados');
                }

                // Processar resultados
                atualizarInterface(resultado);

            } catch (erro) {
                console.error('Erro ao executar simulação:', erro);
                alert('Não foi possível realizar a simulação: ' + erro.message);
            }
        });
    } else {
        console.error('Botão Simular não encontrado no DOM');
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

        // Gerar conteúdo HTML para a memória de cálculo
        let conteudo = `
            <div class="memory-section">
                <h3>1. Dados de Entrada</h3>
                <div class="memory-content">
                    <p><strong>Empresa:</strong> ${memoria.dadosEntrada?.empresa?.faturamento ? formatarMoeda(memoria.dadosEntrada.empresa.faturamento) : 'N/A'}</p>
                    <p><strong>Margem:</strong> ${memoria.dadosEntrada?.empresa?.margem ? (memoria.dadosEntrada.empresa.margem * 100).toFixed(2) + '%' : 'N/A'}</p>
                    <p><strong>Ciclo Financeiro:</strong> PMR = ${memoria.dadosEntrada?.cicloFinanceiro?.pmr || 'N/A'}, 
                       PMP = ${memoria.dadosEntrada?.cicloFinanceiro?.pmp || 'N/A'}, 
                       PME = ${memoria.dadosEntrada?.cicloFinanceiro?.pme || 'N/A'}</p>
                    <p><strong>Distribuição de Vendas:</strong> À Vista = ${memoria.dadosEntrada?.cicloFinanceiro?.percVista ? (memoria.dadosEntrada.cicloFinanceiro.percVista * 100).toFixed(2) + '%' : 'N/A'}, 
                       A Prazo = ${memoria.dadosEntrada?.cicloFinanceiro?.percPrazo ? (memoria.dadosEntrada.cicloFinanceiro.percPrazo * 100).toFixed(2) + '%' : 'N/A'}</p>
                    <p><strong>Alíquota:</strong> ${memoria.dadosEntrada?.parametrosFiscais?.aliquota ? (memoria.dadosEntrada.parametrosFiscais.aliquota * 100).toFixed(2) + '%' : 'N/A'}</p>
                </div>
            </div>

            <div class="memory-section">
                <h3>2. Cálculo do Impacto Base</h3>
                <div class="memory-content">
                    <p><strong>Diferença no Capital de Giro:</strong> ${memoria.impactoBase?.diferencaCapitalGiro ? formatarMoeda(memoria.impactoBase.diferencaCapitalGiro) : 'N/A'}</p>
                    <p><strong>Percentual de Impacto:</strong> ${memoria.impactoBase?.percentualImpacto ? memoria.impactoBase.percentualImpacto.toFixed(2) + '%' : 'N/A'}</p>
                    <p><strong>Impacto em Dias de Faturamento:</strong> ${memoria.impactoBase?.impactoDiasFaturamento ? memoria.impactoBase.impactoDiasFaturamento.toFixed(1) + ' dias' : 'N/A'}</p>
                </div>
            </div>

            <div class="memory-section">
                <h3>3. Projeção Temporal</h3>
                <div class="memory-content">
                    <p><strong>Cenário:</strong> ${memoria.projecaoTemporal?.parametros?.cenarioTaxaCrescimento || 'N/A'}</p>
                    <p><strong>Taxa de Crescimento:</strong> ${memoria.projecaoTemporal?.parametros?.taxaCrescimento ? (memoria.projecaoTemporal.parametros.taxaCrescimento * 100).toFixed(2) + '% a.a.' : 'N/A'}</p>
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

    // Função auxiliar para formatação de valores monetários
    function formatarMoeda(valor) {
        if (valor === undefined || valor === null || isNaN(valor)) {
            return 'R$ 0,00';
        }
        return 'R$ ' + parseFloat(valor).toFixed(2).replace('.', ',');
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

// Função para atualizar a interface com os resultados
// Substituir ou adicionar esta função
// main.js - substituir a função atualizarInterface
function atualizarInterface(resultado) {
    console.log('Atualizando interface com resultados completos:', resultado);
    
    // Verifica se temos resultados válidos
    if (!resultado || !resultado.impactoBase) {
        console.error('Resultados inválidos ou incompletos:', resultado);
        alert('Não foi possível processar os resultados da simulação. Verifique o console para detalhes.');
        return;
    }
    
    try {
        // Garantir que a formatação esteja disponível
        const formatarMoeda = function(valor) {
            if (valor === undefined || valor === null || isNaN(valor)) {
                return 'R$ 0,00';
            }
            return 'R$ ' + parseFloat(valor).toFixed(2).replace('.', ',');
        };
        
        const formatarPercentual = function(valor) {
            if (valor === undefined || valor === null || isNaN(valor)) {
                return '0,00%';
            }
            return parseFloat(valor).toFixed(2).replace('.', ',') + '%';
        };
        
        // Atualizar elementos de comparação de sistemas tributários
        document.getElementById('tributo-atual').textContent = formatarMoeda(resultado.impactoBase.resultadoAtual?.valorImpostoTotal || 0);
        document.getElementById('tributo-dual').textContent = formatarMoeda(resultado.impactoBase.resultadoSplitPayment?.valorImpostoTotal || 0);
        document.getElementById('tributo-diferenca').textContent = formatarMoeda(
            (resultado.impactoBase.resultadoSplitPayment?.valorImpostoTotal || 0) - 
            (resultado.impactoBase.resultadoAtual?.valorImpostoTotal || 0)
        );
        
        // Atualizar elementos de impacto no capital de giro
        document.getElementById('capital-giro-atual').textContent = formatarMoeda(resultado.impactoBase.resultadoAtual?.capitalGiroDisponivel || 0);
        document.getElementById('capital-giro-split').textContent = formatarMoeda(resultado.impactoBase.resultadoSplitPayment?.capitalGiroDisponivel || 0);
        document.getElementById('capital-giro-impacto').textContent = formatarMoeda(resultado.impactoBase.diferencaCapitalGiro || 0);
        document.getElementById('capital-giro-necessidade').textContent = formatarMoeda(resultado.impactoBase.necesidadeAdicionalCapitalGiro || 0);
        
        // Adicionar classe CSS baseada no valor
        const impactoElement = document.getElementById('capital-giro-impacto');
        if (impactoElement) {
            if ((resultado.impactoBase.diferencaCapitalGiro || 0) < 0) {
                impactoElement.classList.add('valor-negativo');
            } else {
                impactoElement.classList.remove('valor-negativo');
            }
        }
        
        // Atualizar elementos de impacto na margem operacional
        document.getElementById('margem-atual').textContent = formatarPercentual(resultado.impactoBase.margemOperacionalOriginal * 100 || 0);
        document.getElementById('margem-ajustada').textContent = formatarPercentual(resultado.impactoBase.margemOperacionalAjustada * 100 || 0);
        document.getElementById('margem-impacto').textContent = formatarPercentual(resultado.impactoBase.impactoMargem || 0);
        
        // Atualizar elementos da análise de impacto detalhada
        document.getElementById('percentual-impacto').textContent = formatarPercentual(resultado.impactoBase.percentualImpacto || 0);
        document.getElementById('impacto-dias-faturamento').textContent = (parseFloat(resultado.impactoBase.impactoDiasFaturamento) || 0).toFixed(1) + ' dias';
        
        // Atualizar elementos da projeção temporal do impacto
        document.getElementById('total-necessidade-giro').textContent = formatarMoeda(resultado.projecaoTemporal?.impactoAcumulado?.totalNecessidadeCapitalGiro || 0);
        document.getElementById('custo-financeiro-total').textContent = formatarMoeda(resultado.projecaoTemporal?.impactoAcumulado?.custoFinanceiroTotal || 0);
        
        // Mostrar div de resultados detalhados
        const divResultados = document.getElementById('resultados-detalhados');
        if (divResultados) {
            divResultados.style.display = 'block';
        }
        
        // Armazenar resultados para memória de cálculo
        window.memoriaCalculoSimulacao = resultado.memoriaCalculo;
        
        console.log('Interface atualizada com sucesso');
    } catch (erro) {
        console.error('Erro ao atualizar interface:', erro);
        alert('Ocorreu um erro ao exibir os resultados: ' + erro.message);
    }
}

// Exportar a função para o escopo global
window.atualizarInterface = atualizarInterface;

// Adicionar após a inicialização dos módulos
function inicializarRepository() {
    // Verificar se o repository já existe
    if (typeof SimuladorRepository !== 'undefined') {
        return true;
    }

    // Criar repository básico se não existir
    window.SimuladorRepository = {
        dados: {
            empresa: { faturamento: 1000000, margem: 0.15 },
            cicloFinanceiro: { pmr: 30, pmp: 30, pme: 30, percVista: 0.3, percPrazo: 0.7 },
            parametrosFiscais: { aliquota: 0.265, creditos: 0 },
            parametrosSimulacao: { 
                cenario: 'moderado', 
                taxaCrescimento: 0.05,
                dataInicial: '2026-01-01',
                dataFinal: '2033-12-31'
            }
        },

        obterSecao: function(nome) {
            return this.dados[nome] || {};
        },

        atualizarSecao: function(nome, dados) {
            this.dados[nome] = dados;
        }
    };

    console.log('Repository inicializado com sucesso');
    return true;
}

// Chamar após inicializarModulos
// Adicionar ao main.js, após inicializarEventosPrincipais()
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar módulos básicos
    inicializarModulos();
    inicializarRepository();
    
    // Inicializar simulador
    if (window.SimuladorFluxoCaixa && typeof window.SimuladorFluxoCaixa.init === 'function') {
        window.SimuladorFluxoCaixa.init();
    }
    
    // Inicializar eventos principais
    inicializarEventosPrincipais();
    
    // Inicializar formatação de moeda
    if (window.CurrencyFormatter && typeof window.CurrencyFormatter.inicializar === 'function') {
        window.CurrencyFormatter.inicializar();
    }
    
    // Inicializar campos específicos
    ajustarCamposTributarios();
    ajustarCamposOperacao();
    calcularCreditosTributarios();
    
    console.log('Inicialização completa');
});

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