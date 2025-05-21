/**
 * Document Exporters
 * Specific implementations for different export formats
 */
import ExportManager from './export-core.js';

/**
 * Base exporter class
 */
class BaseExporter {
    constructor() {
        this.config = {};
    }

    /**
     * Set configuration
     * @param {Object} config - Configuration object
     */
    setConfig(config) {
        this.config = config;
    }

    /**
     * Export method to be implemented by subclasses
     * @param {Object} data - Data to export
     * @param {Object} options - Export options
     * @returns {Promise} Promise resolved after export
     */
    export(data, options) {
        throw new Error('Method not implemented');
    }

    /**
     * Validate required libraries
     * @returns {boolean} True if valid
     */
    validateLibraries() {
        throw new Error('Method not implemented');
    }
}

/**
 * PDF Exporter
 * Handles PDF document generation
 */
class PDFExporter extends BaseExporter {
    constructor() {
        super();
    }

    /**
     * Validate required libraries
     * @returns {boolean} True if valid
     */
    validateLibraries() {
        if (!window.jsPDFLoaded && !window.jspdf && !window.jsPDF) {
            console.error('jsPDF library not loaded');
            return false;
        }
        return true;
    }

    /**
     * Export data to PDF
     * @param {Object} simulation - Simulation data to export
     * @param {Object} options - Export options
     * @returns {Promise} Promise resolved after export
     */
    export(simulation, options = {}) {
        console.log("Starting PDF export");

        if (!this.validateLibraries()) {
            return Promise.reject('jsPDF not available');
        }

        // Validar a estrutura dos dados de entrada
        if (!simulation) {
            // Tentar obter da ultima simulação realizada
            if (!window.DataManager || !window.ultimaSimulacao) {
                alert('No simulation performed yet');
                return Promise.reject('Simulation not performed');
            }

            simulation = window.ultimaSimulacao;
        }

        // Validar a estrutura usando o DataManager
        try {
            // Garantir que estamos usando a estrutura aninhada (canônica)
            let dadosSimulacao;
            if (simulation.dados && simulation.dados.empresa !== undefined) {
                // Já está no formato aninhado
                dadosSimulacao = window.DataManager.validarENormalizar(simulation.dados);
            } else if (simulation.empresa !== undefined) {
                // É uma estrutura aninhada direta
                dadosSimulacao = window.DataManager.validarENormalizar(simulation);
            } else {
                // Provavelmente está em formato plano, converter
                dadosSimulacao = window.DataManager.converterParaEstruturaAninhada(simulation);
            }

            // Garantir que os resultados existem e estão em formato adequado
            let resultadosSimulacao;
            if (simulation.resultados) {
                resultadosSimulacao = simulation.resultados;
            } else if (simulation.impactoBase) {
                // Os resultados já estão no nível raiz
                resultadosSimulacao = simulation;
            } else {
                throw new Error('Estrutura de resultados inválida');
            }

            // Get export results from any location
            const resultadosExportacao = resultadosSimulacao.resultadosExportacao || 
                                      (resultadosSimulacao && 
                                       resultadosSimulacao.resultadosExportacao);

            if (!resultadosExportacao) {
                console.warn('Resultados para exportação não encontrados. Utilizando resultados brutos.');
            }

            // Request filename from user
            const manager = new ExportManager();
            const filename = manager.requestFilename("pdf", "relatorio-split-payment");
            if (!filename) {
                return Promise.resolve({success: false, message: "Export cancelled by user"});
            }

            // Create PDF document with defined settings
            const doc = new window.jspdf.jsPDF({
                orientation: this.config.pdf.orientation || "portrait",
                unit: "mm",
                format: this.config.pdf.pageSize || "a4",
                compress: true
            });

            // Set document properties
            doc.setProperties({
                title: "Relatório Simulador de Split Payment",
                subject: "Análise do impacto do Split Payment no fluxo de caixa",
                author: "Expertzy Inteligência Tributária",
                keywords: "Split Payment, Reforma Tributária, Fluxo de Caixa, Simulação",
                creator: "Expertzy IT"
            });

            // Initialize page count for numbering
            let pageCount = 1;
            let currentPositionY = 0;
            const margins = this.config.pdf.margins;

            // Add cover page
            this._addCover(doc, dadosSimulacao, pageCount);
            doc.addPage();
            pageCount++;

            // Add index
            currentPositionY = this._addIndex(doc, pageCount);
            doc.addPage();
            pageCount++;

            // Add simulation parameters
            currentPositionY = this._addSimulationParameters(doc, dadosSimulacao, pageCount);
            doc.addPage();
            pageCount++;

            // Add simulation results - robust version
            currentPositionY = this._addRobustSimulationResults(
                doc, 
                simulation, 
                resultadosExportacao || resultadosSimulacao,
                pageCount
            );
            doc.addPage();
            pageCount++;

            // Add charts - with existence check
            currentPositionY = this._addRobustCharts(doc, pageCount);
            doc.addPage();
            pageCount++;

            // Add strategy analysis - with existence check
            currentPositionY = this._addRobustStrategyAnalysis(
                doc, 
                dadosSimulacao, 
                resultadosSimulacao, 
                pageCount
            );
            doc.addPage();
            pageCount++;

            // Add calculation memory
            const getMemoryCalculation = function() {
                const selectedYear =
                    document.getElementById("select-ano-memoria")?.value ||
                    (window.memoriaCalculoSimulacao ? Object.keys(window.memoriaCalculoSimulacao)[0] : "2026");
                return window.memoriaCalculoSimulacao && window.memoriaCalculoSimulacao[selectedYear]
                    ? window.memoriaCalculoSimulacao[selectedYear]
                    : "Calculation memory not available for the selected year.";
            };
            currentPositionY = this._addMemoryCalculation(doc, getMemoryCalculation, pageCount);
            doc.addPage();
            pageCount++;

            // Add conclusion
            const equivalentRates = simulation.aliquotasEquivalentes || {};
            currentPositionY = this._addRobustConclusion(
                doc, 
                dadosSimulacao, 
                resultadosSimulacao, 
                pageCount, 
                equivalentRates
            );

            // Add header and footer to all pages (except cover)
            this._addHeaderFooter(doc, pageCount);

            // Save file
            doc.save(filename);

            return Promise.resolve({
                success: true,
                message: "Report exported successfully!",
                fileName: filename
            });
        } catch (error) {
            console.error(`Error exporting to PDF: ${error.message}`, error);
            alert(`Error exporting to PDF: ${error.message}`);

            return Promise.reject({
                success: false,
                message: `Error exporting to PDF: ${error.message}`,
                error: error
            });
        }
    }

    // Métodos auxiliares do PDF
    _addCover(doc, data, pageNumber) {
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margins = this.config.pdf.margins;

        // Fundo gradiente sutil na capa
        this._drawGradient(doc, 0, 0, pageWidth, pageHeight, [240, 240, 240], [220, 220, 220]);

        let currentY = 50;

        // Logo
        if (this.config.pdf.logoEnabled) {
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
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);

        const tituloPrincipal = 'RELATÓRIO DE SIMULAÇÃO';
        doc.text(tituloPrincipal, pageWidth / 2, currentY, { align: 'center' });
        currentY += 10;

        const subtitulo = 'IMPACTO DO SPLIT PAYMENT NO FLUXO DE CAIXA';
        doc.text(subtitulo, pageWidth / 2, currentY, { align: 'center' });
        currentY += 30;

        // Informações da empresa
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);

        // Utilizar os formatos padronizados e consistentes do DataManager
        const formatadorManager = new ExportManager();

        // Obter regimes de forma segura
        const regimeMap = {
            'real': 'Lucro Real',
            'presumido': 'Lucro Presumido',
            'simples': 'Simples Nacional'
        };

        let regimeText = '';
        if (data && data.empresa && data.empresa.regime) {
            regimeText = regimeMap[data.empresa.regime] || data.empresa.regime || '';
        }

        // Obter setor (usando DataManager para obter setores)
        let setorText = '';
        if (data && data.empresa && data.empresa.setor) {
            // Tentar obter o setor formatado do repositório de setores se disponível
            if (window.SetoresRepository && typeof window.SetoresRepository.obterSetor === 'function') {
                const setor = window.SetoresRepository.obterSetor(data.empresa.setor);
                if (setor && setor.nome) {
                    setorText = setor.nome;
                } else {
                    setorText = formatadorManager.capitalizeFirstLetter(data.empresa.setor);
                }
            } else {
                setorText = formatadorManager.capitalizeFirstLetter(data.empresa.setor);
            }
        }

        // Montar informações da empresa
        const infoText = [
            `Empresa: ${data?.empresa?.nome || 'N/A'}`,
            `Setor: ${setorText || 'N/A'}`,
            `Regime Tributário: ${regimeText || 'N/A'}`,
            `Data: ${new Date().toLocaleDateString('pt-BR')}`
        ];

        infoText.forEach(text => {
            doc.setFont("helvetica", "bold");
            doc.text(text, pageWidth / 2, currentY, { align: 'center' });
            doc.setFont("helvetica", "normal");
            currentY += 10;
        });

        currentY += 30;

        // Detalhes do simulador
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);

        // Obter anos do cronograma usando DataManager
        let anoInicial = '';
        let anoFinal = '';

        if (data && data.parametrosSimulacao) {
            if (data.parametrosSimulacao.dataInicial) {
                anoInicial = data.parametrosSimulacao.dataInicial.split('-')[0] || '2026';
            }

            if (data.parametrosSimulacao.dataFinal) {
                anoFinal = data.parametrosSimulacao.dataFinal.split('-')[0] || '2033';
            }
        }

        if (!anoInicial) anoInicial = '2026';
        if (!anoFinal) anoFinal = '2033';

        const detailText = `Simulação para o período ${anoInicial} - ${anoFinal}`;

        doc.text(detailText, pageWidth / 2, currentY, { align: 'center' });

        // Rodapé da capa
        const footerY = pageHeight - margins.bottom - 10;
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);

        doc.text('© 2025 Expertzy Inteligência Tributária', pageWidth / 2, footerY, { align: 'center' });
        doc.text('Confidencial - Uso Interno', pageWidth / 2, footerY + 5, { align: 'center' });

        return doc;
    }

    _addIndex(doc, pageNumber) {
        const margins = this.config.pdf.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top;

        // Título
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('Índice', pageWidth / 2, currentY, { align: 'center' });
        currentY += 20;

        // Itens do índice
        doc.setFont("helvetica", "normal");
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
            const startX = doc.getStringUnitWidth(item.texto) * doc.internal.getFontSize() / doc.internal.scaleFactor + margins.left + 10;
            const endX = pageWidth - margins.right - 15;
            this._drawDottedLine(doc, startX, currentY - 2, endX, currentY - 2);
            
            // Número da página
            doc.text(item.pagina.toString(), pageWidth - margins.right - 10, currentY, { align: 'right' });
            
            currentY += 12;
        });

        return currentY;
    }

    _addSimulationParameters(doc, data, pageNumber) {
        const margins = this.config.pdf.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top;

        // Título
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('1. Parâmetros da Simulação', margins.left, currentY);
        currentY += 15;

        // Linha separadora
        doc.setDrawColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.line(margins.left, currentY, pageWidth - margins.right, currentY);
        currentY += 10;

        // Inicializar formatador para usar métodos padronizados
        const manager = new ExportManager();

        // Formatadores para usar métodos consistentes
        const formatCurrency = (valor) => {
            if (typeof window.DataManager !== 'undefined' && typeof window.DataManager.formatarMoeda === 'function') {
                return window.DataManager.formatarMoeda(valor);
            }
            return manager.formatCurrency(valor);
        };

        const formatPercentage = (valor) => {
            if (typeof window.DataManager !== 'undefined' && typeof window.DataManager.formatarPercentual === 'function') {
                return window.DataManager.formatarPercentual(valor * 100);
            }
            return manager.formatPercentage(valor * 100);
        };

        // Seção 1.1 - Dados da Empresa
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text('1.1. Dados da Empresa', margins.left, currentY);
        currentY += 10;

        // Dados empresa
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);

        // Obter valores da estrutura canônica
        let nomeEmpresa = data?.empresa?.nome || 'N/A';

        let setor = 'N/A';
        if (data?.empresa?.setor) {
            // Tentar obter o setor formatado do repositório
            if (window.SetoresRepository && typeof window.SetoresRepository.obterSetor === 'function') {
                const setorObj = window.SetoresRepository.obterSetor(data.empresa.setor);
                if (setorObj && setorObj.nome) {
                    setor = setorObj.nome;
                } else {
                    setor = manager.capitalizeFirstLetter(data.empresa.setor);
                }
            } else {
                setor = manager.capitalizeFirstLetter(data.empresa.setor);
            }
        }

        // Regime tributário formatado
        let regimeTributario = manager.getTaxRegimeFormatted(data?.empresa?.regime || '');

        // Faturamento e margem com validação de tipo
        const faturamento = typeof data?.empresa?.faturamento === 'number' ? formatCurrency(data.empresa.faturamento) : 'N/A';
        const margem = typeof data?.empresa?.margem === 'number' ? formatPercentage(data.empresa.margem) : 'N/A';

        const dadosEmpresa = [
            { label: "Empresa:", valor: nomeEmpresa },
            { label: "Setor:", valor: setor },
            { label: "Regime Tributário:", valor: regimeTributario },
            { label: "Faturamento Mensal:", valor: faturamento },
            { label: "Margem Operacional:", valor: margem }
        ];

        dadosEmpresa.forEach(item => {
            doc.setFont("helvetica", "bold");
            doc.text(item.label, margins.left, currentY);
            doc.setFont("helvetica", "normal");
            doc.text(item.valor, margins.left + 50, currentY);
            currentY += 8;
        });

        currentY += 10;

        // Seção 1.2 - Tributação e Split Payment
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text('1.2. Tributação e Split Payment', margins.left, currentY);
        currentY += 10;

        // Dados tributação
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);

        // Obter valores da estrutura canônica
        const aliquota = typeof data?.parametrosFiscais?.aliquota === 'number' ? 
            formatPercentage(data.parametrosFiscais.aliquota) : 'N/A';

        const reducaoEspecial = typeof data?.ivaConfig?.reducaoEspecial === 'number' ? 
            formatPercentage(data.ivaConfig.reducaoEspecial) : 'N/A';

        const tipoOperacao = data?.parametrosFiscais?.tipoOperacao || 'N/A';

        // Créditos com validação
        let creditosTotais = 0;
        if (data?.parametrosFiscais?.creditos) {
            // Somar todos os créditos disponíveis
            const creditos = data.parametrosFiscais.creditos;
            const creditosKeys = Object.keys(creditos);

            creditosTotais = creditosKeys.reduce((total, key) => {
                return total + (typeof creditos[key] === 'number' ? creditos[key] : 0);
            }, 0);
        }

        const dadosTributacao = [
            { label: "Alíquota Efetiva:", valor: aliquota },
            { label: "Redução Especial:", valor: reducaoEspecial },
            { label: "Tipo de Operação:", valor: tipoOperacao },
            { label: "Créditos Tributários:", valor: formatCurrency(creditosTotais) },
            { label: "Compensação de Créditos:", valor: data?.parametrosFiscais?.compensacao || 'N/A' }
        ];

        dadosTributacao.forEach(item => {
            doc.setFont("helvetica", "bold");
            doc.text(item.label, margins.left, currentY);
            doc.setFont("helvetica", "normal");
            doc.text(item.valor, margins.left + 70, currentY);
            currentY += 8;
        });

        currentY += 10;

        // Seção 1.3 - Ciclo Financeiro
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text('1.3. Ciclo Financeiro', margins.left, currentY);
        currentY += 10;

        // Dados ciclo financeiro
        const pmr = typeof data?.cicloFinanceiro?.pmr === 'number' ? data.cicloFinanceiro.pmr + ' dias' : 'N/A';
        const pmp = typeof data?.cicloFinanceiro?.pmp === 'number' ? data.cicloFinanceiro.pmp + ' dias' : 'N/A';
        const pme = typeof data?.cicloFinanceiro?.pme === 'number' ? data.cicloFinanceiro.pme + ' dias' : 'N/A';

        // Calcular ciclo financeiro
        let cicloFinanceiro = 'N/A';
        if (typeof data?.cicloFinanceiro?.pmr === 'number' && 
            typeof data?.cicloFinanceiro?.pmp === 'number' && 
            typeof data?.cicloFinanceiro?.pme === 'number') {
            cicloFinanceiro = (data.cicloFinanceiro.pmr + data.cicloFinanceiro.pme - data.cicloFinanceiro.pmp) + ' dias';
        }

        // Percentuais com validação
        const percVista = typeof data?.cicloFinanceiro?.percVista === 'number' ? 
            formatPercentage(data.cicloFinanceiro.percVista) : 'N/A';

        const percPrazo = typeof data?.cicloFinanceiro?.percPrazo === 'number' ? 
            formatPercentage(data.cicloFinanceiro.percPrazo) : 'N/A';

        const dadosCiclo = [
            { label: "Prazo Médio de Recebimento:", valor: pmr },
            { label: "Prazo Médio de Pagamento:", valor: pmp },
            { label: "Prazo Médio de Estoque:", valor: pme },
            { label: "Ciclo Financeiro:", valor: cicloFinanceiro },
            { label: "Vendas à Vista:", valor: percVista },
            { label: "Vendas a Prazo:", valor: percPrazo }
        ];

        dadosCiclo.forEach(item => {
            doc.setFont("helvetica", "bold");
            doc.text(item.label, margins.left, currentY);
            doc.setFont("helvetica", "normal");
            doc.text(item.valor, margins.left + 70, currentY);
            currentY += 8;
        });

        currentY += 10;

        // Seção 1.4 - Parâmetros da Simulação
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text('1.4. Parâmetros da Simulação', margins.left, currentY);
        currentY += 10;

        // Dados da simulação
        const dataInicial = data?.parametrosSimulacao?.dataInicial ? 
            manager.formatDateSimple(new Date(data.parametrosSimulacao.dataInicial)) : 'N/A';

        const dataFinal = data?.parametrosSimulacao?.dataFinal ? 
            manager.formatDateSimple(new Date(data.parametrosSimulacao.dataFinal)) : 'N/A';

        const cenario = data?.parametrosSimulacao?.cenario || 'N/A';

        const taxaCrescimento = typeof data?.parametrosSimulacao?.taxaCrescimento === 'number' ? 
            formatPercentage(data.parametrosSimulacao.taxaCrescimento) + ' a.a.' : 'N/A';

        const parametrosSimulacao = [
            { label: "Data Inicial:", valor: dataInicial },
            { label: "Data Final:", valor: dataFinal },
            { label: "Cenário de Crescimento:", valor: cenario },
            { label: "Taxa de Crescimento:", valor: taxaCrescimento }
        ];

        parametrosSimulacao.forEach(item => {
            doc.setFont("helvetica", "bold");
            doc.text(item.label, margins.left, currentY);
            doc.setFont("helvetica", "normal");
            doc.text(item.valor, margins.left + 60, currentY);
            currentY += 8;
        });

        return currentY;
    }

    _addRobustSimulationResults(doc, simulation, exportResults, pageNumber) {
        const margins = this.config.pdf.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;

        // Título da seção
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('2. Resultados da Simulação', margins.left, currentY);
        currentY += 15;

        // Formatadores
        const formatCurrency = (valor) => {
            if (typeof window.DataManager !== 'undefined' && typeof window.DataManager.formatarMoeda === 'function') {
                return window.DataManager.formatarMoeda(valor);
            }
            return new ExportManager().formatCurrency(valor);
        };

        const formatPercentage = (valor) => {
            if (typeof window.DataManager !== 'undefined' && typeof window.DataManager.formatarPercentual === 'function') {
                return window.DataManager.formatarPercentual(valor);
            }

            if (valor === undefined || valor === null || isNaN(parseFloat(valor))) {
                return "0,00%";
            }
            return `${Math.abs(parseFloat(valor)).toFixed(2)}%`;
        };

        // Verificar se temos dados suficientes
        if (exportResults && (exportResults.resultadosPorAno || exportResults.anos)) {
            // Seção 2.1 - Tabela de Resultados
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(70, 70, 70);
            doc.text('2.1. Tabela de Resultados Anuais', margins.left, currentY);
            currentY += 10;

            // Cabeçalho da tabela
            const headers = [
                "Ano",
                "Capital de Giro (Split Payment)",
                "Capital de Giro (Sistema Atual)",
                "Diferença",
                "Variação (%)"
            ];

            // Obter anos de qualquer estrutura válida
            let anos = [];
            if (Array.isArray(exportResults.anos)) {
                anos = exportResults.anos;
            } else if (exportResults.resultadosPorAno) {
                anos = Object.keys(exportResults.resultadosPorAno).sort();
            } else if (simulation.projecaoTemporal && simulation.projecaoTemporal.resultadosAnuais) {
                anos = Object.keys(simulation.projecaoTemporal.resultadosAnuais).sort();
            }

            if (anos.length === 0) {
                // Tentar extrair anos do cronograma
                if (simulation.cronogramaImplementacao) {
                    anos = Object.keys(simulation.cronogramaImplementacao).sort();
                } else {
                    // Usar anos padrão
                    anos = ["2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033"];
                }
            }

            // Preparar dados para a tabela
            const tableData = [];

            // Cabeçalho
            tableData.push(headers);

            // Função auxiliar para obter dados do ano de forma robusta
            const obterDadosAno = (ano) => {
                let resultado = null;

                // Tentar encontrar em várias estruturas possíveis
                if (exportResults.resultadosPorAno && exportResults.resultadosPorAno[ano]) {
                    resultado = exportResults.resultadosPorAno[ano];
                } else if (Array.isArray(exportResults.resultados) && exportResults.resultados[ano]) {
                    resultado = exportResults.resultados[ano];
                } else if (simulation.projecaoTemporal && 
                          simulation.projecaoTemporal.resultadosAnuais && 
                          simulation.projecaoTemporal.resultadosAnuais[ano]) {
                    resultado = simulation.projecaoTemporal.resultadosAnuais[ano];
                } else if (simulation[ano]) {
                    // Formato direto por ano (estrutura plana)
                    resultado = simulation[ano];
                }

                return resultado || {};
            };

            // Dados por ano
            anos.forEach(ano => {
                const dadosAno = obterDadosAno(ano);

                // Extrair valores com segurança
                const capitalGiroSplitPayment = dadosAno.capitalGiroSplitPayment || 
                                               dadosAno.resultadoSplitPayment?.capitalGiroDisponivel ||
                                               dadosAno.impostoDevido || 0;

                const capitalGiroAtual = dadosAno.capitalGiroAtual || 
                                        dadosAno.resultadoAtual?.capitalGiroDisponivel ||
                                        dadosAno.sistemaAtual || 0;

                const diferenca = dadosAno.diferencaCapitalGiro || 
                                 dadosAno.diferenca || 
                                 (capitalGiroSplitPayment - capitalGiroAtual);

                const percentualImpacto = dadosAno.percentualImpacto || 
                                         (capitalGiroAtual !== 0 ? (diferenca / capitalGiroAtual) * 100 : 0);

                tableData.push([
                    ano,
                    formatCurrency(capitalGiroSplitPayment),
                    formatCurrency(capitalGiroAtual),
                    formatCurrency(diferenca),
                    formatPercentage(percentualImpacto)
                ]);
            });

            // Adicionar tabela com cores condicionais
            doc.autoTable({
                startY: currentY,
                head: [tableData[0]],
                body: tableData.slice(1),
                theme: 'grid',
                styles: {
                    fontSize: 9,
                    cellPadding: 2,
                    overflow: 'ellipsize'
                },
                headStyles: {
                    fillColor: this.config.pdf.colors.primary,
                    textColor: 255,
                    fontStyle: 'bold'
                },
                // Adicionar cores condicionais para a coluna de variação
                didDrawCell: function(data) {
                    if (data.section === 'body') {
                        // Colorir células de diferença e variação
                        if (data.column.index === 3 || data.column.index === 4) {
                            // Obter o valor da célula (remover formatação)
                            let valorStr = data.cell.text[0];
                            let valor = 0;

                            if (data.column.index === 3) {
                                // Coluna Diferença - formato R$ X.XXX,XX
                                valor = parseFloat(valorStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
                            } else {
                                // Coluna Variação - formato X,XX%
                                valor = parseFloat(valorStr.replace('%', '').replace(',', '.').trim());
                            }

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

                        // Colorir linhas alternadas
                        if (data.row.index % 2 === 0 && data.column.index === 0) {
                            doc.setFillColor(245, 245, 245);
                            const rowWidth = data.table.columns.reduce((width, column) => width + column.width, 0);
                            doc.rect(data.cell.x, data.cell.y, rowWidth, data.cell.height, 'F');
                        }
                    }
                },
                columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 45 },
                    2: { cellWidth: 45 },
                    3: { cellWidth: 30 },
                    4: { cellWidth: 30 }
                },
                margin: { left: margins.left }
            });

            currentY = doc.lastAutoTable.finalY + 15;

            // Calcular estatísticas para análise
            let variacaoTotal = 0;
            let anoMaiorImpacto = "";
            let valorMaiorImpacto = 0;

            anos.forEach(ano => {
                const dadosAno = obterDadosAno(ano);
                const diferenca = dadosAno.diferencaCapitalGiro || 
                                 dadosAno.diferenca || 
                                 ((dadosAno.capitalGiroSplitPayment || 0) - (dadosAno.capitalGiroAtual || 0));

                variacaoTotal += diferenca;

                if (Math.abs(diferenca) > Math.abs(valorMaiorImpacto)) {
                    valorMaiorImpacto = diferenca;
                    anoMaiorImpacto = ano;
                }
            });

            // Seção 2.2 - Análise dos Resultados
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(70, 70, 70);
            doc.text('2.2. Análise dos Resultados', margins.left, currentY);
            currentY += 10;

            // Texto de análise
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);

            // Formatação de análise baseada nos resultados
            const isImpactoPositivo = variacaoTotal < 0;
            let analiseTexto = isImpactoPositivo ? 
                [
                    `A simulação demonstra que a implementação do Split Payment tende a gerar `,
                    `um impacto financeiro positivo para a empresa ao longo do período de transição, `,
                    `com uma redução acumulada de ${formatCurrency(Math.abs(variacaoTotal))} na necessidade de capital de giro. `,
                    `O ano de ${anoMaiorImpacto} apresenta o maior impacto (${formatCurrency(valorMaiorImpacto)}), `,
                    `indicando um ponto crítico no cronograma de implementação.`
                ].join('') : 
                [
                    `A simulação demonstra que a implementação do Split Payment tende a gerar `,
                    `um impacto financeiro negativo para a empresa ao longo do período de transição, `,
                    `com um aumento acumulado de ${formatCurrency(Math.abs(variacaoTotal))} na necessidade de capital de giro. `,
                    `O ano de ${anoMaiorImpacto} apresenta o maior impacto (${formatCurrency(valorMaiorImpacto)}), `,
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
            this._drawGradient(doc, boxX, boxY, boxX + boxWidth, boxY + boxHeight,
                [245, 245, 245], [235, 235, 235]);

            // Adicionar borda
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.rect(boxX, boxY, boxWidth, boxHeight);

            // Título do box
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
            doc.text('Considerações Importantes:', boxX + 5, boxY + 10);

            // Conteúdo do box
            doc.setFont("helvetica", "normal");
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
        } else {
            // Mensagem quando não há dados suficientes
            doc.setFont("helvetica", "italic");
            doc.setFontSize(12);
            doc.setTextColor(231, 76, 60);
            doc.text("Dados de resultados não disponíveis ou em formato incompatível.", margins.left, currentY);
            currentY += 10;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text("Realize uma nova simulação para gerar o relatório completo.", margins.left, currentY);
            currentY += 20;
        }

        return currentY;
    }

    _addRobustCharts(doc, pageNumber) {
        const margins = this.config.pdf.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;

        // Adicionar cabeçalho da seção
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('3. Análise Gráfica', margins.left, currentY);
        currentY += 15;

        // Capturar e adicionar gráficos da simulação
        try {
            // Lista de gráficos para capturar
            const graficos = [
                {
                    id: 'grafico-fluxo-caixa',
                    titulo: '3.1. Fluxo de Caixa Comparativo',
                    descricao: 'Este gráfico apresenta a comparação do fluxo de caixa entre o sistema atual e o Split Payment, permitindo visualizar o impacto financeiro ao longo do período de transição.'
                },
                {
                    id: 'grafico-capital-giro',
                    titulo: '3.2. Impacto no Capital de Giro',
                    descricao: 'Este gráfico mostra a variação na necessidade de capital de giro, indicando os períodos de maior pressão sobre o fluxo financeiro da empresa.'
                },
                {
                    id: 'grafico-projecao',
                    titulo: '3.3. Projeção de Necessidade de Capital',
                    descricao: 'Este gráfico apresenta a projeção das necessidades adicionais de capital durante o período de transição do Split Payment.'
                },
                {
                    id: 'grafico-decomposicao',
                    titulo: '3.4. Decomposição do Impacto',
                    descricao: 'Este gráfico decompõe os diferentes fatores que contribuem para o impacto total, permitindo identificar os principais componentes do efeito no fluxo de caixa.'
                }
            ];

            // Verificar se existem gráficos no DOM
            const graficoExiste = graficos.some(g => document.getElementById(g.id));

            if (!graficoExiste) {
                // Se não houver gráficos, exibir mensagem
                doc.setFont("helvetica", "italic");
                doc.setFontSize(12);
                doc.text("Não foram encontrados gráficos para incluir no relatório.", margins.left, currentY);
                currentY += 10;
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(11);
                doc.text("Certifique-se de que a simulação foi realizada e os gráficos foram gerados.", margins.left, currentY);
                currentY += 20;
                
                return currentY;
            }

            // Adicionar cada gráfico
            for (let i = 0; i < graficos.length; i++) {
                const grafico = graficos[i];
                const graficoElement = document.getElementById(grafico.id);
                
                if (graficoElement) {
                    // Adicionar título do gráfico
                    doc.setFont("helvetica", "bold");
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
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(9);
                    doc.setTextColor(80, 80, 80);
                    
                    const splitDesc = doc.splitTextToSize(grafico.descricao, pageWidth - margins.left - margins.right);
                    doc.text(splitDesc, margins.left, currentY);
                    currentY += splitDesc.length * 4 + 15;
                    
                    // Verificar se precisa adicionar nova página
                    if (i < graficos.length - 1 && currentY > doc.internal.pageSize.height - margins.bottom - 100) {
                        doc.addPage();
                        pageNumber++;
                        currentY = margins.top + 10;
                    }
                }
            }

            // Adicionar quadro com insights
            const boxWidth = pageWidth - margins.left - margins.right;
            const boxHeight = 50;
            const boxX = margins.left;
            const boxY = currentY;

            // Desenhar fundo do box com gradiente suave
            this._drawGradient(doc, boxX, boxY, boxX + boxWidth, boxY + boxHeight,
                [245, 245, 245], [235, 235, 235]);

            // Adicionar borda
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.rect(boxX, boxY, boxWidth, boxHeight);

            // Título do box
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
            doc.text('Insights da Análise Gráfica:', boxX + 5, boxY + 10);

            // Conteúdo do box
            doc.setFont("helvetica", "normal");
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
        } catch (e) {
            console.warn('Erro ao adicionar gráficos:', e);
            
            // Adicionar mensagem de erro
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(231, 76, 60);
            doc.text('Não foi possível capturar os gráficos. Por favor, verifique se os gráficos foram gerados corretamente na simulação.', 
                     margins.left, currentY);
            currentY += 10;
        }

        return currentY;
    }

    _addRobustStrategyAnalysis(doc, data, simulation, pageNumber) {
        const margins = this.config.pdf.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;

        // Adicionar cabeçalho da seção
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('4. Estratégias de Mitigação', margins.left, currentY);
        currentY += 15;

        // Verificar se há dados de estratégias
        if (!window.resultadosEstrategias) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(12);
            doc.text(
                "Não há dados de estratégias disponíveis. Realize uma simulação de estratégias antes de exportar.",
                margins.left,
                currentY
            );
            return currentY + 20;
        }

        // Texto introdutório
        doc.setFont("helvetica", "normal");
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

        // Formatadores
        const manager = new ExportManager();
        const formatCurrency = manager.formatCurrency.bind(manager);

        const formatPercentage = (valor) => {
            if (valor === undefined || valor === null) {
                return "0,00%";
            }
            return (parseFloat(valor) || 0).toFixed(2) + "%";
        };

        // Impacto original
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text("Impacto Original do Split Payment", margins.left, currentY);
        currentY += 10;

        // Mostrar impacto original
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        const impacto = window.resultadosEstrategias.impactoBase || {};
        const linhasImpacto = [
            `Diferença no Capital de Giro: ${formatCurrency(impacto.diferencaCapitalGiro || 0)}`,
            `Impacto Percentual: ${formatPercentage((impacto.percentualImpacto || 0) / 100)}`,
            `Necessidade Adicional: ${formatCurrency(impacto.necessidadeAdicionalCapitalGiro || 0)}`
        ];
        
        linhasImpacto.forEach((linha) => {
            doc.text(linha, margins.left, currentY);
            currentY += 8;
        });
        
        currentY += 5;

        // Estratégias analisadas - LISTA COMPLETA
        const estrategias = [
            {
                codigo: "ajustePrecos",
                titulo: "4.1. Ajuste de Preços",
                descricao: "Revisão da política de preços para compensar a perda de fluxo de caixa, considerando a elasticidade-preço da demanda do mercado e a posição competitiva da empresa.",
                impacto: "Alto",
                complexidade: "Média",
                eficacia: "75%"
            },
            {
                codigo: "renegociacaoPrazos",
                titulo: "4.2. Renegociação de Prazos",
                descricao: "Renegociação dos prazos de pagamento com fornecedores e de recebimento com clientes, visando equilibrar o ciclo financeiro e compensar a perda de capital de giro.",
                impacto: "Médio",
                complexidade: "Alta",
                eficacia: "60%"
            },
            {
                codigo: "antecipacaoRecebiveis",
                titulo: "4.3. Antecipação de Recebíveis",
                descricao: "Utilização de mecanismos de antecipação de recebíveis para converter vendas a prazo em recursos imediatos, considerando o custo financeiro versus o benefício do fluxo de caixa.",
                impacto: "Alto",
                complexidade: "Baixa",
                eficacia: "80%"
            },
            {
                codigo: "capitalGiro",
                titulo: "4.4. Captação de Capital de Giro",
                descricao: "Obtenção de linhas de crédito específicas para capital de giro, preferencialmente com carência alinhada ao período de transição do Split Payment.",
                impacto: "Alto",
                complexidade: "Média",
                eficacia: "85%"
            },
            {
                codigo: "mixProdutos",
                titulo: "4.5. Ajuste no Mix de Produtos",
                descricao: "Reequilíbrio do mix de produtos e serviços, priorizando itens com ciclo financeiro mais favorável e maior margem para absorver o impacto do Split Payment.",
                impacto: "Médio",
                complexidade: "Alta",
                eficacia: "65%"
            },
            {
                codigo: "meiosPagamento",
                titulo: "4.6. Incentivo a Meios de Pagamento Favoráveis",
                descricao: "Estímulo a modalidades de pagamento que reduzam o prazo médio de recebimento, como pagamentos à vista ou via PIX, oferecendo descontos ou vantagens exclusivas.",
                impacto: "Médio",
                complexidade: "Baixa",
                eficacia: "70%"
            }
        ];

        // Resultados das estratégias
        const resultadosEstrategias = window.resultadosEstrategias.resultadosEstrategias || {};

        // Adicionar cada estratégia
        estrategias.forEach((estrategia, index) => {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
            doc.text(estrategia.titulo, margins.left, currentY);
            currentY += 8;
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            
            const splitDesc = doc.splitTextToSize(estrategia.descricao, pageWidth - margins.left - margins.right);
            doc.text(splitDesc, margins.left, currentY);
            currentY += splitDesc.length * 5 + 5;

            // Obter dados da estratégia
            const dadosEstrategia = resultadosEstrategias[estrategia.codigo];
            
            if (dadosEstrategia) {
                // Exibir efetividade
                doc.setFont("helvetica", "bold");
                doc.text(
                    `Efetividade: ${formatPercentage((dadosEstrategia.efetividadePercentual || 0) / 100)}`,
                    margins.left + 10,
                    currentY
                );
                currentY += 8;
                
                // Exibir detalhes específicos de cada estratégia
                switch (estrategia.codigo) {
                    case "ajustePrecos":
                        doc.text(
                            `Fluxo de Caixa Adicional: ${formatCurrency(dadosEstrategia.fluxoCaixaAdicional || 0)}`,
                            margins.left + 10,
                            currentY
                        );
                        currentY += 8;
                        doc.text(
                            `Custo da Estratégia: ${formatCurrency(dadosEstrategia.custoEstrategia || 0)}`,
                            margins.left + 10,
                            currentY
                        );
                        break;
                        
                    case "renegociacaoPrazos":
                        doc.text(
                            `Impacto no Fluxo de Caixa: ${formatCurrency(dadosEstrategia.impactoFluxoCaixa || 0)}`,
                            margins.left + 10,
                            currentY
                        );
                        currentY += 8;
                        doc.text(
                            `Custo Total: ${formatCurrency(dadosEstrategia.custoTotal || 0)}`,
                            margins.left + 10,
                            currentY
                        );
                        break;
                        
                    case "antecipacaoRecebiveis":
                        doc.text(
                            `Impacto no Fluxo de Caixa: ${formatCurrency(dadosEstrategia.impactoFluxoCaixa || 0)}`,
                            margins.left + 10,
                            currentY
                        );
                        currentY += 8;
                        doc.text(
                            `Custo Total: ${formatCurrency(dadosEstrategia.custoTotalAntecipacao || 0)}`,
                            margins.left + 10,
                            currentY
                        );
                        break;
                        
                    case "capitalGiro":
                        doc.text(
                            `Valor Financiado: ${formatCurrency(dadosEstrategia.valorFinanciamento || 0)}`,
                            margins.left + 10,
                            currentY
                        );
                        currentY += 8;
                        doc.text(
                            `Custo Total: ${formatCurrency(dadosEstrategia.custoTotalFinanciamento || 0)}`,
                            margins.left + 10,
                            currentY
                        );
                        break;
                        
                    case "mixProdutos":
                        doc.text(
                            `Impacto no Fluxo de Caixa: ${formatCurrency(dadosEstrategia.impactoFluxoCaixa || 0)}`,
                            margins.left + 10,
                            currentY
                        );
                        currentY += 8;
                        doc.text(
                            `Custo de Implementação: ${formatCurrency(dadosEstrategia.custoImplementacao || 0)}`,
                            margins.left + 10,
                            currentY
                        );
                        break;
                        
                    case "meiosPagamento":
                        doc.text(
                            `Impacto Líquido: ${formatCurrency(dadosEstrategia.impactoLiquido || 0)}`,
                            margins.left + 10,
                            currentY
                        );
                        currentY += 8;
                        doc.text(
                            `Custo Total do Incentivo: ${formatCurrency(dadosEstrategia.custoTotalIncentivo || 0)}`,
                            margins.left + 10,
                            currentY
                        );
                        break;
                }
            } else {
                doc.setFont("helvetica", "italic");
                doc.text("Dados não disponíveis para esta estratégia.", margins.left + 10, currentY);
            }
            
            currentY += 15;
            
            // Adicionar nova página se necessário
            if (
                currentY > doc.internal.pageSize.height - margins.bottom - 30 &&
                index < estrategias.length - 1
            ) {
                doc.addPage();
                pageNumber++;
                currentY = margins.top;
            }
        });

        // Resultados combinados
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text("4.7. Resultados Combinados", margins.left, currentY);
        currentY += 10;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        // Obter dados da combinação
        const combinado = window.resultadosEstrategias.efeitividadeCombinada || {};
        const linhasCombinado = [
            `Efetividade Total: ${formatPercentage((combinado.efetividadePercentual || 0) / 100)}`,
            `Mitigação Total: ${formatCurrency(combinado.mitigacaoTotal || 0)}`,
            `Custo Total das Estratégias: ${formatCurrency(combinado.custoTotal || 0)}`,
            `Relação Custo-Benefício: ${(combinado.custoBeneficio || 0).toFixed(2)}`
        ];
        
        linhasCombinado.forEach((linha) => {
            doc.text(linha, margins.left, currentY);
            currentY += 8;
        });

        // Adicionar plano de ação
        currentY += 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text("4.8. Plano de Ação Recomendado", margins.left, currentY);
        currentY += 10;

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
                fillColor: this.config.pdf.colors.primary,
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
        return currentY;
    }

    _addMemoryCalculation(doc, getMemoryCalculation, pageNumber) {
        const margins = this.config.pdf.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;

        // Adicionar cabeçalho da seção
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('5. Memória de Cálculo', margins.left, currentY);
        currentY += 15;

        // Texto introdutório
        doc.setFont("helvetica", "normal");
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

        // Obter a memória de cálculo
        let memoriaTexto = "";
        try {
            if (typeof getMemoryCalculation === "function") {
                // É uma função, chamá-la para obter a memória
                memoriaTexto = getMemoryCalculation() || "";
            } else if (getMemoryCalculation && typeof getMemoryCalculation === "object") {
                // É um objeto, pegar o primeiro ano disponível
                const primeiroAno = Object.keys(getMemoryCalculation)[0];
                memoriaTexto = getMemoryCalculation[primeiroAno] || "";
            } else if (window.memoriaCalculoSimulacao) {
                // Tentar obter do objeto global
                const anoSelecionado =
                    document.getElementById("select-ano-memoria")?.value ||
                    Object.keys(window.memoriaCalculoSimulacao)[0];
                memoriaTexto = window.memoriaCalculoSimulacao[anoSelecionado] || "";
            } else {
                // Nada disponível
                memoriaTexto = "Memória de cálculo não disponível.";
            }
        } catch (error) {
            console.error("Erro ao processar memória de cálculo:", error);
            memoriaTexto = "Erro ao processar memória de cálculo: " + error.message;
        }

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
                    doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
                } else {
                    doc.setFont('courier', 'normal');
                    doc.setTextColor(30, 30, 30);
                }

                // Verificar se precisa adicionar nova página
                if (currentY > doc.internal.pageSize.height - margins.bottom - 10) {
                    doc.addPage();
                    pageNumber++;
                    currentY = margins.top + 10;
                }

                // Quebrar linhas longas
                const splitLinha = doc.splitTextToSize(linha, pageWidth - margins.left - margins.right);
                doc.text(splitLinha, margins.left, currentY);
                currentY += splitLinha.length * 3.5;
            }

            // Adicionar nota sobre exportação completa
            currentY += 10;
            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            
            const notaExportacao = [
                "Nota: Para a memória de cálculo completa e detalhada, recomenda-se utilizar a função 'Exportar Memória de Cálculo' ",
                "disponível no simulador, que gera um arquivo de texto contendo todas as etapas do cálculo sem truncamento."
            ].join('');
            
            const splitNota = doc.splitTextToSize(notaExportacao, pageWidth - margins.left - margins.right);
            doc.text(splitNota, margins.left, currentY);
            currentY += splitNota.length * 5;
        } else {
            // Mensagem se não houver memória de cálculo
            doc.setFont("helvetica", "italic");
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text('Memória de cálculo não disponível. Execute a simulação para gerar os dados detalhados.', margins.left, currentY);
            currentY += 10;
        }

        return currentY;
    }

    _addRobustConclusion(doc, data, simulation, pageNumber, equivalentRates) {
        const margins = this.config.pdf.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;

        // Adicionar cabeçalho da seção
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('6. Conclusão e Recomendações', margins.left, currentY);
        currentY += 15;

        // Extrair dados com segurança usando a estrutura canônica
        let empresaNome = data?.empresa?.nome || "a empresa";
        let anoInicial = "";
        let anoFinal = "";
        let variacaoTotal = 0;
        let tendencia = "variação";

        // Obter anos do cronograma
        if (data?.parametrosSimulacao) {
            if (data.parametrosSimulacao.dataInicial) {
                anoInicial = data.parametrosSimulacao.dataInicial.split('-')[0] || '2026';
            }

            if (data.parametrosSimulacao.dataFinal) {
                anoFinal = data.parametrosSimulacao.dataFinal.split('-')[0] || '2033';
            }
        }

        if (!anoInicial) anoInicial = '2026';
        if (!anoFinal) anoFinal = '2033';

        // Obter resultadosExportacao de qualquer localização estruturada
        let resultadosExportacao = null;

        if (simulation) {
            if (simulation.resultadosExportacao) {
                resultadosExportacao = simulation.resultadosExportacao;
            } else if (simulation.resultados && simulation.resultados.resultadosExportacao) {
                resultadosExportacao = simulation.resultados.resultadosExportacao;
            } else if (simulation.projecaoTemporal && simulation.projecaoTemporal.impactoAcumulado) {
                // Usar formato de projeção diretamente
                variacaoTotal = simulation.projecaoTemporal.impactoAcumulado.totalNecessidadeCapitalGiro || 0;
                tendencia = variacaoTotal > 0 ? "aumento" : "redução";
            }
        }

        if (resultadosExportacao) {
            // Usar a estrutura de dados
            const resumo = resultadosExportacao.resumo || {};
            const anos = resultadosExportacao.anos || [];

            if (!anoInicial && anos.length > 0) anoInicial = anos[0];
            if (!anoFinal && anos.length > 0) anoFinal = anos[anos.length - 1];

            variacaoTotal = resumo.variacaoTotal || 0;
            tendencia = resumo.tendenciaGeral || (variacaoTotal > 0 ? "aumento" : "redução");
        } else if (!variacaoTotal && simulation.impactoBase) {
            // Tentar extrair da estrutura do impactoBase
            if (typeof simulation.impactoBase.diferencaCapitalGiro === 'number') {
                // Multipicar por período estimado para ter impacto acumulado
                const anos = parseInt(anoFinal) - parseInt(anoInicial) + 1;
                variacaoTotal = simulation.impactoBase.diferencaCapitalGiro * anos;
            }
            tendencia = variacaoTotal > 0 ? "aumento" : "redução";
        }

        // Formatar números
        const formatCurrency = (valor) => {
            if (typeof window.DataManager !== 'undefined' && typeof window.DataManager.formatarMoeda === 'function') {
                return window.DataManager.formatarMoeda(valor);
            }
            return new ExportManager().formatCurrency(valor);
        };

        // Texto da conclusão
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);

        // Introdução da conclusão
        const conclusaoTexto = `A implementação do Split Payment, conforme simulação realizada para ${empresaNome}, 
        resultará em um ${tendencia} estimado de ${formatCurrency(Math.abs(variacaoTotal))} 
        na necessidade de capital de giro durante o período de ${anoInicial} a ${anoFinal}.`;

        // Dividir texto em linhas
        const linhas = doc.splitTextToSize(conclusaoTexto, pageWidth - margins.left - margins.right);
        doc.text(linhas, margins.left, currentY);
        currentY += linhas.length * 7 + 10;

        // Impacto no fluxo de caixa
        const impactoTexto = `O principal impacto identificado está relacionado à antecipação do recolhimento tributário, 
        que no modelo atual ocorre em média 30-45 dias após o faturamento, e no novo modelo ocorrerá de forma instantânea 
        no momento da transação financeira. Esta mudança afeta diretamente o ciclo financeiro da empresa 
        e sua necessidade de capital de giro.`;

        const linhasImpacto = doc.splitTextToSize(
            impactoTexto,
            pageWidth - margins.left - margins.right
        );

        doc.text(linhasImpacto, margins.left, currentY);
        currentY += linhasImpacto.length * 7 + 10;

        // Seção de recomendações
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text('Recomendações', margins.left, currentY);
        currentY += 10;

        // Lista de recomendações
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);

        const recomendacoes = [
            `1. Planejamento Financeiro: Recomenda-se iniciar imediatamente o planejamento financeiro 
            para adequação ao novo regime, considerando a implementação gradual do Split Payment a partir de 2026.`,

            `2. Estratégias de Mitigação: Conforme análise apresentada na seção 4, 
            sugere-se a implementação de uma combinação de estratégias para minimizar o impacto no fluxo de caixa.`,

            `3. Sistemas: Realizar a adequação dos sistemas de gestão financeira e contábil para operação 
            com o novo modelo de recolhimento tributário.`,

            `4. Monitoramento Contínuo: Manter acompanhamento constante das alterações na regulamentação 
            do Split Payment, que ainda está em fase de definição pelos órgãos competentes.`
        ];

        recomendacoes.forEach((recomendacao) => {
            const linhasRecomendacao = doc.splitTextToSize(
                recomendacao,
                pageWidth - margins.left - margins.right
            );

            doc.text(linhasRecomendacao, margins.left, currentY);
            currentY += linhasRecomendacao.length * 7 + 5;
        });

        // Quadro final de contato
        currentY += 10;
        const boxWidth = pageWidth - margins.left - margins.right;
        const boxHeight = 40;
        const boxX = margins.left;
        const boxY = currentY;

        // Desenhar gradiente para o quadro
        this._drawGradient(doc, boxX, boxY, boxX + boxWidth, boxY + boxHeight,
            [240, 248, 255], [230, 240, 250]);

        // Adicionar borda
        doc.setDrawColor(180, 200, 220);
        doc.setLineWidth(0.5);
        doc.rect(boxX, boxY, boxWidth, boxHeight);

        // Conteúdo do quadro
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('Entre em contato para um diagnóstico personalizado', margins.left + 5, boxY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);

        doc.text('Este relatório foi gerado pelo Simulador de Split Payment desenvolvido pela Expertzy Inteligência Tributária.', 
                margins.left + 5, boxY + 25);
        doc.text('Para obter um diagnóstico personalizado e aprofundado, entre em contato: contato@expertzy.com.br', 
                margins.left + 5, boxY + 32);

        currentY += boxHeight + 10;

        return currentY;
    }

    _addHeaderFooter(doc, pageCount) {
        // Percorrer todas as páginas (exceto a capa)
        for (let i = 2; i <= pageCount; i++) {
            doc.setPage(i);
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margins = this.config.pdf.margins;

            // Cabeçalho
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(margins.left, margins.top - 5, pageWidth - margins.right, margins.top - 5);

            // Logo no cabeçalho (se disponível)
            if (this.config.pdf.logoEnabled) {
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
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('Simulador de Split Payment - Relatório', pageWidth - margins.right, margins.top - 8, { align: 'right' });

            // Rodapé
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(margins.left, pageHeight - margins.bottom + 10, pageWidth - margins.right, pageHeight - margins.bottom + 10);

            // Copyright no rodapé
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('© 2025 Expertzy Inteligência Tributária', pageWidth / 2, pageHeight - margins.bottom + 18, { align: 'center' });

            // Número da página
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margins.right, pageHeight - margins.bottom + 18, { align: 'right' });
        }
    }

    _drawDottedLine(doc, x1, y1, x2, y2) {
        doc.setLineDashPattern([1, 1], 0);
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.5);
        doc.line(x1, y1, x2, y2);
        doc.setLineDashPattern([], 0);
    }

    _drawGradient(doc, x1, y1, x2, y2, color1, color2) {
        // Implementação simplificada de gradiente usando retângulos
        const steps = 20;
        const width = x2 - x1;
        const height = y2 - y1;
        const stepWidth = width / steps;
        
        for (let i = 0; i < steps; i++) {
            // Calcular cor interpolada
            const factor = i / steps;
            const r = Math.floor(color1[0] + factor * (color2[0] - color1[0]));
            const g = Math.floor(color1[1] + factor * (color2[1] - color1[1]));
            const b = Math.floor(color1[2] + factor * (color2[2] - color1[2]));
            
            // Definir cor e desenhar retângulo
            doc.setFillColor(r, g, b);
            doc.rect(x1 + i * stepWidth, y1, stepWidth, height, 'F');
        }
    }
}

/**
 * Excel Exporter
 * Handles Excel document generation
 */
class ExcelExporter extends BaseExporter {
    constructor() {
        super();
    }

    /**
     * Validate required libraries
     * @returns {boolean} True if valid
     */
    validateLibraries() {
        if (typeof XLSX === "undefined") {
            console.error("XLSX library not found");
            return false;
        }
        return true;
    }

    /**
     * Export data to Excel
     * @param {Object} simulation - Simulation data to export
     * @param {Object} options - Export options
     * @returns {Promise} Promise resolved after export
     */
    export(simulation, options = {}) {
        console.log("Starting Excel export");
        
        // Check for library
        if (!this.validateLibraries()) {
            alert("Error exporting: XLSX library not loaded");
            return Promise.reject("XLSX library not loaded");
        }

        return new Promise((resolve, reject) => {
            try {
                // Get simulation data
                if (!window.ultimaSimulacao) {
                    alert("Run a simulation before exporting results.");
                    return reject("No simulation data available");
                }

                const data = window.ultimaSimulacao.dados;
                const results = window.ultimaSimulacao.resultados;

                // Initialize equivalentRates if it doesn't exist
                window.ultimaSimulacao.aliquotasEquivalentes = window.ultimaSimulacao.aliquotasEquivalentes || {};
                const equivalentRates = window.ultimaSimulacao.aliquotasEquivalentes;

                // Check if required data is present
                if (!results || !results.resultadosExportacao || !results.resultadosExportacao.resultadosPorAno) {
                    alert("Invalid results structure. Run a new simulation.");
                    return reject("Invalid results structure");
                }

                // Initialize rates for each year 
                const exportYears = Object.keys(results.resultadosExportacao.resultadosPorAno).sort();
                exportYears.forEach(year => {
                    if (!equivalentRates[year]) {
                        equivalentRates[year] = {
                            valor_atual: results.resultadosExportacao.resultadosPorAno[year].sistemaAtual || 0
                        };
                    }
                });

                // Request filename
                const manager = new ExportManager();
                const filename = manager.requestFilename("xlsx", "relatorio-split-payment");
                if (!filename) {
                    return reject("Export cancelled by user");
                }

                // Create workbook
                const wb = XLSX.utils.book_new();

                // Set workbook properties
                wb.Props = {
                    Title: "Relatório Simulador de Split Payment",
                    Subject: "Análise do impacto do Split Payment no fluxo de caixa",
                    Author: "Expertzy Inteligência Tributária",
                    CreatedDate: new Date()
                };

                // Create and add worksheets
                // 1. Summary Worksheet
                const wsSummary = this._createSummaryWorksheet(data, results, equivalentRates);
                XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

                // 2. Results Worksheet
                const wsResults = this._createResultsWorksheet(data, results);
                XLSX.utils.book_append_sheet(wb, wsResults, "Resultados");

                // 3. Calculation Memory Worksheet (if available)
                if (window.memoriaCalculoSimulacao) {
                    const wsMemory = this._createMemoryWorksheet();
                    XLSX.utils.book_append_sheet(wb, wsMemory, "Memória de Cálculo");
                }

                // Save file
                XLSX.writeFile(wb, filename);

                console.log("Excel exported successfully:", filename);

                resolve({
                    success: true,
                    message: "Excel exported successfully!",
                    fileName: filename
                });
            } catch (error) {
                console.error("Error exporting to Excel:", error);
                alert("Error exporting to Excel. Check console for details.");

                reject({
                    success: false,
                    message: `Error exporting to Excel: ${error.message}`,
                    error: error
                });
            }
        });
    }

    _createSummaryWorksheet(data, results, equivalentRates) {
        // Verificar se temos o DataManager disponível
        const usarDataManager = typeof window.DataManager !== 'undefined';

        // Obter a estrutura aninhada se os dados não estiverem no formato canônico
        let dadosAninhados;
        if (data) {
            if (data.empresa !== undefined) {
                // Já está no formato aninhado
                dadosAninhados = usarDataManager ? 
                    window.DataManager.validarENormalizar(data) : data;
            } else {
                // Está em formato plano, converter
                dadosAninhados = usarDataManager ? 
                    window.DataManager.converterParaEstruturaAninhada(data) : 
                    this._converterParaEstruturaAninhada(data);
            }
        } else {
            // Dados não fornecidos, usar estrutura vazia
            dadosAninhados = {
                empresa: {},
                cicloFinanceiro: {},
                parametrosFiscais: {},
                parametrosSimulacao: {}
            };
        }

        // Formatar dados usando o método padronizado
        const formatarMoeda = (valor) => this._formatarValorPadrao(valor, 'monetario');
        const formatarPercentual = (valor) => this._formatarValorPadrao(valor, 'percentual');
        const formatarData = (valor) => this._formatarValorPadrao(valor, 'data');

        // Dados da planilha
        const summaryData = [
            ["RELATÓRIO DE SIMULAÇÃO - SPLIT PAYMENT"],
            ["Expertzy Inteligência Tributária"],
            ["Data do relatório:", formatarData(new Date())],
            [],
            ["RESUMO EXECUTIVO"],
            [],
            ["Parâmetros Principais"],
            ["Empresa:", dadosAninhados.empresa.nome || ""],
            ["Setor:", this._obterNomeSetor(dadosAninhados.empresa.setor)],
            ["Regime Tributário:", this._obterRegimeTributario(dadosAninhados.empresa.regime)],
            ["Faturamento Anual:", dadosAninhados.empresa.faturamento],
            ["Período de Simulação:", 
                `${dadosAninhados.parametrosSimulacao.dataInicial?.split('-')[0] || '2026'} a ${dadosAninhados.parametrosSimulacao.dataFinal?.split('-')[0] || '2033'}`
            ],
            [],
            ["Resultados Principais"]
        ];

        // Calcular indicadores
        let anos = [];

        // Obter anos considerando várias estruturas possíveis
        if (results) {
            if (Array.isArray(results.anos)) {
                anos = results.anos;
            } else if (results.resultadosPorAno) {
                anos = Object.keys(results.resultadosPorAno).sort();
            } else if (results.projecaoTemporal && results.projecaoTemporal.resultadosAnuais) {
                anos = Object.keys(results.projecaoTemporal.resultadosAnuais).sort();
            } else {
                // Tentar obter anos das chaves diretas do objeto
                anos = Object.keys(results)
                    .filter(k => !isNaN(parseInt(k)) && String(parseInt(k)) === k)
                    .sort();
            }
        }

        if (anos.length === 0) {
            // Usar anos padrão
            anos = ["2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033"];
        }

        let variacaoTotal = 0;
        let maiorImpacto = { valor: 0, ano: "" };
        let menorImpacto = { valor: Number.MAX_SAFE_INTEGER, ano: "" };

        // Função auxiliar para obter resultado de um ano
        const obterResultadoAno = (ano) => {
            let resultado = null;

            // Tentar encontrar em várias estruturas possíveis
            if (results) {
                if (results.resultadosPorAno && results.resultadosPorAno[ano]) {
                    resultado = results.resultadosPorAno[ano];
                } else if (results.projecaoTemporal && 
                           results.projecaoTemporal.resultadosAnuais &&
                           results.projecaoTemporal.resultadosAnuais[ano]) {
                    resultado = results.projecaoTemporal.resultadosAnuais[ano];
                } else if (results[ano]) {
                    // Formato direto por ano
                    resultado = results[ano];
                }
            }

            return resultado || {};
        };

        // Calcular variações e encontrar maior/menor impacto
        anos.forEach((ano) => {
            const resultado = obterResultadoAno(ano);

            // Obter valores com segurança
            const valorAtual = resultado.capitalGiroAtual || 
                              resultado.resultadoAtual?.capitalGiroDisponivel ||
                              (equivalentRates[ano] && equivalentRates[ano].valor_atual) || 0;

            const valorNovo = resultado.capitalGiroSplitPayment || 
                             resultado.resultadoSplitPayment?.capitalGiroDisponivel ||
                             resultado.imposto_devido || 0;

            const diferenca = resultado.diferencaCapitalGiro || 
                             resultado.diferenca || 
                             (valorNovo - valorAtual);

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

        // Determinar se o impacto é predominantemente positivo ou negativo
        const impactoGeral = variacaoTotal > 0 ? "Aumento da carga tributária" : "Redução da carga tributária";

        // Adicionar resultados principais
        summaryData.push(
            ["Impacto Geral:", impactoGeral],
            ["Variação Total Acumulada:", variacaoTotal],
            ["Ano de Maior Impacto:", `${maiorImpacto.ano} (${formatarMoeda(maiorImpacto.valor)})`],
            ["Ano de Menor Impacto:", `${menorImpacto.ano} (${formatarMoeda(menorImpacto.valor)})`],
            []
        );

        // Tabela de resultados resumidos
        summaryData.push(["Resumo Anual"], ["Ano", "IBS + CBS", "Sist. Atual", "Diferença", "Variação (%)"]);

        // Adicionar dados para cada ano
        anos.forEach((ano) => {
            const resultado = obterResultadoAno(ano);

            // Obter valores com segurança
            const valorAtual = resultado.capitalGiroAtual || 
                              resultado.resultadoAtual?.capitalGiroDisponivel ||
                              (equivalentRates[ano] && equivalentRates[ano].valor_atual) || 0;

            const valorNovo = resultado.capitalGiroSplitPayment || 
                             resultado.resultadoSplitPayment?.capitalGiroDisponivel ||
                             resultado.imposto_devido || 0;

            const diferenca = resultado.diferencaCapitalGiro || 
                             resultado.diferenca || 
                             (valorNovo - valorAtual);

            const percentual = valorAtual !== 0 ? diferenca / valorAtual : 0;

            summaryData.push([parseInt(ano), valorNovo, valorAtual, diferenca, percentual]);
        });

        // Estratégias recomendadas
        summaryData.push(
            [],
            ["Estratégias Recomendadas"],
            ["• Ajuste de Preços"],
            ["• Renegociação de Prazos com Fornecedores e Clientes"],
            ["• Antecipação de Recebíveis"],
            ["• Captação de Capital de Giro"],
            ['Para detalhes completos, consulte a planilha "Estratégias de Mitigação"'],
            [],
            ["© 2025 Expertzy Inteligência Tributária - Relatório gerado pelo Simulador de Split Payment"]
        );

        // Criar planilha
        const ws = XLSX.utils.aoa_to_sheet(summaryData);

        // Aplicar estilos à planilha
        this._applySummaryStyles(ws, summaryData, anos.length);

        return ws;
    }

    /**
     * Obtém o nome do regime tributário formatado
     * @private
     * @param {string} regimeCodigo - Código do regime
     * @returns {string} Nome formatado do regime
     */
    _obterRegimeTributario(regimeCodigo) {
        const regimes = {
            'real': 'Lucro Real',
            'presumido': 'Lucro Presumido',
            'simples': 'Simples Nacional',
            'mei': 'Microempreendedor Individual',
            'imune': 'Entidade Imune/Isenta'
        };

        return regimes[regimeCodigo] || regimeCodigo || '';
    }

    /**
     * Obtém o nome do setor formatado
     * @private
     * @param {string} setorCodigo - Código do setor
     * @returns {string} Nome formatado do setor
     */
    _obterNomeSetor(setorCodigo) {
        // Tentar obter o setor do repositório
        if (window.SetoresRepository && typeof window.SetoresRepository.obterSetor === 'function') {
            const setor = window.SetoresRepository.obterSetor(setorCodigo);
            if (setor && setor.nome) {
                return setor.nome;
            }
        }

        // Fallback: capitalizar o código do setor
        return setorCodigo ? 
            setorCodigo.charAt(0).toUpperCase() + setorCodigo.slice(1).toLowerCase() : '';
    }

    /**
     * Conversão simples para estrutura aninhada (fallback quando DataManager não disponível)
     * @private
     * @param {Object} dadosPlanos - Dados em formato plano
     * @returns {Object} Dados em formato aninhado
     */
    _converterParaEstruturaAninhada(dadosPlanos) {
        if (!dadosPlanos) return { empresa: {}, cicloFinanceiro: {}, parametrosFiscais: {}, parametrosSimulacao: {} };

        // Estrutura básica
        const resultado = {
            empresa: {
                nome: dadosPlanos.empresa || '',
                faturamento: dadosPlanos.faturamento || 0,
                margem: dadosPlanos.margem || 0,
                setor: dadosPlanos.setor || '',
                tipoEmpresa: dadosPlanos.tipoEmpresa || '',
                regime: dadosPlanos.regime || ''
            },
            cicloFinanceiro: {
                pmr: dadosPlanos.pmr || 30,
                pmp: dadosPlanos.pmp || 30,
                pme: dadosPlanos.pme || 30,
                percVista: dadosPlanos.percVista || 0.3,
                percPrazo: dadosPlanos.percPrazo || 0.7
            },
            parametrosFiscais: {
                aliquota: dadosPlanos.aliquota || 0.265,
                tipoOperacao: dadosPlanos.tipoOperacao || '',
                regimePisCofins: dadosPlanos.regimePisCofins || '',
                creditos: {
                    pis: dadosPlanos.creditosPIS || 0,
                    cofins: dadosPlanos.creditosCOFINS || 0,
                    icms: dadosPlanos.creditosICMS || 0,
                    ipi: dadosPlanos.creditosIPI || 0,
                    cbs: dadosPlanos.creditosCBS || 0,
                    ibs: dadosPlanos.creditosIBS || 0
                }
            },
            parametrosSimulacao: {
                cenario: dadosPlanos.cenario || 'moderado',
                taxaCrescimento: dadosPlanos.taxaCrescimento || 0.05,
                dataInicial: dadosPlanos.dataInicial || '2026-01-01',
                dataFinal: dadosPlanos.dataFinal || '2033-12-31',
                splitPayment: dadosPlanos.splitPayment !== false
            }
        };

        // Adicionar configuração IVA se disponível
        if (dadosPlanos.aliquotaCBS || dadosPlanos.aliquotaIBS || dadosPlanos.categoriaIva || dadosPlanos.reducaoEspecial) {
            resultado.ivaConfig = {
                cbs: dadosPlanos.aliquotaCBS || 0.088,
                ibs: dadosPlanos.aliquotaIBS || 0.177,
                categoriaIva: dadosPlanos.categoriaIva || 'standard',
                reducaoEspecial: dadosPlanos.reducaoEspecial || 0
            };
        }

        return resultado;
    }

    _createResultsWorksheet(data, results) {
        const manager = new ExportManager();
        
        // Dados da planilha
        const resultsData = [
            ["RESULTADOS DETALHADOS DA SIMULAÇÃO - SPLIT PAYMENT"],
            ["Expertzy Inteligência Tributária"],
            ["Data do relatório:", manager.formatDate(new Date())],
            [],
            ["TABELA DE RESULTADOS ANUAIS"],
            [],
            ["Ano", "Split Payment (R$)", "Sistema Atual (R$)", "Diferença (R$)", "Variação (%)", "Impacto no Fluxo de Caixa"]
        ];

        // Extrair resultados detalhados
        const resultadosExportacao = results.resultadosExportacao || {};
        const resultadosPorAno = resultadosExportacao.resultadosPorAno || {};
        
        // Ordenar anos
        const anos = Object.keys(resultadosPorAno).sort();
        
        // Adicionar dados para cada ano
        anos.forEach(ano => {
            const resultado = resultadosPorAno[ano] || {};
            
            const capitalGiroSplitPayment = resultado.capitalGiroSplitPayment || resultado.impostoDevido || 0;
            const capitalGiroAtual = resultado.capitalGiroAtual || resultado.sistemaAtual || 0;
            const diferenca = resultado.diferenca || (capitalGiroSplitPayment - capitalGiroAtual);
            const percentualImpacto = resultado.percentualImpacto || 
                                     (capitalGiroAtual !== 0 ? (diferenca / capitalGiroAtual) * 100 : 0);
                                     
            // Determinar impacto
            let impactoText = "Neutro";
            if (diferenca > 0) {
                impactoText = "Negativo (Aumento na necessidade de capital)";
            } else if (diferenca < 0) {
                impactoText = "Positivo (Redução na necessidade de capital)";
            }
            
            resultsData.push([
                parseInt(ano),
                capitalGiroSplitPayment,
                capitalGiroAtual,
                diferenca,
                percentualImpacto / 100, // Formato de percentual no Excel
                impactoText
            ]);
        });

        // Adicionar seção de análise
        resultsData.push(
            [],
            ["ANÁLISE DOS RESULTADOS"],
            [],
            ["Impacto Total:", { f: `SUM(D8:D${7 + anos.length})` }],
            ["Impacto Médio Anual:", { f: `AVERAGE(D8:D${7 + anos.length})` }],
            ["Maior Impacto:", { f: `MAX(ABS(D8:D${7 + anos.length}))` }],
            ["Menor Impacto:", { f: `MIN(ABS(D8:D${7 + anos.length}))` }],
            [],
            ["GRÁFICO DE TENDÊNCIA"],
            ["Um gráfico de tendência mostrando a evolução do impacto ao longo dos anos pode ser criado selecionando os dados e usando o recurso de gráficos do Excel."],
            []
        );

        // Criar planilha
        const ws = XLSX.utils.aoa_to_sheet(resultsData);

        // Aplicar estilos
        this._applyResultsStyles(ws, resultsData, anos.length);

        return ws;
    }

    _createMemoryWorksheet() {
        // Selecionar o ano (usando o mesmo mecanismo do PDF)
        const anoSelecionado = document.getElementById("select-ano-memoria")?.value ||
                              (window.memoriaCalculoSimulacao ? Object.keys(window.memoriaCalculoSimulacao)[0] : "2026");
                              
        let memoriaCalculo = window.memoriaCalculoSimulacao && window.memoriaCalculoSimulacao[anoSelecionado]
            ? window.memoriaCalculoSimulacao[anoSelecionado]
            : "Memória de cálculo não disponível para o ano selecionado.";
            
        // Criar dados da planilha
        const memoryData = [
            ["MEMÓRIA DE CÁLCULO - SPLIT PAYMENT"],
            ["Expertzy Inteligência Tributária"],
            ["Ano de Referência:", anoSelecionado],
            ["Data do relatório:", new ExportManager().formatDate(new Date())],
            [],
            ["DETALHAMENTO DOS CÁLCULOS"],
            []
        ];

        // Processar memória de cálculo
        if (typeof memoriaCalculo === 'string') {
            // Dividir em linhas
            const linhas = memoriaCalculo.split('\n');
            
            // Adicionar cada linha como nova linha na planilha
            linhas.forEach(linha => {
                memoryData.push([linha]);
            });
        } else {
            memoryData.push(["Memória de cálculo não disponível ou em formato inválido."]);
        }

        // Criar planilha
        const ws = XLSX.utils.aoa_to_sheet(memoryData);

        // Aplicar estilos básicos
        const estilos = [];
        
        // Título principal
        estilos.push({
            range: { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
            style: {
                font: { bold: true, sz: 16, color: { rgb: this.config.excel.colors.primary } },
                alignment: { horizontal: "center" }
            }
        });
        
        // Subtítulo
        estilos.push({
            range: { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
            style: {
                font: { bold: true, sz: 14, color: { rgb: this.config.excel.colors.neutral } },
                alignment: { horizontal: "center" }
            }
        });
        
        // Título da seção memória
        estilos.push({
            range: { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } },
            style: {
                font: { bold: true, sz: 14, color: { rgb: this.config.excel.colors.primary } },
                fill: { fgColor: { rgb: this.config.excel.colors.headerBg } },
                alignment: { horizontal: "center" },
                border: {
                    bottom: { style: "medium", color: { rgb: this.config.excel.colors.primary } }
                }
            }
        });

        // Definir largura das colunas
        ws['!cols'] = [
            { wch: 120 } // Coluna A - Extra larga para acomodar texto da memória
        ];

        return ws;
    }

    _applySummaryStyles(ws, data, yearsCount) {
        // Implementação básica para aplicar estilos à planilha de resumo
        // Aqui você implementaria os estilos conforme necessário
        
        // Exemplo de como definir a largura das colunas
        ws['!cols'] = [
            { wch: 25 }, // Coluna A
            { wch: 15 }, // Coluna B
            { wch: 15 }, // Coluna C
            { wch: 15 }, // Coluna D
            { wch: 15 }  // Coluna E
        ];

        // Exemplo de como mesclar células (como para títulos)
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } } // Mesclar primeira linha do título
        ];

        return ws;
    }

    _applyResultsStyles(ws, data, yearsCount) {
        // Implementação básica para aplicar estilos à planilha de resultados
        
        // Definir largura das colunas
        ws['!cols'] = [
            { wch: 10 }, // Ano
            { wch: 20 }, // Split Payment
            { wch: 20 }, // Sistema Atual
            { wch: 20 }, // Diferença
            { wch: 15 }, // Variação
            { wch: 40 }  // Impacto
        ];

        // Mesclar células de título
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } } // Mesclar primeira linha do título
        ];

        return ws;
    }
    
    /**
     * Aplica a formatação padrão para os valores nos relatórios
     * @param {any} valor - Valor a ser formatado
     * @param {string} tipo - Tipo de formatação ('monetario', 'percentual', 'data', 'texto')
     * @returns {any} Valor formatado
     */
    _formatarValorPadrao(valor, tipo) {
        // Verificar se temos o DataManager disponível
        if (typeof window.DataManager !== 'undefined') {
            switch (tipo) {
                case 'monetario':
                    if (typeof window.DataManager.formatarMoeda === 'function') {
                        return window.DataManager.formatarMoeda(valor);
                    }
                    break;
                case 'percentual':
                    if (typeof window.DataManager.formatarPercentual === 'function') {
                        return window.DataManager.formatarPercentual(valor * 100);
                    }
                    break;
                case 'data':
                    if (typeof window.DataManager.formatarData === 'function') {
                        return window.DataManager.formatarData(valor);
                    }
                    break;
            }
        }

        // Fallback para o ExportManager
        const manager = new ExportManager();

        switch (tipo) {
            case 'monetario':
                return manager.formatCurrency(valor);
            case 'percentual':
                return manager.formatPercentage(valor * 100);
            case 'data':
                return manager.formatDate(new Date(valor));
            default:
                return valor ? valor.toString() : '';
        }
    }
}

// Export the classes
export { PDFExporter, ExcelExporter };
