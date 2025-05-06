/**
 * Script de integração dos módulos de simulação
 * Coordena a inicialização e conexão de todos os componentes
 */
const SimuladorIntegrador = {
    /**
     * Inicializa todos os componentes do sistema
     */
    inicializar: function() {
        console.log('Inicializando integração dos módulos do simulador...');
        
        // Verificar quais módulos estão disponíveis
        this._verificarModulosDisponiveis();
        
        // Conectar as interfaces entre módulos
        this._conectarModulos();
        
        // Registrar observadores para o repositório (se disponível)
        this._registrarObservadores();
        
        console.log('Integração dos módulos do simulador concluída');
    },
    
    /**
     * Verifica quais módulos estão disponíveis
     */
    _verificarModulosDisponiveis: function() {
        this.modulosDisponiveis = {
            repositorio: typeof SimuladorRepository !== 'undefined',
            calculationModule: typeof CalculationModule !== 'undefined',
            simuladorFluxoCaixa: typeof window.SimuladorFluxoCaixa !== 'undefined',
            simuladorModulo: typeof window.SimuladorModulo !== 'undefined',
            simulacaoController: typeof SimulacaoPrincipalController !== 'undefined',
            memoriaController: typeof MemoriaCalculoController !== 'undefined',
            estrategiasController: typeof EstrategiasMitigacaoController !== 'undefined'
        };
        
        console.log('Módulos disponíveis:', this.modulosDisponiveis);
    },
    
    /**
     * Conecta as interfaces entre os módulos
     */
    _conectarModulos: function() {
        // Verificar se o botão Simular existe
        const btnSimular = document.getElementById('btn-simular');
        if (!btnSimular) {
            console.warn('Botão Simular não encontrado, integração de eventos não realizada');
            return;
        }
        
        // Criar uma referência ao evento original
        const eventoOriginal = btnSimular.onclick;
        
        // Monitorar o evento de clique para depuração
        btnSimular.addEventListener('click', function(event) {
            console.log('Evento de clique no botão Simular interceptado pelo SimuladorIntegrador');
            
            // Verificar quais módulos serão utilizados
            if (window.SimuladorModulo && typeof window.SimuladorModulo.simular === 'function') {
                console.log('SimuladorModulo será utilizado para a simulação');
            } else if (window.SimuladorFluxoCaixa && typeof window.SimuladorFluxoCaixa.simularImpacto === 'function') {
                console.log('SimuladorFluxoCaixa será utilizado para a simulação');
            } else {
                console.warn('Nenhum módulo de simulação disponível!');
            }
        });
    },
    
    /**
     * Registra observadores para o repositório
     */
    _registrarObservadores: function() {
        // Verificar se o repositório está disponível
        if (!this.modulosDisponiveis.repositorio) {
            console.warn('Repositório não disponível, observadores não registrados');
            return;
        }
        
        // Observar mudanças na seção resultadosSimulacao
        SimuladorRepository.observar('resultadosSimulacao', function(resultados) {
            console.log('Resultados da simulação atualizados no repositório');
            
            // Atualizar memória de cálculo, se o controlador estiver disponível
            if (typeof MemoriaCalculoController !== 'undefined' && 
                typeof MemoriaCalculoController.atualizarDropdownAnos === 'function') {
                MemoriaCalculoController.atualizarDropdownAnos();
            }
        });
    }
};

// Inicializar o integrador quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Esperar um pouco para garantir que todos os scripts estejam carregados
    setTimeout(function() {
        SimuladorIntegrador.inicializar();
    }, 500);
});
