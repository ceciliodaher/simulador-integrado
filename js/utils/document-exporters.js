'use strict';

/**
 * Document Exporters
 * Specific implementations for different export formats
 */

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
    export(data, options) { // eslint-disable-line no-unused-vars
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
            console.error('PDFExporter: jsPDF library not loaded');
            return false;
        }
        return true;
    }

    /**
     * Export data to PDF
     * @param {Object} simulationInput - Simulation data to export, can be flat or nested.
     * @param {Object} options - Export options
     * @returns {Promise} Promise resolved after export
     */
    export(simulationInput, options = {}) { // eslint-disable-line no-unused-vars
        console.log("PDFExporter: Starting PDF export");

        if (!this.validateLibraries()) {
            return Promise.reject('jsPDF not available');
        }

        let dadosAninhados;
        let resultadosSimulacao;
        let simulationToProcess = simulationInput;

        try {
            // Ensure simulationToProcess has a value
            if (!simulationToProcess) {
                if (typeof window.DataManager === 'undefined' || !window.ultimaSimulacao) {
                    alert('PDFExporter: No simulation data available to process.');
                    console.error('PDFExporter: No simulation data provided and DataManager or window.ultimaSimulacao is not available.');
                    return Promise.reject('No simulation data available');
                }
                simulationToProcess = window.ultimaSimulacao;
                console.log("PDFExporter: Using window.ultimaSimulacao as input.");
            }

            // Data Conversion & Validation using DataManager
            if (typeof window.DataManager !== 'undefined' && window.DataManager) {
                console.log("PDFExporter: DataManager found. Processing data...");
                try {
                    const rawData = simulationToProcess.dados || simulationToProcess;
                    dadosAninhados = window.DataManager.converterParaEstruturaAninhada(rawData);
                    dadosAninhados = window.DataManager.validarENormalizar(dadosAninhados);
                    
                    // Handle results data - this assumes results are part of the main simulation object
                    // or will be part of the `dadosAninhados` after normalization.
                    if (simulationToProcess.resultados) {
                        // If DataManager has a specific method for results, it should be used.
                        // For now, assume results are either already in good shape or part of the main validation.
                        resultadosSimulacao = simulationToProcess.resultados; 
                    } else if (dadosAninhados && dadosAninhados.resultados) { // Results might be part of normalized data
                        resultadosSimulacao = dadosAninhados.resultados;
                    } else if (simulationToProcess.impactoBase) { // Older structure
                        resultadosSimulacao = simulationToProcess; // Results are at root level
                    } else {
                        resultadosSimulacao = dadosAninhados; // Fallback: use the whole normalized data
                        console.warn('PDFExporter: Simulation results not found under "resultados" or "impactoBase". Using normalized data as fallback for results.');
                    }
                    console.log("PDFExporter: DataManager data processing successful.");

                } catch (dmError) {
                    console.error('PDFExporter: DataManager error during data processing:', dmError, dmError.stack);
                    alert(`PDFExporter: Error processing data with DataManager: ${dmError.message}. Attempting to proceed with raw data.`);
                    // Fallback to using raw data if DataManager processing fails
                    dadosAninhados = simulationToProcess.dados || simulationToProcess;
                    resultadosSimulacao = simulationToProcess.resultados || simulationToProcess;
                }
            } else {
                console.warn('PDFExporter: DataManager not found. Proceeding with raw simulation data. Validation and normalization will be skipped. Report accuracy may be affected.');
                // Fallback: use data as is, trying to guess its structure.
                if (simulationToProcess.dados && typeof simulationToProcess.dados.empresa !== 'undefined') {
                    dadosAninhados = simulationToProcess.dados; // Likely already nested within .dados
                } else if (typeof simulationToProcess.empresa !== 'undefined') {
                    dadosAninhados = simulationToProcess; // Likely a direct nested structure
                } else {
                    dadosAninhados = simulationToProcess; // Unknown structure, pass as is
                    console.warn("PDFExporter: Input data structure is unknown due to DataManager unavailability.");
                }
                // Fallback for results data
                resultadosSimulacao = simulationToProcess.resultados || simulationToProcess;
            }
            
            // Ensure resultadosExportacao is derived correctly
            // It might be nested within resultadosSimulacao or be resultadosSimulacao itself
            let resultadosExportacao = resultadosSimulacao?.resultadosExportacao || resultadosSimulacao;

            if (!resultadosExportacao || (typeof resultadosExportacao.resultadosPorAno === 'undefined' && typeof resultadosSimulacao?.resultadosPorAno === 'undefined')) {
                console.warn('PDFExporter: "resultadosExportacao" or "resultadosPorAno" not found in results data. Some report sections might be incomplete or use fallbacks.');
                 // If results are completely missing, use an empty object to prevent further errors in helper methods
                if (!resultadosExportacao) resultadosExportacao = {};
            }

            // Request filename from user
            const manager = new ExportManager(); // This is a utility class, not DataManager
            const filename = manager.requestFilename("pdf", "relatorio-split-payment");
            if (!filename) {
                console.log("PDFExporter: Export cancelled by user.");
                return Promise.resolve({success: false, message: "Export cancelled by user"});
            }

            // Create PDF document
            const doc = new window.jspdf.jsPDF({
                orientation: this.config.pdf?.orientation || "portrait",
                unit: "mm",
                format: this.config.pdf?.pageSize || "a4",
                compress: true
            });

            doc.setProperties({
                title: "Relatório Simulador de Split Payment",
                subject: "Análise do impacto do Split Payment no fluxo de caixa",
                author: "Expertzy Inteligência Tributária",
                keywords: "Split Payment, Reforma Tributária, Fluxo de Caixa, Simulação",
                creator: "Expertzy IT"
            });

            let pageCount = 1;

            // Pass `dadosAninhados` to all helper methods that require simulation configuration/parameters.
            // Pass `resultadosSimulacao` or `resultadosExportacao` to methods dealing with results.
            this._addCover(doc, dadosAninhados, pageCount);
            doc.addPage(); pageCount++;
            this._addIndex(doc, pageCount); // currentPositionY was unused
            doc.addPage(); pageCount++;
            this._addSimulationParameters(doc, dadosAninhados, pageCount);
            doc.addPage(); pageCount++;
            this._addRobustSimulationResults(doc, dadosAninhados, resultadosExportacao, pageCount);
            doc.addPage(); pageCount++;
            this._addRobustCharts(doc, pageCount);
            doc.addPage(); pageCount++;
            this._addRobustStrategyAnalysis(doc, dadosAninhados, resultadosSimulacao, pageCount);
            doc.addPage(); pageCount++;
            
            const getMemoryCalculation = function() { // This remains largely global or UI-dependent
                const selectedYear = document.getElementById("select-ano-memoria")?.value ||
                                     (window.memoriaCalculoSimulacao ? Object.keys(window.memoriaCalculoSimulacao)[0] : "2026");
                return window.memoriaCalculoSimulacao && window.memoriaCalculoSimulacao[selectedYear]
                    ? window.memoriaCalculoSimulacao[selectedYear]
                    : "Calculation memory not available for the selected year.";
            };
            this._addMemoryCalculation(doc, getMemoryCalculation, pageCount);
            doc.addPage(); pageCount++;

            const equivalentRates = dadosAninhados?.aliquotasEquivalentes || {}; // From normalized data
            this._addRobustConclusion(doc, dadosAninhados, resultadosSimulacao, pageCount, equivalentRates);
            
            this._addHeaderFooter(doc, pageCount);
            doc.save(filename);

            console.log("PDFExporter: PDF exported successfully:", filename);
            return Promise.resolve({ success: true, message: "Report exported successfully!", fileName: filename });

        } catch (error) {
            console.error(`PDFExporter: Critical error during PDF export: ${error.message}`, error.stack);
            alert(`PDFExporter: Critical error exporting to PDF: ${error.message}. Check console for details.`);
            return Promise.reject({ success: false, message: `Error exporting to PDF: ${error.message}`, error: error });
        }
    }

    // Helper methods now primarily use `dadosAninhados` for configuration/parameters
    // and `resultadosSimulacao` or specific parts of it for results.

    _addCover(doc, dadosAninhados, pageNumber) { // eslint-disable-line no-unused-vars
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margins = this.config.pdf.margins;
        this._drawGradient(doc, 0, 0, pageWidth, pageHeight, [240, 240, 240], [220, 220, 220]);
        let currentY = 50;

        if (this.config.pdf.logoEnabled) {
            try {
                const logoImg = document.querySelector('img.logo');
                if (logoImg && logoImg.complete) {
                    const logoWidth = 70; const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
                    doc.addImage(logoImg, 'PNG', (pageWidth - logoWidth) / 2, currentY, logoWidth, logoHeight);
                    currentY += logoHeight + 30;
                } else { currentY += 30; }
            } catch (e) { console.warn('PDFExporter: Could not add logo to cover:', e); currentY += 30; }
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('RELATÓRIO DE SIMULAÇÃO', pageWidth / 2, currentY, { align: 'center' }); currentY += 10;
        doc.text('IMPACTO DO SPLIT PAYMENT NO FLUXO DE CAIXA', pageWidth / 2, currentY, { align: 'center' }); currentY += 30;

        doc.setFontSize(14); doc.setTextColor(60, 60, 60);
        const formatadorManager = new ExportManager(); // For generic formatting if needed, not data access
        const regimeMap = { 'real': 'Lucro Real', 'presumido': 'Lucro Presumido', 'simples': 'Simples Nacional' };
        let regimeText = '';
        if (dadosAninhados?.empresa?.regime) {
            regimeText = regimeMap[dadosAninhados.empresa.regime] || dadosAninhados.empresa.regime;
        }

        let setorText = '';
        if (dadosAninhados?.empresa?.setor) {
            if (typeof window.DataManager?.obterNomeSetor === 'function') {
                setorText = window.DataManager.obterNomeSetor(dadosAninhados.empresa.setor);
            } else if (window.SetoresRepository?.obterSetor === 'function') { // Fallback
                const setorObj = window.SetoresRepository.obterSetor(dadosAninhados.empresa.setor);
                setorText = (setorObj?.nome) ? setorObj.nome : formatadorManager.capitalizeFirstLetter(dadosAninhados.empresa.setor);
            } else { // Ultimate fallback
                setorText = formatadorManager.capitalizeFirstLetter(dadosAninhados.empresa.setor);
            }
        }

        const infoText = [
            `Empresa: ${dadosAninhados?.empresa?.nome || 'N/A'}`,
            `Setor: ${setorText || 'N/A'}`,
            `Regime Tributário: ${regimeText || 'N/A'}`,
            `Data: ${new Date().toLocaleDateString('pt-BR')}`
        ];
        infoText.forEach(text => {
            doc.setFont("helvetica", "bold"); doc.text(text, pageWidth / 2, currentY, { align: 'center' });
            doc.setFont("helvetica", "normal"); currentY += 10;
        });
        currentY += 30;

        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        let anoInicial = dadosAninhados?.parametrosSimulacao?.dataInicial?.split('-')[0] || '2026';
        let anoFinal = dadosAninhados?.parametrosSimulacao?.dataFinal?.split('-')[0] || '2033';
        doc.text(`Simulação para o período ${anoInicial} - ${anoFinal}`, pageWidth / 2, currentY, { align: 'center' });

        const footerY = pageHeight - margins.bottom - 10;
        doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(100, 100, 100);
        doc.text('© 2025 Expertzy Inteligência Tributária', pageWidth / 2, footerY, { align: 'center' });
        doc.text('Confidencial - Uso Interno', pageWidth / 2, footerY + 5, { align: 'center' });
        return doc;
    }

    _addIndex(doc, pageNumber) { // eslint-disable-line no-unused-vars
        const margins = this.config.pdf.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top;
        doc.setFont("helvetica", "bold"); doc.setFontSize(16);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('Índice', pageWidth / 2, currentY, { align: 'center' }); currentY += 20;
        doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(60, 60, 60);
        const indiceItems = [
            { texto: '1. Parâmetros da Simulação', pagina: 3 }, { texto: '2. Resultados da Simulação', pagina: 4 },
            { texto: '3. Análise Gráfica', pagina: 5 }, { texto: '4. Estratégias de Mitigação', pagina: 6 },
            { texto: '5. Memória de Cálculo', pagina: 7 }, { texto: '6. Conclusão e Recomendações', pagina: 8 }
        ];
        indiceItems.forEach(item => {
            doc.text(item.texto, margins.left + 5, currentY);
            const startX = doc.getStringUnitWidth(item.texto) * doc.internal.getFontSize() / doc.internal.scaleFactor + margins.left + 10;
            const endX = pageWidth - margins.right - 15;
            this._drawDottedLine(doc, startX, currentY - 2, endX, currentY - 2);
            doc.text(item.pagina.toString(), pageWidth - margins.right - 10, currentY, { align: 'right' });
            currentY += 12;
        });
        return currentY;
    }

    _addSimulationParameters(doc, dadosAninhados, pageNumber) { // eslint-disable-line no-unused-vars
        const margins = this.config.pdf.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top;

        doc.setFont("helvetica", "bold"); doc.setFontSize(16);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('1. Parâmetros da Simulação', margins.left, currentY); currentY += 15;
        doc.setDrawColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.line(margins.left, currentY, pageWidth - margins.right, currentY); currentY += 10;

        const manager = new ExportManager(); // For fallback or generic formatting

        const formatCurrency = (valor) => {
            if (typeof window.DataManager?.formatarMoeda === 'function') return window.DataManager.formatarMoeda(valor);
            return manager.formatCurrency(valor); 
        };
        const formatPercentage = (valor) => { // Expects fraction e.g. 0.25 for 25%
            if (typeof window.DataManager?.formatarPercentual === 'function') return window.DataManager.formatarPercentual(valor);
            return manager.formatPercentage(valor * 100); // Fallback might expect 25 for 25%
        };
        const formatDateSimple = (dateString) => {
            if (!dateString) return 'N/A';
            if (typeof window.DataManager?.formatarDataSimples === 'function') return window.DataManager.formatarDataSimples(new Date(dateString));
            return manager.formatDateSimple(new Date(dateString));
        };

        doc.setFont("helvetica", "bold"); doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text('1.1. Dados da Empresa', margins.left, currentY); currentY += 10;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(0, 0, 0);

        let nomeEmpresa = dadosAninhados?.empresa?.nome || 'N/A';
        let setor = 'N/A';
        if (dadosAninhados?.empresa?.setor) {
            if (typeof window.DataManager?.obterNomeSetor === 'function') {
                setor = window.DataManager.obterNomeSetor(dadosAninhados.empresa.setor);
            } else if (window.SetoresRepository?.obterSetor === 'function') {
                const setorObj = window.SetoresRepository.obterSetor(dadosAninhados.empresa.setor);
                setor = (setorObj?.nome) ? setorObj.nome : manager.capitalizeFirstLetter(dadosAninhados.empresa.setor);
            } else { setor = manager.capitalizeFirstLetter(dadosAninhados.empresa.setor); }
        }
        let regimeTributario = 'N/A';
        if (dadosAninhados?.empresa?.regime) {
             if (typeof window.DataManager?.obterNomeRegimeTributario === 'function') {
                regimeTributario = window.DataManager.obterNomeRegimeTributario(dadosAninhados.empresa.regime);
            } else { regimeTributario = manager.getTaxRegimeFormatted(dadosAninhados.empresa.regime); }
        }
        const faturamento = typeof dadosAninhados?.empresa?.faturamento === 'number' ? formatCurrency(dadosAninhados.empresa.faturamento) : 'N/A';
        const margem = typeof dadosAninhados?.empresa?.margem === 'number' ? formatPercentage(dadosAninhados.empresa.margem) : 'N/A';
        const dadosEmpresaItens = [
            { label: "Empresa:", valor: nomeEmpresa }, { label: "Setor:", valor: setor },
            { label: "Regime Tributário:", valor: regimeTributario }, { label: "Faturamento Mensal:", valor: faturamento },
            { label: "Margem Operacional:", valor: margem }
        ];
        dadosEmpresaItens.forEach(item => {
            doc.setFont("helvetica", "bold"); doc.text(item.label, margins.left, currentY);
            doc.setFont("helvetica", "normal"); doc.text(item.valor, margins.left + 50, currentY); currentY += 8;
        }); currentY += 10;

        doc.setFont("helvetica", "bold"); doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text('1.2. Tributação e Split Payment', margins.left, currentY); currentY += 10;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(0, 0, 0);
        const aliquota = typeof dadosAninhados?.parametrosFiscais?.aliquota === 'number' ? formatPercentage(dadosAninhados.parametrosFiscais.aliquota) : 'N/A';
        const reducaoEspecial = typeof dadosAninhados?.ivaConfig?.reducaoEspecial === 'number' ? formatPercentage(dadosAninhados.ivaConfig.reducaoEspecial) : 'N/A';
        const tipoOperacao = dadosAninhados?.parametrosFiscais?.tipoOperacao || 'N/A';
        let creditosTotais = 0;
        if (dadosAninhados?.parametrosFiscais?.creditos) {
            creditosTotais = Object.values(dadosAninhados.parametrosFiscais.creditos).reduce((t, v) => t + (typeof v === 'number' ? v : 0), 0);
        }
        const compensacaoCreditos = dadosAninhados?.parametrosFiscais?.compensacaoCreditos === true ? 'Sim' : (dadosAninhados?.parametrosFiscais?.compensacaoCreditos === false ? 'Não' : (dadosAninhados?.parametrosFiscais?.compensacao || 'N/A'));
        const dadosTributacaoItens = [
            { label: "Alíquota Efetiva:", valor: aliquota }, { label: "Redução Especial:", valor: reducaoEspecial },
            { label: "Tipo de Operação:", valor: tipoOperacao }, { label: "Créditos Tributários:", valor: formatCurrency(creditosTotais) },
            { label: "Compensação de Créditos:", valor: compensacaoCreditos }
        ];
        dadosTributacaoItens.forEach(item => {
            doc.setFont("helvetica", "bold"); doc.text(item.label, margins.left, currentY);
            doc.setFont("helvetica", "normal"); doc.text(item.valor, margins.left + 70, currentY); currentY += 8;
        }); currentY += 10;

        doc.setFont("helvetica", "bold"); doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text('1.3. Ciclo Financeiro', margins.left, currentY); currentY += 10;
        const pmr = typeof dadosAninhados?.cicloFinanceiro?.pmr === 'number' ? `${dadosAninhados.cicloFinanceiro.pmr} dias` : 'N/A';
        const pmp = typeof dadosAninhados?.cicloFinanceiro?.pmp === 'number' ? `${dadosAninhados.cicloFinanceiro.pmp} dias` : 'N/A';
        const pme = typeof dadosAninhados?.cicloFinanceiro?.pme === 'number' ? `${dadosAninhados.cicloFinanceiro.pme} dias` : 'N/A';
        let cicloFinanceiroCalculado = 'N/A';
        if (typeof dadosAninhados?.cicloFinanceiro?.pmr === 'number' && typeof dadosAninhados?.cicloFinanceiro?.pmp === 'number' && typeof dadosAninhados?.cicloFinanceiro?.pme === 'number') {
            cicloFinanceiroCalculado = `${dadosAninhados.cicloFinanceiro.pmr + dadosAninhados.cicloFinanceiro.pme - dadosAninhados.cicloFinanceiro.pmp} dias`;
        }
        const percVista = typeof dadosAninhados?.cicloFinanceiro?.percVista === 'number' ? formatPercentage(dadosAninhados.cicloFinanceiro.percVista) : 'N/A';
        const percPrazo = typeof dadosAninhados?.cicloFinanceiro?.percPrazo === 'number' ? formatPercentage(dadosAninhados.cicloFinanceiro.percPrazo) : 'N/A';
        const dadosCicloItens = [
            { label: "Prazo Médio de Recebimento:", valor: pmr }, { label: "Prazo Médio de Pagamento:", valor: pmp },
            { label: "Prazo Médio de Estoque:", valor: pme }, { label: "Ciclo Financeiro:", valor: cicloFinanceiroCalculado },
            { label: "Vendas à Vista:", valor: percVista }, { label: "Vendas a Prazo:", valor: percPrazo }
        ];
        dadosCicloItens.forEach(item => {
            doc.setFont("helvetica", "bold"); doc.text(item.label, margins.left, currentY);
            doc.setFont("helvetica", "normal"); doc.text(item.valor, margins.left + 70, currentY); currentY += 8;
        }); currentY += 10;

        doc.setFont("helvetica", "bold"); doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text('1.4. Parâmetros da Simulação', margins.left, currentY); currentY += 10;
        const dataInicial = formatDateSimple(dadosAninhados?.parametrosSimulacao?.dataInicial);
        const dataFinal = formatDateSimple(dadosAninhados?.parametrosSimulacao?.dataFinal);
        const cenario = dadosAninhados?.parametrosSimulacao?.cenario || 'N/A';
        const taxaCrescimento = typeof dadosAninhados?.parametrosSimulacao?.taxaCrescimento === 'number' ? `${formatPercentage(dadosAninhados.parametrosSimulacao.taxaCrescimento)} a.a.` : 'N/A';
        const parametrosSimulacaoItens = [
            { label: "Data Inicial:", valor: dataInicial }, { label: "Data Final:", valor: dataFinal },
            { label: "Cenário de Crescimento:", valor: cenario }, { label: "Taxa de Crescimento:", valor: taxaCrescimento }
        ];
        parametrosSimulacaoItens.forEach(item => {
            doc.setFont("helvetica", "bold"); doc.text(item.label, margins.left, currentY);
            doc.setFont("helvetica", "normal"); doc.text(item.valor, margins.left + 60, currentY); currentY += 8;
        });
        return currentY;
    }
    
    _addRobustSimulationResults(doc, dadosAninhados, resultadosValidados, pageNumber) { // eslint-disable-line no-unused-vars
        const margins = this.config.pdf.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;

        doc.setFont("helvetica", "bold"); doc.setFontSize(16);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('2. Resultados da Simulação', margins.left, currentY); currentY += 15;

        const formatCurrency = (valor) => {
            if (typeof window.DataManager?.formatarMoeda === 'function') return window.DataManager.formatarMoeda(valor);
            return new ExportManager().formatCurrency(valor);
        };
        const formatPercentage = (valor) => { // Expects fraction e.g. 0.1 for 10%
            if (typeof window.DataManager?.formatarPercentual === 'function') return window.DataManager.formatarPercentual(valor);
            if (valor === undefined || valor === null || isNaN(parseFloat(valor))) return "0,00%";
            return `${(parseFloat(valor) * 100).toFixed(2).replace('.', ',')}%`;
        };
        
        const hasResultsData = resultadosValidados && (resultadosValidados.resultadosPorAno || resultadosValidados.anos || (dadosAninhados?.projecaoTemporal?.resultadosAnuais));

        if (hasResultsData) {
            doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(70, 70, 70);
            doc.text('2.1. Tabela de Resultados Anuais', margins.left, currentY); currentY += 10;
            const headers = ["Ano", "Capital de Giro (Split Payment)", "Capital de Giro (Sistema Atual)", "Diferença", "Variação (%)"];
            let anos = [];
            if (resultadosValidados?.anos?.length > 0) anos = resultadosValidados.anos;
            else if (resultadosValidados?.resultadosPorAno) anos = Object.keys(resultadosValidados.resultadosPorAno).sort();
            else if (dadosAninhados?.projecaoTemporal?.resultadosAnuais) anos = Object.keys(dadosAninhados.projecaoTemporal.resultadosAnuais).sort();
            else if (dadosAninhados?.cronogramaImplementacao) anos = Object.keys(dadosAninhados.cronogramaImplementacao).sort();
            if (anos.length === 0) anos = ["2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033"];

            const tableData = [headers];
            const obterDadosAno = (ano) => {
                let resAno = null;
                if (resultadosValidados?.resultadosPorAno?.[ano]) resAno = resultadosValidados.resultadosPorAno[ano];
                else if (dadosAninhados?.projecaoTemporal?.resultadosAnuais?.[ano]) resAno = dadosAninhados.projecaoTemporal.resultadosAnuais[ano];
                else if (resultadosValidados?.[ano]) resAno = resultadosValidados[ano]; // Fallback for flat year-keyed results
                return resAno || {};
            };

            anos.forEach(ano => {
                const dadosAno = obterDadosAno(ano);
                const capGiroSplit = dadosAno.capitalGiroSplitPayment || dadosAno.resultadoSplitPayment?.capitalGiroDisponivel || dadosAno.impostoDevido || 0;
                const capGiroAtual = dadosAno.capitalGiroAtual || dadosAno.resultadoAtual?.capitalGiroDisponivel || dadosAno.sistemaAtual || 0;
                const diferenca = dadosAno.diferencaCapitalGiro || dadosAno.diferenca || (capGiroSplit - capGiroAtual);
                let percImpacto = dadosAno.percentualImpacto; // Expects fraction
                if (typeof percImpacto !== 'number' || isNaN(percImpacto)) {
                     percImpacto = capGiroAtual !== 0 ? (diferenca / capGiroAtual) : 0;
                }
                tableData.push([ano, formatCurrency(capGiroSplit), formatCurrency(capGiroAtual), formatCurrency(diferenca), formatPercentage(percImpacto)]);
            });

            doc.autoTable({
                startY: currentY, head: [tableData[0]], body: tableData.slice(1), theme: 'grid',
                styles: { fontSize: 9, cellPadding: 2, overflow: 'ellipsize' },
                headStyles: { fillColor: this.config.pdf.colors.primary, textColor: 255, fontStyle: 'bold' },
                didDrawCell: (d) => {
                    if (d.section === 'body') {
                        if (d.column.index === 3 || d.column.index === 4) {
                            let val = 0;
                            if (d.column.index === 3) val = parseFloat(d.cell.text[0].replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
                            else val = parseFloat(d.cell.text[0].replace('%', '').replace(',', '.').trim());
                            if (val > 0) doc.setFillColor(231, 76, 60, 0.2); else if (val < 0) doc.setFillColor(46, 204, 113, 0.2);
                            if (val !== 0) doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, 'F');
                        }
                        if (d.row.index % 2 === 0 && d.column.index === 0) { // Alternating row
                            doc.setFillColor(245, 245, 245);
                            const rW = d.table.columns.reduce((w, c) => w + c.width, 0);
                            doc.rect(d.cell.x, d.cell.y, rW, d.cell.height, 'F');
                        }
                    }
                },
                columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 45 }, 2: { cellWidth: 45 }, 3: { cellWidth: 30 }, 4: { cellWidth: 30 }},
                margin: { left: margins.left }
            });
            currentY = doc.lastAutoTable.finalY + 15;

            let variacaoTotal = 0, anoMaiorImpacto = "", valorMaiorImpacto = 0;
            anos.forEach(ano => {
                const dadosAno = obterDadosAno(ano);
                const dif = (dadosAno.diferencaCapitalGiro || dadosAno.diferenca || ((dadosAno.capitalGiroSplitPayment || 0) - (dadosAno.capitalGiroAtual || 0)));
                variacaoTotal += dif;
                if (Math.abs(dif) > Math.abs(valorMaiorImpacto)) { valorMaiorImpacto = dif; anoMaiorImpacto = ano; }
            });

            doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(70, 70, 70);
            doc.text('2.2. Análise dos Resultados', margins.left, currentY); currentY += 10;
            doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60, 60, 60);
            const isImpactoPositivoGeral = variacaoTotal < 0; // Positive for company if reduction in capital needed
            let analiseTexto = isImpactoPositivoGeral ?
                `A simulação demonstra que a implementação do Split Payment tende a gerar um impacto financeiro positivo para a empresa ao longo do período de transição, com uma redução acumulada de ${formatCurrency(Math.abs(variacaoTotal))} na necessidade de capital de giro. O ano de ${anoMaiorImpacto || 'N/A'} apresenta o maior impacto (${formatCurrency(valorMaiorImpacto)}).` :
                `A simulação demonstra que a implementação do Split Payment tende a gerar um impacto financeiro negativo para a empresa ao longo do período de transição, com um aumento acumulado de ${formatCurrency(Math.abs(variacaoTotal))} na necessidade de capital de giro. O ano de ${anoMaiorImpacto || 'N/A'} apresenta o maior impacto (${formatCurrency(valorMaiorImpacto)}), indicando um ponto crítico.`;
            const splitAnalise = doc.splitTextToSize(analiseTexto, pageWidth - margins.left - margins.right);
            doc.text(splitAnalise, margins.left, currentY); currentY += splitAnalise.length * 5 + 10;

            const boxWidth = pageWidth - margins.left - margins.right, boxHeight = 40, boxX = margins.left, boxY = currentY;
            this._drawGradient(doc, boxX, boxY, boxX + boxWidth, boxY + boxHeight, [245, 245, 245], [235, 235, 235]);
            doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.5); doc.rect(boxX, boxY, boxWidth, boxHeight);
            doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
            doc.text('Considerações Importantes:', boxX + 5, boxY + 10);
            doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
            const pontosImportantes = isImpactoPositivoGeral ?
                `• Considere utilizar a economia para investimentos estratégicos.\n• Prepare-se para os períodos de transição com planejamento.\n• Avalie ajustar preços para aumentar competitividade.` :
                `• Considere estratégias de mitigação para o fluxo de caixa.\n• Planeje capital de giro adicional para períodos críticos.\n• Avalie ajustar política de preços e prazos com fornecedores.`;
            doc.text(pontosImportantes, boxX + 5, boxY + 18); currentY += boxHeight + 15;
        } else {
            doc.setFont("helvetica", "italic"); doc.setFontSize(12); doc.setTextColor(231, 76, 60);
            doc.text("Dados de resultados não disponíveis ou em formato incompatível.", margins.left, currentY); currentY += 10;
            doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(0, 0, 0);
            doc.text("Realize uma nova simulação para gerar o relatório completo.", margins.left, currentY); currentY += 20;
        }
        return currentY;
    }

    _addRobustCharts(doc, pageNumber) { // eslint-disable-line no-unused-vars
        const margins = this.config.pdf.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;
        doc.setFont("helvetica", "bold"); doc.setFontSize(16);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('3. Análise Gráfica', margins.left, currentY); currentY += 15;
        try {
            const graficos = [
                { id: 'grafico-fluxo-caixa', titulo: '3.1. Fluxo de Caixa Comparativo', desc: 'Comparação do fluxo de caixa entre sistema atual e Split Payment.' },
                { id: 'grafico-capital-giro', titulo: '3.2. Impacto no Capital de Giro', desc: 'Variação na necessidade de capital de giro.' },
                { id: 'grafico-projecao', titulo: '3.3. Projeção de Necessidade de Capital', desc: 'Projeção das necessidades adicionais de capital.' },
                { id: 'grafico-decomposicao', titulo: '3.4. Decomposição do Impacto', desc: 'Fatores que contribuem para o impacto total.' }
            ];
            const graficoExiste = graficos.some(g => document.getElementById(g.id));
            if (!graficoExiste) {
                doc.setFont("helvetica", "italic"); doc.setFontSize(12);
                doc.text("Não foram encontrados gráficos para incluir no relatório.", margins.left, currentY); currentY += 10;
                doc.setFont("helvetica", "normal"); doc.setFontSize(11);
                doc.text("Certifique-se de que a simulação foi realizada e os gráficos foram gerados.", margins.left, currentY); currentY += 20;
                return currentY;
            }
            for (let i = 0; i < graficos.length; i++) {
                const grafico = graficos[i]; const el = document.getElementById(grafico.id);
                if (el) {
                    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(70,70,70);
                    doc.text(grafico.titulo, margins.left, currentY); currentY += 8;
                    const imgData = el.toDataURL('image/png');
                    const imgWidth = pageWidth - margins.left - margins.right; const imgHeight = 80;
                    doc.addImage(imgData, 'PNG', margins.left, currentY, imgWidth, imgHeight); currentY += imgHeight + 5;
                    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80,80,80);
                    const splitDesc = doc.splitTextToSize(grafico.desc, pageWidth - margins.left - margins.right);
                    doc.text(splitDesc, margins.left, currentY); currentY += splitDesc.length * 4 + 15;
                    if (i < graficos.length - 1 && currentY > doc.internal.pageSize.height - margins.bottom - 100) {
                        doc.addPage(); pageNumber++; currentY = margins.top + 10; // eslint-disable-line no-param-reassign
                    }
                }
            }
            const boxWidth = pageWidth - margins.left - margins.right, boxHeight = 50, boxX = margins.left, boxY = currentY;
            this._drawGradient(doc, boxX, boxY, boxX + boxWidth, boxY + boxHeight, [245,245,245], [235,235,235]);
            doc.setDrawColor(200,200,200); doc.setLineWidth(0.5); doc.rect(boxX, boxY, boxWidth, boxHeight);
            doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
            doc.text('Insights da Análise Gráfica:', boxX + 5, boxY + 10);
            doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60,60,60);
            const insights = `• Os gráficos demonstram a progressão do impacto na transição.\n• Maiores variações ocorrem nos anos intermediários (2029-2031).\n• Alíquota efetiva se estabiliza ao final do período.\n• Incentivos fiscais continuam relevantes no novo sistema.`;
            doc.text(insights, boxX + 5, boxY + 18); currentY += boxHeight + 15;
        } catch (e) {
            console.warn('PDFExporter: Error adding charts:', e);
            doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(231,76,60);
            doc.text('Não foi possível capturar os gráficos. Verifique a simulação.', margins.left, currentY); currentY += 10;
        }
        return currentY;
    }

    _addRobustStrategyAnalysis(doc, dadosAninhados, resultadosSimulacao, pageNumber) { // eslint-disable-line no-unused-vars
        const margins = this.config.pdf.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;

        doc.setFont("helvetica", "bold"); doc.setFontSize(16);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('4. Estratégias de Mitigação', margins.left, currentY); currentY += 15;

        // Strategy data is often global or from a separate module; not typically part of `dadosAninhados` or `resultadosSimulacao`
        if (!window.resultadosEstrategias) {
            doc.setFont("helvetica", "italic"); doc.setFontSize(12);
            doc.text("Dados de estratégias não disponíveis. Realize simulação de estratégias.", margins.left, currentY);
            return currentY + 20;
        }

        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60,60,60);
        const introTexto = "A implementação do Split Payment pode impactar o fluxo de caixa. Para mitigar, apresentamos estratégias adaptadas ao negócio.";
        const splitIntro = doc.splitTextToSize(introTexto, pageWidth - margins.left - margins.right);
        doc.text(splitIntro, margins.left, currentY); currentY += splitIntro.length * 5 + 10;

        const formatCurrency = (v) => (typeof window.DataManager?.formatarMoeda === 'function' ? window.DataManager.formatarMoeda(v) : new ExportManager().formatCurrency(v));
        const formatPercentage = (v) => { // Expects fraction
            if (typeof window.DataManager?.formatarPercentual === 'function') return window.DataManager.formatarPercentual(v);
            return v === undefined || v === null || isNaN(parseFloat(v)) ? "0,00%" : `${(parseFloat(v)*100).toFixed(2).replace('.',',')}%`;
        };

        doc.setFont("helvetica", "bold"); doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text("Impacto Original do Split Payment", margins.left, currentY); currentY += 10;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(0,0,0);
        const impactoBase = window.resultadosEstrategias.impactoBase || {};
        const linhasImpacto = [
            `Diferença no Capital de Giro: ${formatCurrency(impactoBase.diferencaCapitalGiro || 0)}`,
            `Impacto Percentual: ${formatPercentage(impactoBase.percentualImpacto || 0)}`, // Assuming it's a fraction
            `Necessidade Adicional: ${formatCurrency(impactoBase.necessidadeAdicionalCapitalGiro || 0)}`
        ];
        linhasImpacto.forEach(l => { doc.text(l, margins.left, currentY); currentY += 8; }); currentY += 5;

        const estrategias = [ /* Static list of strategies */
            { codigo: "ajustePrecos", titulo: "4.1. Ajuste de Preços", desc: "Revisão da política de preços para compensar..." },
            { codigo: "renegociacaoPrazos", titulo: "4.2. Renegociação de Prazos", desc: "Renegociação dos prazos com fornecedores e clientes..." },
            { codigo: "antecipacaoRecebiveis", titulo: "4.3. Antecipação de Recebíveis", desc: "Utilização de mecanismos de antecipação..." },
            { codigo: "capitalGiro", titulo: "4.4. Captação de Capital de Giro", desc: "Obtenção de linhas de crédito específicas..." },
            { codigo: "mixProdutos", titulo: "4.5. Ajuste no Mix de Produtos", desc: "Reequilíbrio do mix de produtos e serviços..." },
            { codigo: "meiosPagamento", titulo: "4.6. Incentivo a Meios de Pagamento Favoráveis", desc: "Estímulo a modalidades de pagamento que reduzam..." }
        ];
        const resultadosEstrategias = window.resultadosEstrategias.resultadosEstrategias || {};
        estrategias.forEach((estr, idx) => {
            doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
            doc.text(estr.titulo, margins.left, currentY); currentY += 8;
            doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(0,0,0);
            const splitDesc = doc.splitTextToSize(estr.desc, pageWidth - margins.left - margins.right);
            doc.text(splitDesc, margins.left, currentY); currentY += splitDesc.length * 5 + 5;
            const dadosEstr = resultadosEstrategias[estr.codigo];
            if (dadosEstr) {
                doc.setFont("helvetica", "bold");
                doc.text(`Efetividade: ${formatPercentage(dadosEstr.efetividadePercentual ? dadosEstr.efetividadePercentual / 100 : 0)}`, margins.left + 10, currentY); currentY += 8; // Assuming efetividadePercentual is 0-100
                // Simplified details display
                if(dadosEstr.fluxoCaixaAdicional) { doc.text(`Fluxo Caixa Adicional: ${formatCurrency(dadosEstr.fluxoCaixaAdicional)}`, margins.left + 10, currentY); currentY += 8; }
                if(dadosEstr.custoEstrategia) { doc.text(`Custo: ${formatCurrency(dadosEstr.custoEstrategia)}`, margins.left + 10, currentY); currentY += 8; }
                // ... add other relevant fields for each strategy type if necessary
            } else { doc.setFont("helvetica", "italic"); doc.text("Dados não disponíveis.", margins.left + 10, currentY); currentY+=8; }
            currentY += 7; // Adjusted spacing
            if (currentY > doc.internal.pageSize.height - margins.bottom - 30 && idx < estrategias.length - 1) {
                doc.addPage(); pageNumber++; currentY = margins.top; // eslint-disable-line no-param-reassign
            }
        });

        doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text("4.7. Resultados Combinados", margins.left, currentY); currentY += 10;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(0,0,0);
        const combinado = window.resultadosEstrategias.efeitividadeCombinada || {};
        const linhasCombinado = [
            `Efetividade Total: ${formatPercentage(combinado.efetividadePercentual ? combinado.efetividadePercentual / 100 : 0)}`,
            `Mitigação Total: ${formatCurrency(combinado.mitigacaoTotal || 0)}`,
            `Custo Total das Estratégias: ${formatCurrency(combinado.custoTotal || 0)}`,
            `Relação Custo-Benefício: ${(combinado.custoBeneficio || 0).toFixed(2)}`
        ];
        linhasCombinado.forEach(l => { doc.text(l, margins.left, currentY); currentY += 8; }); currentY += 10;

        doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text("4.8. Plano de Ação Recomendado", margins.left, currentY); currentY += 10;
        const planoAcao = [
            ['Fase', 'Ação', 'Prazo Recomendado'],
            ['Preparação', 'Análise detalhada do fluxo de caixa', '6 meses antes'],
            ['Implementação', 'Ajuste gradual de preços, negociação', '3 meses antes'],
            ['Monitoramento', 'Acompanhamento de indicadores', 'Contínuo'],
            ['Ajuste', 'Refinamento das estratégias', 'Anual']
        ];
        doc.autoTable({
            startY: currentY, head: [planoAcao[0]], body: planoAcao.slice(1), theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: this.config.pdf.colors.primary, textColor: 255, fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 80 }, 2: { cellWidth: 50 }}, margin: { left: margins.left }
        });
        currentY = doc.lastAutoTable.finalY + 10;
        return currentY;
    }

    _addMemoryCalculation(doc, getMemoryCalculation, pageNumber) { // eslint-disable-line no-unused-vars
        const margins = this.config.pdf.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;
        doc.setFont("helvetica", "bold"); doc.setFontSize(16);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('5. Memória de Cálculo', margins.left, currentY); currentY += 15;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60,60,60);
        const introTexto = "Esta seção apresenta detalhes dos cálculos da simulação para verificação. Inclui todas as etapas, da aplicação de alíquotas ao cálculo final dos impostos.";
        const splitIntro = doc.splitTextToSize(introTexto, pageWidth - margins.left - margins.right);
        doc.text(splitIntro, margins.left, currentY); currentY += splitIntro.length * 5 + 10;

        let memoriaTexto = "";
        try {
            if (typeof getMemoryCalculation === "function") memoriaTexto = getMemoryCalculation() || "";
            else if (getMemoryCalculation && typeof getMemoryCalculation === "object") {
                const primeiroAno = Object.keys(getMemoryCalculation)[0];
                memoriaTexto = getMemoryCalculation[primeiroAno] || "";
            } else if (window.memoriaCalculoSimulacao) {
                const anoSel = document.getElementById("select-ano-memoria")?.value || Object.keys(window.memoriaCalculoSimulacao)[0];
                memoriaTexto = window.memoriaCalculoSimulacao[anoSel] || "";
            } else memoriaTexto = "Memória de cálculo não disponível.";
        } catch (error) {
            console.error("PDFExporter: Error processing calculation memory:", error);
            memoriaTexto = "Erro ao processar memória de cálculo: " + error.message;
        }

        if (memoriaTexto) {
            doc.setFont('courier', 'normal'); doc.setFontSize(7); doc.setTextColor(30,30,30);
            const linhasMemoria = memoriaTexto.split('\n'); const maxLinhas = 200;
            const linhasExibidas = linhasMemoria.slice(0, maxLinhas);
            if (linhasMemoria.length > maxLinhas) linhasExibidas.push('... (memória de cálculo truncada)');
            for (let i = 0; i < linhasExibidas.length; i++) {
                const linha = linhasExibidas[i];
                if (linha.includes('===')) { doc.setFont('courier', 'bold'); doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]); }
                else { doc.setFont('courier', 'normal'); doc.setTextColor(30,30,30); }
                if (currentY > doc.internal.pageSize.height - margins.bottom - 10) {
                    doc.addPage(); pageNumber++; currentY = margins.top + 10; // eslint-disable-line no-param-reassign
                }
                const splitLinha = doc.splitTextToSize(linha, pageWidth - margins.left - margins.right);
                doc.text(splitLinha, margins.left, currentY); currentY += splitLinha.length * 3.5;
            }
            currentY += 10; doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(100,100,100);
            const notaExp = "Nota: Para memória de cálculo completa, use 'Exportar Memória de Cálculo' no simulador.";
            const splitNota = doc.splitTextToSize(notaExp, pageWidth - margins.left - margins.right);
            doc.text(splitNota, margins.left, currentY); currentY += splitNota.length * 5;
        } else {
            doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(150,150,150);
            doc.text('Memória de cálculo não disponível. Execute a simulação.', margins.left, currentY); currentY += 10;
        }
        return currentY;
    }

    _addRobustConclusion(doc, dadosAninhados, resultadosSimulacao, pageNumber, equivalentRates) { // eslint-disable-line no-unused-vars
        const margins = this.config.pdf.margins;
        const pageWidth = doc.internal.pageSize.width;
        let currentY = margins.top + 10;

        doc.setFont("helvetica", "bold"); doc.setFontSize(16);
        doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('6. Conclusão e Recomendações', margins.left, currentY); currentY += 15;

        let empresaNome = dadosAninhados?.empresa?.nome || "a empresa";
        let anoInicial = dadosAninhados?.parametrosSimulacao?.dataInicial?.split('-')[0] || '2026';
        let anoFinal = dadosAninhados?.parametrosSimulacao?.dataFinal?.split('-')[0] || '2033';
        let variacaoTotalGeral = 0; let tendenciaGeral = "variação";

        const resumoExportacao = resultadosSimulacao?.resultadosExportacao?.resumo || resultadosSimulacao?.resumo;
        if (resumoExportacao) {
            variacaoTotalGeral = resumoExportacao.variacaoTotalAcumulada || resumoExportacao.variacaoTotal || 0;
            tendenciaGeral = resumoExportacao.tendenciaGeral || (variacaoTotalGeral >= 0 ? "aumento" : "redução");
            const anosExp = resultadosSimulacao?.resultadosExportacao?.anos || resultadosSimulacao?.anos;
            if (anosExp?.length > 0) { anoInicial = anosExp[0]; anoFinal = anosExp[anosExp.length - 1]; }
        } else if (resultadosSimulacao?.projecaoTemporal?.impactoAcumulado) {
            variacaoTotalGeral = resultadosSimulacao.projecaoTemporal.impactoAcumulado.totalNecessidadeCapitalGiro || 0;
            tendenciaGeral = variacaoTotalGeral >= 0 ? "aumento" : "redução";
        } else if (resultadosSimulacao?.impactoBase?.diferencaCapitalGiro) {
            const numAnos = parseInt(anoFinal, 10) - parseInt(anoInicial, 10) + 1;
            variacaoTotalGeral = resultadosSimulacao.impactoBase.diferencaCapitalGiro * (numAnos > 0 ? numAnos : 1);
            tendenciaGeral = variacaoTotalGeral >= 0 ? "aumento" : "redução";
        } else { console.warn("PDFExporter _addRobustConclusion: Could not determine variacaoTotalGeral/tendenciaGeral."); }

        const formatCurrency = (v) => (typeof window.DataManager?.formatarMoeda === 'function' ? window.DataManager.formatarMoeda(v) : new ExportManager().formatCurrency(v));
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60,60,60);
        const conclusaoTexto = `A implementação do Split Payment para ${empresaNome} resultará em um(a) ${tendenciaGeral} estimado(a) de ${formatCurrency(Math.abs(variacaoTotalGeral))} na necessidade de capital de giro (${anoInicial} a ${anoFinal}).`;
        const linhasConclusao = doc.splitTextToSize(conclusaoTexto, pageWidth - margins.left - margins.right);
        doc.text(linhasConclusao, margins.left, currentY); currentY += linhasConclusao.length * 7 + 10;
        const impactoTexto = `O principal impacto é a antecipação do recolhimento tributário, afetando o ciclo financeiro e a necessidade de capital de giro.`;
        const linhasImpacto = doc.splitTextToSize(impactoTexto, pageWidth - margins.left - margins.right);
        doc.text(linhasImpacto, margins.left, currentY); currentY += linhasImpacto.length * 7 + 10;

        doc.setFont("helvetica", "bold"); doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text('Recomendações', margins.left, currentY); currentY += 10;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60,60,60);
        const recomendacoes = [
            `1. Planejamento Financeiro: Iniciar planejamento para adequação ao novo regime (Split Payment a partir de 2026).`,
            `2. Estratégias de Mitigação: Implementar combinação de estratégias (ver seção 4) para minimizar impacto.`,
            `3. Sistemas: Adequar sistemas de gestão financeira e contábil para o novo modelo.`,
            `4. Monitoramento Contínuo: Acompanhar alterações na regulamentação do Split Payment.`
        ];
        recomendacoes.forEach(rec => {
            const lr = doc.splitTextToSize(rec, pageWidth - margins.left - margins.right);
            doc.text(lr, margins.left, currentY); currentY += lr.length * 7 + 5;
        });

        currentY += 10;
        const boxW = pageWidth - margins.left - margins.right, boxH = 40, boxX = margins.left, boxY = currentY;
        this._drawGradient(doc, boxX, boxY, boxX + boxW, boxY + boxH, [240,248,255], [230,240,250]);
        doc.setDrawColor(180,200,220); doc.setLineWidth(0.5); doc.rect(boxX, boxY, boxW, boxH);
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(this.config.pdf.colors.primary[0], this.config.pdf.colors.primary[1], this.config.pdf.colors.primary[2]);
        doc.text('Entre em contato para um diagnóstico personalizado', margins.left + 5, boxY + 15);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60,60,60);
        doc.text('Relatório gerado pelo Simulador de Split Payment da Expertzy Inteligência Tributária.', margins.left + 5, boxY + 25);
        doc.text('Contato para diagnóstico personalizado: contato@expertzy.com.br', margins.left + 5, boxY + 32);
        currentY += boxH + 10;
        return currentY;
    }

    _addHeaderFooter(doc, pageCount) {
        for (let i = 2; i <= pageCount; i++) {
            doc.setPage(i);
            const pw = doc.internal.pageSize.width, ph = doc.internal.pageSize.height, m = this.config.pdf.margins;
            doc.setDrawColor(200,200,200); doc.setLineWidth(0.5);
            doc.line(m.left, m.top - 5, pw - m.right, m.top - 5); // Header line
            if (this.config.pdf.logoEnabled) {
                try {
                    const logo = document.querySelector('img.logo');
                    if (logo?.complete) {
                        const lw = 25, lh = (logo.height / logo.width) * lw;
                        doc.addImage(logo, 'PNG', m.left, m.top - 15, lw, lh);
                    }
                } catch (e) { console.warn('PDFExporter: Could not add logo to header:', e); }
            }
            doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100,100,100);
            doc.text('Simulador de Split Payment - Relatório', pw - m.right, m.top - 8, { align: 'right' });
            doc.line(m.left, ph - m.bottom + 10, pw - m.right, ph - m.bottom + 10); // Footer line
            doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(100,100,100);
            doc.text('© 2025 Expertzy Inteligência Tributária', pw / 2, ph - m.bottom + 18, { align: 'center' });
            doc.text(`Página ${i} de ${pageCount}`, pw - m.right, ph - m.bottom + 18, { align: 'right' });
        }
    }

    _drawDottedLine(doc, x1, y1, x2, y2) {
        doc.setLineDashPattern([1, 1], 0); doc.setDrawColor(150,150,150);
        doc.setLineWidth(0.5); doc.line(x1, y1, x2, y2); doc.setLineDashPattern([], 0);
    }

    _drawGradient(doc, x1, y1, x2, y2, color1, color2) {
        const steps = 20; const width = x2 - x1; const height = y2 - y1; const stepWidth = width / steps;
        for (let i = 0; i < steps; i++) {
            const factor = i / steps;
            const r = Math.floor(color1[0] + factor * (color2[0] - color1[0]));
            const g = Math.floor(color1[1] + factor * (color2[1] - color1[1]));
            const b = Math.floor(color1[2] + factor * (color2[2] - color1[2]));
            doc.setFillColor(r,g,b); doc.rect(x1 + i * stepWidth, y1, stepWidth, height, 'F');
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

    validateLibraries() {
        if (typeof XLSX === "undefined") {
            console.error("ExcelExporter: XLSX library not found");
            return false;
        }
        return true;
    }

    export(simulationInput, options = {}) { // eslint-disable-line no-unused-vars
        console.log("ExcelExporter: Starting Excel export");
        if (!this.validateLibraries()) {
            alert("ExcelExporter: Error exporting - XLSX library not loaded.");
            return Promise.reject("XLSX library not loaded");
        }

        return new Promise((resolve, reject) => {
            let dadosAninhados;
            let resultadosValidados;
            let equivalentRatesData;
            let simulationToProcess = simulationInput;

            try {
                if (!simulationToProcess) {
                    if (typeof window.DataManager === 'undefined' || !window.ultimaSimulacao) {
                        alert("ExcelExporter: No simulation data available to process.");
                        console.error('ExcelExporter: No simulation data provided and DataManager or window.ultimaSimulacao is not available.');
                        return reject("No simulation data available");
                    }
                    simulationToProcess = window.ultimaSimulacao;
                    console.log("ExcelExporter: Using window.ultimaSimulacao as input.");
                }

                if (typeof window.DataManager !== 'undefined' && window.DataManager) {
                    console.log("ExcelExporter: DataManager found. Processing data...");
                    try {
                        const rawDataInput = simulationToProcess.dados || simulationToProcess;
                        dadosAninhados = window.DataManager.converterParaEstruturaAninhada(rawDataInput);
                        dadosAninhados = window.DataManager.validarENormalizar(dadosAninhados);

                        if (simulationToProcess.resultados) {
                            resultadosValidados = simulationToProcess.resultados; // Assuming structure is fine or DM handles it
                        } else if (dadosAninhados && dadosAninhados.resultados) {
                            resultadosValidados = dadosAninhados.resultados;
                        } else if (simulationToProcess.impactoBase) { // Fallback for older structure
                            resultadosValidados = simulationToProcess;
                        } else {
                            resultadosValidados = dadosAninhados; // Default to main validated data
                            console.warn("ExcelExporter: Results not found in 'resultados' or 'impactoBase', using main normalized data.");
                        }
                        equivalentRatesData = simulationToProcess.aliquotasEquivalentes || dadosAninhados.aliquotasEquivalentes || {};
                        console.log("ExcelExporter: DataManager data processing successful.");
                    } catch (dmError) {
                        console.error('ExcelExporter: DataManager error during data processing:', dmError, dmError.stack);
                        alert(`ExcelExporter: Error processing data with DataManager: ${dmError.message}. Attempting to proceed with raw/fallback data.`);
                        dadosAninhados = simulationToProcess.dados || simulationToProcess;
                        resultadosValidados = simulationToProcess.resultados || simulationToProcess;
                        equivalentRatesData = simulationToProcess.aliquotasEquivalentes || {};
                        // Attempt internal conversion if DataManager failed and data seems flat
                        if (!dadosAninhados.empresa && typeof this._converterParaEstruturaAninhada === 'function') {
                             console.warn("ExcelExporter: DataManager failed, attempting internal conversion for potentially flat data.");
                             dadosAninhados = this._converterParaEstruturaAninhada(dadosAninhados);
                        }
                    }
                } else {
                    console.warn('ExcelExporter: DataManager not found. Using raw data and internal fallbacks. Report accuracy may be affected.');
                    dadosAninhados = simulationToProcess.dados || simulationToProcess;
                    resultadosValidados = simulationToProcess.resultados || simulationToProcess;
                    equivalentRatesData = simulationToProcess.aliquotasEquivalentes || {};
                    // Use internal converter if data seems flat and no DataManager
                    if (!dadosAninhados.empresa && typeof this._converterParaEstruturaAninhada === 'function') {
                        console.warn("ExcelExporter: DataManager not found, attempting internal conversion for potentially flat data.");
                        dadosAninhados = this._converterParaEstruturaAninhada(dadosAninhados);
                    }
                }
                
                const resultsForSheet = resultadosValidados?.resultadosExportacao || resultadosValidados;
                if (!resultsForSheet || (!resultsForSheet.resultadosPorAno && !resultsForSheet.anos && !Object.keys(resultsForSheet).some(k => !isNaN(parseInt(k))))) {
                     if (!resultadosValidados?.impactoBase) { // Check if it's not an old flat year-keyed struct that could still work
                        console.error("ExcelExporter: Invalid results structure for sheets after processing.", resultsForSheet);
                        alert("ExcelExporter: Invalid results structure. Run a new simulation or check DataManager processing.");
                        return reject("Invalid results structure for Excel");
                    }
                }

                const manager = new ExportManager();
                const filename = manager.requestFilename("xlsx", "relatorio-split-payment");
                if (!filename) {
                    console.log("ExcelExporter: Export cancelled by user.");
                    return reject("Export cancelled by user");
                }

                const wb = XLSX.utils.book_new();
                wb.Props = { Title: "Relatório Simulador de Split Payment", Subject: "Análise do impacto do Split Payment", Author: "Expertzy Inteligência Tributária", CreatedDate: new Date() };

                const wsSummary = this._createSummaryWorksheet(dadosAninhados, resultsForSheet, equivalentRatesData);
                XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");
                const wsResults = this._createResultsWorksheet(dadosAninhados, resultsForSheet);
                XLSX.utils.book_append_sheet(wb, wsResults, "Resultados");
                if (window.memoriaCalculoSimulacao) { // Global check for memory calculation
                    const wsMemory = this._createMemoryWorksheet();
                    XLSX.utils.book_append_sheet(wb, wsMemory, "Memória de Cálculo");
                }

                XLSX.writeFile(wb, filename);
                console.log("ExcelExporter: Excel exported successfully:", filename);
                resolve({ success: true, message: "Excel exported successfully!", fileName: filename });

            } catch (error) {
                console.error("ExcelExporter: Critical error during Excel export:", error, error.stack);
                alert(`ExcelExporter: Critical error exporting to Excel: ${error.message}. Check console for details.`);
                reject({ success: false, message: `Error exporting to Excel: ${error.message}`, error: error });
            }
        });
    }

    _createSummaryWorksheet(dadosAninhados, results, equivalentRates) { // eslint-disable-line no-unused-vars
        const formatarMoeda = (v) => this._formatarValorPadrao(v, 'monetario');
        // For Excel, percentages are raw numbers (0.25 for 25%) and formatted by Excel's cell format.
        const formatarPercentualParaValorExcel = (v) => (typeof v === 'number' ? v : (parseFloat(String(v).replace('%','').replace(',','.'))/100 || 0));
        const formatarData = (v) => this._formatarValorPadrao(v, 'data'); // Should return string or Excel date number

        const summaryData = [
            ["RELATÓRIO DE SIMULAÇÃO - SPLIT PAYMENT"], ["Expertzy Inteligência Tributária"],
            ["Data do relatório:", formatarData(new Date())], [], ["RESUMO EXECUTIVO"], [],
            ["Parâmetros Principais"],
            ["Empresa:", dadosAninhados?.empresa?.nome || ""],
            ["Setor:", this._obterNomeSetor(dadosAninhados?.empresa?.setor)],
            ["Regime Tributário:", this._obterRegimeTributario(dadosAninhados?.empresa?.regime)],
            ["Faturamento Anual:", dadosAninhados?.empresa?.faturamento], // Raw number for Excel
            ["Período de Simulação:", `${dadosAninhados?.parametrosSimulacao?.dataInicial?.split('-')[0] || '2026'} a ${dadosAninhados?.parametrosSimulacao?.dataFinal?.split('-')[0] || '2033'}`],
            [], ["Resultados Principais"]
        ];
        
        let anos = [];
        if (results?.anos?.length > 0) anos = results.anos;
        else if (results?.resultadosPorAno) anos = Object.keys(results.resultadosPorAno).sort();
        else if (dadosAninhados?.projecaoTemporal?.resultadosAnuais) anos = Object.keys(dadosAninhados.projecaoTemporal.resultadosAnuais).sort();
        if (anos.length === 0) anos = ["2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033"];

        let variacaoTotal = 0; let maiorImpacto = { valor: 0, ano: "" }; let menorImpacto = { valor: Number.MAX_SAFE_INTEGER, ano: "" };
        const obterResultadoAno = (ano) => {
            let resAno = null;
            if (results?.resultadosPorAno?.[ano]) resAno = results.resultadosPorAno[ano];
            else if (dadosAninhados?.projecaoTemporal?.resultadosAnuais?.[ano]) resAno = dadosAninhados.projecaoTemporal.resultadosAnuais[ano];
            else if (results?.[ano]) resAno = results[ano]; // Fallback for flat year-keyed results
            return resAno || {};
        };

        anos.forEach(ano => {
            const res = obterResultadoAno(ano);
            const eqRateAno = equivalentRates?.[ano] || {};
            const vAtual = res.capitalGiroAtual || res.resultadoAtual?.capitalGiroDisponivel || eqRateAno.valor_atual || 0;
            const vNovo = res.capitalGiroSplitPayment || res.resultadoSplitPayment?.capitalGiroDisponivel || res.impostoDevido || 0;
            const dif = res.diferencaCapitalGiro || res.diferenca || (vNovo - vAtual);
            variacaoTotal += dif;
            if (Math.abs(dif) > Math.abs(maiorImpacto.valor)) maiorImpacto = { valor: dif, ano: ano };
            if (Math.abs(dif) < Math.abs(menorImpacto.valor)) menorImpacto = { valor: dif, ano: ano };
        });

        const impactoGeralDesc = variacaoTotal > 0 ? "Aumento da necessidade de capital / Carga tributária" : "Redução da necessidade de capital / Carga tributária";
        summaryData.push(
            ["Impacto Geral:", impactoGeralDesc], ["Variação Total Acumulada:", variacaoTotal], // Raw number
            ["Ano de Maior Impacto:", `${maiorImpacto.ano || 'N/A'} (${formatarMoeda(maiorImpacto.valor)})`],
            ["Ano de Menor Impacto:", `${menorImpacto.ano || 'N/A'} (${formatarMoeda(menorImpacto.valor)})`], []
        );
        summaryData.push(["Resumo Anual"], ["Ano", "Capital Giro (Split Payment)", "Capital Giro (Sist. Atual)", "Diferença", "Variação (%)"]);
        anos.forEach(ano => {
            const res = obterResultadoAno(ano); const eqRateAno = equivalentRates?.[ano] || {};
            const vAtual = res.capitalGiroAtual || res.resultadoAtual?.capitalGiroDisponivel || eqRateAno.valor_atual || 0;
            const vNovo = res.capitalGiroSplitPayment || res.resultadoSplitPayment?.capitalGiroDisponivel || res.impostoDevido || 0;
            const dif = res.diferencaCapitalGiro || res.diferenca || (vNovo - vAtual);
            let perc = res.percentualImpacto; // Expects fraction
            if (typeof perc !== 'number' || isNaN(perc)) perc = vAtual !== 0 ? dif / vAtual : 0;
            summaryData.push([parseInt(ano), vNovo, vAtual, dif, formatarPercentualParaValorExcel(perc)]);
        });
        summaryData.push([], ["Estratégias Recomendadas"], ["• Ajuste de Preços"], ["• Renegociação de Prazos"], ["• Antecipação de Recebíveis"], ["• Captação de Capital de Giro"], ['Consulte a planilha "Resultados" para mais detalhes ou análises de estratégias.'], [], ["© 2025 Expertzy Inteligência Tributária"]);
        const ws = XLSX.utils.aoa_to_sheet(summaryData);
        this._applySummaryStyles(ws, summaryData, anos.length);
        return ws;
    }

    _obterRegimeTributario(regimeCodigo) {
        if (typeof window.DataManager?.obterNomeRegimeTributario === 'function') {
            try { return window.DataManager.obterNomeRegimeTributario(regimeCodigo); } catch (e) { console.warn("ExcelExporter: Error calling DataManager.obterNomeRegimeTributario, using fallback.", e); }
        }
        const regimes = { 'real': 'Lucro Real', 'presumido': 'Lucro Presumido', 'simples': 'Simples Nacional', 'mei': 'MEI', 'imune': 'Imune/Isenta' };
        return regimes[regimeCodigo] || regimeCodigo || 'N/A';
    }

    _obterNomeSetor(setorCodigo) {
         if (typeof window.DataManager?.obterNomeSetor === 'function') {
            try { return window.DataManager.obterNomeSetor(setorCodigo); } catch (e) { console.warn("ExcelExporter: Error calling DataManager.obterNomeSetor, using fallback.", e); }
        }
        if (window.SetoresRepository?.obterSetor === 'function') {
            const setor = window.SetoresRepository.obterSetor(setorCodigo);
            if (setor?.nome) return setor.nome;
        }
        return setorCodigo ? (setorCodigo.charAt(0).toUpperCase() + setorCodigo.slice(1).toLowerCase()) : 'N/A';
    }

    /**
     * Fallback converter if DataManager is unavailable.
     * Kept for robustness, but primary conversion should be via DataManager.
     */
    _converterParaEstruturaAninhada(dadosPlanos) {
        console.warn("ExcelExporter: Using _converterParaEstruturaAninhada as a fallback.");
        if (!dadosPlanos || typeof dadosPlanos !== 'object') return { empresa: {}, cicloFinanceiro: {}, parametrosFiscais: {}, parametrosSimulacao: {}, ivaConfig: {} };
        const dp = dadosPlanos;
        return {
            empresa: { nome: dp.empresa || dp.nomeEmpresa || '', faturamento: dp.faturamento || dp.faturamentoAnual || 0, margem: dp.margem || dp.margemOperacional || 0, setor: dp.setor || '', tipoEmpresa: dp.tipoEmpresa || '', regime: dp.regime || dp.regimeTributario || '' },
            cicloFinanceiro: { pmr: dp.pmr || 30, pmp: dp.pmp || 30, pme: dp.pme || 30, percVista: dp.percVista || 0.3, percPrazo: dp.percPrazo || 0.7 },
            parametrosFiscais: { aliquota: dp.aliquota || dp.aliquotaIBSCBS || 0.265, tipoOperacao: dp.tipoOperacao || '', regimePisCofins: dp.regimePisCofins || '', compensacaoCreditos: dp.compensacaoCreditos === true, creditos: { pis: dp.creditosPIS || 0, cofins: dp.creditosCOFINS || 0, icms: dp.creditosICMS || 0, ipi: dp.creditosIPI || 0, cbs: dp.creditosCBS || 0, ibs: dp.creditosIBS || 0 }},
            parametrosSimulacao: { cenario: dp.cenario || 'moderado', taxaCrescimento: dp.taxaCrescimento || 0.05, dataInicial: dp.dataInicial || '2026-01-01', dataFinal: dp.dataFinal || '2033-12-31', splitPaymentEnabled: dp.splitPayment !== false },
            ivaConfig: { cbs: dp.aliquotaCBS || 0.088, ibs: dp.aliquotaIBS || 0.177, categoriaIva: dp.categoriaIva || 'standard', reducaoEspecial: dp.reducaoEspecial || 0 }
        };
    }

    _createResultsWorksheet(dadosAninhados, resultsForSheet) { 
        const resultsData = [
            ["RESULTADOS DETALHADOS DA SIMULAÇÃO - SPLIT PAYMENT"], ["Expertzy Inteligência Tributária"],
            ["Data do relatório:", this._formatarValorPadrao(new Date(), 'data')], [],
            ["TABELA DE RESULTADOS ANUAIS"], [],
            ["Ano", "Capital Giro (Split Payment) (R$)", "Capital Giro (Sist. Atual) (R$)", "Diferença (R$)", "Variação (%)", "Impacto no Fluxo de Caixa"]
        ];

        const resultadosPorAno = resultsForSheet?.resultadosPorAno || {};
        let anos = resultsForSheet?.anos || Object.keys(resultadosPorAno).sort();
        if (anos.length === 0) {
             if (dadosAninhados?.projecaoTemporal?.resultadosAnuais) anos = Object.keys(dadosAninhados.projecaoTemporal.resultadosAnuais).sort();
             else anos = ["2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033"];
        }
        
        anos.forEach(ano => {
            const resAno = resultadosPorAno[ano] || dadosAninhados?.projecaoTemporal?.resultadosAnuais?.[ano] || resultsForSheet?.[ano] || {};
            const capGiroSplit = resAno.capitalGiroSplitPayment || resAno.impostoDevido || 0;
            const capGiroAtual = resAno.capitalGiroAtual || resAno.sistemaAtual || 0;
            const dif = resAno.diferencaCapitalGiro || resAno.diferenca || (capGiroSplit - capGiroAtual);
            let percImpactoNum = resAno.percentualImpacto; // Expects fraction
            if (typeof percImpactoNum !== 'number' || isNaN(percImpactoNum)) {
                percImpactoNum = capGiroAtual !== 0 ? dif / capGiroAtual : 0;
            }
            let impactoText = "Neutro";
            if (dif > 0) impactoText = "Negativo (Aumento na necessidade de capital)";
            else if (dif < 0) impactoText = "Positivo (Redução na necessidade de capital)";
            resultsData.push([parseInt(ano), capGiroSplit, capGiroAtual, dif, percImpactoNum, impactoText]);
        });

        const firstDataRow = 8; const lastDataRow = firstDataRow + anos.length -1;
        resultsData.push([], ["ANÁLISE DOS RESULTADOS"], [],
            ["Impacto Total:", { t:'n', f: `SUM(D${firstDataRow}:D${lastDataRow})` }],
            ["Impacto Médio Anual:", { t:'n', f: `AVERAGE(D${firstDataRow}:D${lastDataRow})` }],
            ["Maior Aumento (Dif Positiva):", { t:'n', f: `MAX(0,MAX(D${firstDataRow}:D${lastDataRow}))` }],
            ["Maior Redução (Dif Negativa):", { t:'n', f: `MIN(0,MIN(D${firstDataRow}:D${lastDataRow}))` }], [],
            ["GRÁFICO DE TENDÊNCIA"], ["Criar gráfico selecionando colunas Ano, Capital Giro (Split Payment) e Capital Giro (Sist. Atual)."], []
        );
        const ws = XLSX.utils.aoa_to_sheet(resultsData);
        this._applyResultsStyles(ws, resultsData, anos.length, firstDataRow);
        return ws;
    }

    _createMemoryWorksheet() { // No changes needed here based on guidelines, uses global
        const anoSelecionado = document.getElementById("select-ano-memoria")?.value || (window.memoriaCalculoSimulacao ? Object.keys(window.memoriaCalculoSimulacao)[0] : "2026");
        let memoriaCalculo = window.memoriaCalculoSimulacao?.[anoSelecionado] || "Memória de cálculo não disponível para o ano selecionado.";
        const memoryData = [
            ["MEMÓRIA DE CÁLCULO - SPLIT PAYMENT"], ["Expertzy Inteligência Tributária"],
            ["Ano de Referência:", anoSelecionado], ["Data do relatório:", this._formatarValorPadrao(new Date(), 'data')], [],
            ["DETALHAMENTO DOS CÁLCULOS"], []
        ];
        if (typeof memoriaCalculo === 'string') memoriaCalculo.split('\n').forEach(linha => memoryData.push([linha]));
        else memoryData.push(["Memória de cálculo em formato inválido."]);
        const ws = XLSX.utils.aoa_to_sheet(memoryData);
        ws['!cols'] = [{ wch: 120 }]; // Column A wide for text
        // Basic title styling (can be expanded in _applyMemoryStyles if created)
        if(ws['A1']) Object.assign(ws['A1'].s = ws['A1'].s || {}, { font: { bold: true, sz: 16 }, alignment: { horizontal: "center"} });
        if(ws['A2']) Object.assign(ws['A2'].s = ws['A2'].s || {}, { font: { bold: true, sz: 12 }, alignment: { horizontal: "center"} });
        if(ws['A6']) Object.assign(ws['A6'].s = ws['A6'].s || {}, { font: { bold: true, sz: 14 }});

        return ws;
    }

    _applySummaryStyles(ws, data, yearsCount) { // eslint-disable-line no-unused-vars
        ws['!cols'] = [ {wch:30}, {wch:20}, {wch:20}, {wch:20}, {wch:15} ];
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }]; 
        if(ws['A1']) Object.assign(ws['A1'].s = ws['A1'].s || {}, { font: { bold: true, sz: 16 }, alignment: { horizontal: "center"} });
        const resumoHeaderRow = data.findIndex(row => row[0] === "Resumo Anual") + 1;
        if (resumoHeaderRow > 0) {
            for (let C = 0; C < 5; ++C) {
                const cellRef = XLSX.utils.encode_cell({r: resumoHeaderRow, c: C});
                if(ws[cellRef]) Object.assign(ws[cellRef].s = ws[cellRef].s || {}, { font: { bold: true }, fill: { fgColor: { rgb: "FFCCCCCC" } } }); // Light gray fill
            }
        }
        const firstDataRowResumo = resumoHeaderRow + 1;
        for (let R = firstDataRowResumo; R < firstDataRowResumo + yearsCount; ++R) {
            for (let C of [1, 2, 3]) { // Monetary
                 const cell = ws[XLSX.utils.encode_cell({r:R, c:C})];
                 if(cell && typeof cell.v === 'number') { cell.t = 'n'; cell.z = 'R$ #,##0.00'; }
            }
            const percCell = ws[XLSX.utils.encode_cell({r:R, c:4})]; // Percentage
            if(percCell && typeof percCell.v === 'number') { percCell.t = 'n'; percCell.z = '0.00%'; }
        }
        const fatAnualRow = data.findIndex(row => row[0] === "Faturamento Anual:");
        if (fatAnualRow !== -1) {
             const cell = ws[XLSX.utils.encode_cell({r:fatAnualRow, c:1})];
             if(cell && typeof cell.v === 'number') { cell.t = 'n'; cell.z = 'R$ #,##0.00'; }
        }
        const varTotalRow = data.findIndex(row => row[0] === "Variação Total Acumulada:");
        if (varTotalRow !== -1) {
             const cell = ws[XLSX.utils.encode_cell({r:varTotalRow, c:1})];
             if(cell && typeof cell.v === 'number') { cell.t = 'n'; cell.z = 'R$ #,##0.00'; }
        }
        return ws;
    }

    _applyResultsStyles(ws, data, yearsCount, firstDataRowActual) { // eslint-disable-line no-unused-vars
        ws['!cols'] = [ {wch:10}, {wch:25}, {wch:25}, {wch:20}, {wch:15}, {wch:40} ];
        ws['!merges'] = [ { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } } ]; 
        if(ws['A1']) Object.assign(ws['A1'].s = ws['A1'].s || {}, { font: { bold: true, sz: 16 }, alignment: { horizontal: "center"} });
        const headerRowIdx = firstDataRowActual - 1; // Header is one row above data start
         for (let C = 0; C < 6; ++C) {
            const cellRef = XLSX.utils.encode_cell({r: headerRowIdx, c: C});
            if(ws[cellRef]) Object.assign(ws[cellRef].s = ws[cellRef].s || {}, { font: { bold: true }, fill: { fgColor: { rgb: "FFCCCCCC" } }});
        }
        for (let R = firstDataRowActual; R < firstDataRowActual + yearsCount; ++R) {
            for (let C of [1, 2, 3]) { // Monetary
                 const cell = ws[XLSX.utils.encode_cell({r:R, c:C})];
                 if(cell && typeof cell.v === 'number') { cell.t = 'n'; cell.z = 'R$ #,##0.00'; }
            }
            const percCell = ws[XLSX.utils.encode_cell({r:R, c:4})]; // Percentage
            if(percCell && typeof percCell.v === 'number') { percCell.t = 'n'; percCell.z = '0.00%'; }
        }
        const analysisStartRow = firstDataRowActual + yearsCount + 2; // Formulas start after data and one blank row
        for (let R = analysisStartRow; R < analysisStartRow + 4; ++R) { 
            const cell = ws[XLSX.utils.encode_cell({r:R, c:1})]; 
            if(cell && cell.f) { cell.t = 'n'; cell.z = 'R$ #,##0.00'; }
        }
        return ws;
    }
    
    _formatarValorPadrao(valor, tipo) {
        if (typeof window.DataManager !== 'undefined' && window.DataManager) {
            try {
                switch (tipo) {
                    case 'monetario':
                        if (typeof window.DataManager.formatarMoeda === 'function') return window.DataManager.formatarMoeda(valor);
                        break;
                    case 'percentual': // For display string "25,00%" from fraction 0.25
                        if (typeof window.DataManager.formatarPercentual === 'function') return window.DataManager.formatarPercentual(valor);
                        break;
                    case 'data': // For display string "DD/MM/YYYY"
                        if (typeof window.DataManager.formatarData === 'function') return window.DataManager.formatarData(new Date(valor));
                        break;
                    case 'texto': break; 
                }
            } catch (e) { console.warn(`ExcelExporter: Error using DataManager formatting for type '${tipo}', using fallback.`, e); }
        }
        // Fallback formatting
        const manager = new ExportManager(); // Assuming this has basic formatters
        switch (tipo) {
            case 'monetario': return manager.formatCurrency ? manager.formatCurrency(valor) : (typeof valor === 'number' ? valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : String(valor));
            case 'percentual': return manager.formatPercentage ? manager.formatPercentage(valor * 100) : (typeof valor === 'number' ? (valor * 100).toFixed(2).replace('.', ',') + '%' : String(valor));
            case 'data': 
                try { return manager.formatDate ? manager.formatDate(new Date(valor)) : new Date(valor).toLocaleDateString('pt-BR'); } catch { return String(valor); }
            default: return valor !== null && typeof valor !== "undefined" ? valor.toString() : '';
        }
    }
}

// Expose classes to global scope if not using a module system
if (typeof window !== 'undefined') {
    window.PDFExporter = PDFExporter;
    window.ExcelExporter = ExcelExporter;
}
