// Módulo de gerenciamento dos setores na interface
(function() {
    // Definição dos setores pré-definidos (equivalente ao que está em configuracoes-setoriais.js)
    const setoresPadrao = {
        // Setores Gerais
        'comercio': {
            nome: 'Comércio Varejista',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: false,
            // Parâmetros operacionais para metodologia ampliada
            prazoMedioRecebimento: 15, // dias
            cicloOperacional: 45, // dias
            margemLiquida: 0.06, // 6%
            indiceSensibilidade: 'Alto'
        },
        'industria': {
            nome: 'Indústria de Transformação',
            aliquotaEfetiva: 0.220,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: false,
            // Parâmetros operacionais para metodologia ampliada
            prazoMedioRecebimento: 45, // dias
            cicloOperacional: 90, // dias
            margemLiquida: 0.12, // 12%
            indiceSensibilidade: 'Médio-Alto'
        },
        'servicos': {
            nome: 'Serviços Contínuos',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: false,
            // Parâmetros operacionais para metodologia ampliada
            prazoMedioRecebimento: 30, // dias
            cicloOperacional: 30, // dias
            margemLiquida: 0.18, // 18%
            indiceSensibilidade: 'Médio'
        },
        'agronegocio': {
            nome: 'Agronegócio',
            aliquotaEfetiva: 0.195,
            reducaoEspecial: 0.00,
            implementacaoInicial: 5,
            cronogramaProprio: true,
            // Parâmetros operacionais para metodologia ampliada
            prazoMedioRecebimento: 60, // dias
            cicloOperacional: 180, // dias
            margemLiquida: 0.14, // 14%
            indiceSensibilidade: 'Baixo'
        },
        'construcao': {
            nome: 'Construção Civil',
            aliquotaEfetiva: 0.240,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: false,
            // Parâmetros operacionais para metodologia ampliada
            prazoMedioRecebimento: 45, // dias
            cicloOperacional: 120, // dias
            margemLiquida: 0.10, // 10%
            indiceSensibilidade: 'Médio-Alto'
        },
        'tecnologia': {
            nome: 'Tecnologia',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 15,
            cronogramaProprio: false,
            // Parâmetros operacionais para metodologia ampliada
            prazoMedioRecebimento: 30, // dias
            cicloOperacional: 45, // dias
            margemLiquida: 0.20, // 20%
            indiceSensibilidade: 'Médio-Baixo'
        },

        // Setores com Redução de 60% na Alíquota
        'educacao': {
            nome: 'Serviços de Educação',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 10,
            cronogramaProprio: false,
            // Parâmetros operacionais para metodologia ampliada
            prazoMedioRecebimento: 30, // dias
            cicloOperacional: 30, // dias
            margemLiquida: 0.20, // 20%
            indiceSensibilidade: 'Baixo'
        },
        'saude': {
            nome: 'Serviços de Saúde',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 10,
            cronogramaProprio: false,
            // Parâmetros operacionais para metodologia ampliada
            prazoMedioRecebimento: 45, // dias
            cicloOperacional: 60, // dias
            margemLiquida: 0.15, // 15%
            indiceSensibilidade: 'Médio-Baixo'
        },
        'dispositivos_medicos': {
            nome: 'Dispositivos Médicos',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 10,
            cronogramaProprio: false,
            // Parâmetros operacionais para metodologia ampliada
            prazoMedioRecebimento: 40, // dias
            cicloOperacional: 75, // dias
            margemLiquida: 0.16, // 16%
            indiceSensibilidade: 'Médio-Baixo'
        },
        'medicamentos': {
            nome: 'Medicamentos',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 5,
            cronogramaProprio: false,
            // Parâmetros operacionais para metodologia ampliada
            prazoMedioRecebimento: 35, // dias
            cicloOperacional: 65, // dias
            margemLiquida: 0.17, // 17%
            indiceSensibilidade: 'Médio-Baixo'
        },
        'alimentos_consumo_humano': {
            nome: 'Alimentos para Consumo Humano',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 5,
            cronogramaProprio: false,
            // Parâmetros operacionais para metodologia ampliada
            prazoMedioRecebimento: 20, // dias
            cicloOperacional: 30, // dias
            margemLiquida: 0.08, // 8%
            indiceSensibilidade: 'Médio'
        },

        // Setores com Alíquota Zero
        'cesta_basica': {
            nome: 'Cesta Básica Nacional',
            aliquotaEfetiva: 0.00,
            reducaoEspecial: 1.00,
            implementacaoInicial: 0,
            cronogramaProprio: false,
            // Parâmetros operacionais para metodologia ampliada
            prazoMedioRecebimento: 10, // dias
            cicloOperacional: 20, // dias
            margemLiquida: 0.05, // 5%
            indiceSensibilidade: 'Baixo' // Baixo devido à alíquota zero
        },

        // Regimes Específicos
        'combustiveis_energia': {
            nome: 'Combustíveis e Energia',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: true,
            regimeEspecifico: 'monofasico',
            // Parâmetros operacionais para metodologia ampliada
            prazoMedioRecebimento: 20, // dias
            cicloOperacional: 40, // dias
            margemLiquida: 0.09, // 9%
            indiceSensibilidade: 'Médio-Alto'
        },
        'financeiro_seguros': {
            nome: 'Financeiro e Seguros',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: true,
            // Parâmetros operacionais para metodologia ampliada
            prazoMedioRecebimento: 25, // dias
            cicloOperacional: 30, // dias
            margemLiquida: 0.22, // 22%
            indiceSensibilidade: 'Médio-Baixo'
        }
    };

    /**
     * Função para calcular o Índice de Sensibilidade Setorial
     * IS = (AE_s × PMR)/(CO × ML × 100)
     * @param {Object} setor - Objeto do setor
     * @returns {number} Índice de sensibilidade calculado
     */
    function calcularIndiceSensibilidade(setor) {
        const aliquotaEfetiva = setor.aliquotaEfetiva * (1 - setor.reducaoEspecial);
        const prazoMedioRecebimento = setor.prazoMedioRecebimento;
        const cicloOperacional = setor.cicloOperacional;
        const margemLiquida = setor.margemLiquida;

        if (cicloOperacional <= 0 || margemLiquida <= 0) {
            return 0;
        }

        return (aliquotaEfetiva * prazoMedioRecebimento) / (cicloOperacional * margemLiquida * 100);
    }

    /**
     * Classifica o índice de sensibilidade
     * @param {number} indice - Valor do índice calculado
     * @returns {string} Classificação do índice
     */
    function classificarIndiceSensibilidade(indice) {
        if (indice > 0.3) return 'Alto';
        if (indice > 0.15) return 'Médio-Alto';
        if (indice > 0.05) return 'Médio';
        if (indice > 0.02) return 'Médio-Baixo';
        return 'Baixo';
    }

    // Se necessário, podemos adicionar a função para atualizar dinamicamente a classificação
    function atualizarClassificacaoSetores() {
        for (const codigoSetor in setoresPadrao) {
            const setor = setoresPadrao[codigoSetor];
            const indice = calcularIndiceSensibilidade(setor);
            setor.indiceSensibilidadeCalculado = indice;
            setor.classificacaoSensibilidade = classificarIndiceSensibilidade(indice);
        }
    }

    // Funções auxiliares
    function obterTodosSetores() {
        // Primeiro tenta obter de SetoresManager
        if (typeof SetoresManager !== 'undefined' && SetoresManager.initialized) {
            return SetoresManager.obterTodosSetores();
        } 
        // Caso contrário, usa os setores padrão
        return Object.keys(setoresPadrao).map(codigo => {
            return {
                codigo: codigo,
                ...setoresPadrao[codigo]
            };
        });
    }

    function obterSetor(codigo) {
        // Primeiro tenta obter de SetoresManager
        if (typeof SetoresManager !== 'undefined' && SetoresManager.initialized) {
            return SetoresManager.obterSetor(codigo);
        } 
        // Caso contrário, usa os setores padrão
        return setoresPadrao[codigo];
    }

    function gerarOpcoesSetores() {
        let options = '<option value="">Selecione um setor...</option>';
        const setores = obterTodosSetores();
        
        setores.forEach(setor => {
            options += `<option value="${setor.codigo}">${setor.nome}</option>`;
        });
        
        return options;
    }

    // Função para inicializar um select com as opções de setores
    function preencherSelectSetores(select) {
        if (!select) return;
        
        // Limpar opções existentes
        select.innerHTML = '';
        
        // Adicionar opções
        select.innerHTML = gerarOpcoesSetores();
    }

    // Função para tratar a mudança do setor no select
    function atualizarCamposSetor(event) {
        const select = event.target;
        const setorCodigo = select.value;
        const rowId = select.getAttribute('data-id');
        
        if (!setorCodigo || !rowId) return;
        
        const setor = obterSetor(setorCodigo);
        if (!setor) return;
        
        // Preencher os campos automaticamente
        const aliquotaInput = document.querySelector(`input[name="setor-aliquota-${rowId}"]`);
        const reducaoInput = document.querySelector(`input[name="setor-reducao-${rowId}"]`);
        const cronogramaSelect = document.querySelector(`select[name="setor-cronograma-${rowId}"]`);
        
        if (aliquotaInput) {
            aliquotaInput.value = (setor.aliquotaEfetiva * 100).toFixed(1);
        }
        
        if (reducaoInput) {
            reducaoInput.value = (setor.reducaoEspecial * 100).toFixed(1);
        }
        
        if (cronogramaSelect) {
            cronogramaSelect.value = setor.cronogramaProprio ? 'proprio' : 'padrao';
        }
    }

    // Função para adicionar eventos aos selects de setores
    function adicionarEventosSelects() {
        document.querySelectorAll('.setor-select').forEach(select => {
            // Remover evento anterior para evitar duplicação
            select.removeEventListener('change', atualizarCamposSetor);
            // Adicionar novo evento
            select.addEventListener('change', atualizarCamposSetor);
            // Garantir que o select tenha opções
            if (select.options.length <= 1) {
                preencherSelectSetores(select);
            }
        });
    }

    // Função para adicionar novo setor à tabela
    function adicionarNovoSetor() {
        const tabelaSetores = document.getElementById('sector-table');
        if (!tabelaSetores) return;
        
        const tbody = tabelaSetores.getElementsByTagName('tbody')[0];
        if (!tbody) return;
        
        // Determinar o próximo ID
        let nextId = 1;
        const linhas = tbody.getElementsByTagName('tr');
        if (linhas.length > 0) {
            const ultimaLinha = linhas[linhas.length - 1];
            const ultimoId = parseInt(ultimaLinha.id.replace('setor-', ''));
            if (!isNaN(ultimoId)) {
                nextId = ultimoId + 1;
            }
        }
        
        // Criar nova linha
        const novaLinha = document.createElement('tr');
        novaLinha.id = `setor-${nextId}`;
        novaLinha.innerHTML = `
            <td>
                <select name="setor-nome-${nextId}" class="setor-select" data-id="${nextId}">
                    <option value="">Selecione um setor...</option>
                </select>
            </td>
            <td><input type="number" name="setor-aliquota-${nextId}" min="0" max="100" step="0.01" value="26.5"></td>
            <td><input type="number" name="setor-reducao-${nextId}" min="0" max="100" step="0.01" value="0"></td>
            <td>
                <select name="setor-cronograma-${nextId}">
                    <option value="padrao">Cronograma Padrão</option>
                    <option value="proprio">Cronograma Específico</option>
                </select>
            </td>
            <td>
                <button type="button" class="btn btn-outline btn-sm" onclick="configurarCronogramaSetor(${nextId})">Configurar</button>
                <button type="button" class="btn btn-accent btn-sm" onclick="removerSetor(${nextId})">Remover</button>
            </td>
        `;
        
        tbody.appendChild(novaLinha);
        
        // Preencher o select e adicionar eventos
        const selectSetor = novaLinha.querySelector('.setor-select');
        preencherSelectSetores(selectSetor);
        
        // Adicionar eventos
        adicionarEventosSelects();
        
        return nextId;
    }

    // Função para inicializar a tabela de setores
    function inicializarTabelaSetores() {
        // Verificar se estamos na página correta e se a tabela existe
        const tabelaSetores = document.getElementById('sector-table');
        if (!tabelaSetores) {
            console.warn('Tabela de setores não encontrada');
            return;
        }
        
        const tbody = tabelaSetores.getElementsByTagName('tbody')[0];
        if (!tbody) {
            console.warn('tbody não encontrado na tabela de setores');
            return;
        }
        
        // Verificar se tem linhas existentes
        const linhas = tbody.getElementsByTagName('tr');
        if (linhas.length === 0) {
            // Se não tiver linhas, adicionar as primeiras três linhas
            for (let i = 0; i < 3; i++) {
                adicionarNovoSetor();
            }
        } else {
            // Se já tiver linhas, converter inputs para selects
            for (let i = 0; i < linhas.length; i++) {
                const linha = linhas[i];
                const id = linha.id.replace('setor-', '');
                const tdPrimeiraColuna = linha.cells[0];
                
                // Verificar se a primeira coluna já tem um select
                const selectExistente = tdPrimeiraColuna.querySelector('select');
                if (!selectExistente) {
                    // Se não tiver select, converter input para select
                    const inputNome = tdPrimeiraColuna.querySelector('input');
                    const nomeAtual = inputNome ? inputNome.value : '';
                    
                    tdPrimeiraColuna.innerHTML = `
                        <select name="setor-nome-${id}" class="setor-select" data-id="${id}">
                            <option value="">Selecione um setor...</option>
                        </select>
                    `;
                    
                    const novoSelect = tdPrimeiraColuna.querySelector('select');
                    preencherSelectSetores(novoSelect);
                    
                    // Tentar selecionar a opção correspondente ao nome atual
                    if (nomeAtual && novoSelect) {
                        Array.from(novoSelect.options).forEach(option => {
                            if (option.text === nomeAtual) {
                                option.selected = true;
                                // Disparar evento de change
                                const event = new Event('change');
                                novoSelect.dispatchEvent(event);
                            }
                        });
                    }
                }
            }
            
            // Adicionar eventos aos selects
            adicionarEventosSelects();
        }
        
        console.log('Tabela de setores inicializada com sucesso');
    }

    // Função para configurar o cronograma específico de um setor
    function configurarCronogramaSetor(id) {
        const linha = document.getElementById(`setor-${id}`);
        if (!linha) return;
        
        const selectSetor = linha.querySelector('.setor-select');
        let nomeSetor = "Setor";
        
        if (selectSetor && selectSetor.selectedIndex > 0) {
            nomeSetor = selectSetor.options[selectSetor.selectedIndex].text;
        }
        
        // Atualizar o modal
        const modalSetorNome = document.getElementById('modal-setor-nome');
        const modalSetorId = document.getElementById('modal-setor-id');
        
        if (modalSetorNome) modalSetorNome.textContent = nomeSetor;
        if (modalSetorId) modalSetorId.value = id;
        
        // Preencher tabela do modal com cronograma padrão
        const tabelaCronograma = document.getElementById('cronograma-setor-table');
        if (tabelaCronograma) {
            const tbody = tabelaCronograma.getElementsByTagName('tbody')[0];
            if (tbody) {
                tbody.innerHTML = '';
                
                // Usar cronograma padrão
                const cronogramaPadrao = {
                    2026: 10.0,
                    2027: 25.0,
                    2028: 40.0,
                    2029: 55.0,
                    2030: 70.0,
                    2031: 85.0,
                    2032: 95.0,
                    2033: 100.0
                };
                
                for (let ano = 2026; ano <= 2033; ano++) {
                    const linha = document.createElement('tr');
                    linha.innerHTML = `
                        <td>${ano}</td>
                        <td><input type="number" name="modal-perc-${ano}" min="0" max="100" step="0.1" value="${cronogramaPadrao[ano]}"></td>
                        <td><input type="text" name="modal-obs-${ano}" placeholder="Observações..."></td>
                    `;
                    tbody.appendChild(linha);
                }
            }
        }
        
        // Exibir modal
        const modal = document.getElementById('modal-cronograma-setor');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    // Função para remover um setor da tabela
    function removerSetor(id) {
        if (confirm('Confirma a exclusão deste setor?')) {
            const linha = document.getElementById(`setor-${id}`);
            if (linha && linha.parentNode) {
                linha.parentNode.removeChild(linha);
            }
        }
    }
    
    /**
     * Se necessário, atualizar a função de obtenção de setor para incluir os novos parâmetros
     * @param {string} codigoSetor - Código do setor
     * @returns {Object} Configurações completas do setor
     */
    function obterConfiguracoesSetorCompletas(codigoSetor) {
        return setoresPadrao[codigoSetor] || setoresPadrao.comercio; // Default para comércio
    }

    // Exportar funções para o escopo global
    window.inicializarTabelaSetores = inicializarTabelaSetores;
    window.configurarCronogramaSetor = configurarCronogramaSetor;
    window.removerSetor = removerSetor;
    window.adicionarNovoSetor = adicionarNovoSetor;
    
    // Inicialização automática
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM carregado, verificando se deve inicializar a tabela de setores');
        
        // Verificar se estamos na aba de configurações
        const abas = document.querySelectorAll('.tab-button');
        let abaAtiva = null;
        
        abas.forEach(function(aba) {
            if (aba.classList.contains('active')) {
                abaAtiva = aba;
            }
            
            // Adicionar listener para inicializar quando mudar para a aba de configurações
            aba.addEventListener('click', function() {
                if (this.getAttribute('data-tab') === 'configuracoes') {
                    console.log('Aba configurações ativada, inicializando tabela de setores');
                    inicializarTabelaSetores();
                }
            });
        });
        
        // Se a aba ativa for a de configurações, inicializar
        if (abaAtiva && abaAtiva.getAttribute('data-tab') === 'configuracoes') {
            console.log('Aba configurações já está ativa, inicializando tabela de setores');
            inicializarTabelaSetores();
        }
        
        // Adicionar evento ao botão de adicionar setor
        const btnAdicionarSetor = document.getElementById('btn-adicionar-setor');
        if (btnAdicionarSetor) {
            btnAdicionarSetor.addEventListener('click', adicionarNovoSetor);
        }
        
        // Adicionar eventos para o modal
        const btnSalvarCronogramaSetor = document.getElementById('btn-salvar-cronograma-setor');
        if (btnSalvarCronogramaSetor) {
            btnSalvarCronogramaSetor.addEventListener('click', function() {
                const modal = document.getElementById('modal-cronograma-setor');
                if (modal) {
                    modal.style.display = 'none';
                }
                
                const setorId = document.getElementById('modal-setor-id').value;
                const select = document.querySelector(`select[name="setor-cronograma-${setorId}"]`);
                if (select) {
                    select.value = 'proprio';
                }
            });
        }
        
        const btnCancelarModal = document.getElementById('btn-cancelar-modal');
        if (btnCancelarModal) {
            btnCancelarModal.addEventListener('click', function() {
                const modal = document.getElementById('modal-cronograma-setor');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        }
        
        const btnFecharModal = document.getElementById('btn-fechar-modal');
        if (btnFecharModal) {
            btnFecharModal.addEventListener('click', function() {
                const modal = document.getElementById('modal-cronograma-setor');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        }
    });
})();