const listaDisponiveis = document.getElementById('listaDisponiveis');
const listaMeusPedidos = document.getElementById('listaMeusPedidos');
const nomeFuncionario = document.getElementById('nomeFuncionario');
const mensagemFuncionario = document.getElementById('mensagemFuncionario');
const botaoSair = document.getElementById('botaoSair');

function mostrarMensagem(texto, tipo = 'sucesso') {
    mensagemFuncionario.textContent = texto;
    mensagemFuncionario.className = `mensagem mensagem-${tipo}`;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[caractere]);
}

function nomeStatus(status) {
    const nomes = {
        PENDENTE: 'Aguardando funcionário',
        SEPARANDO: 'Em separação',
        PREPARADO: 'Preparado',
        ENVIADO: 'Saiu para entrega',
        CONCLUIDO: 'Concluído',
        CANCELADO: 'Cancelado'
    };

    return nomes[status] || status;
}

async function carregarFuncionario() {
    try {
        const resposta = await fetch('/api/auth/me');
        const dados = await resposta.json();

        if (!resposta.ok) {
            window.location.href = '/login';
            return;
        }

        nomeFuncionario.textContent = `Bem-vindo, ${dados.nome}!`;
    } catch (erro) {
        mostrarMensagem('Não foi possível carregar seus dados.', 'erro');
    }
}

function criarCardPedido(pedido, disponivel) {
    const itens = pedido.itens || [];

    const listaItens = itens.map(item => {
        const produto = item.produto || {};
        const titulo = produto.nome || produto.titulo || 'Produto';
        const quantidade = item.quantidade || 0;
        const preco = item.precoUnitario ?? item.preco ?? 0;

        return `
            <p>
                ${quantidade}x ${escaparHTML(titulo)}
                — ${formatarMoeda(preco)}
            </p>
        `;
    }).join('');

    const cliente = pedido.usuario?.nome || 'Cliente';
    const funcionario = pedido.funcionario?.nome || '';

    let botao = '';

    if (disponivel) {
        botao = `
            <button class="botao-acao"
                onclick="assumirPedido(${pedido.id})">
                Assumir pedido
            </button>
        `;
    } else if (pedido.status === 'SEPARANDO') {
        botao = `
            <button class="botao-acao"
                onclick="atualizarStatus(${pedido.id}, 'PREPARADO')">
                Marcar como preparado
            </button>
        `;
    } else if (pedido.status === 'PREPARADO') {
        botao = `
            <button class="botao-acao"
                onclick="atualizarStatus(${pedido.id}, 'ENVIADO')">
                Confirmar saída para entrega
            </button>
        `;
    }

    return `
        <article class="pedido-card">
            <h3>Pedido #${pedido.id}</h3>

            <p><strong>Cliente:</strong> ${escaparHTML(cliente)}</p>

            ${funcionario ? `
                <p><strong>Responsável:</strong> ${escaparHTML(funcionario)}</p>
            ` : ''}

            <p>
                <strong>Status:</strong>
                <span class="status-pedido">
                    ${escaparHTML(nomeStatus(pedido.status))}
                </span>
            </p>

            <div class="itens-pedido">
                <strong>Produtos:</strong>
                ${listaItens || '<p>Itens não disponíveis.</p>'}
            </div>

            <p class="valor-total">
                Total: ${formatarMoeda(pedido.total)}
            </p>

            ${botao}
        </article>
    `;
}

async function carregarPedidos() {
    listaDisponiveis.innerHTML = '<p>Carregando pedidos...</p>';
    listaMeusPedidos.innerHTML = '<p>Carregando pedidos...</p>';

    try {
        const resposta = await fetch('/api/pedidos');
        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || 'Erro ao carregar pedidos.');
        }

        const disponiveis = dados.filter(pedido =>
            pedido.status === 'PENDENTE' && !pedido.funcionarioId
        );

        const meusPedidos = dados.filter(pedido =>
            pedido.funcionarioId !== null &&
            pedido.funcionarioId !== undefined
        );

        listaDisponiveis.innerHTML = disponiveis.length
            ? disponiveis.map(pedido => criarCardPedido(pedido, true)).join('')
            : '<p class="vazio">Nenhum pedido aguardando funcionário.</p>';

        listaMeusPedidos.innerHTML = meusPedidos.length
            ? meusPedidos.map(pedido => criarCardPedido(pedido, false)).join('')
            : '<p class="vazio">Você ainda não assumiu nenhum pedido.</p>';

    } catch (erro) {
        listaDisponiveis.innerHTML =
            '<p class="vazio">Não foi possível carregar os pedidos.</p>';

        listaMeusPedidos.innerHTML = '';

        mostrarMensagem(erro.message, 'erro');
    }
}

async function assumirPedido(id) {
    if (!confirm(`Deseja assumir o pedido #${id}?`)) {
        return;
    }

    try {
        const resposta = await fetch(`/api/pedidos/${id}/assumir`, {
            method: 'POST'
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || 'Não foi possível assumir o pedido.');
        }

        mostrarMensagem(dados.mensagem || 'Pedido assumido com sucesso!');
        await carregarPedidos();

    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

async function atualizarStatus(id, status) {
    const mensagem = status === 'PREPARADO'
        ? `Confirmar que o pedido #${id} foi preparado?`
        : `Confirmar que o pedido #${id} saiu para entrega?`;

    if (!confirm(mensagem)) {
        return;
    }

    try {
        const resposta = await fetch(`/api/pedidos/${id}/funcionario-status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || 'Não foi possível atualizar o pedido.');
        }

        mostrarMensagem(dados.mensagem || 'Pedido atualizado com sucesso!');
        await carregarPedidos();

    } catch (erro) {
        mostrarMensagem(erro.message, 'erro');
    }
}

async function sairDaConta() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST'
        });
    } finally {
        window.location.href = '/login';
    }
}

botaoSair.addEventListener('click', sairDaConta);

carregarFuncionario();
carregarPedidos();

window.assumirPedido = assumirPedido;
window.atualizarStatus = atualizarStatus;