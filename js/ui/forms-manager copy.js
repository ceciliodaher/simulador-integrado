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

        // Adicionar evento para o checkbox de split payment (movido para dentro da função)
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
        }

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

        // Calcular valor inicial
        this.calcularCicloFinanceiro();
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

        // Cálculo tradicional do ciclo financeiro
        const cicloFinanceiroAtual = pmr + pme - pmp;
        const campoCiclo = document.getElementById('ciclo-financeiro');
        if (campoCiclo) {
            campoCiclo.value = cicloFinanceiroAtual;
        }

        // Se não estiver calculando com split payment, encerrar aqui
        if (!comSplitPayment) {
            return;
        }

        // Recuperar dados financeiros
        const faturamento = FormatacaoHelper.extrairValorNumerico(document.getElementById('faturamento')?.value) || 0;
        const aliquota = parseFloat(document.getElementById('aliquota')?.value) / 100 || 0;

        // Recuperar ano de referência para percentual de implementação
        const anoReferencia = document.getElementById('data-inicial')?.value.split('-')[0] || '2026';

        // Obter percentual de implementação para o ano
        let percentualImplementacao = 0.10; // Valor padrão para 2026

        // Tentar obter do SimuladorFluxoCaixa se disponível
        if (window.SimuladorFluxoCaixa && typeof window.SimuladorFluxoCaixa.obterPercentualImplementacao === 'function') {
            percentualImplementacao = window.SimuladorFluxoCaixa.obterPercentualImplementacao(parseInt(anoReferencia));
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
            percentualImplementacao = cronograma[parseInt(anoReferencia)] || 0.10;
        }

        // Valor tributário total
        const valorTributarioTotal = faturamento * aliquota;

        // Valor tributário retido via split payment
        const valorTributarioRetido = valorTributarioTotal * percentualImplementacao;

        // MUDANÇA FUNDAMENTAL: Split Payment AUMENTA a NCG

        // Cálculo da NCG Atual (sem Split Payment)
        const ncgAtual = (faturamento / 30) * cicloFinanceiroAtual;

        // Cálculo da NCG Ajustada (AUMENTADA com Split Payment)
        const ncgAjustada = ncgAtual + valorTributarioRetido;

        // A diferença será POSITIVA, indicando AUMENTO na NCG
        const diferencaNCG = ncgAjustada - ncgAtual;

        // Atualizar campos de NCG
        const campoNCGAtual = document.getElementById('ncg-atual');
        const campoNCGAjustada = document.getElementById('ncg-ajustada');
        const campoDiferencaNCG = document.getElementById('diferenca-ncg');

        if (campoNCGAtual) campoNCGAtual.value = FormatacaoHelper.formatarMoeda(ncgAtual);
        if (campoNCGAjustada) campoNCGAjustada.value = FormatacaoHelper.formatarMoeda(ncgAjustada);
        if (campoDiferencaNCG) campoDiferencaNCG.value = FormatacaoHelper.formatarMoeda(diferencaNCG);
    }

        // Recuperar ano de referência para percentual de implementação
        const anoReferencia = document.getElementById('data-inicial')?.value.split('-')[0] || '2026';

        // Obter percentual de implementação para o ano
        let percentualImplementacao = 0.10; // Valor padrão para 2026

        // Tentar obter do SimuladorFluxoCaixa se disponível
        if (window.SimuladorFluxoCaixa && typeof window.SimuladorFluxoCaixa.obterPercentualImplementacao === 'function') {
            percentualImplementacao = window.SimuladorFluxoCaixa.obterPercentualImplementacao(parseInt(anoReferencia));
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
            percentualImplementacao = cronograma[parseInt(anoReferencia)] || 0.10;
        }

        // Recuperar dados financeiros
        const faturamento = FormatacaoHelper.extrairValorNumerico(document.getElementById('faturamento')?.value) || 0;
        const aliquota = parseFloat(document.getElementById('aliquota')?.value) / 100 || 0;
        const percVista = parseFloat(document.getElementById('perc-vista')?.value) / 100 || 0;
        const percPrazo = parseFloat(document.getElementById('perc-prazo')?.value) / 100 || 0;

        // Valor tributário total
        const valorTributarioTotal = faturamento * aliquota;

        // Valor tributário retido via split payment
        const valorTributarioRetido = valorTributarioTotal * percentualImplementacao;

        // Ajustar o impacto considerando a proporção de vendas a prazo
        // O split payment afeta mais significativamente as vendas a prazo
        const proporcaoAfetada = percPrazo > 0 ? percPrazo / (percVista + percPrazo) : 1;

        // Impacto no PMR conforme a fórmula da metodologia
        const impactoPMR = pmr * (valorTributarioRetido / valorTributarioTotal) * proporcaoAfetada;

        // Ciclo financeiro ajustado
        const cicloAjustado = pmr + pme - pmp - impactoPMR;

        // Atualizar campo com valor ajustado
        const campoCiclo = document.getElementById('ciclo-financeiro');
        if (campoCiclo) {
            campoCiclo.value = cicloAjustado.toFixed(2);
        }

        // Calcular necessidade de capital de giro (NCG)
        const ncgAtual = (faturamento / 30) * (pmr + pme - pmp);
        const ncgAjustada = (faturamento / 30) * cicloAjustado;
        const diferencaNCG = ncgAjustada - ncgAtual;

        // Atualizar campos de NCG se existirem
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
		const self = this; // Capture FormsManager context
		const campoPercVista = document.getElementById('perc-vista');
		if (campoPercVista) {
			campoPercVista.addEventListener('input', function() {
				self.atualizarPercPrazo(); // Use captured context
			});
			campoPercVista.addEventListener('blur', function() {
				self.atualizarPercPrazo(); // Use captured context
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
            const valorPercVista = FormatacaoHelper.extrairValorNumerico(campoPercVista.value) / 100;
            const valorPercPrazo = Math.max(0, Math.min(1, 1 - valorPercVista));
            
            campoPercPrazo.value = FormatacaoHelper.formatarPercentual(valorPercPrazo);
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