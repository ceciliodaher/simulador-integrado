/**
 * Módulo de Configurações Setoriais
 * Versão: 2.0.0 - Adaptado para usar SetoresRepository
 */
(function() {
    // Verificar se o objeto SimuladorApp existe
    if (typeof SimuladorApp === 'undefined') {
        window.SimuladorApp = {};
    }

    // Adicionar o módulo de Configurações Setoriais ao SimuladorApp
    SimuladorApp.ConfiguracoesSetoriais = {
        // Propriedades privadas
        _nextSetorId: 4,
        _setoresCronogramas: {},
        _cronogramaDefault: {
            '2026': 10.0,
            '2027': 25.0,
            '2028': 40.0,
            '2029': 55.0,
            '2030': 70.0,
            '2031': 85.0,
            '2032': 95.0,
            '2033': 100.0
        },
        
        // Método de inicialização
        inicializar: function() {
            console.log('Inicializando módulo ConfiguracoesSetoriais...');

            // Verificar se o SetoresRepository existe
            if (typeof SetoresRepository === 'undefined') {
                console.error('SetoresRepository não encontrado. Algumas funcionalidades podem não funcionar corretamente.');
            } else {
                // Inicializar o repositório
                SetoresRepository.inicializar();
            }

            // Carregar as configurações primeiro
            this._carregarConfiguracoesAnteriores();
            
            // Depois configurar selects existentes
            this._configurarSelectsExistentes();

            // Depois configurar event listeners
            this._configurarEventListeners();

            // Verificar se os dados estão presentes na interface
            const aliquotaCBS = document.getElementById('aliquota-cbs');
            const aliquotaIBS = document.getElementById('aliquota-ibs');

            if (aliquotaCBS && !aliquotaCBS.value) {
                console.log('Preenchendo alíquota CBS com valor padrão');
                aliquotaCBS.value = '8.8';
            }

            if (aliquotaIBS && !aliquotaIBS.value) {
                console.log('Preenchendo alíquota IBS com valor padrão');
                aliquotaIBS.value = '17.7';
            }

            // Preencher valores do cronograma se não estiverem presentes
            for (let ano = 2026; ano <= 2033; ano++) {
                const inputPerc = document.querySelector(`input[name="perc-${ano}"]`);
                if (inputPerc && !inputPerc.value) {
                    console.log(`Preenchendo percentual para ${ano} com valor padrão`);
                    const valorPadrao = this._cronogramaDefault[ano] || 0;
                    inputPerc.value = valorPadrao;
                }
            }
			
            // Forçar atualização de todos os selects
            this._atualizarTodosSelects();

            console.log('Módulo ConfiguracoesSetoriais inicializado com sucesso');
        },
        
        // Métodos públicos
        adicionarSetor: function() {
            // Redirecionar para a função global
            if (typeof window.adicionarSetor === 'function') {
                window.adicionarSetor();
                return;
            }
            
            // Implementação de fallback caso a função global não exista
            const tabelaSetores = document.getElementById('sector-table').getElementsByTagName('tbody')[0];
            if (!tabelaSetores) {
                console.error('Tabela de setores não encontrada');
                return;
            }
            
            const novaLinha = document.createElement('tr');
            novaLinha.id = `setor-${this._nextSetorId}`;

            // Obter os setores a partir do repositório central
            const setoresOptions = this._obterOpcoesSetores();

            novaLinha.innerHTML = `
                <td>
                    <select name="setor-nome-${this._nextSetorId}" class="setor-select" data-id="${this._nextSetorId}">
                        <option value="">Selecione um setor...</option>
                        ${setoresOptions}
                    </select>
                </td>
                <td><input type="number" name="setor-aliquota-${this._nextSetorId}" min="0" max="100" step="0.01" value="26.5"></td>
                <td><input type="number" name="setor-reducao-${this._nextSetorId}" min="0" max="100" step="0.01" value="0"></td>
                <td>
                    <select name="setor-cronograma-${this._nextSetorId}">
                        <option value="padrao">Cronograma Padrão</option>
                        <option value="proprio">Cronograma Específico</option>
                    </select>
                </td>
                <td>
                    <button type="button" class="btn btn-outline btn-sm" onclick="configurarCronogramaSetor(${this._nextSetorId})">Configurar</button>
                    <button type="button" class="btn btn-accent btn-sm" onclick="removerSetor(${this._nextSetorId})">Remover</button>
                </td>
            `;

            tabelaSetores.appendChild(novaLinha);

            // Adicionar evento de mudança para preencher dados automaticamente
            const selectSetor = document.querySelector(`select[name="setor-nome-${this._nextSetorId}"]`);
            if (selectSetor) {
                selectSetor.addEventListener('change', this._preencherDadosSetor.bind(this));
            }

            this._nextSetorId++;
        },

        removerSetor: function(id) {
            // Redirecionar para a função global
            if (typeof window.removerSetor === 'function') {
                window.removerSetor(id);
                return;
            }
            
            // Implementação de fallback
            if (confirm('Confirma a exclusão deste setor?')) {
                const linha = document.getElementById(`setor-${id}`);
                if (linha && linha.parentNode) {
                    linha.parentNode.removeChild(linha);

                    // Remover cronograma específico se existir
                    if (this._setoresCronogramas[id]) {
                        delete this._setoresCronogramas[id];
                    }
                } else {
                    console.error(`Setor com ID ${id} não encontrado`);
                }
            }
        },

        configurarCronogramaSetor: function(id) {
            // Redirecionar para a função global
            if (typeof window.configurarCronogramaSetor === 'function') {
                window.configurarCronogramaSetor(id);
                return;
            }
            
            // Implementação de fallback
            const select = document.querySelector(`select[name="setor-cronograma-${id}"]`);
            if (select) {
                select.value = "proprio";
            }

            // Obter o nome do setor
            let nomeSetor = "Setor";
            const selectNome = document.querySelector(`select[name="setor-nome-${id}"]`);
            if (selectNome) {
                // Se for um select, pegar o text da option selecionada
                const selectedOption = selectNome.options[selectNome.selectedIndex];
                nomeSetor = selectedOption ? selectedOption.textContent : "Setor";
            }
            
            // Atualizar o modal
            const modalSetorNome = document.getElementById('modal-setor-nome');
            const modalSetorId = document.getElementById('modal-setor-id');
            
            if (modalSetorNome) modalSetorNome.textContent = nomeSetor;
            if (modalSetorId) modalSetorId.value = id;

            // Preencher tabela do modal com cronograma atual ou padrão
            const tabelaCronograma = document.getElementById('cronograma-setor-table');
            if (tabelaCronograma) {
                const tbody = tabelaCronograma.getElementsByTagName('tbody')[0];
                if (tbody) {
                    tbody.innerHTML = '';

                    const cronogramaAtual = this._setoresCronogramas[id] || this._cronogramaDefault;

                    for (let ano = 2026; ano <= 2033; ano++) {
                        const linha = document.createElement('tr');
                        linha.innerHTML = `
                            <td>${ano}</td>
                            <td><input type="number" name="modal-perc-${ano}" min="0" max="100" step="0.1" value="${cronogramaAtual[ano]}"></td>
                            <td><input type="text" name="modal-obs-${ano}" placeholder="Observações..."></td>
                        `;
                        tbody.appendChild(linha);
                    }
                }
            }

            // Exibir modal
            const modal = document.getElementById('modal-cronograma-setor');
            if (modal) {
                modal.classList.add('active');
            } else {
                console.error('Modal de cronograma não encontrado');
            }
        },

        salvarCronogramaSetor: function() {
            // Redirecionar para a função global
            if (typeof window.salvarCronogramaSetor === 'function') {
                window.salvarCronogramaSetor();
                return;
            }
            
            // Implementação de fallback
            const setorId = document.getElementById('modal-setor-id').value;
            if (!setorId) {
                console.error('ID do setor não encontrado');
                return;
            }
            
            const cronograma = {};

            for (let ano = 2026; ano <= 2033; ano++) {
                const input = document.querySelector(`input[name="modal-perc-${ano}"]`);
                if (input) {
                    const valor = parseFloat(input.value);
                    cronograma[ano] = isNaN(valor) ? 0 : valor;
                }
            }

            this._setoresCronogramas[setorId] = cronograma;
            this.fecharModalCronograma();
        },

        fecharModalCronograma: function() {
            // Redirecionar para a função global
            if (typeof window.fecharModalCronograma === 'function') {
                window.fecharModalCronograma();
                return;
            }
            
            // Implementação de fallback
            const modal = document.getElementById('modal-cronograma-setor');
            if (modal) {
                modal.classList.remove('active');
            }
        },

        restaurarCronogramaPadrao: function() {
            if (confirm('Confirma a restauração do cronograma para os valores padrão?')) {
                for (let ano = 2026; ano <= 2033; ano++) {
                    const input = document.querySelector(`input[name="perc-${ano}"]`);
                    if (input) {
                        input.value = this._cronogramaDefault[ano];
                    }
                    
                    const inputObs = document.querySelector(`input[name="obs-${ano}"]`);
                    if (inputObs) {
                        inputObs.value = '';
                    }
                }
            }
        },

        salvarConfiguracoes: function() {
            try {
                // Coletar e salvar as configurações
                const configuracoes = {
                    parametrosGerais: {
                        aliquotaCBS: parseFloat(document.getElementById('aliquota-cbs').value) || 8.8,
                        aliquotaIBS: parseFloat(document.getElementById('aliquota-ibs').value) || 17.7,
                        dataInicio: document.getElementById('data-inicio').value || '2026-01',
                        cronograma: {}
                    },
                    setores: [],
                    parametrosFinanceiros: {
                        taxaAntecipacao: parseFloat(document.getElementById('taxa-antecipacao').value) || 1.8,
                        taxaCapitalGiro: parseFloat(document.getElementById('taxa-capital-giro').value) || 2.1,
                        spreadBancario: parseFloat(document.getElementById('spread-bancario').value) || 3.5,
                        observacoes: document.getElementById('observacoes-financeiras') ? 
                            document.getElementById('observacoes-financeiras').value : ''
                    }
                };

                // Coletar cronograma geral
                for (let ano = 2026; ano <= 2033; ano++) {
                    const input = document.querySelector(`input[name="perc-${ano}"]`);
                    if (input) {
                        configuracoes.parametrosGerais.cronograma[ano] = parseFloat(input.value) || 0;
                    }
                }

                // Coletar dados dos setores
                const tabelaSetores = document.getElementById('sector-table');
                if (tabelaSetores) {
                    const linhasSetores = tabelaSetores.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
                    
                    for (let i = 0; i < linhasSetores.length; i++) {
                        const linha = linhasSetores[i];
                        const id = linha.id.replace('setor-', '');

                        // Verificar se o elemento é um select
                        let nomeSetor = '';
                        let codigoSetor = '';
                        const selectNome = linha.querySelector(`select[name="setor-nome-${id}"]`);
                        if (selectNome) {
                            const selectedOption = selectNome.options[selectNome.selectedIndex];
                            nomeSetor = selectedOption ? selectedOption.text : '';
                            codigoSetor = selectNome.value;
                        }

                        const inputAliquota = linha.querySelector(`input[name="setor-aliquota-${id}"]`);
                        const inputReducao = linha.querySelector(`input[name="setor-reducao-${id}"]`);
                        const selectCronograma = linha.querySelector(`select[name="setor-cronograma-${id}"]`);

                        const setor = {
                            id: id,
                            codigo: codigoSetor,
                            nome: nomeSetor,
                            aliquota: inputAliquota ? parseFloat(inputAliquota.value) || 26.5 : 26.5,
                            reducao: inputReducao ? parseFloat(inputReducao.value) || 0 : 0,
                            tipoCronograma: selectCronograma ? selectCronograma.value : 'padrao',
                            cronogramaEspecifico: this._setoresCronogramas[id] || null
                        };

                        configuracoes.setores.push(setor);

                        // Se o SetoresRepository estiver disponível, salvar também lá
                        if (typeof SetoresRepository !== 'undefined' && codigoSetor) {
                            // Obter setor original
                            const setorOriginal = SetoresRepository.obterSetor(codigoSetor);
                            if (setorOriginal) {
                                // Criar cópia com os novos valores
                                const setorAtualizado = {
                                    ...setorOriginal,
                                    nome: nomeSetor,
                                    aliquotaEfetiva: setor.aliquota / 100,
                                    reducaoEspecial: setor.reducao / 100,
                                    cronogramaProprio: setor.tipoCronograma === 'proprio',
                                    cronogramaValores: setor.cronogramaEspecifico
                                };
                                
                                // Salvar no repositório
                                SetoresRepository.salvarSetor(codigoSetor, setorAtualizado);
                            }
                        }
                    }
                }

                // Salvar as configurações
                localStorage.setItem('configuracoes-setoriais', JSON.stringify(configuracoes));

                alert('Configurações salvas com sucesso!');
                return true;
            } catch (error) {
                console.error('Erro ao salvar configurações:', error);
                alert('Erro ao salvar configurações: ' + error.message);
                return false;
            }
        },

        restaurarPadroes: function() {
            if (confirm('Tem certeza que deseja restaurar todas as configurações para os valores padrão? Isso apagará todas as personalizações.')) {
                try {
                    // Restaurar alíquotas e data de início
                    const inputCBS = document.getElementById('aliquota-cbs');
                    const inputIBS = document.getElementById('aliquota-ibs');
                    const inputDataInicio = document.getElementById('data-inicio');
                    
                    if (inputCBS) inputCBS.value = '8.8';
                    if (inputIBS) inputIBS.value = '17.7';
                    if (inputDataInicio) inputDataInicio.value = '2026-01';

                    // Restaurar cronograma padrão
                    this.restaurarCronogramaPadrao();

                    // Restaurar parâmetros financeiros
                    const inputTaxaAntecipacao = document.getElementById('taxa-antecipacao');
                    const inputTaxaCapitalGiro = document.getElementById('taxa-capital-giro');
                    const inputSpreadBancario = document.getElementById('spread-bancario');
                    const textareaObservacoes = document.getElementById('observacoes-financeiras');
                    
                    if (inputTaxaAntecipacao) inputTaxaAntecipacao.value = '1.8';
                    if (inputTaxaCapitalGiro) inputTaxaCapitalGiro.value = '2.1';
                    if (inputSpreadBancario) inputSpreadBancario.value = '3.5';
                    if (textareaObservacoes) textareaObservacoes.value = '';

                    // Restaurar setores
                    const tabelaSetores = document.getElementById('sector-table');
                    if (tabelaSetores) {
                        const tbody = tabelaSetores.getElementsByTagName('tbody')[0];
                        if (tbody) {
                            // Template HTML para os setores padrão
                            const setoresPadraoHTML = `
                                <tr id="setor-1">
                                    <td>
                                        <select name="setor-nome-1" class="setor-select" data-id="1">
                                            <option value="">Selecione um setor...</option>
                                            ${this._obterOpcoesSetores()}
                                        </select>
                                    </td>
                                    <td><input type="number" name="setor-aliquota-1" min="0" max="100" step="0.01" value="26.5"></td>
                                    <td><input type="number" name="setor-reducao-1" min="0" max="100" step="0.01" value="0"></td>
                                    <td>
                                        <select name="setor-cronograma-1">
                                            <option value="padrao">Cronograma Padrão</option>
                                            <option value="proprio">Cronograma Específico</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button type="button" class="btn btn-outline btn-sm" onclick="configurarCronogramaSetor(1)">Configurar</button>
                                        <button type="button" class="btn btn-accent btn-sm" onclick="removerSetor(1)">Remover</button>
                                    </td>
                                </tr>
                                <tr id="setor-2">
                                    <td>
                                        <select name="setor-nome-2" class="setor-select" data-id="2">
                                            <option value="">Selecione um setor...</option>
                                            ${this._obterOpcoesSetores()}
                                        </select>
                                    </td>
                                    <td><input type="number" name="setor-aliquota-2" min="0" max="100" step="0.01" value="26.5"></td>
                                    <td><input type="number" name="setor-reducao-2" min="0" max="100" step="0.01" value="0"></td>
                                    <td>
                                        <select name="setor-cronograma-2">
                                            <option value="padrao">Cronograma Padrão</option>
                                            <option value="proprio">Cronograma Específico</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button type="button" class="btn btn-outline btn-sm" onclick="configurarCronogramaSetor(2)">Configurar</button>
                                        <button type="button" class="btn btn-accent btn-sm" onclick="removerSetor(2)">Remover</button>
                                    </td>
                                </tr>
                                <tr id="setor-3">
                                    <td>
                                        <select name="setor-nome-3" class="setor-select" data-id="3">
                                            <option value="">Selecione um setor...</option>
                                            ${this._obterOpcoesSetores()}
                                        </select>
                                    </td>
                                    <td><input type="number" name="setor-aliquota-3" min="0" max="100" step="0.01" value="26.5"></td>
                                    <td><input type="number" name="setor-reducao-3" min="0" max="100" step="0.01" value="0"></td>
                                    <td>
                                        <select name="setor-cronograma-3">
                                            <option value="padrao">Cronograma Padrão</option>
                                            <option value="proprio">Cronograma Específico</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button type="button" class="btn btn-outline btn-sm" onclick="configurarCronogramaSetor(3)">Configurar</button>
                                        <button type="button" class="btn btn-accent btn-sm" onclick="removerSetor(3)">Remover</button>
                                    </td>
                                </tr>
                            `;
                            
                            tbody.innerHTML = setoresPadraoHTML;
                            
                            // Adicionar eventos aos selects
                            tbody.querySelectorAll('.setor-select').forEach(select => {
                                select.addEventListener('change', this._preencherDadosSetor.bind(this));
                            });
                        }
                    }

                    // Redefinir variáveis
                    this._nextSetorId = 4;
                    this._setoresCronogramas = {};

                    // Remover configurações armazenadas
                    localStorage.removeItem('configuracoes-setoriais');

                    // Se o SetoresRepository estiver disponível, restaurar padrões lá também
                    if (typeof SetoresRepository !== 'undefined') {
                        // Não implementado - precisaria de um método específico no SetoresRepository
                    }

                    alert('Todas as configurações foram restauradas para os valores padrão.');
                    return true;
                } catch (error) {
                    console.error('Erro ao restaurar configurações padrão:', error);
                    alert('Erro ao restaurar configurações padrão: ' + error.message);
                    return false;
                }
            }
        },

        // Métodos privados
        _configurarEventListeners: function() {
            try {
                // Adicionar event listeners para os botões principais
                const btnAdicionarSetor = document.getElementById('btn-adicionar-setor');
                if (btnAdicionarSetor) {
                    btnAdicionarSetor.addEventListener('click', this.adicionarSetor.bind(this));
                }

                const btnRestaurarCronograma = document.getElementById('btn-restaurar-cronograma');
                if (btnRestaurarCronograma) {
                    btnRestaurarCronograma.addEventListener('click', this.restaurarCronogramaPadrao.bind(this));
                }

                const btnSalvarConfiguracoes = document.getElementById('btn-salvar-configuracoes');
                if (btnSalvarConfiguracoes) {
                    btnSalvarConfiguracoes.addEventListener('click', this.salvarConfiguracoes.bind(this));
                }

                const btnRestaurarPadroes = document.getElementById('btn-restaurar-padroes');
                if (btnRestaurarPadroes) {
                    btnRestaurarPadroes.addEventListener('click', this.restaurarPadroes.bind(this));
                }

                // Event listeners para o modal
                const btnSalvarCronogramaSetor = document.getElementById('btn-salvar-cronograma-setor');
                if (btnSalvarCronogramaSetor) {
                    btnSalvarCronogramaSetor.addEventListener('click', this.salvarCronogramaSetor.bind(this));
                }

                const btnCancelarModal = document.getElementById('btn-cancelar-modal');
                if (btnCancelarModal) {
                    btnCancelarModal.addEventListener('click', this.fecharModalCronograma.bind(this));
                }

                const btnFecharModal = document.getElementById('btn-fechar-modal');
                if (btnFecharModal) {
                    btnFecharModal.addEventListener('click', this.fecharModalCronograma.bind(this));
                }
                
                // Adicionar eventos aos selects existentes
                document.querySelectorAll('.setor-select').forEach(select => {
                    select.addEventListener('change', this._preencherDadosSetor.bind(this));
                });
                
                console.log('Event listeners configurados com sucesso');
            } catch (error) {
                console.error('Erro ao configurar event listeners:', error);
            }
        },
        
        _obterOpcoesSetores: function() {
            try {
                // Verificar se o SetoresRepository está disponível
                if (typeof SetoresRepository !== 'undefined') {
                    const todosSetores = SetoresRepository.obterTodos();
                    
                    return Object.entries(todosSetores)
                        .sort(([, a], [, b]) => a.nome.localeCompare(b.nome))
                        .map(([codigo, setor]) => 
                            `<option value="${codigo}">${setor.nome}</option>`
                        ).join('');
                } else {
                    console.warn('SetoresRepository não encontrado, não é possível obter setores');
                    return '';
                }
            } catch (error) {
                console.error('Erro ao obter opções de setores:', error);
                return ''; // Retornar string vazia em caso de erro
            }
        },

        _preencherDadosSetor: function(event) {
            try {
                const select = event.target;
                const setorId = select.dataset.id;
                const setorCodigo = select.value;
                
                if (!setorId || !setorCodigo) {
                    console.warn('ID do setor ou código do setor não encontrados');
                    return;
                }
                
                // Obter setor do repositório
                if (typeof SetoresRepository !== 'undefined') {
                    const setor = SetoresRepository.obterSetor(setorCodigo);
                    if (!setor) {
                        console.warn(`Setor com código ${setorCodigo} não encontrado`);
                        return;
                    }

                    // Preencher a alíquota efetiva
                    const inputAliquota = document.querySelector(`input[name="setor-aliquota-${setorId}"]`);
                    if (inputAliquota) {
                        inputAliquota.value = setor.aliquotaEfetiva ? (setor.aliquotaEfetiva * 100).toFixed(2) : 26.5;
                    }

                    // Preencher a redução especial
                    const inputReducao = document.querySelector(`input[name="setor-reducao-${setorId}"]`);
                    if (inputReducao) {
                        inputReducao.value = setor.reducaoEspecial ? (setor.reducaoEspecial * 100).toFixed(2) : 0;
                    }

                    // Configurar cronograma próprio, se aplicável
                    const selectCronograma = document.querySelector(`select[name="setor-cronograma-${setorId}"]`);
                    if (selectCronograma && setor.cronogramaProprio) {
                        selectCronograma.value = 'proprio';
                    }
                    
                    console.log(`Dados do setor ${setor.nome} preenchidos com sucesso`);
                }
            } catch (error) {
                console.error('Erro ao preencher dados do setor:', error);
            }
        },
        
        _configurarSelectsExistentes: function() {
            try {
                // Substituir inputs de texto existentes por selects
                const linhasSetores = document.querySelectorAll('#sector-table tbody tr');
                if (!linhasSetores.length) {
                    console.warn('Nenhuma linha de setor encontrada');
                    return;
                }

                linhasSetores.forEach(linha => {
                    const setorId = linha.id.replace('setor-', '');
                    const inputNome = linha.querySelector(`input[name="setor-nome-${setorId}"]`);
                    
                    if (inputNome) {
                        const nomeAtual = inputNome.value;
                        const tdNome = inputNome.parentNode;
                        
                        if (!tdNome) {
                            console.warn(`TD pai não encontrado para o input de nome do setor ${setorId}`);
                            return;
                        }

                        // Criar select com opções
                        const setoresOptions = this._obterOpcoesSetores();
                        const selectHTML = `
                            <select name="setor-nome-${setorId}" class="setor-select" data-id="${setorId}">
                                <option value="">Selecione um setor...</option>
                                ${setoresOptions}
                            </select>
                        `;
                        
                        tdNome.innerHTML = selectHTML;

                        // Tentar selecionar a opção que corresponde ao nome atual
                        const selectNovo = tdNome.querySelector('select');
                        if (selectNovo) {
                            // Procurar opção por texto
                            const options = Array.from(selectNovo.options);
                            const optionCorrespondente = options.find(option => option.text === nomeAtual);
                            
                            if (optionCorrespondente) {
                                selectNovo.value = optionCorrespondente.value;
                            }

                            // Adicionar evento de mudança
                            selectNovo.addEventListener('change', this._preencherDadosSetor.bind(this));
                        }
                    }
                });
                
                console.log('Selects existentes configurados com sucesso');
            } catch (error) {
                console.error('Erro ao configurar selects existentes:', error);
            }
        },

        _carregarConfiguracoesAnteriores: function() {
            try {
                const configuracoesAnteriores = localStorage.getItem('configuracoes-setoriais');
                if (!configuracoesAnteriores) {
                    console.log('Nenhuma configuração anterior encontrada');
                    return false;
                }
                
                const config = JSON.parse(configuracoesAnteriores);

                // Carregar parâmetros gerais
                if (config.parametrosGerais) {
                    const aliquotaCBS = document.getElementById('aliquota-cbs');
                    const aliquotaIBS = document.getElementById('aliquota-ibs');
                    const dataInicio = document.getElementById('data-inicio');
                    
                    if (aliquotaCBS) aliquotaCBS.value = config.parametrosGerais.aliquotaCBS;
                    if (aliquotaIBS) aliquotaIBS.value = config.parametrosGerais.aliquotaIBS;
                    if (dataInicio) dataInicio.value = config.parametrosGerais.dataInicio;

                    // Carregar cronograma
                    if (config.parametrosGerais.cronograma) {
                        for (let ano = 2026; ano <= 2033; ano++) {
                            if (config.parametrosGerais.cronograma[ano] !== undefined) {
                                const input = document.querySelector(`input[name="perc-${ano}"]`);
                                if (input) input.value = config.parametrosGerais.cronograma[ano];
                            }
                        }
                    }
                }

                // Carregar parâmetros financeiros
                if (config.parametrosFinanceiros) {
                    const taxaAntecipacao = document.getElementById('taxa-antecipacao');
                    const taxaCapitalGiro = document.getElementById('taxa-capital-giro');
                    const spreadBancario = document.getElementById('spread-bancario');
                    const observacoesFinanceiras = document.getElementById('observacoes-financeiras');
                    
                    if (taxaAntecipacao) taxaAntecipacao.value = config.parametrosFinanceiros.taxaAntecipacao;
                    if (taxaCapitalGiro) taxaCapitalGiro.value = config.parametrosFinanceiros.taxaCapitalGiro;
                    if (spreadBancario) spreadBancario.value = config.parametrosFinanceiros.spreadBancario;
                    if (observacoesFinanceiras) observacoesFinanceiras.value = config.parametrosFinanceiros.observacoes || '';
                }

                // Carregar setores
                if (config.setores && config.setores.length > 0) {
                    // Limpar tabela de setores
                    const tabelaSetores = document.getElementById('sector-table');
                    if (tabelaSetores) {
                        const tbody = tabelaSetores.getElementsByTagName('tbody')[0];
                        if (tbody) {
                            tbody.innerHTML = '';

                            // Determinar o próximo ID
                            let maxId = 0;

                            // Adicionar setores da configuração
                            config.setores.forEach(setor => {
                                const id = parseInt(setor.id);
                                maxId = Math.max(maxId, id);

                                const novaLinha = document.createElement('tr');
                                novaLinha.id = `setor-${id}`;

                                // Criar a linha com select
                                novaLinha.innerHTML = `
                                    <td>
                                        <select name="setor-nome-${id}" class="setor-select" data-id="${id}">
                                            <option value="">Selecione um setor...</option>
                                            ${this._obterOpcoesSetores()}
                                        </select>
                                    </td>
                                    <td><input type="number" name="setor-aliquota-${id}" min="0" max="100" step="0.01" value="${setor.aliquota}"></td>
                                    <td><input type="number" name="setor-reducao-${id}" min="0" max="100" step="0.01" value="${setor.reducao}"></td>
                                    <td>
                                        <select name="setor-cronograma-${id}">
                                            <option value="padrao" ${setor.tipoCronograma === 'padrao' ? 'selected' : ''}>Cronograma Padrão</option>
                                            <option value="proprio" ${setor.tipoCronograma === 'proprio' ? 'selected' : ''}>Cronograma Específico</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button type="button" class="btn btn-outline btn-sm" onclick="configurarCronogramaSetor(${id})">Configurar</button>
                                        <button type="button" class="btn btn-accent btn-sm" onclick="removerSetor(${id})">Remover</button>
                                    </td>
                                `;

                                tbody.appendChild(novaLinha);

                                // Selecionar o setor correto
                                const selectSetor = novaLinha.querySelector(`.setor-select`);
                                if (selectSetor && setor.codigo) {
                                    selectSetor.value = setor.codigo;
                                } else if (selectSetor) {
                                    // Procurar opção por texto se não tiver código
                                    const options = Array.from(selectSetor.options);
                                    const optionCorrespondente = options.find(option => option.text === setor.nome);
                                    
                                    if (optionCorrespondente) {
                                        selectSetor.value = optionCorrespondente.value;
                                    }
                                }

                                // Adicionar evento de mudança
                                if (selectSetor) {
                                    selectSetor.addEventListener('change', this._preencherDadosSetor.bind(this));
                                }

                                // Carregar cronograma específico
                                if (setor.cronogramaEspecifico) {
                                    this._setoresCronogramas[id] = setor.cronogramaEspecifico;
                                }
                            });

                            // Atualizar o próximo ID
                            this._nextSetorId = maxId + 1;
                        }
                    }
                }
                
                console.log('Configurações carregadas com sucesso do localStorage');
                return true;
            } catch (error) {
                console.error('Erro ao carregar configurações:', error);
                return false;
            }
        },
        
        _atualizarTodosSelects: function() {
            try {
                const setoresOptions = this._obterOpcoesSetores();
                document.querySelectorAll('.setor-select').forEach(select => {
                    const valorAtual = select.value;
                    
                    // Preservar o valor selecionado
                    select.innerHTML = `
                        <option value="">Selecione um setor...</option>
                        ${setoresOptions}
                    `;

                    // Restaurar o valor selecionado
                    if (valorAtual) {
                        select.value = valorAtual;
                    }
                });

                // Atualizar também o select da aba de simulação
                if (typeof SetoresRepository !== 'undefined') {
                    SetoresRepository.preencherDropdown('setor');
                }
                
                console.log('Todos os selects atualizados com sucesso');
            } catch (error) {
                console.error('Erro ao atualizar selects:', error);
            }
        }
    };

    // Inicialização automática quando o DOM estiver carregado
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM carregado, verificando se deve inicializar ConfiguracoesSetoriais');
        
        // Verificar se estamos na aba de configurações setoriais
        const abas = document.querySelectorAll('.tab-button');
        let abaAtiva = null;
        
        abas.forEach(function(aba) {
            if (aba.classList.contains('active')) {
                abaAtiva = aba;
            }
            
            // Adicionar listener para inicializar quando mudar para a aba de configurações
            aba.addEventListener('click', function() {
                if (this.getAttribute('data-tab') === 'configuracoes') {
                    console.log('Aba configurações ativada, inicializando módulo');
                    SimuladorApp.ConfiguracoesSetoriais.inicializar();
                }
            });
        });
        
        // Se a aba ativa for a de configurações, inicializar
        if (abaAtiva && abaAtiva.getAttribute('data-tab') === 'configuracoes') {
            console.log('Aba configurações já está ativa, inicializando módulo');
            SimuladorApp.ConfiguracoesSetoriais.inicializar();
        }
    });
})();