# Análise e Harmonização das Estruturas de Dados no Simulador de Split Payment

Após analisar cuidadosamente as estruturas de dados utilizadas no fluxo do simulador de Split Payment, identifiquei diversos padrões inconsistentes e oportunidades de harmonização. Apresento a seguir uma análise detalhada e uma proposta estruturada para unificar essas estruturas, tornando o sistema mais robusto e manutenível.

## 1. Análise das Estruturas de Dados Atuais

### 1.1. Inconsistências Identificadas

O sistema atualmente apresenta um padrão misto de estruturas de dados, alternando entre:

- **Estrutura Aninhada** (utilizada no repositório e na interface)
- **Estrutura Plana** (utilizada nos módulos de cálculo)

Isso gera uma série de problemas:

- Conversões frequentes entre formatos diferentes
- Valores padrão inconsistentes entre módulos
- Tipagem variável para os mesmos campos em diferentes partes do código
- Campos redundantes (como `regime` que aparece em múltiplos lugares)
- Falta de validação centralizada
- Transformações implícitas (porcentagens para decimais, por exemplo)

### 1.2. Exemplos das Estruturas Atuais

#### Estrutura Aninhada (repository)

```javascript
{
    empresa: { 
        faturamento: 1000000, 
        margem: 0.15,
        // outros campos...
    },
    cicloFinanceiro: { 
        pmr: 30, 
        pmp: 30, 
        // outros campos...
    },
    // outras seções...
}
```

#### Estrutura Plana (funções de cálculo)

```javascript
{
    faturamento: 1000000,
    margem: 0.15,
    pmr: 30,
    pmp: 30,
    // Campos mesclados de todas as seções...
    serviceCompany: true,
    // Campos derivados...
}
```

## 2. Proposta de Harmonização

Proponho uma abordagem que mantenha a estrutura aninhada para armazenamento e interface, mas estabeleça um padrão claro para conversão e utilização nos módulos de cálculo.

### 2.1. Estrutura de Dados Padronizada

```javascript
const estruturaPadrao = {
    empresa: {
        faturamento: 0,           // Valor numérico em R$
        margem: 0,                // Valor decimal (0.15 = 15%)
        setor: '',                // Código do setor
        tipoEmpresa: '',          // 'comercio', 'industria', 'servicos'
        regime: ''                // 'simples', 'presumido', 'real'
    },
    cicloFinanceiro: {
        pmr: 30,                  // Prazo Médio Recebimento (dias)
        pmp: 30,                  // Prazo Médio Pagamento (dias)
        pme: 30,                  // Prazo Médio Estoque (dias)
        percVista: 0.3,           // Percentual vendas à vista (decimal)
        percPrazo: 0.7            // Percentual vendas a prazo (decimal)
    },
    parametrosFiscais: {
        aliquota: 0.265,          // Alíquota efetiva (decimal)
        tipoOperacao: '',         // 'b2b', 'b2c', 'mista'
        regimePisCofins: '',      // 'cumulativo', 'nao-cumulativo'
        creditos: {               // Estrutura unificada de créditos
            pis: 0,               
            cofins: 0,            
            icms: 0,              
            ipi: 0,               
            cbs: 0,               
            ibs: 0                
        }
    },
    parametrosSimulacao: {
        cenario: 'moderado',      // 'conservador', 'moderado', 'otimista', 'personalizado'
        taxaCrescimento: 0.05,    // Taxa de crescimento anual (decimal)
        dataInicial: '2026-01-01',// Data de início da simulação
        dataFinal: '2033-12-31',  // Data de término da simulação
        splitPayment: true        // Considerar split payment no cálculo
    },
    parametrosFinanceiros: {
        taxaCapitalGiro: 0.021,   // Taxa mensal capital de giro (decimal)
        taxaAntecipacao: 0.018,   // Taxa mensal antecipação recebíveis (decimal)
        spreadBancario: 0.005     // Spread bancário médio (decimal)
    },
    ivaConfig: {
        cbs: 0.088,               // Alíquota CBS (decimal)
        ibs: 0.177,               // Alíquota IBS (decimal)
        categoriaIva: 'standard', // 'standard', 'reduced', 'exempt'
        reducaoEspecial: 0        // Redução especial (decimal)
    }
};
```

### 2.2. Criação de Módulo para Gerenciamento de Dados

Recomendo a criação de um novo arquivo `data-manager.js` para centralizar o gerenciamento de dados:

```javascript
/**
 * data-manager.js
 * Módulo de gerenciamento de dados do simulador de Split Payment
 */
window.DataManager = (function() {
    // Estrutura padrão definida
    const estruturaPadrao = {
        // estrutura conforme definida acima
    };

    /**
     * Converte a estrutura aninhada para estrutura plana para cálculos
     * @param {Object} dadosAninhados - Dados na estrutura aninhada
     * @returns {Object} - Dados na estrutura plana para cálculos
     */
    function converterParaEstruturaPlana(dadosAninhados) {
        const plano = {};

        // Empresa
        if (dadosAninhados.empresa) {
            Object.assign(plano, dadosAninhados.empresa);
        }

        // Ciclo Financeiro
        if (dadosAninhados.cicloFinanceiro) {
            Object.assign(plano, dadosAninhados.cicloFinanceiro);
        }

        // Parâmetros Fiscais
        if (dadosAninhados.parametrosFiscais) {
            Object.assign(plano, dadosAninhados.parametrosFiscais);

            // Tratar créditos separadamente
            if (dadosAninhados.parametrosFiscais.creditos) {
                // Manter os créditos no formato plano
                Object.assign(plano, {
                    creditosPIS: dadosAninhados.parametrosFiscais.creditos.pis || 0,
                    creditosCOFINS: dadosAninhados.parametrosFiscais.creditos.cofins || 0,
                    creditosICMS: dadosAninhados.parametrosFiscais.creditos.icms || 0,
                    creditosIPI: dadosAninhados.parametrosFiscais.creditos.ipi || 0,
                    creditosCBS: dadosAninhados.parametrosFiscais.creditos.cbs || 0,
                    creditosIBS: dadosAninhados.parametrosFiscais.creditos.ibs || 0
                });
            }
        }

        // Parâmetros de Simulação
        if (dadosAninhados.parametrosSimulacao) {
            Object.assign(plano, dadosAninhados.parametrosSimulacao);
        }

        // Parâmetros Financeiros
        if (dadosAninhados.parametrosFinanceiros) {
            Object.assign(plano, dadosAninhados.parametrosFinanceiros);
        }

        // IVA Config
        if (dadosAninhados.ivaConfig) {
            Object.assign(plano, {
                aliquotaCBS: dadosAninhados.ivaConfig.cbs,
                aliquotaIBS: dadosAninhados.ivaConfig.ibs,
                categoriaIVA: dadosAninhados.ivaConfig.categoriaIva,
                reducaoEspecial: dadosAninhados.ivaConfig.reducaoEspecial
            });
        }

        // Adicionar campos derivados
        plano.serviceCompany = plano.tipoEmpresa === 'servicos';
        plano.cumulativeRegime = plano.regimePisCofins === 'cumulativo';

        return plano;
    }

    /**
     * Converte a estrutura plana para estrutura aninhada
     * @param {Object} dadosPlanos - Dados na estrutura plana
     * @returns {Object} - Dados na estrutura aninhada
     */
    function converterParaEstruturaAninhada(dadosPlanos) {
        const aninhado = JSON.parse(JSON.stringify(estruturaPadrao)); // Cópia profunda

        // Empresa
        aninhado.empresa = {
            faturamento: dadosPlanos.faturamento || 0,
            margem: dadosPlanos.margem || 0,
            setor: dadosPlanos.setor || '',
            tipoEmpresa: dadosPlanos.tipoEmpresa || '',
            regime: dadosPlanos.regime || ''
        };

        // Ciclo Financeiro
        aninhado.cicloFinanceiro = {
            pmr: dadosPlanos.pmr || 30,
            pmp: dadosPlanos.pmp || 30,
            pme: dadosPlanos.pme || 30,
            percVista: dadosPlanos.percVista || 0.3,
            percPrazo: dadosPlanos.percPrazo || 0.7
        };

        // Parâmetros Fiscais
        aninhado.parametrosFiscais = {
            aliquota: dadosPlanos.aliquota || 0.265,
            tipoOperacao: dadosPlanos.tipoOperacao || '',
            regimePisCofins: dadosPlanos.regimePisCofins || '',
            creditos: {
                pis: dadosPlanos.creditosPIS || 0,
                cofins: dadosPlanos.creditosCOFINS || 0,
                icms: dadosPlanos.creditosICMS || 0,
                ipi: dadosPlanos.creditosIPI || 0,
                cbs: dadosPlanos.creditosCBS || 0,
                ibs: dadosPlanos.creditosIBS || 0
            }
        };

        // Os demais campos seguem o mesmo padrão...

        return aninhado;
    }

    /**
     * Valida e normaliza os dados na estrutura aninhada
     * @param {Object} dados - Dados a serem validados
     * @returns {Object} - Dados validados e normalizados
     */
    function validarENormalizar(dados) {
        const resultado = JSON.parse(JSON.stringify(dados)); // Cópia profunda

        // Validação de Empresa
        if (!resultado.empresa) resultado.empresa = {...estruturaPadrao.empresa};

        // Converter porcentagens para decimal se necessário
        if (resultado.empresa.margem > 1) {
            resultado.empresa.margem = resultado.empresa.margem / 100;
        }

        // Garantir que faturamento seja numérico
        if (typeof resultado.empresa.faturamento === 'string') {
            resultado.empresa.faturamento = parseFloat(resultado.empresa.faturamento.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        }

        // Validação Ciclo Financeiro
        if (!resultado.cicloFinanceiro) resultado.cicloFinanceiro = {...estruturaPadrao.cicloFinanceiro};

        // Converter porcentagens para decimal
        if (resultado.cicloFinanceiro.percVista > 1) {
            resultado.cicloFinanceiro.percVista = resultado.cicloFinanceiro.percVista / 100;
        }

        if (resultado.cicloFinanceiro.percPrazo > 1) {
            resultado.cicloFinanceiro.percPrazo = resultado.cicloFinanceiro.percPrazo / 100;
        }

        // Garantir que a soma de percVista e percPrazo seja 1
        const somaPercs = resultado.cicloFinanceiro.percVista + resultado.cicloFinanceiro.percPrazo;
        if (Math.abs(somaPercs - 1) > 0.01) {
            // Ajustar para garantir soma = 1
            resultado.cicloFinanceiro.percPrazo = 1 - resultado.cicloFinanceiro.percVista;
        }

        // Validações similares para os outros campos...

        return resultado;
    }

    /**
     * Obtém dados do DOM e retorna na estrutura aninhada padronizada
     * @returns {Object} - Dados na estrutura aninhada
     */
    function obterDadosDoFormulario() {
        const dados = JSON.parse(JSON.stringify(estruturaPadrao)); // Começar com valores padrão

        // Empresa
        dados.empresa.faturamento = extrairValorNumerico('faturamento');
        dados.empresa.margem = parseFloat(document.getElementById('margem').value) / 100 || 0;
        dados.empresa.setor = document.getElementById('setor').value;
        dados.empresa.tipoEmpresa = document.getElementById('tipo-empresa').value;
        dados.empresa.regime = document.getElementById('regime').value;

        // Ciclo Financeiro
        dados.cicloFinanceiro.pmr = parseInt(document.getElementById('pmr').value) || 30;
        dados.cicloFinanceiro.pmp = parseInt(document.getElementById('pmp').value) || 30;
        dados.cicloFinanceiro.pme = parseInt(document.getElementById('pme').value) || 30;
        dados.cicloFinanceiro.percVista = parseFloat(document.getElementById('perc-vista').value) / 100 || 0.3;
        dados.cicloFinanceiro.percPrazo = 1 - dados.cicloFinanceiro.percVista;

        // Os demais campos seguem o mesmo padrão...

        return validarENormalizar(dados);
    }

    /**
     * Função auxiliar para extrair valor numérico de elemento do DOM
     * @param {string} id - ID do elemento
     * @returns {number} - Valor numérico
     */
    function extrairValorNumerico(id) {
        const elemento = document.getElementById(id);
        if (!elemento) return 0;

        // Verificar se o elemento tem data-raw-value (do CurrencyFormatter)
        if (elemento.dataset.rawValue !== undefined) {
            return parseFloat(elemento.dataset.rawValue) || 0;
        }

        // Tentar extrair valor numérico
        const valor = elemento.value.replace(/[^\d.,]/g, '').replace(',', '.');
        return parseFloat(valor) || 0;
    }

    // Interface pública do módulo
    return {
        estruturaPadrao,
        converterParaEstruturaPlana,
        converterParaEstruturaAninhada,
        validarENormalizar,
        obterDadosDoFormulario,
        extrairValorNumerico
    };
})();
```

## 3. Implementação da Harmonização

Detalhei abaixo as modificações necessárias para implementar esta harmonização:

### 3.1. Modificações em simulator.js

```javascript
/**
 * Modificações no arquivo simulator.js
 */

// Substituir a função criarEstruturaPlana pela do DataManager
SimuladorFluxoCaixa.criarEstruturaPlana = function(dados) {
    return window.DataManager.converterParaEstruturaPlana(dados);
};

// Modificar a função simular para usar o DataManager
SimuladorFluxoCaixa.simular = function() {
    console.log('Iniciando simulação...');
    try {
        // 1. Obter dados consolidados do formulário usando o DataManager
        const dadosAninhados = window.DataManager.obterDadosDoFormulario();
        console.log('Dados obtidos:', dadosAninhados);

        // 2. Converter para estrutura plana para cálculos
        const dadosPlanos = window.DataManager.converterParaEstruturaPlana(dadosAninhados);
        console.log('Dados planos para cálculos:', dadosPlanos);

        // 3. Declarar anoInicial e anoFinal
        const anoInicial = parseInt(dadosPlanos.dataInicial.split('-')[0], 10) || 2026;
        const anoFinal = parseInt(dadosPlanos.dataFinal.split('-')[0], 10) || 2033;

        // Continuar com o restante da lógica existente...
        // ...

        return resultados;
    } catch (erro) {
        console.error('Erro durante a simulação:', erro);
        alert('Ocorreu um erro durante a simulação: ' + erro.message);
        return null;
    }
};

// Modificar a função extrairValorNumericoDeElemento
SimuladorFluxoCaixa.extrairValorNumericoDeElemento = function(id) {
    return window.DataManager.extrairValorNumerico(id);
};
```

### 3.2. Modificações em main.js

```javascript
/**
 * Modificações no arquivo main.js
 */

// Modificar a função inicializarRepository
function inicializarRepository() {
    // Verificar se o repository já existe
    if (typeof SimuladorRepository !== 'undefined') {
        return true;
    }

    // Verificar se o DataManager já foi carregado
    if (typeof window.DataManager === 'undefined') {
        console.error('DataManager não encontrado. Inicializando com estrutura básica.');
        window.SimuladorRepository = {
            dados: {
                empresa: { faturamento: 1000000, margem: 0.15 },
                cicloFinanceiro: { pmr: 30, pmp: 30, pme: 30, percVista: 0.3, percPrazo: 0.7 },
                parametrosFiscais: { aliquota: 0.265, creditos: {} },
                parametrosSimulacao: { cenario: 'moderado', taxaCrescimento: 0.05 }
            },
            obterSecao: function(nome) { return this.dados[nome] || {}; },
            atualizarSecao: function(nome, dados) { this.dados[nome] = dados; }
        };
    } else {
        // Criar repository usando a estrutura padrão do DataManager
        window.SimuladorRepository = {
            dados: JSON.parse(JSON.stringify(window.DataManager.estruturaPadrao)),
            obterSecao: function(nome) { return this.dados[nome] || {}; },
            atualizarSecao: function(nome, dados) { this.dados[nome] = dados; }
        };
    }

    console.log('Repository inicializado com sucesso');
    return true;
}
```

### 3.3. Modificações em current-tax-system.js e iva-dual-system.js

Adaptar essas funções para receber tanto a estrutura plana quanto a aninhada:

```javascript
/**
 * Modificações em current-tax-system.js
 */

// Adaptar a função calcularFluxoCaixaAtual
const calcularFluxoCaixaAtualOriginal = window.CurrentTaxSystem.calcularFluxoCaixaAtual;
window.CurrentTaxSystem.calcularFluxoCaixaAtual = function(dados) {
    // Verificar se os dados estão em formato aninhado
    if (dados.empresa !== undefined) {
        // Converter para formato plano
        dados = window.DataManager.converterParaEstruturaPlana(dados);
    }

    // Chamar a implementação original
    return calcularFluxoCaixaAtualOriginal(dados);
};

/**
 * Modificações em iva-dual-system.js
 */

// Adaptar a função calcularImpactoCapitalGiro
const calcularImpactoCapitalGiroOriginal = window.IVADualSystem.calcularImpactoCapitalGiro;
window.IVADualSystem.calcularImpactoCapitalGiro = function(dados, ano, parametrosSetoriais) {
    // Verificar se os dados estão em formato aninhado
    if (dados.empresa !== undefined) {
        // Converter para formato plano
        dados = window.DataManager.converterParaEstruturaPlana(dados);
    }

    // Chamar a implementação original
    return calcularImpactoCapitalGiroOriginal(dados, ano, parametrosSetoriais);
};
```

## 4. Plano de Implementação

Para implementar esta harmonização, recomendo seguir as etapas:

1. **Criar e Testar o DataManager**: Implementar primeiro o `data-manager.js` e verificar sua funcionalidade básica.

2. **Integrar com o SimuladorRepository**: Atualizar `main.js` para usar o DataManager na inicialização do repositório.

3. **Adaptar o Simulador**: Modificar `simulator.js` para usar as funções do DataManager.

4. **Adaptar Módulos de Cálculo**: Modificar `current-tax-system.js` e `iva-dual-system.js` para aceitar ambos os formatos.

5. **Testes Incrementais**: Testar cada componente separadamente antes de integrar completamente.

## 5. Benefícios da Harmonização

1. **Consistência de Dados**: Eliminação de inconsistências na manipulação dos dados.

2. **Validação Centralizada**: Toda a validação e normalização ocorre em um único lugar.

3. **Manutenibilidade Aprimorada**: Facilita a adição ou modificação de campos de dados.

4. **Redução de Bugs**: Menos conversões implícitas significa menos bugs sutis.

5. **Código Mais Claro**: Estrutura explícita facilita o entendimento do código.

6. **Facilidade de Depuração**: Problemas com dados são mais facilmente identificados.

Esta proposta de harmonização preserva a compatibilidade com o código existente enquanto introduz uma estrutura mais robusta e consistente. A mudança pode ser implementada gradualmente, testando cada componente individualmente antes da integração completa.
