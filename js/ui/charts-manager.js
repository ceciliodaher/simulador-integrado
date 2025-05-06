/**
 * Módulo de gerenciamento de gráficos avançados para o simulador de Split Payment
 * Este módulo centraliza a criação e gerenciamento dos gráficos utilizados na análise avançada
 */
const ChartsManager = {
    /**
     * Inicializa o gerenciador de gráficos
     */
    init: function() {
        console.log('Inicializando gerenciador de gráficos avançados');
    },
    
    // Adicionar ao arquivo js/ui/charts-manager.js
    // Localizar a definição do objeto ChartsManager e adicionar a seguinte função:

    atualizarTodosGraficos: function() {
        console.log("Atualizando todos os gráficos");

        // Verificar se há resultados de simulação disponíveis
        if (!window.interfaceState || !window.interfaceState.resultadosSimulacao) {
            console.log("Nenhum resultado de simulação disponível para atualizar gráficos");
            return;
        }

        // Atualizar cada tipo de gráfico se a função correspondente existir
        if (typeof this.atualizarGraficoFluxoCaixa === 'function') {
            this.atualizarGraficoFluxoCaixa(window.interfaceState.resultadosSimulacao);
        }

        if (typeof this.atualizarGraficoImpactoAnual === 'function') {
            this.atualizarGraficoImpactoAnual(window.interfaceState.resultadosSimulacao);
        }

        if (typeof this.atualizarGraficoEstrategias === 'function' && 
            window.interfaceState.estrategiasMitigacao) {
            this.atualizarGraficoEstrategias(window.interfaceState.estrategiasMitigacao);
        }
    },

    /**
     * Gera o gráfico de fluxo de caixa comparativo entre os regimes
     * @param {string} containerId - ID do elemento container do gráfico
     * @param {Object} dados - Dados para o gráfico
     */
    /**gerarGraficoFluxoCaixaComparativo: function(containerId, dados) {
        const ctx = document.getElementById(containerId).getContext('2d');

        // Configurar dados para o gráfico
        const dadosGrafico = {
            labels: dados.periodos,
            datasets: [
                {
                    label: 'Fluxo de Caixa - Regime Atual',
                    data: dados.fluxoAtual,
                    borderColor: '#4285F4',
                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                    fill: true
                },
                {
                    label: 'Fluxo de Caixa - Split Payment',
                    data: dados.fluxoSplit,
                    borderColor: '#DB4437',
                    backgroundColor: 'rgba(219, 68, 55, 0.1)',
                    fill: true
                }
            ]
        };

        // Criar o gráfico
        new Chart(ctx, {
            type: 'line',
            data: dadosGrafico,
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Período'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'R$ (Milhares)'
                        },
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + Formatters.formatarMoeda(value / 1000) + ' mil';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': R$ ' + Formatters.formatarMoeda(context.parsed.y);
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Gera o gráfico de capital de giro
     * @param {string} containerId - ID do elemento container do gráfico
     * @param {Object} dados - Dados para o gráfico
     */
    /**gerarGraficoCapitalGiro: function(containerId, dados) {
        const ctx = document.getElementById(containerId).getContext('2d');

        // Configurar dados para o gráfico
        const dadosGrafico = {
            labels: ['Pré-Split', ...dados.periodos],
            datasets: [
                {
                    label: 'Necessidade de Capital de Giro',
                    data: [dados.ncgInicial, ...dados.ncgProjecao],
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    fill: true,
                    tension: 0.1
                }
            ]
        };

        // Criar o gráfico
        new Chart(ctx, {
            type: 'line',
            data: dadosGrafico,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Evolução da Necessidade de Capital de Giro',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'R$ ' + Formatters.formatarMoeda(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + Formatters.formatarMoeda(value);
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Gera o gráfico de projeção com margem operacional
     * @param {string} containerId - ID do elemento container do gráfico
     * @param {Object} dados - Dados para o gráfico
     */
    /**gerarGraficoProjecao: function(containerId, dados) {
        const ctx = document.getElementById(containerId).getContext('2d');

        // Configurar dados para o gráfico
        const dadosGrafico = {
            labels: dados.periodos,
            datasets: [
                {
                    label: 'Impacto % do Split Payment',
                    data: dados.impactoPercentual,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: true,
                    tension: 0.1,
                    yAxisID: 'y'
                },
                {
                    label: 'Margem Operacional (%)',
                    data: dados.margemOperacional,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: true,
                    tension: 0.1,
                    yAxisID: 'y1'
                }
            ]
        };

        // Criar o gráfico
        new Chart(ctx, {
            type: 'line',
            data: dadosGrafico,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Impacto na Margem Operacional',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + Formatters.formatarNumero(context.parsed.y, 2) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Impacto %'
                        },
                        ticks: {
                            callback: function(value) {
                                return Formatters.formatarNumero(value, 2) + '%';
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Margem %'
                        },
                        ticks: {
                            callback: function(value) {
                                return Formatters.formatarNumero(value, 2) + '%';
                            }
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    },

    /**
     * Gera o gráfico de eficácia das estratégias de mitigação
     * @param {string} containerId - ID do elemento container do gráfico
     * @param {Object} dados - Dados para o gráfico
     */
    /**gerarGraficoEficaciaEstrategias: function(containerId, dados) {
        const ctx = document.getElementById(containerId).getContext('2d');

        // Configurar dados para o gráfico
        const dadosGrafico = {
            labels: [
                'Sem Estratégia', 
                'Ajuste de Preços', 
                'Renegociação', 
                'Antecipação', 
                'Capital de Giro', 
                'Mix de Produtos', 
                'Meios de Pagamento', 
                'Combinada'
            ],
            datasets: [
                {
                    label: 'Impacto na Necessidade de Capital (%)',
                    data: dados.eficaciaEstrategias,
                    backgroundColor: [
                        '#e74c3c', // Vermelho - Sem Estratégia
                        '#3498db', // Azul - Ajuste de Preços
                        '#2ecc71', // Verde - Renegociação
                        '#9b59b6', // Roxo - Antecipação
                        '#f39c12', // Laranja - Capital de Giro
                        '#1abc9c', // Turquesa - Mix de Produtos
                        '#34495e', // Azul Escuro - Meios de Pagamento
                        '#27ae60'  // Verde Escuro - Combinada
                    ]
                }
            ]
        };

        // Criar o gráfico
        new Chart(ctx, {
            type: 'bar',
            data: dadosGrafico,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Eficácia das Estratégias de Mitigação',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + Formatters.formatarNumero(context.parsed.y, 2) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return Formatters.formatarNumero(value, 2) + '%';
                            }
                        }
                    }
                }
            }
        });
    },
    
    /**
     * Gera o gráfico de fluxo de caixa comparativo entre os regimes
     * @param {string} containerId - ID do elemento container do gráfico
     * @param {Object} dados - Dados para o gráfico
     */
    gerarGraficoFluxoCaixaComparativo: function(containerId, dados) {
        const ctx = document.getElementById(containerId).getContext('2d');

        // Configurar dados para o gráfico
        const dadosGrafico = {
            labels: dados.periodos,
            datasets: [
                {
                    label: 'Fluxo de Caixa - Regime Atual',
                    data: dados.fluxoAtual,
                    borderColor: '#4285F4',
                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                    fill: true
                },
                {
                    label: 'Fluxo de Caixa - Split Payment',
                    data: dados.fluxoSplit,
                    borderColor: '#DB4437',
                    backgroundColor: 'rgba(219, 68, 55, 0.1)',
                    fill: true
                }
            ]
        };

        // Criar o gráfico
        new Chart(ctx, {
            type: 'line',
            data: dadosGrafico,
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Período'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'R$ (Milhares)'
                        },
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + Formatters.formatarMoeda(value / 1000) + ' mil';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': R$ ' + Formatters.formatarMoeda(context.parsed.y);
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Gera o gráfico de capital de giro
     * @param {string} containerId - ID do elemento container do gráfico
     * @param {Object} dados - Dados para o gráfico
     */
    gerarGraficoCapitalGiro: function(containerId, dados) {
        const ctx = document.getElementById(containerId).getContext('2d');

        // Configurar dados para o gráfico
        const dadosGrafico = {
            labels: ['Pré-Split', ...dados.periodos],
            datasets: [
                {
                    label: 'Necessidade de Capital de Giro',
                    data: [dados.ncgInicial, ...dados.ncgProjecao],
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    fill: true,
                    tension: 0.1
                }
            ]
        };

        // Criar o gráfico
        new Chart(ctx, {
            type: 'line',
            data: dadosGrafico,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Evolução da Necessidade de Capital de Giro',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'R$ ' + Formatters.formatarMoeda(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + Formatters.formatarMoeda(value);
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Gera o gráfico de decomposição do impacto (waterfall)
     * @param {string} containerId - ID do elemento container do gráfico
     * @param {Object} dados - Dados para o gráfico
     */
    gerarGraficoWaterfallImpacto: function(containerId, dados) {
        const ctx = document.getElementById(containerId).getContext('2d');

        // Configurar plugin para gráfico waterfall
        const waterfallPlugin = {
            id: 'waterfall',
            beforeDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                let xRight = 0;
                let xLeft = 0;

                for (let i = 0; i < meta.data.length; i++) {
                    const element = meta.data[i];
                    const value = chart.data.datasets[0].data[i];

                    if (i === 0 || i === meta.data.length - 1 || value > 0) {
                        // Primeiro item, último item ou valor positivo
                        element._model.base = element._model.y + element._model.height;
                        element._model.width = 20;
                    } else {
                        // Valor negativo
                        element._model.base = element._model.y;
                        element._model.y = element._model.base + element._model.height;
                        element._model.width = 20;
                    }

                    if (i > 0 && i < meta.data.length - 1) {
                        // Conectar barras
                        ctx.save();
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                        ctx.beginPath();
                        xRight = element._model.x - element._model.width / 2;
                        xLeft = meta.data[i-1]._model.x + meta.data[i-1]._model.width / 2;
                        ctx.moveTo(xLeft, meta.data[i-1]._model.base);
                        ctx.lineTo(xRight, element._model.base);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            }
        };

        // Configurar dados para o gráfico
        const dadosGrafico = {
            labels: ['Impacto Bruto', 'Créditos', 'Prazo Pagamento', 'Margem Líquida', 'Impacto Líquido'],
            datasets: [{
                data: [
                    dados.impactoBruto, 
                    -dados.reducaoPorCreditos, 
                    dados.efeitoPrazoPagamento, 
                    -dados.efeitoMargemLiquida, 
                    dados.impactoLiquido
                ],
                backgroundColor: [
                    '#DB4437', // Vermelho - Impacto Bruto
                    '#0F9D58', // Verde - Créditos (redução)
                    '#DB4437', // Vermelho - Efeito Prazo
                    '#0F9D58', // Verde - Margem (absorção)
                    '#4285F4'  // Azul - Resultado líquido
                ],
                borderColor: 'rgba(0, 0, 0, 0.1)',
                borderWidth: 1
            }]
        };

        // Criar o gráfico
        new Chart(ctx, {
            type: 'bar',
            data: dadosGrafico,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Decomposição do Impacto do Split Payment',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const valor = context.parsed.y;
                                return 'R$ ' + Formatters.formatarMoeda(Math.abs(valor)) + (valor < 0 ? ' (Redução)' : '');
                            }
                        }
                    },
                    waterfall: true
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'R$ (Milhares)'
                        },
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + Formatters.formatarMoeda(value / 1000) + ' mil';
                            }
                        }
                    }
                }
            },
            plugins: [waterfallPlugin]
        });
    },

    /**
     * Gera o gráfico de projeção com margem operacional
     * @param {string} containerId - ID do elemento container do gráfico
     * @param {Object} dados - Dados para o gráfico
     */
    gerarGraficoProjecao: function(containerId, dados) {
        const ctx = document.getElementById(containerId).getContext('2d');

        // Configurar dados para o gráfico
        const dadosGrafico = {
            labels: dados.periodos,
            datasets: [
                {
                    label: 'Impacto % do Split Payment',
                    data: dados.impactoPercentual,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: true,
                    tension: 0.1,
                    yAxisID: 'y'
                },
                {
                    label: 'Margem Operacional (%)',
                    data: dados.margemOperacional,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: true,
                    tension: 0.1,
                    yAxisID: 'y1'
                }
            ]
        };

        // Criar o gráfico
        new Chart(ctx, {
            type: 'line',
            data: dadosGrafico,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Impacto na Margem Operacional',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + Formatters.formatarNumero(context.parsed.y, 2) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Impacto %'
                        },
                        ticks: {
                            callback: function(value) {
                                return Formatters.formatarNumero(value, 2) + '%';
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Margem %'
                        },
                        ticks: {
                            callback: function(value) {
                                return Formatters.formatarNumero(value, 2) + '%';
                            }
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    },

    /**
     * Gera o gráfico de sensibilidade setorial (mapa de calor)
     * @param {string} containerId - ID do elemento container do gráfico
     * @param {Object} dados - Dados para o gráfico
     */
    gerarMapaCalorSensibilidade: function(containerId, dados) {
        // Versão simplificada do mapa de calor para Chart.js
        const ctx = document.getElementById(containerId).getContext('2d');

        // Criar um gráfico de barras empilhadas que simula um mapa de calor
        const dadosGrafico = {
            labels: dados.setores,
            datasets: dados.parametros.map((parametro, index) => {
                return {
                    label: parametro,
                    data: dados.matriz[index],
                    backgroundColor: function(context) {
                        const valor = context.dataset.data[context.dataIndex];
                        // Escala de cores de baixo para alto
                        if (valor < 0.25) return 'rgba(0, 200, 0, 0.8)';   // Baixo
                        if (valor < 0.5) return 'rgba(200, 200, 0, 0.8)';  // Médio-Baixo
                        if (valor < 0.75) return 'rgba(255, 165, 0, 0.8)'; // Médio
                        return 'rgba(255, 0, 0, 0.8)';                    // Alto
                    }
                };
            })
        };

        new Chart(ctx, {
            type: 'bar',
            data: dadosGrafico,
            options: {
                responsive: true,
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Setores'
                        }
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Sensibilidade'
                        },
                        max: 1
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Mapa de Sensibilidade Setorial ao Split Payment'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const parametro = context.dataset.label;
                                const setor = context.label;
                                const valor = context.parsed.y;
                                let nivel = 'Baixo';
                                if (valor >= 0.75) nivel = 'Alto';
                                else if (valor >= 0.5) nivel = 'Médio';
                                else if (valor >= 0.25) nivel = 'Médio-Baixo';

                                return `${setor}: ${parametro} - Sensibilidade ${nivel} (${(valor * 100).toFixed(1)}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Gera o gráfico de eficácia das estratégias de mitigação
     * @param {string} containerId - ID do elemento container do gráfico
     * @param {Object} dados - Dados para o gráfico
     */
    gerarGraficoEficaciaEstrategias: function(containerId, dados) {
        const ctx = document.getElementById(containerId).getContext('2d');

        // Configurar dados para o gráfico
        const dadosGrafico = {
            labels: [
                'Sem Estratégia', 
                'Ajuste de Preços', 
                'Renegociação', 
                'Antecipação', 
                'Capital de Giro', 
                'Mix de Produtos', 
                'Meios de Pagamento', 
                'Combinada'
            ],
            datasets: [
                {
                    label: 'Impacto na Necessidade de Capital (%)',
                    data: dados.eficaciaEstrategias,
                    backgroundColor: [
                        '#e74c3c', // Vermelho - Sem Estratégia
                        '#3498db', // Azul - Ajuste de Preços
                        '#2ecc71', // Verde - Renegociação
                        '#9b59b6', // Roxo - Antecipação
                        '#f39c12', // Laranja - Capital de Giro
                        '#1abc9c', // Turquesa - Mix de Produtos
                        '#34495e', // Azul Escuro - Meios de Pagamento
                        '#27ae60'  // Verde Escuro - Combinada
                    ]
                }
            ]
        };

        // Criar o gráfico
        new Chart(ctx, {
            type: 'bar',
            data: dadosGrafico,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Eficácia das Estratégias de Mitigação',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + Formatters.formatarNumero(context.parsed.y, 2) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return Formatters.formatarNumero(value, 2) + '%';
                            }
                        }
                    }
                }
            }
        });
    }
};