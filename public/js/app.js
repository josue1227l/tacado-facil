const formCategoria = document.getElementById('formCategoria');
const formProduto = document.getElementById('formProduto');

const listaCategorias = document.getElementById('listaCategorias');
const listaProdutos = document.getElementById('listaProdutos');
const listaPedidos = document.getElementById('listaPedidos');

const selectCategoria = document.getElementById('produtoCategoria');

const mensagem = document.getElementById('mensagem');
const mensagemPedidos = document.getElementById('mensagemPedidos');
const btnAtualizarPedidos = document.getElementById('btnAtualizarPedidos');

let categorias = [];
let produtos = [];

const statusPedidos = [
    'PENDENTE',
    'CONFIRMADO',
    'SEPARANDO',
    'ENVIADO',
    'CONCLUIDO',
    'CANCELADO'
];

async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            'Content-Type': 'application/json',
            ...opcoes.headers
        }
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(dados.erro || 'Ocorreu um erro na operação.');
    }

    return dados;
}

function mostrarMensagem(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.classList.toggle('erro', erro);
    mensagem.hidden = false;

    window.clearTimeout(mostrarMensagem.timer);

    mostrarMensagem.timer = window.setTimeout(() => {
        mensagem.hidden = true;
    }, 4000);
}

function mostrarMensagemPedido(texto, erro = false) {
    mensagemPedidos.textContent = texto;
    mensagemPedidos.classList.toggle('erro', erro);
    mensagemPedidos.hidden = false;

    window.clearTimeout(mostrarMensagemPedido.timer);

    mostrarMensagemPedido.timer = window.setTimeout(() => {
        mensagemPedidos.hidden = true;
    }, 5000);
}

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatarData(data) {
    if (!data) return '-';

    return new Date(data).toLocaleString('pt-BR');
}

function traduzirStatus(status) {
    const nomes = {
        PENDENTE: 'Pendente',
        CONFIRMADO: 'Confirmado',
        SEPARANDO: 'Separando',
        ENVIADO: 'Enviado',
        CONCLUIDO: 'Concluído',
        CANCELADO: 'Cancelado'
    };

    return nomes[status] || status;
}

// ==================== CATEGORIAS ====================

async function carregarCategorias() {
    categorias = await requisicao('/api/categorias');

    listaCategorias.replaceChildren();
    selectCategoria.replaceChildren();

    const opcaoInicial = document.createElement('option');
    opcaoInicial.value = '';
    opcaoInicial.textContent = 'Selecione uma categoria';
    selectCategoria.appendChild(opcaoInicial);

    categorias.forEach(categoria => {
        const opcao = document.createElement('option');
        opcao.value = categoria.id;
        opcao.textContent = categoria.nome;
        selectCategoria.appendChild(opcao);

        const linha = document.createElement('tr');

        adicionarCelula(linha, categoria.nome);
        adicionarCelula(linha, categoria.descricao || '-');

        const celulaAcoes = document.createElement('td');

        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.className = 'editar';
        btnEditar.addEventListener('click', () => editarCategoria(categoria));

        const btnExcluir = document.createElement('button');
        btnExcluir.textContent = 'Excluir';
        btnExcluir.className = 'excluir';
        btnExcluir.addEventListener('click', () => excluirCategoria(categoria));

        celulaAcoes.append(btnEditar, btnExcluir);
        linha.appendChild(celulaAcoes);
        listaCategorias.appendChild(linha);
    });

    if (categorias.length === 0) {
        adicionarLinhaVazia(listaCategorias, 3, 'Nenhuma categoria cadastrada.');
    }
}

formCategoria.addEventListener('submit', async evento => {
    evento.preventDefault();

    const id = document.getElementById('categoriaId').value;

    const dados = {
        nome: document.getElementById('categoriaNome').value.trim(),
        descricao: document.getElementById('categoriaDescricao').value.trim()
    };

    try {
        await requisicao(
            id ? `/api/categorias/${id}` : '/api/categorias',
            {
                method: id ? 'PUT' : 'POST',
                body: JSON.stringify(dados)
            }
        );

        formCategoria.reset();
        document.getElementById('categoriaId').value = '';
        document.getElementById('btnSalvarCategoria').textContent =
            'Cadastrar categoria';
        document.getElementById('btnCancelarCategoria').hidden = true;

        await carregarCategorias();

        mostrarMensagem(id ? 'Categoria atualizada!' : 'Categoria cadastrada!');
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
});

function editarCategoria(categoria) {
    document.getElementById('categoriaId').value = categoria.id;
    document.getElementById('categoriaNome').value = categoria.nome;
    document.getElementById('categoriaDescricao').value =
        categoria.descricao || '';

    document.getElementById('btnSalvarCategoria').textContent =
        'Salvar alterações';
    document.getElementById('btnCancelarCategoria').hidden = false;

    formCategoria.scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('btnCancelarCategoria').addEventListener('click', () => {
    formCategoria.reset();
    document.getElementById('categoriaId').value = '';

    document.getElementById('btnSalvarCategoria').textContent =
        'Cadastrar categoria';
    document.getElementById('btnCancelarCategoria').hidden = true;
});

async function excluirCategoria(categoria) {
    if (!confirm(`Deseja excluir a categoria "${categoria.nome}"?`)) {
        return;
    }

    try {
        await requisicao(`/api/categorias/${categoria.id}`, {
            method: 'DELETE'
        });

        await carregarCategorias();
        mostrarMensagem('Categoria excluída!');
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}


// ==================== PRODUTOS ====================

async function carregarProdutos() {
    produtos = await requisicao('/api/produtos');

    listaProdutos.replaceChildren();

    produtos.forEach(produto => {
        const linha = document.createElement('tr');

        adicionarCelula(linha, produto.nome);
        adicionarCelula(linha, produto.codigo);
        adicionarCelula(linha, produto.categoria?.nome || '-');
        adicionarCelula(linha, formatarPreco(produto.preco));
        adicionarCelula(linha, `${produto.estoque} ${produto.unidade}`);
        adicionarCelula(linha, produto.ativo ? 'Ativo' : 'Inativo');

        const celulaAcoes = document.createElement('td');

        const btnEditar = document.createElement('button');
        btnEditar.type = 'button';
        btnEditar.textContent = 'Editar';
        btnEditar.className = 'editar';
        btnEditar.addEventListener('click', () => editarProduto(produto));

        const btnExcluir = document.createElement('button');
        btnExcluir.type = 'button';
        btnExcluir.textContent = 'Excluir';
        btnExcluir.className = 'excluir';
        btnExcluir.addEventListener('click', () => excluirProduto(produto));

        const btnSituacao = document.createElement('button');
        btnSituacao.type = 'button';
        btnSituacao.textContent = produto.ativo ? 'Desativar' : 'Ativar';
        btnSituacao.className = produto.ativo ? 'excluir' : 'editar';
        btnSituacao.style.marginLeft = '5px';
        btnSituacao.addEventListener('click', () => {
            alterarSituacaoProduto(produto);
        });

        celulaAcoes.append(btnEditar, btnExcluir, btnSituacao);
        linha.appendChild(celulaAcoes);
        listaProdutos.appendChild(linha);
    });

    if (produtos.length === 0) {
        adicionarLinhaVazia(listaProdutos, 7, 'Nenhum produto cadastrado.');
    }
}

// Cadastrar ou atualizar produto
formProduto.addEventListener('submit', async evento => {
    evento.preventDefault();

    const id = document.getElementById('produtoId').value;

    const dados = {
        nome: document.getElementById('produtoNome').value.trim(),
        codigo: document.getElementById('produtoCodigo').value.trim(),
        descricao: document.getElementById('produtoDescricao').value.trim(),
        preco: Number(document.getElementById('produtoPreco').value),
        estoque: Number(document.getElementById('produtoEstoque').value),
        estoqueMinimo: Number(
            document.getElementById('produtoEstoqueMinimo').value
        ),
        unidade: document.getElementById('produtoUnidade').value,
        categoriaId: Number(selectCategoria.value)
    };

    if (!dados.categoriaId) {
        mostrarMensagem('Selecione uma categoria.', true);
        return;
    }

    if (
        !Number.isFinite(dados.preco) ||
        dados.preco <= 0 ||
        !Number.isInteger(dados.estoque) ||
        dados.estoque < 0 ||
        !Number.isInteger(dados.estoqueMinimo) ||
        dados.estoqueMinimo < 0
    ) {
        mostrarMensagem('Confira o preço e as quantidades informadas.', true);
        return;
    }

    try {
        await requisicao(
            id ? `/api/produtos/${id}` : '/api/produtos',
            {
                method: id ? 'PUT' : 'POST',
                body: JSON.stringify(dados)
            }
        );

        formProduto.reset();
        document.getElementById('produtoId').value = '';
        document.getElementById('produtoEstoque').value = '0';
        document.getElementById('produtoEstoqueMinimo').value = '5';

        document.getElementById('btnSalvarProduto').textContent =
            'Cadastrar produto';
        document.getElementById('btnCancelarProduto').hidden = true;

        await carregarProdutos();

        mostrarMensagem(id ? 'Produto atualizado!' : 'Produto cadastrado!');
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
});

// Preencher formulário para editar
function editarProduto(produto) {
    document.getElementById('produtoId').value = produto.id;
    document.getElementById('produtoNome').value = produto.nome;
    document.getElementById('produtoCodigo').value = produto.codigo;
    document.getElementById('produtoDescricao').value = produto.descricao || '';
    document.getElementById('produtoPreco').value = produto.preco;
    document.getElementById('produtoEstoque').value = produto.estoque;
    document.getElementById('produtoEstoqueMinimo').value =
        produto.estoqueMinimo;
    document.getElementById('produtoUnidade').value = produto.unidade;
    selectCategoria.value = String(produto.categoriaId);

    document.getElementById('btnSalvarProduto').textContent =
        'Salvar alterações';
    document.getElementById('btnCancelarProduto').hidden = false;

    formProduto.scrollIntoView({ behavior: 'smooth' });
}

// Cancelar edição
document.getElementById('btnCancelarProduto').addEventListener('click', () => {
    formProduto.reset();
    document.getElementById('produtoId').value = '';
    document.getElementById('produtoEstoque').value = '0';
    document.getElementById('produtoEstoqueMinimo').value = '5';

    document.getElementById('btnSalvarProduto').textContent =
        'Cadastrar produto';
    document.getElementById('btnCancelarProduto').hidden = true;
});

// Excluir produto
async function excluirProduto(produto) {
    if (!confirm(`Deseja excluir o produto "${produto.nome}"?`)) {
        return;
    }

    try {
        const resposta = await requisicao(`/api/produtos/${produto.id}`, {
            method: 'DELETE'
        });

        await carregarProdutos();
        mostrarMensagem(resposta.mensagem || 'Produto excluído!');
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

// Ativar ou desativar produto
async function alterarSituacaoProduto(produto) {
    const novaSituacao = !produto.ativo;
    const acao = novaSituacao ? 'ativar' : 'desativar';

    if (!confirm(`Deseja ${acao} o produto "${produto.nome}"?`)) {
        return;
    }

    try {
        const resposta = await requisicao(
            `/api/produtos/${produto.id}/ativo`,
            {
                method: 'PATCH',
                body: JSON.stringify({
                    ativo: novaSituacao
                })
            }
        );

        await carregarProdutos();
        mostrarMensagem(resposta.mensagem);
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}


// ==================== PEDIDOS ====================

async function carregarPedidos() {
    listaPedidos.replaceChildren();

    try {
        const pedidos = await requisicao('/api/pedidos');

        if (!Array.isArray(pedidos) || pedidos.length === 0) {
            adicionarLinhaVazia(listaPedidos, 7, 'Nenhum pedido realizado ainda.');
            return;
        }

        pedidos.forEach(pedido => {
            const linha = document.createElement('tr');

            adicionarCelula(linha, `#${pedido.id}`);
            adicionarCelula(linha, pedido.usuario?.nome || 'Cliente');
            adicionarCelula(linha, formatarData(pedido.criadoEm));

            const celulaItens = document.createElement('td');
            const listaItens = document.createElement('ul');

            (pedido.itens || []).forEach(item => {
                const itemLista = document.createElement('li');
                const nomeProduto = item.produto?.nome || 'Produto';
                itemLista.textContent =
                    `${nomeProduto} — ${item.quantidade} x ${formatarPreco(item.precoUnitario)}`;
                listaItens.appendChild(itemLista);
            });

            if (!pedido.itens || pedido.itens.length === 0) {
                listaItens.textContent = 'Sem itens';
            }

            celulaItens.appendChild(listaItens);
            linha.appendChild(celulaItens);

            adicionarCelula(linha, formatarPreco(pedido.total));
            adicionarCelula(linha, traduzirStatus(pedido.status));

            const celulaAcoes = document.createElement('td');
            const seletorStatus = document.createElement('select');

            statusPedidos.forEach(status => {
                const opcao = document.createElement('option');
                opcao.value = status;
                opcao.textContent = traduzirStatus(status);
                seletorStatus.appendChild(opcao);
            });

            seletorStatus.value = pedido.status;

            const btnSalvarStatus = document.createElement('button');
            btnSalvarStatus.textContent = 'Salvar status';
            btnSalvarStatus.className = 'editar';

            btnSalvarStatus.addEventListener('click', async () => {
                const novoStatus = seletorStatus.value;

                if (novoStatus === pedido.status) {
                    mostrarMensagemPedido(
                        `O pedido #${pedido.id} já está com esse status.`
                    );
                    return;
                }

                const confirmacao = confirm(
                    `Deseja alterar o pedido #${pedido.id} para "${traduzirStatus(novoStatus)}"?`
                );

                if (!confirmacao) {
                    seletorStatus.value = pedido.status;
                    return;
                }

                btnSalvarStatus.disabled = true;

                try {
                    await requisicao(`/api/pedidos/${pedido.id}/status`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: novoStatus })
                    });

                    mostrarMensagemPedido(
                        `Status do pedido #${pedido.id} atualizado!`
                    );

                    await carregarPedidos();
                    await carregarProdutos();
                } catch (erro) {
                    mostrarMensagemPedido(erro.message, true);
                    btnSalvarStatus.disabled = false;
                }
            });

            celulaAcoes.append(seletorStatus, btnSalvarStatus);
            linha.appendChild(celulaAcoes);

            listaPedidos.appendChild(linha);
        });
    } catch (erro) {
        adicionarLinhaVazia(listaPedidos, 7, 'Não foi possível carregar os pedidos.');
        mostrarMensagemPedido(erro.message, true);
    }
}

btnAtualizarPedidos.addEventListener('click', carregarPedidos);

// ==================== FUNÇÕES AUXILIARES ====================

function adicionarCelula(linha, texto) {
    const celula = document.createElement('td');
    celula.textContent = texto;
    linha.appendChild(celula);
}

function adicionarLinhaVazia(tabela, colunas, texto) {
    const linha = document.createElement('tr');
    const celula = document.createElement('td');

    celula.colSpan = colunas;
    celula.textContent = texto;

    linha.appendChild(celula);
    tabela.appendChild(linha);
}

// ==================== INICIALIZAÇÃO ====================

async function inicializar() {
    try {
        await carregarCategorias();
        await carregarProdutos();
        await carregarPedidos();
    } catch (erro) {
        mostrarMensagem(
            'Não foi possível carregar os dados. Verifique se o servidor está funcionando.',
            true
        );
    }
}

inicializar();


// Função pra sair do painel admin
document.getElementById('botaoSair').addEventListener('click', async () => {
    const confirmou = confirm('Deseja realmente sair da sua conta?');

    if (!confirmou) {
        return;
    }

    try {
        await requisicao('/api/auth/logout', {
            method: 'POST'
        });

        window.location.href = '/';
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
});
