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
     * @param {Object} simulation - Simulation data to export
     * @param {Object} options - Export options
     * @returns {Promise} Promise resolved after export
     */
    export(simulation, options = {}) {
        console.log("Starting PDF export");

        if (!this.validateLibraries()) {
            return Promise.reject('jsPDF not available');
        }

        // Validar disponibilidade do DataManager
        if (!window.DataManager) {
            return Promise.reject('DataManager não disponível. Sistema de exportação requer DataManager para funcionar.');
        }

        try {
            // Obter dados da simulação de forma padronizada
            let dadosSimulacao;

            if (!simulation) {
                // Tentar obter da última simulação
                if (window.ultimaSimulacao) {
                    simulation = window.ultimaSimulacao;
                } else {
                    return Promise.reject('Nenhuma simulação disponível para exportação');
                }
            }

            // Detectar e converter para estrutura aninhada usando DataManager
            const tipoEstrutura = window.DataManager.detectarTipoEstrutura(simulation);

            if (tipoEstrutura === "plana") {
                dadosSimulacao = window.DataManager.converterParaEstruturaAninhada(simulation);
            } else if (tipoEstrutura === "aninhada") {
                dadosSimulacao = simulation;
            } else {
                // Tentar extrair dados de estruturas complexas
                if (simulation.dados && simulation.dados.empresa !== undefined) {
                    dadosSimulacao = simulation.dados;
                } else if (simulation.dadosUtilizados && simulation.dadosUtilizados.empresa !== undefined) {
                    dadosSimulacao = simulation.dadosUtilizados;
                } else {
                    return Promise.reject('Estrutura de dados da simulação não reconhecida');
                }
            }

            // Validar e normalizar dados usando DataManager
            dadosSimulacao = window.DataManager.validarENormalizar(dadosSimulacao);

            // Extrair resultados da simulação
            let resultadosSimulacao;
            if (simulation.resultados) {
                resultadosSimulacao = simulation.resultados;
            } else if (simulation.impactoBase || simulation.projecaoTemporal) {
                resultadosSimulacao = simulation;
            } else {
                return Promise.reject('Resultados da simulação não encontrados');
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

            // Add simulation results
            currentPositionY = this._addRobustSimulationResults(
                doc, 
                simulation, 
                resultadosSimulacao,
                pageCount
            );
            doc.addPage();
            pageCount++;

            // Add charts
            currentPositionY = this._addRobustCharts(doc, pageCount);
            doc.addPage();
            pageCount++;

            // Add strategy analysis
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
            return Promise.reject({
                success: false,
                message: `Error exporting to PDF: ${error.message}`,
                error: error
            });
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

        // Usar formatadores padronizados do DataManager
        const formatCurrency = (valor) => {
            if (window.DataManager && typeof window.DataManager.formatarMoeda === 'function') {
                return window.DataManager.formatarMoeda(valor);
            }
            return new ExportManager().formatCurrency(valor);
        };

        const formatPercentage = (valor) => {
            if (window.DataManager && typeof window.DataManager.formatarPercentual === 'function') {
                return window.DataManager.formatarPercentual(valor * 100);
            }
            return new ExportManager().formatPercentage(valor * 100);
        };

        // Seção 1.1 - Dados da Empresa
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(this.config.pdf.colors.secondary[0], this.config.pdf.colors.secondary[1], this.config.pdf.colors.secondary[2]);
        doc.text('1.1. Dados da Empresa', margins.left, currentY);
        currentY += 10;

        // Dados empresa usando estrutura aninhada padronizada
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);

        // Obter valores da estrutura canônica com valores padrão seguros
        const nomeEmpresa = data?.empresa?.nome || 'N/A';

        let setor = 'N/A';
        if (data?.empresa?.setor) {
            if (window.SetoresRepository && typeof window.SetoresRepository.obterSetor === 'function') {
                const setorObj = window.SetoresRepository.obterSetor(data.empresa.setor);
                setor = setorObj?.nome || data.empresa.setor;
            } else {
                setor = data.empresa.setor;
            }
        }

        const regimeTributario = this._obterRegimeTributarioFormatado(data?.empresa?.regime);
        const faturamento = typeof data?.empresa?.faturamento === 'number' ? 
            formatCurrency(data.empresa.faturamento) : 'N/A';
        const margem = typeof data?.empresa?.margem === 'number' ? 
            formatPercentage(data.empresa.margem) : 'N/A';

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

        // Dados tributação usando estrutura aninhada
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);

        const aliquota = typeof data?.parametrosFiscais?.aliquota === 'number' ? 
            formatPercentage(data.parametrosFiscais.aliquota) : 'N/A';
        const reducaoEspecial = typeof data?.ivaConfig?.reducaoEspecial === 'number' ? 
            formatPercentage(data.ivaConfig.reducaoEspecial) : 'N/A';
        const tipoOperacao = data?.parametrosFiscais?.tipoOperacao || 'N/A';

        // Calcular créditos totais de forma segura
        let creditosTotais = 0;
        if (data?.parametrosFiscais?.creditos) {
            const creditos = data.parametrosFiscais.creditos;
            creditosTotais = Object.values(creditos).reduce((total, credito) => {
                return total + (typeof credito === 'number' ? credito : 0);
            }, 0);
        }

        const dadosTributacao = [
            { label: "Alíquota Efetiva:", valor: aliquota },
            { label: "Redução Especial:", valor: reducaoEspecial },
            { label: "Tipo de Operação:", valor: tipoOperacao },
            { label: "Créditos Tributários:", valor: formatCurrency(creditosTotais) },
            { label: "Split Payment Ativo:", valor: data?.parametrosSimulacao?.splitPayment ? 'Sim' : 'Não' }
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

        // Dados ciclo financeiro usando estrutura aninhada
        const pmr = typeof data?.cicloFinanceiro?.pmr === 'number' ? 
            data.cicloFinanceiro.pmr + ' dias' : 'N/A';
        const pmp = typeof data?.cicloFinanceiro?.pmp === 'number' ? 
            data.cicloFinanceiro.pmp + ' dias' : 'N/A';
        const pme = typeof data?.cicloFinanceiro?.pme === 'number' ? 
            data.cicloFinanceiro.pme + ' dias' : 'N/A';

        // Calcular ciclo financeiro
        let cicloFinanceiro = 'N/A';
        if (typeof data?.cicloFinanceiro?.pmr === 'number' && 
            typeof data?.cicloFinanceiro?.pmp === 'number' && 
            typeof data?.cicloFinanceiro?.pme === 'number') {
            cicloFinanceiro = (data.cicloFinanceiro.pmr + data.cicloFinanceiro.pme - data.cicloFinanceiro.pmp) + ' dias';
        }

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

        // Dados da simulação usando estrutura aninhada
        const manager = new ExportManager();
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
    
    /**
     * Obtém o nome formatado do regime tributário
     * @private
     * @param {string} regime - Código do regime tributário
     * @returns {string} Nome formatado do regime
     */
    _obterRegimeTributarioFormatado(regime) {
        const regimes = {
            'real': 'Lucro Real',
            'presumido': 'Lucro Presumido', 
            'simples': 'Simples Nacional',
            'mei': 'Microempreendedor Individual'
        };

        return regimes[regime] || regime || 'N/A';
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

    /**
     * Export data to Excel
     * @param {Object} simulation - Simulation data to export
     * @param {Object} options - Export options
     * @returns {Promise} Promise resolved after export
     */
    export(simulation, options = {}) {
        console.log("Starting Excel export");

        if (!this.validateLibraries()) {
            return Promise.reject("XLSX library not loaded");
        }

        // Validar disponibilidade do DataManager
        if (!window.DataManager) {
            return Promise.reject('DataManager não disponível. Sistema de exportação requer DataManager para funcionar.');
        }

        return new Promise((resolve, reject) => {
            try {
                // Obter dados da simulação de forma padronizada
                let dadosSimulacao;

                if (!simulation) {
                    if (window.ultimaSimulacao) {
                        simulation = window.ultimaSimulacao;
                    } else {
                        return reject("Nenhuma simulação disponível para exportação");
                    }
                }

                // Detectar e converter para estrutura aninhada usando DataManager
                const tipoEstrutura = window.DataManager.detectarTipoEstrutura(simulation);

                if (tipoEstrutura === "plana") {
                    dadosSimulacao = window.DataManager.converterParaEstruturaAninhada(simulation);
                } else if (tipoEstrutura === "aninhada") {
                    dadosSimulacao = simulation;
                } else {
                    // Tentar extrair dados de estruturas complexas
                    if (simulation.dados && simulation.dados.empresa !== undefined) {
                        dadosSimulacao = simulation.dados;
                    } else if (simulation.dadosUtilizados && simulation.dadosUtilizados.empresa !== undefined) {
                        dadosSimulacao = simulation.dadosUtilizados;
                    } else {
                        return reject('Estrutura de dados da simulação não reconhecida');
                    }
                }

                // Validar e normalizar dados usando DataManager
                dadosSimulacao = window.DataManager.validarENormalizar(dadosSimulacao);

                // Extrair resultados da simulação
                let resultadosSimulacao;
                if (simulation.resultados) {
                    resultadosSimulacao = simulation.resultados;
                } else if (simulation.impactoBase || simulation.projecaoTemporal) {
                    resultadosSimulacao = simulation;
                } else {
                    return reject('Resultados da simulação não encontrados');
                }

                // Initialize equivalentRates if it doesn't exist
                const equivalentRates = simulation.aliquotasEquivalentes || {};

                // Request filename
                const manager = new ExportManager();
                const filename = manager.requestFilename("xlsx", "relatorio-split-payment");
                if (!filename) {
                    return resolve({success: false, message: "Export cancelled by user"});
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
                const wsSummary = this._createSummaryWorksheet(dadosSimulacao, resultadosSimulacao, equivalentRates);
                XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

                // 2. Results Worksheet
                const wsResults = this._createResultsWorksheet(dadosSimulacao, resultadosSimulacao);
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

                reject({
                    success: false,
                    message: `Error exporting to Excel: ${error.message}`,
                    error: error
                });
            }
        });
    }

   _createSummaryWorksheet(data, results, equivalentRates) {
        // Usar formatadores padronizados do DataManager
        const formatarMoeda = (valor) => {
            if (window.DataManager && typeof window.DataManager.formatarMoeda === 'function') {
                return window.DataManager.formatarMoeda(valor);
            }
            return new ExportManager().formatCurrency(valor);
        };

        const formatarPercentual = (valor) => {
            if (window.DataManager && typeof window.DataManager.formatarPercentual === 'function') {
                return window.DataManager.formatarPercentual(valor * 100);
            }
            return new ExportManager().formatPercentage(valor * 100);
        };

        const formatarData = (valor) => {
            if (valor instanceof Date) {
                return valor.toLocaleDateString('pt-BR');
            } else if (typeof valor === 'string') {
                return new Date(valor).toLocaleDateString('pt-BR');
            }
            return new ExportManager().formatDate(new Date());
        };

        // Dados da planilha usando estrutura aninhada padronizada
        const summaryData = [
            ["RELATÓRIO DE SIMULAÇÃO - SPLIT PAYMENT"],
            ["Expertzy Inteligência Tributária"],
            ["Data do relatório:", formatarData(new Date())],
            [],
            ["RESUMO EXECUTIVO"],
            [],
            ["Parâmetros Principais"],
            ["Empresa:", data?.empresa?.nome || "N/A"],
            ["Setor:", this._obterNomeSetorFormatado(data?.empresa?.setor)],
            ["Regime Tributário:", this._obterRegimeTributarioFormatado(data?.empresa?.regime)],
            ["Faturamento Anual:", formatarMoeda(data?.empresa?.faturamento || 0)],
            ["Período de Simulação:", 
                `${data?.parametrosSimulacao?.dataInicial?.split('-')[0] || '2026'} a ${data?.parametrosSimulacao?.dataFinal?.split('-')[0] || '2033'}`
            ],
            [],
            ["Resultados Principais"]
        ];

        // Calcular indicadores usando dados estruturados
        let anos = [];
        let variacaoTotal = 0;
        let maiorImpacto = { valor: 0, ano: "" };
        let menorImpacto = { valor: Number.MAX_SAFE_INTEGER, ano: "" };

        // Obter anos de forma consistente
        if (results?.projecaoTemporal?.resultadosAnuais) {
            anos = Object.keys(results.projecaoTemporal.resultadosAnuais).sort();
        } else if (results?.resultadosExportacao?.anos) {
            anos = results.resultadosExportacao.anos;
        } else {
            // Usar cronograma padrão
            anos = ["2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033"];
        }

        // Calcular variações usando dados padronizados
        anos.forEach((ano) => {
            let resultado = {};

            if (results?.projecaoTemporal?.resultadosAnuais?.[ano]) {
                resultado = results.projecaoTemporal.resultadosAnuais[ano];
            } else if (results?.resultadosExportacao?.resultadosPorAno?.[ano]) {
                resultado = results.resultadosExportacao.resultadosPorAno[ano];
            }

            const valorAtual = resultado.resultadoAtual?.capitalGiroDisponivel || 0;
            const valorNovo = resultado.resultadoSplitPayment?.capitalGiroDisponivel || 0;
            const diferenca = resultado.diferencaCapitalGiro || (valorNovo - valorAtual);

            variacaoTotal += diferenca;

            if (Math.abs(diferenca) > Math.abs(maiorImpacto.valor)) {
                maiorImpacto.valor = diferenca;
                maiorImpacto.ano = ano;
            }

            if (Math.abs(diferenca) < Math.abs(menorImpacto.valor)) {
                menorImpacto.valor = diferenca;
                menorImpacto.ano = ano;
            }
        });

        const impactoGeral = variacaoTotal > 0 ? "Aumento da necessidade de capital de giro" : "Redução da necessidade de capital de giro";

        // Adicionar resultados principais
        summaryData.push(
            ["Impacto Geral:", impactoGeral],
            ["Variação Total Acumulada:", formatarMoeda(variacaoTotal)],
            ["Ano de Maior Impacto:", `${maiorImpacto.ano} (${formatarMoeda(maiorImpacto.valor)})`],
            ["Ano de Menor Impacto:", `${menorImpacto.ano} (${formatarMoeda(menorImpacto.valor)})`],
            []
        );

        // Tabela de resultados resumidos
        summaryData.push(["Resumo Anual"], ["Ano", "Split Payment", "Sist. Atual", "Diferença", "Variação (%)"]);

        // Adicionar dados para cada ano usando formatação padronizada
        anos.forEach((ano) => {
            let resultado = {};

            if (results?.projecaoTemporal?.resultadosAnuais?.[ano]) {
                resultado = results.projecaoTemporal.resultadosAnuais[ano];
            } else if (results?.resultadosExportacao?.resultadosPorAno?.[ano]) {
                resultado = results.resultadosExportacao.resultadosPorAno[ano];
            }

            const valorAtual = resultado.resultadoAtual?.capitalGiroDisponivel || 0;
            const valorNovo = resultado.resultadoSplitPayment?.capitalGiroDisponivel || 0;
            const diferenca = resultado.diferencaCapitalGiro || (valorNovo - valorAtual);
            const percentual = valorAtual !== 0 ? (diferenca / valorAtual) : 0;

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
     * Obtém o nome formatado do setor
     * @private
     * @param {string} setorCodigo - Código do setor
     * @returns {string} Nome formatado do setor
     */
    _obterNomeSetorFormatado(setorCodigo) {
        if (!setorCodigo) return 'N/A';

        // Tentar obter do repositório de setores se disponível
        if (window.SetoresRepository && typeof window.SetoresRepository.obterSetor === 'function') {
            const setor = window.SetoresRepository.obterSetor(setorCodigo);
            if (setor?.nome) {
                return setor.nome;
            }
        }

        // Fallback: capitalizar o código
        return setorCodigo.charAt(0).toUpperCase() + setorCodigo.slice(1).toLowerCase();
    }

    /**
     * Obtém o nome formatado do regime tributário
     * @private
     * @param {string} regime - Código do regime tributário
     * @returns {string} Nome formatado do regime
     */
    _obterRegimeTributarioFormatado(regime) {
        const regimes = {
            'real': 'Lucro Real',
            'presumido': 'Lucro Presumido',
            'simples': 'Simples Nacional',
            'mei': 'Microempreendedor Individual'
        };

        return regimes[regime] || regime || 'N/A';
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
