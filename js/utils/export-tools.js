/**
 * Ferramentas de Exportação
 * Gerencia a exportação de dados para diferentes formatos
 */
import { PDFExporter, ExcelExporter } from './document-exporters.js';

const ExportTools = (function() {
    let pdfExporter = null;
    let excelExporter = null;
    let initialized = false;

    /**
     * Inicializa as ferramentas de exportação com configurações
     * @param {Object} config - Configurações personalizadas (opcional)
     */
    function inicializar(config = {}) {
        console.log("Inicializando ferramentas de exportação...");
        
        // Verificar bibliotecas necessárias
        if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
            console.warn("Biblioteca jsPDF não carregada. A exportação para PDF não estará disponível.");
        }
        
        if (typeof XLSX === 'undefined') {
            console.warn("Biblioteca XLSX (SheetJS) não carregada. A exportação para Excel não estará disponível.");
        }
        
        try {
            // Criar instâncias dos exportadores
            pdfExporter = new PDFExporter();
            excelExporter = new ExcelExporter();
            
            // Registrar exportadores no gerenciador, se disponível
            if (typeof ExportManager !== 'undefined') {
                const manager = new ExportManager(config);
                manager.registerExporter('pdf', pdfExporter);
                manager.registerExporter('excel', excelExporter);
                
                // Manter referência ao manager para uso nas funções de exportação
                window.exportManager = manager;
            } else {
                console.warn("ExportManager não encontrado. Usando exportadores diretamente.");
            }
            
            initialized = true;
            console.log("Ferramentas de exportação inicializadas com sucesso.");
        } catch (error) {
            console.error("Erro ao inicializar ferramentas de exportação:", error);
        }
    }

    /**
     * Exporta os dados da simulação para PDF
     */
    function exportarParaPDF() {
        console.log("Iniciando exportação para PDF...");
        
        if (!initialized) {
            inicializar();
        }
        
        if (!pdfExporter) {
            alert("Exportador PDF não inicializado corretamente.");
            return;
        }
        
        try {
            // Obter dados da simulação atual
            const simulacao = window.ultimaSimulacao || window.resultadosSimulacao;
            
            if (!simulacao) {
                alert("Nenhuma simulação disponível para exportar. Execute uma simulação primeiro.");
                return;
            }
            
            // Exportar usando diretamente o exportador
            pdfExporter.export(simulacao)
                .then(resultado => {
                    if (resultado.success) {
                        console.log("Exportação PDF concluída com sucesso:", resultado.fileName);
                    } else {
                        console.warn("Exportação PDF cancelada ou incompleta:", resultado.message);
                    }
                })
                .catch(erro => {
                    console.error("Erro na exportação PDF:", erro);
                    alert("Ocorreu um erro durante a exportação para PDF. Verifique o console para detalhes.");
                });
        } catch (error) {
            console.error("Erro ao tentar exportar para PDF:", error);
            alert("Ocorreu um erro ao preparar a exportação para PDF: " + error.message);
        }
    }

    /**
     * Exporta os dados da simulação para Excel
     */
    function exportarParaExcel() {
        console.log("Iniciando exportação para Excel...");
        
        if (!initialized) {
            inicializar();
        }
        
        if (!excelExporter) {
            alert("Exportador Excel não inicializado corretamente.");
            return;
        }
        
        try {
            // Obter dados da simulação atual
            const simulacao = window.ultimaSimulacao || window.resultadosSimulacao;
            
            if (!simulacao) {
                alert("Nenhuma simulação disponível para exportar. Execute uma simulação primeiro.");
                return;
            }
            
            // Exportar usando diretamente o exportador
            excelExporter.export(simulacao)
                .then(resultado => {
                    if (resultado.success) {
                        console.log("Exportação Excel concluída com sucesso:", resultado.fileName);
                    } else {
                        console.warn("Exportação Excel cancelada ou incompleta:", resultado.message);
                    }
                })
                .catch(erro => {
                    console.error("Erro na exportação Excel:", erro);
                    alert("Ocorreu um erro durante a exportação para Excel. Verifique o console para detalhes.");
                });
        } catch (error) {
            console.error("Erro ao tentar exportar para Excel:", error);
            alert("Ocorreu um erro ao preparar a exportação para Excel: " + error.message);
        }
    }

    /**
     * Exporta a memória de cálculo para arquivo de texto
     */
    function exportarMemoriaCalculo() {
        console.log("Iniciando exportação da memória de cálculo...");
        
        try {
            // Obter ano selecionado
            const selectAnoMemoria = document.getElementById('select-ano-memoria');
            const anoSelecionado = selectAnoMemoria ? selectAnoMemoria.value : '2026';
            
            // Obter memória de cálculo
            if (!window.memoriaCalculoSimulacao || !window.memoriaCalculoSimulacao[anoSelecionado]) {
                alert("Memória de cálculo não disponível para o ano selecionado. Execute uma simulação primeiro.");
                return;
            }
            
            const memoriaCalculo = window.memoriaCalculoSimulacao[anoSelecionado];
            
            // Criar link de download
            const blob = new Blob([memoriaCalculo], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `memoria-calculo-${anoSelecionado}.txt`;
            document.body.appendChild(a);
            a.click();
            
            // Limpeza
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
            
            console.log("Memória de cálculo exportada com sucesso.");
        } catch (error) {
            console.error("Erro ao exportar memória de cálculo:", error);
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

// Expor ao escopo global
window.ExportTools = ExportTools;

// Inicializar se o documento já estiver carregado
if (document.readyState !== 'loading') {
    ExportTools.inicializar();
} else {
    document.addEventListener('DOMContentLoaded', function() {
        ExportTools.inicializar();
    });
}

export default ExportTools;
