/**
 * Controlador da aba de Memória de Cálculo
 * Gerencia a interação do usuário com a memória de cálculo
 */
const MemoriaCalculoController = {
    inicializar: function() {
        console.log('Inicializando controlador de Memória de Cálculo');
        
        // Verificar se há uma simulação realizada
        this.verificarSimulacaoRealizada();
        
        // Inicializar eventos
        this.inicializarEventos();
        
        // Atualizar dropdown de anos
        this.atualizarDropdownAnos();
        
        console.log('Controlador de Memória de Cálculo inicializado');
    },
    
    verificarSimulacaoRealizada: function() {
        // Verificar se há uma simulação realizada
        const interfaceState = SimuladorRepository.obterSecao('interfaceState');
        if (!interfaceState.simulacaoRealizada) {
            document.getElementById('memoria-calculo').innerHTML = 
                '<p>Realize uma simulação para gerar a memória de cálculo detalhada.</p>';
        }
    },
    
    inicializarEventos: function() {
        // Botão atualizar memória
        const btnAtualizarMemoria = document.getElementById('btn-atualizar-memoria');
        if (btnAtualizarMemoria) {
            btnAtualizarMemoria.addEventListener('click', () => {
                const selectAno = document.getElementById('select-ano-memoria');
                if (selectAno) {
                    this.exibirMemoriaCalculo(selectAno.value);
                }
            });
        }
        
        // Select de anos
        const selectAno = document.getElementById('select-ano-memoria');
        if (selectAno) {
            selectAno.addEventListener('change', () => {
                this.exibirMemoriaCalculo(selectAno.value);
            });
        }
        
        // Botão exportar memória
        const btnExportarMemoria = document.getElementById('btn-exportar-memoria');
        if (btnExportarMemoria) {
            btnExportarMemoria.addEventListener('click', () => {
                if (typeof ExportTools !== 'undefined' && typeof ExportTools.exportarMemoriaCalculo === 'function') {
                    ExportTools.exportarMemoriaCalculo();
                } else {
                    alert('Ferramenta de exportação não disponível.');
                }
            });
        }
    },
    
    atualizarDropdownAnos: function() {
        // Verificar se há uma simulação realizada
        const interfaceState = SimuladorRepository.obterSecao('interfaceState');
        if (!interfaceState.simulacaoRealizada) {
            return;
        }
        
        // Obter os parâmetros de simulação
        const parametrosSimulacao = SimuladorRepository.obterSecao('parametrosSimulacao');
        if (!parametrosSimulacao) {
            return;
        }
        
        // Calcular anos disponíveis
        const anoInicial = parseInt(parametrosSimulacao.dataInicial.split('-')[0]) || 2026;
        const anoFinal = parseInt(parametrosSimulacao.dataFinal.split('-')[0]) || 2033;
        
        // Atualizar o dropdown
        const selectAno = document.getElementById('select-ano-memoria');
        if (selectAno) {
            // Limpar opções existentes
            selectAno.innerHTML = '';
            
            // Adicionar opções para cada ano
            for (let ano = anoInicial; ano <= anoFinal; ano++) {
                const option = document.createElement('option');
                option.value = ano;
                option.textContent = ano;
                selectAno.appendChild(option);
            }
            
            // Exibir memória para o primeiro ano
            if (selectAno.options.length > 0) {
                this.exibirMemoriaCalculo(selectAno.options[0].value);
            }
        }
    },
    
    exibirMemoriaCalculo: function(ano) {
        try {
            // Verificar se há uma simulação realizada
            const interfaceState = SimuladorRepository.obterSecao('interfaceState');
            if (!interfaceState.simulacaoRealizada) {
                document.getElementById('memoria-calculo').innerHTML = 
                    '<p>Realize uma simulação para gerar a memória de cálculo detalhada.</p>';
                return;
            }
            
            // Obter a memória de cálculo do módulo de simulação
            const memoriaCalculo = SimuladorModulo.gerarMemoriaCalculo(ano);
            
            // Exibir a memória de cálculo
            const containerMemoria = document.getElementById('memoria-calculo');
            if (containerMemoria) {
                containerMemoria.innerHTML = `<pre>${memoriaCalculo}</pre>`;
            }
        } catch (error) {
            console.error('Erro ao exibir memória de cálculo:', error);
            document.getElementById('memoria-calculo').innerHTML = 
                `<p>Erro ao gerar memória de cálculo: ${error.message}</p>`;
        }
    }
};

// Inicialização automática quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar apenas quando a aba estiver ativa
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            if (this.getAttribute('data-tab') === 'memoria') {
                MemoriaCalculoController.inicializar();
            }
        });
    });
    
    // Se a aba de memória já estiver ativa, inicializar o controlador
    if (document.querySelector('.tab-button[data-tab="memoria"].active')) {
        MemoriaCalculoController.inicializar();
    }
});