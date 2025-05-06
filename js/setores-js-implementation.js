/**
 * Gestão de Setores para o Simulador de Split Payment
 * Responsável por gerenciar, renderizar e manipular os setores no simulador
 */
const SetoresManager = {
    /**
     * Lista com todos os setores cadastrados
     */
    setores: {
        // Setores padrão (existentes previamente)
        "comercio": {
            nome: "Comércio Varejista",
            aliquotaEfetiva: 26.5,
            reducaoEspecial: 0.0,
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        "industria": {
            nome: "Indústria de Transformação",
            aliquotaEfetiva: 22.0,
            reducaoEspecial: 0.0,
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        "servicos": {
            nome: "Serviços Contínuos",
            aliquotaEfetiva: 26.5,
            reducaoEspecial: 0.0,
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        "agronegocio": {
            nome: "Agronegócio",
            aliquotaEfetiva: 19.5,
            reducaoEspecial: 2.0,
            implementacaoInicial: 5,
            cronogramaProprio: false
        },
        "construcao": {
            nome: "Construção Civil",
            aliquotaEfetiva: 24.0,
            reducaoEspecial: 0.0,
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        "tecnologia": {
            nome: "Tecnologia",
            aliquotaEfetiva: 26.5,
            reducaoEspecial: 0.0,
            implementacaoInicial: 15,
            cronogramaProprio: false
        },
        "saude": {
            nome: "Saúde",
            aliquotaEfetiva: 14.5,
            reducaoEspecial: 3.0,
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        "educacao": {
            nome: "Educação",
            aliquotaEfetiva: 12.5,
            reducaoEspecial: 5.0,
            implementacaoInicial: 10,
            cronogramaProprio: false
        }
    },

    /**
     * Lista de setores da reforma tributária para importação rápida
     */
    setoresReforma: [
        {
            codigo: "medicamentos",
            nome: "Medicamentos",
            aliquotaEfetiva: 10.6,
            reducaoEspecial: 60.0,
            implementacaoInicial: 5,
            cronogramaProprio: false
        },
        {
            codigo: "dispositivos_medicos",
            nome: "Dispositivos Médicos",
            aliquotaEfetiva: 10.6,
            reducaoEspecial: 60.0,
            implementacaoInicial: 5,
            cronogramaProprio: false
        },
        {
            codigo: "dispositivos_acessibilidade",
            nome: "Dispositivos de Acessibilidade",
            aliquotaEfetiva: 10.6,
            reducaoEspecial: 60.0,
            implementacaoInicial: 5,
            cronogramaProprio: false
        },
        {
            codigo: "cuidados_menstruais",
            nome: "Produtos de Cuidados Menstruais",
            aliquotaEfetiva: 10.6,
            reducaoEspecial: 60.0,
            implementacaoInicial: 5,
            cronogramaProprio: false
        },
        {
            codigo: "transporte_coletivo",
            nome: "Transporte Coletivo",
            aliquotaEfetiva: 10.6,
            reducaoEspecial: 60.0,
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        {
            codigo: "alimentos_consumo_humano",
            nome: "Alimentos para Consumo Humano",
            aliquotaEfetiva: 10.6,
            reducaoEspecial: 60.0,
            implementacaoInicial: 5,
            cronogramaProprio: false
        },
        {
            codigo: "higiene_limpeza",
            nome: "Produtos de Higiene e Limpeza",
            aliquotaEfetiva: 10.6,
            reducaoEspecial: 60.0,
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        {
            codigo: "produções_artisticas",
            nome: "Produções Artísticas e Culturais",
            aliquotaEfetiva: 10.6,
            reducaoEspecial: 60.0,
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        {
            codigo: "insumos_agropecuarios",
            nome: "Insumos Agropecuários",
            aliquotaEfetiva: 10.6,
            reducaoEspecial: 60.0,
            implementacaoInicial: 5,
            cronogramaProprio: false
        },
        {
            codigo: "seguranca_nacional",
            nome: "Segurança e Soberania Nacional",
            aliquotaEfetiva: 10.6,
            reducaoEspecial: 60.0,
            implementacaoInicial: 5,
            cronogramaProprio: false
        },
        {
            codigo: "combustiveis_energia",
            nome: "Combustíveis e Energia",
            aliquotaEfetiva: 26.5,
            reducaoEspecial: 0.0,
            implementacaoInicial: 10,
            cronogramaProprio: true
        },
        {
            codigo: "financeiro_seguros",
            nome: "Financeiro e Seguros",
            aliquotaEfetiva: 26.5,
            reducaoEspecial: 0.0,
            implementacaoInicial: 10,
            cronogramaProprio: true
        },
        {
            codigo: "industria_petroleo",
            nome: "Indústria de Petróleo",
            aliquotaEfetiva: 26.5,
            reducaoEspecial: 0.0,
            implementacaoInicial: 10,
            cronogramaProprio: true
        },
        {
            codigo: "bens_capital",
            nome: "Bens de Capital",
            aliquotaEfetiva: 26.5,
            reducaoEspecial: 0.0,
            implementacaoInicial: 10,
            cronogramaProprio: true
        },
        {
            codigo: "cesta_basica",
            nome: "Cesta Básica Nacional",
            aliquotaEfetiva: 0.0,
            reducaoEspecial: 100.0,
            implementacaoInicial: 0,
            cronogramaProprio: false
        },
        {
            codigo: "regimes_aduaneiros",
            nome: "Regimes Aduaneiros Especiais",
            aliquotaEfetiva: 26.5,
            reducaoEspecial: 0.0,
            implementacaoInicial: 10,
            cronogramaProprio: true
        }
    ],

    /**
     * Setor sendo editado atualmente
     */
    setorEditando: null,

    /**
     * Inicializa o gerenciador de setores
     */
    inicializar: function() {
        console.log('Inicializando gerenciador de setores...');
        
        // Carregar setores do localStorage se existirem
        this.carregarSetores();
        
        // Renderizar a tabela de setores
        this.renderizarTabela();
        
        // Inicializar eventos
        this.inicializarEventos();
        
        console.log('Gerenciador de setores inicializado com sucesso.');
    },

    /**
     * Inicializa os eventos dos botões e campos
     */
    inicializarEventos: function() {
        // Botão para adicionar novo setor
        document.getElementById('btn-adicionar-setor').addEventListener('click', () => {
            this.mostrarFormulario('novo');
        });
        
        // Botão para importar setores da reforma
        document.getElementById('btn-importar-setores').addEventListener('click', () => {
            this.importarSetoresReforma();
        });
        
        // Botão para salvar setor
        document.getElementById('btn-salvar-setor').addEventListener('click', () => {
            this.salvarSetor();
        });
        
        // Botão para cancelar edição/adição
        document.getElementById('btn-cancelar-setor').addEventListener('click', () => {
            this.esconderFormulario();
        });
        
        // Campo de busca
        document.getElementById('busca-setor').addEventListener('input', (e) => {
            this.filtrarSetores(e.target.value);
        });
        
        // Eventos para modal de exclusão
        document.getElementById('btn-confirmar-exclusao').addEventListener('click', () => {
            this.confirmarExclusaoSetor();
        });
        
        document.getElementById('btn-cancelar-exclusao').addEventListener('click', () => {
            this.fecharModalExclusao();
        });
        
        // Fechar modal ao clicar no X
        document.querySelector('#modal-confirmar-exclusao .close').addEventListener('click', () => {
            this.fecharModalExclusao();
        });
    },

    /**
     * Carrega setores do localStorage
     */
    carregarSetores: function() {
        try {
            const setoresSalvos = localStorage.getItem('setores-split-payment');
            if (setoresSalvos) {
                this.setores = JSON.parse(setoresSalvos);
                console.log('Setores carregados do localStorage');
            }
        } catch (error) {
            console.error('Erro ao carregar setores:', error);
        }
    },

    /**
     * Salva setores no localStorage
     */
    salvarSetores: function() {
        try {
            localStorage.setItem('setores-split-payment', JSON.stringify(this.setores));
            console.log('Setores salvos no localStorage');
        } catch (error) {
            console.error('Erro ao salvar setores:', error);
        }
    },

    /**
     * Renderiza a tabela de setores com os dados atuais
     */
    renderizarTabela: function() {
        const tbody = document.querySelector('#tabela-setores tbody');
        if (!tbody) {
            console.error('Elemento tbody não encontrado');
            return;
        }
        
        // Limpar tabela
        tbody.innerHTML = '';
        
        // Adicionar cada setor à tabela
        for (const [codigo, setor] of Object.entries(this.setores)) {
            const tr = document.createElement('tr');
            tr.setAttribute('data-setor-codigo', codigo);
            
            tr.innerHTML = `
                <td>${setor.nome}</td>
                <td>${setor.aliquotaEfetiva.toFixed(1)}</td>
                <td>${setor.reducaoEspecial.toFixed(1)}</td>
                <td>${setor.implementacaoInicial}</td>
                <td>${setor.cronogramaProprio ? 'Próprio' : 'Padrão'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="edit-btn" data-setor="${codigo}" title="Editar">✏️</button>
                        <button class="delete-btn" data-setor="${codigo}" title="Excluir">🗑️</button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(tr);
        }
        
        // Adicionar eventos aos botões de ação
        this.adicionarEventosBotoes();
    },

    /**
     * Adiciona eventos aos botões de editar e excluir
     */
    adicionarEventosBotoes: function() {
        // Botões de edição
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const codigo = e.target.getAttribute('data-setor');
                this.editarSetor(codigo);
            });
        });
        
        // Botões de exclusão
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const codigo = e.target.getAttribute('data-setor');
                this.confirmarExclusao(codigo);
            });
        });
    },

    /**
     * Exibe o formulário para adicionar ou editar um setor
     * @param {string} modo - 'novo' ou 'editar'
     * @param {string} [codigo] - Código do setor a ser editado (apenas para modo 'editar')
     */
    mostrarFormulario: function(modo, codigo = null) {
        const form = document.getElementById('form-novo-setor');
        
        // Definir o modo
        document.getElementById('setor-modo').value = modo;
        
        if (modo === 'editar' && codigo) {
            // Carregar dados do setor para edição
            const setor = this.setores[codigo];
            if (!setor) {
                console.error(`Setor com código ${codigo} não encontrado`);
                return;
            }
            
            document.getElementById('setor-nome').value = setor.nome;
            document.getElementById('setor-codigo').value = codigo;
            document.getElementById('setor-aliquota').value = setor.aliquotaEfetiva;
            document.getElementById('setor-reducao').value = setor.reducaoEspecial;
            document.getElementById('setor-implementacao').value = setor.implementacaoInicial;
            document.getElementById('setor-cronograma').value = setor.cronogramaProprio ? 'proprio' : 'padrao';
            document.getElementById('setor-original-codigo').value = codigo;
            
            // Desabilitar campo de código (não deve ser alterado)
            document.getElementById('setor-codigo').disabled = true;
        } else {
            // Limpar campos para novo setor
            document.getElementById('setor-nome').value = '';
            document.getElementById('setor-codigo').value = '';
            document.getElementById('setor-aliquota').value = '26.5';
            document.getElementById('setor-reducao').value = '0';
            document.getElementById('setor-implementacao').value = '10';
            document.getElementById('setor-cronograma').value = 'padrao';
            document.getElementById('setor-original-codigo').value = '';
            
            // Habilitar campo de código
            document.getElementById('setor-codigo').disabled = false;
        }
        
        // Exibir formulário
        form.style.display = 'block';
        
        // Focar no primeiro campo
        document.getElementById('setor-nome').focus();
    },

    /**
     * Esconde o formulário de edição/adição
     */
    esconderFormulario: function() {
        document.getElementById('form-novo-setor').style.display = 'none';
    },

    /**
     * Salva o setor sendo editado/adicionado
     */
    salvarSetor: function() {
        // Obter valores do formulário
        const nome = document.getElementById('setor-nome').value.trim();
        let codigo = document.getElementById('setor-codigo').value.trim();
        const aliquota = parseFloat(document.getElementById('setor-aliquota').value);
        const reducao = parseFloat(document.getElementById('setor-reducao').value);
        const implementacao = parseInt(document.getElementById('setor-implementacao').value);
        const cronograma = document.getElementById('setor-cronograma').value;
        const modo = document.getElementById('setor-modo').value;
        const codigoOriginal = document.getElementById('setor-original-codigo').value;
        
        // Validar campos obrigatórios
        if (!nome || !codigo) {
            alert('Nome e código do setor são obrigatórios');
            return;
        }
        
        // Validar código (apenas letras, números e underscores)
        if (!/^[a-z0-9_]+$/.test(codigo)) {
            alert('Código do setor deve conter apenas letras minúsculas, números e underscores (_)');
            return;
        }
        
        // Validar valores numéricos
        if (isNaN(aliquota) || isNaN(reducao) || isNaN(implementacao)) {
            alert('Valores numéricos inválidos');
            return;
        }
        
        // Verificar se estamos editando ou adicionando
        if (modo === 'editar') {
            // Se o código original foi alterado, precisamos remover o antigo
            if (codigoOriginal && codigoOriginal !== codigo) {
                delete this.setores[codigoOriginal];
            }
        } else {
            // Verificar se já existe um setor com este código
            if (this.setores[codigo]) {
                alert(`Já existe um setor com o código "${codigo}"`);
                return;
            }
        }
        
        // Salvar o setor no objeto
        this.setores[codigo] = {
            nome: nome,
            aliquotaEfetiva: aliquota,
            reducaoEspecial: reducao,
            implementacaoInicial: implementacao,
            cronogramaProprio: cronograma === 'proprio'
        };
        
        // Salvar no localStorage
        this.salvarSetores();
        
        // Atualizar a tabela
        this.renderizarTabela();
        
        // Esconder o formulário
        this.esconderFormulario();
        
        // Mensagem de sucesso
        alert(`Setor "${nome}" ${modo === 'editar' ? 'atualizado' : 'adicionado'} com sucesso!`);
    },

    /**
     * Preparar formulário para editar um setor
     * @param {string} codigo - Código do setor a ser editado
     */
    editarSetor: function(codigo) {
        if (this.setores[codigo]) {
            this.mostrarFormulario('editar', codigo);
        } else {
            alert(`Setor com código "${codigo}" não encontrado`);
        }
    },

    /**
     * Abre o modal de confirmação de exclusão
     * @param {string} codigo - Código do setor a ser excluído
     */
    confirmarExclusao: function(codigo) {
        const setor = this.setores[codigo];
        if (!setor) {
            alert(`Setor com código "${codigo}" não encontrado`);
            return;
        }
        
        // Definir o setor que está sendo excluído
        this.setorEditando = codigo;
        
        // Atualizar o nome no modal
        document.getElementById('nome-setor-exclusao').textContent = setor.nome;
        
        // Exibir modal
        document.getElementById('modal-confirmar-exclusao').style.display = 'block';
    },

    /**
     * Fecha o modal de confirmação de exclusão
     */
    fecharModalExclusao: function() {
        document.getElementById('modal-confirmar-exclusao').style.display = 'none';
    },

    /**
     * Exclui o setor após confirmação
     */
    confirmarExclusaoSetor: function() {
        if (!this.setorEditando || !this.setores[this.setorEditando]) {
            alert('Erro ao excluir setor. Tente novamente.');
            this.fecharModalExclusao();
            return;
        }
        
        const nomeSetor = this.setores[this.setorEditando].nome;
        
        // Excluir o setor
        delete this.setores[this.setorEditando];
        
        // Salvar alterações
        this.salvarSetores();
        
        // Atualizar tabela
        this.renderizarTabela();
        
        // Fechar modal
        this.fecharModalExclusao();
        
        // Limpar setor editando
        this.setorEditando = null;
        
        // Mensagem de sucesso
        alert(`Setor "${nomeSetor}" excluído com sucesso!`);
    },

    /**
     * Filtra os setores exibidos na tabela
     * @param {string} texto - Texto de busca
     */
    filtrarSetores: function(texto) {
        const termoBusca = texto.toLowerCase();
        const linhas = document.querySelectorAll('#tabela-setores tbody tr');
        
        linhas.forEach(linha => {
            const codigo = linha.getAttribute('data-setor-codigo');
            const setor = this.setores[codigo];
            
            if (!setor) return;
            
            const conteudo = setor.nome.toLowerCase();
            
            if (conteudo.includes(termoBusca)) {
                linha.style.display = '';
            } else {
                linha.style.display = 'none';
            }
        });
    },

    /**
     * Importa os setores da reforma tributária
     */
    importarSetoresReforma: function() {
        if (!confirm(`Deseja importar ${this.setoresReforma.length} setores da reforma tributária?\nSetores com o mesmo código serão sobrescritos.`)) {
            return;
        }
        
        // Adiciona cada setor da reforma
        this.setoresReforma.forEach(setorReforma => {
            this.setores[setorReforma.codigo] = {
                nome: setorReforma.nome,
                aliquotaEfetiva: setorReforma.aliquotaEfetiva,
                reducaoEspecial: setorReforma.reducaoEspecial,
                implementacaoInicial: setorReforma.implementacaoInicial,
                cronogramaProprio: setorReforma.cronogramaProprio
            };
        });
        
        // Salvar alterações
        this.salvarSetores();
        
        // Atualizar tabela
        this.renderizarTabela();
        
        // Mensagem de sucesso
        alert(`${this.setoresReforma.length} setores da reforma tributária importados com sucesso!`);
    },

    /**
     * Exporta os setores configurados para a simulação
     * @returns {Object} Setores formatados para o simulador
     */
    exportarParaSimulador: function() {
        // Aqui você pode formatar os setores para o formato esperado pelo simulador
        // Por exemplo, convertendo as porcentagens para valores decimais
        const setoresFormatados = {};
        
        for (const [codigo, setor] of Object.entries(this.setores)) {
            setoresFormatados[codigo] = {
                nome: setor.nome,
                aliquota: setor.aliquotaEfetiva / 100,  // Converter para decimal
                reducao: setor.reducaoEspecial / 100,   // Converter para decimal
                implementacao: setor.implementacaoInicial / 100,  // Converter para decimal
                cronogramaProprio: setor.cronogramaProprio
            };
        }
        
        return setoresFormatados;
    }
};

// Inicializar o gerenciador de setores quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se estamos na aba de configurações setoriais
    const isConfiguracoesSetoriais = document.querySelector('.tab-button[data-tab="configuracoes"]');
    if (isConfiguracoesSetoriais) {
        SetoresManager.inicializar();
    }
    
    // Adicionar observador para mudança de aba
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (tabId === 'configuracoes') {
                // Garantir que o gerenciador de setores seja inicializado
                if (!SetoresManager.initialized) {
                    SetoresManager.inicializar();
                    SetoresManager.initialized = true;
                }
            }
        });
    });
});
