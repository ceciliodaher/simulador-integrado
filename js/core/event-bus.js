/**
 * Sistema de Eventos Centralizado (Event Bus)
 * Implementa o padrão Pub/Sub para comunicação entre componentes
 */
const EventBus = (function() {
    // Registro de manipuladores de eventos
    const _handlers = {};
    
    // Registro de eventos únicos (executados apenas uma vez)
    const _oneTimeHandlers = {};
    
    // Histórico de eventos (últimos N eventos)
    const _eventHistory = [];
    const _maxHistorySize = 50;
    
    /**
     * Adiciona um evento ao histórico
     * @param {string} event - Nome do evento
     * @param {Object} data - Dados do evento
     */
    function _addToHistory(event, data) {
        if (_eventHistory.length >= _maxHistorySize) {
            _eventHistory.shift();
        }
        
        _eventHistory.push({
            event,
            data,
            timestamp: new Date().getTime()
        });
    }
    
    return {
        /**
         * Registra um manipulador para um evento
         * @param {string} event - Nome do evento
         * @param {Function} handler - Função manipuladora
         * @returns {Function} - Função para cancelar a inscrição
         */
        subscribe: function(event, handler) {
            if (!event || typeof handler !== 'function') {
                console.error('Evento ou manipulador inválido:', event, handler);
                return () => {};
            }
            
            if (!_handlers[event]) {
                _handlers[event] = [];
            }
            
            _handlers[event].push(handler);
            
            // Retornar função de cancelamento
            return () => this.unsubscribe(event, handler);
        },
        
        /**
         * Registra um manipulador para ser executado apenas uma vez
         * @param {string} event - Nome do evento
         * @param {Function} handler - Função manipuladora
         * @returns {Function} - Função para cancelar a inscrição
         */
        subscribeOnce: function(event, handler) {
            if (!event || typeof handler !== 'function') {
                console.error('Evento ou manipulador inválido:', event, handler);
                return () => {};
            }
            
            if (!_oneTimeHandlers[event]) {
                _oneTimeHandlers[event] = [];
            }
            
            _oneTimeHandlers[event].push(handler);
            
            // Retornar função de cancelamento
            return () => {
                if (!_oneTimeHandlers[event]) return;
                
                const index = _oneTimeHandlers[event].indexOf(handler);
                if (index !== -1) {
                    _oneTimeHandlers[event].splice(index, 1);
                }
            };
        },
        
        /**
         * Publica um evento
         * @param {string} event - Nome do evento
         * @param {Object} data - Dados do evento
         * @returns {boolean} - Sucesso da publicação
         */
        publish: function(event, data) {
            if (!event) {
                console.error('Nome do evento inválido');
                return false;
            }
            
            // Adicionar ao histórico
            _addToHistory(event, data);
            
            let success = false;
            
            // Executar manipuladores regulares
            if (_handlers[event]) {
                _handlers[event].forEach(handler => {
                    try {
                        handler(data, event);
                        success = true;
                    } catch (error) {
                        console.error(`Erro ao executar manipulador para o evento ${event}:`, error);
                    }
                });
            }
            
            // Executar manipuladores únicos
            if (_oneTimeHandlers[event]) {
                const handlersToExecute = [..._oneTimeHandlers[event]];
                _oneTimeHandlers[event] = [];
                
                handlersToExecute.forEach(handler => {
                    try {
                        handler(data, event);
                        success = true;
                    } catch (error) {
                        console.error(`Erro ao executar manipulador único para o evento ${event}:`, error);
                    }
                });
            }
            
            // Manipuladores globais (para '*')
            if (_handlers['*']) {
                _handlers['*'].forEach(handler => {
                    try {
                        handler(data, event);
                        success = true;
                    } catch (error) {
                        console.error(`Erro ao executar manipulador global para o evento ${event}:`, error);
                    }
                });
            }
            
            return success;
        },
        
        /**
         * Cancela a inscrição de um manipulador
         * @param {string} event - Nome do evento
         * @param {Function} handler - Função manipuladora
         * @returns {boolean} - Sucesso do cancelamento
         */
        unsubscribe: function(event, handler) {
            if (!event || !_handlers[event]) return false;
            
            if (!handler) {
                // Remover todos os manipuladores do evento
                delete _handlers[event];
                return true;
            }
            
            const index = _handlers[event].indexOf(handler);
            if (index !== -1) {
                _handlers[event].splice(index, 1);
                return true;
            }
            
            return false;
        },
        
        /**
         * Cancela todas as inscrições
         * @param {string} event - Nome do evento específico (opcional)
         * @returns {boolean} - Sucesso do cancelamento
         */
        unsubscribeAll: function(event) {
            if (event) {
                delete _handlers[event];
                delete _oneTimeHandlers[event];
            } else {
                for (const e in _handlers) {
                    delete _handlers[e];
                }
                for (const e in _oneTimeHandlers) {
                    delete _oneTimeHandlers[e];
                }
            }
            
            return true;
        },
        
        /**
         * Obtém o histórico de eventos
         * @param {string} event - Filtrar por evento específico (opcional)
         * @param {number} limit - Limitar número de eventos retornados
         * @returns {Array} - Histórico de eventos
         */
        getEventHistory: function(event, limit) {
            let history = [..._eventHistory];
            
            if (event) {
                history = history.filter(item => item.event === event);
            }
            
            if (limit && limit > 0) {
                history = history.slice(-limit);
            }
            
            return history;
        },
        
        /**
         * Verifica se um evento tem manipuladores registrados
         * @param {string} event - Nome do evento
         * @returns {boolean} - Se o evento tem manipuladores
         */
        hasHandlers: function(event) {
            return !!(
                (_handlers[event] && _handlers[event].length > 0) ||
                (_oneTimeHandlers[event] && _oneTimeHandlers[event].length > 0)
            );
        }
    };
})();
