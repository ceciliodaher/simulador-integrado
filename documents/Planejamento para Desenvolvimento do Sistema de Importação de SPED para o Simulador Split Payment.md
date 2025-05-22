# Planejamento para Desenvolvimento do Sistema de Importação de SPED para o Simulador Split Payment

## 1. Análise da Situação Atual e Requisitos

Após analisar o simulador existente e o documento sobre a estrutura de banco de dados proposta, identifico que precisamos desenvolver um sistema com três componentes principais:

1. **Importador SPED**: Interface para leitura seletiva de registros SPED e extração de dados tributários relevantes
2. **Banco de Dados**: Estrutura MySQL para armazenamento organizado dos dados extraídos
3. **Integrador**: Módulo de ligação entre o banco de dados e o simulador de Split Payment

A solução completa permitirá aos usuários importar arquivos SPED, processar os dados relevantes automaticamente e utilizá-los nas simulações de impacto do Split Payment, eliminando a necessidade de inserção manual.

## 2. Arquitetura Proposta

Proponho uma arquitetura modular baseada em tecnologias web modernas, seguindo o padrão MVC (Model-View-Controller):

```
/simulador-integrado/
├── index.html                      # Página principal do sistema integrado
├── simulador/                      # Simulador existente (mantido)
│   └── split-payment-simulator.html
├── importador/                     # Novo módulo de importação SPED
│   ├── import.html                 # Interface de importação
│   ├── css/                        # Estilos do importador
│   └── js/
│       ├── sped-parser.js          # Parser de arquivos SPED
│       ├── sped-extractor.js       # Extração de dados específicos
│       └── db-connector.js         # Conexão com banco de dados
├── integrador/                     # Módulo de integração
│   ├── js/
│   │   ├── data-bridge.js          # Ponte entre BD e simulador
│   │   └── data-mapper.js          # Mapeamento de dados
│   └── api/                        # APIs de comunicação
│       ├── get-company-data.php    # Endpoint para dados da empresa
│       └── get-tax-params.php      # Endpoint para parâmetros fiscais
└── shared/                         # Recursos compartilhados
    ├── css/
    │   └── common.css              # Estilos comuns
    ├── js/
    │   ├── data-validator.js       # Validação de dados
    │   └── utils.js                # Utilitários
    └── config/
        └── db-config.js            # Configuração de banco de dados
```

## 3. Modelo de Banco de Dados

Utilizaremos a estrutura proposta no documento de referência, que inclui as seguintes tabelas principais:

- **empresa**: Dados básicos da empresa
- **produto**: Catálogo de produtos/serviços
- **documento_fiscal**: Documentos fiscais (notas)
- **item_documento**: Itens de documentos fiscais
- **parametros_fiscais**: Configurações fiscais da empresa
- **ciclo_financeiro**: Dados do ciclo operacional
- **importacao_sped**: Registro de importações
- **parceiro_comercial**: Clientes e fornecedores

Esta estrutura permitirá o armazenamento organizado e relacionado dos dados extraídos dos arquivos SPED, facilitando sua posterior utilização no simulador.

## 4. Fluxo de Funcionamento do Sistema

O sistema integrado funcionará da seguinte forma:

1. **Importação de dados SPED**:
   
   - Usuário acessa a interface de importação
   - Seleciona e carrega os arquivos SPED (Fiscal, Contribuições, ECF, ECD)
   - Sistema identifica e extrai os registros relevantes
   - Dados são validados, processados e armazenados no banco de dados

2. **Preparação para simulação**:
   
   - Usuário acessa o simulador integrado
   - Seleciona a empresa e o período de referência dos dados importados
   - Sistema busca os dados no banco e prepara-os para o simulador

3. **Execução da simulação**:
   
   - Dados importados são carregados nos campos correspondentes do simulador
   - Usuário ajusta parâmetros adicionais se necessário
   - Simulação é executada com os dados reais da empresa

## 5. Componentes Técnicos Principais

### 5.1. Módulo de Importação SPED (Frontend)

```html
<!-- import.html (Trecho Conceitual) -->
<div class="import-container">
    <div class="import-header">
        <h2>Importação de Arquivos SPED</h2>
    </div>

    <div class="file-selector">
        <div class="file-type">
            <label>SPED Fiscal (EFD ICMS/IPI)</label>
            <input type="file" id="sped-fiscal" accept=".txt" />
        </div>
        <div class="file-type">
            <label>SPED Contribuições (EFD PIS/COFINS)</label>
            <input type="file" id="sped-contribuicoes" accept=".txt" />
        </div>
        <div class="file-type">
            <label>ECF (Escrituração Contábil Fiscal)</label>
            <input type="file" id="sped-ecf" accept=".txt" />
        </div>
        <!-- Outros tipos de arquivo SPED -->
    </div>

    <div class="import-options">
        <h3>Opções de Importação</h3>
        <div class="option-group">
            <label>
                <input type="checkbox" id="import-empresas" checked />
                Dados da Empresa
            </label>
            <label>
                <input type="checkbox" id="import-produtos" checked />
                Produtos/Serviços
            </label>
            <!-- Outras opções -->
        </div>
    </div>

    <div class="action-buttons">
        <button id="btn-import" class="btn-primary">Importar Dados</button>
        <button id="btn-cancel" class="btn-secondary">Cancelar</button>
    </div>

    <div class="import-log-container">
        <h3>Log de Importação</h3>
        <div id="import-log" class="log-area"></div>
    </div>
</div>
```

### 5.2. Parser SPED (JavaScript)

```javascript
// sped-parser.js (Trecho Conceitual)
const SpedParser = (function() {
    // Estrutura de mapeamento de registros SPED
    const registrosMapeados = {
        fiscal: {
            '0000': parseRegistro0000,
            'C100': parseRegistroC100,
            'C170': parseRegistroC170,
            'E110': parseRegistroE110,
            // Outros registros relevantes
        },
        contribuicoes: {
            '0000': parseRegistro0000Contribuicoes,
            'M100': parseRegistroM100,
            'M210': parseRegistroM210,
            // Outros registros relevantes
        }
        // Outros tipos de SPED
    };

    /**
     * Processa um arquivo SPED e extrai os dados relevantes
     * @param {File} arquivo - Arquivo SPED a ser processado
     * @param {string} tipo - Tipo de SPED (fiscal, contribuicoes, ecf, etc)
     * @returns {Promise} Promessa com os dados extraídos
     */
    function processarArquivo(arquivo, tipo) {
        return new Promise((resolve, reject) => {
            if (!arquivo) {
                reject(new Error('Arquivo não fornecido'));
                return;
            }

            const reader = new FileReader();

            reader.onload = function(e) {
                try {
                    const conteudo = e.target.result;
                    const linhas = conteudo.split('\n');
                    const dadosExtraidos = extrairDados(linhas, tipo);
                    resolve(dadosExtraidos);
                } catch (erro) {
                    reject(erro);
                }
            };

            reader.onerror = function() {
                reject(new Error('Erro ao ler o arquivo'));
            };

            reader.readAsText(arquivo);
        });
    }

    /**
     * Extrai dados relevantes das linhas do arquivo SPED
     * @param {Array} linhas - Linhas do arquivo SPED
     * @param {string} tipo - Tipo de SPED
     * @returns {Object} Objeto com dados extraídos
     */
    function extrairDados(linhas, tipo) {
        const resultado = {
            empresa: {},
            documentos: [],
            itens: [],
            impostos: {},
            creditos: {}
        };

        for (const linha of linhas) {
            const campos = linha.split('|');
            const registro = campos[1];

            // Verifica se o registro é mapeado para este tipo de SPED
            if (registrosMapeados[tipo] && registrosMapeados[tipo][registro]) {
                // Processa o registro com a função específica
                const dadosRegistro = registrosMapeados[tipo][registro](campos);
                integrarDados(resultado, dadosRegistro, registro);
            }
        }

        return resultado;
    }

    /**
     * Funções específicas para cada tipo de registro
     */
    function parseRegistro0000(campos) {
        return {
            tipo: 'empresa',
            cnpj: campos[7],
            nome: campos[8],
            ie: campos[10],
            municipio: campos[11],
            uf: campos[12],
            codMunicipio: campos[14]
        };
    }

    function parseRegistroC100(campos) {
        return {
            tipo: 'documento',
            indOper: campos[2], // 0=Entrada, 1=Saída
            indEmit: campos[3], // 0=Própria, 1=Terceiros
            codPart: campos[4],
            modelo: campos[5],
            situacao: campos[6],
            serie: campos[7],
            numero: campos[8],
            chaveNFe: campos[9],
            dataEmissao: campos[10],
            dataSaidaEntrada: campos[11],
            valorTotal: parseFloat(campos[12].replace(',', '.')),
            valorProdutos: parseFloat(campos[16].replace(',', '.'))
        };
    }

    // Outras funções de parsing...

    /**
     * Integra dados extraídos ao resultado
     */
    function integrarDados(resultado, dados, tipoRegistro) {
        if (!dados || !dados.tipo) return;

        switch (dados.tipo) {
            case 'empresa':
                resultado.empresa = {...resultado.empresa, ...dados};
                break;
            case 'documento':
                resultado.documentos.push(dados);
                break;
            case 'item':
                resultado.itens.push(dados);
                break;
            // Outros casos...
        }
    }

    // Interface pública
    return {
        processarArquivo,
        tiposSuportados: Object.keys(registrosMapeados)
    };
})();

export default SpedParser;
```

### 5.3. Conector de Banco de Dados (JavaScript/PHP)

```javascript
// db-connector.js (Frontend)
const DatabaseConnector = (function() {
    const API_BASE = '../api';

    /**
     * Salva dados importados no banco de dados
     * @param {Object} dados - Dados extraídos do SPED
     * @param {string} tipoSped - Tipo de SPED
     * @returns {Promise} Promessa com resultado da operação
     */
    async function salvarDados(dados, tipoSped) {
        try {
            const response = await fetch(`${API_BASE}/save-sped-data.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dados,
                    tipoSped,
                    dataImportacao: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao salvar dados no banco');
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro no salvamento:', erro);
            throw erro;
        }
    }

    /**
     * Busca empresas disponíveis no banco de dados
     * @returns {Promise} Promessa com lista de empresas
     */
    async function buscarEmpresas() {
        try {
            const response = await fetch(`${API_BASE}/get-companies.php`);

            if (!response.ok) {
                throw new Error('Erro ao buscar empresas');
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro na busca:', erro);
            throw erro;
        }
    }

    // Mais métodos para operações com o banco de dados...

    return {
        salvarDados,
        buscarEmpresas,
        // Outros métodos públicos...
    };
})();

export default DatabaseConnector;
```

```php
<?php
// save-sped-data.php (Backend)
header('Content-Type: application/json');

// Configuração do banco de dados
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "split_sped";

// Recebe dados JSON
$requestData = json_decode(file_get_contents('php://input'), true);

if (!$requestData) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Dados inválidos']);
    exit;
}

// Conecta ao banco de dados
$conn = new mysqli($servername, $username, $password, $dbname);

// Verifica conexão
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Falha na conexão com o banco de dados']);
    exit;
}

try {
    // Inicia transação
    $conn->begin_transaction();

    // Extrai dados
    $dados = $requestData['dados'];
    $tipoSped = $requestData['tipoSped'];
    $dataImportacao = $requestData['dataImportacao'];

    // Verifica se empresa já existe pelo CNPJ
    $stmt = $conn->prepare("SELECT id FROM empresa WHERE cnpj = ?");
    $stmt->bind_param("s", $dados['empresa']['cnpj']);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // Empresa já existe, obtém o ID
        $row = $result->fetch_assoc();
        $empresaId = $row['id'];
    } else {
        // Insere nova empresa
        $stmt = $conn->prepare("INSERT INTO empresa (cnpj, razao_social, nome_fantasia, data_importacao) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", 
            $dados['empresa']['cnpj'], 
            $dados['empresa']['nome'], 
            $dados['empresa']['nome'], 
            $dataImportacao
        );
        $stmt->execute();
        $empresaId = $conn->insert_id;
    }

    // Registra a importação
    $stmt = $conn->prepare("INSERT INTO importacao_sped (empresa_id, tipo_sped, data_importacao, status) VALUES (?, ?, ?, 'concluído')");
    $stmt->bind_param("iss", $empresaId, $tipoSped, $dataImportacao);
    $stmt->execute();
    $importacaoId = $conn->insert_id;

    // Insere documentos fiscais
    if (!empty($dados['documentos'])) {
        foreach ($dados['documentos'] as $doc) {
            // Lógica para inserir documentos...
        }
    }

    // Insere itens de documentos
    if (!empty($dados['itens'])) {
        foreach ($dados['itens'] as $item) {
            // Lógica para inserir itens...
        }
    }

    // Commit da transação
    $conn->commit();

    echo json_encode([
        'status' => 'success', 
        'message' => 'Dados importados com sucesso',
        'empresaId' => $empresaId,
        'importacaoId' => $importacaoId
    ]);

} catch (Exception $e) {
    // Rollback em caso de erro
    $conn->rollback();

    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Erro ao processar dados: ' . $e->getMessage()
    ]);
} finally {
    $conn->close();
}
?>
```

### 5.4. Integrador com o Simulador (JavaScript)

```javascript
// data-bridge.js
const DataBridge = (function() {
    // Constantes
    const API_BASE = '../api';
    const SIMULATOR_FORM_IDS = {
        empresa: 'empresa',
        faturamento: 'faturamento',
        margem: 'margem',
        tipoEmpresa: 'tipo-empresa',
        tipoOperacao: 'tipo-operacao',
        regime: 'regime',
        // Outros campos do simulador...
    };

    /**
     * Carrega dados completos de uma empresa a partir do banco
     * @param {number} empresaId - ID da empresa
     * @returns {Promise} Promessa com dados da empresa
     */
    async function carregarDadosEmpresa(empresaId) {
        try {
            const response = await fetch(`${API_BASE}/get-company-data.php?id=${empresaId}`);

            if (!response.ok) {
                throw new Error('Erro ao carregar dados da empresa');
            }

            return await response.json();
        } catch (erro) {
            console.error('Erro na carga de dados:', erro);
            throw erro;
        }
    }

    /**
     * Preenche o formulário do simulador com os dados carregados
     * @param {Object} dados - Dados da empresa e parâmetros fiscais
     */
    function preencherFormularioSimulador(dados) {
        // Preenche dados da empresa
        document.getElementById(SIMULATOR_FORM_IDS.empresa).value = dados.empresa.razao_social;
        document.getElementById(SIMULATOR_FORM_IDS.faturamento).value = dados.empresa.faturamento_anual / 12; // Anual para mensal
        document.getElementById(SIMULATOR_FORM_IDS.margem).value = dados.empresa.margem_media * 100; // Decimal para percentual

        // Tipo de empresa
        const selectTipoEmpresa = document.getElementById(SIMULATOR_FORM_IDS.tipoEmpresa);
        if (selectTipoEmpresa) {
            selectTipoEmpresa.value = dados.empresa.tipo_empresa;
            // Dispara evento de mudança para atualizar campos dependentes
            const event = new Event('change');
            selectTipoEmpresa.dispatchEvent(event);
        }

        // Regime tributário
        const selectRegime = document.getElementById(SIMULATOR_FORM_IDS.regime);
        if (selectRegime) {
            let regimeValue;
            switch (dados.empresa.regime_tributario) {
                case 'simples': regimeValue = 'simples'; break;
                case 'presumido': regimeValue = 'presumido'; break;
                case 'real': regimeValue = 'real'; break;
                default: regimeValue = '';
            }

            selectRegime.value = regimeValue;
            // Dispara evento de mudança
            const event = new Event('change');
            selectRegime.dispatchEvent(event);
        }

        // Preenche parâmetros fiscais específicos
        if (dados.parametrosFiscais) {
            preencherParametrosFiscais(dados.parametrosFiscais);
        }

        // Preenche ciclo financeiro
        if (dados.cicloFinanceiro) {
            preencherCicloFinanceiro(dados.cicloFinanceiro);
        }

        // Outros preenchimentos...
    }

    /**
     * Preenche parâmetros fiscais no simulador
     * @param {Object} parametros - Parâmetros fiscais
     */
    function preencherParametrosFiscais(parametros) {
        // Preenche parâmetros específicos conforme regime
        const regime = document.getElementById(SIMULATOR_FORM_IDS.regime).value;

        if (regime === 'simples') {
            document.getElementById('aliquota-simples').value = parametros.aliquota_efetiva * 100;
        } else {
            // PIS/COFINS
            if (parametros.regime_pis_cofins === 'nao_cumulativo') {
                document.getElementById('pis-cofins-regime').value = 'nao-cumulativo';
            } else {
                document.getElementById('pis-cofins-regime').value = 'cumulativo';
            }

            // Dispara evento para ajustar campos
            const event = new Event('change');
            document.getElementById('pis-cofins-regime').dispatchEvent(event);

            // Base de cálculo e percentual de aproveitamento
            if (parametros.base_calculo_pis_cofins) {
                document.getElementById('pis-cofins-base-calc').value = parametros.base_calculo_pis_cofins * 100;
            }

            if (parametros.perc_aproveitamento_pis_cofins) {
                document.getElementById('pis-cofins-perc-credito').value = parametros.perc_aproveitamento_pis_cofins * 100;
            }

            // ICMS
            if (document.getElementById('aliquota-icms')) {
                document.getElementById('aliquota-icms').value = parametros.aliquota_icms * 100;
                document.getElementById('icms-base-calc').value = parametros.base_calculo_icms * 100;
                document.getElementById('icms-perc-credito').value = parametros.perc_aproveitamento_icms * 100;
            }

            // Incentivo ICMS
            if (parametros.possui_incentivo_icms) {
                document.getElementById('possui-incentivo-icms').checked = true;
                document.getElementById('incentivo-icms').value = parametros.percentual_incentivo_icms * 100;
                // Dispara evento para mostrar campo
                const event = new Event('change');
                document.getElementById('possui-incentivo-icms').dispatchEvent(event);
            }

            // IPI (se indústria)
            if (document.getElementById('aliquota-ipi')) {
                document.getElementById('aliquota-ipi').value = parametros.aliquota_ipi * 100;
                document.getElementById('ipi-base-calc').value = parametros.base_calculo_ipi * 100;
                document.getElementById('ipi-perc-credito').value = parametros.perc_aproveitamento_ipi * 100;
            }

            // ISS (se serviços)
            if (document.getElementById('aliquota-iss')) {
                document.getElementById('aliquota-iss').value = parametros.aliquota_iss * 100;
            }
        }
    }

    /**
     * Preenche dados do ciclo financeiro
     * @param {Object} ciclo - Dados do ciclo financeiro
     */
    function preencherCicloFinanceiro(ciclo) {
        document.getElementById('pmr').value = ciclo.pmr;
        document.getElementById('pmp').value = ciclo.pmp;
        document.getElementById('pme').value = ciclo.pme;
        document.getElementById('perc-vista').value = ciclo.percentual_vista * 100;

        // Dispara eventos para recalcular campos dependentes
        const event = new Event('input');
        document.getElementById('pmr').dispatchEvent(event);
        document.getElementById('perc-vista').dispatchEvent(event);
    }

    // Interface pública
    return {
        carregarDadosEmpresa,
        preencherFormularioSimulador
    };
})();

export default DataBridge;
```

### 5.5. Interface Principal Integrada (HTML)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simulador Integrado de Split Payment</title>

    <!-- Estilos -->
    <link rel="stylesheet" href="shared/css/common.css">
    <link rel="stylesheet" href="importador/css/importador.css">

    <!-- Ícones e fontes -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Scripts do sistema -->
    <script src="shared/js/utils.js" defer></script>
    <script src="importador/js/import-controller.js" type="module" defer></script>
    <script src="integrador/js/integration-controller.js" type="module" defer></script>
</head>
<body>
    <header class="main-header">
        <div class="logo-container">
            <img src="shared/images/expertzy-it.png" alt="Expertzy Inteligência Tributária" class="logo">
        </div>
        <h1>Simulador Integrado de Split Payment</h1>
        <nav class="main-nav">
            <ul>
                <li><a href="#" class="active" data-module="simulador">Simulador</a></li>
                <li><a href="#" data-module="importador">Importar SPED</a></li>
                <li><a href="#" data-module="empresas">Empresas</a></li>
                <li><a href="#" data-module="relatorios">Relatórios</a></li>
            </ul>
        </nav>
    </header>

    <main class="content-container">
        <!-- Conteúdo dinâmico carregado via JavaScript -->
        <section id="module-simulador" class="module-content active">
            <div class="iframe-container">
                <iframe src="simulador/split-payment-simulator.html" id="simulador-frame"></iframe>
            </div>
        </section>

        <section id="module-importador" class="module-content">
            <div class="section-header">
                <h2>Importação de Arquivos SPED</h2>
                <p>Selecione e importe arquivos SPED para alimentar o simulador com dados reais da empresa.</p>
            </div>

            <div id="import-wizard" class="wizard-container">
                <!-- Conteúdo do assistente de importação -->
            </div>
        </section>

        <section id="module-empresas" class="module-content">
            <div class="section-header">
                <h2>Gerenciamento de Empresas</h2>
                <p>Visualize e selecione empresas para simulação.</p>
            </div>

            <div class="companies-container">
                <div class="search-bar">
                    <input type="text" id="search-company" placeholder="Buscar empresa...">
                    <button id="btn-search-company"><i class="fas fa-search"></i></button>
                </div>

                <div id="companies-list" class="companies-list">
                    <!-- Lista de empresas carregada dinamicamente -->
                </div>
            </div>
        </section>

        <section id="module-relatorios" class="module-content">
            <div class="section-header">
                <h2>Relatórios e Análises</h2>
                <p>Gere relatórios comparativos entre empresas e períodos.</p>
            </div>

            <div class="reports-container">
                <!-- Conteúdo de relatórios -->
            </div>
        </section>
    </main>

    <footer class="main-footer">
        <div class="footer-content">
            <p>© 2025 Expertzy Inteligência Tributária</p>
        </div>
    </footer>

    <!-- Modais -->
    <div id="modal-importacao" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Importação Concluída</h3>
                <span class="close">×</span>
            </div>
            <div class="modal-body">
                <!-- Conteúdo dinâmico -->
            </div>
            <div class="modal-footer">
                <button id="btn-ir-simulador" class="btn-primary">Ir para Simulador</button>
                <button id="btn-fechar-modal" class="btn-secondary">Fechar</button>
            </div>
        </div>
    </div>
</body>
</html>
```

## 6. Scripts de Banco de Dados (SQL)

```sql
-- Criação do banco de dados
CREATE DATABASE IF NOT EXISTS split_sped;
USE split_sped;

-- Tabela de empresas
CREATE TABLE empresa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cnpj VARCHAR(14) NOT NULL,
    razao_social VARCHAR(150) NOT NULL,
    nome_fantasia VARCHAR(100),
    tipo_empresa ENUM('comercio', 'industria', 'servicos'),
    regime_tributario ENUM('simples', 'presumido', 'real'),
    faturamento_anual DECIMAL(18,2),
    margem_media DECIMAL(10,4),
    cnae VARCHAR(7),
    data_importacao TIMESTAMP,
    UNIQUE KEY (cnpj)
);

-- Tabela de produtos
CREATE TABLE produto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(60) NOT NULL,
    descricao VARCHAR(150) NOT NULL,
    ncm VARCHAR(8),
    unidade_medida VARCHAR(6),
    tipo_item VARCHAR(2),
    empresa_id INT,
    FOREIGN KEY (empresa_id) REFERENCES empresa(id)
);

-- Tabela de importações SPED
CREATE TABLE importacao_sped (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT,
    tipo_sped ENUM('fiscal', 'contribuicoes', 'ecf', 'ecd'),
    periodo_inicial DATE,
    periodo_final DATE,
    arquivo_nome VARCHAR(255),
    data_importacao TIMESTAMP,
    status VARCHAR(20),
    FOREIGN KEY (empresa_id) REFERENCES empresa(id)
);

-- Tabela de parceiros comerciais
CREATE TABLE parceiro_comercial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('cliente', 'fornecedor', 'ambos'),
    cnpj_cpf VARCHAR(14),
    nome VARCHAR(150),
    uf VARCHAR(2),
    ie VARCHAR(20),
    empresa_id INT,
    FOREIGN KEY (empresa_id) REFERENCES empresa(id)
);

-- Tabela de documentos fiscais
CREATE TABLE documento_fiscal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    importacao_id INT,
    tipo_documento VARCHAR(10),
    numero VARCHAR(20),
    serie VARCHAR(3),
    data_emissao DATE,
    data_saida_entrada DATE,
    valor_total DECIMAL(18,2),
    chave_nfe VARCHAR(44),
    parceiro_id INT,
    FOREIGN KEY (importacao_id) REFERENCES importacao_sped(id),
    FOREIGN KEY (parceiro_id) REFERENCES parceiro_comercial(id)
);

-- Tabela de itens de documentos
CREATE TABLE item_documento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documento_id INT,
    produto_id INT,
    quantidade DECIMAL(18,6),
    valor_unitario DECIMAL(18,6),
    valor_total DECIMAL(18,2),
    aliquota_icms DECIMAL(10,4),
    valor_icms DECIMAL(18,2),
    aliquota_ipi DECIMAL(10,4),
    valor_ipi DECIMAL(18,2),
    aliquota_pis DECIMAL(10,4),
    valor_pis DECIMAL(18,2),
    aliquota_cofins DECIMAL(10,4),
    valor_cofins DECIMAL(18,2),
    cfop VARCHAR(4),
    FOREIGN KEY (documento_id) REFERENCES documento_fiscal(id),
    FOREIGN KEY (produto_id) REFERENCES produto(id)
);

-- Tabela de parâmetros fiscais
CREATE TABLE parametros_fiscais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT,
    regime_pis_cofins ENUM('cumulativo', 'nao_cumulativo'),
    credito_pis DECIMAL(18,2),
    credito_cofins DECIMAL(18,2),
    credito_icms DECIMAL(18,2),
    credito_ipi DECIMAL(18,2),
    possui_incentivo_icms BOOLEAN,
    percentual_incentivo_icms DECIMAL(10,4),
    FOREIGN KEY (empresa_id) REFERENCES empresa(id)
);

-- Tabela de ciclo financeiro
CREATE TABLE ciclo_financeiro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT,
    pmr INT,
    pmp INT,
    pme INT,
    percentual_vista DECIMAL(10,4),
    percentual_prazo DECIMAL(10,4),
    data_referencia DATE,
    FOREIGN KEY (empresa_id) REFERENCES empresa(id)
);
```

## 7. Plano de Desenvolvimento

Para implementar o sistema de forma eficiente, sugiro o seguinte plano de desenvolvimento em fases:

### Fase 1: Estrutura Básica e Banco de Dados

1. Criar estrutura de diretórios e arquivos base
2. Implementar scripts de criação do banco de dados
3. Desenvolver interface principal integrada
4. Estruturar módulos e componentes

### Fase 2: Módulo de Importação SPED

1. Implementar parser SPED para diferentes tipos de arquivo
2. Desenvolver interface de importação
3. Criar APIs de conexão com banco de dados
4. Implementar processamento de dados específicos

### Fase 3: Integração com o Simulador

1. Desenvolver ponte de dados entre BD e simulador
2. Adaptar simulador para receber dados externos
3. Criar seletor de empresas/períodos
4. Implementar preenchimento automático de formulários

### Fase 4: Testes e Refinamentos

1. Testar com arquivos SPED reais
2. Otimizar performance de processamento
3. Implementar validações e tratamento de erros
4. Refinar interface e experiência do usuário

## 8. Arquivos Necessários e Solicitações Adicionais

Para prosseguir com a implementação deste sistema, seria útil ter acesso aos seguintes arquivos do simulador:

1. **Estrutura completa de diretórios e arquivos** do simulador atual
2. **Detalhes de implementação** dos principais módulos JavaScript:
   - js/utils/data-manager.js
   - js/simulation/simulator.js
   - js/ui/simulacao-controller.js
3. **Exemplos de arquivos SPED** para testes (um de cada tipo)
4. **Detalhamento das fórmulas de cálculo** atualmente utilizadas no simulador

Existem também algumas decisões técnicas que precisariam ser confirmadas:

1. Preferência por comunicação direta via JavaScript ou necessidade de APIs PHP intermediárias?
2. Integração via iframe ou incorporação direta do simulador?
3. Requisitos específicos de segurança para o acesso ao banco de dados?
4. Preferências quanto à interface do usuário para o novo módulo de importação?

## 9. Conclusão

A implementação deste sistema integrado permitirá aos usuários do simulador de Split Payment utilizar dados reais extraídos diretamente dos SPEDs, aumentando significativamente a precisão das simulações e eliminando a necessidade de entrada manual de dados.

A arquitetura proposta é modular e extensível, permitindo futuras melhorias como integração com outros sistemas fiscais, geração de relatórios avançados e análises comparativas entre diferentes períodos ou empresas.

O uso de tecnologias web modernas (HTML5, CSS3, JavaScript modular, PHP para backend) garante compatibilidade com diferentes ambientes e facilidade de manutenção futura.
