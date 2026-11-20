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

// Imagens ilustrativas por categoria (usadas como alternativa)
const imagensCategorias = {
    'mercearia': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
    'bebidas': 'https://images.unsplash.com/photo-1532634896-26909d0d4b74?w=500',
    'limpeza': 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=500',
    'açougue': 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=500',
    'frios': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=500',
    'hortifruti': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500'
};

// Estilo dos grupos e imagens
const estilo = document.createElement('style');

estilo.textContent = `
    .grupo-categoria {
        margin-bottom: 30px;
    }

    .titulo-categoria {
        color: #166534;
        font-size: 23px;
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: 2px solid #dcfce7;
    }

    .lista-produtos-demo {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 18px;
    }

    .produto-demo {
        background: white;
        border-radius: 10px;
        padding: 14px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.08);
        overflow: hidden;
    }

    .imagem-produto-demo {
        width: 100%;
        height: 135px;
        object-fit: cover;
        border-radius: 7px;
        margin-bottom: 10px;
        background: #f3f4f6;
    }

    .produto-demo h3 {
        margin: 5px 0;
        color: #166534;
    }

    .produto-demo p {
        margin: 6px 0;
    }

    .preco-demo {
        font-size: 20px;
        font-weight: bold;
        color: #15803d;
    }
`;

document.head.appendChild(estilo);

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

// Carregar catálogo e separar produtos por categoria
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

        // Agrupar produtos por categoria
        const grupos = {};

        produtos.forEach(produto => {
            const categoria = produto.categoria?.nome || 'Outros';

            if (!grupos[categoria]) {
                grupos[categoria] = [];
            }

            grupos[categoria].push(produto);
        });

        // Ordem das categorias
        const ordemCategorias = [
            'Mercearia',
            'Bebidas',
            'Limpeza',
            'Açougue',
            'Frios',
            'Hortifruti'
        ];

        const categoriasOrdenadas = Object.keys(grupos).sort((a, b) => {
            const posicaoA = ordemCategorias.indexOf(a);
            const posicaoB = ordemCategorias.indexOf(b);

            return (posicaoA === -1 ? 99 : posicaoA) -
                   (posicaoB === -1 ? 99 : posicaoB);
        });

        categoriasOrdenadas.forEach(categoria => {
            // Área da categoria
            const grupo = document.createElement('section');
            grupo.className = 'grupo-categoria';

            grupo.appendChild(
                criarElemento('h2', categoria, 'titulo-categoria')
            );

            const lista = document.createElement('div');
            lista.className = 'lista-produtos-demo';

            grupos[categoria].forEach(produto => {
                const card = document.createElement('article');
                card.className = 'produto-demo';

                // Imagem individual do produto
                const imagem = document.createElement('img');
                const chaveCategoria = categoria.toLowerCase();

                const imagemCategoria =
                    imagensCategorias[chaveCategoria] ||
                    imagensCategorias['mercearia'];

                // Prioriza a imagem cadastrada no painel
                imagem.src = produto.imagem || imagemCategoria;

                imagem.alt = produto.nome;
                imagem.className = 'imagem-produto-demo';
                imagem.loading = 'lazy';

                // Se a imagem cadastrada não carregar,
                // utiliza a imagem ilustrativa da categoria
                imagem.onerror = () => {
                    if (imagem.src !== imagemCategoria) {
                        imagem.src = imagemCategoria;
                    } else {
                        imagem.style.display = 'none';
                    }
                };

                card.appendChild(imagem);

                card.appendChild(
                    criarElemento('h3', produto.nome)
                );

                if (produto.descricao) {
                    card.appendChild(
                        criarElemento('p', produto.descricao)
                    );
                }

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
                lista.appendChild(card);
            });

            grupo.appendChild(lista);
            catalogoProdutos.appendChild(grupo);
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