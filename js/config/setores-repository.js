/**
 * SetoresRepository - Repositório centralizado de setores com suas alíquotas e reduções
 * Versão: 1.0.0
 * Serve como única fonte de verdade para os dados setoriais
 */
const SetoresRepository = (function() {
    // Dados dos setores - única definição em todo o sistema
    const SETORES_DATA = {
        // Setores Gerais
        'comercio': {
            nome: 'Comércio Varejista',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        'industria': {
            nome: 'Indústria de Transformação',
            aliquotaEfetiva: 0.220,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        'servicos': {
            nome: 'Serviços Contínuos',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        'agronegocio': {
            nome: 'Agronegócio',
            aliquotaEfetiva: 0.195,
            reducaoEspecial: 0.00,
            implementacaoInicial: 5,
            cronogramaProprio: true
        },
        'construcao': {
            nome: 'Construção Civil',
            aliquotaEfetiva: 0.240,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        'tecnologia': {
            nome: 'Tecnologia',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 15,
            cronogramaProprio: false
        },
        
        // Setores com Redução de 60% na Alíquota
        'educacao': {
            nome: 'Serviços de Educação',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        'saude': {
            nome: 'Serviços de Saúde',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        'dispositivos_medicos': {
            nome: 'Dispositivos Médicos',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        'dispositivos_acessibilidade': {
            nome: 'Dispositivos de Acessibilidade',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        'medicamentos': {
            nome: 'Medicamentos',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 5,
            cronogramaProprio: false
        },
        'cuidados_menstruais': {
            nome: 'Produtos de Cuidados Menstruais',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 5,
            cronogramaProprio: false
        },
        'transporte_coletivo': {
            nome: 'Transporte Coletivo',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        'alimentos_consumo_humano': {
            nome: 'Alimentos para Consumo Humano',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 5,
            cronogramaProprio: false
        },
        'higiene_limpeza': {
            nome: 'Produtos de Higiene e Limpeza',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        'producoes_artisticas': {
            nome: 'Produções Artísticas e Culturais',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 10,
            cronogramaProprio: false
        },
        'insumos_agropecuarios': {
            nome: 'Insumos Agropecuários',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 5,
            cronogramaProprio: false
        },
        'seguranca_nacional': {
            nome: 'Segurança e Soberania Nacional',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 5,
            cronogramaProprio: false
        },
        
        // Setores com Alíquota Zero
        'cesta_basica': {
            nome: 'Cesta Básica Nacional',
            aliquotaEfetiva: 0.00,
            reducaoEspecial: 0.00,
            implementacaoInicial: 0,
            cronogramaProprio: false
        },
        'alimentos_in_natura': {
            nome: 'Produtos Hortícolas, Frutas e Ovos',
            aliquotaEfetiva: 0.00,
            reducaoEspecial: 0.00,
            implementacaoInicial: 0,
            cronogramaProprio: false
        },
        'educacao_prouni': {
            nome: 'Serviços de Educação Superior - ProUni',
            aliquotaEfetiva: 0.00,
            reducaoEspecial: 0.00,
            implementacaoInicial: 0,
            cronogramaProprio: false
        },
        'eventos_perse': {
            nome: 'Serviços do Setor de Eventos - PERSE',
            aliquotaEfetiva: 0.00,
            reducaoEspecial: 0.00,
            implementacaoInicial: 0,
            cronogramaProprio: true,
            cronogramaObservacao: 'Válido até 28.02.2027'
        },
        'recuperacao_urbana': {
            nome: 'Recuperação Urbana em Áreas Históricas',
            aliquotaEfetiva: 0.00,
            reducaoEspecial: 0.00,
            implementacaoInicial: 0,
            cronogramaProprio: false
        },
        
        // Regimes Específicos
        'combustiveis_energia': {
            nome: 'Combustíveis e Energia',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: true,
            regimeEspecifico: 'monofasico'
        },
        'financeiro_seguros': {
            nome: 'Financeiro e Seguros',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: true
        },
        'planos_saude': {
            nome: 'Planos e Seguros de Saúde',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.159,  // 60% de redução
            implementacaoInicial: 10,
            cronogramaProprio: true
        },
        'industria_petroleo': {
            nome: 'Indústria de Petróleo',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: true,
            cronogramaObservacao: 'Válido até 31.12.2040'
        },
        'bens_capital': {
            nome: 'Bens de Capital',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: true,
            cronogramaObservacao: 'Suspensão por 5 anos para compras até 31.12.2028'
        },
        'industria_exportacao': {
            nome: 'Industrialização para Exportação',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: true
        },
        'lojas_francas': {
            nome: 'Regimes Aduaneiros - Lojas Francas',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: true
        },
        'reporto': {
            nome: 'Regime Reporto (Modernização de Portos)',
            aliquotaEfetiva: 0.265,
            reducaoEspecial: 0.00,
            implementacaoInicial: 10,
            cronogramaProprio: true
        }
    };
    
    // Dados salvos pelo usuário
    let setoresPersonalizados = {};
    
    // Verificar se há dados salvos no localStorage
    function carregarSetoresSalvos() {
        const setoresSalvos = localStorage.getItem('setores-split-payment');
        if (setoresSalvos) {
            try {
                setoresPersonalizados = JSON.parse(setoresSalvos);
                console.log('Setores personalizados carregados do localStorage');
            } catch (error) {
                console.error('Erro ao carregar setores do localStorage:', error);
                setoresPersonalizados = {};
            }
        }
    }
    
    // Salvar setores no localStorage
    function salvarSetores() {
        try {
            localStorage.setItem('setores-split-payment', JSON.stringify(setoresPersonalizados));
            return true;
        } catch (error) {
            console.error('Erro ao salvar setores no localStorage:', error);
            return false;
        }
    }
    
    // API pública
    return {
        /**
         * Inicializa o repositório
         */
        inicializar: function() {
            carregarSetoresSalvos();
            console.log('SetoresRepository inicializado');
        },
        
        /**
         * Retorna todos os setores, mesclando os padrões com os personalizados
         * @returns {Object} - Objeto com todos os setores
         */
        obterTodos: function() {
            return { ...SETORES_DATA, ...setoresPersonalizados };
        },
        
        /**
         * Retorna um setor específico
         * @param {string} codigo - Código do setor
         * @returns {Object|null} - Objeto do setor ou null se não encontrado
         */
        obterSetor: function(codigo) {
            // Verificar primeiro nos personalizados
            if (setoresPersonalizados[codigo]) {
                return setoresPersonalizados[codigo];
            }
            // Depois nos padrões
            return SETORES_DATA[codigo] || null;
        },
        
        /**
         * Retorna array de setores formatados para uso em dropdowns
         * @returns {Array} - Array de objetos {codigo, nome}
         */
        obterParaDropdown: function() {
            const todos = this.obterTodos();
            return Object.keys(todos).map(codigo => ({
                codigo: codigo,
                nome: todos[codigo].nome
            }));
        },
        
        /**
         * Retorna a alíquota efetiva para um setor, considerando reduções
         * @param {string} codigo - Código do setor
         * @returns {number} - Alíquota efetiva (já com reduções aplicadas)
         */
        obterAliquotaEfetiva: function(codigo) {
            const setor = this.obterSetor(codigo);
            if (!setor) return 0.265; // Valor padrão
            
            return setor.aliquotaEfetiva - setor.reducaoEspecial;
        },
        
        /**
         * Adiciona ou atualiza um setor personalizado
         * @param {string} codigo - Código do setor
         * @param {Object} dados - Dados do setor
         * @returns {boolean} - Sucesso da operação
         */
        salvarSetor: function(codigo, dados) {
            if (!codigo || !dados || !dados.nome) {
                console.error('Dados insuficientes para salvar setor');
                return false;
            }
            
            setoresPersonalizados[codigo] = { ...dados };
            return salvarSetores();
        },
        
        /**
         * Remove um setor personalizado
         * @param {string} codigo - Código do setor
         * @returns {boolean} - Sucesso da operação
         */
        removerSetor: function(codigo) {
            if (!setoresPersonalizados[codigo]) {
                // Se não for um setor personalizado, não pode ser removido
                return false;
            }
            
            delete setoresPersonalizados[codigo];
            return salvarSetores();
        },
        
        /**
         * Preenche um dropdown de setores
         * @param {string} selectorId - ID do elemento select
         */
        preencherDropdown: function(selectorId) {
            const dropdown = document.getElementById(selectorId);
            if (!dropdown) {
                console.error(`Elemento select com ID ${selectorId} não encontrado`);
                return;
            }
            
            // Limpar opções existentes exceto a primeira (opção padrão)
            while (dropdown.options.length > 1) {
                dropdown.remove(1);
            }
            
            // Adicionar setores ordenados alfabeticamente pelo nome
            const setoresDropdown = this.obterParaDropdown()
                .sort((a, b) => a.nome.localeCompare(b.nome));
            
            setoresDropdown.forEach(setor => {
                const option = document.createElement('option');
                option.value = setor.codigo;
                
                // Obter dados completos do setor para incluir nas propriedades data-*
                const setorDados = this.obterSetor(setor.codigo);
                if (setorDados) {
                    const aliquotaEfetiva = this.obterAliquotaEfetiva(setor.codigo);
                    option.textContent = setor.nome;
                    
                    // Adicionar atributos data-* para uso em scripts
                    option.dataset.aliquota = (setorDados.aliquotaEfetiva * 100).toFixed(1);
                    option.dataset.reducao = (setorDados.reducaoEspecial * 100).toFixed(1);
                    option.dataset.efetiva = (aliquotaEfetiva * 100).toFixed(1);
                    
                    dropdown.appendChild(option);
                }
            });
            
            console.log(`Dropdown ${selectorId} atualizado com ${setoresDropdown.length} setores`);
        }
    };
})();