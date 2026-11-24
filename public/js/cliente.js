const catalogoProdutos = document.getElementById('catalogoProdutos');
const mensagemCatalogo = document.getElementById('mensagemCatalogo');
const mensagemPedidos = document.getElementById('mensagemPedidos');
const mensagemFinalizacao = document.getElementById('mensagemFinalizacao');

const listaPedidos = document.getElementById('listaPedidos');
const listaCarrinho = document.getElementById('listaCarrinho');

const totalCarrinho = document.getElementById('totalCarrinho');
const botaoSair = document.getElementById('botaoSair');
const formaPagamento = document.getElementById('formaPagamento');
const btnFinalizarPedido = document.getElementById('btnFinalizarPedido');

let produtosDisponiveis = [];
let carrinho = [];

function formatarPreco(preco) {
    return Number(preco).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatarData(data) {
    return new Date(data).toLocaleString('pt-BR');
}

function criarTexto(tag, texto, classe = '') {
    const elemento = document.createElement(tag);
    elemento.textContent = texto;

    if (classe) {
        elemento.className = classe;
    }

    return elemento;
}

function mostrarMensagem(elemento, texto, erro = false) {
    elemento.textContent = texto;
    elemento.style.color = erro ? '#dc2626' : '#15803d';
}

// Cria a imagem do produto ou mostra um espaço reservado
function criarImagemProduto(caminho, classe = 'produto-imagem') {
    if (!caminho) {
        return criarTexto('div', 'Imagem não cadastrada', 'imagem-indisponivel');
    }

    const imagem = document.createElement('img');

    imagem.src = caminho;
    imagem.alt = 'Imagem do produto';
    imagem.className = classe;
    imagem.loading = 'lazy';

    imagem.onerror = () => {
        const aviso = criarTexto(
            'div',
            'Imagem indisponível',
            classe === 'imagem-carrinho'
                ? 'imagem-indisponivel'
                : 'imagem-indisponivel'
        );

        imagem.replaceWith(aviso);
    };

    return imagem;
}

function traduzirStatus(status) {
    const nomes = {
        PENDENTE: 'Pendente',
        CONFIRMADO: 'Confirmado',
        SEPARANDO: 'Separando produtos',
        PREPARADO: 'Pedido preparado',
        ENVIADO: 'Saiu para entrega',
        CONCLUIDO: 'Concluído',
        CANCELADO: 'Cancelado'
    };

    return nomes[status] || status;
}

function traduzirFormaPagamento(forma) {
    const nomes = {
        PIX_SIMULADO: 'PIX (simulação)',
        DINHEIRO_ENTREGA: 'Dinheiro na entrega',
        CARTAO_ENTREGA: 'Cartão na entrega',
        NAO_INFORMADO: 'Não informado'
    };

    return nomes[forma] || forma;
}

function traduzirStatusPagamento(status) {
    const nomes = {
        PENDENTE: 'Pendente',
        AGUARDANDO_CONFIRMACAO: 'Aguardando confirmação',
        CONFIRMADO: 'Confirmado',
        RECUSADO: 'Recusado',
        CANCELADO: 'Cancelado'
    };

    return nomes[status] || status;
}

// ==================== CARREGAR CATÁLOGO ====================

async function carregarCatalogo() {
    try {
        const resposta = await fetch('/api/produtos');
        const produtos = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                produtos.erro || 'Não foi possível carregar os produtos.'
            );
        }

        produtosDisponiveis = produtos.filter(
            produto => produto.ativo && produto.estoque > 0
        );

        catalogoProdutos.replaceChildren();

        if (produtosDisponiveis.length === 0) {
            catalogoProdutos.appendChild(
                criarTexto('p', 'Nenhum produto disponível no momento.')
            );
            return;
        }

        produtosDisponiveis.forEach(produto => {
            const card = document.createElement('article');
            card.className = 'produto-card';

            // IMAGEM CADASTRADA PELO GERENTE
            card.appendChild(
                criarImagemProduto(produto.imagem)
            );

            card.appendChild(criarTexto('h3', produto.nome));

            if (produto.descricao) {
                card.appendChild(
                    criarTexto('p', produto.descricao, 'produto-info')
                );
            }

            card.appendChild(
                criarTexto(
                    'p',
                    `Categoria: ${produto.categoria?.nome || 'Sem categoria'}`,
                    'produto-info'
                )
            );

            card.appendChild(
                criarTexto('p', `Código: ${produto.codigo}`, 'produto-info')
            );

            card.appendChild(
                criarTexto('p', formatarPreco(produto.preco), 'produto-preco')
            );

            card.appendChild(
                criarTexto(
                    'p',
                    `Estoque disponível: ${produto.estoque} ${produto.unidade}`,
                    'produto-info'
                )
            );

            const grupoQuantidade = document.createElement('div');
            grupoQuantidade.className = 'campo-quantidade';

            const label = document.createElement('label');
            label.textContent = 'Quantidade:';
            label.htmlFor = `quantidade-${produto.id}`;

            const input = document.createElement('input');
            input.type = 'number';
            input.id = `quantidade-${produto.id}`;
            input.min = '1';
            input.max = String(produto.estoque);
            input.step = '1';
            input.value = '1';

            grupoQuantidade.append(label, input);

            const botaoAdicionar = document.createElement('button');
            botaoAdicionar.type = 'button';
            botaoAdicionar.className = 'botao-comprar';
            botaoAdicionar.textContent = 'Adicionar ao carrinho';

            botaoAdicionar.addEventListener('click', () => {
                const quantidade = Number(input.value);

                if (!Number.isInteger(quantidade) || quantidade < 1) {
                    mostrarMensagem(
                        mensagemCatalogo,
                        'Informe uma quantidade válida.',
                        true
                    );
                    return;
                }

                adicionarAoCarrinho(produto, quantidade);
            });

            card.append(grupoQuantidade, botaoAdicionar);
            catalogoProdutos.appendChild(card);
        });

        renderizarCarrinho();

    } catch (erro) {
        console.error('Erro ao carregar catálogo:', erro);
        mostrarMensagem(mensagemCatalogo, erro.message, true);
        catalogoProdutos.replaceChildren();
    }
}

// ==================== CARRINHO ====================

function adicionarAoCarrinho(produto, quantidade) {
    const itemExistente = carrinho.find(
        item => item.produtoId === produto.id
    );

    const quantidadeAtual = itemExistente
        ? itemExistente.quantidade
        : 0;

    if (quantidadeAtual + quantidade > produto.estoque) {
        mostrarMensagem(
            mensagemCatalogo,
            `Estoque insuficiente. Disponível: ${produto.estoque}.`,
            true
        );
        return;
    }

    if (itemExistente) {
        itemExistente.quantidade += quantidade;
    } else {
        carrinho.push({
            produtoId: produto.id,
            nome: produto.nome,
            imagem: produto.imagem,
            preco: Number(produto.preco),
            quantidade,
            estoque: produto.estoque
        });
    }

    mostrarMensagem(
        mensagemCatalogo,
        `${produto.nome} adicionado ao carrinho!`
    );

    renderizarCarrinho();
}

function alterarQuantidade(produtoId, novaQuantidade) {
    const item = carrinho.find(
        produto => produto.produtoId === produtoId
    );

    if (!item) return;

    const quantidade = Number(novaQuantidade);

    if (
        !Number.isInteger(quantidade) ||
        quantidade < 1 ||
        quantidade > item.estoque
    ) {
        mostrarMensagem(
            mensagemFinalizacao,
            `Informe uma quantidade entre 1 e ${item.estoque}.`,
            true
        );

        renderizarCarrinho();
        return;
    }

    item.quantidade = quantidade;
    renderizarCarrinho();
}

function removerDoCarrinho(produtoId) {
    carrinho = carrinho.filter(
        item => item.produtoId !== produtoId
    );

    renderizarCarrinho();

    mostrarMensagem(
        mensagemFinalizacao,
        'Produto removido do carrinho.'
    );
}

function calcularTotal() {
    return carrinho.reduce(
        (total, item) => total + item.preco * item.quantidade,
        0
    );
}

function renderizarCarrinho() {
    listaCarrinho.replaceChildren();

    if (carrinho.length === 0) {
        listaCarrinho.appendChild(
            criarTexto('p', 'Seu carrinho está vazio.')
        );

        totalCarrinho.textContent = formatarPreco(0);
        btnFinalizarPedido.disabled = true;
        return;
    }

    carrinho.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item-carrinho';

        // IMAGEM DO PRODUTO NO CARRINHO
        div.appendChild(
            criarImagemProduto(item.imagem, 'imagem-carrinho')
        );

        const dados = document.createElement('div');
        dados.className = 'dados-carrinho';

        dados.appendChild(
            criarTexto('h3', item.nome)
        );

        dados.appendChild(
            criarTexto(
                'p',
                `Preço unitário: ${formatarPreco(item.preco)}`
            )
        );

        const campo = document.createElement('div');
        campo.className = 'campo-carrinho';

        const label = document.createElement('label');
        label.textContent = 'Quantidade:';

        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.max = String(item.estoque);
        input.step = '1';
        input.value = String(item.quantidade);

        input.addEventListener('change', () => {
            alterarQuantidade(item.produtoId, input.value);
        });

        campo.append(label, input);
        dados.appendChild(campo);

        dados.appendChild(
            criarTexto(
                'p',
                `Subtotal: ${formatarPreco(item.preco * item.quantidade)}`
            )
        );

        const botaoRemover = document.createElement('button');
        botaoRemover.type = 'button';
        botaoRemover.className = 'botao-remover';
        botaoRemover.textContent = 'Remover';

        botaoRemover.addEventListener('click', () => {
            removerDoCarrinho(item.produtoId);
        });

        dados.appendChild(botaoRemover);
        div.appendChild(dados);

        listaCarrinho.appendChild(div);
    });

    totalCarrinho.textContent = formatarPreco(calcularTotal());
    btnFinalizarPedido.disabled = false;
}

// ==================== FINALIZAR PEDIDO ====================

async function finalizarPedido() {
    if (carrinho.length === 0) {
        mostrarMensagem(
            mensagemFinalizacao,
            'Adicione produtos ao carrinho primeiro.',
            true
        );
        return;
    }

    const pagamentoSelecionado = formaPagamento.value;

    if (!pagamentoSelecionado) {
        mostrarMensagem(
            mensagemFinalizacao,
            'Escolha uma forma de pagamento para finalizar a compra.',
            true
        );

        formaPagamento.focus();
        return;
    }

    const confirmou = confirm(
        `Deseja finalizar seu pedido no valor de ${formatarPreco(calcularTotal())}?`
    );

    if (!confirmou) return;

    btnFinalizarPedido.disabled = true;
    btnFinalizarPedido.textContent = 'Finalizando pedido...';

    try {
        const resposta = await fetch('/api/pedidos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                formaPagamento: pagamentoSelecionado,
                itens: carrinho.map(item => ({
                    produtoId: item.produtoId,
                    quantidade: item.quantidade
                }))
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro || 'Não foi possível realizar o pedido.'
            );
        }

        const pedido = resultado.pedido;

        carrinho = [];
        formaPagamento.value = '';

        renderizarCarrinho();

        mostrarMensagem(
            mensagemFinalizacao,
            `Pedido #${pedido.id} realizado com sucesso! Total: ${formatarPreco(pedido.total)}. Pagamento: ${traduzirFormaPagamento(pedido.formaPagamento)}.`
        );

        await carregarCatalogo();
        await carregarPedidos();

    } catch (erro) {
        mostrarMensagem(mensagemFinalizacao, erro.message, true);

    } finally {
        btnFinalizarPedido.disabled = carrinho.length === 0;
        btnFinalizarPedido.textContent = 'Finalizar compra';
    }
}

btnFinalizarPedido.addEventListener('click', finalizarPedido);

// ==================== CARREGAR PEDIDOS ====================

async function carregarPedidos() {
    try {
        const resposta = await fetch('/api/pedidos');
        const pedidos = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                pedidos.erro || 'Não foi possível carregar seus pedidos.'
            );
        }

        listaPedidos.replaceChildren();

        if (pedidos.length === 0) {
            listaPedidos.appendChild(
                criarTexto('p', 'Você ainda não realizou nenhum pedido.')
            );
            return;
        }

        pedidos.forEach(pedido => {
            const card = document.createElement('article');
            card.className = 'pedido-card';

            card.appendChild(
                criarTexto('h3', `Pedido #${pedido.id}`)
            );

            card.appendChild(
                criarTexto('p', `Data: ${formatarData(pedido.criadoEm)}`)
            );

            card.appendChild(
                criarTexto('p', `Status: ${traduzirStatus(pedido.status)}`)
            );

            card.appendChild(
                criarTexto('p', `Total: ${formatarPreco(pedido.total)}`)
            );

            card.appendChild(
                criarTexto(
                    'p',
                    `Forma de pagamento: ${traduzirFormaPagamento(pedido.formaPagamento)}`
                )
            );

            card.appendChild(
                criarTexto(
                    'p',
                    `Status do pagamento: ${traduzirStatusPagamento(pedido.statusPagamento)}`,
                    'status-pagamento'
                )
            );

            card.appendChild(
                criarTexto('strong', 'Produtos do pedido')
            );

            const listaItens = document.createElement('ul');

            (pedido.itens || []).forEach(item => {
                const nomeProduto = item.produto?.nome || 'Produto indisponível';

                const texto =
                    `${nomeProduto} — ${item.quantidade} unidade(s) × ${formatarPreco(item.precoUnitario)}`;

                listaItens.appendChild(
                    criarTexto('li', texto)
                );
            });

            card.appendChild(listaItens);
            listaPedidos.appendChild(card);
        });

    } catch (erro) {
        console.error('Erro ao carregar pedidos:', erro);

        mostrarMensagem(mensagemPedidos, erro.message, true);
        listaPedidos.replaceChildren();
    }
}

// ==================== SAIR DA CONTA ====================

botaoSair.addEventListener('click', async () => {
    try {
        const resposta = await fetch('/api/auth/logout', {
            method: 'POST'
        });

        if (!resposta.ok) {
            throw new Error('Não foi possível sair da conta.');
        }

        window.location.href = '/login';

    } catch (erro) {
        mostrarMensagem(mensagemCatalogo, erro.message, true);
    }
});

// ==================== INICIALIZAÇÃO ====================

carregarCatalogo();
carregarPedidos();
renderizarCarrinho();