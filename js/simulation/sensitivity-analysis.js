// Novo arquivo: js/simulation/sensitivity-analysis.js

/**
 * Módulo de Análise de Sensibilidade
 * Implementa a análise de sensibilidade conforme a seção 2.2 da metodologia
 */
const SensitivityAnalysisModule = (function() {
    // Variáveis privadas do módulo
    let _dadosBase = null;
    let _parametrosVariacao = null;
    
    /**
     * Calcula a matriz de sensibilidade para diferentes parâmetros
     * @param {Object} dados - Dados base da simulação
     * @param {Array} parametros - Lista de parâmetros a analisar
     * @param {Array} setores - Lista de setores a analisar
     * @returns {Object} - Matriz de sensibilidade
     */
    function calcularMatrizSensibilidade(dados, parametros, setores) {
        const matrizSensibilidade = [];
        
        // Analisar cada setor
        for (const setor of setores) {
            const linhaSensibilidade = [];
            
            // Variação em cada parâmetro
            for (const parametro of parametros) {
                // Dados de simulação com parâmetro base
                const dadosBase = { ...dados, setor: setor.codigo };
                const resultadoBase = CalculationModule.calcularImpactoCapitalGiro(dadosBase, 2026);
                
                // Dados com parâmetro aumentado em 10%
                const dadosAumentados = { ...dadosBase };
                dadosAumentados[parametro.campo] = dadosBase[parametro.campo] * 1.1;
                const resultadoAumentado = CalculationModule.calcularImpactoCapitalGiro(dadosAumentados, 2026);
                
                // Calcular sensibilidade
                const variacaoParametro = 0.1; // 10%
                const variacaoResultado = Math.abs(
                    (resultadoAumentado.diferencaCapitalGiro - resultadoBase.diferencaCapitalGiro) / 
                    resultadoBase.diferencaCapitalGiro
                );
                
                // Índice de sensibilidade
                const sensibilidade = variacaoResultado / variacaoParametro;
                linhaSensibilidade.push(sensibilidade);
            }
            
            matrizSensibilidade.push(linhaSensibilidade);
        }
        
        return {
            parametros,
            setores,
            matriz: matrizSensibilidade
        };
    }
    
    /**
     * Gera visualização de mapa de calor para a matriz de sensibilidade
     * @param {Object} matrizSensibilidade - Resultado de calcularMatrizSensibilidade
     * @returns {Object} - Configuração para visualização Chart.js
     */
    function gerarMapaCalorSensibilidade(matrizSensibilidade) {
        // Converter matriz para formato compatível com Chart.js
        const dados = {
            labels: matrizSensibilidade.setores.map(s => s.nome),
            datasets: matrizSensibilidade.parametros.map((parametro, index) => {
                const dados = matrizSensibilidade.matriz.map(linha => linha[index]);
                
                return {
                    label: parametro.nome,
                    data: dados,
                    backgroundColor: contexto => {
                        const valor = contexto.dataset.data[contexto.dataIndex];
                        return obterCorSensibilidade(valor);
                    }
                };
            })
        };
        
        // Configuração do gráfico
        return {
            type: 'heatmap',
            data: dados,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Mapa de Sensibilidade Setorial ao Split Payment'
                    }
                }
            }
        };
    }
    
    /**
     * Determina a cor com base no valor de sensibilidade
     * @param {number} valor - Índice de sensibilidade
     * @returns {string} - Cor em formato rgba
     */
    function obterCorSensibilidade(valor) {
        // Escala de cores: verde (baixa sensibilidade) para vermelho (alta sensibilidade)
        if (valor < 0.5) {
            return 'rgba(0, 200, 0, 0.8)';
        } else if (valor < 1.0) {
            return 'rgba(255, 255, 0, 0.8)';
        } else {
            return 'rgba(255, 0, 0, 0.8)';
        }
    }
    
    // API pública
    return {
        calcularMatrizSensibilidade,
        gerarMapaCalorSensibilidade
    };
})();