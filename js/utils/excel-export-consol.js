/**
 * Módulo de exportação para Excel do Simulador de Split Payment
 *
 * Este módulo contém as funções necessárias para exportar os dados e resultados
 * do simulador para o formato Excel, incluindo gráficos, tabelas e análises.
 *
 * @author Expertzy IT
 * @version 1.0.0
 * @copyright Expertzy Inteligência Tributária, 2025
 */
const ExcelExporter = {
    /**
     * Configurações padrão para os relatórios em Excel
     */
    config: {
        colors: {
            primary: 'FF3498DB', // Azul principal
            secondary: '2ECC71', // Verde
            accent: 'E74C3C', // Vermelho
            neutral: '7F8C8D', // Cinza
            highlight: '9B59B6', // Roxo
            background: 'F8F9FA', // Fundo claro
            headerBg: 'EAEAEA', // Fundo de cabeçalho
            lightBg1: 'F5F8FA', // Fundo claro 1 (alternado para tabelas)
            lightBg2: 'FFFFFF' // Fundo claro 2 (alternado para tabelas)
        },
        defaultColumnWidth: 15, // Largura padrão de coluna em caracteres
        defaultRowHeight: 18, // Altura padrão de linha em pontos
        defaultFontName: 'Calibri', // Fonte padrão
        defaultFontSize: 11, // Tamanho da fonte padrão
        defaultBoldFontSize: 11, // Tamanho da fonte em negrito
        defaultHeaderFontSize: 14, // Tamanho da fonte para cabeçalhos
        defaultTitleFontSize: 16, // Tamanho da fonte para títulos
        logoEnabled: true, // Habilitar logo
        logoSize: { // Tamanho do logo
            width: 180,
            height: 60
        }
    },

    /**
     * Inicializa o exportador com configurações personalizadas
     * @param {Object} customConfig - Configurações personalizadas
     */
    init: function(customConfig = {}) {
        this.config = { ...this.config, ...customConfig };
        return this;
    },

    /**
     * Exporta os dados do simulador para Excel
     * @param {Object} dados - Dados do simulador
     * @param {Object} resultados - Resultados da simulação
     * @param {Object} aliquotasEquivalentes - Alíquotas equivalentes calculadas
     * @param {Object} configuracao - Configuração atual do simulador
     * @param {Function} obterMemoriaCalculo - Função para obter a memória de cálculo
     * @returns {Promise} Promessa resolvida após a exportação do Excel
     */
    exportarRelatorio: async function(dados, resultados, aliquotasEquivalentes, configuracao, obterMemoriaCalculo) {
        if (!XLSX) {
            alert('Biblioteca XLSX não carregada. Por favor, aguarde e tente novamente.');
            return Promise.reject('Biblioteca XLSX não carregada');
        }

        if (!resultados || Object.keys(resultados).length === 0) {
            alert('Execute uma simulação antes de exportar os resultados.');
            return Promise.reject('Dados de simulação não disponíveis');
        }

        try {
            // Solicitar nome do arquivo ao usuário
            const nomeArquivo = this._solicitarNomeArquivo('xlsx', 'relatorio-split-payment');
            if (!nomeArquivo) {
                return Promise.reject('Exportação cancelada pelo usuário');
            }

            // Criar workbook
            const wb = XLSX.utils.book_new();
            
            // Definir propriedades do workbook
            wb.Props = {
                Title: "Relatório Simulador de Split Payment",
                Subject: "Análise do impacto do Split Payment no fluxo de caixa",
                Author: "Expertzy Inteligência Tributária",
                CreatedDate: new Date()
            };

            // Adicionar planilhas
            // 1. Planilha de Resumo
            const wsResumo = this._criarPlanilhaResumo(dados, resultados, aliquotasEquivalentes);
            XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

            // 2. Planilha de Parâmetros
            const wsParametros = this._criarPlanilhaParametros(dados, configuracao);
            XLSX.utils.book_append_sheet(wb, wsParametros, "Parâmetros");

            // 3. Planilha de Resultados
            const wsResultados = this._criarPlanilhaResultados(resultados, aliquotasEquivalentes);
            XLSX.utils.book_append_sheet(wb, wsResultados, "Resultados");

            // 4. Planilha de Análise Comparativa
            const wsComparativa = this._criarPlanilhaAnaliseComparativa(resultados, aliquotasEquivalentes);
            XLSX.utils.book_append_sheet(wb, wsComparativa, "Análise Comparativa");

            // 5. Planilha de Estratégias de Mitigação
            const wsEstrategias = this._criarPlanilhaEstrategias(dados, resultados);
            XLSX.utils.book_append_sheet(wb, wsEstrategias, "Estratégias de Mitigação");

            // 6. Planilha de Memória de Cálculo
            const wsMemoria = this._criarPlanilhaMemoriaCalculo(obterMemoriaCalculo);
            XLSX.utils.book_append_sheet(wb, wsMemoria, "Memória de Cálculo");

            // 7. Planilha de Dashboard
            const wsDashboard = this._criarPlanilhaDashboard(resultados, aliquotasEquivalentes);
            XLSX.utils.book_append_sheet(wb, wsDashboard, "Dashboard");

            // 8. Planilha de Alíquotas
            const wsAliquotas = this._criarPlanilhaAliquotas(configuracao);
            XLSX.utils.book_append_sheet(wb, wsAliquotas, "Alíquotas");

            // 9. Planilha de Fases de Transição
            const wsFases = this._criarPlanilhaFasesTransicao(configuracao);
            XLSX.utils.book_append_sheet(wb, wsFases, "Fases de Transição");

            // Salvar o arquivo
            XLSX.writeFile(wb, nomeArquivo);

            return Promise.resolve({
                success: true,
                message: 'Relatório exportado com sucesso!',
                fileName: nomeArquivo
            });
        } catch (error) {
            console.error(`Erro ao exportar para Excel: ${error.message}`, error);
            alert(`Erro ao exportar para Excel: ${error.message}`);
            return Promise.reject({
                success: false,
                message: `Erro ao exportar para Excel: ${error.message}`,
                error: error
            });
        }
    },

    /**
     * Solicita nome de arquivo ao usuário
     * @private
     * @param {string} extensao - Extensão do arquivo
     * @param {string} nomeDefault - Nome padrão sugerido
     * @returns {string|null} Nome do arquivo com extensão ou null se cancelado
     */
    _solicitarNomeArquivo: function(extensao, nomeDefault) {
        let nomeArquivo = prompt(
            `Digite o nome do arquivo para salvar (sem a extensão .${extensao}):`,
            nomeDefault || `relatorio-${new Date().toISOString().slice(0, 10)}`
        );
        
        if (nomeArquivo === null) {
            return null;
        }
        
        // Limpar caracteres inválidos
        nomeArquivo = nomeArquivo.replace(/[<>:"/\\|?*]/g, '-');
        if (!nomeArquivo.trim()) {
            nomeArquivo = nomeDefault || `relatorio-${new Date().toISOString().slice(0, 10)}`;
        }
        
        return `${nomeArquivo}.${extensao}`;
    },
    
    /**
     * Adiciona logo à planilha
     * @private
     * @param {Object} ws - Planilha alvo
     * @param {HTMLImageElement} logoImg - Elemento de imagem do logo
     * @param {Object} range - Range onde adicionar o logo
     */
    _adicionarLogo: function(ws, logoImg, range) {
        try {
            // Verificar se a biblioteca XLSX suporta imagens
            if (!XLSX.utils || !XLSX.utils.sheet_add_image) {
                console.warn('Versão da biblioteca XLSX não suporta adição de imagens');
                return;
            }

            // Criar um canvas para converter a imagem
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Definir tamanho do canvas
            canvas.width = this.config.logoSize.width;
            canvas.height = this.config.logoSize.height;
            
            // Desenhar a imagem no canvas
            ctx.drawImage(logoImg, 0, 0, canvas.width, canvas.height);
            
            // Converter para base64
            const imgBase64 = canvas.toDataURL('image/png').split(',')[1];
            
            // Adicionar a imagem à planilha
            const imgOpts = {
                name: 'LogoExpertzy',
                data: imgBase64,
                opts: {
                    base64: true,
                    position: {
                        type: 'twoCellAnchor',
                        from: { col: range.s.c, row: range.s.r },
                        to: { col: range.e.c, row: range.e.r }
                    }
                }
            };
            
            // Adicionar a imagem à planilha
            XLSX.utils.sheet_add_image(ws, imgOpts);
        } catch (e) {
            console.warn('Erro ao adicionar logo:', e);
        }
    },

    /**
     * Formata data no padrão brasileiro
     * @private
     * @param {Date} data - Data a ser formatada
     * @returns {string} Data formatada
     */
    _formatarData: function(data) {
        if (!data || !(data instanceof Date)) {
            data = new Date();
        }
        
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const hora = String(data.getHours()).padStart(2, '0');
        const minuto = String(data.getMinutes()).padStart(2, '0');
        
        return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
    },

    /**
     * Capitaliza a primeira letra de uma string
     * @private
     * @param {string} texto - Texto a ser capitalizado
     * @returns {string} Texto com a primeira letra maiúscula
     */
    _capitalizarPrimeiraLetra: function(texto) {
        if (!texto || typeof texto !== 'string') {
            return '';
        }
        
        return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
    },

    /**
     * Obtém o nome formatado do regime tributário
     * @private
     * @param {string} regime - Código do regime tributário
     * @returns {string} Nome formatado do regime
     */
    _obterRegimeTributarioFormatado: function(regime) {
        const regimes = {
            'real': 'Lucro Real',
            'presumido': 'Lucro Presumido',
            'simples': 'Simples Nacional',
            'mei': 'Microempreendedor Individual',
            'imune': 'Entidade Imune/Isenta'
        };
        
        return regimes[regime] || regime;
    },
    
    /**
     * Cria a planilha de resumo
     * @private
     * @param {Object} dados - Dados da simulação
     * @param {Object} resultados - Resultados da simulação
     * @param {Object} aliquotasEquivalentes - Alíquotas equivalentes calculadas
     * @returns {Object} Planilha de resumo
     */
    _criarPlanilhaResumo: function(dados, resultados, aliquotasEquivalentes) {
        // Dados da planilha
        const resumoData = [
            ['RELATÓRIO DE SIMULAÇÃO - SPLIT PAYMENT'],
            ['Expertzy Inteligência Tributária'],
            ['Data do relatório:', this._formatarData(new Date())],
            [],
            ['RESUMO EXECUTIVO'],
            [],
            ['Parâmetros Principais'],
            ['Setor:', dados.setor ? this._capitalizarPrimeiraLetra(dados.setor) : ''],
            ['Regime Tributário:', this._obterRegimeTributarioFormatado(dados.regime)],
            ['Faturamento Anual:', dados.faturamento],
            ['Período de Simulação:', `${dados.anoInicial || 2026} a ${dados.anoFinal || 2033}`],
            [],
            ['Resultados Principais'],
        ];
        
        // Calcular indicadores
        const anos = Object.keys(resultados).sort();
        
        let variacaoTotal = 0;
        let maiorImpacto = { valor: 0, ano: '' };
        let menorImpacto = { valor: Number.MAX_SAFE_INTEGER, ano: '' };
        
        // Calcular variações e encontrar maior/menor impacto
        anos.forEach(ano => {
            const resultado = resultados[ano];
            const valorAtual = aliquotasEquivalentes[ano].valor_atual;
            const diferenca = resultado.imposto_devido - valorAtual;
            
            // Acumular variação total
            variacaoTotal += diferenca;
            
            // Verificar maior impacto
            if (Math.abs(diferenca) > Math.abs(maiorImpacto.valor)) {
                maiorImpacto.valor = diferenca;
                maiorImpacto.ano = ano;
            }
            
            // Verificar menor impacto
            if (Math.abs(diferenca) < Math.abs(menorImpacto.valor)) {
                menorImpacto.valor = diferenca;
                menorImpacto.ano = ano;
            }
        });
    },
    
    /**
     * Cria a planilha de parâmetros
     * @private
     * @param {Object} dados - Dados da simulação
     * @param {Object} configuracao - Configuração do simulador
     * @returns {Object} Planilha de parâmetros
     */
    _criarPlanilhaParametros: function(dados, configuracao) {
        // Dados da planilha
        const parametrosData = [
            ['PARÂMETROS DA SIMULAÇÃO'],
            ['Expertzy Inteligência Tributária'],
            ['Data do relatório:', this._formatarData(new Date())],
            [],
            ['1. DADOS DA EMPRESA'],
        ];
        
        // Formatar valores
        const formatarMoeda = valor => 
            typeof valor === 'number' ? valor : 0;
        
        const formatarPercentual = valor => 
            typeof valor === 'number' ? valor / 100 : 0;
        
        // Seção 1.1 - Dados Financeiros
        parametrosData.push(
            ['1.1. Dados Financeiros'],
            ['Parâmetro', 'Valor'],
            ['Faturamento Anual', formatarMoeda(dados.faturamento)],
            ['Custos Tributáveis', formatarMoeda(dados.custosTributaveis)],
            ['Custos Tributáveis (ICMS)', formatarMoeda(dados.custosICMS)],
            ['Custos de Fornecedores do Simples', formatarMoeda(dados.custosSimples)],
            ['Créditos Anteriores', formatarMoeda(dados.creditosAnteriores)],
            []
        );
        
        // Seção 1.2 - Configurações Setoriais
        parametrosData.push(
            ['1.2. Configurações Setoriais'],
            ['Parâmetro', 'Valor'],
            ['Setor de Atividade', dados.setor ? this._capitalizarPrimeiraLetra(dados.setor) : ''],
            ['Regime Tributário', this._obterRegimeTributarioFormatado(dados.regime)],
            ['Carga Tributária Atual', formatarPercentual(dados.cargaAtual)],
            ['Alíquota Média ICMS Entrada', formatarPercentual(dados.aliquotaEntrada)],
            ['Alíquota Média ICMS Saída', formatarPercentual(dados.aliquotaSaida)],
            []
        );
        
        // Seção 1.3 - Parâmetros de Simulação
        parametrosData.push(
            ['1.3. Parâmetros de Simulação'],
            ['Parâmetro', 'Valor'],
            ['Ano Inicial', dados.anoInicial || 2026],
            ['Ano Final', dados.anoFinal || 2033],
            []
        );
        
        // Seção 2 - Incentivos Fiscais
        parametrosData.push(
            ['2. INCENTIVOS FISCAIS'],
            []
        );
        
        // Seção 2.1 - Incentivos de Saída
        parametrosData.push(
            ['2.1. Incentivos de Saída'],
            ['Descrição', 'Tipo', 'Percentual', '% Operações']
        );
        
        // Adicionar incentivos de saída (se houver)
        if (configuracao && configuracao.icms_config && configuracao.icms_config.incentivos_saida) {
            configuracao.icms_config.incentivos_saida.forEach(incentivo => {
                parametrosData.push([
                    incentivo.descricao,
                    incentivo.tipo,
                    formatarPercentual(incentivo.percentual * 100),
                    formatarPercentual(incentivo.percentual_operacoes * 100)
                ]);
            });
        } else {
            parametrosData.push(['Nenhum incentivo de saída configurado', '', '', '']);
        }
        
        parametrosData.push([]);
        
        // Seção 2.2 - Incentivos de Entrada
        parametrosData.push(
            ['2.2. Incentivos de Entrada'],
            ['Descrição', 'Tipo', 'Percentual', '% Operações']
        );
        
        // Adicionar incentivos de entrada (se houver)
        if (configuracao && configuracao.icms_config && configuracao.icms_config.incentivos_entrada) {
            configuracao.icms_config.incentivos_entrada.forEach(incentivo => {
                parametrosData.push([
                    incentivo.descricao,
                    incentivo.tipo,
                    formatarPercentual(incentivo.percentual * 100),
                    formatarPercentual(incentivo.percentual_operacoes * 100)
                ]);
            });
        } else {
            parametrosData.push(['Nenhum incentivo de entrada configurado', '', '', '']);
        }
        
        parametrosData.push([]);
        
        // Seção 2.3 - Incentivos de Apuração
        parametrosData.push(
            ['2.3. Incentivos de Apuração'],
            ['Descrição', 'Tipo', 'Percentual', '% do Saldo']
        );
        
        // Adicionar incentivos de apuração (se houver)
        if (configuracao && configuracao.icms_config && configuracao.icms_config.incentivos_apuracao) {
            configuracao.icms_config.incentivos_apuracao.forEach(incentivo => {
                parametrosData.push([
                    incentivo.descricao,
                    incentivo.tipo,
                    formatarPercentual(incentivo.percentual * 100),
                    formatarPercentual(incentivo.percentual_operacoes * 100)
                ]);
            });
        } else {
            parametrosData.push(['Nenhum incentivo de apuração configurado', '', '', '']);
        }
        
        parametrosData.push([]);
        
        // Adicionar rodapé
        parametrosData.push(
            ['© 2025 Expertzy Inteligência Tributária - Relatório gerado pelo Simulador de Split Payment']
        );
        
        // Criar planilha
        const ws = XLSX.utils.aoa_to_sheet(parametrosData);
        
        // Aplicar estilos
        const estilos = [];
        
        // Título principal
        estilos.push({ 
            range: { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
            style: { 
                font: { bold: true, sz: 18, color: { rgb: this.config.colors.primary } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Subtítulo
        estilos.push({ 
            range: { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
            style: { 
                font: { bold: true, sz: 14, color: { rgb: this.config.colors.neutral } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Data do relatório
        estilos.push({ 
            range: { s: { r: 2, c: 0 }, e: { r: 2, c: 0 } },
            style: { 
                font: { bold: true, sz: 11 },
                alignment: { horizontal: "right", vertical: "center" }
            }
        });
        
        // Título Seção 1
        estilos.push({ 
            range: { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } },
            style: { 
                font: { bold: true, sz: 14, color: { rgb: this.config.colors.primary } },
                fill: { fgColor: { rgb: this.config.colors.headerBg } },
                alignment: { horizontal: "left", vertical: "center" },
                border: {
                    bottom: { style: "medium", color: { rgb: this.config.colors.primary } }
                }
            }
        });
        
        // Função para adicionar estilo a títulos de subseções
        const estilizarSubsecao = (row) => {
            estilos.push({ 
                range: { s: { r: row, c: 0 }, e: { r: row, c: 4 } },
                style: { 
                    font: { bold: true, sz: 12, color: { rgb: this.config.colors.primary } },
                    fill: { fgColor: { rgb: this.config.colors.lightBg1 } },
                    border: {
                        bottom: { style: "thin", color: { rgb: this.config.colors.primary } }
                    }
                }
            });
        };
        
        // Função para adicionar estilo a cabeçalhos de tabelas
        const estilizarCabecalhoTabela = (row) => {
            estilos.push({ 
                range: { s: { r: row, c: 0 }, e: { r: row, c: 3 } },
                style: { 
                    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: this.config.colors.primary } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                }
            });
        };
        
        // Aplicar estilos aos títulos de subseções e cabeçalhos de tabelas
        estilizarSubsecao(5);     // 1.1. Dados Financeiros
        estilizarCabecalhoTabela(6);
        
        estilizarSubsecao(14);    // 1.2. Configurações Setoriais
        estilizarCabecalhoTabela(15);
        
        estilizarSubsecao(23);    // 1.3. Parâmetros de Simulação
        estilizarCabecalhoTabela(24);
        
        // Título Seção 2
        estilos.push({ 
            range: { s: { r: 28, c: 0 }, e: { r: 28, c: 4 } },
            style: { 
                font: { bold: true, sz: 14, color: { rgb: this.config.colors.primary } },
                fill: { fgColor: { rgb: this.config.colors.headerBg } },
                alignment: { horizontal: "left", vertical: "center" },
                border: {
                    bottom: { style: "medium", color: { rgb: this.config.colors.primary } }
                }
            }
        });
        
        estilizarSubsecao(30);    // 2.1. Incentivos de Saída
        estilizarCabecalhoTabela(31);
        
        // Calcular posição das seções 2.2 e 2.3 com base no número de incentivos
        let rowOffset = 33;
        
        if (configuracao && configuracao.icms_config && configuracao.icms_config.incentivos_saida) {
            rowOffset += configuracao.icms_config.incentivos_saida.length;
        } else {
            rowOffset += 1; // Linha "Nenhum incentivo configurado"
        }
        
        estilizarSubsecao(rowOffset + 1);    // 2.2. Incentivos de Entrada
        estilizarCabecalhoTabela(rowOffset + 2);
        
        rowOffset += 4; // +3 para o cabeçalho e linha em branco
        
        if (configuracao && configuracao.icms_config && configuracao.icms_config.incentivos_entrada) {
            rowOffset += configuracao.icms_config.incentivos_entrada.length;
        } else {
            rowOffset += 1; // Linha "Nenhum incentivo configurado"
        }
        
        estilizarSubsecao(rowOffset + 1);    // 2.3. Incentivos de Apuração
        estilizarCabecalhoTabela(rowOffset + 2);
        
        // Copyright no final
        rowOffset += 4;
        
        if (configuracao && configuracao.icms_config && configuracao.icms_config.incentivos_apuracao) {
            rowOffset += configuracao.icms_config.incentivos_apuracao.length;
        } else {
            rowOffset += 1; // Linha "Nenhum incentivo configurado"
        }
        
        // Copyright
        const copyrightRow = rowOffset + 2;
        estilos.push({ 
            range: { s: { r: copyrightRow, c: 0 }, e: { r: copyrightRow, c: 4 } },
            style: { 
                font: { italic: true, sz: 9, color: { rgb: this.config.colors.neutral } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Mesclar células para títulos
        const mesclagens = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },   // Título principal
            { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },   // Subtítulo
            { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } },   // 1. DADOS DA EMPRESA
            { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } },   // 1.1. Dados Financeiros
            { s: { r: 14, c: 0 }, e: { r: 14, c: 4 } }, // 1.2. Configurações Setoriais
            { s: { r: 23, c: 0 }, e: { r: 23, c: 4 } }, // 1.3. Parâmetros de Simulação
            { s: { r: 28, c: 0 }, e: { r: 28, c: 4 } }, // 2. INCENTIVOS FISCAIS
            { s: { r: 30, c: 0 }, e: { r: 30, c: 4 } }, // 2.1. Incentivos de Saída
            { s: { r: rowOffset + 1, c: 0 }, e: { r: rowOffset + 1, c: 4 } }, // 2.2. Incentivos de Entrada
            { s: { r: rowOffset + 5, c: 0 }, e: { r: rowOffset + 5, c: 4 } }, // 2.3. Incentivos de Apuração
            { s: { r: copyrightRow, c: 0 }, e: { r: copyrightRow, c: 4 } }    // Copyright
        ];
        
        // Adicionar mesclagens à planilha
        ws['!merges'] = mesclagens;
        
        // Aplicar largura personalizada para colunas
        ws['!cols'] = [
            { wch: 30 },  // Coluna A
            { wch: 25 },  // Coluna B
            { wch: 15 },  // Coluna C
            { wch: 15 },  // Coluna D
            { wch: 15 }   // Coluna E
        ];
        
        // Formatar células com valores monetários
        for (let r = 7; r <= 11; r++) {
            estilos.push({ 
                range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                style: { 
                    numFmt: "#,##0.00"
                }
            });
        }
        
        // Formatar células com valores percentuais
        for (let r = 17; r <= 21; r++) {
            if (r >= 19) { // Apenas carga tributária e alíquotas
                estilos.push({ 
                    range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                    style: { 
                        numFmt: "0.00%"
                    }
                });
            }
        }
        
        // Formatar células de incentivos com valores percentuais
        for (let r = 32; r <= copyrightRow - 2; r++) {
            for (let c = 2; c <= 3; c++) {
                estilos.push({ 
                    range: { s: { r: r, c: c }, e: { r: r, c: c } },
                    style: { 
                        numFmt: "0.00%"
                    }
                });
            }
        }
        
        // Logo (se disponível)
        try {
            if (this.config.logoEnabled) {
                const logoImg = document.querySelector('img.logo');
                if (logoImg) {
                    // Adicionar logo
                    if (typeof this._adicionarLogo === 'function') {
                        this._adicionarLogo(ws, logoImg, { s: { r: 2, c: 1 }, e: { r: 2, c: 4 } });
                    }
                }
            }
        } catch (e) {
            console.warn('Falha ao adicionar logo:', e);
        }
        
        return ws;
    },
    
    /**
     * Cria a planilha de resultados
     * @private
     * @param {Object} resultados - Resultados da simulação
     * @param {Object} aliquotasEquivalentes - Alíquotas equivalentes calculadas
     * @returns {Object} Planilha de resultados
     */
    _criarPlanilhaResultados: function(resultados, aliquotasEquivalentes) {
        // Organizar anos
        const anos = Object.keys(resultados).sort();
        
        // Dados da planilha
        const resultadosData = [
            ['RESULTADOS DA SIMULAÇÃO'],
            ['Expertzy Inteligência Tributária'],
            ['Data do relatório:', this._formatarData(new Date())],
            [],
            ['1. TABELA DE RESULTADOS'],
        ];
        
        // Cabeçalho da tabela
        resultadosData.push(
            ['Ano', 'CBS', 'IBS', 'Subtotal Novo', 'Créditos', 'Imposto Devido', 'Carga Atual', 'Diferença', 'Variação (%)']
        );
        
        // Dados por ano
        anos.forEach(ano => {
            const resultado = resultados[ano];
            const valorAtual = aliquotasEquivalentes[ano].valor_atual;
            const diferenca = resultado.imposto_devido - valorAtual;
            const percentual = valorAtual !== 0 ? diferenca / valorAtual : 0;
            
            resultadosData.push([
                parseInt(ano),
                resultado.cbs,
                resultado.ibs,
                resultado.cbs + resultado.ibs,
                resultado.creditos,
                resultado.imposto_devido,
                valorAtual,
                diferenca,
                percentual
            ]);
        });
        
        resultadosData.push([]);
        
        // Título da seção de análise de resultados
        resultadosData.push(
            ['2. ANÁLISE DOS RESULTADOS'],
        );
        
        // Calcular indicadores
        let variacaoTotal = 0;
        let variacaoMedia = 0;
        let variacaoPercentualMedia = 0;
        let maiorAumento = { valor: 0, ano: '' };
        let maiorReducao = { valor: 0, ano: '' };
        
        anos.forEach(ano => {
            const resultado = resultados[ano];
            const valorAtual = aliquotasEquivalentes[ano].valor_atual;
            const diferenca = resultado.imposto_devido - valorAtual;
            const percentual = valorAtual !== 0 ? diferenca / valorAtual : 0;
            
            // Acumular variação total
            variacaoTotal += diferenca;
            
            // Verificar maior aumento
            if (diferenca > maiorAumento.valor) {
                maiorAumento.valor = diferenca;
                maiorAumento.ano = ano;
            }
            
            // Verificar maior redução (diferença negativa)
            if (diferenca < maiorReducao.valor) {
                maiorReducao.valor = diferenca;
                maiorReducao.ano = ano;
            }
            
            // Acumular variação percentual
            variacaoPercentualMedia += percentual;
        });
        
        // Calcular médias
        variacaoMedia = anos.length > 0 ? variacaoTotal / anos.length : 0;
        variacaoPercentualMedia = anos.length > 0 ? variacaoPercentualMedia / anos.length : 0;
        
        // Adicionar análises
        resultadosData.push(
            ['2.1. Indicadores Agregados'],
            ['Indicador', 'Valor', 'Observação'],
            ['Variação Total Acumulada', variacaoTotal, variacaoTotal > 0 ? 'Aumento da carga tributária' : 'Redução da carga tributária'],
            ['Variação Média Anual', variacaoMedia, ''],
            ['Variação Percentual Média', variacaoPercentualMedia, ''],
            ['Ano de Maior Aumento', `${maiorAumento.ano}`, `R$ ${maiorAumento.valor.toFixed(2)}`],
            ['Ano de Maior Redução', `${maiorReducao.ano}`, `R$ ${maiorReducao.valor.toFixed(2)}`],
            []
        );
        
        // Título da seção de estrutura do imposto
        resultadosData.push(
            ['2.2. Estrutura do Imposto'],
            ['Ano', 'CBS (%)', 'IBS (%)', 'Créditos (%)']
        );
        
        // Dados da estrutura do imposto
        anos.forEach(ano => {
            const resultado = resultados[ano];
            const total = resultado.cbs + resultado.ibs;
            
            if (total > 0) {
                resultadosData.push([
                    parseInt(ano),
                    resultado.cbs / total,
                    resultado.ibs / total,
                    resultado.creditos / total
                ]);
            } else {
                resultadosData.push([
                    parseInt(ano),
                    0,
                    0,
                    0
                ]);
            }
        });
        
        resultadosData.push([]);
        
        // Título da seção de conclusão
        resultadosData.push(
            ['3. CONCLUSÃO'],
        );
        
        // Texto de conclusão
        const conclusao = variacaoTotal > 0 
            ? [
                `A simulação demonstra um aumento médio de ${(variacaoPercentualMedia * 100).toFixed(2)}% na carga tributária durante o período de transição, `,
                `com variação total acumulada de R$ ${variacaoTotal.toFixed(2)}. O impacto mais significativo ocorre no ano ${maiorAumento.ano}, `,
                `com um aumento de R$ ${maiorAumento.valor.toFixed(2)}. Recomenda-se a adoção de estratégias de mitigação para equilibrar o fluxo de caixa.`
              ].join('')
            : [
                `A simulação demonstra uma redução média de ${Math.abs(variacaoPercentualMedia * 100).toFixed(2)}% na carga tributária durante o período de transição, `,
                `com variação total acumulada de R$ ${variacaoTotal.toFixed(2)}. O impacto mais favorável ocorre no ano ${maiorReducao.ano}, `,
                `com uma redução de R$ ${Math.abs(maiorReducao.valor).toFixed(2)}. Esta economia pode ser direcionada para investimentos estratégicos.`
              ].join('');
        
        resultadosData.push(
            [conclusao],
            [],
            ['Para uma análise detalhada das estratégias de mitigação recomendadas, consulte a planilha "Estratégias de Mitigação".'],
            [],
            ['© 2025 Expertzy Inteligência Tributária - Relatório gerado pelo Simulador de Split Payment']
        );
        
        // Criar planilha
        const ws = XLSX.utils.aoa_to_sheet(resultadosData);
        
        // Aplicar estilos
        const estilos = [];
        
        // Título principal
        estilos.push({ 
            range: { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
            style: { 
                font: { bold: true, sz: 18, color: { rgb: this.config.colors.primary } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Subtítulo
        estilos.push({ 
            range: { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
            style: { 
                font: { bold: true, sz: 14, color: { rgb: this.config.colors.neutral } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Aplicar estilos aos títulos de seções
        for (let secao of [4, 6 + anos.length + 1, 6 + anos.length + 10 + anos.length + 1]) {
            estilos.push({ 
                range: { s: { r: secao, c: 0 }, e: { r: secao, c: 8 } },
                style: { 
                    font: { bold: true, sz: 14, color: { rgb: this.config.colors.primary } },
                    fill: { fgColor: { rgb: this.config.colors.headerBg } },
                    alignment: { horizontal: "left", vertical: "center" },
                    border: {
                        bottom: { style: "medium", color: { rgb: this.config.colors.primary } }
                    }
                }
            });
        }
        
        // Cabeçalho da tabela principal
        estilos.push({ 
            range: { s: { r: 5, c: 0 }, e: { r: 5, c: 8 } },
            style: { 
                font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: this.config.colors.primary } },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            }
        });
        
        // Aplicar estilos às linhas de dados
        for (let r = 6; r < 6 + anos.length; r++) {
            // Formatar valores monetários
            for (let c = 1; c <= 7; c++) {
                estilos.push({ 
                    range: { s: { r: r, c: c }, e: { r: r, c: c } },
                    style: { 
                        numFmt: "#,##0.00"
                    }
                });
            }
            
            // Formatar coluna de variação percentual
            estilos.push({ 
                range: { s: { r: r, c: 8 }, e: { r: r, c: 8 } },
                style: { 
                    numFmt: "0.00%"
                }
            });
            
            // Adicionar cores condicionais para diferença e variação
            const index = r - 6;
            const ano = anos[index];
            const resultado = resultados[ano];
            const valorAtual = aliquotasEquivalentes[ano].valor_atual;
            const diferenca = resultado.imposto_devido - valorAtual;
            
            // Cor para diferença
            if (diferenca > 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 7 }, e: { r: r, c: 8 } },
                    style: { 
                        fill: { fgColor: { rgb: "FFCCCC" } } // Vermelho claro
                    }
                });
            } else if (diferenca < 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 7 }, e: { r: r, c: 8 } },
                    style: { 
                        fill: { fgColor: { rgb: "CCFFCC" } } // Verde claro
                    }
                });
            }
            
            // Alternar cores de fundo
            if (r % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 6 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Cabeçalho da seção de indicadores
        const rowIndicadores = 6 + anos.length + 2;
        estilos.push({ 
            range: { s: { r: rowIndicadores, c: 0 }, e: { r: rowIndicadores, c: 8 } },
            style: { 
                font: { bold: true, sz: 12, color: { rgb: this.config.colors.primary } },
                fill: { fgColor: { rgb: this.config.colors.lightBg1 } },
                border: {
                    bottom: { style: "thin", color: { rgb: this.config.colors.primary } }
                }
            }
        });
        
        // Cabeçalho da tabela de indicadores
        estilos.push({ 
            range: { s: { r: rowIndicadores + 1, c: 0 }, e: { r: rowIndicadores + 1, c: 2 } },
            style: { 
                font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: this.config.colors.primary } },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            }
        });
        
        // Formatar valores na tabela de indicadores
        for (let r = rowIndicadores + 2; r <= rowIndicadores + 6; r++) {
            estilos.push({ 
                range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                style: { 
                    numFmt: "#,##0.00"
                }
            });
            
            // Formatar variação percentual média
            if (r === rowIndicadores + 4) {
                estilos.push({ 
                    range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                    style: { 
                        numFmt: "0.00%"
                    }
                });
            }
        }
        
        // Cabeçalho da seção de estrutura
        const rowEstrutura = rowIndicadores + 8;
        estilos.push({ 
            range: { s: { r: rowEstrutura, c: 0 }, e: { r: rowEstrutura, c: 8 } },
            style: { 
                font: { bold: true, sz: 12, color: { rgb: this.config.colors.primary } },
                fill: { fgColor: { rgb: this.config.colors.lightBg1 } },
                border: {
                    bottom: { style: "thin", color: { rgb: this.config.colors.primary } }
                }
            }
        });
        
        // Cabeçalho da tabela de estrutura
        estilos.push({ 
            range: { s: { r: rowEstrutura + 1, c: 0 }, e: { r: rowEstrutura + 1, c: 3 } },
            style: { 
                font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: this.config.colors.primary } },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            }
        });
        
        // Formatar percentuais na tabela de estrutura
        for (let r = rowEstrutura + 2; r < rowEstrutura + 2 + anos.length; r++) {
            for (let c = 1; c <= 3; c++) {
                estilos.push({ 
                    range: { s: { r: r, c: c }, e: { r: r, c: c } },
                    style: { 
                        numFmt: "0.00%"
                    }
                });
            }
        }
        
        // Mesclar células para títulos
        const mesclagens = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },    // Título principal
            { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },    // Subtítulo
            { s: { r: 4, c: 0 }, e: { r: 4, c: 8 } },    // 1. TABELA DE RESULTADOS
            { s: { r: 6 + anos.length + 1, c: 0 }, e: { r: 6 + anos.length + 1, c: 8 } },  // 2. ANÁLISE DOS RESULTADOS
            { s: { r: rowIndicadores, c: 0 }, e: { r: rowIndicadores, c: 8 } },  // 2.1. Indicadores Agregados
            { s: { r: rowEstrutura, c: 0 }, e: { r: rowEstrutura, c: 8 } },  // 2.2. Estrutura do Imposto
            { s: { r: rowEstrutura + 2 + anos.length + 1, c: 0 }, e: { r: rowEstrutura + 2 + anos.length + 1, c: 8 } },  // 3. CONCLUSÃO
            { s: { r: rowEstrutura + 2 + anos.length + 2, c: 0 }, e: { r: rowEstrutura + 2 + anos.length + 2, c: 8 } },  // Texto conclusão
            { s: { r: rowEstrutura + 2 + anos.length + 4, c: 0 }, e: { r: rowEstrutura + 2 + anos.length + 4, c: 8 } },  // Nota estratégias
            { s: { r: rowEstrutura + 2 + anos.length + 6, c: 0 }, e: { r: rowEstrutura + 2 + anos.length + 6, c: 8 } }   // Copyright
        ];
        
        // Adicionar mesclagens à planilha
        ws['!merges'] = mesclagens;
        
        // Aplicar largura personalizada para colunas
        ws['!cols'] = [
            { wch: 15 },  // Coluna A
            { wch: 15 },  // Coluna B
            { wch: 15 },  // Coluna C
            { wch: 15 },  // Coluna D
            { wch: 15 },  // Coluna E
            { wch: 15 },  // Coluna F
            { wch: 15 },  // Coluna G
            { wch: 15 },  // Coluna H
            { wch: 15 }   // Coluna I
        ];
        
        // Logo (se disponível)
        try {
            if (this.config.logoEnabled) {
                const logoImg = document.querySelector('img.logo');
                if (logoImg) {
                    // Adicionar logo
                    if (typeof this._adicionarLogo === 'function') {
                        this._adicionarLogo(ws, logoImg, { s: { r: 2, c: 1 }, e: { r: 2, c: 8 } });
                    }
                }
            }
        } catch (e) {
            console.warn('Falha ao adicionar logo:', e);
        }
        
        return ws;
    },
    
    /**
     * Cria a planilha de análise comparativa
     * @private
     * @param {Object} resultados - Resultados da simulação
     * @param {Object} aliquotasEquivalentes - Alíquotas equivalentes calculadas
     * @returns {Object} Planilha de análise comparativa
     */
    _criarPlanilhaAnaliseComparativa: function(resultados, aliquotasEquivalentes) {
        // Organizar anos
        const anos = Object.keys(resultados).sort();
        
        // Dados da planilha
        const comparativaData = [
            ['ANÁLISE COMPARATIVA - SISTEMA ATUAL VS. SPLIT PAYMENT'],
            ['Expertzy Inteligência Tributária'],
            ['Data do relatório:', this._formatarData(new Date())],
            [],
            ['1. COMPARATIVO DE CARGA TRIBUTÁRIA'],
        ];
        
        // Cabeçalho da tabela
        comparativaData.push(
            ['Ano', 'Sistema Atual', 'Split Payment', 'Diferença', 'Variação (%)', 'Impacto']
        );
        
        // Preencher dados comparativos
        anos.forEach(ano => {
            const resultado = resultados[ano];
            const valorAtual = aliquotasEquivalentes[ano].valor_atual;
            const diferenca = resultado.imposto_devido - valorAtual;
            const percentual = valorAtual !== 0 ? diferenca / valorAtual : 0;
            
            // Determinar impacto
            let impacto = "Neutro";
            if (percentual > 0.05) impacto = "Muito Negativo";
            else if (percentual > 0) impacto = "Negativo";
            else if (percentual < -0.05) impacto = "Muito Positivo";
            else if (percentual < 0) impacto = "Positivo";
            
            comparativaData.push([
                parseInt(ano),
                valorAtual,
                resultado.imposto_devido,
                diferenca,
                percentual,
                impacto
            ]);
        });
        
        comparativaData.push([]);
        
        // Seção de análise de transição
        comparativaData.push(
            ['2. ANÁLISE DE TRANSIÇÃO'],
            ['Ano', 'PIS/COFINS', 'ICMS', 'ISS/IPI', 'Sistema Atual', 'CBS', 'IBS', 'Split Payment', 'Variação Total']
        );
        
        // Preencher dados de transição
        anos.forEach(ano => {
            const resultado = resultados[ano];
            
            // Valores para o sistema atual (valores fictícios para exemplo)
            const pisCofins = resultado.impostos_atuais?.PIS + resultado.impostos_atuais?.COFINS || 0;
            const icms = resultado.impostos_atuais?.ICMS || 0;
            const issIpi = resultado.impostos_atuais?.ISS + resultado.impostos_atuais?.IPI || 0;
            const totalAtual = pisCofins + icms + issIpi;
            
            // Valores para o novo sistema
            const cbs = resultado.cbs;
            const ibs = resultado.ibs;
            const totalNovo = resultado.imposto_devido;
            
            // Variação total
            const variacao = totalNovo - totalAtual;
            
            comparativaData.push([
                parseInt(ano),
                pisCofins,
                icms,
                issIpi,
                totalAtual,
                cbs,
                ibs,
                totalNovo,
                variacao
            ]);
        });
        
        comparativaData.push([]);
        
        // Seção de análise de alíquotas efetivas
        comparativaData.push(
            ['3. ANÁLISE DE ALÍQUOTAS EFETIVAS'],
            ['Ano', 'Alíquota Atual', 'Alíquota CBS+IBS', 'Diferença', 'Aproveitamento de Créditos (%)', 'Alíquota Final']
        );
        
        // Preencher dados de alíquotas efetivas
        anos.forEach(ano => {
            const resultado = resultados[ano];
            const faturamento = resultado.base_tributavel || 1; // Evitar divisão por zero
            
            // Alíquota atual
            const valorAtual = aliquotasEquivalentes[ano].valor_atual;
            const aliquotaAtual = valorAtual / faturamento;
            
            // Alíquota bruta CBS+IBS
            const aliquotaCBSIBS = (resultado.cbs + resultado.ibs) / faturamento;
            
            // Diferença
            const diferenca = aliquotaCBSIBS - aliquotaAtual;
            
            // Aproveitamento de créditos
            const creditos = resultado.creditos;
            const impostosBrutos = resultado.cbs + resultado.ibs;
            const aproveitamentoCreditos = impostosBrutos > 0 ? creditos / impostosBrutos : 0;
            
            // Alíquota final
            const aliquotaFinal = resultado.imposto_devido / faturamento;
            
            comparativaData.push([
                parseInt(ano),
                aliquotaAtual,
                aliquotaCBSIBS,
                diferenca,
                aproveitamentoCreditos,
                aliquotaFinal
            ]);
        });
        
        comparativaData.push([]);
        
        // Tabela de fluxo de caixa (simulação simplificada)
        comparativaData.push(
            ['4. IMPACTO NO FLUXO DE CAIXA'],
            ['Ano', 'Valor Retido', 'Período de Disponibilidade Perdido (dias)', 'Impacto no Capital de Giro', 'Custo Financeiro (6% a.a.)']
        );
        
        // Preencher dados de fluxo de caixa
        anos.forEach(ano => {
            const resultado = resultados[ano];
            const taxaAnual = 0.06; // 6% a.a.
            
            // Valor retido
            const valorRetido = resultado.imposto_devido;
            
            // Período de disponibilidade (em média, 45 dias)
            const diasPerdidos = 45;
            
            // Impacto no capital de giro
            const impactoCapitalGiro = valorRetido * (diasPerdidos / 365);
            
            // Custo financeiro
            const custoFinanceiro = impactoCapitalGiro * taxaAnual;
            
            comparativaData.push([
                parseInt(ano),
                valorRetido,
                diasPerdidos,
                impactoCapitalGiro,
                custoFinanceiro
            ]);
        });
        
        comparativaData.push([]);
        
        // Comentários de análise
        comparativaData.push(
            ['5. ANÁLISE COMPARATIVA CONCLUSIVA'],
        );
        
        // Calcular tendência geral
        let tendenciaGeral = "neutra";
        let variacaoTotal = 0;
        
        anos.forEach(ano => {
            const resultado = resultados[ano];
            const valorAtual = aliquotasEquivalentes[ano].valor_atual;
            variacaoTotal += resultado.imposto_devido - valorAtual;
        });
        
        if (variacaoTotal > 0) {
            tendenciaGeral = "aumento";
        } else if (variacaoTotal < 0) {
            tendenciaGeral = "redução";
        }
        
        // Texto conclusivo baseado na tendência
        let textoAnalise = "";
        
        if (tendenciaGeral === "aumento") {
            textoAnalise = [
                "A análise comparativa revela uma tendência de aumento na carga tributária com a implementação do Split Payment. ",
                "Este aumento pode ser explicado por fatores como menor aproveitamento de créditos tributários ou características específicas do setor. ",
                "Recomenda-se uma revisão detalhada da estrutura de custos e a implementação das estratégias de mitigação sugeridas."
            ].join('');
        } else if (tendenciaGeral === "redução") {
            textoAnalise = [
                "A análise comparativa revela uma tendência de redução na carga tributária com a implementação do Split Payment. ",
                "Esta redução pode ser explicada por maior eficiência no aproveitamento de créditos tributários ou benefícios setoriais específicos. ",
                "Recomenda-se acompanhar a transição e planejar o aproveitamento desta economia tributária em investimentos estratégicos."
            ].join('');
        } else {
            textoAnalise = [
                "A análise comparativa revela um impacto global neutro na carga tributária com a implementação do Split Payment. ",
                "No entanto, observam-se variações significativas entre os anos do período de transição, o que exige atenção específica ",
                "para o planejamento de fluxo de caixa nos períodos de maior impacto."
            ].join('');
        }
        
        comparativaData.push(
            [textoAnalise],
            [],
            ['Fatores Críticos para o Monitoramento:'],
            ['• Percentual efetivo de aproveitamento de créditos tributários'],
            ['• Impacto nas necessidades de capital de giro durante a transição'],
            ['• Eficácia das estratégias de mitigação implementadas'],
            ['• Ajustes na legislação durante o período de implementação'],
            [],
            ['© 2025 Expertzy Inteligência Tributária - Relatório gerado pelo Simulador de Split Payment']
        );
        
        // Criar planilha
        const ws = XLSX.utils.aoa_to_sheet(comparativaData);
        
        // Aplicar estilos
        const estilos = [];
        
        // Título principal
        estilos.push({ 
            range: { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
            style: { 
                font: { bold: true, sz: 18, color: { rgb: this.config.colors.primary } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Subtítulo
        estilos.push({ 
            range: { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
            style: { 
                font: { bold: true, sz: 14, color: { rgb: this.config.colors.neutral } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Títulos de seções
        const secoesRows = [
            4,                                  // 1. COMPARATIVO DE CARGA TRIBUTÁRIA
            6 + anos.length + 1,                // 2. ANÁLISE DE TRANSIÇÃO
            6 + anos.length + 3 + anos.length + 1,  // 3. ANÁLISE DE ALÍQUOTAS EFETIVAS
            6 + anos.length + 3 + anos.length + 3 + anos.length + 1,  // 4. IMPACTO NO FLUXO DE CAIXA
            6 + anos.length + 3 + anos.length + 3 + anos.length + 3 + anos.length + 1  // 5. ANÁLISE COMPARATIVA CONCLUSIVA
        ];
        
        for (const row of secoesRows) {
            estilos.push({ 
                range: { s: { r: row, c: 0 }, e: { r: row, c: 8 } },
                style: { 
                    font: { bold: true, sz: 14, color: { rgb: this.config.colors.primary } },
                    fill: { fgColor: { rgb: this.config.colors.headerBg } },
                    alignment: { horizontal: "left", vertical: "center" },
                    border: {
                        bottom: { style: "medium", color: { rgb: this.config.colors.primary } }
                    }
                }
            });
        }
        
        // Cabeçalhos de tabelas
        const cabecalhosRows = [
            5,                                  // Tabela 1
            6 + anos.length + 2,                // Tabela 2
            6 + anos.length + 3 + anos.length + 2,  // Tabela 3
            6 + anos.length + 3 + anos.length + 3 + anos.length + 2   // Tabela 4
        ];
        
        for (const row of cabecalhosRows) {
            estilos.push({ 
                range: { s: { r: row, c: 0 }, e: { r: row, c: 8 } },
                style: { 
                    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: this.config.colors.primary } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                }
            });
        }
        
        // Formatar células da tabela 1
        for (let r = 6; r < 6 + anos.length; r++) {
            // Formatar células com valores monetários
            for (let c = 1; c <= 3; c++) {
                estilos.push({ 
                    range: { s: { r: r, c: c }, e: { r: r, c: c } },
                    style: { 
                        numFmt: "#,##0.00"
                    }
                });
            }
            
            // Formatar coluna de variação percentual
            estilos.push({ 
                range: { s: { r: r, c: 4 }, e: { r: r, c: 4 } },
                style: { 
                    numFmt: "0.00%"
                }
            });
            
            // Destacar impacto
            const cel = comparativaData[r][5];
            if (cel === "Muito Negativo" || cel === "Negativo") {
                estilos.push({ 
                    range: { s: { r: r, c: 5 }, e: { r: r, c: 5 } },
                    style: { 
                        font: { color: { rgb: "FF0000" } }
                    }
                });
            } else if (cel === "Muito Positivo" || cel === "Positivo") {
                estilos.push({ 
                    range: { s: { r: r, c: 5 }, e: { r: r, c: 5 } },
                    style: { 
                        font: { color: { rgb: "00AA00" } }
                    }
                });
            }
            
            // Alternar cores de fundo
            if (r % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 5 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar células da tabela 2
        const startRowT2 = 6 + anos.length + 3;
        for (let r = startRowT2; r < startRowT2 + anos.length; r++) {
            // Formatar células com valores monetários
            for (let c = 1; c <= 8; c++) {
                estilos.push({ 
                    range: { s: { r: r, c: c }, e: { r: r, c: c } },
                    style: { 
                        numFmt: "#,##0.00"
                    }
                });
            }
            
            // Alternar cores de fundo
            if (r % 2 === 1) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 8 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar células da tabela 3
        const startRowT3 = startRowT2 + anos.length + 3;
        for (let r = startRowT3; r < startRowT3 + anos.length; r++) {
            // Formatar células com valores percentuais
            for (let c = 1; c <= 5; c++) {
                estilos.push({ 
                    range: { s: { r: r, c: c }, e: { r: r, c: c } },
                    style: { 
                        numFmt: "0.00%"
                    }
                });
            }
            
            // Alternar cores de fundo
            if (r % 2 === 1) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 5 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar células da tabela 4
        const startRowT4 = startRowT3 + anos.length + 3;
        for (let r = startRowT4; r < startRowT4 + anos.length; r++) {
            // Formatar células com valores
            estilos.push({ 
                range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                style: { 
                    numFmt: "#,##0.00"
                }
            });
            
            estilos.push({ 
                range: { s: { r: r, c: 2 }, e: { r: r, c: 2 } },
                style: { 
                    numFmt: "0"
                }
            });
            
            estilos.push({ 
                range: { s: { r: r, c: 3 }, e: { r: r, c: 4 } },
                style: { 
                    numFmt: "#,##0.00"
                }
            });
            
            // Alternar cores de fundo
            if (r % 2 === 1) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 4 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Texto de conclusão
        const rowConclusao = startRowT4 + anos.length + 2;
        estilos.push({ 
            range: { s: { r: rowConclusao, c: 0 }, e: { r: rowConclusao, c: 8 } },
            style: { 
                alignment: { wrapText: true },
                font: { sz: 11 }
            }
        });
        
        // Fatores críticos
        for (let r = rowConclusao + 3; r <= rowConclusao + 6; r++) {
            estilos.push({ 
                range: { s: { r: r, c: 0 }, e: { r: r, c: 0 } },
                style: { 
                    font: { bold: true, sz: 11 }
                }
            });
        }
        
        // Copyright
        const rowCopyright = rowConclusao + 8;
        estilos.push({ 
            range: { s: { r: rowCopyright, c: 0 }, e: { r: rowCopyright, c: 8 } },
            style: { 
                font: { italic: true, sz: 9, color: { rgb: this.config.colors.neutral } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Mesclar células para títulos e textos
        const mesclagens = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },    // Título principal
            { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },    // Subtítulo
            { s: { r: 4, c: 0 }, e: { r: 4, c: 8 } },    // 1. COMPARATIVO DE CARGA TRIBUTÁRIA
            { s: { r: 6 + anos.length + 1, c: 0 }, e: { r: 6 + anos.length + 1, c: 8 } },  // 2. ANÁLISE DE TRANSIÇÃO
            { s: { r: startRowT3 - 1, c: 0 }, e: { r: startRowT3 - 1, c: 8 } },  // 3. ANÁLISE DE ALÍQUOTAS EFETIVAS
            { s: { r: startRowT4 - 1, c: 0 }, e: { r: startRowT4 - 1, c: 8 } },  // 4. IMPACTO NO FLUXO DE CAIXA
            { s: { r: rowConclusao - 1, c: 0 }, e: { r: rowConclusao - 1, c: 8 } },  // 5. ANÁLISE COMPARATIVA CONCLUSIVA
            { s: { r: rowConclusao, c: 0 }, e: { r: rowConclusao, c: 8 } },  // Texto de conclusão
            { s: { r: rowCopyright, c: 0 }, e: { r: rowCopyright, c: 8 } }   // Copyright
        ];
        
        // Adicionar mesclagens à planilha
        ws['!merges'] = mesclagens;
        
        // Aplicar largura personalizada para colunas
        ws['!cols'] = [
            { wch: 15 },  // Coluna A
            { wch: 15 },  // Coluna B
            { wch: 15 },  // Coluna C
            { wch: 15 },  // Coluna D
            { wch: 15 },  // Coluna E
            { wch: 20 },  // Coluna F
            { wch: 15 },  // Coluna G
            { wch: 15 },  // Coluna H
            { wch: 15 }   // Coluna I
        ];
        
        // Logo (se disponível)
        try {
            if (this.config.logoEnabled) {
                const logoImg = document.querySelector('img.logo');
                if (logoImg) {
                    // Adicionar logo
                    if (typeof this._adicionarLogo === 'function') {
                        this._adicionarLogo(ws, logoImg, { s: { r: 2, c: 1 }, e: { r: 2, c: 8 } });
                    }
                }
            }
        } catch (e) {
            console.warn('Falha ao adicionar logo:', e);
        }
        
        return ws;
    },
    
    /**
     * Cria a planilha de estratégias de mitigação
     * @private
     * @param {Object} dados - Dados da simulação
     * @param {Object} resultados - Resultados da simulação
     * @returns {Object} Planilha de estratégias de mitigação
     */
    _criarPlanilhaEstrategias: function(dados, resultados) {
        // Organizar anos
        const anos = Object.keys(resultados).sort();
        
        // Dados da planilha
        const estrategiasData = [
            ['ESTRATÉGIAS DE MITIGAÇÃO DO IMPACTO DO SPLIT PAYMENT'],
            ['Expertzy Inteligência Tributária'],
            ['Data do relatório:', this._formatarData(new Date())],
            [],
            ['1. AVALIAÇÃO DO IMPACTO NO FLUXO DE CAIXA']
        ];
        
        // Calcular impacto médio no fluxo de caixa
        let impactoTotalCapitalGiro = 0;
        let mediaImpacto = 0;
        
        // Cabeçalho da tabela
        estrategiasData.push(
            ['Ano', 'Valor Retido', 'Prazo Médio de Recebimento (dias)', 'Prazo de Recolhimento Atual (dias)', 'Dias de Capital de Giro Perdidos', 'Impacto no Capital de Giro']
        );
        
        // Dados por ano
        anos.forEach(ano => {
            const resultado = resultados[ano];
            
            // Calcular valores para cada ano
            const valorRetido = resultado.imposto_devido;
            const prazoMedioRecebimento = 30; // Valor médio estimado
            const prazoRecolhimentoAtual = 45; // Valor médio estimado (recolhimento no mês seguinte)
            const diasCapitalGiroPerdidos = Math.max(0, prazoRecolhimentoAtual - prazoMedioRecebimento);
            const impactoCapitalGiro = valorRetido * (diasCapitalGiroPerdidos / 365);
            
            // Acumular para cálculo da média
            impactoTotalCapitalGiro += impactoCapitalGiro;
            
            estrategiasData.push([
                parseInt(ano),
                valorRetido,
                prazoMedioRecebimento,
                prazoRecolhimentoAtual,
                diasCapitalGiroPerdidos,
                impactoCapitalGiro
            ]);
        });
        
        // Calcular média de impacto
        mediaImpacto = anos.length > 0 ? impactoTotalCapitalGiro / anos.length : 0;
        
        estrategiasData.push(
            ['Média', '', '', '', '', mediaImpacto],
            []
        );
        
        // Seção 2 - Estratégias de Mitigação
        estrategiasData.push(['2. ESTRATÉGIAS DE MITIGAÇÃO']);
        
        // 2.1 - Estratégias Financeiras
        estrategiasData.push(
            ['2.1. Estratégias Financeiras'],
            ['Estratégia', 'Descrição', 'Eficácia Estimada', 'Facilidade de Implementação', 'Recomendação']
        );
        
        // Adicionar as estratégias financeiras
        const estrategiasFinanceiras = [
            [
                'Ajuste de Preços', 
                'Repassar parte do impacto do Split Payment aos preços dos produtos/serviços', 
                'Alta (70-90%)', 
                'Média', 
                'Altamente recomendada para empresas com elasticidade-preço favorável'
            ],
            [
                'Antecipação de Recebíveis', 
                'Antecipar recebimentos para compensar a perda de capital de giro', 
                'Média (40-60%)', 
                'Alta', 
                'Recomendada com análise do custo financeiro'
            ],
            [
                'Captação de Capital de Giro', 
                'Buscar linhas de financiamento específicas para capital de giro', 
                'Alta (60-80%)', 
                'Média', 
                'Recomendada com análise do custo financeiro e condições'
            ],
            [
                'Desconto para Pagamentos à Vista', 
                'Oferecer descontos para aumentar o percentual de recebimentos imediatos', 
                'Média (30-50%)', 
                'Alta', 
                'Recomendada para setores com margens adequadas'
            ]
        ];
        
        // Adicionar estratégias financeiras à planilha
        estrategiasFinanceiras.forEach(estrategia => {
            estrategiasData.push(estrategia);
        });
        
        estrategiasData.push([]);
        
        // 2.2 - Estratégias Operacionais
        estrategiasData.push(
            ['2.2. Estratégias Operacionais'],
            ['Estratégia', 'Descrição', 'Eficácia Estimada', 'Facilidade de Implementação', 'Recomendação']
        );
        
        // Adicionar as estratégias operacionais
        const estrategiasOperacionais = [
            [
                'Renegociação de Prazos com Fornecedores', 
                'Alongar os prazos de pagamento para compensar a redução do ciclo financeiro', 
                'Alta (50-70%)', 
                'Média', 
                'Altamente recomendada para todos os setores'
            ],
            [
                'Ajuste no Mix de Produtos/Serviços', 
                'Priorizar produtos/serviços com melhor margem e ciclo financeiro', 
                'Média (30-50%)', 
                'Baixa', 
                'Recomendada para setores com diversidade de ofertas'
            ],
            [
                'Otimização de Estoques', 
                'Reduzir níveis de estoque para liberar capital de giro', 
                'Média (40-60%)', 
                'Média', 
                'Recomendada para comércio e indústria'
            ],
            [
                'Incentivo a Meios de Pagamento Favoráveis', 
                'Estimular modalidades de pagamento que reduzam o prazo médio de recebimento', 
                'Média (30-50%)', 
                'Alta', 
                'Recomendada para todos os setores'
            ]
        ];
        
        // Adicionar estratégias operacionais à planilha
        estrategiasOperacionais.forEach(estrategia => {
            estrategiasData.push(estrategia);
        });
        
        estrategiasData.push([]);
        
        // 2.3 - Estratégias Tributárias
        estrategiasData.push(
            ['2.3. Estratégias Tributárias'],
            ['Estratégia', 'Descrição', 'Eficácia Estimada', 'Facilidade de Implementação', 'Recomendação']
        );
        
        // Adicionar as estratégias tributárias
        const estrategiasTributarias = [
            [
                'Maximização do Aproveitamento de Créditos', 
                'Revisão completa da cadeia de custos para mapear créditos potenciais', 
                'Alta (50-80%)', 
                'Média', 
                'Altamente recomendada para todos os setores'
            ],
            [
                'Planejamento Tributário', 
                'Revisar a estrutura tributária para otimizar a carga fiscal no novo sistema', 
                'Alta (40-70%)', 
                'Baixa', 
                'Altamente recomendada com acompanhamento especializado'
            ],
            [
                'Aplicação de Incentivos Fiscais', 
                'Mapear e implementar incentivos fiscais setoriais e regionais disponíveis', 
                'Média (30-60%)', 
                'Baixa', 
                'Recomendada conforme setor e localização'
            ]
        ];
        
        // Adicionar estratégias tributárias à planilha
        estrategiasTributarias.forEach(estrategia => {
            estrategiasData.push(estrategia);
        });
        
        estrategiasData.push([]);
        
        // Seção 3 - Plano de Implementação
        estrategiasData.push(
            ['3. PLANO DE IMPLEMENTAÇÃO RECOMENDADO'],
            ['Fase', 'Estratégias', 'Prazo Recomendado', 'Complexidade', 'Resultado Esperado']
        );
        
        // Adicionar fases de implementação
        const fasesImplementacao = [
            [
                'Fase 1: Ações Imediatas', 
                'Ajuste de Preços, Antecipação de Recebíveis, Incentivo a Meios de Pagamento Favoráveis', 
                '1-3 meses', 
                'Baixa-Média', 
                'Mitigação rápida de 30-40% do impacto'
            ],
            [
                'Fase 2: Ações de Médio Prazo', 
                'Renegociação com Fornecedores, Otimização de Estoques, Maximização de Créditos', 
                '3-6 meses', 
                'Média', 
                'Mitigação adicional de 20-30% do impacto'
            ],
            [
                'Fase 3: Ações Estruturais', 
                'Ajuste no Mix de Produtos, Planejamento Tributário, Aplicação de Incentivos Fiscais', 
                '6-12 meses', 
                'Alta', 
                'Mitigação adicional de 10-20% do impacto e preparação para sustentabilidade de longo prazo'
            ]
        ];
        
        // Adicionar fases de implementação à planilha
        fasesImplementacao.forEach(fase => {
            estrategiasData.push(fase);
        });
        
        estrategiasData.push([]);
        
        // Seção 4 - Análise de Custo-Benefício
        estrategiasData.push(
            ['4. ANÁLISE DE CUSTO-BENEFÍCIO'],
            ['Tipo de Estratégia', 'Economia Potencial', 'Custo de Implementação', 'ROI Estimado', 'Prazo de Retorno']
        );
        
        // Adicionar análises de custo-benefício
        const analisesCustoBeneficio = [
            [
                'Estratégias Financeiras', 
                mediaImpacto * 0.7, // 70% do impacto médio
                mediaImpacto * 0.1, // 10% do impacto médio como custo
                '7:1', 
                '1-3 meses'
            ],
            [
                'Estratégias Operacionais', 
                mediaImpacto * 0.5, // 50% do impacto médio
                mediaImpacto * 0.15, // 15% do impacto médio como custo
                '3.3:1', 
                '3-6 meses'
            ],
            [
                'Estratégias Tributárias', 
                mediaImpacto * 0.6, // 60% do impacto médio
                mediaImpacto * 0.2, // 20% do impacto médio como custo
                '3:1', 
                '6-12 meses'
            ],
            [
                'Combinação Ótima de Estratégias', 
                mediaImpacto * 0.9, // 90% do impacto médio
                mediaImpacto * 0.25, // 25% do impacto médio como custo
                '3.6:1', 
                '3-6 meses'
            ]
        ];
        
        // Adicionar análises à planilha
        analisesCustoBeneficio.forEach(analise => {
            estrategiasData.push(analise);
        });
        
        estrategiasData.push([]);
        
        // Conclusão
        const conclusao = [
            ['5. CONCLUSÃO E RECOMENDAÇÕES FINAIS'],
            [
                'A implementação do Split Payment terá um impacto significativo no fluxo de caixa das empresas, com redução média anual de capital de giro de R$ ' + 
                mediaImpacto.toFixed(2) + '. Recomenda-se a adoção imediata de uma combinação de estratégias financeiras, operacionais e tributárias, ' +
                'priorizando aquelas com maior eficácia e facilidade de implementação.'
            ],
            [],
            [
                'Com base na análise realizada, estima-se que a implementação do pacote completo de estratégias recomendadas pode neutralizar até 90% do impacto ' +
                'do Split Payment no fluxo de caixa, com retorno do investimento em implementação em um prazo de 3 a 6 meses.'
            ],
            [],
            [
                'Recomenda-se o monitoramento contínuo do impacto durante o período de transição (2026-2033), ajustando as estratégias conforme necessário ' +
                'e aproveitando oportunidades que possam surgir com a evolução do sistema tributário.'
            ],
            [],
            ['© 2025 Expertzy Inteligência Tributária - Relatório gerado pelo Simulador de Split Payment']
        ];
        
        // Adicionar conclusão à planilha
        conclusao.forEach(linha => {
            estrategiasData.push(linha);
        });
        
        // Criar planilha
        const ws = XLSX.utils.aoa_to_sheet(estrategiasData);
        
        // Aplicar estilos
        const estilos = [];
        
        // Título principal
        estilos.push({ 
            range: { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
            style: { 
                font: { bold: true, sz: 18, color: { rgb: this.config.colors.primary } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Subtítulo
        estilos.push({ 
            range: { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
            style: { 
                font: { bold: true, sz: 14, color: { rgb: this.config.colors.neutral } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Data do relatório
        estilos.push({ 
            range: { s: { r: 2, c: 0 }, e: { r: 2, c: 0 } },
            style: { 
                font: { bold: true, sz: 11 },
                alignment: { horizontal: "right", vertical: "center" }
            }
        });
        
        // Títulos de seções
        const titulosSecoes = [4, 12 + anos.length, 13 + anos.length, 19 + anos.length, 25 + anos.length, 31 + anos.length, 38 + anos.length];
        
        for (const row of titulosSecoes) {
            estilos.push({ 
                range: { s: { r: row, c: 0 }, e: { r: row, c: 5 } },
                style: { 
                    font: { bold: true, sz: 14, color: { rgb: this.config.colors.primary } },
                    fill: { fgColor: { rgb: this.config.colors.headerBg } },
                    alignment: { horizontal: "left", vertical: "center" },
                    border: {
                        bottom: { style: "medium", color: { rgb: this.config.colors.primary } }
                    }
                }
            });
        }
        
        // Título subseções
        const titulosSubsecoes = [13 + anos.length, 19 + anos.length, 25 + anos.length];
        
        for (const row of titulosSubsecoes) {
            estilos.push({ 
                range: { s: { r: row, c: 0 }, e: { r: row, c: 5 } },
                style: { 
                    font: { bold: true, sz: 12, color: { rgb: this.config.colors.primary } },
                    fill: { fgColor: { rgb: this.config.colors.lightBg1 } },
                    border: {
                        bottom: { style: "thin", color: { rgb: this.config.colors.primary } }
                    }
                }
            });
        }
        
        // Cabeçalhos de tabelas
        const cabecalhosTabelas = [5, 14 + anos.length, 20 + anos.length, 26 + anos.length, 32 + anos.length, 39 + anos.length];
        
        for (const row of cabecalhosTabelas) {
            estilos.push({ 
                range: { s: { r: row, c: 0 }, e: { r: row, c: 4 } },
                style: { 
                    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: this.config.colors.primary } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                }
            });
        }
        
        // Formatar células da tabela principal (anos)
        for (let r = 6; r < 6 + anos.length; r++) {
            // Formatar valores monetários
            estilos.push({ 
                range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                style: { 
                    numFmt: "#,##0.00"
                }
            });
            
            estilos.push({ 
                range: { s: { r: r, c: 5 }, e: { r: r, c: 5 } },
                style: { 
                    numFmt: "#,##0.00"
                }
            });
            
            // Formatar colunas de prazos
            for (let c = 2; c <= 4; c++) {
                estilos.push({ 
                    range: { s: { r: r, c: c }, e: { r: r, c: c } },
                    style: { 
                        numFmt: "0"
                    }
                });
            }
            
            // Alternar cores de fundo
            if (r % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 5 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatação da linha de média
        estilos.push({ 
            range: { s: { r: 6 + anos.length, c: 0 }, e: { r: 6 + anos.length, c: 5 } },
            style: { 
                font: { bold: true },
                fill: { fgColor: { rgb: this.config.colors.lightBg1 } },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } }
                }
            }
        });
        
        estilos.push({ 
            range: { s: { r: 6 + anos.length, c: 5 }, e: { r: 6 + anos.length, c: 5 } },
            style: { 
                numFmt: "#,##0.00"
            }
        });
        
        // Formatar células da tabela de estratégias financeiras
        for (let r = 15 + anos.length; r < 15 + anos.length + estrategiasFinanceiras.length; r++) {
            // Alternar cores de fundo
            if ((r - (15 + anos.length)) % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 4 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar células da tabela de estratégias operacionais
        for (let r = 21 + anos.length; r < 21 + anos.length + estrategiasOperacionais.length; r++) {
            // Alternar cores de fundo
            if ((r - (21 + anos.length)) % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 4 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar células da tabela de estratégias tributárias
        for (let r = 27 + anos.length; r < 27 + anos.length + estrategiasTributarias.length; r++) {
            // Alternar cores de fundo
            if ((r - (27 + anos.length)) % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 4 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar células da tabela de fases de implementação
        for (let r = 33 + anos.length; r < 33 + anos.length + fasesImplementacao.length; r++) {
            // Alternar cores de fundo
            if ((r - (33 + anos.length)) % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 4 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar células da tabela de análise de custo-benefício
        for (let r = 40 + anos.length; r < 40 + anos.length + analisesCustoBeneficio.length; r++) {
            // Formatar valores monetários
            for (let c = 1; c <= 2; c++) {
                estilos.push({ 
                    range: { s: { r: r, c: c }, e: { r: r, c: c } },
                    style: { 
                        numFmt: "#,##0.00"
                    }
                });
            }
            
            // Alternar cores de fundo
            if ((r - (40 + anos.length)) % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 4 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar conclusão
        const conclusaoInicio = 40 + anos.length + analisesCustoBeneficio.length + 2;
        
        for (let r = conclusaoInicio + 1; r < conclusaoInicio + 6; r += 2) {
            estilos.push({ 
                range: { s: { r: r, c: 0 }, e: { r: r, c: 4 } },
                style: { 
                    alignment: { wrapText: true }
                }
            });
        }
        
        // Copyright
        const copyrightRow = conclusaoInicio + 6;
        estilos.push({ 
            range: { s: { r: copyrightRow, c: 0 }, e: { r: copyrightRow, c: 4 } },
            style: { 
                font: { italic: true, sz: 9, color: { rgb: this.config.colors.neutral } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Mesclar células para títulos
        const mesclagens = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },    // Título principal
            { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },    // Subtítulo
            { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } },    // 1. AVALIAÇÃO DO IMPACTO NO FLUXO DE CAIXA
            { s: { r: 12 + anos.length, c: 0 }, e: { r: 12 + anos.length, c: 5 } },  // 2. ESTRATÉGIAS DE MITIGAÇÃO
            { s: { r: 13 + anos.length, c: 0 }, e: { r: 13 + anos.length, c: 5 } },  // 2.1. Estratégias Financeiras
            { s: { r: 19 + anos.length, c: 0 }, e: { r: 19 + anos.length, c: 5 } },  // 2.2. Estratégias Operacionais
            { s: { r: 25 + anos.length, c: 0 }, e: { r: 25 + anos.length, c: 5 } },  // 2.3. Estratégias Tributárias
            { s: { r: 31 + anos.length, c: 0 }, e: { r: 31 + anos.length, c: 5 } },  // 3. PLANO DE IMPLEMENTAÇÃO RECOMENDADO
            { s: { r: 38 + anos.length, c: 0 }, e: { r: 38 + anos.length, c: 5 } },  // 4. ANÁLISE DE CUSTO-BENEFÍCIO
            { s: { r: conclusaoInicio, c: 0 }, e: { r: conclusaoInicio, c: 5 } },  // 5. CONCLUSÃO E RECOMENDAÇÕES FINAIS
            
            // Mesclar células das conclusões
            { s: { r: conclusaoInicio + 1, c: 0 }, e: { r: conclusaoInicio + 1, c: 5 } },
            { s: { r: conclusaoInicio + 3, c: 0 }, e: { r: conclusaoInicio + 3, c: 5 } },
            { s: { r: conclusaoInicio + 5, c: 0 }, e: { r: conclusaoInicio + 5, c: 5 } },
            { s: { r: copyrightRow, c: 0 }, e: { r: copyrightRow, c: 5 } }  // Copyright
        ];
        
        // Adicionar mesclagens à planilha
        ws['!merges'] = mesclagens;
        
        // Aplicar largura personalizada para colunas
        ws['!cols'] = [
            { wch: 25 },  // Coluna A
            { wch: 40 },  // Coluna B
            { wch: 20 },  // Coluna C
            { wch: 25 },  // Coluna D
            { wch: 30 },  // Coluna E
            { wch: 20 }   // Coluna F
        ];
        
        // Logo (se disponível)
        try {
            if (this.config.logoEnabled) {
                const logoImg = document.querySelector('img.logo');
                if (logoImg) {
                    // Adicionar logo
                    if (typeof this._adicionarLogo === 'function') {
                        this._adicionarLogo(ws, logoImg, { s: { r: 2, c: 1 }, e: { r: 2, c: 5 } });
                    }
                }
            }
        } catch (e) {
            console.warn('Falha ao adicionar logo:', e);
        }
        
        return ws;
    },
    
    /**
     * Cria a planilha de memória de cálculo
     * @private
     * @param {Function} obterMemoriaCalculo - Função para obter a memória de cálculo
     * @returns {Object} Planilha de memória de cálculo
     */
    _criarPlanilhaMemoriaCalculo: function(obterMemoriaCalculo) {
        // Obter memória de cálculo
        let memoriaTexto = '';
        
        if (typeof obterMemoriaCalculo === 'function') {
            try {
                memoriaTexto = obterMemoriaCalculo() || '';
            } catch (e) {
                console.warn('Erro ao obter memória de cálculo:', e);
                memoriaTexto = 'Erro ao obter memória de cálculo: ' + e.toString();
            }
        } else {
            memoriaTexto = 'Função para obter memória de cálculo não fornecida.';
        }
        
        // Dados da planilha
        const memoriaData = [
            ['MEMÓRIA DE CÁLCULO'],
            ['Expertzy Inteligência Tributária'],
            ['Data do relatório:', this._formatarData(new Date())],
            [],
            ['Relatório detalhado dos cálculos realizados pelo simulador:'],
            []
        ];
        
        // Dividir a memória de cálculo em linhas
        const linhasMemoria = memoriaTexto.split('\n');
        
        // Adicionar as linhas à planilha
        linhasMemoria.forEach(linha => {
            memoriaData.push([linha]);
        });
        
        // Adicionar rodapé
        memoriaData.push(
            [],
            ['© 2025 Expertzy Inteligência Tributária - Relatório gerado pelo Simulador de Split Payment']
        );
        
        // Criar planilha
        const ws = XLSX.utils.aoa_to_sheet(memoriaData);
        
        // Aplicar estilos
        const estilos = [];
        
        // Título principal
        estilos.push({ 
            range: { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
            style: { 
                font: { bold: true, sz: 18, color: { rgb: this.config.colors.primary } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Subtítulo
        estilos.push({ 
            range: { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
            style: { 
                font: { bold: true, sz: 14, color: { rgb: this.config.colors.neutral } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Data do relatório
        estilos.push({ 
            range: { s: { r: 2, c: 0 }, e: { r: 2, c: 0 } },
            style: { 
                font: { bold: true, sz: 11 },
                alignment: { horizontal: "right", vertical: "center" }
            }
        });
        
        // Texto introdutório
        estilos.push({ 
            range: { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } },
            style: { 
                font: { italic: true, sz: 11 },
                alignment: { horizontal: "left", vertical: "center" }
            }
        });
        
        // Memória de cálculo (fonte monospace)
        for (let r = 6; r < 6 + linhasMemoria.length; r++) {
            estilos.push({ 
                range: { s: { r: r, c: 0 }, e: { r: r, c: 0 } },
                style: { 
                    font: { name: 'Courier New', sz: 10 }
                }
            });
        }
        
        // Copyright
        const copyrightRow = 6 + linhasMemoria.length + 1;
        estilos.push({ 
            range: { s: { r: copyrightRow, c: 0 }, e: { r: copyrightRow, c: 3 } },
            style: { 
                font: { italic: true, sz: 9, color: { rgb: this.config.colors.neutral } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Mesclar células para títulos
        const mesclagens = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },  // Título principal
            { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },  // Subtítulo
            { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } },  // Texto introdutório
            { s: { r: copyrightRow, c: 0 }, e: { r: copyrightRow, c: 3 } }  // Copyright
        ];
        
        // Adicionar mesclagens à planilha
        ws['!merges'] = mesclagens;
        
        // Aplicar largura personalizada para colunas
        ws['!cols'] = [
            { wch: 120 },  // Coluna A (bem larga para acomodar a memória de cálculo)
            { wch: 15 },   // Coluna B
            { wch: 15 },   // Coluna C
            { wch: 15 }    // Coluna D
        ];
        
        // Logo (se disponível)
        try {
            if (this.config.logoEnabled) {
                const logoImg = document.querySelector('img.logo');
                if (logoImg) {
                    // Adicionar logo
                    if (typeof this._adicionarLogo === 'function') {
                        this._adicionarLogo(ws, logoImg, { s: { r: 2, c: 1 }, e: { r: 2, c: 3 } });
                    }
                }
            }
        } catch (e) {
            console.warn('Falha ao adicionar logo:', e);
        }
        
        return ws;
    },
    
    /**
     * Cria a planilha de dashboard
     * @private
     * @param {Object} resultados - Resultados da simulação
     * @param {Object} aliquotasEquivalentes - Alíquotas equivalentes calculadas
     * @returns {Object} Planilha de dashboard
     */
    _criarPlanilhaDashboard: function(resultados, aliquotasEquivalentes) {
        // Organizar anos
        const anos = Object.keys(resultados).sort();
        
        // Dados da planilha
        const dashboardData = [
            ['DASHBOARD - SPLIT PAYMENT'],
            ['Expertzy Inteligência Tributária'],
            ['Data do relatório:', this._formatarData(new Date())],
            [],
            ['1. INDICADORES-CHAVE DE DESEMPENHO (KPIs)']
        ];
        
        // Calcular KPIs
        let variacaoTotal = 0;
        let variacaoPercentualMedia = 0;
        let mediaCreditos = 0;
        
        // Calcular valores
        anos.forEach(ano => {
            const resultado = resultados[ano];
            const valorAtual = aliquotasEquivalentes[ano].valor_atual;
            const diferenca = resultado.imposto_devido - valorAtual;
            const percentual = valorAtual !== 0 ? diferenca / valorAtual : 0;
            
            // Acumular para médias
            variacaoTotal += diferenca;
            variacaoPercentualMedia += percentual;
            mediaCreditos += resultado.creditos;
        });
        
        // Calcular médias
        const numAnos = anos.length;
        variacaoPercentualMedia = numAnos > 0 ? variacaoPercentualMedia / numAnos : 0;
        mediaCreditos = numAnos > 0 ? mediaCreditos / numAnos : 0;
        
        // Adicionar KPIs
        dashboardData.push(
            ['KPI', 'Valor', 'Status', 'Variação'],
            ['Variação Total de Carga Tributária', variacaoTotal, variacaoTotal > 0 ? 'NEGATIVO' : 'POSITIVO', '-'],
            ['Variação Percentual Média', variacaoPercentualMedia, variacaoPercentualMedia > 0 ? 'NEGATIVO' : 'POSITIVO', '-'],
            ['Aproveitamento Médio de Créditos', mediaCreditos, mediaCreditos > 0 ? 'POSITIVO' : 'NEUTRO', '-'],
            ['Implementação de Estratégias de Mitigação', '0%', 'PENDENTE', '-'],
            [],
            ['2. EVOLUÇÃO ANUAL DE INDICADORES']
        );
        
        // Cabeçalho da tabela de evolução
        dashboardData.push(['Ano', 'Sistema Atual', 'Split Payment', 'Diferença', 'Variação (%)', 'Créditos', 'Eficácia Mitigação (%)']);
        
        // Adicionar dados para cada ano
        anos.forEach(ano => {
            const resultado = resultados[ano];
            const valorAtual = aliquotasEquivalentes[ano].valor_atual;
            const diferenca = resultado.imposto_devido - valorAtual;
            const percentual = valorAtual !== 0 ? diferenca / valorAtual : 0;
            
            // Eficácia de mitigação (valor simulado - dependerá das estratégias adotadas)
            const eficaciaMitigacao = 0;
            
            dashboardData.push([
                parseInt(ano),
                valorAtual,
                resultado.imposto_devido,
                diferenca,
                percentual,
                resultado.creditos,
                eficaciaMitigacao
            ]);
        });
        
        dashboardData.push([]);
        
        // Seção 3 - Matriz de Impacto
        dashboardData.push(
            ['3. MATRIZ DE IMPACTO'],
            ['Categoria', 'Impacto Baixo', 'Impacto Médio', 'Impacto Alto', 'Impacto Crítico']
        );
        
        // Adicionar categorias de impacto
        const categoriasImpacto = [
            ['Fluxo de Caixa', 'Variação < 5%', 'Variação 5-15%', 'Variação 15-30%', 'Variação > 30%'],
            ['Capital de Giro', 'Redução < 5%', 'Redução 5-15%', 'Redução 15-30%', 'Redução > 30%'],
            ['Margens', 'Redução < 2%', 'Redução 2-5%', 'Redução 5-10%', 'Redução > 10%'],
            ['Ciclo Financeiro', 'Aumento < 5 dias', 'Aumento 5-15 dias', 'Aumento 15-30 dias', 'Aumento > 30 dias']
        ];
        
        // Adicionar categorias à planilha
        categoriasImpacto.forEach(categoria => {
            dashboardData.push(categoria);
        });
        
        dashboardData.push([]);
        
        // Seção 4 - Análise de Sensibilidade
        dashboardData.push(
            ['4. ANÁLISE DE SENSIBILIDADE'],
            ['Variável', '-30%', '-15%', 'Base', '+15%', '+30%']
        );
        
        // Valores base para análise de sensibilidade
        const valorBaseCarga = Math.abs(variacaoTotal);
        const valorBaseCreditos = mediaCreditos;
        
        // Adicionar análises de sensibilidade
        const analisesSensibilidade = [
            [
                'Carga Tributária',
                valorBaseCarga * 0.7,
                valorBaseCarga * 0.85,
                valorBaseCarga,
                valorBaseCarga * 1.15,
                valorBaseCarga * 1.3
            ],
            [
                'Aproveitamento de Créditos',
                valorBaseCreditos * 0.7,
                valorBaseCreditos * 0.85,
                valorBaseCreditos,
                valorBaseCreditos * 1.15,
                valorBaseCreditos * 1.3
            ],
            [
                'Ciclo Financeiro (dias)',
                28,
                34,
                40,
                46,
                52
            ]
        ];
        
        // Adicionar análises à planilha
        analisesSensibilidade.forEach(analise => {
            dashboardData.push(analise);
        });
        
        dashboardData.push([]);
        
        // Seção 5 - Recomendações Prioritárias
        dashboardData.push(
            ['5. RECOMENDAÇÕES PRIORITÁRIAS'],
            ['Categoria', 'Ação', 'Prioridade', 'Impacto Esperado', 'Prazo']
        );
        
        // Adicionar recomendações
        const recomendacoes = [
            ['Financeira', 'Implementar programa de ajuste de preços', 'ALTA', 'Mitigação de 40-60% do impacto', 'Imediato'],
            ['Operacional', 'Renegociar prazos com fornecedores', 'ALTA', 'Mitigação de 20-30% do impacto', '1-3 meses'],
            ['Tributária', 'Revisar estrutura de aproveitamento de créditos', 'MÉDIA', 'Mitigação de 10-20% do impacto', '3-6 meses'],
            ['Financeira', 'Estruturar linha de capital de giro', 'MÉDIA', 'Cobertura para transição', '1-3 meses'],
            ['Estratégica', 'Revisar estrutura de recebimentos e pagamentos', 'ALTA', 'Redução do ciclo financeiro', '3-6 meses']
        ];
        
        // Adicionar recomendações à planilha
        recomendacoes.forEach(recomendacao => {
            dashboardData.push(recomendacao);
        });
        
        dashboardData.push(
            [],
            ['© 2025 Expertzy Inteligência Tributária - Relatório gerado pelo Simulador de Split Payment']
        );
        
        // Criar planilha
        const ws = XLSX.utils.aoa_to_sheet(dashboardData);
        
        // Aplicar estilos
        const estilos = [];
        
        // Título principal
        estilos.push({ 
            range: { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
            style: { 
                font: { bold: true, sz: 18, color: { rgb: this.config.colors.primary } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Subtítulo
        estilos.push({ 
            range: { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
            style: { 
                font: { bold: true, sz: 14, color: { rgb: this.config.colors.neutral } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Data do relatório
        estilos.push({ 
            range: { s: { r: 2, c: 0 }, e: { r: 2, c: 0 } },
            style: { 
                font: { bold: true, sz: 11 },
                alignment: { horizontal: "right", vertical: "center" }
            }
        });
        
        // Títulos de seções
        const titulosSecoes = [4, 11, 13 + anos.length, 20 + anos.length, 26 + anos.length];
        
        for (const row of titulosSecoes) {
            estilos.push({ 
                range: { s: { r: row, c: 0 }, e: { r: row, c: 6 } },
                style: { 
                    font: { bold: true, sz: 14, color: { rgb: this.config.colors.primary } },
                    fill: { fgColor: { rgb: this.config.colors.headerBg } },
                    alignment: { horizontal: "left", vertical: "center" },
                    border: {
                        bottom: { style: "medium", color: { rgb: this.config.colors.primary } }
                    }
                }
            });
        }
        
        // Cabeçalhos de tabelas
        const cabecalhosTabelas = [5, 12, 14 + anos.length, 21 + anos.length, 27 + anos.length];
        
        for (const row of cabecalhosTabelas) {
            const numCols = row === 5 ? 3 : row === 12 ? 6 : row === 14 + anos.length ? 4 : row === 21 + anos.length ? 5 : 4;
            
            estilos.push({ 
                range: { s: { r: row, c: 0 }, e: { r: row, c: numCols } },
                style: { 
                    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: this.config.colors.primary } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                }
            });
        }
        
        // Formatar KPIs
        for (let r = 6; r <= 9; r++) {
            // Status colorido
            const statusCell = dashboardData[r][2];
            if (statusCell === 'POSITIVO') {
                estilos.push({ 
                    range: { s: { r: r, c: 2 }, e: { r: r, c: 2 } },
                    style: { 
                        font: { color: { rgb: "009900" }, bold: true }
                    }
                });
            } else if (statusCell === 'NEGATIVO') {
                estilos.push({ 
                    range: { s: { r: r, c: 2 }, e: { r: r, c: 2 } },
                    style: { 
                        font: { color: { rgb: "CC0000" }, bold: true }
                    }
                });
            } else if (statusCell === 'NEUTRO') {
                estilos.push({ 
                    range: { s: { r: r, c: 2 }, e: { r: r, c: 2 } },
                    style: { 
                        font: { color: { rgb: "666666" }, bold: true }
                    }
                });
            } else if (statusCell === 'PENDENTE') {
                estilos.push({ 
                    range: { s: { r: r, c: 2 }, e: { r: r, c: 2 } },
                    style: { 
                        font: { color: { rgb: "FF9900" }, bold: true }
                    }
                });
            }
            
            // Formatação de valores
            if (r === 6) {
                // Variação Total
                estilos.push({ 
                    range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                    style: { 
                        numFmt: "#,##0.00"
                    }
                });
            } else if (r === 7) {
                // Variação Percentual
                estilos.push({ 
                    range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                    style: { 
                        numFmt: "0.00%"
                    }
                });
            } else if (r === 8) {
                // Aproveitamento Créditos
                estilos.push({ 
                    range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                    style: { 
                        numFmt: "#,##0.00"
                    }
                });
            } else if (r === 9) {
                // Implementação Estratégias
                estilos.push({ 
                    range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                    style: { 
                        numFmt: "0%"
                    }
                });
            }
            
            // Alternar cores de fundo
            if (r % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 3 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar tabela de evolução anual
        for (let r = 13; r < 13 + anos.length; r++) {
            // Formatar valores monetários
            for (let c = 1; c <= 3; c++) {
                estilos.push({ 
                    range: { s: { r: r, c: c }, e: { r: r, c: c } },
                    style: { 
                        numFmt: "#,##0.00"
                    }
                });
            }
            
            // Formatar percentuais
            estilos.push({ 
                range: { s: { r: r, c: 4 }, e: { r: r, c: 4 } },
                style: { 
                    numFmt: "0.00%"
                }
            });
            
            estilos.push({ 
                range: { s: { r: r, c: 6 }, e: { r: r, c: 6 } },
                style: { 
                    numFmt: "0.00%"
                }
            });
            
            // Formatar créditos
            estilos.push({ 
                range: { s: { r: r, c: 5 }, e: { r: r, c: 5 } },
                style: { 
                    numFmt: "#,##0.00"
                }
            });
            
            // Alternar cores de fundo
            if ((r - 13) % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 6 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar matriz de impacto
        for (let r = 15 + anos.length; r < 15 + anos.length + categoriasImpacto.length; r++) {
            // Colorir impactos
            estilos.push({ 
                range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                style: { 
                    fill: { fgColor: { rgb: "66CC66" } }, // Verde
                    font: { bold: true }
                }
            });
            
            estilos.push({ 
                range: { s: { r: r, c: 2 }, e: { r: r, c: 2 } },
                style: { 
                    fill: { fgColor: { rgb: "FFCC66" } }, // Amarelo
                    font: { bold: true }
                }
            });
            
            estilos.push({ 
                range: { s: { r: r, c: 3 }, e: { r: r, c: 3 } },
                style: { 
                    fill: { fgColor: { rgb: "FF9966" } }, // Laranja
                    font: { bold: true }
                }
            });
            
            estilos.push({ 
                range: { s: { r: r, c: 4 }, e: { r: r, c: 4 } },
                style: { 
                    fill: { fgColor: { rgb: "FF6666" } }, // Vermelho
                    font: { bold: true }
                }
            });
            
            // Destacar categoria
            estilos.push({ 
                range: { s: { r: r, c: 0 }, e: { r: r, c: 0 } },
                style: { 
                    font: { bold: true },
                    fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                }
            });
        }
        
        // Formatar análise de sensibilidade
        for (let r = 22 + anos.length; r < 22 + anos.length + analisesSensibilidade.length; r++) {
            // Formatar valores monetários para as duas primeiras linhas
            if (r < 24 + anos.length) {
                for (let c = 1; c <= 5; c++) {
                    estilos.push({ 
                        range: { s: { r: r, c: c }, e: { r: r, c: c } },
                        style: { 
                            numFmt: "#,##0.00"
                        }
                    });
                }
            }
            
            // Destacar categoria
            estilos.push({ 
                range: { s: { r: r, c: 0 }, e: { r: r, c: 0 } },
                style: { 
                    font: { bold: true },
                    fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                }
            });
            
            // Destacar valor base
            estilos.push({ 
                range: { s: { r: r, c: 3 }, e: { r: r, c: 3 } },
                style: { 
                    font: { bold: true },
                    fill: { fgColor: { rgb: "DDDDDD" } }
                }
            });
        }
        
        // Formatar recomendações prioritárias
        for (let r = 28 + anos.length; r < 28 + anos.length + recomendacoes.length; r++) {
            // Colorir prioridades
            const prioridade = dashboardData[r][2];
            if (prioridade === 'ALTA') {
                estilos.push({ 
                    range: { s: { r: r, c: 2 }, e: { r: r, c: 2 } },
                    style: { 
                        font: { color: { rgb: "CC0000" }, bold: true }
                    }
                });
            } else if (prioridade === 'MÉDIA') {
                estilos.push({ 
                    range: { s: { r: r, c: 2 }, e: { r: r, c: 2 } },
                    style: { 
                        font: { color: { rgb: "FF9900" }, bold: true }
                    }
                });
            } else if (prioridade === 'BAIXA') {
                estilos.push({ 
                    range: { s: { r: r, c: 2 }, e: { r: r, c: 2 } },
                    style: { 
                        font: { color: { rgb: "009900" }, bold: true }
                    }
                });
            }
            
            // Alternar cores de fundo
            if ((r - (28 + anos.length)) % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 4 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Copyright
        const copyrightRow = 28 + anos.length + recomendacoes.length + 2;
        estilos.push({ 
            range: { s: { r: copyrightRow, c: 0 }, e: { r: copyrightRow, c: 6 } },
            style: { 
                font: { italic: true, sz: 9, color: { rgb: this.config.colors.neutral } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Mesclar células para títulos
        const mesclagens = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },    // Título principal
            { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },    // Subtítulo
            { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } },    // 1. INDICADORES-CHAVE DE DESEMPENHO (KPIs)
            { s: { r: 11, c: 0 }, e: { r: 11, c: 6 } },  // 2. EVOLUÇÃO ANUAL DE INDICADORES
            { s: { r: 13 + anos.length, c: 0 }, e: { r: 13 + anos.length, c: 6 } },  // 3. MATRIZ DE IMPACTO
            { s: { r: 20 + anos.length, c: 0 }, e: { r: 20 + anos.length, c: 6 } },  // 4. ANÁLISE DE SENSIBILIDADE
            { s: { r: 26 + anos.length, c: 0 }, e: { r: 26 + anos.length, c: 6 } },  // 5. RECOMENDAÇÕES PRIORITÁRIAS
            { s: { r: copyrightRow, c: 0 }, e: { r: copyrightRow, c: 6 } }  // Copyright
        ];
        
        // Adicionar mesclagens à planilha
        ws['!merges'] = mesclagens;
        
        // Aplicar largura personalizada para colunas
        ws['!cols'] = [
            { wch: 25 },  // Coluna A
            { wch: 25 },  // Coluna B
            { wch: 15 },  // Coluna C
            { wch: 25 },  // Coluna D
            { wch: 15 },  // Coluna E
            { wch: 15 },  // Coluna F
            { wch: 15 }   // Coluna G
        ];
        
        // Logo (se disponível)
        try {
            if (this.config.logoEnabled) {
                const logoImg = document.querySelector('img.logo');
                if (logoImg) {
                    // Adicionar logo
                    if (typeof this._adicionarLogo === 'function') {
                        this._adicionarLogo(ws, logoImg, { s: { r: 2, c: 1 }, e: { r: 2, c: 6 } });
                    }
                }
            }
        } catch (e) {
            console.warn('Falha ao adicionar logo:', e);
        }
        
        return ws;
    },
    
    /**
     * Cria a planilha de alíquotas
     * @private
     * @param {Object} configuracao - Configuração do simulador
     * @returns {Object} Planilha de alíquotas
     */
    _criarPlanilhaAliquotas: function(configuracao) {
        // Dados da planilha
        const aliquotasData = [
            ['ALÍQUOTAS E CONFIGURAÇÕES TRIBUTÁRIAS'],
            ['Expertzy Inteligência Tributária'],
            ['Data do relatório:', this._formatarData(new Date())],
            [],
            ['1. ALÍQUOTAS BASE DO IVA DUAL']
        ];
        
        // Adicionar alíquotas base
        aliquotasData.push(
            ['Imposto', 'Alíquota', 'Observações'],
            ['CBS (Federal)', configuracao.aliquotas_base.CBS, 'Contribuição sobre Bens e Serviços (Federal)'],
            ['IBS (Estadual/Municipal)', configuracao.aliquotas_base.IBS, 'Imposto sobre Bens e Serviços (Estadual e Municipal)'],
            ['Total', configuracao.aliquotas_base.CBS + configuracao.aliquotas_base.IBS, 'Alíquota total do IVA Dual'],
            []
        );
        
        // Seção 2 - Alíquotas Setoriais
        aliquotasData.push(
            ['2. ALÍQUOTAS SETORIAIS'],
            ['Setor', 'IBS', 'Redução CBS', 'CBS Efetivo', 'Alíquota Total']
        );
        
        // Adicionar dados setoriais
        for (const [setor, valores] of Object.entries(configuracao.setores_especiais)) {
            const cbsEfetivo = configuracao.aliquotas_base.CBS * (1 - valores.reducao_CBS);
            const total = valores.IBS + cbsEfetivo;
            
            aliquotasData.push([
                this._capitalizarPrimeiraLetra(setor),
                valores.IBS,
                valores.reducao_CBS,
                cbsEfetivo,
                total
            ]);
        }
        
        aliquotasData.push([]);
        
        // Seção 3 - Regras de Crédito
        aliquotasData.push(
            ['3. REGRAS DE APROVEITAMENTO DE CRÉDITOS'],
            ['Tipo de Operação', 'Percentual de Aproveitamento', 'Observações']
        );
        
        // Adicionar regras de crédito
        const regrasCredito = [
            ['Operações Normais', configuracao.regras_credito.normal, 'Crédito integral para operações regulares'],
            ['Fornecedores do Simples Nacional', configuracao.regras_credito.simples, 'Limitado a 20% do valor da compra'],
            ['Produtores Rurais (CBS)', configuracao.regras_credito.rural, 'Limitado a 60% para a CBS, integral para IBS'],
            ['Importações (CBS)', configuracao.regras_credito.importacoes.CBS, 'Limitado a 50% para CBS'],
            ['Importações (IBS)', configuracao.regras_credito.importacoes.IBS, 'Crédito integral para IBS']
        ];
        
        regrasCredito.forEach(regra => {
            aliquotasData.push(regra);
        });
        
        aliquotasData.push([]);
        
        // Seção 4 - Produtos com Alíquota Zero
        aliquotasData.push(
            ['4. PRODUTOS COM ALÍQUOTA ZERO'],
            ['Produto', 'Fundamentação Legal']
        );
        
        // Adicionar produtos com alíquota zero
        configuracao.produtos_aliquota_zero.forEach(produto => {
            aliquotasData.push([produto, 'Anexos I e XV - LC 214/2025']);
        });
        
        aliquotasData.push([]);
        
        // Seção 5 - Outras Configurações
        aliquotasData.push(
            ['5. OUTRAS CONFIGURAÇÕES TRIBUTÁRIAS'],
            ['Parâmetro', 'Valor', 'Observações']
        );
        
        // Adicionar outras configurações
        const outrasConfiguracoes = [
            ['Limite Simples Nacional', configuracao.limite_simples, 'Limite anual de faturamento para enquadramento no Simples'],
            ['Prazo de Recolhimento Atual', 45, 'Prazo médio estimado para recolhimento no sistema atual (dias)'],
            ['Prazo de Recolhimento Split Payment', 0, 'Recolhimento instantâneo no sistema de Split Payment']
        ];
        
        outrasConfiguracoes.forEach(config => {
            aliquotasData.push(config);
        });
        
        aliquotasData.push(
            [],
            ['© 2025 Expertzy Inteligência Tributária - Relatório gerado pelo Simulador de Split Payment']
        );
        
        // Criar planilha
        const ws = XLSX.utils.aoa_to_sheet(aliquotasData);
        
        // Aplicar estilos
        const estilos = [];
        
        // Título principal
        estilos.push({ 
            range: { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
            style: { 
                font: { bold: true, sz: 18, color: { rgb: this.config.colors.primary } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Subtítulo
        estilos.push({ 
            range: { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
            style: { 
                font: { bold: true, sz: 14, color: { rgb: this.config.colors.neutral } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Data do relatório
        estilos.push({ 
            range: { s: { r: 2, c: 0 }, e: { r: 2, c: 0 } },
            style: { 
                font: { bold: true, sz: 11 },
                alignment: { horizontal: "right", vertical: "center" }
            }
        });
        
        // Títulos de seções
        const titulosSecoes = [4, 10, 19 + Object.keys(configuracao.setores_especiais).length, 28 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length, 31 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length + configuracao.produtos_aliquota_zero.length];
        
        for (const row of titulosSecoes) {
            estilos.push({ 
                range: { s: { r: row, c: 0 }, e: { r: row, c: 4 } },
                style: { 
                    font: { bold: true, sz: 14, color: { rgb: this.config.colors.primary } },
                    fill: { fgColor: { rgb: this.config.colors.headerBg } },
                    alignment: { horizontal: "left", vertical: "center" },
                    border: {
                        bottom: { style: "medium", color: { rgb: this.config.colors.primary } }
                    }
                }
            });
        }
        
        // Cabeçalhos de tabelas
        const cabecalhosTabelas = [5, 11, 20 + Object.keys(configuracao.setores_especiais).length, 29 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length, 32 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length + configuracao.produtos_aliquota_zero.length];
        
        for (const row of cabecalhosTabelas) {
            const numCols = row === 5 ? 2 : row === 11 ? 4 : row === 29 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length ? 1 : 2;
            
            estilos.push({ 
                range: { s: { r: row, c: 0 }, e: { r: row, c: numCols } },
                style: { 
                    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: this.config.colors.primary } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                }
            });
        }
        
        // Formatar alíquotas base
        for (let r = 6; r <= 8; r++) {
            // Formatar percentuais
            estilos.push({ 
                range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                style: { 
                    numFmt: "0.00%"
                }
            });
            
            // Alternar cores de fundo
            if (r % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 2 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar alíquotas setoriais
        for (let r = 12; r < 12 + Object.keys(configuracao.setores_especiais).length; r++) {
            // Formatar percentuais
            for (let c = 1; c <= 4; c++) {
                estilos.push({ 
                    range: { s: { r: r, c: c }, e: { r: r, c: c } },
                    style: { 
                        numFmt: "0.00%"
                    }
                });
            }
            
            // Alternar cores de fundo
            if ((r - 12) % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 4 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar regras de crédito
        for (let r = 21 + Object.keys(configuracao.setores_especiais).length; r < 21 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length; r++) {
            // Formatar percentuais
            estilos.push({ 
                range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                style: { 
                    numFmt: "0.00%"
                }
            });
            
            // Alternar cores de fundo
            if ((r - (21 + Object.keys(configuracao.setores_especiais).length)) % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 2 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar produtos com alíquota zero
        for (let r = 30 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length; r < 30 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length + configuracao.produtos_aliquota_zero.length; r++) {
            // Alternar cores de fundo
            if ((r - (30 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length)) % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 1 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar outras configurações
        for (let r = 33 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length + configuracao.produtos_aliquota_zero.length; r < 33 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length + configuracao.produtos_aliquota_zero.length + outrasConfiguracoes.length; r++) {
            // Formatar valores
            if (r === 33 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length + configuracao.produtos_aliquota_zero.length) {
                // Limite Simples Nacional (valor monetário)
                estilos.push({ 
                    range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                    style: { 
                        numFmt: "#,##0.00"
                    }
                });
            } else {
                // Prazos (valores inteiros)
                estilos.push({ 
                    range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                    style: { 
                        numFmt: "0"
                    }
                });
            }
            
            // Alternar cores de fundo
            if ((r - (33 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length + configuracao.produtos_aliquota_zero.length)) % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 2 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Copyright
        const copyrightRow = 35 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length + configuracao.produtos_aliquota_zero.length + outrasConfiguracoes.length;
        estilos.push({ 
            range: { s: { r: copyrightRow, c: 0 }, e: { r: copyrightRow, c: 4 } },
            style: { 
                font: { italic: true, sz: 9, color: { rgb: this.config.colors.neutral } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Mesclar células para títulos
        const mesclagens = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },    // Título principal
            { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },    // Subtítulo
            { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } },    // 1. ALÍQUOTAS BASE DO IVA DUAL
            { s: { r: 10, c: 0 }, e: { r: 10, c: 4 } },  // 2. ALÍQUOTAS SETORIAIS
            { s: { r: 19 + Object.keys(configuracao.setores_especiais).length, c: 0 }, e: { r: 19 + Object.keys(configuracao.setores_especiais).length, c: 4 } },  // 3. REGRAS DE APROVEITAMENTO DE CRÉDITOS
            { s: { r: 28 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length, c: 0 }, e: { r: 28 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length, c: 4 } },  // 4. PRODUTOS COM ALÍQUOTA ZERO
            { s: { r: 31 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length + configuracao.produtos_aliquota_zero.length, c: 0 }, e: { r: 31 + Object.keys(configuracao.setores_especiais).length + regrasCredito.length + configuracao.produtos_aliquota_zero.length, c: 4 } },  // 5. OUTRAS CONFIGURAÇÕES TRIBUTÁRIAS
            { s: { r: copyrightRow, c: 0 }, e: { r: copyrightRow, c: 4 } }  // Copyright
        ];
        
        // Adicionar mesclagens à planilha
        ws['!merges'] = mesclagens;
        
        // Aplicar largura personalizada para colunas
        ws['!cols'] = [
            { wch: 30 },  // Coluna A
            { wch: 25 },  // Coluna B
            { wch: 25 },  // Coluna C
            { wch: 25 },  // Coluna D
            { wch: 25 }   // Coluna E
        ];
        
        // Logo (se disponível)
        try {
            if (this.config.logoEnabled) {
                const logoImg = document.querySelector('img.logo');
                if (logoImg) {
                    // Adicionar logo
                    if (typeof this._adicionarLogo === 'function') {
                        this._adicionarLogo(ws, logoImg, { s: { r: 2, c: 1 }, e: { r: 2, c: 4 } });
                    }
                }
            }
        } catch (e) {
            console.warn('Falha ao adicionar logo:', e);
        }
        
        return ws;
    },
    
    /**
     * Cria a planilha de fases de transição
     * @private
     * @param {Object} configuracao - Configuração do simulador
     * @returns {Object} Planilha de fases de transição
     */
    _criarPlanilhaFasesTransicao: function(configuracao) {
        // Dados da planilha
        const fasesData = [
            ['FASES DE TRANSIÇÃO - SPLIT PAYMENT'],
            ['Expertzy Inteligência Tributária'],
            ['Data do relatório:', this._formatarData(new Date())],
            [],
            ['1. CRONOGRAMA DE IMPLEMENTAÇÃO (2026-2033)']
        ];
        
        // Adicionar cabeçalho da tabela de fases
        fasesData.push(
            ['Ano', 'Percentual de Implementação', 'Observações']
        );
        
        // Adicionar dados das fases
        for (const [ano, percentual] of Object.entries(configuracao.fase_transicao)) {
            let observacao = '';
            if (ano === '2026') observacao = 'Início da transição - Teste operacional';
            else if (ano === '2029') observacao = 'Metade da transição - 60% implementado';
            else if (ano === '2033') observacao = 'Implementação completa';
            
            fasesData.push([
                parseInt(ano),
                percentual,
                observacao
            ]);
        }
        
        fasesData.push([]);
        
        // Seção 2 - Redução de Impostos Atuais
        fasesData.push(
            ['2. REDUÇÃO PROGRESSIVA DOS IMPOSTOS ATUAIS']
        );
        
        // Adicionar cabeçalho da tabela de redução
        fasesData.push(
            ['Ano', 'PIS/COFINS', 'IPI', 'ICMS', 'ISS', 'Observações']
        );
        
        // Adicionar dados de redução
        for (const [ano, reducoes] of Object.entries(configuracao.reducao_impostos_transicao)) {
            let observacao = '';
            if (ano === '2026') observacao = 'Nenhuma redução inicial';
            else if (ano === '2027') observacao = 'Extinção do PIS/COFINS';
            else if (ano === '2033') observacao = 'Extinção completa dos tributos atuais';
            
            fasesData.push([
                parseInt(ano),
                reducoes.PIS,
                reducoes.IPI,
                reducoes.ICMS,
                reducoes.ISS,
                observacao
            ]);
        }
        
        fasesData.push([]);
        
        // Seção 3 - Créditos Cruzados
        fasesData.push(
            ['3. SISTEMA DE CRÉDITOS CRUZADOS']
        );
        
        // Adicionar cabeçalho da tabela de créditos cruzados
        fasesData.push(
            ['Ano', 'IBS para ICMS', 'Observações']
        );
        
        // Adicionar dados de créditos cruzados
        const anosCreditosCruzados = [2028, 2029, 2030, 2031, 2032];
        
        for (const ano of anosCreditosCruzados) {
            let percentual = 0;
            let observacao = '';
            
            if (configuracao.creditos_cruzados[ano]) {
                percentual = configuracao.creditos_cruzados[ano].IBS_para_ICMS || 0;
                
                if (ano === 2028) observacao = 'Início do sistema de créditos cruzados';
                else if (ano === 2032) observacao = 'Último ano antes da extinção total dos tributos atuais';
            }
            
            fasesData.push([
                ano,
                percentual,
                observacao
            ]);
        }
        
        fasesData.push([]);
        
        // Seção 4 - Impactos Esperados
        fasesData.push(
            ['4. IMPACTOS ESPERADOS DURANTE A TRANSIÇÃO']
        );
        
        // Adicionar cabeçalho da tabela de impactos
        fasesData.push(
            ['Fase', 'Período', 'Impactos no Fluxo de Caixa', 'Impactos Operacionais', 'Recomendações']
        );
        
        // Adicionar dados de impactos
        const impactos = [
            [
                'Fase Inicial',
                '2026-2027',
                'Impacto limitado (10-25%)',
                'Adaptação aos novos sistemas e processos',
                'Mapeamento de mudanças e preparação de sistemas'
            ],
            [
                'Fase Intermediária',
                '2028-2030',
                'Impacto moderado (40-80%)',
                'Convivência de sistemas, complexidade operacional aumentada',
                'Implementação de estratégias de mitigação e ajustes operacionais'
            ],
            [
                'Fase Final',
                '2031-2033',
                'Impacto completo (90-100%)',
                'Migração final para o novo sistema',
                'Adaptação completa e otimização de processos'
            ]
        ];
        
        impactos.forEach(impacto => {
            fasesData.push(impacto);
        });
        
        fasesData.push([]);
        
        // Adicionar considerações finais
        fasesData.push(
            ['5. CONSIDERAÇÕES SOBRE O PROCESSO DE TRANSIÇÃO'],
            [
                'Durante o período de transição, é essencial que as empresas monitorem continuamente o impacto do Split Payment ' +
                'no fluxo de caixa, ajustando as estratégias de mitigação conforme necessário. A implementação gradual permite ' +
                'que as organizações testem diferentes abordagens e identifiquem as mais eficazes para seu setor e perfil específico.'
            ],
            [],
            [
                'Recomenda-se acompanhar também as possíveis atualizações na legislação e regulamentação, que podem trazer ajustes ' +
                'ao cronograma de implementação ou às regras de operação do sistema de Split Payment. A preparação adequada durante ' +
                'as fases iniciais pode mitigar significativamente os impactos nas fases mais avançadas da transição.'
            ],
            [],
            ['© 2025 Expertzy Inteligência Tributária - Relatório gerado pelo Simulador de Split Payment']
        );
        
        // Criar planilha
        const ws = XLSX.utils.aoa_to_sheet(fasesData);
        
        // Aplicar estilos
        const estilos = [];
        
        // Título principal
        estilos.push({ 
            range: { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
            style: { 
                font: { bold: true, sz: 18, color: { rgb: this.config.colors.primary } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Subtítulo
        estilos.push({ 
            range: { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
            style: { 
                font: { bold: true, sz: 14, color: { rgb: this.config.colors.neutral } },
                alignment: { horizontal: "center", vertical: "center" }
            }
        });
        
        // Data do relatório
        estilos.push({ 
            range: { s: { r: 2, c: 0 }, e: { r: 2, c: 0 } },
            style: { 
                font: { bold: true, sz: 11 },
                alignment: { horizontal: "right", vertical: "center" }
            }
        });
        
        // Títulos de seções
        const titulosSecoes = [4, 14, 25, 33, 40];
        
        for (const row of titulosSecoes) {
            estilos.push({ 
                range: { s: { r: row, c: 0 }, e: { r: row, c: 4 } },
                style: { 
                    font: { bold: true, sz: 14, color: { rgb: this.config.colors.primary } },
                    fill: { fgColor: { rgb: this.config.colors.headerBg } },
                    alignment: { horizontal: "left", vertical: "center" },
                    border: {
                        bottom: { style: "medium", color: { rgb: this.config.colors.primary } }
                    }
                }
            });
        }
        
        // Cabeçalhos de tabelas
        const cabecalhosTabelas = [5, 15, 26, 34];
        
        for (const row of cabecalhosTabelas) {
            const numCols = row === 5 ? 2 : row === 15 ? 4 : row === 26 ? 1 : 4;
            
            estilos.push({ 
                range: { s: { r: row, c: 0 }, e: { r: row, c: numCols } },
                style: { 
                    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: this.config.colors.primary } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                }
            });
        }
        
        // Formatar tabela de fases
        for (let r = 6; r < 6 + Object.keys(configuracao.fase_transicao).length; r++) {
            // Formatar percentuais
            estilos.push({ 
                range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                style: { 
                    numFmt: "0.00%"
                }
            });
            
            // Alternar cores de fundo
            if ((r - 6) % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 2 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar tabela de redução
        for (let r = 16; r < 16 + Object.keys(configuracao.reducao_impostos_transicao).length; r++) {
            // Formatar percentuais
            for (let c = 1; c <= 4; c++) {
                estilos.push({ 
                    range: { s: { r: r, c: c }, e: { r: r, c: c } },
                    style: { 
                        numFmt: "0.00%"
                    }
                });
            }
            
            // Alternar cores de fundo
            if ((r - 16) % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 4 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
        
        // Formatar tabela de créditos cruzados
        for (let r = 27; r < 27 + anosCreditosCruzados.length; r++) {
            // Formatar percentuais
            estilos.push({ 
                range: { s: { r: r, c: 1 }, e: { r: r, c: 1 } },
                style: { 
                    numFmt: "0.00%"
                }
            });
            
            // Alternar cores de fundo
            if ((r - 27) % 2 === 0) {
                estilos.push({ 
                    range: { s: { r: r, c: 0 }, e: { r: r, c: 2 } },
                    style: { 
                        fill: { fgColor: { rgb: this.config.colors.lightBg1 } }
                    }
                });
            }
        }
    },
    
    /**
     * Obtém a versão do simulador
     * @returns {string} Versão atual do simulador
     */
    obterVersao: function() {
        return '1.0.0';
    },

    /**
     * Obtém informações sobre o exportador
     * @returns {Object} Informações do exportador
     */
    obterInfo: function() {
        return {
            nome: 'ExcelExporter',
            versao: this.obterVersao(),
            descricao: 'Módulo de exportação para Excel do Simulador de Split Payment',
            autor: 'Expertzy Inteligência Tributária',
            copyright: '© 2025 Expertzy Inteligência Tributária'
        };
    }
};