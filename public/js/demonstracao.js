const catalogoProdutos = document.getElementById('catalogoProdutos');
const mensagemCatalogo = document.getElementById('mensagemCatalogo');
const itensCarrinho = document.getElementById('itensCarrinho');
const totalCarrinho = document.getElementById('totalCarrinho');
const botaoFinalizar = document.getElementById('botaoFinalizar');
const areaCompras = document.getElementById('areaCompras');
const telaFinalizacao = document.getElementById('telaFinalizacao');
const resumoCompra = document.getElementById('resumoCompra');
const botaoReiniciar = document.getElementById('botaoReiniciar');

let produtos = [];
let carrinho = [];

function formatarPreco(preco) {
    return Number(preco).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function criarElemento(tag, texto, classe = '') {
    const elemento = document.createElement(tag);
    elemento.textContent = texto;

    if (classe) {
        elemento.className = classe;
    }

    return elemento;
}

function mostrarMensagem(texto, erro = false) {
    mensagemCatalogo.textContent = texto;
    mensagemCatalogo.style.color = erro ? '#dc2626' : '#15803d';
}

// Carregar produtos sem exigir login
async function carregarCatalogo() {
    try {
        const resposta = await fetch('/api/produtos');
        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.erro || 'Erro ao carregar produtos.');
        }

        produtos = resultado.filter(
            produto => produto.ativo && produto.estoque > 0
        );

        catalogoProdutos.innerHTML = '';

        if (produtos.length === 0) {
            catalogoProdutos.appendChild(
                criarElemento('p', 'Nenhum produto disponível.')
            );
            return;
        }

        produtos.forEach(produto => {
            const card = document.createElement('article');
            card.className = 'produto-demo';

            card.appendChild(criarElemento('h3', produto.nome));

            if (produto.descricao) {
                card.appendChild(
                    criarElemento('p', produto.descricao)
                );
            }

            card.appendChild(
                criarElemento(
                    'p',
                    `Categoria: ${produto.categoria?.nome || 'Sem categoria'}`
                )
            );

            card.appendChild(
                criarElemento(
                    'p',
                    formatarPreco(produto.preco),
                    'preco-demo'
                )
            );

            card.appendChild(
                criarElemento(
                    'p',
                    `Disponível: ${produto.estoque} ${produto.unidade}`
                )
            );

            const botao = criarElemento(
                'button',
                'Adicionar ao carrinho',
                'botao-adicionar'
            );

            botao.type = 'button';

            botao.addEventListener('click', () => {
                adicionarAoCarrinho(produto.id);
            });

            card.appendChild(botao);
            catalogoProdutos.appendChild(card);
        });

    } catch (erro) {
        mostrarMensagem(erro.message, true);
        catalogoProdutos.innerHTML = '';
    }
}

// Adicionar produto ao carrinho
function adicionarAoCarrinho(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);

    if (!produto) return;

    const item = carrinho.find(i => i.produtoId === produtoId);

    if (item) {
        if (item.quantidade >= produto.estoque) {
            mostrarMensagem('Quantidade máxima disponível atingida.', true);
            return;
        }

        item.quantidade++;
    } else {
        carrinho.push({
            produtoId: produto.id,
            nome: produto.nome,
            preco: Number(produto.preco),
            quantidade: 1,
            estoque: produto.estoque
        });
    }

    mostrarMensagem(`${produto.nome} adicionado ao carrinho!`);
    atualizarCarrinho();
}

// Alterar quantidade
function alterarQuantidade(produtoId, variacao) {
    const item = carrinho.find(i => i.produtoId === produtoId);
    if (!item) return;

    const novaQuantidade = item.quantidade + variacao;

    if (novaQuantidade > item.estoque) {
        mostrarMensagem('Não há estoque suficiente.', true);
        return;
    }

    if (novaQuantidade < 1) {
        carrinho = carrinho.filter(i => i.produtoId !== produtoId);
    } else {
        item.quantidade = novaQuantidade;
    }

    atualizarCarrinho();
}

// Atualizar carrinho e total
function atualizarCarrinho() {
    itensCarrinho.innerHTML = '';

    if (carrinho.length === 0) {
        itensCarrinho.appendChild(
            criarElemento('p', 'Seu carrinho está vazio.')
        );
    }

    let total = 0;

    carrinho.forEach(item => {
        const subtotal = item.preco * item.quantidade;
        total += subtotal;

        const card = document.createElement('div');
        card.className = 'item-carrinho';

        card.appendChild(criarElemento('strong', item.nome));

        card.appendChild(
            criarElemento(
                'p',
                `${formatarPreco(item.preco)} × ${item.quantidade}`
            )
        );

        card.appendChild(
            criarElemento('p', `Subtotal: ${formatarPreco(subtotal)}`)
        );

        const botaoMenos = criarElemento('button', '−');
        botaoMenos.type = 'button';
        botaoMenos.addEventListener('click', () => {
            alterarQuantidade(item.produtoId, -1);
        });

        const botaoMais = criarElemento('button', '+');
        botaoMais.type = 'button';
        botaoMais.addEventListener('click', () => {
            alterarQuantidade(item.produtoId, 1);
        });

        const botaoRemover = criarElemento('button', 'Remover');
        botaoRemover.type = 'button';
        botaoRemover.addEventListener('click', () => {
            carrinho = carrinho.filter(
                i => i.produtoId !== item.produtoId
            );
            atualizarCarrinho();
        });

        card.append(botaoMenos, botaoMais, botaoRemover);
        itensCarrinho.appendChild(card);
    });

    totalCarrinho.textContent = formatarPreco(total);
    botaoFinalizar.disabled = carrinho.length === 0;
}

// Finalizar compra fictícia
botaoFinalizar.addEventListener('click', () => {
    if (carrinho.length === 0) return;

    const quantidadeItens = carrinho.reduce(
        (soma, item) => soma + item.quantidade,
        0
    );

    const total = carrinho.reduce(
        (soma, item) => soma + item.preco * item.quantidade,
        0
    );

    resumoCompra.textContent =
        `Você simulou a compra de ${quantidadeItens} unidade(s), ` +
        `no valor total de ${formatarPreco(total)}.`;

    areaCompras.style.display = 'none';
    telaFinalizacao.style.display = 'block';
});

// Reiniciar para o próximo visitante
botaoReiniciar.addEventListener('click', () => {
    carrinho = [];

    atualizarCarrinho();

    telaFinalizacao.style.display = 'none';
    areaCompras.style.display = 'block';

    mostrarMensagem('Nova demonstração iniciada!');
    window.scrollTo(0, 0);
});

// Iniciar demonstração
carregarCatalogo();
atualizarCarrinho();