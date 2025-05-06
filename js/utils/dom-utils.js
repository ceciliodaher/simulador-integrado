/**
 * Utilitários para manipulação do DOM
 * Centraliza operações comuns de manipulação do DOM para facilitar a manutenção
 */
const DOMUtils = {
    /**
     * Obtém um elemento do DOM por ID
     * @param {string} id - ID do elemento
     * @returns {HTMLElement|null} - Elemento ou null se não encontrado
     */
    getElement: function(id) {
        return document.getElementById(id);
    },
    
    /**
     * Obtém elementos do DOM por seletor CSS
     * @param {string} selector - Seletor CSS
     * @param {HTMLElement} context - Contexto de busca (opcional)
     * @returns {NodeList} - Lista de elementos
     */
    getElements: function(selector, context = document) {
        return context.querySelectorAll(selector);
    },
    
    /**
     * Obtém o primeiro elemento do DOM por seletor CSS
     * @param {string} selector - Seletor CSS
     * @param {HTMLElement} context - Contexto de busca (opcional)
     * @returns {HTMLElement|null} - Elemento ou null se não encontrado
     */
    getFirstElement: function(selector, context = document) {
        return context.querySelector(selector);
    },
    
    /**
     * Obtém o valor de um elemento de formulário
     * @param {string|HTMLElement} element - ID ou elemento
     * @returns {string|boolean|number|null} - Valor do elemento
     */
    getValue: function(element) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return null;
        
        // Lidar com diferentes tipos de elementos
        if (el.type === 'checkbox') {
            return el.checked;
        } else if (el.type === 'number') {
            return parseFloat(el.value);
        } else if (el.type === 'date') {
            return el.value; // Manter como string
        } else if (el.tagName === 'SELECT') {
            return el.value;
        } else if (el.classList.contains('money-input')) {
            // Extrair valor numérico de campos monetários
            return this.extractNumericValue(el.value);
        } else if (el.classList.contains('percent-input')) {
            // Extrair valor numérico de campos percentuais
            return this.extractNumericValue(el.value) / 100;
        } else {
            return el.value;
        }
    },
    
    /**
     * Define o valor de um elemento de formulário
     * @param {string|HTMLElement} element - ID ou elemento
     * @param {string|boolean|number} value - Valor a definir
     * @returns {boolean} - Sucesso da operação
     */
    setValue: function(element, value) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return false;
        
        // Lidar com diferentes tipos de elementos
        if (el.type === 'checkbox') {
            el.checked = !!value;
        } else if (el.classList.contains('money-input')) {
            // Formatar valores monetários
            el.value = this.formatMoney(value);
        } else if (el.classList.contains('percent-input')) {
            // Formatar valores percentuais
            el.value = this.formatPercent(value);
        } else {
            el.value = value;
        }
        
        // Disparar evento de mudança
        const event = new Event('change', { bubbles: true });
        el.dispatchEvent(event);
        
        return true;
    },
    
    /**
     * Adiciona um evento a um elemento
     * @param {string|HTMLElement} element - ID ou elemento
     * @param {string} eventType - Tipo de evento (click, change, etc.)
     * @param {Function} handler - Função manipuladora
     * @returns {Function} - Função para remover o evento
     */
    addEventListener: function(element, eventType, handler) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return () => {};
        
        el.addEventListener(eventType, handler);
        
        // Retornar função para remover o evento
        return () => el.removeEventListener(eventType, handler);
    },
    
    /**
     * Remove um evento de um elemento
     * @param {string|HTMLElement} element - ID ou elemento
     * @param {string} eventType - Tipo de evento
     * @param {Function} handler - Função manipuladora
     * @returns {boolean} - Sucesso da operação
     */
    removeEventListener: function(element, eventType, handler) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return false;
        
        el.removeEventListener(eventType, handler);
        return true;
    },
    
    /**
     * Cria um elemento HTML
     * @param {string} tag - Tag HTML
     * @param {Object} attributes - Atributos do elemento
     * @param {string|HTMLElement} content - Conteúdo do elemento
     * @returns {HTMLElement} - Elemento criado
     */
    createElement: function(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        // Definir atributos
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.entries(value).forEach(([prop, val]) => {
                    element.style[prop] = val;
                });
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Definir conteúdo
        if (typeof content === 'string') {
            element.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            element.appendChild(content);
        }
        
        return element;
    },
    
    /**
     * Adiciona uma classe a um elemento
     * @param {string|HTMLElement} element - ID ou elemento
     * @param {string} className - Classe a adicionar
     * @returns {boolean} - Sucesso da operação
     */
    addClass: function(element, className) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return false;
        
        el.classList.add(className);
        return true;
    },
    
    /**
     * Remove uma classe de um elemento
     * @param {string|HTMLElement} element - ID ou elemento
     * @param {string} className - Classe a remover
     * @returns {boolean} - Sucesso da operação
     */
    removeClass: function(element, className) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return false;
        
        el.classList.remove(className);
        return true;
    },
    
    /**
     * Alterna uma classe em um elemento
     * @param {string|HTMLElement} element - ID ou elemento
     * @param {string} className - Classe a alternar
     * @returns {boolean} - Novo estado da classe (true = adicionada, false = removida)
     */
    toggleClass: function(element, className) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return false;
        
        return el.classList.toggle(className);
    },
    
    /**
     * Verifica se um elemento tem uma classe
     * @param {string|HTMLElement} element - ID ou elemento
     * @param {string} className - Classe a verificar
     * @returns {boolean} - Se o elemento tem a classe
     */
    hasClass: function(element, className) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return false;
        
        return el.classList.contains(className);
    },
    
    /**
     * Mostra um elemento
     * @param {string|HTMLElement} element - ID ou elemento
     * @param {string} displayType - Tipo de display (block, flex, etc.)
     * @returns {boolean} - Sucesso da operação
     */
    show: function(element, displayType = 'block') {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return false;
        
        el.style.display = displayType;
        return true;
    },
    
    /**
     * Oculta um elemento
     * @param {string|HTMLElement} element - ID ou elemento
     * @returns {boolean} - Sucesso da operação
     */
    hide: function(element) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return false;
        
        el.style.display = 'none';
        return true;
    },
    
    /**
     * Extrai um valor numérico de uma string formatada
     * @param {string} value - Valor formatado
     * @returns {number} - Valor numérico
     */
    extractNumericValue: function(value) {
        if (typeof value === 'number') return value;
        
        // Remover todos os caracteres exceto dígitos, pontos e vírgulas
        const cleanValue = value.replace(/[^\d.,]/g, '');
        
        // Tratar formatação brasileira (vírgula como separador decimal)
        if (cleanValue.indexOf(',') !== -1) {
            // Remover pontos (separadores de milhar) e substituir vírgula por ponto
            return parseFloat(cleanValue.replace(/\./g, '').replace(',', '.')) || 0;
        }
        
        // Formato internacional
        return parseFloat(cleanValue) || 0;
    },
    
    /**
     * Formata um valor como moeda
     * @param {number|string} value - Valor a formatar
     * @returns {string} - Valor formatado
     */
    formatMoney: function(value) {
        const numericValue = this.extractNumericValue(value);
        
        return numericValue.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },
    
    /**
     * Formata um valor como percentual
     * @param {number|string} value - Valor a formatar (decimal)
     * @returns {string} - Valor formatado
     */
    formatPercent: function(value) {
        let numericValue = this.extractNumericValue(value);
        
        // Se o valor estiver entre 0 e 1, consideramos como decimal
        if (numericValue > 0 && numericValue < 1) {
            numericValue = numericValue * 100;
        }
        
        return numericValue.toLocaleString('pt-BR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }) + '%';
    },
    
    /**
     * Preenche um elemento select com opções
     * @param {string|HTMLElement} selectElement - ID ou elemento select
     * @param {Array} options - Array de opções { value, text, selected }
     * @param {boolean} clearExisting - Se deve limpar opções existentes
     * @returns {boolean} - Sucesso da operação
     */
    fillSelectOptions: function(selectElement, options, clearExisting = true) {
        const select = typeof selectElement === 'string' ? this.getElement(selectElement) : selectElement;
        if (!select || select.tagName !== 'SELECT') return false;
        
        // Opção para manter a primeira opção (placeholder)
        const firstOption = clearExisting && select.options.length > 0 ? select.options[0] : null;
        
        // Limpar opções existentes
        if (clearExisting) {
            select.innerHTML = '';
            
            // Restaurar primeira opção se existir
            if (firstOption) {
                select.appendChild(firstOption);
            }
        }
        
        // Adicionar novas opções
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            
            if (option.selected) {
                optionElement.selected = true;
            }
            
            // Adicionar atributos data-* se existirem
            if (option.data) {
                Object.entries(option.data).forEach(([key, value]) => {
                    optionElement.dataset[key] = value;
                });
            }
            
            select.appendChild(optionElement);
        });
        
        return true;
    },
    
    /**
     * Serializa um formulário para um objeto
     * @param {string|HTMLElement} form - ID ou elemento de formulário
     * @returns {Object} - Dados do formulário
     */
    serializeForm: function(form) {
        const formElement = typeof form === 'string' ? this.getElement(form) : form;
        if (!formElement) return {};
        
        const formData = {};
        const elements = formElement.elements;
        
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            
            // Ignorar elementos sem nome ou botões
            if (!element.name || element.type === 'button' || element.type === 'submit') {
                continue;
            }
            
            // Processar checkboxes
            if (element.type === 'checkbox') {
                formData[element.name] = element.checked;
                continue;
            }
            
            // Processar radio buttons
            if (element.type === 'radio') {
                if (element.checked) {
                    formData[element.name] = element.value;
                }
                continue;
            }
            
            // Processar campos monetários
            if (element.classList.contains('money-input')) {
                formData[element.name] = this.extractNumericValue(element.value);
                continue;
            }
            
            // Processar campos percentuais
            if (element.classList.contains('percent-input')) {
                formData[element.name] = this.extractNumericValue(element.value) / 100;
                continue;
            }
            
            // Processar campos numéricos
            if (element.type === 'number') {
                formData[element.name] = parseFloat(element.value);
                continue;
            }
            
            // Demais campos
            formData[element.name] = element.value;
        }
        
        return formData;
    },
    
    /**
     * Preenche um formulário a partir de um objeto
     * @param {string|HTMLElement} form - ID ou elemento de formulário
     * @param {Object} data - Dados para preencher o formulário
     * @returns {boolean} - Sucesso da operação
     */
    fillForm: function(form, data) {
        const formElement = typeof form === 'string' ? this.getElement(form) : form;
        if (!formElement || !data) return false;
        
        const elements = formElement.elements;
        
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            
            // Ignorar elementos sem nome ou botões
            if (!element.name || element.type === 'button' || element.type === 'submit') {
                continue;
            }
            
            // Verificar se há dados para este campo
            if (!(element.name in data)) {
                continue;
            }
            
            const value = data[element.name];
            
            // Processar checkboxes
            if (element.type === 'checkbox') {
                element.checked = !!value;
                continue;
            }
            
            // Processar radio buttons
            if (element.type === 'radio') {
                if (element.value === value.toString()) {
                    element.checked = true;
                }
                continue;
            }
            
            // Processar campos monetários
            if (element.classList.contains('money-input')) {
                element.value = this.formatMoney(value);
                continue;
            }
            
            // Processar campos percentuais
            if (element.classList.contains('percent-input')) {
                element.value = this.formatPercent(value);
                continue;
            }
            
            // Demais campos
            element.value = value;
        }
        
        return true;
    },
    
    /**
     * Adiciona uma animação a um elemento
     * @param {string|HTMLElement} element - ID ou elemento
     * @param {string} animationName - Nome da animação CSS
     * @param {number} duration - Duração da animação em ms
     * @returns {Promise} - Promise resolvida quando a animação terminar
     */
    animate: function(element, animationName, duration = 500) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return Promise.reject(new Error('Elemento não encontrado'));
        
        return new Promise(resolve => {
            // Adicionar classe de animação
            el.style.animation = `${animationName} ${duration}ms`;
            
            // Resolver Promise quando a animação terminar
            const handleAnimationEnd = () => {
                el.style.animation = '';
                el.removeEventListener('animationend', handleAnimationEnd);
                resolve();
            };
            
            el.addEventListener('animationend', handleAnimationEnd);
            
            // Failsafe para caso a animação não dispare o evento
            setTimeout(handleAnimationEnd, duration + 50);
        });
    },
    
    /**
     * Notifica o usuário com uma mensagem
     * @param {string} message - Mensagem a exibir
     * @param {string} type - Tipo de notificação (success, error, warning, info)
     * @param {number} duration - Duração da notificação em ms
     * @returns {HTMLElement} - Elemento da notificação
     */
    notify: function(message, type = 'info', duration = 3000) {
        // Verificar se o container de notificações existe
        let container = this.getElement('notification-container');
        
        if (!container) {
            // Criar container
            container = this.createElement('div', {
                id: 'notification-container',
                className: 'notification-container',
                style: {
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    zIndex: '9999'
                }
            });
            
            document.body.appendChild(container);
        }
        
        // Criar notificação
        const notification = this.createElement('div', {
            className: `notification notification-${type}`,
            style: {
                backgroundColor: type === 'success' ? '#2ecc71' : 
                                 type === 'error' ? '#e74c3c' : 
                                 type === 'warning' ? '#f39c12' : '#3498db',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '4px',
                marginBottom: '10px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                opacity: '0',
                transition: 'opacity 0.3s'
            }
        }, message);
        
        // Adicionar botão de fechar
        const closeButton = this.createElement('span', {
            className: 'notification-close',
            style: {
                marginLeft: '10px',
                cursor: 'pointer',
                float: 'right'
            }
        }, '&times;');
        
        notification.appendChild(closeButton);
        container.appendChild(notification);
        
        // Exibir notificação com animação
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Configurar evento de clique no botão de fechar
        closeButton.addEventListener('click', () => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (container.contains(notification)) {
                    container.removeChild(notification);
                }
            }, 300);
        });
        
        // Remover automaticamente após o tempo especificado
        if (duration > 0) {
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (container.contains(notification)) {
                        container.removeChild(notification);
                    }
                }, 300);
            }, duration);
        }
        
        return notification;
    },
    
    /**
     * Confirma uma ação com o usuário
     * @param {string} message - Mensagem de confirmação
     * @param {string} title - Título do diálogo
     * @param {string} confirmText - Texto do botão de confirmação
     * @param {string} cancelText - Texto do botão de cancelamento
     * @returns {Promise<boolean>} - Promise resolvida com a resposta
     */
    confirm: function(message, title = 'Confirmação', confirmText = 'Confirmar', cancelText = 'Cancelar') {
        return new Promise(resolve => {
            // Verificar se já existe um modal de confirmação
            let modal = this.getElement('confirmation-modal');
            
            if (modal) {
                // Remover modal existente
                document.body.removeChild(modal);
            }
            
            // Criar modal
            modal = this.createElement('div', {
                id: 'confirmation-modal',
                className: 'modal',
                style: {
                    display: 'block'
                }
            });
            
            // Criar conteúdo do modal
            const modalContent = this.createElement('div', {
                className: 'modal-content',
                style: {
                    maxWidth: '400px'
                }
            });
            
            // Criar cabeçalho
            const modalHeader = this.createElement('div', {
                className: 'modal-header'
            });
            
            modalHeader.appendChild(this.createElement('h3', {}, title));
            modalHeader.appendChild(this.createElement('span', {
                className: 'close',
                style: {
                    cursor: 'pointer'
                }
            }, '&times;'));
            
            // Criar corpo
            const modalBody = this.createElement('div', {
                className: 'modal-body'
            }, `<p>${message}</p>`);
            
            // Criar rodapé
            const modalFooter = this.createElement('div', {
                className: 'modal-footer'
            });
            
            const confirmButton = this.createElement('button', {
                id: 'confirm-button',
                className: 'btn btn-primary'
            }, confirmText);
            
            const cancelButton = this.createElement('button', {
                id: 'cancel-button',
                className: 'btn btn-secondary'
            }, cancelText);
            
            modalFooter.appendChild(confirmButton);
            modalFooter.appendChild(cancelButton);
            
            // Montar modal
            modalContent.appendChild(modalHeader);
            modalContent.appendChild(modalBody);
            modalContent.appendChild(modalFooter);
            modal.appendChild(modalContent);
            
            // Adicionar à página
            document.body.appendChild(modal);
            
            // Configurar eventos
            const closeModal = (result) => {
                modal.style.display = 'none';
                document.body.removeChild(modal);
                resolve(result);
            };
            
            // Botão de confirmação
            confirmButton.addEventListener('click', () => closeModal(true));
            
            // Botão de cancelamento
            cancelButton.addEventListener('click', () => closeModal(false));
            
            // Botão de fechar
            modalHeader.querySelector('.close').addEventListener('click', () => closeModal(false));
            
            // Clique fora do modal
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    closeModal(false);
                }
            });
        });
    }
};