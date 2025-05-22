/**
 * Core Export Tools
 * Base module for document export functionality
 */
class ExportManager {
    constructor(config = {}) {
        this.config = this._initConfig(config);
        this.exporters = {};
    }

    /**
     * Initialize configuration with defaults
     * @private
     * @param {Object} customConfig - Custom configuration to merge
     * @returns {Object} Merged configuration
     */
    _initConfig(customConfig) {
        // Default configurations
        const defaultConfig = {
            excel: {
                colors: {
                    primary: "FF3498DB", // Azul principal
                    secondary: "2ECC71", // Verde
                    accent: "E74C3C", // Vermelho
                    neutral: "7F8C8D", // Cinza
                    highlight: "9B59B6", // Roxo
                    background: "F8F9FA", // Fundo claro
                    headerBg: "EAEAEA", // Fundo de cabeçalho
                    lightBg1: "F5F8FA", // Fundo claro 1 (alternado para tabelas)
                    lightBg2: "FFFFFF" // Fundo claro 2 (alternado para tabelas)
                },
                defaultColumnWidth: 15, // Largura padrão de coluna em caracteres
                defaultRowHeight: 18, // Altura padrão de linha em pontos
                defaultFontName: "Calibri", // Fonte padrão
                defaultFontSize: 11, // Tamanho da fonte padrão
                defaultBoldFontSize: 11, // Tamanho da fonte em negrito
                defaultHeaderFontSize: 14, // Tamanho da fonte para cabeçalhos
                defaultTitleFontSize: 16, // Tamanho da fonte para títulos
                logoEnabled: true, // Habilitar logo
                logoSize: {
                    // Tamanho do logo
                    width: 180,
                    height: 60
                }
            },
            pdf: {
                pageSize: "a4",
                orientation: "portrait",
                margins: {
                    top: 25,
                    right: 15,
                    bottom: 25,
                    left: 15
                },
                headerHeight: 20,
                footerHeight: 15,
                colors: {
                    primary: [52, 152, 219], // Azul principal
                    secondary: [46, 204, 113], // Verde
                    accent: [231, 76, 60], // Vermelho
                    neutral: [127, 140, 141], // Cinza
                    highlight: [155, 89, 182] // Roxo
                },
                fonts: {
                    header: {
                        name: "helvetica",
                        style: "bold",
                        size: 18
                    },
                    subtitle: {
                        name: "helvetica",
                        style: "bold",
                        size: 14
                    },
                    section: {
                        name: "helvetica",
                        style: "bold",
                        size: 12
                    },
                    normal: {
                        name: "helvetica",
                        style: "normal",
                        size: 10
                    },
                    small: {
                        name: "helvetica",
                        style: "normal",
                        size: 8
                    }
                },
                logoPath: "assets/images/expertzy-it.png",
                logoEnabled: true,
                logoSize: {
                    width: 40,
                    height: 15
                }
            }
        };

        // Merge with custom config
        return this._deepMerge(defaultConfig, customConfig);
    }

    /**
     * Deep merge of objects
     * @private
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    _deepMerge(target, source) {
        const output = Object.assign({}, target);

        if (this._isObject(target) && this._isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this._isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this._deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }

        return output;
    }

    /**
     * Checks if value is an object
     * @private
     * @param {*} item - Value to check
     * @returns {boolean} True if object
     */
    _isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    /**
     * Register an exporter for a specific file type
     * @param {string} type - Type of exporter (pdf, excel, etc.)
     * @param {Object} exporter - Exporter instance
     */
    registerExporter(type, exporter) {
        this.exporters[type] = exporter;
        exporter.setConfig(this.config);
    }

    /**
     * Get registered exporter by type
     * @param {string} type - Type of exporter
     * @returns {Object|null} Exporter instance or null if not found
     */
    getExporter(type) {
        return this.exporters[type] || null;
    }

    /**
     * Export data using registered exporter
     * @param {string} type - Type of export (pdf, excel, etc.)
     * @param {Object} data - Data to export
     * @param {Object} options - Export options
     * @returns {Promise} Promise resolved after export
     */
    export(type, data, options = {}) {
        const exporter = this.getExporter(type);

        if (!exporter) {
            return Promise.reject(new Error(`No exporter registered for type: ${type}`));
        }

        return exporter.export(data, options);
    }

    /**
     * Format date to string
     * @param {Date} date - Date to format
     * @param {string} format - Format string (optional)
     * @returns {string} Formatted date
     */
    formatDate(date, format = 'dd/MM/yyyy HH:mm') {
        if (!date || !(date instanceof Date)) {
            date = new Date();
        }

        const dia = String(date.getDate()).padStart(2, "0");
        const mes = String(date.getMonth() + 1).padStart(2, "0");
        const ano = date.getFullYear();
        const hora = String(date.getHours()).padStart(2, "0");
        const minuto = String(date.getMinutes()).padStart(2, "0");

        return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
    }

    /**
     * Format date simple (only date)
     * @param {Date} date - Date to format
     * @returns {string} Formatted date
     */
    formatDateSimple(date) {
        if (!date || !(date instanceof Date)) {
            return "N/A";
        }

        const dia = String(date.getDate()).padStart(2, "0");
        const mes = String(date.getMonth() + 1).padStart(2, "0");
        const ano = date.getFullYear();

        return `${dia}/${mes}/${ano}`;
    }

    /**
     * Format currency value
     * @param {number} value - Value to format
     * @returns {string} Formatted currency
     */
    formatCurrency(value) {
        if (isNaN(value) || value === undefined || value === null) {
            return "R$ 0,00";
        }

        return "R$ " + Number(value).toLocaleString("pt-BR", { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    }

    /**
     * Format percentage value
     * @param {number} value - Value to format
     * @returns {string} Formatted percentage
     */
    formatPercentage(value) {
        if (value === undefined || value === null || isNaN(parseFloat(value))) {
            return "0,00%";
        }

        return `${Math.abs(parseFloat(value)).toFixed(2)}%`;
    }

    /**
     * Capitalize first letter of a string
     * @param {string} text - Text to capitalize
     * @returns {string} Capitalized text
     */
    capitalizeFirstLetter(text) {
        if (!text || typeof text !== "string") {
            return "";
        }
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    /**
     * Get formatted tax regime name
     * @param {string} regime - Tax regime code
     * @returns {string} Formatted tax regime name
     */
    getTaxRegimeFormatted(regime) {
        const regimes = {
            real: "Lucro Real",
            presumido: "Lucro Presumido",
            simples: "Simples Nacional",
            mei: "Microempreendedor Individual",
            imune: "Entidade Imune/Isenta"
        };

        return regimes[regime] || regime;
    }

    /**
     * Request filename from user
     * @param {string} extension - File extension
     * @param {string} defaultName - Default filename
     * @returns {string|null} Filename with extension or null if cancelled
     */
    requestFilename(extension, defaultName) {
        let filename = prompt(
            `Digite o nome do arquivo para salvar (sem a extensão .${extension}):`,
            defaultName || `relatorio-${new Date().toISOString().slice(0, 10)}`
        );

        if (filename === null) {
            return null;
        }

        // Clean invalid characters
        filename = filename.replace(/[<>:"/\\|?*]/g, "-");

        if (!filename.trim()) {
            filename = defaultName || `relatorio-${new Date().toISOString().slice(0, 10)}`;
        }

        return `${filename}.${extension}`;
    }

    /**
     * Validate simulation data
     * @param {Object} simulation - Simulation data
     * @returns {boolean} True if valid
     */
    validateSimulationData(simulation) {
        if (!simulation) {
            console.error('Simulation object is undefined or null');
            return false;
        }

        if (!simulation.dados) {
            console.error('Simulation data is missing');
            return false;
        }

        if (!simulation.resultados) {
            console.error('Simulation results are missing');
            return false;
        }

        return true;
    }
}

// Expor a classe ao escopo global
window.ExportManager = ExportManager;
