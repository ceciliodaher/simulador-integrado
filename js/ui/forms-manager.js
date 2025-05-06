/**
 * Gerenciador de formulários
 */
const FormsManager = {
    /**
     * Inicializa o gerenciador de formulários
     */
    inicializar: function() {
        console.log('Inicializando gerenciador de formulários');
        
        // Inicializar formatação para campos monetários
        this.inicializarCamposMonetarios();
        
        // Inicializar formatação para campos percentuais
        this.inicializarCamposPercentuais();
        
        // Inicializar cálculo automático do ciclo financeiro
        this.inicializarCalculoCicloFinanceiro();
        
        // Inicializar atualização automática de percentuais
        this.inicializarAtualizacaoPercentuais();
        
        // Inicializar cálculo de elasticidade
        this.inicializarCalculoElasticidade();
        
        // Inicializar exibição de campos para cenário personalizado
        this.inicializarCenarioPersonalizado();
        
        console.log('Gerenciador de formulários inicializado');
    },

    /**
     * Inicializa campos monetários
     */
    inicializarCamposMonetarios: function() {
        const camposMonetarios = document.querySelectorAll('.money-input');
        camposMonetarios.forEach(campo => {
            FormatacaoHelper.formatarInputMonetario(campo);
        });
    },

    /**
     * Inicializa campos percentuais
     */
    inicializarCamposPercentuais: function() {
        const camposPercentuais = document.querySelectorAll('.percent-input');
        camposPercentuais.forEach(campo => {
            FormatacaoHelper.formatarInputPercentual(campo);
        });
    },

    /**
     * Inicializa o cálculo do ciclo financeiro
     */
    inicializarCalculoCicloFinanceiro: function() {
        const self = this;
        const campos = ['pmr', 'pmp', 'pme'];
        
        campos.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) {
                campo.addEventListener('input', function() {
                    self.calcularCicloFinanceiro();
                });
            }
        });

        // Adicionar evento para o checkbox de split payment
        const checkboxSplit = document.getElementById('considerar-split');
        if (checkboxSplit) {
            checkboxSplit.addEventListener('change', function() {
                self.calcularCicloFinanceiro();
                
                // Mostrar ou ocultar campos de NCG
                const camposNCG = document.getElementById('campos-ncg');
                if (camposNCG) {
                    camposNCG.style.display = checkboxSplit.checked ? 'block' : 'none';
                }
            });
            
            // Adicionar eventos para campos adicionais que afetam o cálculo com split payment
            const camposAdicionais = ['faturamento', 'aliquota', 'perc-vista', 'perc-prazo', 'data-inicial'];
            camposAdicionais.forEach(id => {
                const campo = document.getElementById(id);
                if (campo) {
                    // Para inputs de texto e número
                    campo.addEventListener('input', function() {
                        // Só recalcular se o split payment estiver ativado
                        if (document.getElementById('considerar-split')?.checked) {
                            self.calcularCicloFinanceiro();
                        }
                    });
                    
                    // Para selects e campos de data
                    if (campo.tagName === 'SELECT' || campo.type === 'date') {
                        campo.addEventListener('change', function() {
                            // Só recalcular se o split payment estiver ativado
                            if (document.getElementById('considerar-split')?.checked) {
                                self.calcularCicloFinanceiro();
                            }
                        });
                    }
                }
            });
        }
        
        // Calcular valor inicial
        this.calcularCicloFinanceiro();
    },

    /**
     * Obtém o percentual de implementação com base no ano de referência
     * @param {string|number} anoReferencia - Ano de referência
     * @returns {number} Percentual de implementação
     */
    obterPercentualImplementacao: function(anoReferencia) {
        anoReferencia = parseInt(anoReferencia);
        
        // Tentar obter do SimuladorFluxoCaixa se disponível
        if (window.SimuladorFluxoCaixa && 
            typeof window.SimuladorFluxoCaixa.obterPercentualImplementacao === 'function') {
            return window.SimuladorFluxoCaixa.obterPercentualImplementacao(anoReferencia);
        } else {
            // Cronograma de implementação definido na metodologia
            const cronograma = {
                2026: 0.10,
                2027: 0.25,
                2028: 0.40,
                2029: 0.55,
                2030: 0.70,
                2031: 0.85,
                2032: 0.95,
                2033: 1.00
            };
            return cronograma[anoReferencia] || 0.10;
        }
    },

    /**
     * Calcula o ciclo financeiro
     */
    calcularCicloFinanceiro: function() {
		// Recuperar valores básicos
		const pmr = parseInt(document.getElementById('pmr')?.value) || 0;
		const pmp = parseInt(document.getElementById('pmp')?.value) || 0;
		const pme = parseInt(document.getElementById('pme')?.value) || 0;
		
		// Verificar se estamos calculando com split payment
		const comSplitPayment = document.getElementById('considerar-split')?.checked || false;
		
		// Cálculo tradicional do ciclo financeiro (sem Split Payment)
		const cicloFinanceiroAtual = pmr + pme - pmp;
		let cicloAjustado = cicloFinanceiroAtual;
		
		// Inicializar valores para NCG
		let ncgAtual = 0;
		let ncgAjustada = 0;
		
		if (comSplitPayment) {
			// Recuperar dados financeiros
			const faturamento = FormatacaoHelper.extrairValorNumerico(document.getElementById('faturamento')?.value) || 0;
			const aliquota = parseFloat(document.getElementById('aliquota')?.value) / 100 || 0;
			
			// Recuperar ano de referência para percentual de implementação
			const anoReferencia = document.getElementById('data-inicial')?.value.split('-')[0] || '2026';
			
			// Obter percentual de implementação para o ano
			const percentualImplementacao = this.obterPercentualImplementacao(anoReferencia);
			
			// Valor tributário total
			const valorTributarioTotal = faturamento * aliquota;
			
			// Valor tributário retido via split payment
			const valorTributarioRetido = valorTributarioTotal * percentualImplementacao;
			
			// Dias adicionais no ciclo financeiro devido ao Split Payment
			const diasAdicionais = (valorTributarioRetido / faturamento) * 30;
			
			// Ciclo financeiro ajustado (AUMENTADO pelo Split Payment)
			cicloAjustado = cicloFinanceiroAtual + diasAdicionais;
			
			// Calcular necessidade de capital de giro (NCG)
			ncgAtual = (faturamento / 30) * cicloFinanceiroAtual;
			ncgAjustada = (faturamento / 30) * cicloAjustado;
			// Alternativa: ncgAjustada = ncgAtual + valorTributarioRetido;
		} else {
			// Sem Split Payment, usar o ciclo financeiro tradicional
			ncgAtual = 0; // Não calculamos se não tiver Split Payment
			ncgAjustada = 0;
		}
		
		// Atualizar campo de ciclo financeiro
		const campoCiclo = document.getElementById('ciclo-financeiro');
		if (campoCiclo) {
			campoCiclo.value = comSplitPayment ? cicloAjustado.toFixed(2) : cicloFinanceiroAtual;
		}
		
		// Atualizar campos de NCG se existirem
		const diferencaNCG = ncgAjustada - ncgAtual;
		
		const campoNCGAtual = document.getElementById('ncg-atual');
		const campoNCGAjustada = document.getElementById('ncg-ajustada');
		const campoDiferencaNCG = document.getElementById('diferenca-ncg');
		
		if (campoNCGAtual) campoNCGAtual.value = FormatacaoHelper.formatarMoeda(ncgAtual);
		if (campoNCGAjustada) campoNCGAjustada.value = FormatacaoHelper.formatarMoeda(ncgAjustada);
		if (campoDiferencaNCG) campoDiferencaNCG.value = FormatacaoHelper.formatarMoeda(diferencaNCG);
	},

    /**
     * Inicializa atualização automática de percentuais
     */
    inicializarAtualizacaoPercentuais: function() {
        const self = this;
        const campoPercVista = document.getElementById('perc-vista');
        
        if (campoPercVista) {
            campoPercVista.addEventListener('input', function() {
                self.atualizarPercPrazo();
            });
            
            campoPercVista.addEventListener('blur', function() {
                self.atualizarPercPrazo();
            });
        }
        
        // Update initial value
        this.atualizarPercPrazo();
    },

    /**
     * Atualiza o percentual de vendas a prazo
     */
    atualizarPercPrazo: function() {
		const campoPercVista = document.getElementById('perc-vista');
		const campoPercPrazo = document.getElementById('perc-prazo');
		
		if (campoPercVista && campoPercPrazo) {
			// Pegar o valor como número diretamente, sem extrair com a função
			const valorPercVista = parseFloat(campoPercVista.value) || 0;
			// Calcular diretamente em percentual (sem converter para decimal)
			const valorPercPrazo = Math.max(0, Math.min(100, 100 - valorPercVista));
			
			// Formatar diretamente como percentual
			campoPercPrazo.value = valorPercPrazo.toFixed(1) + '%';
		}
	},

    /**
     * Inicializa cálculo de elasticidade
     */
    inicializarCalculoElasticidade: function() {
        const campoPercentual = document.getElementById('ap-percentual');
        const campoElasticidade = document.getElementById('ap-elasticidade');
        
        if (campoPercentual && campoElasticidade) {
            campoPercentual.addEventListener('input', () => {
                this.calcularImpactoElasticidade();
            });
            
            campoElasticidade.addEventListener('input', () => {
                this.calcularImpactoElasticidade();
            });
        }
        
        // Calcular valor inicial
        this.calcularImpactoElasticidade();
    },

    /**
     * Calcula o impacto da elasticidade
     */
    calcularImpactoElasticidade: function() {
        const percentual = parseFloat(document.getElementById('ap-percentual')?.value) || 0;
        const elasticidade = parseFloat(document.getElementById('ap-elasticidade')?.value) || 0;
        const impacto = percentual * elasticidade;
        
        const campoImpacto = document.getElementById('ap-impacto-vendas');
        if (campoImpacto) {
            campoImpacto.value = impacto.toFixed(2);
        }
    },

    /**
     * Inicializa exibição de campos para cenário personalizado
     */
    inicializarCenarioPersonalizado: function() {
        const campoCenario = document.getElementById('cenario');
        
        if (campoCenario) {
            campoCenario.addEventListener('change', () => {
                const divCenarioPersonalizado = document.getElementById('cenario-personalizado');
                
                if (divCenarioPersonalizado) {
                    divCenarioPersonalizado.style.display =
                        campoCenario.value === 'personalizado' ? 'block' : 'none';
                }
            });
        }
    }
};
