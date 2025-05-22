# Aprimoramento da Extração de Dados SPED para o Simulador de Split Payment

Ao analisar profundamente as possibilidades de extração de dados dos arquivos SPED, identifico oportunidades significativas para enriquecer o preenchimento automático do simulador. O sistema atual utiliza primordialmente o SPED Fiscal e Contribuições, mas efetivamente subutiliza a riqueza de informações disponíveis na ECF e ECD.

## I. Potencial de Extração por Arquivo SPED

### 1. SPED Fiscal (EFD ICMS/IPI) - Oportunidades Adicionais

| Informação                | Registros  | Método de Extração                                                   |
| ------------------------- | ---------- | -------------------------------------------------------------------- |
| Alíquota Efetiva ICMS     | C190, E110 | Dividir valor do ICMS debitado pela base de cálculo total nas saídas |
| Base de Cálculo ICMS      | C190       | Calcular o percentual médio: Base de Cálculo ICMS / Valor Contábil   |
| Incentivos Fiscais        | E111, C197 | Identificar códigos de ajuste relacionados a benefícios fiscais      |
| Alíquota IPI              | C190, C170 | Calcular alíquota média: Valor IPI / Base de Cálculo IPI             |
| Tipo de Operação          | C100, C101 | Analisar CPF vs CNPJ dos destinatários para classificar em B2B/B2C   |
| % Aproveitamento Créditos | E110, E111 | Comparar créditos totais vs créditos efetivamente utilizados         |

### 2. SPED Contribuições - Oportunidades Adicionais

| Informação                 | Registros              | Método de Extração                                                     |
| -------------------------- | ---------------------- | ---------------------------------------------------------------------- |
| Regime PIS/COFINS          | 0110                   | Campo IND_APUR_ESD: 1=Cumulativo, 2=Não-Cumulativo, 3=Ambos            |
| Base de Cálculo PIS/COFINS | M100, M105, M500, M505 | Relação entre receita bruta e base tributável                          |
| % Aproveitamento Créditos  | M100, M500             | Comparar créditos disponíveis vs créditos efetivamente utilizados      |
| Receitas com Alíquota Zero | M400, M800             | Identificar receitas não tributadas para cálculo da tributação efetiva |

### 3. SPED ECF (Escrituração Contábil Fiscal) - Pouco Explorado Atualmente

| Informação                    | Registros  | Método de Extração                                         |
| ----------------------------- | ---------- | ---------------------------------------------------------- |
| Margem Operacional Real       | N500 (DRE) | Resultado Operacional (3.05) / Receita Líquida (3.01)      |
| Alíquota Efetiva IR/CSLL      | N670       | Valor Devido / Lucro Real (determinação precisa do regime) |
| Incentivos Fiscais Detalhados | M010       | Detalhes dos incentivos fiscais nas fichas de informações  |
| Atividade Econômica           | 0010, Y720 | CNAE Principal e secundários para determinar setor IVA     |
| Participação Exportações      | Y540       | % de exportação na receita (relevante para Split Payment)  |

### 4. SPED ECD (Escrituração Contábil Digital) - Praticamente Não Explorado

| Informação                 | Registros  | Método de Extração                                              |
| -------------------------- | ---------- | --------------------------------------------------------------- |
| Prazo Médio de Recebimento | I200, J150 | (Duplicatas a Receber/Receita Bruta) × 360                      |
| Prazo Médio de Pagamento   | I200, J150 | (Fornecedores/Compras) × 360                                    |
| Prazo Médio de Estoque     | I200, J150 | (Estoque Médio/Custo) × 360                                     |
| % Vendas à Vista           | I250, I200 | Analisar lançamentos contábeis de recebimento imediato vs prazo |
| Endividamento              | J100       | (Passivo Circulante + Passivo Não Circulante) / Ativo Total     |
| Capital de Giro            | J100       | Ativo Circulante - Passivo Circulante                           |

## II. Estratégias para Aprimoramento das Importações

### 1. Expansão do Mapeamento de Registros

O `SpedParser` atual possui mapeamentos limitados. Sugiro expandir os registros mapeados para incluir:

```javascript
const registrosMapeados = {
    fiscal: {
        // Existentes...
        '0000': parseRegistro0000,
        'C100': parseRegistroC100,
        'C170': parseRegistroC170,
        'E110': parseRegistroE110,

        // Adicionais recomendados
        'C190': parseRegistroC190,    // Analítico por CST/CFOP/Alíquota
        'E111': parseRegistroE111,    // Ajustes de apuração ICMS (incentivos)
        'C197': parseRegistroC197,    // Outras obrigações tributárias
        'H010': parseRegistroH010     // Inventário físico (para cálculo de PME)
    },
    contribuicoes: {
        // Existentes...
        '0000': parseRegistro0000Contribuicoes,
        'M100': parseRegistroM100,
        'M210': parseRegistroM210,

        // Adicionais recomendados
        '0110': parseRegistro0110,    // Regime de apuração
        'M105': parseRegistroM105,    // Créditos PIS detalhados
        'M500': parseRegistroM500,    // Créditos COFINS
        'M505': parseRegistroM505     // Créditos COFINS detalhados
    },
    ecf: {
        '0000': parseRegistro0000ECF,
        '0010': parseRegistro0010ECF, // Dados cadastrais
        'M010': parseRegistroM010ECF, // Incentivos fiscais
        'N500': parseRegistroN500ECF, // DRE 
        'N660': parseRegistroN660ECF, // Cálculo IRPJ
        'N670': parseRegistroN670ECF, // CSLL
        'Y540': parseRegistroY540ECF  // Discriminação exportação
    },
    ecd: {
        '0000': parseRegistro0000ECD,
        'I200': parseRegistroI200ECD, // Lançamentos contábeis
        'J100': parseRegistroJ100ECD, // Balanço Patrimonial
        'J150': parseRegistroJ150ECD, // Demonstração de Resultado
        'I250': parseRegistroI250ECD  // Partidas do lançamento
    }
};
```

### 2. Implementação de Cálculos Contábeis Avançados

Para o cálculo preciso dos ciclos financeiros, sugiro a implementação de funções especializadas:

```javascript
/**
 * Calcula o Prazo Médio de Recebimento com base nos dados da ECD
 * @param {Array} lancamentos - Lançamentos contábeis (I200/I250)
 * @param {Object} balanco - Balanço Patrimonial (J100)
 * @param {Object} dre - Demonstração de Resultado (J150)
 * @returns {number} PMR em dias
 */
function calcularPMR(lancamentos, balanco, dre) {
    // Obter saldo de clientes do Balanço Patrimonial
    const saldoClientes = obterSaldoContabil(balanco, ['1.1.2.01', '1.1.2.01.01']); // Contas típicas de clientes

    // Obter receita bruta da DRE
    const receitaBruta = obterValorDRE(dre, '3.01.01');

    // Calcular PMR = (Clientes / Receita Bruta) * 360
    return (saldoClientes / receitaBruta) * 360;
}
```

### 3. Algoritmo de Detecção de Incentivos Fiscais

A detecção de incentivos fiscais pode ser implementada desta forma:

```javascript
/**
 * Detecta incentivos fiscais de ICMS com base nos registros E111
 * @param {Array} registrosE111 - Registros de ajustes na apuração do ICMS
 * @returns {Object} Informações sobre incentivos detectados
 */
function detectarIncentivosICMS(registrosE111) {
    const incentivos = {
        possuiIncentivo: false,
        percentualReducao: 0,
        valorTotal: 0,
        tiposIncentivo: []
    };

    // Códigos de ajuste que tipicamente indicam incentivos
    const codigosIncentivos = ['SP020100', 'PR020100', 'MG20100', 'RJ020130'];

    for (const reg of registrosE111) {
        // Verifica se o código está na lista de códigos típicos de incentivo
        if (codigosIncentivos.some(codigo => reg.COD_AJ_APUR.includes(codigo))) {
            incentivos.possuiIncentivo = true;
            incentivos.valorTotal += parseFloat(reg.VL_AJ_APUR);
            incentivos.tiposIncentivo.push({
                codigo: reg.COD_AJ_APUR,
                descricao: reg.DESCR_COMPL_AJ,
                valor: parseFloat(reg.VL_AJ_APUR)
            });
        }
    }

    // Calcular o percentual de redução com base no valor do ICMS devido
    if (incentivos.possuiIncentivo && valorICMSDevido > 0) {
        incentivos.percentualReducao = (incentivos.valorTotal / valorICMSDevido) * 100;
    }

    return incentivos;
}
```

### 4. Integração Cruzada de Dados entre Arquivos SPED

Uma função de integração pode validar e complementar dados extraídos de diferentes arquivos:

```javascript
/**
 * Integra dados de diferentes arquivos SPED para validação cruzada
 * @param {Object} dadosFiscal - Dados extraídos do SPED Fiscal
 * @param {Object} dadosContribuicoes - Dados extraídos do SPED Contribuições
 * @param {Object} dadosECF - Dados extraídos do SPED ECF
 * @param {Object} dadosECD - Dados extraídos do SPED ECD
 * @returns {Object} Dados integrados e validados
 */
function integrarDadosSPED(dadosFiscal, dadosContribuicoes, dadosECF, dadosECD) {
    const dadosIntegrados = {
        empresa: {},
        parametrosFiscais: {},
        cicloFinanceiro: {},
        // Outras seções...
    };

    // Validar faturamento entre SPED Fiscal e ECD/ECF
    const faturamentoFiscal = calcularFaturamentoMensal(dadosFiscal.documentos);
    const faturamentoContabil = dadosECD?.dre?.receitaBruta / 12 || dadosECF?.dre?.receitaBruta / 12;

    // Usar a fonte mais confiável ou a média se houver discrepância aceitável
    dadosIntegrados.empresa.faturamento = validarValoresSimilares(faturamentoFiscal, faturamentoContabil, 0.05) 
        ? (faturamentoFiscal + faturamentoContabil) / 2 
        : faturamentoFiscal;

    // Integrar dados de ciclo financeiro priorizando ECD, mas usando fiscal se necessário
    dadosIntegrados.cicloFinanceiro = dadosECD?.cicloFinanceiro || calcularCicloFinanceiroEstimado(dadosFiscal);

    // Determinar regime tributário com maior precisão usando dados combinados
    dadosIntegrados.parametrosFiscais.regime = determinarRegimeTributarioIntegrado(dadosFiscal, dadosContribuicoes, dadosECF);

    return dadosIntegrados;
}
```

### 5. Cálculos de Alíquotas Efetivas e Bases de Cálculo

Para o preenchimento dos campos de alíquotas e bases de cálculo:

```javascript
/**
 * Calcula a alíquota efetiva de ICMS e a base de cálculo como percentual
 * @param {Array} registrosC190 - Registros analíticos por CFOP/CST/Alíquota
 * @param {Object} registroE110 - Registro de apuração do ICMS
 * @returns {Object} Alíquota efetiva e base de cálculo
 */
function calcularAliquotaEfetiva(registrosC190, registroE110) {
    let valorContabilTotal = 0;
    let baseCalculoTotal = 0;
    let icmsTotal = 0;

    // Somar valores de saídas (CFOP iniciando com 5 ou 6)
    registrosC190.forEach(reg => {
        if (reg.CFOP.startsWith('5') || reg.CFOP.startsWith('6')) {
            valorContabilTotal += parseFloat(reg.VL_OPR);
            baseCalculoTotal += parseFloat(reg.VL_BC_ICMS);
            icmsTotal += parseFloat(reg.VL_ICMS);
        }
    });

    // Calcular alíquota efetiva e percentual da base de cálculo
    const aliquotaEfetiva = valorContabilTotal > 0 ? (icmsTotal / baseCalculoTotal) * 100 : 0;
    const percentualBase = valorContabilTotal > 0 ? (baseCalculoTotal / valorContabilTotal) * 100 : 0;

    return {
        aliquotaEfetiva,
        percentualBase,
        valorContabilTotal,
        baseCalculoTotal,
        icmsTotal
    };
}
```

## III. Proposta de Aprimoramento do Módulo de Importação

Com base na análise realizada, sugiro as seguintes melhorias específicas ao módulo de importação:

### 1. Ampliação do SpedParser.js

O arquivo `sped-parser.js` deve ser expandido para incluir novos mapeamentos de registros, especialmente da ECF e ECD. As funções de parsing devem ser implementadas para todos os registros relevantes.

### 2. Criação de um Módulo de Análise Financeira

Um novo arquivo `financial-analyzer.js` seria responsável pelos cálculos contábeis avançados, extraindo informações dos lançamentos contábeis e demonstrações financeiras.

### 3. Expansão do SpedExtractor.js

Ampliar o `SpedExtractor.js` para incluir:

- Extração de alíquotas efetivas
- Detecção de incentivos fiscais
- Cálculo preciso de ciclo financeiro
- Análise financeira utilizando a ECD

### 4. Criação de um Validador Cruzado

Implementar um novo componente `cross-validator.js` para validar dados entre diferentes arquivos SPED, aumentando a confiabilidade das informações extraídas.

### 5. Módulo de Mapeamento para IVA Dual

Criar um componente que mapeie CNAEs para categorias do IVA Dual, sugerindo automaticamente o setor apropriado com base nos dados da empresa.

## IV. Benefícios Esperados

A implementação destas melhorias resultará em:

1. **Preenchimento automático de até 80% dos campos** do simulador (atualmente em torno de 40%)
2. **Maior precisão nas simulações** devido ao uso de dados reais em vez de estimativas
3. **Redução significativa do tempo** necessário para configurar uma simulação
4. **Detecção automática de incentivos fiscais** e seu impacto na tributação atual
5. **Análise financeira integrada** que considera aspectos contábeis e fiscais

## V. Conclusão

Os arquivos SPED, especialmente ECF e ECD, contêm uma riqueza de informações que pode ser melhor aproveitada para o simulador de Split Payment. Ao implementar as estratégias propostas, o sistema poderá extrair dados precisos e completos, reduzindo significativamente a necessidade de entrada manual e aumentando a confiabilidade das simulações.

Particularmente, a integração dos dados da ECF e ECD permitirá uma compreensão muito mais profunda da estrutura financeira e fiscal da empresa, possibilitando simulações com maior precisão dos impactos do Split Payment no fluxo de caixa e na necessidade de capital de giro.
