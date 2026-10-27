const catalogoProdutos = document.getElementById('catalogoProdutos');
const mensagemCatalogo = document.getElementById('mensagemCatalogo');
const mensagemPedidos = document.getElementById('mensagemPedidos');
const listaPedidos = document.getElementById('listaPedidos');
const botaoSair = document.getElementById('botaoSair');

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

// Carregar catálogo
async function carregarCatalogo() {
    try {
        const resposta = await fetch('/api/produtos');
        const produtos = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                produtos.erro || 'Não foi possível carregar os produtos.'
            );
        }

        catalogoProdutos.innerHTML = '';

        const disponiveis = produtos.filter(
            produto => produto.ativo && produto.estoque > 0
        );

        if (disponiveis.length === 0) {
            catalogoProdutos.appendChild(
                criarTexto('p', 'Nenhum produto disponível no momento.')
            );
            return;
        }

        disponiveis.forEach(produto => {
            const card = document.createElement('article');
            card.className = 'produto-card';

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
            input.required = true;

            grupoQuantidade.appendChild(label);
            grupoQuantidade.appendChild(input);

            const botaoComprar = document.createElement('button');
            botaoComprar.type = 'button';
            botaoComprar.className = 'botao-comprar';
            botaoComprar.textContent = 'Comprar';

            botaoComprar.addEventListener('click', async () => {
                const quantidade = Number(input.value);

                if (
                    !Number.isInteger(quantidade) ||
                    quantidade < 1 ||
                    quantidade > produto.estoque
                ) {
                    mostrarMensagem(
                        mensagemCatalogo,
                        'Informe uma quantidade válida dentro do estoque disponível.',
                        true
                    );
                    return;
                }

                await realizarPedido(produto.id, quantidade, botaoComprar);
            });

            card.appendChild(grupoQuantidade);
            card.appendChild(botaoComprar);

            catalogoProdutos.appendChild(card);
        });
    } catch (erro) {
        console.error('Erro ao carregar catálogo:', erro);

        mostrarMensagem(mensagemCatalogo, erro.message, true);
        catalogoProdutos.innerHTML = '';
    }
}

// Realizar pedido
async function realizarPedido(produtoId, quantidade, botao) {
    try {
        botao.disabled = true;
        botao.textContent = 'Processando...';

        mostrarMensagem(mensagemCatalogo, '');

        const resposta = await fetch('/api/pedidos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                itens: [
                    {
                        produtoId,
                        quantidade
                    }
                ]
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro || 'Não foi possível realizar o pedido.'
            );
        }

        mostrarMensagem(
            mensagemCatalogo,
            `Pedido #${resultado.pedido.id} realizado com sucesso! Total: ${formatarPreco(resultado.pedido.total)}`
        );

        await carregarCatalogo();
        await carregarPedidos();
    } catch (erro) {
        mostrarMensagem(mensagemCatalogo, erro.message, true);
    } finally {
        botao.disabled = false;
        botao.textContent = 'Comprar';
    }
}

// Carregar pedidos do cliente
async function carregarPedidos() {
    try {
        const resposta = await fetch('/api/pedidos');
        const pedidos = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                pedidos.erro || 'Não foi possível carregar seus pedidos.'
            );
        }

        listaPedidos.innerHTML = '';

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
                criarTexto(
                    'p',
                    `Status: ${pedido.status.replaceAll('_', ' ')}`
                )
            );

            card.appendChild(
                criarTexto('p', `Total: ${formatarPreco(pedido.total)}`)
            );

            const tituloItens = criarTexto('strong', 'Produtos do pedido');
            card.appendChild(tituloItens);

            const listaItens = document.createElement('ul');

            pedido.itens.forEach(item => {
                const nomeProduto = item.produto?.nome || 'Produto indisponível';

                const texto = `${nomeProduto} — ${item.quantidade} unidade(s) × ${formatarPreco(item.precoUnitario)}`;

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
        listaPedidos.innerHTML = '';
    }
}

// Sair da conta
botaoSair.addEventListener('click', async () => {
    try {
        const resposta = await fetch('/api/auth/logout', {
            method: 'POST'
        });

        if (!resposta.ok) {
            throw new Error('Não foi possível sair da conta.');
        }

        window.location.href = '/';
    } catch (erro) {
        mostrarMensagem(mensagemCatalogo, erro.message, true);
    }
});

// Iniciar a página
carregarCatalogo();
carregarPedidos();