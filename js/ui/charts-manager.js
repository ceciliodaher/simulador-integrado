/**
 * @fileoverview Gerenciador de gráficos para o simulador de Split Payment
 * @module charts-manager
 * @author Expertzy Inteligência Tributária
 * @version 1.0.0
 */

// Namespace global para o gerenciador de gráficos
window.ChartManager = (function() {
    // Armazenar referências para os gráficos
    let _charts = {};
    
    /**
     * Inicializar o gerenciador de gráficos
     */
    function inicializar() {
        console.log('Inicializando gerenciador de gráficos...');
        
        // Verificar se Chart.js está disponível
        if (typeof Chart === 'undefined') {
            console.error('Chart.js não está disponível. Os gráficos não serão renderizados.');
            return;
        }
        
        // Configurar defaults para todos os gráficos
        Chart.defaults.font.family = "'Roboto', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
        Chart.defaults.color = '#505050';
        Chart.defaults.elements.line.borderWidth = 2;
        Chart.defaults.elements.point.radius = 3;
        
        console.log('Gerenciador de gráficos inicializado');
    }
    
    /**
     * Renderizar todos os gráficos com base nos resultados da simulação
     * @param {Object} resultados - Resultados da simulação
     */
    function renderizarGraficos(resultados) {
        console.log('Renderizando gráficos com os resultados:', resultados);
        
        if (!resultados || !resultados.impactoBase) {
            console.error('Resultados inválidos para renderização de gráficos');
            return;
        }
        
        try {
            // Renderizar gráfico de fluxo de caixa
            renderizarGraficoFluxoCaixa(resultados);
            
            // Renderizar gráfico de capital de giro
            renderizarGraficoCapitalGiro(resultados);
            
            // Renderizar gráfico de projeção
            renderizarGraficoProjecao(resultados);
            
            // Renderizar gráfico de decomposição
            renderizarGraficoDecomposicao(resultados);
            
            // Renderizar gráfico de sensibilidade
            renderizarGraficoSensibilidade(resultados);
            
            console.log('Todos os gráficos renderizados com sucesso');
        } catch (erro) {
            console.error('Erro ao renderizar gráficos:', erro);
        }
    }
    
    /**
     * Renderizar gráfico de fluxo de caixa
     * @param {Object} resultados - Resultados da simulação
     */
    function renderizarGraficoFluxoCaixa(resultados) {
        const canvas = document.getElementById('grafico-fluxo-caixa');
        if (!canvas) {
            console.error('Elemento canvas para gráfico de fluxo de caixa não encontrado');
            return;
        }
        
        // Destruir gráfico anterior se existir
        if (_charts.fluxoCaixa) {
            _charts.fluxoCaixa.destroy();
        }
        
        // Preparar dados para o gráfico
        const dadosSimulacao = resultados.dadosUtilizados;
        const faturamento = dadosSimulacao.faturamento || 0;
        const aliquota = dadosSimulacao.aliquota || 0;
        const valorImposto = faturamento * aliquota;
        
        // Calcular valores para ambos os regimes
        const receitaAtual = faturamento;
        const impostosAtual = valorImposto;
        const liquidoAtual = receitaAtual - impostosAtual;
        
        // Valores para regime Split Payment
        // No split, parte do imposto já sai direto do recebimento
        const percentualImplementacao = resultados.impactoBase.percentualImplementacao || 0.5;
        const impostoDireto = valorImposto * percentualImplementacao;
        const impostoPosterior = valorImposto - impostoDireto;
        const liquidoSplit = faturamento - valorImposto;
        
        // Criar dados para o gráfico
        const data = {
            labels: ['Regime Atual', 'Regime Split Payment'],
            datasets: [
                {
                    label: 'Recebimento Líquido',
                    data: [liquidoAtual, liquidoSplit],
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Imposto Recolhido Posteriormente',
                    data: [impostosAtual, impostoPosterior],
                    backgroundColor: 'rgba(255, 206, 86, 0.7)',
                    borderColor: 'rgba(255, 206, 86, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Imposto Recolhido Diretamente',
                    data: [0, impostoDireto],
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        };
        
        // Configurar opções do gráfico
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Comparação de Fluxo de Caixa',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                maximumFractionDigits: 0
                            }).format(value);
                        }
                    }
                }
            }
        };
        
        // Criar o gráfico
        _charts.fluxoCaixa = new Chart(canvas, {
            type: 'bar',
            data: data,
            options: options
        });
    }
    
    /**
     * Renderizar gráfico de capital de giro
     * @param {Object} resultados - Resultados da simulação
     */
    function renderizarGraficoCapitalGiro(resultados) {
        const canvas = document.getElementById('grafico-capital-giro');
        if (!canvas) {
            console.error('Elemento canvas para gráfico de capital de giro não encontrado');
            return;
        }
        
        // Destruir gráfico anterior se existir
        if (_charts.capitalGiro) {
            _charts.capitalGiro.destroy();
        }
        
        // Extrair dados do resultado
        const capitalGiroAtual = resultados.impactoBase.resultadoAtual?.capitalGiroDisponivel || 0;
        const capitalGiroSplit = resultados.impactoBase.resultadoSplitPayment?.capitalGiroDisponivel || 0;
        const diferencaCapitalGiro = resultados.impactoBase.diferencaCapitalGiro || 0;
        
        // Criar dados para o gráfico
        const data = {
            labels: ['Capital de Giro Disponível'],
            datasets: [
                {
                    label: 'Regime Atual',
                    data: [capitalGiroAtual],
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Regime Split Payment',
                    data: [capitalGiroSplit],
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        };
        
        // Configurar opções do gráfico
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Impacto no Capital de Giro',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                }).format(context.parsed.y);
                            }
                            return label;
                        },
                        footer: function(tooltipItems) {
                            return 'Diferença: ' + new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            }).format(diferencaCapitalGiro);
                        }
                    }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                maximumFractionDigits: 0
                            }).format(value);
                        }
                    }
                }
            }
        };
        
        // Criar o gráfico
        _charts.capitalGiro = new Chart(canvas, {
            type: 'bar',
            data: data,
            options: options
        });
    }
    
    /**
     * Renderizar gráfico de projeção
     * @param {Object} resultados - Resultados da simulação
     */
    function renderizarGraficoProjecao(resultados) {
        const canvas = document.getElementById('grafico-projecao');
        if (!canvas) {
            console.error('Elemento canvas para gráfico de projeção não encontrado');
            return;
        }
        
        // Destruir gráfico anterior se existir
        if (_charts.projecao) {
            _charts.projecao.destroy();
        }
        
        // Extrair dados da projeção temporal
        const projecao = resultados.projecaoTemporal;
        if (!projecao || !projecao.resultadosAnuais) {
            console.warn('Dados de projeção não disponíveis para o gráfico');
            return;
        }
        
        // Preparar arrays para os dados
        const anos = [];
        const necessidades = [];
        const percentuaisImplementacao = [];
        
        // Preencher dados da projeção
        for (const ano in projecao.resultadosAnuais) {
            if (projecao.resultadosAnuais.hasOwnProperty(ano)) {
                const dadosAno = projecao.resultadosAnuais[ano];
                
                anos.push(ano);
                necessidades.push(Math.abs(dadosAno.necesidadeAdicionalCapitalGiro || 0));
                percentuaisImplementacao.push((dadosAno.percentualImplementacao || 0) * 100);
            }
        }
        
        // Criar dados para o gráfico
        const data = {
            labels: anos,
            datasets: [
                {
                    label: 'Necessidade Adicional de Capital',
                    data: necessidades,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Percentual de Implementação',
                    data: percentuaisImplementacao,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    yAxisID: 'y1',
                    type: 'line'
                }
            ]
        };
        
        // Configurar opções do gráfico
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Projeção Temporal do Impacto',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.datasetIndex === 0) {
                                    label += new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    }).format(context.parsed.y);
                                } else {
                                    label += context.parsed.y.toFixed(1) + '%';
                                }
                            }
                            return label;
                        }
                    }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Necessidade de Capital (R$)'
                    },
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                maximumFractionDigits: 0
                            }).format(value);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Implementação (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        };
        
        // Criar o gráfico
        _charts.projecao = new Chart(canvas, {
            type: 'bar',
            data: data,
            options: options
        });
    }
    
    /**
     * Renderizar gráfico de decomposição do impacto
     * @param {Object} resultados - Resultados da simulação
     */
    function renderizarGraficoDecomposicao(resultados) {
        const canvas = document.getElementById('grafico-decomposicao');
        if (!canvas) {
            console.error('Elemento canvas para gráfico de decomposição não encontrado');
            return;
        }
        
        // Destruir gráfico anterior se existir
        if (_charts.decomposicao) {
            _charts.decomposicao.destroy();
        }
        
        // Extrair dados de impacto
        const impactoBase = resultados.impactoBase;
        const dadosUtilizados = resultados.dadosUtilizados;
        
        // Calcular componentes do impacto
        const valorImpostoTotal = dadosUtilizados.faturamento * dadosUtilizados.aliquota;
        const percVista = dadosUtilizados.percVista;
        const percPrazo = dadosUtilizados.percPrazo;
        
        // Decompor o impacto
        const impactoVendaVista = valorImpostoTotal * percVista;
        const impactoVendaPrazo = valorImpostoTotal * percPrazo;
        
        // Criar dados para o gráfico
        const data = {
            labels: ['Decomposição do Impacto'],
            datasets: [
                {
                    label: 'Impacto de Vendas à Vista',
                    data: [impactoVendaVista],
                    backgroundColor: 'rgba(255, 159, 64, 0.7)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Impacto de Vendas a Prazo',
                    data: [impactoVendaPrazo],
                    backgroundColor: 'rgba(153, 102, 255, 0.7)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }
            ]
        };
        
        // Configurar opções do gráfico
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Decomposição do Impacto por Tipo de Venda',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                }).format(context.parsed.y);
                            }
                            return label;
                        },
                        footer: function(tooltipItems) {
                            // Calcular percentual
                            const index = tooltipItems[0].dataIndex;
                            const datasetIndex = tooltipItems[0].datasetIndex;
                            const value = data.datasets[datasetIndex].data[index];
                            const total = impactoVendaVista + impactoVendaPrazo;
                            const percentual = (value / total * 100).toFixed(1);
                            
                            return 'Percentual: ' + percentual + '%';
                        }
                    }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                maximumFractionDigits: 0
                            }).format(value);
                        }
                    }
                }
            }
        };
        
        // Criar o gráfico
        _charts.decomposicao = new Chart(canvas, {
            type: 'bar',
            data: data,
            options: options
        });
    }
    
    /**
     * Renderizar gráfico de sensibilidade
     * @param {Object} resultados - Resultados da simulação
     */
    function renderizarGraficoSensibilidade(resultados) {
        const canvas = document.getElementById('grafico-sensibilidade');
        if (!canvas) {
            console.error('Elemento canvas para gráfico de sensibilidade não encontrado');
            return;
        }
        
        // Destruir gráfico anterior se existir
        if (_charts.sensibilidade) {
            _charts.sensibilidade.destroy();
        }
        
        // Criar dados para análise de sensibilidade
        const percentuais = [10, 25, 40, 55, 70, 85, 100];
        const dadosUtilizados = resultados.dadosUtilizados;
        const valorImpostoTotal = dadosUtilizados.faturamento * dadosUtilizados.aliquota;
        
        // Calcular impacto para cada percentual
        const impactos = percentuais.map(percentual => {
            return -valorImpostoTotal * (percentual / 100);
        });
        
        // Criar dados para o gráfico
        const data = {
            labels: percentuais.map(p => p + '%'),
            datasets: [
                {
                    label: 'Impacto no Capital de Giro',
                    data: impactos,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2
                }
            ]
        };
        
        // Configurar opções do gráfico
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Análise de Sensibilidade',
                    font: {
                        size: 16
                    }
                },
                subtitle: {
                    display: true,
                    text: 'Impacto por Percentual de Implementação',
                    font: {
                        size: 14
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                maximumFractionDigits: 0
                            }).format(value);
                        }
                    }
                }
            }
        };
        
        // Criar o gráfico
        _charts.sensibilidade = new Chart(canvas, {
            type: 'line',
            data: data,
            options: options
        });
    }
    
    /**
     * Limpa todos os gráficos existentes
     * Útil para reinicializar a interface ou antes de renderizar novos resultados
     */
    function limparGraficos() {
        // Destruir as instâncias existentes de gráficos
        for (const tipo in _charts) {
            if (_charts[tipo]) {
                _charts[tipo].destroy();
                console.log(`Gráfico de ${tipo} destruído`);
            }
        }

        // Reinicializar o objeto _charts
        _charts = {};

        console.log('Todos os gráficos foram limpos');
    }

    // Exportar API pública
    return {
        inicializar,
        renderizarGraficos,
        renderizarGraficoFluxoCaixa,
        renderizarGraficoCapitalGiro,
        renderizarGraficoProjecao,
        renderizarGraficoDecomposicao,
        renderizarGraficoSensibilidade,
        limparGraficos  // Adicione a nova função aqui
    };
})();

// Inicializar o gerenciador de gráficos quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    if (window.ChartManager && typeof window.ChartManager.inicializar === 'function') {
        window.ChartManager.inicializar();
    }
});
