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

        // DataManager Check - mais rigoroso
        if (typeof window.DataManager !== 'undefined' && window.DataManager) {
            console.log("ExportTools: DataManager encontrado e validado.");

            // Verificar se as funções essenciais estão disponíveis
            const funcoesEssenciais = [
                'detectarTipoEstrutura',
                'converterParaEstruturaAninhada', 
                'validarENormalizar'
            ];

            const funcoesIndisponiveis = funcoesEssenciais.filter(func => 
                typeof window.DataManager[func] !== 'function'
            );

            if (funcoesIndisponiveis.length > 0) {
                console.warn("ExportTools: Algumas funções essenciais do DataManager não estão disponíveis:", 
                            funcoesIndisponiveis);
            }
        } else {
            console.error("ExportTools: DataManager não encontrado. Exportação não funcionará corretamente.");
            alert("Sistema de gerenciamento de dados não carregado. As exportações podem falhar.");
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
            } else if (jspdfAvailable) {
                pdfExporter = new window.PDFExporter();
                console.log("ExportTools: PDFExporter instanciado.");
            }

            if (typeof window.ExcelExporter === 'undefined') {
                console.error("ExportTools: ExcelExporter constructor não encontrado. Verifique se document-exporters.js foi carregado.");
            } else if (xlsxAvailable) {
                excelExporter = new window.ExcelExporter();
                console.log("ExportTools: ExcelExporter instanciado.");
            }

            // Configurar ExportManager se disponível
            if (typeof window.ExportManager !== 'undefined' && window.ExportManager) {
                const manager = new window.ExportManager(config);
                if (pdfExporter) manager.registerExporter('pdf', pdfExporter);
                if (excelExporter) manager.registerExporter('excel', excelExporter);
                window.exportManager = manager;
                console.log("ExportTools: ExportManager inicializado e exportadores registrados.");
            } else {
                console.warn("ExportTools: ExportManager não encontrado. Funcionalidades de gerenciamento de exportação podem ser limitadas.");
            }

            initialized = true;
            console.log("ExportTools: Ferramentas de exportação inicializadas com sucesso.");
        } catch (error) {
            console.error("ExportTools: Erro ao inicializar ferramentas de exportação:", error, error.stack);
            initialized = false;
        }
    }
    
    /**
     * Valida se os dados estão adequados para exportação conforme nova arquitetura
     * @param {Object} dados - Dados a serem validados
     * @returns {Object} - Dados validados na estrutura canônica
     * @throws {Error} - Erro se os dados não puderem ser validados
     */
    function validarDadosParaExportacao(dados) {
        // Verificar disponibilidade do DataManager
        if (!window.DataManager) {
            throw new Error('DataManager não disponível. Sistema de gerenciamento de dados requerido.');
        }

        // Verificar se os dados existem
        if (!dados) {
            throw new Error('Dados não fornecidos para validação.');
        }

        try {
            // Detectar tipo de estrutura de forma mais robusta
            let tipoEstrutura;
            try {
                tipoEstrutura = window.DataManager.detectarTipoEstrutura(dados);
            } catch (erroDeteccao) {
                console.warn('Erro na detecção automática de estrutura, tentando análise manual:', erroDeteccao);
                // Fallback: análise manual da estrutura
                tipoEstrutura = dados.empresa !== undefined ? 'aninhada' : 'plana';
            }

            if (!tipoEstrutura) {
                throw new Error('Não foi possível determinar o tipo de estrutura dos dados.');
            }

            // Converter para estrutura canônica se necessário
            let dadosCanonicos;

            if (tipoEstrutura === "plana") {
                console.log("Convertendo dados de estrutura plana para canônica");
                dadosCanonicos = window.DataManager.converterParaEstruturaAninhada(dados);
            } else {
                console.log("Dados já estão em estrutura canônica");
                dadosCanonicos = dados;
            }

            // Validar e normalizar
            try {
                dadosCanonicos = window.DataManager.validarENormalizar(dadosCanonicos);
                console.log("Dados validados e normalizados com sucesso");
            } catch (erroValidacao) {
                throw new Error(`Falha na validação dos dados: ${erroValidacao.message}`);
            }

            // Registrar transformação para diagnóstico
            if (typeof window.DataManager.logTransformacao === 'function') {
                window.DataManager.logTransformacao(
                    dados, 
                    dadosCanonicos, 
                    'Validação para Exportação'
                );
            }

            return dadosCanonicos;
        } catch (erro) {
            console.error('Erro durante validação de dados para exportação:', erro);
            throw erro;
        }
    }
    
    /**
     * Obtém dados da simulação de forma hierárquica e robusta
     * @returns {Object|null} - Dados da simulação ou null se não encontrados
     */
    function obterDadosSimulacao() {
        // Hierarquia de fontes de dados para simulação
        const fontesSimulacao = [
            () => window.ultimaSimulacao,
            () => window.resultadosSimulacao,
            () => window.SimuladorFluxoCaixa?.getResultadosCompletos?.(),
            () => {
                // Tentar obter do DataManager se disponível
                if (window.DataManager && typeof window.DataManager.obterDadosDoFormulario === 'function') {
                    const dadosFormulario = window.DataManager.obterDadosDoFormulario();
                    // Verificar se há resultados de simulação junto com os dados
                    if (dadosFormulario && (window.resultadosSimulacao || window.ultimaSimulacao)) {
                        return {
                            ...dadosFormulario,
                            resultados: window.resultadosSimulacao || window.ultimaSimulacao.resultados,
                            impactoBase: window.ultimaSimulacao?.impactoBase || window.resultadosSimulacao?.impactoBase,
                            projecaoTemporal: window.ultimaSimulacao?.projecaoTemporal || window.resultadosSimulacao?.projecaoTemporal
                        };
                    }
                    return dadosFormulario;
                }
                return null;
            }
        ];

        // Tentar cada fonte em ordem de prioridade
        for (const fonte of fontesSimulacao) {
            try {
                const dados = fonte();
                if (dados && typeof dados === 'object') {
                    console.log("Dados de simulação obtidos de:", fonte.name || 'fonte anônima');
                    return dados;
                }
            } catch (erro) {
                console.warn("Erro ao tentar obter dados de simulação de uma fonte:", erro);
                continue;
            }
        }

        console.warn("Nenhuma fonte válida de dados de simulação encontrada");
        return null;
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
            // Obter dados da simulação de forma hierárquica
            let simulacao = obterDadosSimulacao();

            if (!simulacao) {
                alert("Nenhuma simulação disponível para exportar. Execute uma simulação primeiro.");
                return;
            }

            // Validar e normalizar dados usando a função centralizada
            let simulacaoCanonica;
            try {
                simulacaoCanonica = validarDadosParaExportacao(simulacao);
            } catch (erroValidacao) {
                console.error("Erro na validação dos dados para exportação PDF:", erroValidacao);
                alert("Dados da simulação inválidos para exportação. " + erroValidacao.message);
                return;
            }

            // Registrar transformação para diagnóstico
            if (window.DataManager && typeof window.DataManager.logTransformacao === 'function') {
                window.DataManager.logTransformacao(
                    simulacao, 
                    simulacaoCanonica, 
                    'Preparação para Exportação PDF'
                );
            }

            // Exportar usando o exportador com dados na estrutura canônica
            pdfExporter.export(simulacaoCanonica)
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
            // Obter dados da simulação de forma hierárquica
            let simulacao = obterDadosSimulacao();

            if (!simulacao) {
                alert("Nenhuma simulação disponível para exportar. Execute uma simulação primeiro.");
                return;
            }

            // Validar e normalizar dados usando a função centralizada
            let simulacaoCanonica;
            try {
                simulacaoCanonica = validarDadosParaExportacao(simulacao);
            } catch (erroValidacao) {
                console.error("Erro na validação dos dados para exportação Excel:", erroValidacao);
                alert("Dados da simulação inválidos para exportação. " + erroValidacao.message);
                return;
            }

            // Registrar transformação para diagnóstico
            if (window.DataManager && typeof window.DataManager.logTransformacao === 'function') {
                window.DataManager.logTransformacao(
                    simulacao, 
                    simulacaoCanonica, 
                    'Preparação para Exportação Excel'
                );
            }

            // Exportar usando o exportador com dados na estrutura canônica
            excelExporter.export(simulacaoCanonica)
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
            // Validar disponibilidade do DataManager para formatação consistente
            const formatarMoeda = window.DataManager && typeof window.DataManager.formatarMoeda === 'function' 
                ? window.DataManager.formatarMoeda 
                : (valor) => `R$ ${valor.toFixed(2).replace('.', ',')}`;

            // Obter ano selecionado
            const selectAnoMemoria = document.getElementById('select-ano-memoria');
            const anoSelecionado = selectAnoMemoria ? selectAnoMemoria.value : '2026';

            // Obter memória de cálculo
            if (!window.memoriaCalculoSimulacao || !window.memoriaCalculoSimulacao[anoSelecionado]) {
                alert("Memória de cálculo não disponível para o ano selecionado. Execute uma simulação primeiro.");
                return;
            }

            let memoriaCalculo = window.memoriaCalculoSimulacao[anoSelecionado];

            // Se a memória de cálculo for um objeto, converter para texto estruturado
            if (typeof memoriaCalculo === 'object' && memoriaCalculo !== null) {
                console.log("Convertendo memória de cálculo de objeto para texto estruturado");
                memoriaCalculo = formatarMemoriaCalculoParaTexto(memoriaCalculo, formatarMoeda);
            }

            // Criar link de download
            const blob = new Blob([memoriaCalculo], { type: 'text/plain;charset=utf-8' });
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

    /**
     * Formata um objeto de memória de cálculo para texto estruturado
     * @param {Object} memoriaObj - Objeto da memória de cálculo
     * @param {Function} formatarMoeda - Função para formatação de valores monetários
     * @returns {string} - Texto formatado da memória de cálculo
     */
    function formatarMemoriaCalculoParaTexto(memoriaObj, formatarMoeda) {
        let texto = "=".repeat(80) + "\n";
        texto += "MEMÓRIA DE CÁLCULO - SIMULADOR DE SPLIT PAYMENT\n";
        texto += "Expertzy Inteligência Tributária\n";
        texto += "=".repeat(80) + "\n\n";

        // Dados de entrada
        if (memoriaObj.dadosEntrada) {
            texto += "1. DADOS DE ENTRADA\n";
            texto += "-".repeat(40) + "\n";

            if (memoriaObj.dadosEntrada.empresa) {
                texto += "Empresa:\n";
                texto += `  Faturamento: ${formatarMoeda(memoriaObj.dadosEntrada.empresa.faturamento || 0)}\n`;
                texto += `  Margem: ${((memoriaObj.dadosEntrada.empresa.margem || 0) * 100).toFixed(2)}%\n`;
                texto += `  Setor: ${memoriaObj.dadosEntrada.empresa.setor || 'N/A'}\n`;
                texto += `  Tipo: ${memoriaObj.dadosEntrada.empresa.tipoEmpresa || 'N/A'}\n`;
                texto += `  Regime: ${memoriaObj.dadosEntrada.empresa.regime || 'N/A'}\n\n`;
            }

            if (memoriaObj.dadosEntrada.cicloFinanceiro) {
                texto += "Ciclo Financeiro:\n";
                texto += `  PMR: ${memoriaObj.dadosEntrada.cicloFinanceiro.pmr || 0} dias\n`;
                texto += `  PMP: ${memoriaObj.dadosEntrada.cicloFinanceiro.pmp || 0} dias\n`;
                texto += `  PME: ${memoriaObj.dadosEntrada.cicloFinanceiro.pme || 0} dias\n`;
                texto += `  Vendas à Vista: ${((memoriaObj.dadosEntrada.cicloFinanceiro.percVista || 0) * 100).toFixed(1)}%\n`;
                texto += `  Vendas a Prazo: ${((memoriaObj.dadosEntrada.cicloFinanceiro.percPrazo || 0) * 100).toFixed(1)}%\n\n`;
            }
        }

        // Impacto base
        if (memoriaObj.impactoBase) {
            texto += "2. IMPACTO BASE\n";
            texto += "-".repeat(40) + "\n";
            texto += `Diferença no Capital de Giro: ${formatarMoeda(memoriaObj.impactoBase.diferencaCapitalGiro || 0)}\n`;
            texto += `Percentual de Impacto: ${(memoriaObj.impactoBase.percentualImpacto || 0).toFixed(2)}%\n`;
            texto += `Impacto em Dias de Faturamento: ${(memoriaObj.impactoBase.impactoDiasFaturamento || 0).toFixed(1)} dias\n\n`;
        }

        // Projeção temporal
        if (memoriaObj.projecaoTemporal) {
            texto += "3. PROJEÇÃO TEMPORAL\n";
            texto += "-".repeat(40) + "\n";
            if (memoriaObj.projecaoTemporal.parametros) {
                texto += `Cenário: ${memoriaObj.projecaoTemporal.parametros.cenarioTaxaCrescimento || 'N/A'}\n`;
                texto += `Taxa de Crescimento: ${((memoriaObj.projecaoTemporal.parametros.taxaCrescimento || 0) * 100).toFixed(2)}% a.a.\n`;
            }
            if (memoriaObj.projecaoTemporal.impactoAcumulado) {
                texto += `Necessidade Total de Capital: ${formatarMoeda(memoriaObj.projecaoTemporal.impactoAcumulado.totalNecessidadeCapitalGiro || 0)}\n`;
                texto += `Custo Financeiro Total: ${formatarMoeda(memoriaObj.projecaoTemporal.impactoAcumulado.custoFinanceiroTotal || 0)}\n`;
            }
            texto += "\n";
        }

        texto += "=".repeat(80) + "\n";
        texto += "Relatório gerado em: " + new Date().toLocaleString('pt-BR') + "\n";
        texto += "© 2025 Expertzy Inteligência Tributária\n";

        return texto;
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
