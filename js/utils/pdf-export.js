/**
 * Módulo de exportação para PDF do Simulador de Split Payment
 * 
 * Este módulo contém as funções necessárias para exportar os dados e resultados
 * do simulador para o formato PDF, incluindo gráficos, tabelas e análises.
 * 
 * @author Expertzy IT
 * @version 1.0.0
 * @copyright Expertzy Inteligência Tributária, 2025
 */

const PDFExporter = {
    /**
     * Configurações padrão para os relatórios em PDF
     */
    config: {
        pageSize: 'a4',
        orientation: 'portrait',
        margins: {
            top: 25,
            right: 15,
            bottom: 25,
            left: 15
        },
        headerHeight: 20,
        footerHeight: 15,
        colors: {
            primary: [52, 152, 219],      // Azul principal
            secondary: [46, 204, 113],    // Verde
            accent: [231, 76, 60],        // Vermelho
            neutral: [127, 140, 141],     // Cinza
            highlight: [155, 89, 182]     // Roxo
        },
        fonts: {
            header: {
                name: 'helvetica',
                style: 'bold',
                size: 18
            },
            subtitle: {
                name: 'helvetica',
                style: 'bold',
                size: 14
            },
            section: {
                name: 'helvetica',
                style: 'bold',
                size: 12
            },
            normal: {
                name: 'helvetica',
                style: 'normal',
                size: 10
            },
            small: {
                name: 'helvetica',
                style: 'normal',
                size: 8
            }
        },
        logoPath: 'assets/images/expertzy-it.png',
        logoEnabled: true,
        logoSize: {
            width: 40,
            height: 15
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
     * Exporta os dados do simulador para PDF
     * @param {Object} dados - Dados do simulador
     * @param {Object} resultados - Resultados da simulação
     * @param {Object} aliquotasEquivalentes - Alíquotas equivalentes calculadas
     * @param {Object} configuracao - Configuração atual do simulador
     * @param {Function} obterMemoriaCalculo - Função para obter a memória de cálculo
     * @returns {Promise} Promessa resolvida após a exportação do PDF
     */
    exportarRelatorio: async function(dados, resultados, aliquotasEquivalentes, configuracao, obterMemoriaCalculo) {
        if (!window.jspdf) {
            alert('Biblioteca jsPDF não carregada. Por favor, aguarde e tente novamente.');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        
        if (!resultados || Object.keys(resultados).length === 0) {
            alert('Execute uma simulação antes de exportar os resultados.');
            return;
        }
        
        try {
            // Solicitar nome do arquivo ao usuário
            const nomeArquivo = this._solicitarNomeArquivo('pdf', 'relatorio-split-payment');
            if (!nomeArquivo) {
                return; // Usuário cancelou
            }
            
            // Criar documento PDF com configurações definidas
            const doc = new jsPDF({
                orientation: this.config.orientation,
                unit: 'mm',
                format: this.config.pageSize,
                compress: true
            });
            
            // Definir margens
            const margins = this.config.margins;
            
            // Definir propriedades do documento
            doc.setProperties({
                title: 'Relatório Simulador de Split Payment',
                subject: 'Análise do impacto do Split Payment no fluxo de caixa',
                author: 'Expertzy Inteligência Tributária',
                keywords: 'Split Payment, Reforma Tributária, Fluxo de Caixa, Simulação',
                creator: 'Expertzy IT'
            });
            
            // Inicializar contagem de páginas para numeração
            let pageCount = 1;
            let currentPositionY = margins.top;
            
            // Adicionar capa
            this._adicionarCapa(doc, dados, pageCount);
            doc.addPage();
            pageCount++;
            
            // Adicionar índice
            currentPositionY = this._adicionarIndice(doc, pageCount);
            
            if (currentPositionY > (doc.internal.pageSize.height - margins.bottom - 40)) {
                doc.addPage();
                pageCount++;
                currentPositionY = margins.top;
            } else {
                currentPositionY += 20;
            }
            
            // Adicionar páginas de conteúdo
            
            // 1. Parâmetros da simulação
            doc.addPage();
            pageCount++;
            currentPositionY = this._adicionarParametrosSimulacao(doc, dados, pageCount);
            
            // 2. Resultados da simulação
            doc.addPage();
            pageCount++;
            currentPositionY = this._adicionarResultadosSimulacao(doc, resultados, aliquotasEquivalentes, pageCount);
            
            // 3. Gráficos
            doc.addPage();
            pageCount++;
            currentPositionY = this._adicionarGraficos(doc, pageCount);
            
            // 4. Análise de Estratégias
            doc.addPage();
            pageCount++;
            currentPositionY = this._adicionarAnaliseEstrategias(doc, dados, resultados, pageCount);
            
            // 5. Memória de cálculo
            doc.addPage();
            pageCount++;
            currentPositionY = this._adicionarMemoriaCalculo(doc, obterMemoriaCalculo, pageCount);
            
            // 6. Conclusão
            doc.addPage();
            pageCount++;
            currentPositionY = this._adicionarConclusao(doc, dados, resultados, pageCount);
            
            // Adicionar cabeçalho e rodapé em todas as páginas (exceto capa)
            this._adicionarCabecalhoRodape(doc, pageCount);
            
            // Salvar o arquivo
            doc.save(nomeArquivo);
            
            return Promise.resolve({
                success: true,
                message: 'Relatório exportado com sucesso!',
                fileName: nomeArquivo
            });
            
        } catch (error) {
            console.error(`Erro ao exportar para PDF: ${error.message}`, error);
            alert(`Erro ao exportar para PDF: ${error.message}`);
            
            return Promise.reject({
                success: false,
                message: `Erro ao exportar para PDF: ${error.message}`,
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
     * Adiciona a capa do relatório
     * @private
     * @param {jsPDF} doc - Documento PDF
     * @param {Object} dados - Dados da simulação
     * @param {number} pageNumber - Número da página
     * @returns {number} Posição Y após adicionar o conteúdo
     */
    _adicionarCapa: function(doc, dados, pageNumber) {
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margins = this.config.margins;
        
        // Fundo gradiente sutil na capa (opcional)
        this._desenharGradiente(doc, 0, 0, pageWidth, pageHeight, 
            [240, 240, 240], [220, 220, 220]);
        
        let currentY = 50;
        
        // Logo
        if (this.config.logoEnabled) {
            try {
                const logoImg = document.querySelector('img.logo');
                if (logoImg && logoImg.complete) {
                    const logoWidth = 70;
                    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
                    
                    doc.addImage(
                        logoImg, 
                        'PNG', 
                        (pageWidth - logoWidth) / 2, 
                        currentY, 
                        logoWidth, 
                        logoHeight
                    );
                    
                    currentY += logoHeight + 30;
                } else {
                    currentY += 30;
                }
            } catch (e) {
                console.warn('Não foi possível adicionar o logo:', e);
                currentY += 30;
            }
        }
        
        // Título do relatório
        doc.setFont(this.config.fonts.header.name, this.config.fonts.header.style);
        doc.setFontSize(24);
        doc.setTextColor(this.config.colors.primary[0], this.config.colors.primary[1], this.config.colors.primary[2]);
        
        const tituloPrincipal = 'RELATÓRIO DE SIMULAÇÃO';
        doc.text(tituloPrincipal, pageWidth / 2, currentY, { align: 'center' });
        currentY += 10;
        
        const subtitulo = 'IMPACTO DO SPLIT PAYMENT NO FLUXO DE CAIXA';
        doc.text(subtitulo, pageWidth / 2, currentY, { align: 'center' });
        currentY += 30;
        
        // Informações da empresa
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        
        const regimeText = dados.regime ? (dados.regime === 'real' ? 'Lucro Real' : 
            dados.regime === 'presumido' ? 'Lucro Presumido' : 'Simples Nacional') : '';
        
        const setorText = dados.setor ? dados.setor.charAt(0).toUpperCase() + dados.setor.slice(1) : '';
        
        const infoText = [
            `Setor: ${setorText}`,
            `Regime Tributário: ${regimeText}`,
            `Data: ${new Date().toLocaleDateString('pt-BR')}`
        ];
        
        infoText.forEach(text => {
            doc.text(text, pageWidth / 2, currentY, { align: 'center' });
            currentY += 10;
        });
        
        currentY += 30;
        
        // Detalhes do simulador
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        
        const anoInicial = dados.anoInicial || 2026;
        const anoFinal = dados.anoFinal || 2033;
        
        const detailText = `Simulação para o período ${anoInicial} - ${anoFinal}`;
        doc.text(detailText, pageWidth / 2, currentY, { align: 'center' });
        
        // Rodapé da capa
        const footerY = pageHeight - margins.bottom - 10;
        doc.setFontSize(8);
        doc.setFont(this.config.fonts.small.name, 'italic');
        doc.setTextColor(100, 100, 100);
        
        doc.text('© 2025 Expertzy Inteligência Tributária', pageWidth / 2, footerY, { align: 'center' });
        doc.text('Confidencial - Uso Interno', pageWidth / 2, footerY + 5, { align: 'center' });
        
        return currentY;
    },
    
    /**
     * Adiciona o índice do relatório
     * @private
     * @param {jsPDF} doc - Documento PDF
     * @param {number} pageNumber - Número da página
     * @returns {number} Posição Y após adicionar o conteúdo
     */
    _adicionarIndice: function(doc, pageNumber) {
        const margins = this.config.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top;
        
        // Título
        doc.setFont(this.config.fonts.header.name, this.config.fonts.header.style);
        doc.setFontSize(16);
        doc.setTextColor(this.config.colors.primary[0], this.config.colors.primary[1], this.config.colors.primary[2]);
        doc.text('Índice', pageWidth / 2, currentY, { align: 'center' });
        
        currentY += 20;
        
        // Itens do índice
        doc.setFont(this.config.fonts.normal.name, this.config.fonts.normal.style);
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        
        const indiceItems = [
            { texto: '1. Parâmetros da Simulação', pagina: 3 },
            { texto: '2. Resultados da Simulação', pagina: 4 },
            { texto: '3. Análise Gráfica', pagina: 5 },
            { texto: '4. Estratégias de Mitigação', pagina: 6 },
            { texto: '5. Memória de Cálculo', pagina: 7 },
            { texto: '6. Conclusão e Recomendações', pagina: 8 }
        ];
        
        indiceItems.forEach(item => {
            // Texto do item
            doc.text(item.texto, margins.left + 5, currentY);
            
            // Pontilhado
            const startX = doc.getTextWidth(item.texto) + margins.left + 10;
            const endX = pageWidth - margins.right - 15;
            this._desenharLinhaPontilhada(doc, startX, currentY - 2, endX, currentY - 2);
            
            // Número da página
            doc.text(item.pagina.toString(), pageWidth - margins.right - 10, currentY, { align: 'right' });
            
            currentY += 12;
        });
        
        // Numeração da página
        this._adicionarNumeroPagina(doc, pageNumber);
        
        return currentY;
    },
    
    /**
     * Adiciona a seção de parâmetros da simulação
     * @private
     * @param {jsPDF} doc - Documento PDF
     * @param {Object} dados - Dados da simulação
     * @param {number} pageNumber - Número da página
     * @returns {number} Posição Y após adicionar o conteúdo
     */
    _adicionarParametrosSimulacao: function(doc, dados, pageNumber) {
        const margins = this.config.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;
        
        // Adicionar cabeçalho da seção
        doc.setFont(this.config.fonts.header.name, this.config.fonts.header.style);
        doc.setFontSize(16);
        doc.setTextColor(this.config.colors.primary[0], this.config.colors.primary[1], this.config.colors.primary[2]);
        doc.text('1. Parâmetros da Simulação', margins.left, currentY);
        
        currentY += 15;
        
        // Formatar valores para exibição
        const formatarBRL = valor => 
            typeof valor === 'number' ? 
            valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 
            'R$ 0,00';
        
        const formatarPercentual = valor => 
            typeof valor === 'number' ? 
            valor.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2 }) : 
            '0,00%';
        
        // Seção 1.1 - Dados da Empresa
        doc.setFont(this.config.fonts.subtitle.name, this.config.fonts.subtitle.style);
        doc.setFontSize(14);
        doc.setTextColor(70, 70, 70);
        doc.text('1.1. Dados da Empresa', margins.left, currentY);
        
        currentY += 10;
        
        // Preparar dados da empresa para tabela
        let dadosEmpresa = [
            ['Parâmetro', 'Valor'],
            ['Faturamento Anual', formatarBRL(dados.faturamento)],
            ['Custos Tributáveis', formatarBRL(dados.custosTributaveis)],
            ['Custos Tributáveis (ICMS)', formatarBRL(dados.custosICMS)],
            ['Custos de Fornecedores do Simples', formatarBRL(dados.custosSimples)],
            ['Créditos Anteriores', formatarBRL(dados.creditosAnteriores)]
        ];
        
        // Adicionar tabela de dados da empresa
        doc.autoTable({
            startY: currentY,
            head: [dadosEmpresa[0]],
            body: dadosEmpresa.slice(1),
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 3,
            },
            headStyles: {
                fillColor: [240, 240, 240],
                textColor: [50, 50, 50],
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 60 }
            },
            margin: { left: margins.left }
        });
        
        currentY = doc.lastAutoTable.finalY + 15;
        
        // Seção 1.2 - Parâmetros Setoriais
        doc.setFont(this.config.fonts.subtitle.name, this.config.fonts.subtitle.style);
        doc.setFontSize(14);
        doc.setTextColor(70, 70, 70);
        doc.text('1.2. Parâmetros Setoriais', margins.left, currentY);
        
        currentY += 10;
        
        // Preparar dados setoriais para tabela
        const regimeText = dados.regime === 'real' ? 'Lucro Real' : 
                          dados.regime === 'presumido' ? 'Lucro Presumido' : 'Simples Nacional';
        
        const setorText = dados.setor.charAt(0).toUpperCase() + dados.setor.slice(1);
        
        let dadosSetoriais = [
            ['Parâmetro', 'Valor'],
            ['Setor de Atividade', setorText],
            ['Regime Tributário', regimeText],
            ['Carga Tributária Atual', formatarPercentual(dados.cargaAtual / 100)],
            ['Alíquota Média ICMS Entrada', formatarPercentual(dados.aliquotaEntrada / 100)],
            ['Alíquota Média ICMS Saída', formatarPercentual(dados.aliquotaSaida / 100)]
        ];
        
        // Adicionar tabela de dados setoriais
        doc.autoTable({
            startY: currentY,
            head: [dadosSetoriais[0]],
            body: dadosSetoriais.slice(1),
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 3,
            },
            headStyles: {
                fillColor: [240, 240, 240],
                textColor: [50, 50, 50],
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 60 }
            },
            margin: { left: margins.left }
        });
        
        currentY = doc.lastAutoTable.finalY + 15;
        
        // Seção 1.3 - Parâmetros da Simulação
        doc.setFont(this.config.fonts.subtitle.name, this.config.fonts.subtitle.style);
        doc.setFontSize(14);
        doc.setTextColor(70, 70, 70);
        doc.text('1.3. Parâmetros da Simulação', margins.left, currentY);
        
        currentY += 10;
        
        // Preparar parâmetros da simulação para tabela
        let parametrosSimulacao = [
            ['Parâmetro', 'Valor'],
            ['Ano Inicial', dados.anoInicial || 2026],
            ['Ano Final', dados.anoFinal || 2033],
            ['Percentual de Implementação (2026)', '10%'],
            ['Percentual de Implementação (2033)', '100%']
        ];
        
        // Adicionar tabela de parâmetros da simulação
        doc.autoTable({
            startY: currentY,
            head: [parametrosSimulacao[0]],
            body: parametrosSimulacao.slice(1),
            theme: 'grid',
            styles: {
                fontSize: 10,
                cellPadding: 3,
            },
            headStyles: {
                fillColor: [240, 240, 240],
                textColor: [50, 50, 50],
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 60 }
            },
            margin: { left: margins.left }
        });
        
        currentY = doc.lastAutoTable.finalY + 15;
        
        // Adicionar explicação textual
        doc.setFont(this.config.fonts.normal.name, this.config.fonts.normal.style);
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        
        const paragraphText = [
            "Esta simulação analisa o impacto do Split Payment no fluxo de caixa da empresa, ",
            "considerando os parâmetros acima e a implementação progressiva prevista na Lei ",
            "Complementar 214/2025. O período de transição entre 2026 e 2033 permitirá às empresas ",
            "adaptarem seus processos e capital de giro às novas exigências tributárias."
        ].join('');
        
        const splitText = doc.splitTextToSize(paragraphText, pageWidth - margins.left - margins.right);
        doc.text(splitText, margins.left, currentY);
        
        // Numeração da página
        this._adicionarNumeroPagina(doc, pageNumber);
        
        return currentY + splitText.length * 5;
    },
    
    /**
     * Adiciona a seção de resultados da simulação
     * @private
     * @param {jsPDF} doc - Documento PDF
     * @param {Object} resultados - Resultados da simulação
     * @param {Object} aliquotasEquivalentes - Alíquotas equivalentes calculadas
     * @param {number} pageNumber - Número da página
     * @returns {number} Posição Y após adicionar o conteúdo
     */
    _adicionarResultadosSimulacao: function(doc, resultados, aliquotasEquivalentes, pageNumber) {
        const margins = this.config.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;
        
        // Adicionar cabeçalho da seção
        doc.setFont(this.config.fonts.header.name, this.config.fonts.header.style);
        doc.setFontSize(16);
        doc.setTextColor(this.config.colors.primary[0], this.config.colors.primary[1], this.config.colors.primary[2]);
        doc.text('2. Resultados da Simulação', margins.left, currentY);
        
        currentY += 15;
        
        // Formatadores
        const formatarBRL = valor => 
            typeof valor === 'number' ? 
            valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 
            'R$ 0,00';
        
        const formatarPercentual = valor => 
            typeof valor === 'number' ? 
            valor.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2 }) : 
            '0,00%';
        
        // Seção 2.1 - Tabela de Resultados
        doc.setFont(this.config.fonts.subtitle.name, this.config.fonts.subtitle.style);
        doc.setFontSize(14);
        doc.setTextColor(70, 70, 70);
        doc.text('2.1. Tabela de Resultados Anuais', margins.left, currentY);
        
        currentY += 10;
        
        // Preparar dados dos resultados para tabela
        const anos = Object.keys(resultados).sort();
        
        // Cabeçalho da tabela
        const headResult = [['Ano', 'CBS', 'IBS', 'Imposto Devido', 'Carga Atual', 'Variação']];
        
        // Corpo da tabela
        const bodyResult = anos.map(ano => {
            const resultado = resultados[ano];
            const valorAtual = aliquotasEquivalentes[ano].valor_atual;
            const diferenca = resultado.imposto_devido - valorAtual;
            const variacaoPercentual = valorAtual > 0 ? (diferenca / valorAtual) * 100 : 0;
            
            return [
                ano,
                formatarBRL(resultado.cbs),
                formatarBRL(resultado.ibs),
                formatarBRL(resultado.imposto_devido),
                formatarBRL(valorAtual),
                formatarPercentual(variacaoPercentual / 100)
            ];
        });
        
        // Adicionar tabela de resultados
        doc.autoTable({
            startY: currentY,
            head: headResult,
            body: bodyResult,
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: 2,
                overflow: 'ellipsize'
            },
            headStyles: {
                fillColor: [52, 152, 219],
                textColor: 255,
                fontStyle: 'bold'
            },
            // Adicionar cores condicionais para a coluna de variação
            didDrawCell: function(data) {
                if (data.section === 'body' && data.column.index === 5) {
                    const valor = parseFloat(data.cell.text[0].replace(/[^\d,-]/g, '').replace(',', '.'));
                    
                    if (valor > 0) {
                        // Variação positiva (vermelho)
                        doc.setFillColor(231, 76, 60, 0.2);
                        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                    } else if (valor < 0) {
                        // Variação negativa (verde)
                        doc.setFillColor(46, 204, 113, 0.2);
                        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                    }
                }
            },
            columnStyles: {
                0: { cellWidth: 15 },    // Ano
                1: { cellWidth: 30 },    // CBS
                2: { cellWidth: 30 },    // IBS
                3: { cellWidth: 35 },    // Imposto Devido
                4: { cellWidth: 30 },    // Carga Atual
                5: { cellWidth: 25 }     // Variação
            },
            margin: { left: margins.left }
        });
        
        currentY = doc.lastAutoTable.finalY + 15;
        
        // Seção 2.2 - Análise dos Resultados
        doc.setFont(this.config.fonts.subtitle.name, this.config.fonts.subtitle.style);
        doc.setFontSize(14);
        doc.setTextColor(70, 70, 70);
        doc.text('2.2. Análise dos Resultados', margins.left, currentY);
        
        currentY += 10;
        
        // Calcular alguns indicadores para a análise
        let variacaoTotal = 0;
        let maiorVariacao = 0;
        let anoMaiorVariacao = '';
        
        anos.forEach(ano => {
            const resultado = resultados[ano];
            const valorAtual = aliquotasEquivalentes[ano].valor_atual;
            const diferenca = resultado.imposto_devido - valorAtual;
            const variacaoPercentual = valorAtual > 0 ? (diferenca / valorAtual) * 100 : 0;
            
            // Acumular variação total
            variacaoTotal += diferenca;
            
            // Verificar maior variação
            if (Math.abs(variacaoPercentual) > Math.abs(maiorVariacao)) {
                maiorVariacao = variacaoPercentual;
                anoMaiorVariacao = ano;
            }
        });
        
        // Texto de análise
        doc.setFont(this.config.fonts.normal.name, this.config.fonts.normal.style);
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        
        // Formatação de análise baseada nos resultados
        const isImpactoPositivo = variacaoTotal < 0;
        
        let analiseTexto = isImpactoPositivo ?
            [
                `A simulação demonstra que a implementação do Split Payment tende a gerar `,
                `um impacto financeiro positivo para a empresa ao longo do período de transição, `,
                `com uma variação acumulada de ${formatarBRL(-variacaoTotal)} na carga tributária. `,
                `O ano de ${anoMaiorVariacao} apresenta a maior variação percentual (${formatarPercentual(maiorVariacao/100)}), `,
                `indicando um ponto crítico no cronograma de implementação.`
            ].join('') :
            [
                `A simulação demonstra que a implementação do Split Payment tende a gerar `,
                `um impacto financeiro negativo para a empresa ao longo do período de transição, `,
                `com uma variação acumulada de ${formatarBRL(variacaoTotal)} na carga tributária. `,
                `O ano de ${anoMaiorVariacao} apresenta a maior variação percentual (${formatarPercentual(maiorVariacao/100)}), `,
                `indicando um ponto crítico que requer estratégias de mitigação.`
            ].join('');
        
        const splitAnalise = doc.splitTextToSize(analiseTexto, pageWidth - margins.left - margins.right);
        doc.text(splitAnalise, margins.left, currentY);
        
        currentY += splitAnalise.length * 5 + 10;
        
        // Adicionar quadro de destaque com sugestões
        const boxWidth = pageWidth - margins.left - margins.right;
        const boxHeight = 40;
        const boxX = margins.left;
        const boxY = currentY;
        
        // Desenhar fundo do box com gradiente suave
        this._desenharGradiente(doc, boxX, boxY, boxX + boxWidth, boxY + boxHeight, 
            [245, 245, 245], [235, 235, 235]);
        
        // Adicionar borda
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(boxX, boxY, boxWidth, boxHeight);
        
        // Título do box
        doc.setFont(this.config.fonts.section.name, this.config.fonts.section.style);
        doc.setFontSize(11);
        doc.setTextColor(this.config.colors.primary[0], this.config.colors.primary[1], this.config.colors.primary[2]);
        doc.text('Considerações Importantes:', boxX + 5, boxY + 10);
        
        // Conteúdo do box
        doc.setFont(this.config.fonts.normal.name, this.config.fonts.normal.style);
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        
        const pontosImportantes = isImpactoPositivo ?
            [
                `• Considere a oportunidade de utilizar a economia tributária para investimentos estratégicos.`,
                `• Prepare-se para os períodos de transição com planejamento financeiro adequado.`,
                `• Avalie a possibilidade de ajustar a política de preços para aumentar competitividade.`
            ].join('\n') :
            [
                `• Considere estratégias de mitigação para minimizar o impacto no fluxo de caixa.`,
                `• Planeje necessidades adicionais de capital de giro para os períodos mais críticos.`,
                `• Avalie a possibilidade de ajustar a política de preços e prazos com fornecedores.`
            ].join('\n');
        
        doc.text(pontosImportantes, boxX + 5, boxY + 18);
        
        currentY += boxHeight + 15;
        
        // Numeração da página
        this._adicionarNumeroPagina(doc, pageNumber);
        
        return currentY;
    },
    
    /**
     * Adiciona os gráficos da simulação
     * @private
     * @param {jsPDF} doc - Documento PDF
     * @param {number} pageNumber - Número da página
     * @returns {number} Posição Y após adicionar o conteúdo
     */
    _adicionarGraficos: function(doc, pageNumber) {
        const margins = this.config.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;
        
        // Adicionar cabeçalho da seção
        doc.setFont(this.config.fonts.header.name, this.config.fonts.header.style);
        doc.setFontSize(16);
        doc.setTextColor(this.config.colors.primary[0], this.config.colors.primary[1], this.config.colors.primary[2]);
        doc.text('3. Análise Gráfica', margins.left, currentY);
        
        currentY += 15;
        
        // Capturar e adicionar gráficos da simulação
        try {
            // Lista de gráficos para capturar
            const graficos = [
                {
                    id: 'grafico-comparativo',
                    titulo: '3.1. Comparativo de Impostos por Ano',
                    descricao: 'Este gráfico apresenta a composição dos impostos (CBS e IBS) por ano, permitindo visualizar a progressão da implementação do Split Payment ao longo do período de transição.'
                },
                {
                    id: 'grafico-aliquotas',
                    titulo: '3.2. Evolução da Alíquota Efetiva',
                    descricao: 'Este gráfico mostra a evolução da alíquota efetiva ao longo do período, indicando o percentual real de tributação em relação ao faturamento.'
                },
                {
                    id: 'grafico-transicao',
                    titulo: '3.3. Evolução Tributária na Transição',
                    descricao: 'Este gráfico compara a evolução dos impostos no sistema atual versus o novo sistema IVA Dual durante o período de transição.'
                },
                {
                    id: 'grafico-incentivos',
                    titulo: '3.4. Impacto dos Incentivos Fiscais',
                    descricao: 'Este gráfico apresenta o impacto dos incentivos fiscais no valor do ICMS, comparando o valor sem incentivos versus o valor com a aplicação dos benefícios fiscais.'
                }
            ];
            
            // Adicionar cada gráfico
            for (let i = 0; i < graficos.length; i++) {
                const grafico = graficos[i];
                const graficoElement = document.getElementById(grafico.id);
                
                if (graficoElement) {
                    // Adicionar título do gráfico
                    doc.setFont(this.config.fonts.subtitle.name, this.config.fonts.subtitle.style);
                    doc.setFontSize(14);
                    doc.setTextColor(70, 70, 70);
                    doc.text(grafico.titulo, margins.left, currentY);
                    
                    currentY += 8;
                    
                    // Capturar imagem do gráfico
                    const imgData = graficoElement.toDataURL('image/png');
                    
                    // Definir dimensões para o gráfico
                    const imgWidth = pageWidth - margins.left - margins.right;
                    const imgHeight = 80;
                    
                    // Adicionar imagem do gráfico
                    doc.addImage(imgData, 'PNG', margins.left, currentY, imgWidth, imgHeight);
                    
                    currentY += imgHeight + 5;
                    
                    // Adicionar descrição do gráfico
                    doc.setFont(this.config.fonts.normal.name, this.config.fonts.normal.style);
                    doc.setFontSize(9);
                    doc.setTextColor(80, 80, 80);
                    
                    const splitDesc = doc.splitTextToSize(grafico.descricao, pageWidth - margins.left - margins.right);
                    doc.text(splitDesc, margins.left, currentY);
                    
                    currentY += splitDesc.length * 4 + 15;
                    
                    // Verificar se precisa adicionar nova página
                    if (i < graficos.length - 1 && currentY > doc.internal.pageSize.height - margins.bottom - 100) {
                        doc.addPage();
                        pageNumber++;
                        this._adicionarNumeroPagina(doc, pageNumber);
                        currentY = margins.top + 10;
                    }
                }
            }
        } catch (e) {
            console.warn('Erro ao adicionar gráficos:', e);
            
            // Adicionar mensagem de erro
            doc.setFont(this.config.fonts.normal.name, this.config.fonts.normal.style);
            doc.setFontSize(10);
            doc.setTextColor(231, 76, 60);
            doc.text('Não foi possível capturar os gráficos. Por favor, verifique se os gráficos foram gerados corretamente na simulação.', margins.left, currentY);
            
            currentY += 10;
        }
        
        // Adicionar quadro com insights
        const boxWidth = pageWidth - margins.left - margins.right;
        const boxHeight = 50;
        const boxX = margins.left;
        const boxY = currentY;
        
        // Desenhar fundo do box com gradiente suave
        this._desenharGradiente(doc, boxX, boxY, boxX + boxWidth, boxY + boxHeight, 
            [245, 245, 245], [235, 235, 235]);
        
        // Adicionar borda
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(boxX, boxY, boxWidth, boxHeight);
        
        // Título do box
        doc.setFont(this.config.fonts.section.name, this.config.fonts.section.style);
        doc.setFontSize(11);
        doc.setTextColor(this.config.colors.primary[0], this.config.colors.primary[1], this.config.colors.primary[2]);
        doc.text('Insights da Análise Gráfica:', boxX + 5, boxY + 10);
        
        // Conteúdo do box
        doc.setFont(this.config.fonts.normal.name, this.config.fonts.normal.style);
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        
        const insights = [
            `• Os gráficos demonstram claramente a progressão do impacto durante o período de transição.`,
            `• As maiores variações tendem a ocorrer nos anos intermediários (2029-2031).`,
            `• A alíquota efetiva se estabiliza ao final do período, indicando o novo patamar tributário.`,
            `• Os incentivos fiscais continuam tendo um papel relevante mesmo no novo sistema.`
        ].join('\n');
        
        doc.text(insights, boxX + 5, boxY + 18);
        
        currentY += boxHeight + 15;
        
        // Numeração da página
        this._adicionarNumeroPagina(doc, pageNumber);
        
        return currentY;
    },
    
    /**
     * Adiciona a análise de estratégias de mitigação
     * @private
     * @param {jsPDF} doc - Documento PDF
     * @param {Object} dados - Dados da simulação
     * @param {Object} resultados - Resultados da simulação
     * @param {number} pageNumber - Número da página
     * @returns {number} Posição Y após adicionar o conteúdo
     */
    _adicionarAnaliseEstrategias: function(doc, dados, resultados, pageNumber) {
        const margins = this.config.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;
        
        // Adicionar cabeçalho da seção
        doc.setFont(this.config.fonts.header.name, this.config.fonts.header.style);
        doc.setFontSize(16);
        doc.setTextColor(this.config.colors.primary[0], this.config.colors.primary[1], this.config.colors.primary[2]);
        doc.text('4. Estratégias de Mitigação', margins.left, currentY);
        
        currentY += 15;
        
        // Formatadores
        const formatarBRL = valor => 
            typeof valor === 'number' ? 
            valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 
            'R$ 0,00';
        
        const formatarPercentual = valor => 
            typeof valor === 'number' ? 
            valor.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2 }) : 
            '0,00%';
        
        // Texto introdutório
        doc.setFont(this.config.fonts.normal.name, this.config.fonts.normal.style);
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        
        const introTexto = [
            "A implementação do Split Payment pode impactar significativamente o fluxo de caixa das empresas, ",
            "especialmente durante o período de transição. Para mitigar esses efeitos, apresentamos um conjunto de ",
            "estratégias que podem ser adotadas, adaptadas às características específicas do negócio."
        ].join('');
        
        const splitIntro = doc.splitTextToSize(introTexto, pageWidth - margins.left - margins.right);
        doc.text(splitIntro, margins.left, currentY);
        
        currentY += splitIntro.length * 5 + 10;
        
        // Estratégias de mitigação
        const estrategias = [
            {
                titulo: "4.1. Ajuste de Preços",
                descricao: "Revisão da política de preços para compensar a perda de fluxo de caixa, considerando a elasticidade-preço da demanda do mercado e a posição competitiva da empresa.",
                impacto: "Alto",
                complexidade: "Média",
                eficacia: "75%"
            },
            {
                titulo: "4.2. Renegociação de Prazos",
                descricao: "Renegociação dos prazos de pagamento com fornecedores e de recebimento com clientes, visando equilibrar o ciclo financeiro e compensar a perda de capital de giro.",
                impacto: "Médio",
                complexidade: "Alta",
                eficacia: "60%"
            },
            {
                titulo: "4.3. Antecipação de Recebíveis",
                descricao: "Utilização de mecanismos de antecipação de recebíveis para converter vendas a prazo em recursos imediatos, considerando o custo financeiro versus o benefício do fluxo de caixa.",
                impacto: "Alto",
                complexidade: "Baixa",
                eficacia: "80%"
            },
            {
                titulo: "4.4. Captação de Capital de Giro",
                descricao: "Obtenção de linhas de crédito específicas para capital de giro, preferencialmente com carência alinhada ao período de transição do Split Payment.",
                impacto: "Alto",
                complexidade: "Média",
                eficacia: "85%"
            },
            {
                titulo: "4.5. Ajuste no Mix de Produtos",
                descricao: "Reequilíbrio do mix de produtos e serviços, priorizando itens com ciclo financeiro mais favorável e maior margem para absorver o impacto do Split Payment.",
                impacto: "Médio",
                complexidade: "Alta",
                eficacia: "65%"
            },
            {
                titulo: "4.6. Incentivo a Meios de Pagamento Favoráveis",
                descricao: "Estímulo a modalidades de pagamento que reduzam o prazo médio de recebimento, como pagamentos à vista ou via PIX, oferecendo descontos ou vantagens exclusivas.",
                impacto: "Médio",
                complexidade: "Baixa",
                eficacia: "70%"
            }
        ];
        
        // Adicionar cada estratégia
        for (let i = 0; i < estrategias.length; i++) {
            const estrategia = estrategias[i];
            
            // Título da estratégia
            doc.setFont(this.config.fonts.subtitle.name, this.config.fonts.subtitle.style);
            doc.setFontSize(12);
            doc.setTextColor(70, 70, 70);
            doc.text(estrategia.titulo, margins.left, currentY);
            
            currentY += 6;
            
            // Descrição da estratégia
            doc.setFont(this.config.fonts.normal.name, this.config.fonts.normal.style);
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            
            const splitDesc = doc.splitTextToSize(estrategia.descricao, pageWidth - margins.left - margins.right);
            doc.text(splitDesc, margins.left, currentY);
            
            currentY += splitDesc.length * 5 + 5;
            
            // Tabela de informações da estratégia
            const infoEstrategia = [
                ['Critério', 'Avaliação'],
                ['Impacto no Fluxo', estrategia.impacto],
                ['Complexidade', estrategia.complexidade],
                ['Eficácia Média', estrategia.eficacia]
            ];
            
            // Determinar cores baseadas na avaliação
            const coloresImpacto = {
                'Alto': [231, 76, 60],   // Vermelho
                'Médio': [243, 156, 18], // Laranja
                'Baixo': [46, 204, 113]  // Verde
            };
            
            const coloresComplexidade = {
                'Alta': [231, 76, 60],   // Vermelho
                'Média': [243, 156, 18], // Laranja
                'Baixa': [46, 204, 113]  // Verde
            };
            
            // Adicionar tabela de informações
            doc.autoTable({
                startY: currentY,
                head: [infoEstrategia[0]],
                body: infoEstrategia.slice(1),
                theme: 'grid',
                styles: {
                    fontSize: 9,
                    cellPadding: 2
                },
                headStyles: {
                    fillColor: [240, 240, 240],
                    textColor: [50, 50, 50],
                    fontStyle: 'bold'
                },
                // Colorir células baseado nos valores
                didDrawCell: function(data) {
                    if (data.section === 'body') {
                        if (data.column.index === 1) {
                            if (data.row.index === 0) {
                                // Impacto
                                const impacto = data.cell.text[0];
                                const cor = coloresImpacto[impacto] || [100, 100, 100];
                                doc.setTextColor(cor[0], cor[1], cor[2]);
                            } else if (data.row.index === 1) {
                                // Complexidade
                                const complexidade = data.cell.text[0];
                                const cor = coloresComplexidade[complexidade] || [100, 100, 100];
                                doc.setTextColor(cor[0], cor[1], cor[2]);
                            }
                        }
                    }
                },
                columnStyles: {
                    0: { cellWidth: 60 },
                    1: { cellWidth: 50 }
                },
                margin: { left: margins.left + 10 }
            });
            
            currentY = doc.lastAutoTable.finalY + 10;
            
            // Verificar se precisa adicionar nova página
            if (i < estrategias.length - 1 && currentY > doc.internal.pageSize.height - margins.bottom - 60) {
                doc.addPage();
                pageNumber++;
                this._adicionarNumeroPagina(doc, pageNumber);
                currentY = margins.top + 10;
            }
        }
        
        // Seção de recomendação combinada
        currentY += 5;
        
        doc.setFont(this.config.fonts.subtitle.name, this.config.fonts.subtitle.style);
        doc.setFontSize(14);
        doc.setTextColor(70, 70, 70);
        doc.text('4.7. Estratégia Combinada Recomendada', margins.left, currentY);
        
        currentY += 10;
        
        // Texto de recomendação
        doc.setFont(this.config.fonts.normal.name, this.config.fonts.normal.style);
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        
        const recomendacaoTexto = [
            "Com base nas características do seu setor e regime tributário, recomendamos uma abordagem combinada ",
            "das estratégias de Ajuste de Preços, Antecipação de Recebíveis e Captação de Capital de Giro. ",
            "Esta combinação oferece o maior potencial de mitigação do impacto no fluxo de caixa, enquanto ",
            "mantém a competitividade e saúde financeira da empresa durante o período de transição."
        ].join('');
        
        const splitRecomendacao = doc.splitTextToSize(recomendacaoTexto, pageWidth - margins.left - margins.right);
        doc.text(splitRecomendacao, margins.left, currentY);
        
        currentY += splitRecomendacao.length * 5 + 15;
        
        // Plano de ação simplificado
        const planoAcao = [
            ['Fase', 'Ação', 'Prazo Recomendado'],
            ['Preparação', 'Análise detalhada do fluxo de caixa atual', '6 meses antes da implementação'],
            ['Implementação Inicial', 'Ajuste gradual de preços e negociação com clientes', '3 meses antes da implementação'],
            ['Monitoramento', 'Acompanhamento dos indicadores de ciclo financeiro', 'Durante todo o período de transição'],
            ['Ajuste Contínuo', 'Refinamento das estratégias conforme resultados', 'Anualmente durante a transição']
        ];
        
        // Adicionar tabela do plano de ação
        doc.autoTable({
            startY: currentY,
            head: [planoAcao[0]],
            body: planoAcao.slice(1),
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: 3
            },
            headStyles: {
                fillColor: this.config.colors.primary,
                textColor: 255,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 80 },
                2: { cellWidth: 50 }
            },
            margin: { left: margins.left }
        });
        
        currentY = doc.lastAutoTable.finalY + 10;
        
        // Numeração da página
        this._adicionarNumeroPagina(doc, pageNumber);
        
        return currentY;
    },
    
    /**
     * Adiciona a memória de cálculo
     * @private
     * @param {jsPDF} doc - Documento PDF
     * @param {Function} obterMemoriaCalculo - Função para obter a memória de cálculo
     * @param {number} pageNumber - Número da página
     * @returns {number} Posição Y após adicionar o conteúdo
     */
    _adicionarMemoriaCalculo: function(doc, obterMemoriaCalculo, pageNumber) {
        const margins = this.config.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;
        
        // Adicionar cabeçalho da seção
        doc.setFont(this.config.fonts.header.name, this.config.fonts.header.style);
        doc.setFontSize(16);
        doc.setTextColor(this.config.colors.primary[0], this.config.colors.primary[1], this.config.colors.primary[2]);
        doc.text('5. Memória de Cálculo', margins.left, currentY);
        
        currentY += 15;
        
        // Texto introdutório
        doc.setFont(this.config.fonts.normal.name, this.config.fonts.normal.style);
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        
        const introTexto = [
            "Esta seção apresenta os detalhes dos cálculos realizados na simulação, permitindo a verificação ",
            "e auditoria dos resultados. A memória de cálculo inclui todas as etapas do processo, desde a aplicação ",
            "das alíquotas até o cálculo final dos impostos."
        ].join('');
        
        const splitIntro = doc.splitTextToSize(introTexto, pageWidth - margins.left - margins.right);
        doc.text(splitIntro, margins.left, currentY);
        
        currentY += splitIntro.length * 5 + 10;
        
        // Obter texto da memória de cálculo
        const memoriaTexto = document.getElementById('memoria-calculo').textContent;
        
        if (memoriaTexto) {
            // Formatar memória de cálculo para exibição
            doc.setFont('courier', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(30, 30, 30);
            
            // Dividir em linhas e limitar a quantidade
            const linhasMemoria = memoriaTexto.split('\n');
            const maxLinhas = 200; // Limitar a quantidade de linhas para não deixar o PDF muito grande
            
            const linhasExibidas = linhasMemoria.slice(0, maxLinhas);
            if (linhasMemoria.length > maxLinhas) {
                linhasExibidas.push('... (memória de cálculo truncada para manter o tamanho do documento)');
            }
            
            // Processar linhas
            for (let i = 0; i < linhasExibidas.length; i++) {
                const linha = linhasExibidas[i];
                
                // Verificar se a linha é um título de seção
                if (linha.includes('===')) {
                    doc.setFont('courier', 'bold');
                    doc.setTextColor(this.config.colors.primary[0], this.config.colors.primary[1], this.config.colors.primary[2]);
                } else {
                    doc.setFont('courier', 'normal');
                    doc.setTextColor(30, 30, 30);
                }
                
                // Verificar se precisa adicionar nova página
                if (currentY > doc.internal.pageSize.height - margins.bottom - 10) {
                    doc.addPage();
                    pageNumber++;
                    this._adicionarNumeroPagina(doc, pageNumber);
                    currentY = margins.top + 10;
                }
                
                // Quebrar linhas longas
                const splitLinha = doc.splitTextToSize(linha, pageWidth - margins.left - margins.right);
                doc.text(splitLinha, margins.left, currentY);
                
                currentY += splitLinha.length * 3.5;
            }
        } else {
            // Mensagem se não houver memória de cálculo
            doc.setFont(this.config.fonts.normal.name, 'italic');
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text('Memória de cálculo não disponível. Execute a simulação para gerar os dados detalhados.', margins.left, currentY);
            
            currentY += 10;
        }
        
        // Adicionar nota sobre exportação completa
        currentY += 10;
        doc.setFont(this.config.fonts.normal.name, 'italic');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        
        const notaExportacao = [
            "Nota: Para a memória de cálculo completa e detalhada, recomenda-se utilizar a função 'Exportar Memória de Cálculo' ",
            "disponível no simulador, que gera um arquivo de texto contendo todas as etapas do cálculo sem truncamento."
        ].join('');
        
        const splitNota = doc.splitTextToSize(notaExportacao, pageWidth - margins.left - margins.right);
        doc.text(splitNota, margins.left, currentY);
        
        currentY += splitNota.length * 5;
        
        // Numeração da página
        this._adicionarNumeroPagina(doc, pageNumber);
        
        return currentY;
    },
    
    /**
     * Adiciona a conclusão e recomendações
     * @private
     * @param {jsPDF} doc - Documento PDF
     * @param {Object} dados - Dados da simulação
     * @param {Object} resultados - Resultados da simulação
     * @param {number} pageNumber - Número da página
     * @returns {number} Posição Y após adicionar o conteúdo
     */
    _adicionarConclusao: function(doc, dados, resultados, pageNumber) {
        const margins = this.config.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;
        
        // Adicionar cabeçalho da seção
        doc.setFont(this.config.fonts.header.name, this.config.fonts.header.style);
        doc.setFontSize(16);
        doc.setTextColor(this.config.colors.primary[0], this.config.colors.primary[1], this.config.colors.primary[2]);
        doc.text('6. Conclusão e Recomendações', margins.left, currentY);
        
        currentY += 15;
        
        // Formatadores
        const formatarBRL = valor => 
            typeof valor === 'number' ? 
            valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 
            'R$ 0,00';
        
        const formatarPercentual = valor => 
            typeof valor === 'number' ? 
            valor.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2 }) : 
            '0,00%';
        
        // Calcular alguns indicadores para a conclusão
        const anos = Object.keys(resultados).sort();
        
        let variacaoTotal = 0;
        let variacaoMedia = 0;
        let impactoInicial = 0;
        let impactoFinal = 0;
        
        if (anos.length > 0) {
            anos.forEach(ano => {
                const resultado = resultados[ano];
                const valorAtual = resultado.imposto_devido;
                
                // Acumular variação total
                variacaoTotal += valorAtual;
                
                // Guardar impacto inicial e final
                if (ano === anos[0]) {
                    impactoInicial = valorAtual;
                }
                
                if (ano === anos[anos.length - 1]) {
                    impactoFinal = valorAtual;
                }
            });
            
            // Calcular média
            variacaoMedia = variacaoTotal / anos.length;
        }
        
        // Texto de conclusão
        doc.setFont(this.config.fonts.normal.name, this.config.fonts.normal.style);
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        
        const conclusaoTexto = [
            `A simulação do impacto do Split Payment no fluxo de caixa da empresa demonstra `,
            `que haverá uma alteração significativa na dinâmica financeira durante o período de `,
            `transição (2026-2033). O impacto inicial em 2026 é estimado em ${formatarBRL(impactoInicial)}, `,
            `enquanto o impacto final em 2033, com a implementação completa, atinge ${formatarBRL(impactoFinal)}.`,
            `\n\n`,
            `Esta mudança estrutural no sistema tributário exigirá adaptações importantes nos `,
            `processos financeiros e na gestão do capital de giro. Conforme detalhado na seção `,
            `de estratégias de mitigação, recomenda-se uma abordagem proativa, com planejamento `,
            `adequado para cada fase da implementação.`
        ].join('');
        
        const splitConclusao = doc.splitTextToSize(conclusaoTexto, pageWidth - margins.left - margins.right);
        doc.text(splitConclusao, margins.left, currentY);
        
        currentY += splitConclusao.length * 5 + 10;
        
        // Seção de recomendações
        doc.setFont(this.config.fonts.subtitle.name, this.config.fonts.subtitle.style);
        doc.setFontSize(14);
        doc.setTextColor(70, 70, 70);
        doc.text('6.1. Recomendações', margins.left, currentY);
        
        currentY += 10;
        
        // Lista de recomendações
        doc.setFont(this.config.fonts.normal.name, this.config.fonts.normal.style);
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        
        const recomendacoes = [
            {
                titulo: "Preparação Antecipada:",
                texto: "Inicie o planejamento e as adaptações necessárias com pelo menos um ano de antecedência ao início da implementação do Split Payment."
            },
            {
                titulo: "Monitoramento Contínuo:",
                texto: "Estabeleça indicadores-chave para monitorar o impacto no fluxo de caixa e avalie periodicamente a eficácia das estratégias de mitigação adotadas."
            },
            {
                titulo: "Estrutura Financeira Robusta:",
                texto: "Fortaleça a estrutura de capital e mantenha linhas de crédito disponíveis para suprir eventuais necessidades adicionais de capital de giro."
            },
            {
                titulo: "Revisão Periódica da Simulação:",
                texto: "Atualize esta simulação sempre que houver alterações significativas na legislação ou nos parâmetros do negócio."
            },
            {
                titulo: "Consultoria Especializada:",
                texto: "Considere o suporte de consultores especializados em tributação e gestão financeira para implementar as estratégias mais adequadas ao seu negócio."
            }
        ];
        
        // Adicionar cada recomendação
        for (let i = 0; i < recomendacoes.length; i++) {
            const recomendacao = recomendacoes[i];
            
            // Título da recomendação
            doc.setFont(this.config.fonts.normal.name, 'bold');
            doc.text(`• ${recomendacao.titulo}`, margins.left, currentY);
            
            currentY += 5;
            
            // Texto da recomendação
            doc.setFont(this.config.fonts.normal.name, 'normal');
            
            const splitTexto = doc.splitTextToSize(recomendacao.texto, pageWidth - margins.left - margins.right - 10);
            doc.text(splitTexto, margins.left + 10, currentY);
            
            currentY += splitTexto.length * 5 + 5;
        }
        
        currentY += 10;
        
        // Quadro final de contato
        const boxWidth = pageWidth - margins.left - margins.right;
        const boxHeight = 40;
        const boxX = margins.left;
        const boxY = currentY;
        
        // Desenhar gradiente para o quadro
        this._desenharGradiente(doc, boxX, boxY, boxX + boxWidth, boxY + boxHeight, 
            [240, 248, 255], [230, 240, 250]);
        
        // Adicionar borda
        doc.setDrawColor(180, 200, 220);
        doc.setLineWidth(0.5);
        doc.rect(boxX, boxY, boxWidth, boxHeight);
        
        // Conteúdo do quadro
        doc.setFont(this.config.fonts.section.name, this.config.fonts.section.style);
        doc.setFontSize(12);
        doc.setTextColor(this.config.colors.primary[0], this.config.colors.primary[1], this.config.colors.primary[2]);
        doc.text('Entre em contato para um diagnóstico personalizado', margins.left + 5, boxY + 15);
        
        doc.setFont(this.config.fonts.normal.name, this.config.fonts.normal.style);
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text('Este relatório foi gerado pelo Simulador de Split Payment desenvolvido pela Expertzy Inteligência Tributária.', margins.left + 5, boxY + 25);
        doc.text('Para obter um diagnóstico personalizado e aprofundado, entre em contato: contato@expertzy.com.br', margins.left + 5, boxY + 32);
        
        currentY += boxHeight + 10;
        
        // Numeração da página
        this._adicionarNumeroPagina(doc, pageNumber);
        
        return currentY;
    },
    
    /**
     * Adiciona cabeçalho e rodapé em todas as páginas
     * @private
     * @param {jsPDF} doc - Documento PDF
     * @param {number} pageCount - Número total de páginas
     */
    _adicionarCabecalhoRodape: function(doc, pageCount) {
        // Percorrer todas as páginas (exceto a capa)
        for (let i = 2; i <= pageCount; i++) {
            doc.setPage(i);
            
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margins = this.config.margins;
            
            // Cabeçalho
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(margins.left, margins.top - 5, pageWidth - margins.right, margins.top - 5);
            
            // Logo no cabeçalho (se disponível)
            if (this.config.logoEnabled) {
                try {
                    const logoImg = document.querySelector('img.logo');
                    if (logoImg && logoImg.complete) {
                        const logoWidth = 25;
                        const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
                        
                        doc.addImage(
                            logoImg, 
                            'PNG', 
                            margins.left, 
                            margins.top - 15, 
                            logoWidth, 
                            logoHeight
                        );
                    }
                } catch (e) {
                    console.warn('Não foi possível adicionar o logo no cabeçalho:', e);
                }
            }
            
            // Título no cabeçalho
            doc.setFont(this.config.fonts.normal.name, 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('Simulador de Split Payment - Relatório', pageWidth - margins.right, margins.top - 8, { align: 'right' });
            
            // Rodapé
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(margins.left, pageHeight - margins.bottom + 10, pageWidth - margins.right, pageHeight - margins.bottom + 10);
            
            // Copyright no rodapé
            doc.setFont(this.config.fonts.normal.name, 'italic');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('© 2025 Expertzy Inteligência Tributária', pageWidth / 2, pageHeight - margins.bottom + 18, { align: 'center' });
        }
    },
    
    /**
     * Adiciona número de página
     * @private
     * @param {jsPDF} doc - Documento PDF
     * @param {number} pageNumber - Número da página atual
     */
    _adicionarNumeroPagina: function(doc, pageNumber) {
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margins = this.config.margins;
        
        doc.setFont(this.config.fonts.normal.name, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Página ${pageNumber}`, pageWidth - margins.right, pageHeight - margins.bottom + 18, { align: 'right' });
    },
    
    /**
     * Desenha linha pontilhada
     * @private
     * @param {jsPDF} doc - Documento PDF
     * @param {number} x1 - Coordenada X inicial
     * @param {number} y1 - Coordenada Y inicial
     * @param {number} x2 - Coordenada X final
     * @param {number} y2 - Coordenada Y final
     */
    _desenharLinhaPontilhada: function(doc, x1, y1, x2, y2) {
        doc.setLineDashPattern([1, 1], 0);
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.5);
        doc.line(x1, y1, x2, y2);
        doc.setLineDashPattern([], 0);
    },
    
    /**
     * Desenha gradiente
     * @private
     * @param {jsPDF} doc - Documento PDF
     * @param {number} x1 - Coordenada X inicial
     * @param {number} y1 - Coordenada Y inicial
     * @param {number} x2 - Coordenada X final
     * @param {number} y2 - Coordenada Y final
     * @param {Array} cor1 - Cor inicial [r, g, b]
     * @param {Array} cor2 - Cor final [r, g, b]
     */
    _desenharGradiente: function(doc, x1, y1, x2, y2, cor1, cor2) {
        // Implementação simplificada de gradiente usando retângulos
        const passos = 20;
        const largura = x2 - x1;
        const altura = y2 - y1;
        const passoLargura = largura / passos;
        
        for (let i = 0; i < passos; i++) {
            // Calcular cor interpolada
            const fator = i / passos;
            const r = Math.floor(cor1[0] + fator * (cor2[0] - cor1[0]));
            const g = Math.floor(cor1[1] + fator * (cor2[1] - cor1[1]));
            const b = Math.floor(cor1[2] + fator * (cor2[2] - cor1[2]));
            
            // Definir cor e desenhar retângulo
            doc.setFillColor(r, g, b);
            doc.rect(x1 + i * passoLargura, y1, passoLargura, altura, 'F');
        }
    }
};

// Exportar o módulo
export default PDFExporter;
