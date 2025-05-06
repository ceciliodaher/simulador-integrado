/**
 * Controlador da aba de Estratégias de Mitigação
 * Gerencia a interação do usuário com as estratégias de mitigação
 */
const EstrategiasMitigacaoController = {
    inicializar: function() {
        console.log('Inicializando controlador de Estratégias de Mitigação');
        
        // Verificar se há uma simulação realizada
        this.verificarSimulacaoRealizada();
        
        // Carregar dados do repositório
        this.carregarDados();
        
        // Inicializar eventos
        this.inicializarEventos();
        
        console.log('Controlador de Estratégias de Mitigação inicializado');
    },
    
    verificarSimulacaoRealizada: function() {
        // Verificar se há uma simulação realizada
        const interfaceState = SimuladorRepository.obterSecao('interfaceState');
        if (!interfaceState) {
            // Tratar o caso onde interfaceState é null/undefined
            console.warn('Estado da interface não encontrado no repositório');
            const containerResultados = document.getElementById('resultados-estrategias');
            if (containerResultados) {
                containerResultados.innerHTML = 
                    '<p class="text-warning">É necessário realizar uma simulação principal antes de configurar estratégias de mitigação.</p>';
            }
            return;
        }

        // O código original continua a partir daqui
        if (!interfaceState.simulacaoRealizada) {
            const containerResultados = document.getElementById('resultados-estrategias');
            if (containerResultados) {
                containerResultados.innerHTML = 
                    '<p class="text-warning">É necessário realizar uma simulação principal antes de configurar estratégias de mitigação.</p>';
            }
        }
    },
    
    carregarDados: function() {
        // Carregar dados do repositório para a interface
        // Implementação...
    },
    
    inicializarEventos: function() {
        // Botão simular estratégias
        // Em estrategias-controller.js, método inicializarEventos():
		// Remover ou comentar esse código
		/*
		const btnSimularEstrategias = document.getElementById('btn-simular-estrategias');
		if (btnSimularEstrategias) {
			btnSimularEstrategias.addEventListener('click', () => {
				this.simularEstrategias();
			});
		}
		*/
        
        // Eventos para elasticidade
        const campoPercAjuste = document.getElementById('ap-percentual');
        const campoElasticidade = document.getElementById('ap-elasticidade');
        if (campoPercAjuste && campoElasticidade) {
            const funcaoCalculo = () => {
                const percentual = parseFloat(campoPercAjuste.value) || 0;
                const elasticidade = parseFloat(campoElasticidade.value) || 0;
                const impacto = percentual * elasticidade;
                
                const campoImpacto = document.getElementById('ap-impacto-vendas');
                if (campoImpacto) {
                    campoImpacto.value = impacto.toFixed(2);
                }
            };
            
            campoPercAjuste.addEventListener('input', funcaoCalculo);
            campoElasticidade.addEventListener('input', funcaoCalculo);
        }
        
        // Outros eventos para outros campos...
    },
    
    simularEstrategias: function() {
		try {
			// Verificar se a simulação principal foi realizada
			const interfaceState = SimuladorRepository.obterSecao('interfaceState');
			if (!interfaceState || !interfaceState.simulacaoRealizada) {
				alert('É necessário realizar uma simulação principal antes de simular estratégias.');
				
				// Redirecionar para a aba de simulação
				document.querySelector('.tab-button[data-tab="simulacao"]').click();
				return;
			}
			
			// Chamar a implementação em simulator.js
			if (typeof window.simularEstrategias === 'function') {
				window.simularEstrategias();
			} else {
				console.error('Função simularEstrategias não encontrada em window');
				alert('Erro: Função de simulação de estratégias não encontrada.');
			}
		} catch (error) {
			console.error('Erro ao preparar simulação de estratégias:', error);
			alert('Ocorreu um erro ao preparar a simulação de estratégias: ' + error.message);
		}
	},

    // Método auxiliar para coletar configurações de estratégias
    _coletarEstrategias: function() {
        return {
            ajustePrecos: {
                ativar: document.getElementById('ap-ativar').value === '1',
                percentualAumento: parseFloat(document.getElementById('ap-percentual').value) || 5,
                elasticidade: parseFloat(document.getElementById('ap-elasticidade').value) || -1.2,
                impactoVendas: parseFloat(document.getElementById('ap-impacto-vendas').value) || 0,
                periodoAjuste: parseInt(document.getElementById('ap-periodo').value) || 3
            },
            renegociacaoPrazos: {
                ativar: document.getElementById('rp-ativar').value === '1',
                aumentoPrazo: parseInt(document.getElementById('rp-aumento-prazo').value) || 15,
                percentualFornecedores: parseInt(document.getElementById('rp-percentual').value) || 60,
                contrapartidas: document.getElementById('rp-contrapartidas').value || 'nenhuma',
                custoContrapartida: parseFloat(document.getElementById('rp-custo').value) || 0
            },
            antecipacaoRecebiveis: {
                ativar: document.getElementById('ar-ativar').value === '1',
                percentualAntecipacao: parseInt(document.getElementById('ar-percentual').value) || 50,
                taxaDesconto: parseFloat(document.getElementById('ar-taxa').value) / 100 || 0.018,
                prazoAntecipacao: parseInt(document.getElementById('ar-prazo').value) || 25
            },
            capitalGiro: {
                ativar: document.getElementById('cg-ativar').value === '1',
                valorCaptacao: parseInt(document.getElementById('cg-valor').value) || 100,
                taxaJuros: parseFloat(document.getElementById('cg-taxa').value) / 100 || 0.021,
                prazoPagamento: parseInt(document.getElementById('cg-prazo').value) || 12,
                carencia: parseInt(document.getElementById('cg-carencia').value) || 3
            },
            mixProdutos: {
                ativar: document.getElementById('mp-ativar').value === '1',
                percentualAjuste: parseInt(document.getElementById('mp-percentual').value) || 30,
                focoAjuste: document.getElementById('mp-foco').value || 'ciclo',
                impactoReceita: parseFloat(document.getElementById('mp-impacto-receita').value) || -5,
                impactoMargem: parseFloat(document.getElementById('mp-impacto-margem').value) || 3.5
            },
            meiosPagamento: {
                ativar: document.getElementById('mp-pag-ativar').value === '1',
                distribuicaoAtual: {
                    vista: parseInt(document.getElementById('mp-pag-vista-atual').value) || 30,
                    prazo: parseInt(document.getElementById('mp-pag-prazo-atual').value) || 70
                },
                distribuicaoNova: {
                    vista: parseInt(document.getElementById('mp-pag-vista-novo').value) || 40,
                    dias30: parseInt(document.getElementById('mp-pag-30-novo').value) || 30,
                    dias60: parseInt(document.getElementById('mp-pag-60-novo').value) || 20,
                    dias90: parseInt(document.getElementById('mp-pag-90-novo').value) || 10
                },
                taxaIncentivo: parseFloat(document.getElementById('mp-pag-taxa-incentivo').value) || 3
            }
        };
    },
    
    // Método auxiliar para mostrar/ocultar indicador de carregamento
    _mostrarCarregamento: function(mostrar) {
        const loader = document.getElementById('estrategias-loader');
        if (loader) {
            loader.style.display = mostrar ? 'block' : 'none';
        }
    },
    
    exibirResultadosEstrategias: function(resultados) {
        // Implementar exibição dos resultados na interface
        // Implementação...
    }
    
    // Outros métodos necessários...
};

// Inicialização automática quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar apenas quando a aba estiver ativa
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            if (this.getAttribute('data-tab') === 'estrategias') {
                EstrategiasMitigacaoController.inicializar();
            }
        });
    });
    
    // Se a aba de estratégias já estiver ativa, inicializar o controlador
    if (document.querySelector('.tab-button[data-tab="estrategias"].active')) {
        EstrategiasMitigacaoController.inicializar();
    }
});