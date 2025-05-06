// Adicione este código ao arquivo split-payment-simulator.html antes do fechamento da tag </body>
// ou adicione-o em um arquivo separado e importe-o

// Funções para manipulação do modal de cronograma setorial
function configurarCronogramaSetor(id) {
    // Obtém o nome do setor da linha da tabela
    const linha = document.getElementById(`setor-${id}`) || document.querySelector(`tr:nth-child(${id})`);
    if (!linha) return;
    
    const nomeSetor = linha.cells[0].textContent;
    
    // Atualiza o modal
    const modalSetorNome = document.getElementById('modal-setor-nome');
    const modalSetorId = document.getElementById('modal-setor-id');
    
    if (modalSetorNome) modalSetorNome.textContent = nomeSetor;
    if (modalSetorId) modalSetorId.value = id;
    
    // Preenche tabela do modal com cronograma padrão
    const tabelaCronograma = document.getElementById('cronograma-setor-table');
    if (tabelaCronograma) {
        const tbody = tabelaCronograma.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
            
            // Usa cronograma padrão
            const cronogramaPadrao = {
                2026: 10.0,
                2027: 25.0,
                2028: 40.0,
                2029: 55.0,
                2030: 70.0,
                2031: 85.0,
                2032: 95.0,
                2033: 100.0
            };
            
            for (let ano = 2026; ano <= 2033; ano++) {
                const linha = document.createElement('tr');
                linha.innerHTML = `
                    <td>${ano}</td>
                    <td><input type="number" name="modal-perc-${ano}" min="0" max="100" step="0.1" value="${cronogramaPadrao[ano]}"></td>
                    <td><input type="text" name="modal-obs-${ano}" placeholder="Observações..."></td>
                `;
                tbody.appendChild(linha);
            }
        }
    }
    
    // Exibe modal
    const modal = document.getElementById('modal-cronograma-setor');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Adicione este HTML para o modal ao final do seu arquivo, antes do fechamento de </body>
document.addEventListener('DOMContentLoaded', function() {
    // Verifica se o modal já existe
    if (!document.getElementById('modal-cronograma-setor')) {
        // Cria o modal se não existir
        const modalHTML = `
            <div class="modal" id="modal-cronograma-setor">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Cronograma Específico para Setor</h3>
                        <span class="close" id="btn-fechar-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 15px;">
                            <label for="modal-setor-nome" style="font-weight: bold;">Setor:</label>
                            <span id="modal-setor-nome"></span>
                            <input type="hidden" id="modal-setor-id">
                        </div>
                        
                        <div class="table-container">
                            <table class="editable-table cronograma-table" id="cronograma-setor-table">
                                <thead>
                                    <tr>
                                        <th>Ano</th>
                                        <th>Percentual (%)</th>
                                        <th>Observações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Será preenchido dinamicamente por JavaScript -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" id="btn-salvar-cronograma-setor">Salvar</button>
                        <button type="button" class="btn btn-secondary" id="btn-cancelar-modal">Cancelar</button>
                    </div>
                </div>
            </div>
        `;
        
        // Adiciona o modal ao body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // Adiciona os event listeners para o modal
    document.getElementById('btn-salvar-cronograma-setor')?.addEventListener('click', function() {
        const modal = document.getElementById('modal-cronograma-setor');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Aqui você pode adicionar lógica para salvar o cronograma
        const setorId = document.getElementById('modal-setor-id').value;
        const linha = document.getElementById(`setor-${setorId}`) || document.querySelector(`tr:nth-child(${setorId})`);
        if (linha) {
            const select = linha.querySelector('select[data-campo="cronograma"]');
            if (select) {
                select.value = 'proprio';
            }
        }
    });
    
    document.getElementById('btn-cancelar-modal')?.addEventListener('click', function() {
        const modal = document.getElementById('modal-cronograma-setor');
        if (modal) {
            modal.style.display = 'none';
        }
    });
    
    document.getElementById('btn-fechar-modal')?.addEventListener('click', function() {
        const modal = document.getElementById('modal-cronograma-setor');
        if (modal) {
            modal.style.display = 'none';
        }
    });
    
    // Fechar o modal quando clicar fora dele
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modal-cronograma-setor');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});