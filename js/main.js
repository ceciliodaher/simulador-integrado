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
function atualizarInterface(resultado) {
    console.log('Atualizando interface com resultados completos:', resultado);
    
    // Verifica se temos resultados válidos
    if (!resultado || !resultado.impactoBase) {
        console.error('Resultados inválidos ou incompletos:', resultado);
        alert('Não foi possível processar os resultados da simulação. Verifique o console para detalhes.');
        return;
    }
    
    try {
        // 1. Atualizar elementos principais de impacto
        const formatterMoeda = (valor) => {
            return typeof window.FormatacaoHelper !== 'undefined' && 
                   typeof window.FormatacaoHelper.formatarMoeda === 'function' 
                   ? window.FormatacaoHelper.formatarMoeda(valor) 
                   : 'R$ ' + parseFloat(valor).toFixed(2).replace('.', ',');
        };
        
        const formatterPercent = (valor) => {
            return parseFloat(valor).toFixed(2) + '%';
        };
        
        // Elementos de impacto no capital de giro
        if (resultado.impactoBase && resultado.impactoBase.diferencaCapitalGiro !== undefined) {
            // Corrigido: impacto-capital-giro -> capital-giro-impacto
            const elemImpacto = document.getElementById('capital-giro-impacto');
            if (elemImpacto) {
                elemImpacto.textContent = formatterMoeda(resultado.impactoBase.diferencaCapitalGiro);
                // Adicionar classe para destacar valor negativo
                if (resultado.impactoBase.diferencaCapitalGiro < 0) {
                    elemImpacto.classList.add('valor-negativo');
                } else {
                    elemImpacto.classList.remove('valor-negativo');
                }
            }
            
            // Agora o elemento existe no HTML
            const elemPercentual = document.getElementById('percentual-impacto');
            if (elemPercentual && resultado.impactoBase.percentualImpacto !== undefined) {
                elemPercentual.textContent = formatterPercent(resultado.impactoBase.percentualImpacto);
            }
            
            // Corrigido: necessidade-adicional -> capital-giro-necessidade
            const elemNecessidade = document.getElementById('capital-giro-necessidade');
            if (elemNecessidade && resultado.impactoBase.necesidadeAdicionalCapitalGiro !== undefined) {
                elemNecessidade.textContent = formatterMoeda(resultado.impactoBase.necesidadeAdicionalCapitalGiro);
            }
            
            // Agora o elemento existe no HTML
            const elemDiasFaturamento = document.getElementById('impacto-dias-faturamento');
            if (elemDiasFaturamento && resultado.impactoBase.impactoDiasFaturamento !== undefined) {
                elemDiasFaturamento.textContent = parseFloat(resultado.impactoBase.impactoDiasFaturamento).toFixed(1) + ' dias';
            }
            
            // Atualizando o campo capital-giro-atual, se existir
            const elemCapitalGiroAtual = document.getElementById('capital-giro-atual');
            if (elemCapitalGiroAtual && resultado.resultadoAtual && resultado.resultadoAtual.capitalGiroDisponivel !== undefined) {
                elemCapitalGiroAtual.textContent = formatterMoeda(resultado.resultadoAtual.capitalGiroDisponivel);
            }
            
            // Atualizando o campo capital-giro-split, se existir
            const elemCapitalGiroSplit = document.getElementById('capital-giro-split');
            if (elemCapitalGiroSplit && resultado.resultadoSplitPayment && resultado.resultadoSplitPayment.capitalGiroDisponivel !== undefined) {
                elemCapitalGiroSplit.textContent = formatterMoeda(resultado.resultadoSplitPayment.capitalGiroDisponivel);
            }
        }
        
        // 2. Atualizar resultados da projeção temporal, se disponível
        // Agora esses elementos existem no HTML
        if (resultado.projecaoTemporal && resultado.projecaoTemporal.impactoAcumulado) {
            const elemTotalNecessidade = document.getElementById('total-necessidade-giro');
            if (elemTotalNecessidade && resultado.projecaoTemporal.impactoAcumulado.totalNecessidadeCapitalGiro !== undefined) {
                elemTotalNecessidade.textContent = formatterMoeda(resultado.projecaoTemporal.impactoAcumulado.totalNecessidadeCapitalGiro);
            }
            
            const elemCustoFinanceiro = document.getElementById('custo-financeiro-total');
            if (elemCustoFinanceiro && resultado.projecaoTemporal.impactoAcumulado.custoFinanceiroTotal !== undefined) {
                elemCustoFinanceiro.textContent = formatterMoeda(resultado.projecaoTemporal.impactoAcumulado.custoFinanceiroTotal);
            }
        }
        
        // 3. Atualizar a memória de cálculo, se disponível
        if (resultado.memoriaCalculo) {
            window.memoriaCalculoSimulacao = resultado.memoriaCalculo;
            // Atualizar a exibição da memória, se a tab estiver visível
            // Corrigido: tab-memoria-calculo -> memoria
            const tabMemoria = document.getElementById('memoria');
            if (tabMemoria && tabMemoria.classList.contains('active')) {
                if (typeof atualizarExibicaoMemoriaCalculo === 'function') {
                    atualizarExibicaoMemoriaCalculo();
                }
            }
        }
        
        // 4. Verificar se há uma div de resultados para mostrar
        // Corrigido: resultados-simulacao -> resultados-detalhados
        const divResultados = document.getElementById('resultados-detalhados');
        if (divResultados) {
            divResultados.style.display = 'block';
        }
        
        // 5. Mudar para a aba de resultados, se não estiver nela
        //if (window.TabsManager && typeof window.TabsManager.ativarAba === 'function') {
        //    window.TabsManager.ativarAba('resultados');
        //} else {
            // Alternativa: mostrar a aba manualmente
            // Corrigido: tab-resultados -> resultados
        //    const tabResultados = document.getElementById('resultados');
        //    if (tabResultados) {
                // Ocultar todas as abas primeiro
        //        document.querySelectorAll('.tab-content').forEach(tab => {
        //            tab.style.display = 'none';
        //        });
                
                // Mostrar a aba de resultados
        //        tabResultados.style.display = 'block';
                
                // Atualizar classes dos botões de aba
        //        document.querySelectorAll('.tab-button').forEach(btn => {
        //            btn.classList.remove('active');
        //        });
        //        const btnResultados = document.querySelector('[data-tab="resultados"]');
        //        if (btnResultados) {
        //            btnResultados.classList.add('active');
        //        }
        //    }
        //}
        
        console.log('Interface atualizada com sucesso');
    } catch (erro) {
        console.error('Erro ao atualizar interface:', erro);
        alert('Ocorreu um erro ao exibir os resultados: ' + erro.message);
    }
}

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
document.addEventListener('DOMContentLoaded', function() {
    inicializarModulos();
    inicializarRepository();
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