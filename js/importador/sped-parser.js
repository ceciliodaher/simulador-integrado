/**
 * SpedParser - Módulo para processamento de arquivos SPED
 * Responsável por ler e analisar arquivos SPED de diferentes tipos
 */
const SpedParser = (function() {
    // Tipos de registros por tipo de SPED
    const registrosMapeados = {
        fiscal: {
            '0000': parseRegistro0000,
            'C100': parseRegistroC100,
            'C170': parseRegistroC170,
            'E110': parseRegistroE110
        },
        contribuicoes: {
            '0000': parseRegistro0000Contribuicoes,
            'M100': parseRegistroM100,
            'M210': parseRegistroM210
        }
    };

    /**
     * Processa um arquivo SPED e extrai os dados relevantes
     * @param {File} arquivo - Arquivo SPED a ser processado
     * @param {string} tipo - Tipo de SPED (fiscal, contribuicoes, ecf, ecd)
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
        // Inicializa objeto de resultado
        const resultado = {
            empresa: {},
            documentos: [],
            itens: [],
            impostos: {},
            creditos: {}
        };

        // Determina o tipo de SPED para mapear os registros corretamente
        let tipoSped = tipo;
        if (!tipoSped) {
            // Tenta determinar o tipo automaticamente
            tipoSped = determinarTipoSped(linhas);
        }

        // Se ainda não foi possível determinar o tipo, usa "fiscal" como padrão
        if (!tipoSped) {
            tipoSped = 'fiscal';
        }

        // Processa as linhas
        for (const linha of linhas) {
            if (!linha.trim()) continue;
            
            const campos = linha.split('|');
            const registro = campos[1];

            // Verifica se o registro é mapeado para este tipo de SPED
            if (registrosMapeados[tipoSped] && registrosMapeados[tipoSped][registro]) {
                try {
                    // Processa o registro com a função específica
                    const dadosRegistro = registrosMapeados[tipoSped][registro](campos);
                    integrarDados(resultado, dadosRegistro, registro);
                } catch (erro) {
                    console.error(`Erro ao processar registro ${registro}:`, erro);
                }
            }
        }

        return resultado;
    }

    /**
     * Determina o tipo de SPED com base nas primeiras linhas do arquivo
     * @param {Array} linhas - Linhas do arquivo SPED
     * @returns {string} Tipo do arquivo SPED
     */
    function determinarTipoSped(linhas) {
        for (let i = 0; i < Math.min(20, linhas.length); i++) {
            const linha = linhas[i];
            if (!linha.trim()) continue;
            
            const campos = linha.split('|');
            if (campos.length < 2) continue;
            
            const registro = campos[1];
            
            // Verifica registros específicos de cada tipo
            if (registro === '0000') {
                if (campos.length > 9) {
                    const finalidade = campos[9];
                    if (finalidade === '0') return 'fiscal';
                    if (finalidade === '1') return 'contribuicoes';
                }
            }
        }
        return null;
    }

    // Funções de parsing para cada tipo de registro

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

    function parseRegistro0000Contribuicoes(campos) {
        return {
            tipo: 'empresa',
            cnpj: campos[7],
            nome: campos[8],
            ie: campos[10],
            municipio: campos[11],
            uf: campos[12],
            regimeTributacao: campos[16]
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

    function parseRegistroC170(campos) {
        return {
            tipo: 'item',
            itemId: campos[3],
            descricao: campos[4],
            quantidade: parseFloat(campos[5].replace(',', '.')),
            unidade: campos[6],
            valorItem: parseFloat(campos[7].replace(',', '.')),
            valorDesconto: parseFloat(campos[8] ? campos[8].replace(',', '.') : '0'),
            cfop: campos[11],
            cstIcms: campos[10]
        };
    }

    function parseRegistroE110(campos) {
        return {
            tipo: 'imposto',
            categoria: 'icms',
            valorTotalDebitos: parseFloat(campos[4].replace(',', '.')),
            valorTotalCreditos: parseFloat(campos[5].replace(',', '.')),
            valorSaldoApurado: parseFloat(campos[11].replace(',', '.'))
        };
    }

    function parseRegistroM100(campos) {
        return {
            tipo: 'credito',
            categoria: 'pis',
            codigoCredito: campos[2],
            valorBaseCreditoTotal: parseFloat(campos[4].replace(',', '.')),
            aliquotaPis: parseFloat(campos[5].replace(',', '.')),
            valorCredito: parseFloat(campos[6].replace(',', '.'))
        };
    }

    function parseRegistroM210(campos) {
        return {
            tipo: 'credito',
            categoria: 'cofins',
            codigoCredito: campos[2],
            valorBaseCalculoTotal: parseFloat(campos[4].replace(',', '.')),
            aliquotaCofins: parseFloat(campos[5].replace(',', '.')),
            valorCredito: parseFloat(campos[6].replace(',', '.'))
        };
    }

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
            case 'imposto':
                if (!resultado.impostos[dados.categoria]) {
                    resultado.impostos[dados.categoria] = [];
                }
                resultado.impostos[dados.categoria].push(dados);
                break;
            case 'credito':
                if (!resultado.creditos[dados.categoria]) {
                    resultado.creditos[dados.categoria] = [];
                }
                resultado.creditos[dados.categoria].push(dados);
                break;
        }
    }

    // Interface pública
    return {
        processarArquivo,
        tiposSuportados: Object.keys(registrosMapeados)
    };
})();