/**
 * Ferramentas de Exportação de Dados
 * Módulo para exportação dos resultados de simulação em diferentes formatos
 */
const ExportTools = {
    /**
     * Exporta os resultados da simulação para PDF
     */
    exportarParaPDF: function() {
        console.log('Iniciando exportação para PDF');
        
        if (!window.ultimaSimulacao) {
            alert('Realize uma simulação antes de exportar');
            return;
        }

        try {
            // Inicializar jsPDF (garantir que a biblioteca está carregada)
            if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF !== 'function') {
                console.error('Biblioteca jsPDF não encontrada');
                alert('Erro ao exportar: Biblioteca jsPDF não carregada');
                return;
            }

            // Inicializar jsPDF
            const doc = new jspdf.jsPDF();

            // Configurações de texto
            doc.setFont('helvetica');
            doc.setFontSize(16);

            // Título
            doc.text('Simulação de Impacto do Split Payment no Fluxo de Caixa', 15, 20);

            // Informações da empresa
            doc.setFontSize(12);
            doc.text(`Empresa: ${window.ultimaSimulacao.dados.empresa}`, 15, 30);
            
            // Obter nome do setor
            let nomeSetor = 'Não especificado';
            const selectSetor = document.getElementById('setor');
            if (selectSetor && selectSetor.selectedIndex > 0) {
                nomeSetor = selectSetor.options[selectSetor.selectedIndex].text;
            }
            
            doc.text(`Setor: ${nomeSetor}`, 15, 38);
            
            // Regime tributário formatado
            let regimeTributario = 'Não especificado';
            switch(window.ultimaSimulacao.dados.regime) {
                case 'simples': regimeTributario = 'SIMPLES NACIONAL'; break;
                case 'presumido': regimeTributario = 'LUCRO PRESUMIDO'; break;
                case 'real': regimeTributario = 'LUCRO REAL'; break;
                default: regimeTributario = window.ultimaSimulacao.dados.regime.toUpperCase();
            }
            
            doc.text(`Regime Tributário: ${regimeTributario}`, 15, 46);
            doc.text(`Data da Simulação: ${new Date().toLocaleDateString('pt-BR')}`, 15, 54);

            // Linha separadora
            doc.line(15, 60, 195, 60);

            // Resultados principais
            doc.setFontSize(14);
            doc.text('Resultados da Simulação', 15, 70);

            doc.setFontSize(12);
            const imp = window.ultimaSimulacao.resultados.impactoBase;
            const formatMoeda = (val) => `R$ ${val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
            const formatPerc = (val) => `${(val * 100).toFixed(2)}%`;

            doc.text(`Faturamento Mensal: ${formatMoeda(window.ultimaSimulacao.dados.faturamento)}`, 15, 80);
            doc.text(`Alíquota Efetiva: ${formatPerc(window.ultimaSimulacao.dados.aliquota)}`, 15, 88);
            doc.text(`Impacto no Capital de Giro: ${formatMoeda(imp.diferencaCapitalGiro)}`, 15, 96);
            doc.text(`Impacto Percentual: ${formatPerc(imp.percentualImpacto/100)}`, 15, 104);
            doc.text(`Necessidade Adicional: ${formatMoeda(imp.necessidadeAdicionalCapitalGiro)}`, 15, 112);
            doc.text(`Impacto na Margem: De ${formatPerc(imp.margemOperacionalOriginal)} para ${formatPerc(imp.margemOperacionalAjustada)}`, 15, 120);

            // Projeção
            const proj = window.ultimaSimulacao.resultados.projecaoTemporal;
            doc.text(`Projeção ${proj.parametros.anoInicial}-${proj.parametros.anoFinal}:`, 15, 136);
            doc.text(`Necessidade Total: ${formatMoeda(proj.impactoAcumulado.totalNecessidadeCapitalGiro)}`, 15, 144);
            doc.text(`Custo Financeiro: ${formatMoeda(proj.impactoAcumulado.custoFinanceiroTotal)}`, 15, 152);
            doc.text(`Impacto Médio na Margem: ${formatPerc(proj.impactoAcumulado.impactoMedioMargem/100)}`, 15, 160);

            // Rodapé
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.text('© 2025 Expertzy Inteligência Tributária', 15, 285);
                doc.text(`Página ${i} de ${pageCount}`, 180, 285);
            }

            // Salvar o PDF
            const nomeArquivo = `simulacao-split-payment-${window.ultimaSimulacao.dados.empresa.replace(/\s+/g, '-')}.pdf`;
            doc.save(nomeArquivo);
            console.log('PDF exportado com sucesso:', nomeArquivo);
        } catch (error) {
            console.error('Erro ao exportar para PDF:', error);
            alert('Erro ao exportar para PDF. Verifique o console para mais detalhes.');
        }
    },

    /**
     * Exporta os resultados da simulação para Excel
     */
    exportarParaExcel: function() {
        console.log('Iniciando exportação para Excel');
        
        if (!window.ultimaSimulacao) {
            alert('Realize uma simulação antes de exportar');
            return;
        }

        try {
            // Verificar se a biblioteca está disponível
            if (typeof XLSX === 'undefined') {
                console.error('Biblioteca XLSX não encontrada');
                alert('Erro ao exportar: Biblioteca XLSX não carregada');
                return;
            }

            // Criar uma nova pasta de trabalho
            const wb = XLSX.utils.book_new();

            // Dados para a planilha de resultados
            const formatMoeda = (val) => val.toLocaleString('pt-BR', {minimumFractionDigits: 2});
            const formatPerc = (val) => (val * 100).toFixed(2) + '%';

            // Obter nome do setor
            let nomeSetor = 'Não especificado';
            const selectSetor = document.getElementById('setor');
            if (selectSetor && selectSetor.selectedIndex > 0) {
                nomeSetor = selectSetor.options[selectSetor.selectedIndex].text;
            }

            const dadosResultados = [
                ['Simulação de Impacto do Split Payment no Fluxo de Caixa'],
                [''],
                ['Dados da Empresa'],
                ['Empresa', window.ultimaSimulacao.dados.empresa],
                ['Setor', nomeSetor],
                ['Regime Tributário', window.ultimaSimulacao.dados.regime ? window.ultimaSimulacao.dados.regime.toUpperCase() : 'Não especificado'],
                ['Data da Simulação', new Date().toLocaleDateString('pt-BR')],
                [''],
                ['Parâmetros da Simulação'],
                ['Faturamento Mensal', formatMoeda(window.ultimaSimulacao.dados.faturamento)],
                ['Alíquota Efetiva', formatPerc(window.ultimaSimulacao.dados.aliquota)],
                ['Prazo Médio de Recebimento', window.ultimaSimulacao.dados.pmr + ' dias'],
                ['Prazo Médio de Pagamento', window.ultimaSimulacao.dados.pmp + ' dias'],
                ['Prazo Médio de Estoque', window.ultimaSimulacao.dados.pme + ' dias'],
                ['Percentual Vendas à Vista', formatPerc(window.ultimaSimulacao.dados.percVista)],
                ['Percentual Vendas a Prazo', formatPerc(window.ultimaSimulacao.dados.percPrazo)],
                [''],
                ['Resultados Principais'],
                ['Parâmetro', 'Valor'],
                ['Percentual de Implementação', formatPerc(window.ultimaSimulacao.resultados.impactoBase.resultadoSplitPayment.percentualImplementacao)],
                ['Impacto no Capital de Giro', window.ultimaSimulacao.resultados.impactoBase.diferencaCapitalGiro],
                ['Impacto Percentual', window.ultimaSimulacao.resultados.impactoBase.percentualImpacto/100],
                ['Necessidade Adicional', window.ultimaSimulacao.resultados.impactoBase.necessidadeAdicionalCapitalGiro],
                ['Margem Original', window.ultimaSimulacao.resultados.impactoBase.margemOperacionalOriginal],
                ['Margem Ajustada', window.ultimaSimulacao.resultados.impactoBase.margemOperacionalAjustada]
            ];

            // Adicionar dados da projeção
            dadosResultados.push(['']);
            dadosResultados.push(['Projeção Temporal']);
            const proj = window.ultimaSimulacao.resultados.projecaoTemporal;
            dadosResultados.push(['Período', `${proj.parametros.anoInicial}-${proj.parametros.anoFinal}`]);
            dadosResultados.push(['Necessidade Total', proj.impactoAcumulado.totalNecessidadeCapitalGiro]);
            dadosResultados.push(['Custo Financeiro Total', proj.impactoAcumulado.custoFinanceiroTotal]);
            dadosResultados.push(['Impacto Médio na Margem', proj.impactoAcumulado.impactoMedioMargem/100]);

            // Criar planilha de resultados
            const wsResultados = XLSX.utils.aoa_to_sheet(dadosResultados);
            XLSX.utils.book_append_sheet(wb, wsResultados, 'Resultados');

            // Criar planilha para cada ano da projeção
            const anos = Object.keys(proj.resultadosAnuais);
            anos.forEach(ano => {
                const dadosAno = [
                    [`Impacto Detalhado - Ano ${ano}`],
                    [''],
                    ['Parâmetro', 'Valor'],
                    ['Diferença Capital de Giro', proj.resultadosAnuais[ano].diferencaCapitalGiro],
                    ['Percentual de Impacto', proj.resultadosAnuais[ano].percentualImpacto/100],
                    ['Necessidade Adicional', proj.resultadosAnuais[ano].necessidadeAdicionalCapitalGiro],
                    ['Margem Ajustada', proj.resultadosAnuais[ano].margemOperacionalAjustada]
                ];

                const wsAno = XLSX.utils.aoa_to_sheet(dadosAno);
                XLSX.utils.book_append_sheet(wb, wsAno, `Ano ${ano}`);
            });

            // Criar planilha de memória de cálculo
            if (window.memoriaCalculoSimulacao) {
                const anoInicial = window.ultimaSimulacao.resultados.projecaoTemporal.parametros.anoInicial;
                const memoriaTexto = window.memoriaCalculoSimulacao[anoInicial] || '';
                
                const memoriaLinhas = memoriaTexto.split('\n').map(linha => [linha]);
                const wsMemoria = XLSX.utils.aoa_to_sheet(memoriaLinhas);
                XLSX.utils.book_append_sheet(wb, wsMemoria, 'Memória de Cálculo');
            }

            // Salvar o arquivo Excel
            const nomeArquivo = `simulacao-split-payment-${window.ultimaSimulacao.dados.empresa.replace(/\s+/g, '-')}.xlsx`;
            XLSX.writeFile(wb, nomeArquivo);
            console.log('Excel exportado com sucesso:', nomeArquivo);
        } catch (error) {
            console.error('Erro ao exportar para Excel:', error);
            alert('Erro ao exportar para Excel. Verifique o console para mais detalhes.');
        }
    },

    /**
     * Exporta a memória de cálculo para um arquivo de texto
     */
    exportarMemoriaCalculo: function() {
        console.log('Iniciando exportação da memória de cálculo');
        
        if (!window.memoriaCalculoSimulacao) {
            alert('Realize uma simulação antes de exportar a memória de cálculo');
            return;
        }

        try {
            // Obter o ano selecionado no dropdown
            const selectAno = document.getElementById('select-ano-memoria');
            const anoSelecionado = selectAno ? selectAno.value : Object.keys(window.memoriaCalculoSimulacao)[0];
            
            if (!anoSelecionado || !window.memoriaCalculoSimulacao[anoSelecionado]) {
                alert('Não há memória de cálculo disponível para exportação');
                return;
            }
            
            // Obter o conteúdo da memória
            const conteudo = window.memoriaCalculoSimulacao[anoSelecionado];
            
            // Criar um blob com o conteúdo
            const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
            
            // Criar um elemento de link para download
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            
            // Nome do arquivo
            let nomeEmpresa = 'empresa';
            if (window.ultimaSimulacao && window.ultimaSimulacao.dados && window.ultimaSimulacao.dados.empresa) {
                nomeEmpresa = window.ultimaSimulacao.dados.empresa.replace(/\s+/g, '-');
            }
            
            link.download = `memoria-calculo-${nomeEmpresa}-${anoSelecionado}.txt`;
            
            // Adicionar à página, clicar e remover
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('Memória de cálculo exportada com sucesso');
        } catch (error) {
            console.error('Erro ao exportar memória de cálculo:', error);
            alert('Erro ao exportar memória de cálculo. Verifique o console para mais detalhes.');
        }
    },
    
    /**
 * Exporta os resultados das estratégias de mitigação para PDF
 */
exportarEstrategiasParaPDF: function() {
    console.log('Iniciando exportação das estratégias para PDF');
    
    if (!window.resultadosEstrategias) {
        alert('Realize uma simulação de estratégias antes de exportar');
        return;
    }

    try {
        // Inicializar jsPDF
        if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF !== 'function') {
            console.error('Biblioteca jsPDF não encontrada');
            alert('Erro ao exportar: Biblioteca jsPDF não carregada');
            return;
        }

        const doc = new jspdf.jsPDF();

        // Configurações de texto
        doc.setFont('helvetica');
        doc.setFontSize(16);

        // Título
        doc.text('Estratégias de Mitigação do Impacto do Split Payment', 15, 20);

        // Informações da empresa
        doc.setFontSize(12);
        doc.text(`Empresa: ${window.ultimaSimulacao.dados.empresa}`, 15, 30);
        
        // Obter nome do setor
        let nomeSetor = 'Não especificado';
        const selectSetor = document.getElementById('setor');
        if (selectSetor && selectSetor.selectedIndex > 0) {
            nomeSetor = selectSetor.options[selectSetor.selectedIndex].text;
        }
        
        doc.text(`Setor: ${nomeSetor}`, 15, 38);
        doc.text(`Data da Análise: ${new Date().toLocaleDateString('pt-BR')}`, 15, 46);

        // Linha separadora
        doc.line(15, 52, 195, 52);

        // Impacto Original
        doc.setFontSize(14);
        doc.text('Impacto Original do Split Payment', 15, 60);

        doc.setFontSize(12);
        const impacto = window.resultadosEstrategias.impactoBase;
        const formatMoeda = (val) => `R$ ${val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        const formatPerc = (val) => `${(val * 100).toFixed(2)}%`;

        doc.text(`Diferença no Capital de Giro: ${formatMoeda(impacto.diferencaCapitalGiro)}`, 15, 70);
        doc.text(`Impacto Percentual: ${formatPerc(impacto.percentualImpacto/100)}`, 15, 78);
        doc.text(`Necessidade Adicional: ${formatMoeda(impacto.necessidadeAdicionalCapitalGiro)}`, 15, 86);
        doc.text(`Impacto na Margem: ${formatPerc(impacto.impactoMargem/100)}`, 15, 94);
        
        // Linha separadora
        doc.line(15, 100, 195, 100);

        // Estratégias Utilizadas
        doc.setFontSize(14);
        doc.text('Estratégias de Mitigação Utilizadas', 15, 110);
        doc.setFontSize(12);

        let posY = 120;
        const resultadosEstrategias = window.resultadosEstrategias.resultadosEstrategias;

        // Função para obter nome traduzido da estratégia
        const traduzirNomeEstrategia = (codigo) => {
            const nomes = {
                ajustePrecos: "Ajuste de Preços",
                renegociacaoPrazos: "Renegociação de Prazos",
                antecipacaoRecebiveis: "Antecipação de Recebíveis",
                capitalGiro: "Capital de Giro",
                mixProdutos: "Mix de Produtos",
                meiosPagamento: "Meios de Pagamento"
            };
            return nomes[codigo] || codigo;
        };

        // Listar cada estratégia ativa
        Object.entries(resultadosEstrategias).forEach(([codigo, dados]) => {
            if (!dados) return;
            
            doc.text(`• ${traduzirNomeEstrategia(codigo)}:`, 20, posY);
            posY += 8;
            
            doc.text(`  - Efetividade: ${formatPerc(dados.efetividadePercentual/100)}`, 25, posY);
            posY += 8;
            
            let impacto = 0;
            let custo = 0;
            
            // Extrair dados específicos de cada estratégia
            switch (codigo) {
                case 'ajustePrecos':
                    impacto = dados.fluxoCaixaAdicional || 0;
                    custo = dados.custoEstrategia || 0;
                    break;
                case 'renegociacaoPrazos':
                    impacto = dados.impactoFluxoCaixa || 0;
                    custo = dados.custoTotal || 0;
                    break;
                case 'antecipacaoRecebiveis':
                    impacto = dados.impactoFluxoCaixa || 0;
                    custo = dados.custoTotalAntecipacao || 0;
                    break;
                case 'capitalGiro':
                    impacto = dados.valorFinanciamento || 0;
                    custo = dados.custoTotalFinanciamento || 0;
                    break;
                case 'mixProdutos':
                    impacto = dados.impactoFluxoCaixa || 0;
                    custo = dados.custoImplementacao || 0;
                    break;
                case 'meiosPagamento':
                    impacto = dados.impactoLiquido || 0;
                    custo = dados.custoTotalIncentivo || 0;
                    break;
            }
            
            doc.text(`  - Impacto Positivo: ${formatMoeda(impacto)}`, 25, posY);
            posY += 8;
            doc.text(`  - Custo da Estratégia: ${formatMoeda(custo)}`, 25, posY);
            posY += 12;
            
            // Verificar se é necessário adicionar nova página
            if (posY > 250) {
                doc.addPage();
                posY = 20;
            }
        });
        
        // Verificar se estamos em uma nova página
        if (posY < 30) posY = 30;
        
        // Linha separadora
        doc.line(15, posY, 195, posY);
        posY += 10;
        
        // Resultados Combinados
        doc.setFontSize(14);
        doc.text('Resultados Combinados das Estratégias', 15, posY);
        posY += 10;
        doc.setFontSize(12);
        
        const combinado = window.resultadosEstrategias.efeitividadeCombinada;
        
        doc.text(`Efetividade Total: ${formatPerc(combinado.efetividadePercentual/100)}`, 15, posY);
        posY += 8;
        doc.text(`Mitigação Total: ${formatMoeda(combinado.mitigacaoTotal)}`, 15, posY);
        posY += 8;
        doc.text(`Custo Total das Estratégias: ${formatMoeda(combinado.custoTotal)}`, 15, posY);
        posY += 8;
        doc.text(`Relação Custo-Benefício: ${combinado.custoBeneficio.toFixed(2)}`, 15, posY);
        posY += 15;
        
        // Estratégia Ótima
        const otima = window.resultadosEstrategias.combinacaoOtima;
        
        doc.text('Combinação Ótima de Estratégias:', 15, posY);
        posY += 8;
        doc.text(`${otima.nomeEstrategias.join(', ')}`, 20, posY);
        posY += 8;
        doc.text(`Efetividade: ${formatPerc(otima.efetividadePercentual/100)}`, 20, posY);
        posY += 8;
        doc.text(`Custo Total: ${formatMoeda(otima.custoTotal)}`, 20, posY);

        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text('© 2025 Expertzy Inteligência Tributária', 15, 285);
            doc.text(`Página ${i} de ${pageCount}`, 180, 285);
        }

        // Salvar o PDF
        const nomeArquivo = `estrategias-mitigacao-${window.ultimaSimulacao.dados.empresa.replace(/\s+/g, '-')}.pdf`;
        doc.save(nomeArquivo);
        console.log('PDF de estratégias exportado com sucesso:', nomeArquivo);
    } catch (error) {
        console.error('Erro ao exportar estratégias para PDF:', error);
        alert('Erro ao exportar para PDF. Verifique o console para mais detalhes.');
    }
},

/**
 * Exporta os resultados das estratégias de mitigação para Excel
 */
exportarEstrategiasParaExcel: function() {
    console.log('Iniciando exportação das estratégias para Excel');
    
    if (!window.resultadosEstrategias) {
        alert('Realize uma simulação de estratégias antes de exportar');
        return;
    }

    try {
        // Verificar se a biblioteca está disponível
        if (typeof XLSX === 'undefined') {
            console.error('Biblioteca XLSX não encontrada');
            alert('Erro ao exportar: Biblioteca XLSX não carregada');
            return;
        }

        // Criar uma nova pasta de trabalho
        const wb = XLSX.utils.book_new();

        // Função auxiliar para formatação
        const formatMoeda = (val) => val.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        const formatPerc = (val) => (val * 100).toFixed(2) + '%';

        // Obter nome do setor
        let nomeSetor = 'Não especificado';
        const selectSetor = document.getElementById('setor');
        if (selectSetor && selectSetor.selectedIndex > 0) {
            nomeSetor = selectSetor.options[selectSetor.selectedIndex].text;
        }

        // Dados para a planilha de visão geral
        const dadosVisaoGeral = [
            ['Estratégias de Mitigação do Impacto do Split Payment'],
            [''],
            ['Dados da Empresa'],
            ['Empresa', window.ultimaSimulacao.dados.empresa],
            ['Setor', nomeSetor],
            ['Data da Análise', new Date().toLocaleDateString('pt-BR')],
            [''],
            ['Impacto Original do Split Payment'],
            ['Diferença no Capital de Giro', formatMoeda(window.resultadosEstrategias.impactoBase.diferencaCapitalGiro)],
            ['Impacto Percentual', formatPerc(window.resultadosEstrategias.impactoBase.percentualImpacto/100)],
            ['Necessidade Adicional', formatMoeda(window.resultadosEstrategias.impactoBase.necessidadeAdicionalCapitalGiro)],
            ['Impacto na Margem', formatPerc(window.resultadosEstrategias.impactoBase.impactoMargem/100)],
            [''],
            ['Resultados Combinados das Estratégias'],
            ['Efetividade Total', formatPerc(window.resultadosEstrategias.efeitividadeCombinada.efetividadePercentual/100)],
            ['Mitigação Total', formatMoeda(window.resultadosEstrategias.efeitividadeCombinada.mitigacaoTotal)],
            ['Custo Total', formatMoeda(window.resultadosEstrategias.efeitividadeCombinada.custoTotal)],
            ['Relação Custo-Benefício', window.resultadosEstrategias.efeitividadeCombinada.custoBeneficio.toFixed(2)]
        ];

        // Adicionar informações sobre a combinação ótima
        const otima = window.resultadosEstrategias.combinacaoOtima;
        dadosVisaoGeral.push(['']);
        dadosVisaoGeral.push(['Combinação Ótima de Estratégias']);
        dadosVisaoGeral.push(['Estratégias Recomendadas', otima.nomeEstrategias.join(', ')]);
        dadosVisaoGeral.push(['Efetividade', formatPerc(otima.efetividadePercentual/100)]);
        dadosVisaoGeral.push(['Custo Total', formatMoeda(otima.custoTotal)]);

        // Função para obter nome traduzido da estratégia
        const traduzirNomeEstrategia = (codigo) => {
            const nomes = {
                ajustePrecos: "Ajuste de Preços",
                renegociacaoPrazos: "Renegociação de Prazos",
                antecipacaoRecebiveis: "Antecipação de Recebíveis",
                capitalGiro: "Capital de Giro",
                mixProdutos: "Mix de Produtos",
                meiosPagamento: "Meios de Pagamento"
            };
            return nomes[codigo] || codigo;
        };

        // Criar planilha de visão geral
        const wsVisaoGeral = XLSX.utils.aoa_to_sheet(dadosVisaoGeral);
        XLSX.utils.book_append_sheet(wb, wsVisaoGeral, 'Visão Geral');

        // Criar planilha com detalhes de cada estratégia
        const estrategiasAtivas = Object.entries(window.resultadosEstrategias.resultadosEstrategias)
            .filter(([_, dados]) => dados !== null);

        if (estrategiasAtivas.length > 0) {
            const dadosDetalhes = [
                ['Detalhamento das Estratégias de Mitigação'],
                [''],
                ['Estratégia', 'Efetividade', 'Impacto Positivo', 'Custo da Estratégia', 'Relação Custo-Benefício']
            ];

            estrategiasAtivas.forEach(([codigo, dados]) => {
                if (!dados) return;
                
                // Extrair impacto e custo específicos de cada estratégia
                let impacto = 0;
                let custo = 0;
                
                switch (codigo) {
                    case 'ajustePrecos':
                        impacto = dados.fluxoCaixaAdicional || 0;
                        custo = dados.custoEstrategia || 0;
                        break;
                    case 'renegociacaoPrazos':
                        impacto = dados.impactoFluxoCaixa || 0;
                        custo = dados.custoTotal || 0;
                        break;
                    case 'antecipacaoRecebiveis':
                        impacto = dados.impactoFluxoCaixa || 0;
                        custo = dados.custoTotalAntecipacao || 0;
                        break;
                    case 'capitalGiro':
                        impacto = dados.valorFinanciamento || 0;
                        custo = dados.custoTotalFinanciamento || 0;
                        break;
                    case 'mixProdutos':
                        impacto = dados.impactoFluxoCaixa || 0;
                        custo = dados.custoImplementacao || 0;
                        break;
                    case 'meiosPagamento':
                        impacto = dados.impactoLiquido || 0;
                        custo = dados.custoTotalIncentivo || 0;
                        break;
                }
                
                const custoBeneficio = (custo > 0 && impacto > 0) ? (custo / impacto).toFixed(2) : 'N/A';
                
                dadosDetalhes.push([
                    traduzirNomeEstrategia(codigo),
                    formatPerc(dados.efetividadePercentual/100),
                    impacto,
                    custo,
                    custoBeneficio
                ]);
            });

            const wsDetalhes = XLSX.utils.aoa_to_sheet(dadosDetalhes);
            XLSX.utils.book_append_sheet(wb, wsDetalhes, 'Detalhes das Estratégias');
        }

        // Criar planilha para cada estratégia ativa
        estrategiasAtivas.forEach(([codigo, dados]) => {
            if (!dados) return;
            
            const nomeEstrategia = traduzirNomeEstrategia(codigo);
            const dadosEstrategia = [
                [`Detalhamento da Estratégia: ${nomeEstrategia}`],
                ['']
            ];
            
            // Adicionar dados específicos de cada estratégia
            switch (codigo) {
                case 'ajustePrecos':
                    dadosEstrategia.push(['Percentual de Aumento', `${dados.percentualAumento}%`]);
                    dadosEstrategia.push(['Elasticidade-Preço', dados.elasticidade]);
                    dadosEstrategia.push(['Impacto nas Vendas', `${dados.impactoVendas}%`]);
                    dadosEstrategia.push(['Período de Ajuste', `${dados.periodoAjuste} meses`]);
                    dadosEstrategia.push(['Fluxo de Caixa Adicional', formatMoeda(dados.fluxoCaixaAdicional)]);
                    dadosEstrategia.push(['Custo da Estratégia', formatMoeda(dados.custoEstrategia)]);
                    break;
                    
                case 'renegociacaoPrazos':
                    dadosEstrategia.push(['Aumento do Prazo', `${dados.aumentoPrazo} dias`]);
                    dadosEstrategia.push(['Percentual de Fornecedores', `${dados.percentualFornecedores}%`]);
                    dadosEstrategia.push(['Contrapartidas', dados.contrapartidas]);
                    dadosEstrategia.push(['Custo da Contrapartida', `${dados.custoContrapartida}%`]);
                    dadosEstrategia.push(['Impacto no Fluxo de Caixa', formatMoeda(dados.impactoFluxoCaixa)]);
                    dadosEstrategia.push(['Custo Total', formatMoeda(dados.custoTotal)]);
                    break;
                    
                case 'antecipacaoRecebiveis':
                    dadosEstrategia.push(['Percentual de Antecipação', `${dados.percentualAntecipacao}%`]);
                    dadosEstrategia.push(['Taxa de Desconto', `${(dados.taxaDesconto * 100).toFixed(2)}% a.m.`]);
                    dadosEstrategia.push(['Prazo Médio Antecipado', `${dados.prazoAntecipacao} dias`]);
                    dadosEstrategia.push(['Impacto no Fluxo de Caixa', formatMoeda(dados.impactoFluxoCaixa)]);
                    dadosEstrategia.push(['Custo Total da Antecipação', formatMoeda(dados.custoTotalAntecipacao)]);
                    break;
                    
                case 'capitalGiro':
                    dadosEstrategia.push(['Valor de Captação', `${dados.valorCaptacao}%`]);
                    dadosEstrategia.push(['Taxa de Juros', `${(dados.taxaJuros * 100).toFixed(2)}% a.m.`]);
                    dadosEstrategia.push(['Prazo de Pagamento', `${dados.prazoPagamento} meses`]);
                    dadosEstrategia.push(['Carência', `${dados.carencia} meses`]);
                    dadosEstrategia.push(['Valor Financiado', formatMoeda(dados.valorFinanciamento)]);
                    dadosEstrategia.push(['Custo Total do Financiamento', formatMoeda(dados.custoTotalFinanciamento)]);
                    break;
                    
                case 'mixProdutos':
                    dadosEstrategia.push(['Percentual de Ajuste', `${dados.percentualAjuste}%`]);
                    dadosEstrategia.push(['Foco do Ajuste', dados.focoAjuste]);
                    dadosEstrategia.push(['Impacto na Receita', `${dados.impactoReceita}%`]);
                    dadosEstrategia.push(['Impacto na Margem', `${dados.impactoMargem} p.p.`]);
                    dadosEstrategia.push(['Impacto no Fluxo de Caixa', formatMoeda(dados.impactoFluxoCaixa)]);
                    dadosEstrategia.push(['Custo de Implementação', formatMoeda(dados.custoImplementacao)]);
                    break;
                    
                case 'meiosPagamento':
                    dadosEstrategia.push(['Distribuição Atual', `À Vista: ${dados.distribuicaoAtual.vista}%, A Prazo: ${dados.distribuicaoAtual.prazo}%`]);
                    dadosEstrategia.push(['Nova Distribuição', `À Vista: ${dados.distribuicaoNova.vista}%, 30 dias: ${dados.distribuicaoNova.dias30}%, 60 dias: ${dados.distribuicaoNova.dias60}%, 90 dias: ${dados.distribuicaoNova.dias90}%`]);
                    dadosEstrategia.push(['Taxa de Incentivo', `${dados.taxaIncentivo}%`]);
                    dadosEstrategia.push(['Impacto Líquido', formatMoeda(dados.impactoLiquido)]);
                    dadosEstrategia.push(['Custo Total do Incentivo', formatMoeda(dados.custoTotalIncentivo)]);
                    break;
            }
            
            // Adicionar planilha para a estratégia
            const wsEstrategia = XLSX.utils.aoa_to_sheet(dadosEstrategia);
            XLSX.utils.book_append_sheet(wb, wsEstrategia, nomeEstrategia);
        });

        // Salvar o arquivo Excel
        const nomeArquivo = `estrategias-mitigacao-${window.ultimaSimulacao.dados.empresa.replace(/\s+/g, '-')}.xlsx`;
        XLSX.writeFile(wb, nomeArquivo);
        console.log('Excel de estratégias exportado com sucesso:', nomeArquivo);
    } catch (error) {
        console.error('Erro ao exportar estratégias para Excel:', error);
        alert('Erro ao exportar para Excel. Verifique o console para mais detalhes.');
    }
}
};