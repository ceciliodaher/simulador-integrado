/**
 * Controlador da aba de Simulação Principal
 * Gerencia a interação do usuário com a interface de simulação
 * @module SimulacaoPrincipalController
 */
const SimulacaoPrincipalController = {
    /**
     * Inicializa o controlador
     */
    inicializar: function() {
        console.log('Inicializando controlador de Simulação Principal');
        
        // Verificar se as configurações foram realizadas
        this.verificarConfiguracaoPreviaPrenchida();
        
        // Carregar dados do repositório
        this.carregarDados();
        
        // Inicializar eventos
        this.inicializarEventos();

        // Inicializar cálculos automáticos para campos tributários
        this.inicializarCalculosTributarios();
        
        console.log('Controlador de Simulação Principal inicializado');
    },
    
    /**
     * Verifica se as configurações básicas foram preenchidas
     */
    verificarConfiguracaoPreviaPrenchida: function() {
        if (!SimuladorRepository || typeof SimuladorRepository.obterSecao !== 'function') {
            console.error('Repositório não está disponível. Verifique a inicialização.');
            return false;
        }

        // Verificar dados da empresa
        const dadosEmpresa = SimuladorRepository.obterSecao('empresa');
        if (!dadosEmpresa || !dadosEmpresa.nome) {
            console.warn('Configuração da empresa não encontrada ou incompleta.');
            
            // Verificar se estamos na aba de simulação ou devemos redirecionar
            if (document.querySelector('.tab-button[data-tab="configuracao-basica"]')) {
                // Exibir mensagem ao usuário
                const mensagem = document.getElementById('mensagem-configuracao');
                if (mensagem) {
                    mensagem.textContent = 'Por favor, complete a configuração básica antes de prosseguir com a simulação.';
                    mensagem.style.display = 'block';
                }
                return false;
            }
        }
        
        return true;
    },
    
    /**
     * Carrega dados do repositório para a interface
     */
    carregarDados: function() {
        // Carregar dados fiscais
        const parametrosFiscais = SimuladorRepository.obterSecao('parametrosFiscais');
        if (parametrosFiscais) {
            // Carregar alíquota e créditos
            if (parametrosFiscais.aliquota) {
                const campoAliquota = document.getElementById('aliquota');
                if (campoAliquota) {
                    campoAliquota.value = (parametrosFiscais.aliquota * 100).toFixed(1);
                }
            }
            
            if (parametrosFiscais.creditos) {
                const campoCreditos = document.getElementById('creditos');
                if (campoCreditos) {
                    campoCreditos.value = this.formatarMoeda(parametrosFiscais.creditos);
                }
            }
            
            // Carregar tipo de operação
            if (parametrosFiscais.tipoOperacao) {
                const campoTipoOperacao = document.getElementById('tipo-operacao');
                if (campoTipoOperacao) {
                    campoTipoOperacao.value = parametrosFiscais.tipoOperacao;
                    this._atualizarVisualizacaoCampos('tipo-operacao');
                }
            }
            
            // Carregar regime PIS/COFINS
            if (parametrosFiscais.cumulativeRegime !== undefined) {
                const campoPisCofinsRegime = document.getElementById('pis-cofins-regime');
                if (campoPisCofinsRegime) {
                    campoPisCofinsRegime.value = parametrosFiscais.cumulativeRegime ? 'cumulativo' : 'nao-cumulativo';
                    this._ajustarAliquotasPisCofins();
                }
            }
            
            // Carregar parâmetros específicos de créditos tributários
            const camposCredito = [
                { id: 'pis-cofins-base-calc', valor: parametrosFiscais.baseCalculoPisCofins, multiplicador: 100 },
                { id: 'pis-cofins-perc-credito', valor: parametrosFiscais.percAproveitamentoPisCofins, multiplicador: 100 },
                { id: 'icms-base-calc', valor: parametrosFiscais.baseCalculoICMS, multiplicador: 100 },
                { id: 'icms-perc-credito', valor: parametrosFiscais.percAproveitamentoICMS, multiplicador: 100 },
                { id: 'ipi-base-calc', valor: parametrosFiscais.baseCalculoIPI, multiplicador: 100 },
                { id: 'ipi-perc-credito', valor: parametrosFiscais.percAproveitamentoIPI, multiplicador: 100 },
                { id: 'aliquota-icms', valor: parametrosFiscais.aliquotaICMS, multiplicador: 100 },
                { id: 'aliquota-ipi', valor: parametrosFiscais.aliquotaIPI, multiplicador: 100 }
            ];
            
            camposCredito.forEach(campo => {
                if (campo.valor !== undefined) {
                    const element = document.getElementById(campo.id);
                    if (element) {
                        element.value = (campo.valor * campo.multiplicador).toFixed(1);
                    }
                }
            });
            
            // Carregar dados de incentivo fiscal
            if (parametrosFiscais.possuiIncentivoICMS !== undefined) {
                const checkboxIncentivo = document.getElementById('possui-incentivo-icms');
                if (checkboxIncentivo) {
                    checkboxIncentivo.checked = parametrosFiscais.possuiIncentivoICMS;
                    this._toggleCamposIncentivoICMS();
                    
                    if (parametrosFiscais.percentualIncentivoICMS !== undefined) {
                        const campoIncentivo = document.getElementById('incentivo-icms');
                        if (campoIncentivo) {
                            campoIncentivo.value = (parametrosFiscais.percentualIncentivoICMS * 100).toFixed(1);
                        }
                    }
                }
            }
        }
        
        // Carregar parâmetros de simulação
        const parametrosSimulacao = SimuladorRepository.obterSecao('parametrosSimulacao');
        if (parametrosSimulacao) {
            // Carregar datas
            if (parametrosSimulacao.dataInicial) {
                const campoDataInicial = document.getElementById('data-inicial');
                if (campoDataInicial) {
                    campoDataInicial.value = parametrosSimulacao.dataInicial;
                }
            }
            
            if (parametrosSimulacao.dataFinal) {
                const campoDataFinal = document.getElementById('data-final');
                if (campoDataFinal) {
                    campoDataFinal.value = parametrosSimulacao.dataFinal;
                }
            }
            
            // Carregar cenário
            if (parametrosSimulacao.cenario) {
                const campoCenario = document.getElementById('cenario');
                if (campoCenario) {
                    campoCenario.value = parametrosSimulacao.cenario;
                    
                    // Verificar se precisa mostrar o campo de taxa personalizada
                    const campoTaxaGroup = document.getElementById('taxa-crescimento-group');
                    if (campoTaxaGroup) {
                        campoTaxaGroup.style.display = parametrosSimulacao.cenario === 'personalizado' ? 'block' : 'none';
                        
                        if (parametrosSimulacao.cenario === 'personalizado' && parametrosSimulacao.taxaCrescimento !== undefined) {
                            const campoTaxa = document.getElementById('taxa-crescimento');
                            if (campoTaxa) {
                                campoTaxa.value = (parametrosSimulacao.taxaCrescimento * 100).toFixed(1);
                            }
                        }
                    }
                }
            }
        }
        
        // Recalcular créditos após carregar todos os dados
        this.calcularCreditosTributarios();
    },
    
    /**
     * Inicializa eventos da interface
     */
    inicializarEventos: function() {
        // Botão simular
        const btnSimular = document.getElementById('btn-simular');
        if (btnSimular) {
            btnSimular.addEventListener('click', () => {
                this.realizarSimulacao();
            });
        }
        
        // Evento para tipo de operação
        const tipoOperacao = document.getElementById('tipo-operacao');
        if (tipoOperacao) {
            tipoOperacao.addEventListener('change', () => {
                this._atualizarVisualizacaoCampos('tipo-operacao');
            });
        }
        
        // Evento para regime tributário
        const regimeTributario = document.getElementById('regime');
        if (regimeTributario) {
            regimeTributario.addEventListener('change', () => {
                this._atualizarVisualizacaoCampos('regime');
            });
        }
        
        // Evento para seleção de cenário
        const cenario = document.getElementById('cenario');
        if (cenario) {
            cenario.addEventListener('change', () => {
                const taxaCrescimentoGroup = document.getElementById('taxa-crescimento-group');
                if (taxaCrescimentoGroup) {
                    taxaCrescimentoGroup.style.display = cenario.value === 'personalizado' ? 'block' : 'none';
                }
            });
        }
        
        // Eventos para incentivo fiscal ICMS
        const possuiIncentivoICMS = document.getElementById('possui-incentivo-icms');
        if (possuiIncentivoICMS) {
            possuiIncentivoICMS.addEventListener('change', () => {
                this._toggleCamposIncentivoICMS();
                this.calcularCreditosTributarios();
            });
        }
        
        // Evento para regime PIS/COFINS
        const pisCofinsRegime = document.getElementById('pis-cofins-regime');
        if (pisCofinsRegime) {
            pisCofinsRegime.addEventListener('change', () => {
                this._ajustarAliquotasPisCofins();
            });
        }
        
        // Eventos de navegação em abas para preservar estado
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                // Salvar dados no repositório antes de mudar de aba
                this.salvarDadosFormulario();
            });
        });
    },
    
    /**
     * Inicializa cálculos automáticos para campos tributários
     */
    inicializarCalculosTributarios: function() {
        // Adicionar listeners para campos de créditos tributários
        const camposTributarios = [
            'faturamento',
            'pis-cofins-base-calc',
            'pis-cofins-perc-credito',
            'icms-base-calc', 
            'icms-perc-credito',
            'aliquota-icms',
            'ipi-base-calc',
            'ipi-perc-credito',
            'aliquota-ipi',
            'aliquota-iss',
            'incentivo-icms',
            'aliquota-simples',
            'pis-aliquota',
            'cofins-aliquota'
        ];

        camposTributarios.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) {
                campo.addEventListener('input', () => {
                    this.calcularCreditosTributarios();
                });
                campo.addEventListener('change', () => {
                    this.calcularCreditosTributarios();
                });
            }
        });

        // Configuração inicial
        this._ajustarAliquotasPisCofins();
        this.calcularCreditosTributarios();
    },
    
    /**
     * Calcula os créditos tributários com base nos dados do formulário
     * @returns {Object} Objeto com créditos individuais por imposto
     */
    calcularCreditosTributarios: function() {
        const faturamento = this._extrairValorNumerico(document.getElementById('faturamento').value) || 0;

        // Objeto para armazenar resultados individuais
        const resultados = {
            creditos: {
                pis: 0,
                cofins: 0,
                icms: 0,
                ipi: 0,
                iss: 0
            },
            total: 0
        };

        // Calcular créditos de PIS/COFINS
        if (document.getElementById('pis-cofins-regime').value === 'nao-cumulativo') {
            const pisCofinsBaseCalc = parseFloat(document.getElementById('pis-cofins-base-calc').value) / 100 || 0;
            const pisCofinsPercCredito = parseFloat(document.getElementById('pis-cofins-perc-credito').value) / 100 || 0;
            const aliquotaPIS = parseFloat(document.getElementById('pis-aliquota').value) / 100 || 0;
            const aliquotaCOFINS = parseFloat(document.getElementById('cofins-aliquota').value) / 100 || 0;

            const creditosPisCofinsTotal = faturamento * pisCofinsBaseCalc * (aliquotaPIS + aliquotaCOFINS) * pisCofinsPercCredito;

            // Distribuir proporcionalmente entre PIS e COFINS
            const totalAliquotas = aliquotaPIS + aliquotaCOFINS;
            if (totalAliquotas > 0) {
                resultados.creditos.pis = creditosPisCofinsTotal * (aliquotaPIS / totalAliquotas);
                resultados.creditos.cofins = creditosPisCofinsTotal * (aliquotaCOFINS / totalAliquotas);
            }

            document.getElementById('creditos-pis-cofins-calc').value = this.formatarMoeda(creditosPisCofinsTotal);
        } else {
            document.getElementById('creditos-pis-cofins-calc').value = this.formatarMoeda(0);
        }

        // Calcular créditos de ICMS
        const icmsBaseCalc = parseFloat(document.getElementById('icms-base-calc').value) / 100 || 0;
        const icmsPercCredito = parseFloat(document.getElementById('icms-perc-credito').value) / 100 || 0;
        const aliquotaICMS = parseFloat(document.getElementById('aliquota-icms').value) / 100 || 0;

        resultados.creditos.icms = faturamento * icmsBaseCalc * aliquotaICMS * icmsPercCredito;
        document.getElementById('creditos-icms-calc').value = this.formatarMoeda(resultados.creditos.icms);

        // Calcular créditos de IPI
        const ipiBaseCalc = parseFloat(document.getElementById('ipi-base-calc').value) / 100 || 0;
        const ipiPercCredito = parseFloat(document.getElementById('ipi-perc-credito').value) / 100 || 0;
        const aliquotaIPI = parseFloat(document.getElementById('aliquota-ipi').value) / 100 || 0;

        resultados.creditos.ipi = faturamento * ipiBaseCalc * aliquotaIPI * ipiPercCredito;
        document.getElementById('creditos-ipi-calc').value = this.formatarMoeda(resultados.creditos.ipi);

        // ISS não gera créditos
        resultados.creditos.iss = 0;

        // Calcular total de créditos considerando o tipo de operação
        const tipoOperacao = document.getElementById('tipo-operacao').value;
        const tipoEmpresa = document.getElementById('tipo-empresa').value;

        let creditosTotal = 0;

        // Adicionar créditos PIS/COFINS se estiver no regime não-cumulativo
        if (document.getElementById('pis-cofins-regime').value === 'nao-cumulativo') {
            creditosTotal += resultados.creditos.pis + resultados.creditos.cofins;
        }

        // Adicionar créditos ICMS e IPI conforme o tipo de empresa
        if (tipoEmpresa === 'comercio' || tipoEmpresa === 'industria') {
            creditosTotal += resultados.creditos.icms;
        }

        if (tipoEmpresa === 'industria') {
            creditosTotal += resultados.creditos.ipi;
        }

        resultados.total = creditosTotal;

        // Atualizar o campo de créditos totais
        document.getElementById('creditos').value = this.formatarMoeda(creditosTotal);

        // Atualizar painel de composição tributária detalhada
        this.atualizarPainelComposicaoTributaria(resultados);

        // Recalcular a alíquota efetiva considerando os créditos
        this.calcularAliquotaEfetiva();

        return resultados;
    },
    
    /**
     * Atualiza o painel de Composição Tributária Detalhada
     * @param {Object} creditosResultados - Resultados dos créditos calculados
     */
    atualizarPainelComposicaoTributaria: function(creditosResultados) {
        const faturamento = this._extrairValorNumerico(document.getElementById('faturamento').value) || 0;

        if (faturamento === 0) {
            // Limpar todos os campos se não há faturamento
            this._limparPainelComposicaoTributaria();
            return;
        }

        const tipoEmpresa = document.getElementById('tipo-empresa').value;
        const regime = document.getElementById('regime').value;
        const pisCofinsRegime = document.getElementById('pis-cofins-regime').value;

        // Objeto para armazenar débitos e créditos
        const composicao = {
            debitos: { pis: 0, cofins: 0, icms: 0, ipi: 0, iss: 0 },
            creditos: creditosResultados ? creditosResultados.creditos : { pis: 0, cofins: 0, icms: 0, ipi: 0, iss: 0 },
            aliquotasEfetivas: { pis: 0, cofins: 0, icms: 0, ipi: 0, iss: 0, total: 0 }
        };

        // Calcular débitos por imposto
        if (regime === 'simples') {
            // No Simples Nacional, considerar alíquota única
            const aliquotaSimples = parseFloat(document.getElementById('aliquota-simples').value) / 100 || 0;
            const debitoTotal = faturamento * aliquotaSimples;

            // Distribuir proporcionalmente (estimativa)
            composicao.debitos.pis = debitoTotal * 0.05; // ~5% do total
            composicao.debitos.cofins = debitoTotal * 0.23; // ~23% do total
            composicao.debitos.icms = debitoTotal * 0.72; // ~72% do total
        } else {
            // PIS
            const aliquotaPIS = parseFloat(document.getElementById('pis-aliquota').value) / 100 || 0;
            composicao.debitos.pis = faturamento * aliquotaPIS;

            // COFINS
            const aliquotaCOFINS = parseFloat(document.getElementById('cofins-aliquota').value) / 100 || 0;
            composicao.debitos.cofins = faturamento * aliquotaCOFINS;

            // ICMS (se aplicável)
            if (tipoEmpresa === 'comercio' || tipoEmpresa === 'industria') {
                let aliquotaICMS = parseFloat(document.getElementById('aliquota-icms').value) / 100 || 0;

                // Aplicar incentivo fiscal se existir
                if (document.getElementById('possui-incentivo-icms').checked) {
                    const incentivo = parseFloat(document.getElementById('incentivo-icms').value) / 100 || 0;
                    aliquotaICMS = aliquotaICMS * (1 - incentivo);
                }

                composicao.debitos.icms = faturamento * aliquotaICMS;
            }

            // IPI (se aplicável)
            if (tipoEmpresa === 'industria') {
                const aliquotaIPI = parseFloat(document.getElementById('aliquota-ipi').value) / 100 || 0;
                composicao.debitos.ipi = faturamento * aliquotaIPI;
            }

            // ISS (se aplicável)
            if (tipoEmpresa === 'servicos') {
                const aliquotaISS = parseFloat(document.getElementById('aliquota-iss').value) / 100 || 0;
                composicao.debitos.iss = faturamento * aliquotaISS;
            }
        }

        // Calcular alíquotas efetivas
        Object.keys(composicao.debitos).forEach(imposto => {
            const debito = composicao.debitos[imposto];
            const credito = composicao.creditos[imposto] || 0;
            composicao.aliquotasEfetivas[imposto] = ((debito - credito) / faturamento) * 100;
        });

        // Calcular totais
        const totalDebitos = Object.values(composicao.debitos).reduce((sum, val) => sum + val, 0);
        const totalCreditos = Object.values(composicao.creditos).reduce((sum, val) => sum + val, 0);
        composicao.aliquotasEfetivas.total = ((totalDebitos - totalCreditos) / faturamento) * 100;

        // Atualizar campos na interface
        this._atualizarCamposPainelDetalhado(composicao, totalDebitos, totalCreditos);
    },

    /**
     * Atualiza os campos do painel detalhado na interface
     * @param {Object} composicao - Dados da composição tributária
     * @param {number} totalDebitos - Total de débitos
     * @param {number} totalCreditos - Total de créditos
     * @private
     */
    _atualizarCamposPainelDetalhado: function(composicao, totalDebitos, totalCreditos) {
        // Atualizar débitos
        Object.keys(composicao.debitos).forEach(imposto => {
            const elemento = document.getElementById(`debito-${imposto}`);
            if (elemento) {
                elemento.value = this.formatarMoeda(composicao.debitos[imposto]);
            }
        });

        // Atualizar créditos
        Object.keys(composicao.creditos).forEach(imposto => {
            const elemento = document.getElementById(`credito-${imposto}`);
            if (elemento) {
                elemento.value = this.formatarMoeda(composicao.creditos[imposto]);
            }
        });

        // Atualizar alíquotas efetivas
        Object.keys(composicao.aliquotasEfetivas).forEach(imposto => {
            const elemento = document.getElementById(`aliquota-efetiva-${imposto}`);
            if (elemento) {
                elemento.value = composicao.aliquotasEfetivas[imposto].toFixed(3);
            }
        });

        // Atualizar totais
        const elementoTotalDebitos = document.getElementById('total-debitos');
        if (elementoTotalDebitos) {
            elementoTotalDebitos.value = this.formatarMoeda(totalDebitos);
        }

        const elementoTotalCreditos = document.getElementById('total-creditos');
        if (elementoTotalCreditos) {
            elementoTotalCreditos.value = this.formatarMoeda(totalCreditos);
        }
    },

    /**
     * Limpa todos os campos do painel de composição tributária
     * @private
     */
    _limparPainelComposicaoTributaria: function() {
        const impostos = ['pis', 'cofins', 'icms', 'ipi', 'iss'];
        const tipos = ['debito', 'credito', 'aliquota-efetiva'];

        impostos.forEach(imposto => {
            tipos.forEach(tipo => {
                const elemento = document.getElementById(`${tipo}-${imposto}`);
                if (elemento) {
                    elemento.value = tipo === 'aliquota-efetiva' ? '0.000' : this.formatarMoeda(0);
                }
            });
        });

        // Limpar totais
        const elementoTotalDebitos = document.getElementById('total-debitos');
        if (elementoTotalDebitos) elementoTotalDebitos.value = this.formatarMoeda(0);

        const elementoTotalCreditos = document.getElementById('total-creditos');
        if (elementoTotalCreditos) elementoTotalCreditos.value = this.formatarMoeda(0);

        const elementoAliquotaTotal = document.getElementById('aliquota-efetiva-total');
        if (elementoAliquotaTotal) elementoAliquotaTotal.value = '0.000';
    },
    
    /**
     * Calcula a alíquota efetiva com base nos campos tributários
     */
    calcularAliquotaEfetiva: function() {
        const regime = document.getElementById('regime').value;
        let aliquotaTotal = 0;
        
        // Simples Nacional
        if (regime === 'simples') {
            const aliquotaSimples = parseFloat(document.getElementById('aliquota-simples').value) || 0;
            aliquotaTotal = aliquotaSimples;
        }
        // Lucro Presumido ou Real
        else if (regime === 'presumido' || regime === 'real') {
            const pisCofinsRegime = document.getElementById('pis-cofins-regime').value;
            
            // PIS/COFINS
            if (pisCofinsRegime === 'cumulativo') {
                aliquotaTotal += 3.65; // 0.65% (PIS) + 3% (COFINS)
            } else {
                aliquotaTotal += 9.25; // 1.65% (PIS) + 7.6% (COFINS)
            }
            
            // ICMS 
            const camposIcms = document.getElementById('campos-icms');
            const tipoOperacao = document.getElementById('tipo-operacao').value;
            
            if ((camposIcms && camposIcms.style.display !== 'none') || 
                (tipoOperacao === 'comercial' || tipoOperacao === 'industrial')) {
                let aliquotaICMS = parseFloat(document.getElementById('aliquota-icms').value) || 0;
                
                // Aplicar incentivo fiscal se existir
                if (document.getElementById('possui-incentivo-icms').checked) {
                    const incentivo = parseFloat(document.getElementById('incentivo-icms').value) || 0;
                    aliquotaICMS = aliquotaICMS * (1 - (incentivo / 100));
                }
                
                aliquotaTotal += aliquotaICMS;
            }
            
            // IPI
            const camposIpi = document.getElementById('campos-ipi');
            if ((camposIpi && camposIpi.style.display !== 'none') || tipoOperacao === 'industrial') {
                const aliquotaIPI = parseFloat(document.getElementById('aliquota-ipi').value) || 0;
                aliquotaTotal += aliquotaIPI;
            }
            
            // ISS
            const camposIss = document.getElementById('campos-iss');
            if ((camposIss && camposIss.style.display !== 'none') || tipoOperacao === 'servicos') {
                const aliquotaISS = parseFloat(document.getElementById('aliquota-iss').value) || 0;
                aliquotaTotal += aliquotaISS;
            }
        }
        
        // Atualizar campo de alíquota total
        document.getElementById('aliquota').value = aliquotaTotal.toFixed(1);
    },
    
    /**
     * Ajusta as alíquotas de PIS/COFINS conforme o regime
     * @private
     */
    _ajustarAliquotasPisCofins: function() {
        const regime = document.getElementById('pis-cofins-regime').value;
        const camposCreditosPisCofins = document.getElementById('campos-pis-cofins-creditos');
        
        if (regime === 'cumulativo') {
            // No regime cumulativo, não há créditos
            document.getElementById('pis-aliquota').value = '0.65';
            document.getElementById('cofins-aliquota').value = '3.0';
            camposCreditosPisCofins.style.display = 'none';
        } else {
            // No regime não-cumulativo, exibir campos de créditos
            document.getElementById('pis-aliquota').value = '1.65';
            document.getElementById('cofins-aliquota').value = '7.6';
            camposCreditosPisCofins.style.display = 'block';
        }
        
        // Recalcular os créditos
        this.calcularCreditosTributarios();
    },
    
    /**
     * Mostra/oculta campos de incentivo ICMS
     * @private
     */
    _toggleCamposIncentivoICMS: function() {
        const possuiIncentivo = document.getElementById('possui-incentivo-icms').checked;
        const campoIncentivo = document.getElementById('campo-incentivo-icms');
        
        if (campoIncentivo) {
            campoIncentivo.style.display = possuiIncentivo ? 'block' : 'none';
        }
        
        // Recalcular alíquota efetiva
        this.calcularAliquotaEfetiva();
    },
    
    /**
     * Atualiza a visualização dos campos com base em seleções
     * @private
     * @param {string} tipo - Tipo de atualização: 'regime' ou 'tipo-operacao'
     */
    _atualizarVisualizacaoCampos: function(tipo) {
        if (tipo === 'regime') {
            const regime = document.getElementById('regime').value;

            // Campos específicos do Simples Nacional
            const camposSimples = document.getElementById('campos-simples');
            if (camposSimples) {
                camposSimples.style.display = regime === 'simples' ? 'block' : 'none';
            }

            // Campos específicos de PIS/COFINS para regimes Presumido/Real
            const camposPisCofins = document.getElementById('campos-lucro');
            if (camposPisCofins) {
                camposPisCofins.style.display = (regime === 'presumido' || regime === 'real') ? 'block' : 'none';
            }

            // Recalcular alíquota e atualizar painel
            this.calcularAliquotaEfetiva();
            this.calcularCreditosTributarios();
        }
        else if (tipo === 'tipo-operacao') {
            const tipoOperacao = document.getElementById('tipo-operacao').value;
            const tipoEmpresa = document.getElementById('tipo-empresa').value;

            // Campos de ICMS (para comércio e indústria)
            const camposIcms = document.querySelectorAll('.campos-icms, #campos-icms');
            camposIcms.forEach(campo => {
                campo.style.display = (tipoEmpresa === 'comercio' || tipoEmpresa === 'industria') ? 'block' : 'none';
            });

            // Campos de IPI (apenas para indústria)
            const camposIpi = document.querySelectorAll('.campos-ipi, #campos-ipi');
            camposIpi.forEach(campo => {
                campo.style.display = tipoEmpresa === 'industria' ? 'block' : 'none';
            });

            // Campos de ISS (apenas para serviços)
            const camposIss = document.querySelectorAll('.campos-iss, #campos-iss');
            camposIss.forEach(campo => {
                campo.style.display = tipoEmpresa === 'servicos' ? 'block' : 'none';
            });

            // Recalcular alíquota, créditos e atualizar painel
            this.calcularAliquotaEfetiva();
            this.calcularCreditosTributarios();
        }
    },
    
    /**
     * Salva os dados do formulário no repositório
     */
    salvarDadosFormulario: function() {
        if (!SimuladorRepository || typeof SimuladorRepository.atualizarSecao !== 'function') {
            console.error('Repositório não está disponível para salvar dados.');
            return;
        }
        
        // Obter e salvar parâmetros fiscais
        const parametrosFiscais = {
            aliquota: parseFloat(document.getElementById('aliquota').value) / 100 || 0,
            creditos: this._extrairValorNumerico(document.getElementById('creditos').value) || 0,
            regime: document.getElementById('regime').value,
            tipoOperacao: document.getElementById('tipo-operacao').value,
            
            // Campos adicionais do sistema atual
            cumulativeRegime: document.getElementById('pis-cofins-regime')?.value === 'cumulativo',
            serviceCompany: document.getElementById('tipo-operacao')?.value === 'servicos',
            
            // Créditos tributários específicos calculados
            creditosPIS: document.getElementById('pis-cofins-regime').value === 'nao-cumulativo' ? 
                ((this._extrairValorNumerico(document.getElementById('creditos-pis-cofins-calc').value) || 0) * 
                (parseFloat(document.getElementById('pis-aliquota').value) / 
                (parseFloat(document.getElementById('pis-aliquota').value) + parseFloat(document.getElementById('cofins-aliquota').value)))) : 0,
                
            creditosCOFINS: document.getElementById('pis-cofins-regime').value === 'nao-cumulativo' ? 
                ((this._extrairValorNumerico(document.getElementById('creditos-pis-cofins-calc').value) || 0) * 
                (parseFloat(document.getElementById('cofins-aliquota').value) / 
                (parseFloat(document.getElementById('pis-aliquota').value) + parseFloat(document.getElementById('cofins-aliquota').value)))) : 0,
                
            creditosICMS: this._extrairValorNumerico(document.getElementById('creditos-icms-calc').value) || 0,
            creditosIPI: this._extrairValorNumerico(document.getElementById('creditos-ipi-calc').value) || 0,
            
            // Percentuais e bases de cálculo para maior detalhe
            aliquotaICMS: parseFloat(document.getElementById('aliquota-icms').value) / 100 || 0,
            aliquotaIPI: parseFloat(document.getElementById('aliquota-ipi').value) / 100 || 0,
            aliquotaPIS: parseFloat(document.getElementById('pis-aliquota').value) / 100 || 0,
            aliquotaCOFINS: parseFloat(document.getElementById('cofins-aliquota').value) / 100 || 0,
            
            baseCalculoICMS: parseFloat(document.getElementById('icms-base-calc').value) / 100 || 0,
            baseCalculoIPI: parseFloat(document.getElementById('ipi-base-calc').value) / 100 || 0,
            baseCalculoPisCofins: parseFloat(document.getElementById('pis-cofins-base-calc').value) / 100 || 0,
            
            percAproveitamentoICMS: parseFloat(document.getElementById('icms-perc-credito').value) / 100 || 0,
            percAproveitamentoIPI: parseFloat(document.getElementById('ipi-perc-credito').value) / 100 || 0,
            percAproveitamentoPisCofins: parseFloat(document.getElementById('pis-cofins-perc-credito').value) / 100 || 0,
            
            // Dados para incentivos fiscais
            possuiIncentivoICMS: document.getElementById('possui-incentivo-icms').checked,
            percentualIncentivoICMS: parseFloat(document.getElementById('incentivo-icms').value) / 100 || 0
        };
        
        SimuladorRepository.atualizarSecao('parametrosFiscais', parametrosFiscais);
        
        // Obter e salvar parâmetros de simulação
        const dataInicial = document.getElementById('data-inicial').value;
        const dataFinal = document.getElementById('data-final').value;
        const cenario = document.getElementById('cenario').value;

        let taxaCrescimento = 0.05; // Valor padrão para cenário moderado

        if (cenario === 'personalizado') {
            taxaCrescimento = parseFloat(document.getElementById('taxa-crescimento').value) / 100 || 0.05;
        } else if (cenario === 'conservador') {
            taxaCrescimento = 0.02;
        } else if (cenario === 'otimista') {
            taxaCrescimento = 0.08;
        }
        
        const parametrosSimulacao = {
            dataInicial,
            dataFinal,
            cenario,
            taxaCrescimento
        };
        
        SimuladorRepository.atualizarSecao('parametrosSimulacao', parametrosSimulacao);
        
        // Salvar alterações no localStorage
        if (typeof SimuladorRepository.salvar === 'function') {
            SimuladorRepository.salvar();
        }
    },
    
    /**
     * Realiza a simulação com os dados do formulário
     */
    realizarSimulacao: function() {
        try {
            // Verificar se as configurações necessárias estão preenchidas
            const dadosEmpresa = SimuladorRepository.obterSecao('empresa');

            if (!dadosEmpresa.nome || !dadosEmpresa.setor || !dadosEmpresa.regime) {
                alert('É necessário preencher as configurações básicas da empresa antes de realizar a simulação.');
                return;
            }

            // Salvar dados do formulário no repositório
            this.salvarDadosFormulario();

            // Validar parâmetros obrigatórios
            const aliquota = parseFloat(document.getElementById('aliquota').value) / 100 || 0;
            const tipoOperacao = document.getElementById('tipo-operacao').value;
            const dataInicial = document.getElementById('data-inicial').value;
            const dataFinal = document.getElementById('data-final').value;
            const cenario = document.getElementById('cenario').value;

            if (aliquota <= 0 || !tipoOperacao || !dataInicial || !dataFinal || !cenario) {
                alert('Por favor, preencha todos os parâmetros obrigatórios de simulação.');
                return;
            }

            // Exibir indicador de carregamento
            this._mostrarCarregamento(true);

            try {
                // Executar a simulação usando o módulo de simulação
                if (typeof SimuladorModulo === 'undefined' || typeof SimuladorModulo.simular !== 'function') {
                    console.error('Módulo de simulação não encontrado ou não inicializado corretamente.');
                    alert('Erro: Módulo de simulação não encontrado. Por favor, recarregue a página e tente novamente.');
                    return;
                }

                const resultados = SimuladorModulo.simular();

                // Armazenar resultados no repositório
                SimuladorRepository.atualizarSecao('resultadosSimulacao', resultados);

                // Exibir resultados
                this.exibirResultados(resultados);

                // Marcar que a simulação foi realizada
                SimuladorRepository.atualizarCampo('interfaceState', 'simulacaoRealizada', true);

                // Atualizar gráficos
                if (window.ChartManager && typeof ChartManager.gerarGraficos === 'function') {
                    ChartManager.gerarGraficos(resultados);
                }
                
                // Habilitar botões de exportação
                this._atualizarBotoesExportacao(true);
            } catch (error) {
                console.error('Erro ao executar simulação:', error);
                alert('Ocorreu um erro durante a simulação: ' + (error.message || 'Erro desconhecido'));
            } finally {
                // Ocultar indicador de carregamento
                this._mostrarCarregamento(false);
            }
        } catch (error) {
            console.error('Erro ao preparar simulação:', error);
            alert('Ocorreu um erro ao preparar a simulação: ' + (error.message || 'Erro desconhecido'));
        }
    },
    
    /**
     * Exibe os resultados da simulação na interface
     * @param {Object} resultados - Resultados da simulação
     */
    exibirResultados: function(resultados) {
        if (!resultados) {
            console.error('Resultados de simulação inválidos.');
            return;
        }
        
        const secaoResultados = document.getElementById('results-section');
        if (secaoResultados) {
            secaoResultados.style.display = 'block';
        }
        
        // Exibir resumo executivo
        this.mostrarResumoExecutivo(resultados);
        
        // Exibir resultados detalhados
        this.mostrarResultadosDetalhados(resultados);
        
        // Exibir projeção temporal
        this.mostrarProjecaoTemporal(resultados);
        
        // Exibir aba de estratégias se existirem resultados de estratégias
        this.mostrarEstrategias(resultados);
    },
    
    /**
     * Exibe o resumo executivo da simulação
     * @param {Object} resultados - Resultados da simulação
     */
    mostrarResumoExecutivo: function(resultados) {
        const resumoContent = document.getElementById('resumo-content');
        if (!resumoContent) return;
        
        const impactoBase = resultados.impactoBase || {};
        
        // Formatar valores para exibição
        resumoContent.innerHTML = `
            <div class="result-card">
                <h3>Impacto no Capital de Giro</h3>
                <p class="result-value negative">${this.formatarMoeda(impactoBase.diferencaCapitalGiro || 0)}</p>
                <p class="result-desc">Representa ${(impactoBase.percentualImpacto || 0).toFixed(2)}% do capital de giro atual</p>
            </div>

            <div class="result-card">
                <h3>Necessidade Adicional de Capital</h3>
                <p class="result-value negative">${this.formatarMoeda(impactoBase.necesidadeAdicionalCapitalGiro || 0)}</p>
                <p class="result-desc">Considerando 20% de margem de segurança</p>
            </div>

            <div class="result-card">
                <h3>Impacto na Margem Operacional</h3>
                <p class="result-value">${(impactoBase.margemOperacionalOriginal || 0).toFixed(2)}% → ${(impactoBase.margemOperacionalAjustada || 0).toFixed(2)}%</p>
                <p class="result-desc">Redução de ${(impactoBase.impactoMargem || 0).toFixed(2)} pontos percentuais</p>
            </div>

            <div class="result-card">
                <h3>Impacto no Ciclo Financeiro</h3>
                <p class="result-value">${(impactoBase.impactoDiasFaturamento || 0).toFixed(1)} dias</p>
                <p class="result-desc">Equivalente a ${(impactoBase.impactoDiasFaturamento || 0).toFixed(1)} dias de faturamento</p>
            </div>
        `;
    },
    
    /**
     * Exibe os resultados detalhados da simulação
     * @param {Object} resultados - Resultados da simulação
     */
    mostrarResultadosDetalhados: function(resultados) {
        const detalhadoContent = document.getElementById('detalhado-content');
        if (!detalhadoContent) return;
        
        const impactoBase = resultados.impactoBase || {};
        
        // Calcular valores dos impostos no sistema atual vs. IVA Dual (se disponível)
        let comparacaoImpostos = '';
        if (impactoBase.resultadoSplitPayment && impactoBase.resultadoSplitPayment.impostosIVA) {
            const impostoAtual = impactoBase.resultadoAtual.impostos ? impactoBase.resultadoAtual.impostos.total : 0;
            const impostoIVA = impactoBase.resultadoSplitPayment.impostosIVA.total || 0;
            const diferencaImpostos = impostoIVA - impostoAtual;
            const percentualVariacao = (diferencaImpostos / impostoAtual) * 100;

            comparacaoImpostos = `
                <div class="comparison-section">
                    <h4>Comparação de Carga Tributária</h4>
                    <div class="comparison-row">
                        <div class="comparison-item">
                            <div class="item-label">Sistema Atual</div>
                            <div class="item-value">${this.formatarMoeda(impostoAtual)}</div>
                        </div>
                        <div class="comparison-item">
                            <div class="item-label">Sistema IVA Dual</div>
                            <div class="item-value">${this.formatarMoeda(impostoIVA)}</div>
                        </div>
                        <div class="comparison-item">
                            <div class="item-label">Diferença</div>
                            <div class="item-value ${diferencaImpostos >= 0 ? 'negative' : 'positive'}">${this.formatarMoeda(diferencaImpostos)}</div>
                            <div class="item-percent ${percentualVariacao >= 0 ? 'negative' : 'positive'}">(${percentualVariacao.toFixed(2)}%)</div>
                        </div>
                    </div>
                </div>
            `;
        }

        detalhadoContent.innerHTML = `
            <div class="comparison-section">
                <h4>Comparação do Capital de Giro</h4>
                <div class="comparison-row">
                    <div class="comparison-item">
                        <div class="item-label">Regime Atual</div>
                        <div class="item-value">${this.formatarMoeda(impactoBase.resultadoAtual ? impactoBase.resultadoAtual.capitalGiroDisponivel : 0)}</div>
                    </div>
                    <div class="comparison-item">
                        <div class="item-label">Regime Split Payment</div>
                        <div class="item-value">${this.formatarMoeda(impactoBase.resultadoSplitPayment ? impactoBase.resultadoSplitPayment.capitalGiroDisponivel : 0)}</div>
                    </div>
                    <div class="comparison-item">
                        <div class="item-label">Diferença</div>
                        <div class="item-value negative">${this.formatarMoeda(impactoBase.diferencaCapitalGiro || 0)}</div>
                        <div class="item-percent negative">(${(impactoBase.percentualImpacto || 0).toFixed(2)}%)</div>
                    </div>
                </div>
            </div>

            <div class="comparison-section">
                <h4>Impacto no Fluxo de Caixa</h4>
                <div class="comparison-row">
                    <div class="comparison-item">
                        <div class="item-label">Regime Atual</div>
                        <div class="item-value">${this.formatarMoeda(impactoBase.resultadoAtual ? impactoBase.resultadoAtual.fluxoCaixaLiquido : 0)}</div>
                    </div>
                    <div class="comparison-item">
                        <div class="item-label">Regime Split Payment</div>
                        <div class="item-value">${this.formatarMoeda(impactoBase.resultadoSplitPayment ? impactoBase.resultadoSplitPayment.fluxoCaixaLiquido : 0)}</div>
                    </div>
                    <div class="comparison-item">
                        <div class="item-label">Diferença</div>
                        <div class="item-value negative">${this.formatarMoeda((impactoBase.resultadoSplitPayment ? impactoBase.resultadoSplitPayment.fluxoCaixaLiquido : 0) 
                                                            - (impactoBase.resultadoAtual ? impactoBase.resultadoAtual.fluxoCaixaLiquido : 0))}</div>
                    </div>
                </div>
            </div>

            ${comparacaoImpostos}

            <div class="comparison-section">
                <h4>Benefício em Dias de Faturamento</h4>
                <div class="comparison-row">
                    <div class="comparison-item">
                        <div class="item-label">Regime Atual</div>
                        <div class="item-value">${(impactoBase.resultadoAtual ? impactoBase.resultadoAtual.beneficioDiasCapitalGiro : 0).toFixed(1)} dias</div>
                    </div>
                    <div class="comparison-item">
                        <div class="item-label">Regime Split Payment</div>
                        <div class="item-value">${(impactoBase.resultadoSplitPayment ? impactoBase.resultadoSplitPayment.beneficioDiasCapitalGiro : 0).toFixed(1)} dias</div>
                    </div>
                    <div class="comparison-item">
                        <div class="item-label">Diferença</div>
                        <div class="item-value negative">${(impactoBase.impactoDiasFaturamento || 0).toFixed(1)} dias</div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Exibe a projeção temporal dos resultados
     * @param {Object} resultados - Resultados da simulação
     */
    mostrarProjecaoTemporal: function(resultados) {
        const projecaoContent = document.getElementById('projecao-content');
        if (!projecaoContent) return;
        
        const projecao = resultados.projecaoTemporal || {};
        
        // Construir tabela de projeção anual
        let projecaoTable = `
            <h4>Projeção do Impacto ao Longo do Tempo</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Ano</th>
                        <th>% Implementação</th>
                        <th>Faturamento</th>
                        <th>Impacto no Capital de Giro</th>
                        <th>Custo Financeiro</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (projecao.resultadosAnuais) {
            Object.entries(projecao.resultadosAnuais).forEach(([ano, resultado]) => {
                projecaoTable += `
                    <tr>
                        <td>${ano}</td>
                        <td>${(resultado.resultadoSplitPayment ? resultado.resultadoSplitPayment.percentualImplementacao * 100 : 0).toFixed(0)}%</td>
                        <td>${this.formatarMoeda(resultado.resultadoAtual ? resultado.resultadoAtual.faturamento : 0)}</td>
                        <td class="negative">${this.formatarMoeda(resultado.diferencaCapitalGiro || 0)}</td>
                        <td class="negative">${this.formatarMoeda(resultado.impactoMargem ? resultado.impactoMargem.custoMensalCapitalGiro : 0)}</td>
                    </tr>
                `;
            });
        }

        projecaoTable += `
                </tbody>
            </table>
        `;

        projecaoContent.innerHTML = `
            <div class="chart-container">
                <h4>Gráfico de Impacto ao Longo do Tempo</h4>
                <div id="impacto-chart" style="height: 300px;"></div>
            </div>

            ${projecaoTable}

            <div class="summary-box">
                <h4>Impacto Acumulado (${projecao.parametros ? projecao.parametros.anoInicial : '-'}-${projecao.parametros ? projecao.parametros.anoFinal : '-'})</h4>
                <div class="summary-item">
                    <div class="item-label">Necessidade Total de Capital de Giro:</div>
                    <div class="item-value negative">${this.formatarMoeda(projecao.impactoAcumulado ? projecao.impactoAcumulado.totalNecessidadeCapitalGiro : 0)}</div>
                </div>
                <div class="summary-item">
                    <div class="item-label">Custo Financeiro Total:</div>
                    <div class="item-value negative">${this.formatarMoeda(projecao.impactoAcumulado ? projecao.impactoAcumulado.custoFinanceiroTotal : 0)}</div>
                </div>
            </div>
        `;
        
        // Renderizar gráfico após o HTML estar carregado
        setTimeout(() => {
            this._configurarGraficos(resultados);
        }, 100);
    },
    
    /**
     * Exibe a aba de estratégias
     * @param {Object} resultados - Resultados da simulação
     */
    mostrarEstrategias: function(resultados) {
        const estrategiasContent = document.getElementById('estrategias-content');
        if (!estrategiasContent) return;
        
        // Exibir formulário para configurar estratégias
        estrategiasContent.innerHTML = `
            <h4>Estratégias para Mitigar o Impacto</h4>
            <p>Selecione as estratégias que deseja simular:</p>

            <div class="strategies-grid">
                <div class="strategy-card">
                    <div class="strategy-header">
                        <h5>Ajuste de Preços</h5>
                        <label class="switch">
                            <input type="checkbox" id="estrategia-precos" class="estrategia-checkbox">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <p>Repassar parte do impacto aos preços dos produtos/serviços.</p>
                    <div class="strategy-form" id="estrategia-precos-form" style="display:none;">
                        <div class="form-group">
                            <label for="precos-percentual">Aumento de Preços (%):</label>
                            <input type="number" id="precos-percentual" name="precos-percentual" min="0" max="20" step="0.1" value="3">
                        </div>
                        <div class="form-group">
                            <label for="precos-elasticidade">Elasticidade (%):</label>
                            <input type="number" id="precos-elasticidade" name="precos-elasticidade" min="-2" max="0" step="0.1" value="-0.5">
                        </div>
                    </div>
                </div>

                <div class="strategy-card">
                    <div class="strategy-header">
                        <h5>Renegociação de Prazos</h5>
                        <label class="switch">
                            <input type="checkbox" id="estrategia-prazos" class="estrategia-checkbox">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <p>Negociar prazos mais longos com fornecedores.</p>
                    <div class="strategy-form" id="estrategia-prazos-form" style="display:none;">
                        <div class="form-group">
                            <label for="prazos-aumento">Aumento do Prazo (dias):</label>
                            <input type="number" id="prazos-aumento" name="prazos-aumento" min="0" max="60" step="1" value="15">
                        </div>
                        <div class="form-group">
                            <label for="prazos-percentual">% de Fornecedores:</label>
                            <input type="number" id="prazos-percentual" name="prazos-percentual" min="0" max="100" step="1" value="50">
                        </div>
                    </div>
                </div>

                <div class="strategy-card">
                    <div class="strategy-header">
                        <h5>Antecipação de Recebíveis</h5>
                        <label class="switch">
                            <input type="checkbox" id="estrategia-recebiveis" class="estrategia-checkbox">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <p>Antecipar recebíveis para melhorar o fluxo de caixa.</p>
                    <div class="strategy-form" id="estrategia-recebiveis-form" style="display:none;">
                        <div class="form-group">
                            <label for="recebiveis-percentual">% a Antecipar:</label>
                            <input type="number" id="recebiveis-percentual" name="recebiveis-percentual" min="0" max="100" step="1" value="40">
                        </div>
                        <div class="form-group">
                            <label for="recebiveis-taxa">Taxa de Desconto (% a.m.):</label>
                            <input type="number" id="recebiveis-taxa" name="recebiveis-taxa" min="0" max="5" step="0.1" value="1.8">
                        </div>
                    </div>
                </div>

                <div class="strategy-card">
                    <div class="strategy-header">
                        <h5>Capital de Giro</h5>
                        <label class="switch">
                            <input type="checkbox" id="estrategia-capital" class="estrategia-checkbox">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <p>Captar capital de giro para suprir a necessidade.</p>
                    <div class="strategy-form" id="estrategia-capital-form" style="display:none;">
                        <div class="form-group">
                            <label for="capital-percentual">% da Necessidade:</label>
                            <input type="number" id="capital-percentual" name="capital-percentual" min="0" max="100" step="1" value="100">
                        </div>
                        <div class="form-group">
                            <label for="capital-taxa">Taxa de Juros (% a.m.):</label>
                            <input type="number" id="capital-taxa" name="capital-taxa" min="0" max="5" step="0.1" value="2.1">
                        </div>
                    </div>
                </div>
            </div>

            <div class="button-section">
                <button id="simular-estrategias-btn" class="primary-btn">Simular Estratégias</button>
            </div>

            <div id="estrategias-resultado" style="display:none;">
                <h4>Resultados das Estratégias</h4>
                <div id="estrategias-resultado-content"></div>
            </div>
        `;
        
        // Adicionar eventos para os checkboxes de estratégias
        document.querySelectorAll('.estrategia-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const formId = this.id + '-form';
                document.getElementById(formId).style.display = this.checked ? 'block' : 'none';
            });
        });
        
        // Adicionar evento para o botão de simulação de estratégias
        document.getElementById('simular-estrategias-btn').addEventListener('click', () => {
            this.simularEstrategias(resultados);
        });
    },
    
    /**
     * Simula o efeito das estratégias selecionadas
     * @param {Object} resultadosBase - Resultados base da simulação
     */
    simularEstrategias: function(resultadosBase) {
        // Verificar se o módulo está disponível
        if (typeof SimuladorModulo === 'undefined' || 
            typeof SimuladorModulo.IVADualSystem === 'undefined' ||
            typeof SimuladorModulo.IVADualSystem.calcularEfeitividadeMitigacao !== 'function') {
            
            alert('Módulo de simulação de estratégias não está disponível.');
            return;
        }
        
        // Coletar dados das estratégias selecionadas
        const estrategias = {
            ajustePrecos: {
                ativar: document.getElementById('estrategia-precos').checked,
                percentualAumento: parseFloat(document.getElementById('precos-percentual').value),
                elasticidade: parseFloat(document.getElementById('precos-elasticidade').value),
                periodoAjuste: 12 // 12 meses
            },
            renegociacaoPrazos: {
                ativar: document.getElementById('estrategia-prazos').checked,
                aumentoPrazo: parseInt(document.getElementById('prazos-aumento').value),
                percentualFornecedores: parseFloat(document.getElementById('prazos-percentual').value),
                contrapartidas: 'desconto',
                custoContrapartida: 0.5 // 0,5%
            },
            antecipacaoRecebiveis: {
                ativar: document.getElementById('estrategia-recebiveis').checked,
                percentualAntecipacao: parseFloat(document.getElementById('recebiveis-percentual').value),
                taxaDesconto: parseFloat(document.getElementById('recebiveis-taxa').value) / 100,
                prazoAntecipacao: 30 // 30 dias
            },
            capitalGiro: {
                ativar: document.getElementById('estrategia-capital').checked,
                valorCaptacao: parseFloat(document.getElementById('capital-percentual').value),
                taxaJuros: parseFloat(document.getElementById('capital-taxa').value) / 100,
                prazoPagamento: 12, // 12 meses
                carencia: 1 // 1 mês
            },
            mixProdutos: {
                ativar: false // Não implementado na UI
            },
            meiosPagamento: {
                ativar: false // Não implementado na UI
            }
        };
        
        // Obter dados da simulação
        const dadosSimulacao = {
            faturamento: parseFloat(this._extrairValorNumerico(document.getElementById('faturamento').value)) || 0,
            margem: parseFloat(SimuladorRepository.obterSecao('empresa').margem) || 0.15,
            pmr: parseFloat(SimuladorRepository.obterSecao('cicloFinanceiro').pmr) || 30,
            pmp: parseFloat(SimuladorRepository.obterSecao('cicloFinanceiro').pmp) || 30,
            pme: parseFloat(SimuladorRepository.obterSecao('cicloFinanceiro').pme) || 30,
            percVista: parseFloat(SimuladorRepository.obterSecao('cicloFinanceiro').percVista) || 0.3,
            percPrazo: parseFloat(SimuladorRepository.obterSecao('cicloFinanceiro').percPrazo) || 0.7,
            aliquota: parseFloat(document.getElementById('aliquota').value) / 100 || 0.265,
            creditos: this._extrairValorNumerico(document.getElementById('creditos').value) || 0,
            taxaCapitalGiro: 0.021 // 2,1% a.m.
        };
        
        // Ano inicial da simulação
        const dataInicial = document.getElementById('data-inicial').value;
        const anoInicial = dataInicial ? parseInt(dataInicial.split('-')[0]) : 2026;
        
        // Exibir indicador de carregamento
        this._mostrarCarregamento(true);
        
        try {
            // Calcular efetividade das estratégias
            const efetividade = SimuladorModulo.IVADualSystem.calcularEfeitividadeMitigacao(
                dadosSimulacao, 
                estrategias, 
                anoInicial
            );
            
            // Armazenar resultados de estratégias no repositório
            SimuladorRepository.atualizarSecao('resultadosEstrategias', efetividade);
            
            // Exibir resultados
            this.exibirResultadosEstrategias(efetividade);
        } catch (error) {
            console.error('Erro ao simular estratégias:', error);
            alert('Ocorreu um erro ao simular as estratégias: ' + (error.message || 'Erro desconhecido'));
        } finally {
            // Ocultar indicador de carregamento
            this._mostrarCarregamento(false);
        }
    },
    
    /**
     * Exibe os resultados das estratégias simuladas
     * @param {Object} efetividade - Resultados de efetividade das estratégias
     */
    exibirResultadosEstrategias: function(efetividade) {
        const resultado = document.getElementById('estrategias-resultado-content');
        if (!resultado) return;
        
        // Exibir área de resultados
        document.getElementById('estrategias-resultado').style.display = 'block';
        
        // Estratégias selecionadas
        let estrategiasHtml = '';
        if (efetividade.estrategiasOrdenadas && efetividade.estrategiasOrdenadas.length > 0) {
            estrategiasHtml = `
                <div class="strategies-results">
                    <h5>Estratégias por Efetividade</h5>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Estratégia</th>
                                <th>Efetividade</th>
                                <th>Custo</th>
                                <th>Relação Custo/Benefício</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            efetividade.estrategiasOrdenadas.forEach(([estrategia, resultado]) => {
                const nomeEstrategia = this._traduzirNomeEstrategia(estrategia);
                estrategiasHtml += `
                    <tr>
                        <td>${nomeEstrategia}</td>
                        <td>${resultado.efetividadePercentual.toFixed(2)}%</td>
                        <td class="negative">${this.formatarMoeda(resultado.custoMensalJuros || resultado.custoImplementacao || resultado.custoTotalIncentivo || 0)}</td>
                        <td>${resultado.custoBeneficio.toFixed(3)}</td>
                    </tr>
                `;
            });

            estrategiasHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        // Combinação ótima
        let combinacaoHtml = '';
        if (efetividade.combinacaoOtima && efetividade.combinacaoOtima.estrategiasSelecionadas && 
            efetividade.combinacaoOtima.estrategiasSelecionadas.length > 0) {
            
            combinacaoHtml = `
                <div class="optimal-combination">
                    <h5>Combinação Ótima de Estratégias</h5>
                    <p>A combinação ótima tem <strong>${efetividade.combinacaoOtima.efetividadePercentual.toFixed(2)}%</strong> de efetividade, mitigando o impacto com custo de ${this.formatarMoeda(efetividade.combinacaoOtima.custoTotal)} mensais.</p>
                    <div class="selected-strategies">
                        <span class="label">Estratégias:</span>
                        ${efetividade.combinacaoOtima.nomeEstrategias.map(nome => `<span class="strategy-tag">${nome}</span>`).join('')}
                    </div>
                </div>
            `;
        }
        
        // Resultado combinado
        let resultadoCombinadoHtml = '';
        if (efetividade.efeitividadeCombinada && efetividade.efeitividadeCombinada.efetividadePercentual > 0) {
            resultadoCombinadoHtml = `
                <div class="combined-result">
                    <h5>Resultado da Combinação de Estratégias</h5>
                    <div class="result-summary">
                        <div class="result-item">
                            <div class="item-label">Efetividade Total:</div>
                            <div class="item-value">${efetividade.efeitividadeCombinada.efetividadePercentual.toFixed(2)}%</div>
                        </div>
                        <div class="result-item">
                            <div class="item-label">Mitigação Mensal:</div>
                            <div class="item-value positive">${this.formatarMoeda(efetividade.efeitividadeCombinada.mitigacaoTotal)}</div>
                        </div>
                        <div class="result-item">
                            <div class="item-label">Custo Mensal:</div>
                            <div class="item-value negative">${this.formatarMoeda(efetividade.efeitividadeCombinada.custoTotal)}</div>
                        </div>
                        <div class="result-item">
                            <div class="item-label">Impacto Residual:</div>
                            <div class="item-value ${efetividade.efeitividadeCombinada.efetividadePercentual >= 100 ? 'positive' : 'negative'}">${this.formatarMoeda(efetividade.impactoBase.necesidadeAdicionalCapitalGiro * (1 - efetividade.efeitividadeCombinada.efetividadePercentual / 100))}</div>
                        </div>
                    </div>

                    <div class="cycle-impact">
                        <h6>Impacto no Ciclo Financeiro</h6>
                        <div class="cycle-change">
                            <span>Ciclo Original: ${(efetividade.impactoBase.resultadoAtual.pmr + efetividade.impactoBase.resultadoAtual.pme - efetividade.impactoBase.resultadoAtual.pmp).toFixed(1)} dias</span>
                            <span class="arrow">→</span>
                            <span>Ciclo Ajustado: ${efetividade.efeitividadeCombinada.cicloFinanceiroAjustado.toFixed(1)} dias</span>
                            <span class="change ${efetividade.efeitividadeCombinada.variacaoCiclo <= 0 ? 'positive' : 'negative'}">(${efetividade.efeitividadeCombinada.variacaoCiclo.toFixed(1)} dias)</span>
                        </div>
                    </div>

                    <div class="margin-impact">
                        <h6>Impacto na Margem Operacional</h6>
                        <div class="margin-change">
                            <span>Margem Original: ${(efetividade.impactoBase.resultadoAtual.margem * 100).toFixed(2)}%</span>
                            <span class="arrow">→</span>
                            <span>Margem Ajustada: ${(efetividade.efeitividadeCombinada.margemAjustada * 100).toFixed(2)}%</span>
                            <span class="change ${efetividade.efeitividadeCombinada.margemAjustada >= efetividade.impactoBase.resultadoAtual.margem ? 'positive' : 'negative'}">(${((efetividade.efeitividadeCombinada.margemAjustada - efetividade.impactoBase.resultadoAtual.margem) * 100).toFixed(2)} p.p.)</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Montar HTML completo
        resultado.innerHTML = `
            <div class="estrategias-container">
                <div class="impact-summary">
                    <h5>Impacto Base do Split Payment</h5>
                    <div class="summary-value negative">${this.formatarMoeda(efetividade.impactoBase.diferencaCapitalGiro)}</div>
                    <div class="summary-percent negative">(${efetividade.impactoBase.percentualImpacto.toFixed(2)}% do capital de giro)</div>
                    <div class="needed-capital">
                        <span>Necessidade adicional: </span>
                        <span class="negative">${this.formatarMoeda(efetividade.impactoBase.necesidadeAdicionalCapitalGiro)}</span>
                    </div>
                </div>

                ${estrategiasHtml}

                ${combinacaoHtml}

                ${resultadoCombinadoHtml}
            </div>
        `;
    },
    
    /**
     * Configura e renderiza os gráficos dos resultados
     * @param {Object} resultados - Resultados da simulação
     * @private
     */
    _configurarGraficos: function(resultados) {
        // Verificar se o ChartManager está disponível
        if (typeof window.ChartManager !== 'undefined' && typeof ChartManager.gerarGraficos === 'function') {
            ChartManager.gerarGraficos(resultados);
        } else {
            console.warn('ChartManager não está disponível. Os gráficos não serão renderizados.');
        }
    },
    
    /**
     * Atualiza os botões de exportação
     * @param {boolean} habilitar - Indica se os botões devem ser habilitados
     * @private
     */
    _atualizarBotoesExportacao: function(habilitar) {
        const botoes = document.querySelectorAll('.export-btn, #exportar-btn');
        botoes.forEach(botao => {
            botao.disabled = !habilitar;
        });
    },
    
    /**
     * Traduz o nome interno da estratégia para exibição
     * @param {string} estrategia - Nome interno da estratégia
     * @returns {string} Nome traduzido
     * @private
     */
    _traduzirNomeEstrategia: function(estrategia) {
        const traducoes = {
            ajustePrecos: "Ajuste de Preços",
            renegociacaoPrazos: "Renegociação de Prazos",
            antecipacaoRecebiveis: "Antecipação de Recebíveis",
            capitalGiro: "Capital de Giro",
            mixProdutos: "Mix de Produtos",
            meiosPagamento: "Meios de Pagamento"
        };

        return traducoes[estrategia] || estrategia;
    },
    
    /**
     * Mostra ou oculta o indicador de carregamento
     * @param {boolean} mostrar - Indica se o carregamento deve ser mostrado
     * @private
     */
    _mostrarCarregamento: function(mostrar) {
        const loader = document.getElementById('simulacao-loader');
        if (loader) {
            loader.style.display = mostrar ? 'block' : 'none';
        }
    },
    
    /**
     * Extrai o valor numérico de uma string formatada como moeda
     * @param {string} valor - Valor formatado como moeda
     * @returns {number} Valor numérico
     * @private
     */
    _extrairValorNumerico: function(valor) {
        if (!valor) return 0;
        
        // Remove caracteres não numéricos, exceto o ponto e a vírgula
        return parseFloat(valor.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    },
    
    /**
     * Formata um valor numérico como moeda (R$)
     * @param {number} valor - Valor a ser formatado
     * @returns {string} Valor formatado como moeda
     */
    formatarMoeda: function(valor) {
        if (valor === undefined || valor === null) {
            return 'R$ 0,00';
        }
        
        return 'R$ ' + valor.toLocaleString('pt-BR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    }
};

// Inicialização automática quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar apenas quando a aba estiver ativa
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            if (this.getAttribute('data-tab') === 'simulacao-principal') {
                SimulacaoPrincipalController.inicializar();
            }
        });
    });
    
    // Se a aba de simulação já estiver ativa, inicializar o controlador
    if (document.querySelector('.tab-button[data-tab="simulacao-principal"].active')) {
        SimulacaoPrincipalController.inicializar();
    }
});