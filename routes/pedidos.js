const express = require('express');
const prisma = require('../lib/prisma');
const { requireLogin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function requireFuncionario(req, res, next) {
    return requireLogin(req, res, () => {
        if (req.usuario.tipo !== 'FUNCIONARIO') {
            return res.status(403).json({
                erro: 'Acesso permitido somente para funcionários.'
            });
        }

        next();
    });
}

const dadosUsuario = {
    select: {
        id: true,
        nome: true,
        email: true
    }
};

// CRIAR PEDIDO
router.post('/', requireLogin, async (req, res) => {
    try {
        if (req.usuario.tipo !== 'CLIENTE') {
            return res.status(403).json({
                erro: 'Somente clientes podem realizar pedidos.'
            });
        }

        const { itens, formaPagamento } = req.body;

        const formasPermitidas = [
            'PIX_SIMULADO',
            'DINHEIRO_ENTREGA',
            'CARTAO_ENTREGA'
        ];

        if (!formasPermitidas.includes(formaPagamento)) {
            return res.status(400).json({
                erro: 'Selecione uma forma de pagamento válida.'
            });
        }

        if (!Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({
                erro: 'Adicione pelo menos um produto ao pedido.'
            });
        }

        const quantidades = new Map();

        for (const item of itens) {
            const produtoId = Number(item.produtoId);
            const quantidade = Number(item.quantidade);

            if (
                !Number.isInteger(produtoId) ||
                produtoId <= 0 ||
                !Number.isInteger(quantidade) ||
                quantidade <= 0
            ) {
                return res.status(400).json({
                    erro: 'Verifique os produtos e as quantidades.'
                });
            }

            quantidades.set(
                produtoId,
                (quantidades.get(produtoId) || 0) + quantidade
            );
        }

        const idsProdutos = [...quantidades.keys()];

        const produtos = await prisma.produto.findMany({
            where: {
                id: { in: idsProdutos },
                ativo: true
            }
        });

        if (produtos.length !== idsProdutos.length) {
            return res.status(400).json({
                erro: 'Um ou mais produtos não existem ou estão indisponíveis.'
            });
        }

        let total = 0;
        const itensPedido = [];

        for (const produto of produtos) {
            const quantidade = quantidades.get(produto.id);

            if (produto.estoque < quantidade) {
                return res.status(400).json({
                    erro: `Estoque insuficiente para ${produto.nome}. Disponível: ${produto.estoque}.`
                });
            }

            total += produto.preco * quantidade;

            itensPedido.push({
                produtoId: produto.id,
                quantidade,
                precoUnitario: produto.preco
            });
        }

        const pedido = await prisma.$transaction(async (tx) => {
            for (const item of itensPedido) {
                const resultado = await tx.produto.updateMany({
                    where: {
                        id: item.produtoId,
                        ativo: true,
                        estoque: {
                            gte: item.quantidade
                        }
                    },
                    data: {
                        estoque: {
                            decrement: item.quantidade
                        }
                    }
                });

                if (resultado.count !== 1) {
                    throw new Error('ESTOQUE_INSUFICIENTE');
                }
            }

            return tx.pedido.create({
                data: {
                    usuarioId: req.usuario.id,
                    total,
                    status: 'PENDENTE',
                    formaPagamento,
                    statusPagamento: formaPagamento === 'PIX_SIMULADO'
                        ? 'AGUARDANDO_CONFIRMACAO'
                        : 'PENDENTE',
                    itens: {
                        create: itensPedido
                    }
                },
                include: {
                    usuario: dadosUsuario,
                    funcionario: dadosUsuario,
                    itens: {
                        include: {
                            produto: true
                        }
                    }
                }
            });
        });

        return res.status(201).json({
            mensagem: 'Pedido realizado com sucesso.',
            pedido
        });

    } catch (erro) {
        if (erro.message === 'ESTOQUE_INSUFICIENTE') {
            return res.status(409).json({
                erro: 'O estoque mudou durante a compra. Atualize o catálogo e tente novamente.'
            });
        }

        console.error('Erro ao criar pedido:', erro);

        return res.status(500).json({
            erro: 'Não foi possível realizar o pedido.'
        });
    }
});

// LISTAR PEDIDOS
router.get('/', requireLogin, async (req, res) => {
    try {
        let where = {};

        if (req.usuario.tipo === 'CLIENTE') {
            where = {
                usuarioId: req.usuario.id
            };
        } else if (req.usuario.tipo === 'FUNCIONARIO') {
            where = {
                OR: [
                    {
                        funcionarioId: null,
                        status: 'PENDENTE'
                    },
                    {
                        funcionarioId: req.usuario.id
                    }
                ]
            };
        } else if (req.usuario.tipo !== 'ADMIN') {
            return res.status(403).json({
                erro: 'Você não tem permissão para visualizar pedidos.'
            });
        }

        const pedidos = await prisma.pedido.findMany({
            where,
            include: {
                usuario: dadosUsuario,
                funcionario: dadosUsuario,
                itens: {
                    include: {
                        produto: true
                    }
                }
            },
            orderBy: {
                criadoEm: 'desc'
            }
        });

        return res.json(pedidos);

    } catch (erro) {
        console.error('Erro ao listar pedidos:', erro);

        return res.status(500).json({
            erro: 'Não foi possível carregar os pedidos.'
        });
    }
});

// CONSULTAR UM PEDIDO
router.get('/:id', requireLogin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do pedido inválido.'
            });
        }

        let where = { id };

        if (req.usuario.tipo === 'CLIENTE') {
            where.usuarioId = req.usuario.id;
        } else if (req.usuario.tipo === 'FUNCIONARIO') {
            where = {
                id,
                OR: [
                    { funcionarioId: req.usuario.id },
                    {
                        funcionarioId: null,
                        status: 'PENDENTE'
                    }
                ]
            };
        } else if (req.usuario.tipo !== 'ADMIN') {
            return res.status(403).json({
                erro: 'Você não tem permissão para consultar este pedido.'
            });
        }

        const pedido = await prisma.pedido.findFirst({
            where,
            include: {
                usuario: dadosUsuario,
                funcionario: dadosUsuario,
                itens: {
                    include: {
                        produto: true
                    }
                }
            }
        });

        if (!pedido) {
            return res.status(404).json({
                erro: 'Pedido não encontrado.'
            });
        }

        return res.json(pedido);

    } catch (erro) {
        console.error('Erro ao consultar pedido:', erro);

        return res.status(500).json({
            erro: 'Não foi possível consultar o pedido.'
        });
    }
});

// FUNCIONÁRIO ASSUME UM PEDIDO
router.post('/:id/assumir', requireFuncionario, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do pedido inválido.'
            });
        }

        const resultado = await prisma.pedido.updateMany({
            where: {
                id,
                funcionarioId: null,
                status: 'PENDENTE'
            },
            data: {
                funcionarioId: req.usuario.id,
                status: 'SEPARANDO'
            }
        });

        if (resultado.count !== 1) {
            return res.status(409).json({
                erro: 'Este pedido já foi assumido ou não está disponível.'
            });
        }

        const pedido = await prisma.pedido.findUnique({
            where: { id },
            include: {
                usuario: dadosUsuario,
                funcionario: dadosUsuario,
                itens: {
                    include: {
                        produto: true
                    }
                }
            }
        });

        return res.json({
            mensagem: 'Pedido assumido com sucesso. Inicie a separação dos produtos.',
            pedido
        });

    } catch (erro) {
        console.error('Erro ao assumir pedido:', erro);

        return res.status(500).json({
            erro: 'Não foi possível assumir o pedido.'
        });
    }
});

// FUNCIONÁRIO ATUALIZA A PREPARAÇÃO
router.patch('/:id/funcionario-status', requireFuncionario, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do pedido inválido.'
            });
        }

        const transicoes = {
            PREPARADO: 'SEPARANDO',
            ENVIADO: 'PREPARADO'
        };

        if (!transicoes[status]) {
            return res.status(400).json({
                erro: 'Status inválido.'
            });
        }

        const resultado = await prisma.pedido.updateMany({
            where: {
                id,
                funcionarioId: req.usuario.id,
                status: transicoes[status]
            },
            data: { status }
        });

        if (resultado.count !== 1) {
            return res.status(409).json({
                erro: 'Pedido não encontrado ou não permite essa mudança de status.'
            });
        }

        const pedido = await prisma.pedido.findUnique({
            where: { id },
            include: {
                usuario: dadosUsuario,
                funcionario: dadosUsuario,
                itens: {
                    include: {
                        produto: true
                    }
                }
            }
        });

        return res.json({
            mensagem: status === 'PREPARADO'
                ? 'Pedido preparado com sucesso.'
                : 'Pedido marcado como saiu para entrega.',
            pedido
        });

    } catch (erro) {
        console.error('Erro ao atualizar pedido pelo funcionário:', erro);

        return res.status(500).json({
            erro: 'Não foi possível atualizar o pedido.'
        });
    }
});

// ADMINISTRADOR ALTERA O STATUS DO PEDIDO
router.patch('/:id/status', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;

        const statusPermitidos = [
            'PENDENTE',
            'CONFIRMADO',
            'SEPARANDO',
            'PREPARADO',
            'ENVIADO',
            'CONCLUIDO',
            'CANCELADO'
        ];

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do pedido inválido.'
            });
        }

        if (!statusPermitidos.includes(status)) {
            return res.status(400).json({
                erro: 'Status do pedido inválido.'
            });
        }

        const pedidoExistente = await prisma.pedido.findUnique({
            where: { id },
            include: { itens: true }
        });

        if (!pedidoExistente) {
            return res.status(404).json({
                erro: 'Pedido não encontrado.'
            });
        }

        if (
            pedidoExistente.status === 'CANCELADO' &&
            status !== 'CANCELADO'
        ) {
            return res.status(400).json({
                erro: 'Um pedido cancelado não pode ser reaberto.'
            });
        }

        const pedido = await prisma.$transaction(async (tx) => {
            if (
                status === 'CANCELADO' &&
                pedidoExistente.status !== 'CANCELADO'
            ) {
                for (const item of pedidoExistente.itens) {
                    await tx.produto.update({
                        where: { id: item.produtoId },
                        data: {
                            estoque: {
                                increment: item.quantidade
                            }
                        }
                    });
                }
            }

            return tx.pedido.update({
                where: { id },
                data: { status },
                include: {
                    usuario: dadosUsuario,
                    funcionario: dadosUsuario,
                    itens: {
                        include: {
                            produto: true
                        }
                    }
                }
            });
        });

        return res.json({
            mensagem: 'Status do pedido atualizado com sucesso.',
            pedido
        });

    } catch (erro) {
        console.error('Erro ao atualizar pedido:', erro);

        return res.status(500).json({
            erro: 'Não foi possível atualizar o pedido.'
        });
    }
});

// ADMINISTRADOR ATUALIZA O STATUS DO PAGAMENTO
router.patch('/:id/pagamento', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { statusPagamento } = req.body;

        const statusPermitidos = [
            'PENDENTE',
            'AGUARDANDO_CONFIRMACAO',
            'CONFIRMADO',
            'RECUSADO',
            'CANCELADO'
        ];

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do pedido inválido.'
            });
        }

        if (!statusPermitidos.includes(statusPagamento)) {
            return res.status(400).json({
                erro: 'Status de pagamento inválido.'
            });
        }

        const pedido = await prisma.pedido.update({
            where: { id },
            data: { statusPagamento },
            include: {
                usuario: dadosUsuario,
                funcionario: dadosUsuario,
                itens: {
                    include: {
                        produto: true
                    }
                }
            }
        });

        return res.json({
            mensagem: 'Status do pagamento atualizado com sucesso.',
            pedido
        });

    } catch (erro) {
        if (erro.code === 'P2025') {
            return res.status(404).json({
                erro: 'Pedido não encontrado.'
            });
        }

        console.error('Erro ao atualizar pagamento:', erro);

        return res.status(500).json({
            erro: 'Não foi possível atualizar o pagamento.'
        });
    }
});

module.exports = router;