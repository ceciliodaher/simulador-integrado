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
        console.log("Inicializando ferramentas de exportação...");
        
        // Verificar bibliotecas necessárias
        const jspdfAvailable = typeof window.jspdf !== 'undefined' || typeof window.jsPDF !== 'undefined';
        const xlsxAvailable = typeof XLSX !== 'undefined';
        
        if (!jspdfAvailable) {
            console.warn("Biblioteca jsPDF não carregada. A exportação para PDF não estará disponível.");
        }
        
        if (!xlsxAvailable) {
            console.warn("Biblioteca XLSX (SheetJS) não carregada. A exportação para Excel não estará disponível.");
        }
        
        try {
            // Verificar se os exportadores estão disponíveis
            if (typeof window.PDFExporter === 'undefined' || typeof window.ExcelExporter === 'undefined') {
                console.error("Exportadores não encontrados. Verifique se document-exporters.js foi carregado corretamente.");
                return;
            }
            
            // Criar instâncias dos exportadores
            pdfExporter = new window.PDFExporter();
            excelExporter = new window.ExcelExporter();
            
            // Verificar se ExportManager está disponível
            if (typeof window.ExportManager !== 'undefined') {
                const manager = new window.ExportManager(config);
                
                // Registrar exportadores no gerenciador
                if (pdfExporter) {
                    manager.registerExporter('pdf', pdfExporter);
                }
                
                if (excelExporter) {
                    manager.registerExporter('excel', excelExporter);
                }
                
                // Manter referência ao manager para uso nas funções de exportação
                window.exportManager = manager;
                
                console.log("ExportManager inicializado e exportadores registrados com sucesso.");
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
            console.error("PDFExporter não inicializado corretamente.");
            alert("Exportador PDF não inicializado corretamente. Verifique o console para detalhes.");
            return;
        }
        
        try {
            // Obter dados da simulação atual
            let simulacao = window.ultimaSimulacao || window.resultadosSimulacao;
            
            if (!simulacao) {
                alert("Nenhuma simulação disponível para exportar. Execute uma simulação primeiro.");
                return;
            }
            
            // Validar a estrutura dos dados usando DataManager se disponível
            if (window.DataManager) {
                const tipoEstrutura = window.DataManager.detectarTipoEstrutura(simulacao);
                
                if (tipoEstrutura === "plana") {
                    // Converter para formato aninhado para exportação
                    simulacao = window.DataManager.converterParaEstruturaAninhada(simulacao);
                    console.log("Dados convertidos de estrutura plana para aninhada para exportação");
                }
                
                // Validar e normalizar
                simulacao = window.DataManager.validarENormalizar(simulacao);
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
            console.error("ExcelExporter não inicializado corretamente.");
            alert("Exportador Excel não inicializado corretamente. Verifique o console para detalhes.");
            return;
        }
        
        try {
            // Obter dados da simulação atual
            let simulacao = window.ultimaSimulacao || window.resultadosSimulacao;
            
            if (!simulacao) {
                alert("Nenhuma simulação disponível para exportar. Execute uma simulação primeiro.");
                return;
            }
            
            // Validar a estrutura dos dados usando DataManager se disponível
            if (window.DataManager) {
                const tipoEstrutura = window.DataManager.detectarTipoEstrutura(simulacao);
                
                if (tipoEstrutura === "plana") {
                    // Converter para formato aninhado para exportação
                    simulacao = window.DataManager.converterParaEstruturaAninhada(simulacao);
                    console.log("Dados convertidos de estrutura plana para aninhada para exportação");
                }
                
                // Validar e normalizar
                simulacao = window.DataManager.validarENormalizar(simulacao);
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

// Inicializar se o documento já estiver carregado
if (document.readyState !== 'loading') {
    ExportTools.inicializar();
} else {
    document.addEventListener('DOMContentLoaded', function() {
        ExportTools.inicializar();
    });
}

export default ExportTools;
