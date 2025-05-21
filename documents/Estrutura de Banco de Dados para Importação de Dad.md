<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Estrutura de Banco de Dados para Importação de Dados SPED no Simulador de Split Payment

O desenvolvimento de uma solução para importar dados dos SPEDs diretamente para o simulador de Split Payment é uma excelente estratégia para aumentar a precisão das simulações e reduzir o trabalho manual de entrada de dados. A seguir, apresento uma estrutura de banco de dados adequada para esta integração, detalhando a origem dos dados nos arquivos SPED e como eles serão utilizados no simulador.

## Visão Geral da Solução

A solução proposta consiste em um banco de dados relacional que armazenará dados extraídos dos diversos arquivos SPED (Fiscal, Contribuições, ECF, ECD), permitindo uma simulação mais detalhada e precisa do impacto do Split Payment no fluxo de caixa da empresa.

## Estrutura do Banco de Dados

### Tabelas Principais

1. **empresa**
   - Armazena informações gerais da empresa
   - Dados básicos como CNPJ, nome, regime tributário
2. **produto**
   - Catálogo de produtos/serviços
   - Contém informações como código, descrição e NCM
3. **documento_fiscal**
   - Registros de documentos fiscais (notas fiscais)
   - Relaciona-se com itens e parceiros comerciais
4. **item_documento**
   - Itens individuais de cada documento fiscal
   - Contém quantidade, valor, impostos por item
5. **parametros_fiscais**
   - Configurações fiscais específicas da empresa
   - Alíquotas, regimes e créditos tributários
6. **ciclo_financeiro**
   - Dados calculados sobre o ciclo operacional
   - PMR, PMP, PME e percentuais de vendas à vista/prazo
7. **importacao_sped**
   - Registra os processos de importação
   - Controle de arquivos importados e status
8. **parceiro_comercial**
   - Informações de clientes e fornecedores
   - Facilita análise por tipo de parceiro

## Mapeamento de Dados SPED para o Simulador

A tabela abaixo detalha a origem de cada dado nos arquivos SPED e como será utilizado no simulador:

| Dado                 | SPED de Origem     | Registro       | Campo                | Campo no Simulador                        | Observações                                |
|:-------------------- |:------------------ |:-------------- |:-------------------- |:----------------------------------------- |:------------------------------------------ |
| CNPJ                 | SPED Fiscal        | 0000           | CNPJ                 | empresa.cnpj                              | Identificação da empresa                   |
| Razão Social         | SPED Fiscal        | 0000           | NOME                 | empresa.nome                              | Nome da empresa                            |
| Regime Tributário    | SPED Fiscal        | 0000           | IND_PERFIL           | empresa.regime                            | A=Real, B=Presumido, C=Simples             |
| Tipo Empresa         | SPED Fiscal        | 0000           | CNAE                 | empresa.tipoEmpresa                       | Classificado conforme CNAE                 |
| Faturamento          | SPED Contribuições | A100/C100/D100 | VL_DOC               | empresa.faturamento                       | Soma dos valores no período                |
| Margem               | ECF                | M300/L300      | LUC_BRUTO/VL_REC_LIQ | empresa.margem                            | Lucro Bruto/Receita Líquida                |
| Código do Produto    | SPED Fiscal        | 0200           | COD_ITEM             | -                                         | Identificação do produto                   |
| Descrição do Produto | SPED Fiscal        | 0200           | DESCR_ITEM           | -                                         | Descrição do produto                       |
| NCM                  | SPED Fiscal        | 0200           | COD_NCM              | -                                         | Código NCM para categorização              |
| Quantidade           | SPED Fiscal        | C170/D170      | QTD                  | -                                         | Quantidade comercializada                  |
| Valor unitário       | SPED Fiscal        | C170/D170      | VL_UNIT              | -                                         | Preço unitário do item                     |
| Valor total item     | SPED Fiscal        | C170/D170      | VL_ITEM              | -                                         | Valor total do item                        |
| Alíquota ICMS        | SPED Fiscal        | C170/C190      | ALIQ_ICMS            | parametrosFiscais.aliquota                | Alíquota efetiva de ICMS                   |
| Valor ICMS           | SPED Fiscal        | C170/C190      | VL_ICMS              | -                                         | Valor total de ICMS                        |
| Alíquota IPI         | SPED Fiscal        | C170           | ALIQ_IPI             | -                                         | Alíquota de IPI                            |
| PMR                  | Cálculo            | C100 + ECD     | -                    | cicloFinanceiro.pmr                       | Cálculo sobre dados de vendas/recebimentos |
| PMP                  | Cálculo            | C100 + ECD     | -                    | cicloFinanceiro.pmp                       | Cálculo sobre dados de compras/pagamentos  |
| PME                  | Cálculo            | H010 + K200    | -                    | cicloFinanceiro.pme                       | Baseado na rotação de estoque              |
| % à Vista            | Cálculo            | C100           | -                    | cicloFinanceiro.percVista                 | Inferido de prazos de recebimento          |
| % a Prazo            | Cálculo            | C100           | -                    | cicloFinanceiro.percPrazo                 | Inferido de prazos de recebimento          |
| Alíquota PIS         | SPED Contribuições | M210           | ALIQ_PIS             | -                                         | Para cálculo de impostos                   |
| Valor PIS            | SPED Contribuições | M210           | VL_PIS               | -                                         | Valor de PIS apurado                       |
| Alíquota COFINS      | SPED Contribuições | M610           | ALIQ_COFINS          | -                                         | Para cálculo de impostos                   |
| Valor COFINS         | SPED Contribuições | M610           | VL_COFINS            | -                                         | Valor de COFINS apurado                    |
| Créditos PIS         | SPED Contribuições | M100           | VL_CRED              | parametrosFiscais.creditos                | Créditos de PIS                            |
| Créditos COFINS      | SPED Contribuições | M500           | VL_CRED              | -                                         | Créditos de COFINS                         |
| Créditos ICMS        | SPED Fiscal        | E110           | VL_TOT_CREDITOS      | -                                         | Créditos de ICMS                           |
| Incentivo ICMS       | SPED Fiscal        | E300/E310      | VL_ICMS_ISN          | parametrosFiscais.percentualIncentivoICMS | Incentivos fiscais                         |
| Regime PIS/COFINS    | SPED Contribuições | 0000           | IND_NAT_PJ           | parametrosFiscais.cumulativeRegime        | 00=Não cumulativo, 01=Cumulativo           |

## Detalhamento das Tabelas

A seguir, detalhamento das principais tabelas do banco de dados:

```sql
CREATE TABLE empresa (
    id INTEGER PRIMARY KEY,
    cnpj VARCHAR(14) NOT NULL,
    razao_social VARCHAR(150) NOT NULL,
    nome_fantasia VARCHAR(100),
    tipo_empresa ENUM('comercio', 'industria', 'servicos'),
    regime_tributario ENUM('simples', 'presumido', 'real'),
    faturamento_anual DECIMAL(18,2),
    margem_media DECIMAL(10,4),
    cnae VARCHAR(7),
    data_importacao TIMESTAMP
);

CREATE TABLE produto (
    id INTEGER PRIMARY KEY,
    codigo VARCHAR(60) NOT NULL,
    descricao VARCHAR(150) NOT NULL,
    ncm VARCHAR(8),
    unidade_medida VARCHAR(6),
    tipo_item VARCHAR(2),
    empresa_id INTEGER,
    FOREIGN KEY (empresa_id) REFERENCES empresa(id)
);

CREATE TABLE importacao_sped (
    id INTEGER PRIMARY KEY,
    empresa_id INTEGER,
    tipo_sped ENUM('fiscal', 'contribuicoes', 'ecf', 'ecd'),
    periodo_inicial DATE,
    periodo_final DATE,
    arquivo_nome VARCHAR(255),
    data_importacao TIMESTAMP,
    status VARCHAR(20),
    FOREIGN KEY (empresa_id) REFERENCES empresa(id)
);

CREATE TABLE parceiro_comercial (
    id INTEGER PRIMARY KEY,
    tipo ENUM('cliente', 'fornecedor', 'ambos'),
    cnpj_cpf VARCHAR(14),
    nome VARCHAR(150),
    uf VARCHAR(2),
    ie VARCHAR(20),
    empresa_id INTEGER,
    FOREIGN KEY (empresa_id) REFERENCES empresa(id)
);

CREATE TABLE documento_fiscal (
    id INTEGER PRIMARY KEY,
    importacao_id INTEGER,
    tipo_documento VARCHAR(10),
    numero VARCHAR(20),
    serie VARCHAR(3),
    data_emissao DATE,
    data_saida_entrada DATE,
    valor_total DECIMAL(18,2),
    chave_nfe VARCHAR(44),
    parceiro_id INTEGER,
    FOREIGN KEY (importacao_id) REFERENCES importacao_sped(id),
    FOREIGN KEY (parceiro_id) REFERENCES parceiro_comercial(id)
);

CREATE TABLE item_documento (
    id INTEGER PRIMARY KEY,
    documento_id INTEGER,
    produto_id INTEGER,
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

CREATE TABLE parametros_fiscais (
    id INTEGER PRIMARY KEY,
    empresa_id INTEGER,
    regime_pis_cofins ENUM('cumulativo', 'nao_cumulativo'),
    credito_pis DECIMAL(18,2),
    credito_cofins DECIMAL(18,2),
    credito_icms DECIMAL(18,2),
    credito_ipi DECIMAL(18,2),
    possui_incentivo_icms BOOLEAN,
    percentual_incentivo_icms DECIMAL(10,4),
    FOREIGN KEY (empresa_id) REFERENCES empresa(id)
);

CREATE TABLE ciclo_financeiro (
    id INTEGER PRIMARY KEY,
    empresa_id INTEGER,
    pmr INTEGER,
    pmp INTEGER,
    pme INTEGER,
    percentual_vista DECIMAL(10,4),
    percentual_prazo DECIMAL(10,4),
    data_referencia DATE,
    FOREIGN KEY (empresa_id) REFERENCES empresa(id)
);
```

## Integração com o Simulador

Para integrar o banco de dados ao simulador, será necessário:

1. **Módulo de Importação de SPED**:
   - Função para processar e validar arquivos SPED
   - Extração e normalização dos dados nos registros
   - Persistência no banco de dados relacional
2. **API de Consulta**:
   - Endpoints para consultar dados agregados
   - Transformação dos dados do banco para o formato do simulador
   - Cálculos derivados (PMR, PMP, PME, alíquotas efetivas)
3. **Interface de Seleção**:
   - Seleção da empresa e período de referência
   - Visualização prévia dos dados importados
   - Opção para ajustes manuais antes da simulação
4. **Módulo de Análise por NCM**:
   - Simulação detalhada por categoria de produto
   - Análise de sensibilidade por NCM
   - Recomendações específicas por grupo de produtos

## Simulação Aprofundada

Com esta estrutura, será possível realizar simulações mais aprofundadas como:

1. **Análise por NCM**: Identificar produtos mais sensíveis ao Split Payment com base no NCM
2. **Impacto por Tipo de Operação**: Analisar operações com diferentes CFOPs
3. **Simulação por Cliente/Fornecedor**: Avaliar impacto em diferentes relacionamentos comerciais
4. **Estratégias Específicas por Categoria**: Desenvolver abordagens customizadas

## Conclusão

A estrutura de banco de dados proposta permite uma integração completa entre os dados reais da empresa extraídos dos arquivos SPED e o simulador de Split Payment. Esta integração possibilitará simulações muito mais precisas e detalhadas, fornecendo insights estratégicos valiosos para mitigar os impactos do Split Payment no fluxo de caixa da empresa.

Esta solução é escalável e pode ser expandida para incluir outras fontes de dados, como NF-e, CT-e ou EFD-Reinf, conforme a necessidade de análises mais específicas.

<div style="text-align: center">⁂</div>

[^1]: simulation-initializer.js.txt

[^2]: simulador-repository.js.txt

[^3]: estrategias-controller.js.txt

[^4]: dependencies-config.js.txt

[^5]: split-payment-simulator.html.txt

[^6]: state-manager.js.txt

[^7]: simulator.js.txt

[^8]: setores-modal.js.txt

[^9]: http://sped.rfb.gov.br/item/show/1573

[^10]: https://atendimento.inventsoftware.info/kb/article/357174/taxplus-sped-fiscal-registro-c100

[^11]: https://saamauditoria.com.br/blog/31-agosto-registro-c170-da-efd.html

[^12]: https://www.contabeis.com.br/forum/contabilidade/298456/campo-4-item-c170-sped-fiscal/

[^13]: http://sped.rfb.gov.br/arquivo/download/3038

[^14]: https://suporte.senior.com.br/hc/pt-br/articles/4409372223252-ERP-SPED-Fiscal-Contribuições-O-campo-COD-NCM-do-registro-0200-é-gerado-em-branco-porém-no-cadastro-do-produto-existe-a-Classificação-Fiscal-informada-e-no-cadastro-desta-classificação-há-a-informação-do-NCM

[^15]: https://www.vriconsulting.com.br/guias/guiasIndex.php?idGuia=22

[^16]: https://www.vriconsulting.com.br/guias/guiasIndex.php?idGuia=46

[^17]: https://www.vriconsulting.com.br/guias/guiasIndex.php?idGuia=9

[^18]: http://sped.rfb.gov.br/estatico/30/007F992E2E9F284F1DC7D9AC50A4CF3BE4513C/Guia Prático EFD - Versão 3.1.8.pdf

[^19]: https://www.nomus.com.br/blog-industrial/registro-0200/

[^20]: http://sped.rfb.gov.br/item/show/2133

[^21]: https://suporte.dominioatendimento.com/central/faces/solucao.html?codigo=8525

[^22]: https://documentacao.senior.com.br/gestaoempresarialerp/5.10.2/menu_controladoria/sped/fiscal-icms-ipi/capa.htm

[^23]: https://aprendo.iob.com.br/ajudaonline/artigo.aspx?artigo=4407

[^24]: https://portal.fazenda.rj.gov.br/efd/wp-content/uploads/sites/32/2023/09/Manual_EFD.pdf

[^25]: http://sped.rfb.gov.br/item/show/7607

[^26]: document-exporters.js.txt

[^27]: iva-dual-system.js.txt

[^28]: dom-utils.js.txt

[^29]: calculation-core.js.txt

[^30]: export-core.js.txt

[^31]: https://tdn.totvs.com/pages/viewpage.action?pageId=649306598

[^32]: https://tdn.totvs.com/pages/viewpage.action?pageId=708089382

[^33]: https://www.portaldeperiodicos.idp.edu.br/rda/article/download/5863/2363/18648

[^34]: http://sped.rfb.gov.br/estatico/1D/5B40578A64FD1B6DE7BC9705D82AC59D4EC0BD/Guia_Pratico_EFD_Contribuicoes_Versao_1_23.pdf

[^35]: https://tdn.totvs.com/plugins/viewsource/viewpagesrc.action?pageId=859049754

[^36]: https://www.vriconsulting.com.br/guias/guiasIndex.php?idGuia=362

[^37]: http://sped.rfb.gov.br/item/show/7659

[^38]: http://sped.rfb.gov.br/estatico/68/EB671410B7A0FB98F1D36CBA3F391135720C04/guia_pratico_da_efd_versao_2_0_2.pdf

[^39]: https://asisprojetos.com.br/spednews/efdpis-e-cofins-registro-0200-tabela-de-identificacao-do-item-vai-exigir-ncm-para-bens-do-ativo-imobilizado-e-de-uso-e-consumo/

[^40]: https://suporte.senior.com.br/hc/pt-br/articles/4408636551444-ERP-SPED-Fiscal-O-campo-Código-do-Item-do-registro-0200-gera-com-o-prefixo-PRO-SER-ou-CPL-diferente-do-código-gerado-no-XML

[^41]: http://sped.rfb.gov.br/arquivo/download/3045

[^42]: https://documentacao.senior.com.br/goup/5.10.2/menu_controladoria/sped/fiscal-icms-ipi/bloco-c.htm

[^43]: https://documentacao.senior.com.br/goup/5.10.2/menu_controladoria/sped/fiscal-icms-ipi/capa.htm

[^44]: https://centraldeatendimento.totvs.com/hc/pt-br/articles/360024511512-Cross-Segmentos-Linha-Datasul-MLF-SPED-Fiscal-Registro-0200-Como-gerar-a-NCM-Nomenclatura-Comum-do-Mercosul

[^45]: https://wiki-erp.ixcsoft.com.br/guias-erros/fiscal/erros-arquivos-fiscais/erro-de-importacao---sped-fiscal/erro-de-importacao---registro-0200---cod_ncm---tamanho-do-campo-invalido

[^46]: https://portal.fazenda.sp.gov.br/servicos/st/Downloads/Leiaute_Arquivo_Digital_ICMS_ST_Publicado_V_1_1_%20Rev_d_16052019.pdf

[^47]: https://centraldeatendimento.totvs.com/hc/pt-br/articles/360020243292-Cross-Segmentos-Linha-RM-Fis-Registro-0200

[^48]: https://tdn.totvs.com/pages/viewpage.action?pageId=804033044

[^49]: http://dbcon.sefaz.am.gov.br/efd/arquivos/Guia Prático da EFD - versão 1.0.6.pdf

[^50]: https://news.adejo.com.br/informativo-efd-icms-ipi-registro-0221

[^51]: https://www.youtube.com/watch?v=GW3XBFNh4LQ

[^52]: http://sped.rfb.gov.br/estatico/0D/2DC4C346EDFCDFAFA26C391C7398D060594B50/GUIA PRÁTICO DA EFD - Versão 2.0.22.pdf

[^53]: http://www.contabilidadetoassi.com.br/binario/64/esped_escrituracao_digital.pdf

[^54]: https://portalsped.fazenda.mg.gov.br/spedmg/export/sites/spedmg/efd/downloads/EFD-Manual-de-Escrituracao-docs-e-pgtos-extemporaneos-2020-09-22.pdf

[^55]: https://atendimento.tecnospeed.com.br/hc/pt-br/articles/11938385543191-Registro-C100
