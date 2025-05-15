/**
 * Gerenciador de Estado Central
 * Implementa o padrão Observer para gerenciar e sincronizar o estado da aplicação
 */
const StateManager = (function() {
    // Estado inicial da aplicação
    let _state = {
        empresa: {
            nome: '',
            setor: '',
            regime: '',
            faturamento: 0,
            margem: 0.15
        },
        cicloFinanceiro: {
            pmr: 30,
            pmp: 30,
            pme: 30,
            percVista: 0.3,
            percPrazo: 0.7,
            considerarSplit: false
        },
        parametrosFiscais: {
            aliquota: 0.265,
            tipoOperacao: 'b2b',
            creditos: 0,
            compensacao: 'automatica'
        },
        parametrosSimulacao: {
            dataInicial: '2026-01-01',
            dataFinal: '2033-12-31',
            cenario: 'moderado',
            taxaCrescimento: 0.05
        },
        parametrosFinanceiros: {
            taxaAntecipacao: 0.018,
            taxaCapitalGiro: 0.021,
            spreadBancario: 0.035
        },
        cronogramaImplementacao: {
            2026: 0.10,
            2027: 0.25,
            2028: 0.40,
            2029: 0.55,
            2030: 0.70,
            2031: 0.85,
            2032: 0.95,
            2033: 1.00
        },
        setoresEspeciais: {},
        resultadosSimulacao: null,
        interfaceState: {
            simulacaoRealizada: false,
            tabAtiva: 'simulacao',
            estrategiaAtiva: 'ajuste-precos'
        }
    };

    // Registro de observadores
    const _observers = {};

    // Histórico de alterações (para desfazer/refazer)
    const _history = [];
    let _historyIndex = -1;
    const _maxHistorySize = 50;

    /**
     * Notifica observadores sobre mudanças no estado
     * @param {string} section - Seção do estado que foi alterada
     * @param {Object} data - Novos dados
     */
    function _notifyObservers(section, data) {
        if (!_observers[section]) return;
        
        _observers[section].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Erro ao notificar observador para a seção ${section}:`, error);
            }
        });

        // Notificar observadores globais
        if (section !== '*' && _observers['*']) {
            _observers['*'].forEach(callback => {
                try {
                    callback({ section, data });
                } catch (error) {
                    console.error('Erro ao notificar observador global:', error);
                }
            });
        }
    }

    /**
     * Adiciona uma entrada ao histórico
     * @param {Object} stateSnapshot - Snapshot completo do estado
     */
    function _addToHistory(stateSnapshot) {
        // Limitar tamanho do histórico
        if (_history.length >= _maxHistorySize) {
            _history.shift();
        } else {
            // Eliminar entradas "futuras" se estiver desfazendo
            if (_historyIndex < _history.length - 1) {
                _history.splice(_historyIndex + 1);
            }
        }
        
        _history.push(JSON.parse(JSON.stringify(stateSnapshot)));
        _historyIndex = _history.length - 1;
    }

    // API pública
    return {
        /**
         * Obtém o estado atual de uma seção
         * @param {string} section - Seção do estado a obter (se omitido, retorna estado completo)
         * @returns {Object} - Estado da seção ou estado completo
         */
        getState: function(section) {
            if (!section || section === '*') {
                return JSON.parse(JSON.stringify(_state));
            }
            
            return _state[section] ? JSON.parse(JSON.stringify(_state[section])) : null;
        },

        /**
         * Atualiza uma seção do estado
         * @param {string} section - Seção do estado a atualizar
         * @param {Object} data - Novos dados
         * @returns {boolean} - Sucesso da operação
         */
        updateState: function(section, data) {
            if (!section || !data) return false;
            
            // Criar snapshot para histórico
            _addToHistory(_state);
            
            // Atualizar estado
            if (!_state[section]) {
                _state[section] = {};
            }
            
            _state[section] = {
                ..._state[section],
                ...data
            };
            
            // Notificar observadores
            _notifyObservers(section, _state[section]);
            
            return true;
        },

        /**
         * Atualiza um campo específico em uma seção do estado
         * @param {string} section - Seção do estado
         * @param {string} field - Campo a atualizar
         * @param {any} value - Novo valor
         * @returns {boolean} - Sucesso da operação
         */
        updateField: function(section, field, value) {
            if (!section || !field) return false;
            
            // Criar snapshot para histórico
            _addToHistory(_state);
            
            // Inicializar seção se não existir
            if (!_state[section]) {
                _state[section] = {};
            }
            
            // Atualizar campo
            _state[section][field] = value;
            
            // Notificar observadores
            _notifyObservers(section, _state[section]);
            
            return true;
        },

        /**
         * Registra um observador para mudanças em uma seção do estado
         * @param {string} section - Seção a observar ('*' para todas)
         * @param {Function} callback - Função a chamar quando houver mudanças
         */
        subscribe: function(section, callback) {
            if (!section || typeof callback !== 'function') return;
            
            if (!_observers[section]) {
                _observers[section] = [];
            }
            
            _observers[section].push(callback);
        },

        /**
         * Remove um observador
         * @param {string} section - Seção observada
         * @param {Function} callback - Função a remover
         */
        unsubscribe: function(section, callback) {
            if (!section || !_observers[section]) return;
            
            const index = _observers[section].indexOf(callback);
            if (index !== -1) {
                _observers[section].splice(index, 1);
            }
        },

        /**
         * Desfaz a última alteração
         * @returns {boolean} - Sucesso da operação
         */
        undo: function() {
            if (_historyIndex <= 0) return false;
            
            _historyIndex--;
            _state = JSON.parse(JSON.stringify(_history[_historyIndex]));
            
            // Notificar todas as seções
            Object.keys(_state).forEach(section => {
                _notifyObservers(section, _state[section]);
            });
            
            return true;
        },

        /**
         * Refaz a última alteração desfeita
         * @returns {boolean} - Sucesso da operação
         */
        redo: function() {
            if (_historyIndex >= _history.length - 1) return false;
            
            _historyIndex++;
            _state = JSON.parse(JSON.stringify(_history[_historyIndex]));
            
            // Notificar todas as seções
            Object.keys(_state).forEach(section => {
                _notifyObservers(section, _state[section]);
            });
            
            return true;
        },

        /**
         * Salva o estado no localStorage
         * @returns {boolean} - Sucesso da operação
         */
        saveToLocalStorage: function() {
            try {
                localStorage.setItem('split-payment-simulator-state', JSON.stringify(_state));
                return true;
            } catch (error) {
                console.error('Erro ao salvar estado no localStorage:', error);
                return false;
            }
        },

        /**
         * Carrega o estado do localStorage
         * @returns {boolean} - Sucesso da operação
         */
        loadFromLocalStorage: function() {
            try {
                const savedState = localStorage.getItem('split-payment-simulator-state');
                if (savedState) {
                    const parsedState = JSON.parse(savedState);
                    
                    // Mesclar com o estado padrão para garantir estrutura completa
                    Object.keys(parsedState).forEach(section => {
                        if (_state[section]) {
                            _state[section] = {
                                ..._state[section],
                                ...parsedState[section]
                            };
                        } else {
                            _state[section] = parsedState[section];
                        }
                        
                        // Notificar observadores
                        _notifyObservers(section, _state[section]);
                    });
                    
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Erro ao carregar estado do localStorage:', error);
                return false;
            }
        },

        /**
         * Reinicia o estado para os valores padrão
         * @param {Array} sections - Seções específicas a reiniciar (opcional)
         * @returns {boolean} - Sucesso da operação
         */
        resetState: function(sections) {
            // Criar snapshot para histórico
            _addToHistory(_state);
            
            const defaultState = {
                empresa: {
                    nome: '',
                    setor: '',
                    regime: '',
                    faturamento: 0,
                    margem: 0.15
                },
                cicloFinanceiro: {
                    pmr: 30,
                    pmp: 30,
                    pme: 30,
                    percVista: 0.3,
                    percPrazo: 0.7,
                    considerarSplit: false
                },
                parametrosFiscais: {
                    aliquota: 0.265,
                    tipoOperacao: 'b2b',
                    creditos: 0,
                    compensacao: 'automatica'
                },
                parametrosSimulacao: {
                    dataInicial: '2026-01-01',
                    dataFinal: '2033-12-31',
                    cenario: 'moderado',
                    taxaCrescimento: 0.05
                },
                parametrosFinanceiros: {
                    taxaAntecipacao: 0.018,
                    taxaCapitalGiro: 0.021,
                    spreadBancario: 0.035
                },
                cronogramaImplementacao: {
                    2026: 0.10,
                    2027: 0.25,
                    2028: 0.40,
                    2029: 0.55,
                    2030: 0.70,
                    2031: 0.85,
                    2032: 0.95,
                    2033: 1.00
                }
            };
            
            // Resetar seções específicas ou todas
            if (sections && Array.isArray(sections)) {
                sections.forEach(section => {
                    if (defaultState[section]) {
                        _state[section] = JSON.parse(JSON.stringify(defaultState[section]));
                        _notifyObservers(section, _state[section]);
                    }
                });
            } else {
                // Resetar todas as seções padrão
                Object.keys(defaultState).forEach(section => {
                    _state[section] = JSON.parse(JSON.stringify(defaultState[section]));
                    _notifyObservers(section, _state[section]);
                });
            }
            
            return true;
        }
    };
})();
