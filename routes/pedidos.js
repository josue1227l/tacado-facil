const express = require('express');
const prisma = require('../lib/prisma');
const { requireLogin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// CRIAR PEDIDO — cliente autenticado
router.post('/', requireLogin, async (req, res) => {
    try {
        const { itens } = req.body;

        if (!Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({
                erro: 'Adicione pelo menos um produto ao pedido.'
            });
        }

        // Validar os produtos e as quantidades recebidas
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
                    erro: 'Verifique os produtos e as quantidades do pedido.'
                });
            }

            quantidades.set(
                produtoId,
                (quantidades.get(produtoId) || 0) + quantidade
            );
        }

        const idsProdutos = [...quantidades.keys()];

        // Conferir se todos os produtos existem e estão ativos
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
                    erro: `Estoque insuficiente para o produto ${produto.nome}. Disponível: ${produto.estoque}.`
                });
            }

            total += produto.preco * quantidade;

            itensPedido.push({
                produtoId: produto.id,
                quantidade,
                precoUnitario: produto.preco
            });
        }

        // Criar o pedido e seus itens em uma transação
        const pedido = await prisma.$transaction(async (tx) => {
            // Revalidar o estoque dentro da transação e diminuir as quantidades
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
                    throw new Error(
                        'ESTOQUE_INSUFICIENTE'
                    );
                }
            }

            return tx.pedido.create({
                data: {
                    usuarioId: req.usuario.id,
                    total,
                    status: 'PENDENTE',
                    itens: {
                        create: itensPedido
                    }
                },
                include: {
                    itens: {
                        include: {
                            produto: true
                        }
                    }
                }
            });
        });

        res.status(201).json({
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

        res.status(500).json({
            erro: 'Não foi possível realizar o pedido.'
        });
    }
});

// LISTAR PEDIDOS
// Cliente vê somente os próprios pedidos; administrador vê todos.
router.get('/', requireLogin, async (req, res) => {
    try {
        const pedidos = await prisma.pedido.findMany({
            where: req.usuario.tipo === 'ADMIN'
                ? {}
                : { usuarioId: req.usuario.id },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nome: true,
                        email: true
                    }
                },
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

        res.json(pedidos);
    } catch (erro) {
        console.error('Erro ao listar pedidos:', erro);

        res.status(500).json({
            erro: 'Não foi possível carregar os pedidos.'
        });
    }
});

// CONSULTAR UM PEDIDO
// O cliente só pode consultar um pedido próprio.
router.get('/:id', requireLogin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do pedido inválido.'
            });
        }

        const pedido = await prisma.pedido.findFirst({
            where: {
                id,
                ...(req.usuario.tipo === 'ADMIN'
                    ? {}
                    : { usuarioId: req.usuario.id })
            },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nome: true,
                        email: true
                    }
                },
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

        res.json(pedido);
    } catch (erro) {
        console.error('Erro ao consultar pedido:', erro);

        res.status(500).json({
            erro: 'Não foi possível consultar o pedido.'
        });
    }
});

// ALTERAR STATUS — somente administrador
router.patch('/:id/status', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;

        const statusPermitidos = [
            'PENDENTE',
            'CONFIRMADO',
            'SEPARANDO',
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
            include: {
                itens: true
            }
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
            // Ao cancelar, devolver os produtos ao estoque uma única vez.
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
                    usuario: {
                        select: {
                            id: true,
                            nome: true,
                            email: true
                        }
                    },
                    itens: {
                        include: {
                            produto: true
                        }
                    }
                }
            });
        });

        res.json({
            mensagem: 'Status do pedido atualizado com sucesso.',
            pedido
        });
    } catch (erro) {
        console.error('Erro ao atualizar pedido:', erro);

        res.status(500).json({
            erro: 'Não foi possível atualizar o pedido.'
        });
    }
});

module.exports = router;