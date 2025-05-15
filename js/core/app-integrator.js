/**
 * Integrador de Aplicação
 * Responsável por conectar os diversos módulos da aplicação
 */
const AppIntegrator = {
    /**
     * Inicializa o integrador
     */
    initialize: function() {
        console.log('Inicializando integrador de aplicação...');
        
        // Verificar disponibilidade dos módulos essenciais
        this._checkModulesAvailability();
        
        // Inicializar gerenciador de estado
        if (typeof StateManager !== 'undefined') {
            // Carregar estado do localStorage
            StateManager.loadFromLocalStorage();
            
            // Configurar salvamento automático
            this._setupAutoSave();
            
            console.log('Gerenciador de estado inicializado com sucesso');
        }
        
        // Conectar componentes e integrar eventos
        this._connectComponents();
        
        // Observar mudanças no estado para atualizar a interface
        this._setupStateObservers();
        
        console.log('Integrador de aplicação inicializado com sucesso');
    },
    
    /**
     * Verifica a disponibilidade dos módulos necessários
     * @private
     */
    _checkModulesAvailability: function() {
        const requiredModules = [
            { name: 'StateManager', available: typeof StateManager !== 'undefined' },
            { name: 'EventBus', available: typeof EventBus !== 'undefined' },
            { name: 'DOMUtils', available: typeof DOMUtils !== 'undefined' },
            { name: 'TabsManager', available: typeof TabsManager !== 'undefined' },
            { name: 'FormsManager', available: typeof FormsManager !== 'undefined' }
        ];
        
        // Verificar disponibilidade
        const missingModules = requiredModules.filter(module => !module.available);
        
        if (missingModules.length > 0) {
            console.warn('Módulos necessários não disponíveis:', missingModules.map(m => m.name).join(', '));
        }
    },
    
    /**
     * Configura salvamento automático do estado
     * @private
     */
    _setupAutoSave: function() {
        // Salvar no unload da página
        window.addEventListener('beforeunload', () => {
            StateManager.saveToLocalStorage();
        });
        
        // Salvar a cada 30 segundos
        setInterval(() => {
            StateManager.saveToLocalStorage();
        }, 30000);
    },
    
    /**
     * Conecta os componentes da aplicação
     * @private
     */
    _connectComponents: function() {
        // Integrar gerenciador de abas com Bus de Eventos
        if (typeof TabsManager !== 'undefined' && typeof EventBus !== 'undefined') {
            // Substituir código de mudança de aba por versão baseada em eventos
            const originalMudarPara = TabsManager.mudarPara;
            
            TabsManager.mudarPara = function(tabId) {
                originalMudarPara.call(TabsManager, tabId);
                EventBus.publish('tabChange', { tabId });
            };
            
            // Observar eventos de mudança de aba do DOM
            document.addEventListener('tabChange', function(event) {
                if (event.detail && event.detail.tab) {
                    EventBus.publish('tabChange', { tabId: event.detail.tab });
                    
                    // Atualizar estado
                    if (typeof StateManager !== 'undefined') {
                        StateManager.updateField('interfaceState', 'tabAtiva', event.detail.tab);
                    }
                }
            });
            
            console.log('Integração TabsManager ↔ EventBus realizada com sucesso');
        }
        
        // Integrar gerenciador de formulários com gerenciador de estado
        if (typeof FormsManager !== 'undefined' && typeof StateManager !== 'undefined') {
            // Configurar para atualizar estado ao calcular ciclo financeiro
            const originalCalcularCicloFinanceiro = FormsManager.calcularCicloFinanceiro;
            
            FormsManager.calcularCicloFinanceiro = function() {
                // Chamar implementação original
                const resultado = originalCalcularCicloFinanceiro.apply(FormsManager, arguments);
                
                // Atualizar estado com novos valores
                const pmr = parseInt(DOMUtils.getValue('pmr')) || 0;
                const pmp = parseInt(DOMUtils.getValue('pmp')) || 0;
                const pme = parseInt(DOMUtils.getValue('pme')) || 0;
                const cicloFinanceiro = parseInt(DOMUtils.getValue('ciclo-financeiro')) || 0;
                const considerarSplit = DOMUtils.getValue('considerar-split') || false;
                
                StateManager.updateState('cicloFinanceiro', {
                    pmr,
                    pmp,
                    pme,
                    cicloFinanceiro,
                    considerarSplit
                });
                
                return resultado;
            };
            
            console.log('Integração FormsManager ↔ StateManager realizada com sucesso');
        }
        
        // Integrar simulador com gerenciador de estado
        if (typeof SimuladorFluxoCaixa !== 'undefined' && typeof StateManager !== 'undefined') {
            // Sobrescrever método de simulação para atualizar estado
            const originalSimularImpacto = SimuladorFluxoCaixa.simularImpacto;
            
            SimuladorFluxoCaixa.simularImpacto = function() {
                // Atualizar estado com dados do formulário
                this._atualizarEstadoAntesDeSimular();
                
                // Chamar implementação original
                const resultado = originalSimularImpacto.apply(SimuladorFluxoCaixa, arguments);
                
                // Atualizar estado com resultados
                if (window.ultimaSimulacao) {
                    StateManager.updateState('resultadosSimulacao', window.ultimaSimulacao.resultados);
                    StateManager.updateField('interfaceState', 'simulacaoRealizada', true);
                }
                
                // Publicar evento de simulação concluída
                if (typeof EventBus !== 'undefined') {
                    EventBus.publish('simulacaoConcluida', window.ultimaSimulacao);
                }
                
                return resultado;
            };
            
            // Método para atualizar estado antes de simular
            SimuladorFluxoCaixa._atualizarEstadoAntesDeSimular = function() {
                StateManager.updateState('empresa', {
                    nome: DOMUtils.getValue('empresa'),
                    setor: DOMUtils.getValue('setor'),
                    regime: DOMUtils.getValue('regime'),
                    faturamento: DOMUtils.getValue('faturamento'),
                    margem: parseFloat(DOMUtils.getValue('margem')) / 100
                });
                
                StateManager.updateState('parametrosFiscais', {
                    aliquota: parseFloat(DOMUtils.getValue('aliquota')) / 100,
                    tipoOperacao: DOMUtils.getValue('tipo-operacao'),
                    creditos: DOMUtils.getValue('creditos')
                });
                
                StateManager.updateState('parametrosSimulacao', {
                    dataInicial: DOMUtils.getValue('data-inicial'),
                    dataFinal: DOMUtils.getValue('data-final'),
                    cenario: DOMUtils.getValue('cenario'),
                    taxaCrescimento: parseFloat(DOMUtils.getValue('taxa-crescimento')) / 100
                });
            };
            
            console.log('Integração SimuladorFluxoCaixa ↔ StateManager realizada com sucesso');
        }
    },
    
    /**
     * Configura observadores de estado para atualizar a interface
     * @private
     */
    _setupStateObservers: function() {
        if (typeof StateManager === 'undefined') return;
        
        // Observar mudanças em dados da empresa
        StateManager.subscribe('empresa', data => {
            // Atualizar campos de formulário
            if (DOMUtils.getElement('empresa')) {
                DOMUtils.setValue('empresa', data.nome || '');
            }
            
            if (DOMUtils.getElement('setor')) {
                DOMUtils.setValue('setor', data.setor || '');
            }
            
            if (DOMUtils.getElement('regime')) {
                DOMUtils.setValue('regime', data.regime || '');
            }
            
            if (DOMUtils.getElement('faturamento')) {
                DOMUtils.setValue('faturamento', data.faturamento || 0);
            }
            
            if (DOMUtils.getElement('margem')) {
                DOMUtils.setValue('margem', (data.margem || 0) * 100);
            }
        });
        
        // Observar mudanças em ciclo financeiro
        StateManager.subscribe('cicloFinanceiro', data => {
            // Atualizar campos de formulário
            if (DOMUtils.getElement('pmr')) {
                DOMUtils.setValue('pmr', data.pmr || 0);
            }
            
            if (DOMUtils.getElement('pmp')) {
                DOMUtils.setValue('pmp', data.pmp || 0);
            }
            
            if (DOMUtils.getElement('pme')) {
                DOMUtils.setValue('pme', data.pme || 0);
            }
            
            if (DOMUtils.getElement('ciclo-financeiro')) {
                DOMUtils.setValue('ciclo-financeiro', data.cicloFinanceiro || 0);
            }
            
            if (DOMUtils.getElement('considerar-split')) {
                DOMUtils.setValue('considerar-split', data.considerarSplit || false);
            }
            
            if (DOMUtils.getElement('perc-vista')) {
                DOMUtils.setValue('perc-vista', (data.percVista || 0) * 100);
            }
            
            if (DOMUtils.getElement('perc-prazo')) {
                DOMUtils.setValue('perc-prazo', (data.percPrazo || 0) * 100);
            }
        });
        
        // Observar mudanças em parâmetros fiscais
        StateManager.subscribe('parametrosFiscais', data => {
            // Atualizar campos de formulário
            if (DOMUtils.getElement('aliquota')) {
                DOMUtils.setValue('aliquota', (data.aliquota || 0) * 100);
            }
            
            if (DOMUtils.getElement('tipo-operacao')) {
                DOMUtils.setValue('tipo-operacao', data.tipoOperacao || 'b2b');
            }
            
            if (DOMUtils.getElement('creditos')) {
                DOMUtils.setValue('creditos', data.creditos || 0);
            }
        });
        
        // Observar mudanças em parâmetros de simulação
        StateManager.subscribe('parametrosSimulacao', data => {
            // Atualizar campos de formulário
            if (DOMUtils.getElement('data-inicial')) {
                DOMUtils.setValue('data-inicial', data.dataInicial || '2026-01-01');
            }
            
            if (DOMUtils.getElement('data-final')) {
                DOMUtils.setValue('data-final', data.dataFinal || '2033-12-31');
            }
            
            if (DOMUtils.getElement('cenario')) {
                DOMUtils.setValue('cenario', data.cenario || 'moderado');
            }
            
            if (DOMUtils.getElement('taxa-crescimento')) {
                DOMUtils.setValue('taxa-crescimento', (data.taxaCrescimento || 0) * 100);
            }
            
            // Atualizar visibilidade do campo de taxa personalizada
            if (data.cenario === 'personalizado') {
                DOMUtils.show('cenario-personalizado');
            } else {
                DOMUtils.hide('cenario-personalizado');
            }
        });
        
        // Observar mudanças no estado da interface
        StateManager.subscribe('interfaceState', data => {
            // Atualizar aba ativa
            if (data.tabAtiva && typeof TabsManager !== 'undefined') {
                TabsManager.mudarPara(data.tabAtiva);
            }
            
            // Verificar se a simulação foi realizada
            if (data.simulacaoRealizada) {
                // Habilitar elementos que dependem da simulação
                const btnExportarPDF = DOMUtils.getElement('btn-exportar-pdf');
                const btnExportarExcel = DOMUtils.getElement('btn-exportar-excel');
                
                if (btnExportarPDF) {
                    btnExportarPDF.disabled = false;
                }
                
                if (btnExportarExcel) {
                    btnExportarExcel.disabled = false;
                }
            }
        });
    }
};

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar após um pequeno atraso para garantir que todos os outros módulos foram carregados
    setTimeout(function() {
        AppIntegrator.initialize();
    }, 500);
});