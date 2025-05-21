'use strict';

/**
 * Ferramentas de Exportação
 * Gerencia a exportação de dados para diferentes formatos
 */

const ExportTools = (function() {
    let pdfExporter = null;
    let excelExporter = null;
    let initialized = false;

    /**
     * Inicializa as ferramentas de exportação com configurações
     * @param {Object} config - Configurações personalizadas (opcional)
     */
    function inicializar(config = {}) {
        console.log("ExportTools: Inicializando ferramentas de exportação...");
        
        // DataManager Check
        if (typeof window.DataManager !== 'undefined' && window.DataManager) {
            console.log("ExportTools: DataManager encontrado.");
        } else {
            console.warn("ExportTools: DataManager não encontrado. Algumas funcionalidades de processamento de dados podem ser limitadas.");
        }

        // Verificar bibliotecas necessárias (jsPDF, XLSX)
        const jspdfAvailable = typeof window.jspdf !== 'undefined' || typeof window.jsPDF !== 'undefined';
        const xlsxAvailable = typeof XLSX !== 'undefined';
        
        if (!jspdfAvailable) {
            console.warn("ExportTools: Biblioteca jsPDF não carregada. A exportação para PDF não estará disponível.");
        }
        
        if (!xlsxAvailable) {
            console.warn("ExportTools: Biblioteca XLSX (SheetJS) não carregada. A exportação para Excel não estará disponível.");
        }
        
        try {
            // Verificar se os construtores dos exportadores estão disponíveis
            if (typeof window.PDFExporter === 'undefined') {
                console.error("ExportTools: PDFExporter constructor não encontrado. Verifique se document-exporters.js foi carregado.");
            } else {
                pdfExporter = new window.PDFExporter();
                console.log("ExportTools: PDFExporter instanciado.");
            }
            
            if (typeof window.ExcelExporter === 'undefined') {
                console.error("ExportTools: ExcelExporter constructor não encontrado. Verifique se document-exporters.js foi carregado.");
            } else {
                excelExporter = new window.ExcelExporter();
                console.log("ExportTools: ExcelExporter instanciado.");
            }
            
            // Configurar ExportManager se disponível (para registrar os exportadores, por exemplo)
            if (typeof window.ExportManager !== 'undefined' && window.ExportManager) {
                const manager = new window.ExportManager(config); // ExportManager é uma classe diferente de DataManager
                if (pdfExporter) manager.registerExporter('pdf', pdfExporter);
                if (excelExporter) manager.registerExporter('excel', excelExporter);
                window.exportManager = manager; // Tornar acessível globalmente se necessário
                console.log("ExportTools: ExportManager inicializado e exportadores registrados.");
            } else {
                console.warn("ExportTools: ExportManager não encontrado. Funcionalidades de gerenciamento de exportação podem ser limitadas.");
            }
            
            initialized = true;
            console.log("ExportTools: Ferramentas de exportação inicializadas.");
        } catch (error) {
            console.error("ExportTools: Erro ao inicializar ferramentas de exportação:", error, error.stack);
            initialized = false; // Garantir que não seja considerado inicializado em caso de erro.
        }
    }

    /**
     * Exporta os dados da simulação para PDF
     */
    function exportarParaPDF() {
        console.log("ExportTools: Iniciando exportação para PDF...");
        
        if (!initialized && !pdfExporter) { // Se não inicializado E o pdfExporter não existe
            console.warn("ExportTools: Tentando inicializar agora pois não foi inicializado ou falhou.");
            inicializar(); // Tenta inicializar
            if (!pdfExporter) { // Verifica novamente após a tentativa de inicialização
                console.error("ExportTools: PDFExporter ainda não está disponível após tentativa de inicialização. Abortando exportação para PDF.");
                alert("Exportador PDF não está disponível. Verifique o console.");
                return;
            }
        } else if (!pdfExporter) { // Se inicializado mas pdfExporter não existe (caso raro, mas possível)
             console.error("ExportTools: PDFExporter não foi instanciado corretamente durante a inicialização. Abortando exportação para PDF.");
             alert("Exportador PDF não instanciado. Verifique o console.");
             return;
        }
        
        try {
            const simulacaoOriginal = window.ultimaSimulacao || window.resultadosSimulacao;
            if (!simulacaoOriginal) {
                alert("Nenhuma simulação disponível para exportar. Execute uma simulação primeiro.");
                console.warn("ExportTools: Nenhuma simulação encontrada em window.ultimaSimulacao ou window.resultadosSimulacao.");
                return;
            }

            let dadosParaExportar;

            if (typeof window.DataManager !== 'undefined' && window.DataManager) {
                console.log("ExportTools: DataManager encontrado. Processando dados para PDF...");
                try {
                    const rawData = simulacaoOriginal.dados || simulacaoOriginal;
                    let dadosAninhados = window.DataManager.converterParaEstruturaAninhada(rawData);
                    dadosParaExportar = window.DataManager.validarENormalizar(dadosAninhados);
                    console.log("ExportTools: Dados processados pelo DataManager para PDF.");
                } catch (dmError) {
                    console.error("ExportTools: Erro ao processar dados com DataManager para PDF:", dmError, dmError.stack);
                    alert("Erro ao processar dados para PDF com DataManager. Tentando com dados brutos. Verifique o console.");
                    dadosParaExportar = simulacaoOriginal; // Fallback para dados originais
                }
            } else {
                console.warn("ExportTools: DataManager not found. Proceeding with raw data for PDF export. Results may vary.");
                dadosParaExportar = simulacaoOriginal;
            }
            
            pdfExporter.export(dadosParaExportar)
                .then(resultado => {
                    if (resultado.success) {
                        console.log("ExportTools: Exportação PDF concluída:", resultado.fileName);
                    } else {
                        console.warn("ExportTools: Exportação PDF cancelada ou falhou:", resultado.message);
                    }
                })
                .catch(erro => {
                    console.error("ExportTools: Erro retornado pela exportação PDF:", erro);
                    alert("Ocorreu um erro durante a exportação para PDF. Verifique o console.");
                });
        } catch (error) {
            console.error("ExportTools: Erro crítico ao tentar exportar para PDF:", error, error.stack);
            alert("Ocorreu um erro crítico ao preparar a exportação para PDF: " + error.message);
        }
    }

    /**
     * Exporta os dados da simulação para Excel
     */
    function exportarParaExcel() {
        console.log("ExportTools: Iniciando exportação para Excel...");

        if (!initialized && !excelExporter) {
            console.warn("ExportTools: Tentando inicializar agora pois não foi inicializado ou falhou.");
            inicializar();
            if (!excelExporter) {
                console.error("ExportTools: ExcelExporter ainda não está disponível após tentativa de inicialização. Abortando exportação para Excel.");
                alert("Exportador Excel não está disponível. Verifique o console.");
                return;
            }
        } else if (!excelExporter) {
             console.error("ExportTools: ExcelExporter não foi instanciado corretamente durante a inicialização. Abortando exportação para Excel.");
             alert("Exportador Excel não instanciado. Verifique o console.");
             return;
        }
        
        try {
            const simulacaoOriginal = window.ultimaSimulacao || window.resultadosSimulacao;
            if (!simulacaoOriginal) {
                alert("Nenhuma simulação disponível para exportar. Execute uma simulação primeiro.");
                console.warn("ExportTools: Nenhuma simulação encontrada para Excel.");
                return;
            }

            let dadosParaExportar;

            if (typeof window.DataManager !== 'undefined' && window.DataManager) {
                console.log("ExportTools: DataManager encontrado. Processando dados para Excel...");
                try {
                    const rawData = simulacaoOriginal.dados || simulacaoOriginal;
                    let dadosAninhados = window.DataManager.converterParaEstruturaAninhada(rawData);
                    dadosParaExportar = window.DataManager.validarENormalizar(dadosAninhados);
                    console.log("ExportTools: Dados processados pelo DataManager para Excel.");
                } catch (dmError) {
                    console.error("ExportTools: Erro ao processar dados com DataManager para Excel:", dmError, dmError.stack);
                    alert("Erro ao processar dados para Excel com DataManager. Tentando com dados brutos. Verifique o console.");
                    dadosParaExportar = simulacaoOriginal; // Fallback
                }
            } else {
                console.warn("ExportTools: DataManager not found. Proceeding with raw data for Excel export. Results may vary.");
                dadosParaExportar = simulacaoOriginal;
            }
            
            excelExporter.export(dadosParaExportar)
                .then(resultado => {
                    if (resultado.success) {
                        console.log("ExportTools: Exportação Excel concluída:", resultado.fileName);
                    } else {
                        console.warn("ExportTools: Exportação Excel cancelada ou falhou:", resultado.message);
                    }
                })
                .catch(erro => {
                    console.error("ExportTools: Erro retornado pela exportação Excel:", erro);
                    alert("Ocorreu um erro durante a exportação para Excel. Verifique o console.");
                });
        } catch (error) {
            console.error("ExportTools: Erro crítico ao tentar exportar para Excel:", error, error.stack);
            alert("Ocorreu um erro crítico ao preparar a exportação para Excel: " + error.message);
        }
    }

    /**
     * Exporta a memória de cálculo para arquivo de texto.
     * Nota: Se a estrutura de `window.memoriaCalculoSimulacao` for alterada 
     * para ser gerenciada ou estruturada pelo DataManager, esta função 
     * poderá precisar de atualizações para obter os dados corretamente.
     */
    function exportarMemoriaCalculo() {
        console.log("ExportTools: Iniciando exportação da memória de cálculo...");
        
        try {
            const selectAnoMemoria = document.getElementById('select-ano-memoria');
            const anoSelecionado = selectAnoMemoria ? selectAnoMemoria.value : (window.memoriaCalculoSimulacao ? Object.keys(window.memoriaCalculoSimulacao)[0] : null);
            
            if (!anoSelecionado) {
                alert("Não foi possível determinar o ano para a memória de cálculo.");
                console.warn("ExportTools: Ano para memória de cálculo não determinado.");
                return;
            }

            if (!window.memoriaCalculoSimulacao || !window.memoriaCalculoSimulacao[anoSelecionado]) {
                alert("Memória de cálculo não disponível para o ano selecionado. Execute uma simulação primeiro.");
                console.warn(`ExportTools: Memória de cálculo para o ano ${anoSelecionado} não encontrada.`);
                return;
            }
            
            const memoriaCalculo = window.memoriaCalculoSimulacao[anoSelecionado];
            
            const blob = new Blob([memoriaCalculo], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `memoria-calculo-${anoSelecionado}.txt`;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                console.log("ExportTools: Download da memória de cálculo iniciado, recursos limpos.");
            }, 100);
            
            console.log("ExportTools: Memória de cálculo exportada com sucesso.");
        } catch (error) {
            console.error("ExportTools: Erro ao exportar memória de cálculo:", error, error.stack);
            alert("Ocorreu um erro ao exportar a memória de cálculo: " + error.message);
        }
    }

    return {
        inicializar,
        exportarParaPDF,
        exportarParaExcel,
        exportarMemoriaCalculo
    };
})();

// Expor ao escopo global (se este for o método de módulo utilizado)
if (typeof window !== 'undefined') {
    window.ExportTools = ExportTools;
}

// Auto-inicialização (considerar se isso é desejável ou se a inicialização deve ser explícita)
// Removida a dupla inicialização.
if (document.readyState !== 'loading') {
    ExportTools.inicializar();
} else {
    document.addEventListener('DOMContentLoaded', function() {
        ExportTools.inicializar();
    });
}

// Se estiver usando módulos ES6, a exportação padrão é preferível.
// Comente ou remova a linha abaixo se não estiver usando módulos ES6 ou se window.ExportTools for suficiente.
// export default ExportTools; 
// Nota: A linha `export default ExportTools;` no final do arquivo original sugere um ambiente de módulo ES6.
// Se for o caso, a atribuição `window.ExportTools = ExportTools;` pode ser redundante ou específica para compatibilidade.
// Para este refactor, ambas as formas de exposição são mantidas conforme o original, mas idealmente, um projeto usaria um método de forma consistente.
