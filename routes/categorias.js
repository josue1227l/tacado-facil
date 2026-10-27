const express = require('express');
const prisma = require('../lib/prisma');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Listar categorias
router.get('/', async (req, res) => {
    try {
        const categorias = await prisma.categoria.findMany({
            orderBy: {
                nome: 'asc'
            }
        });

        res.json(categorias);
    } catch (erro) {
        console.error('Erro ao listar categorias:', erro);

        res.status(500).json({
            erro: 'Não foi possível carregar as categorias.'
        });
    }
});

// Cadastrar categoria - somente administrador
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { nome, descricao } = req.body;

        if (!nome?.trim()) {
            return res.status(400).json({
                erro: 'Informe o nome da categoria.'
            });
        }

        const categoria = await prisma.categoria.create({
            data: {
                nome: nome.trim(),
                descricao: descricao?.trim() || null
            }
        });

        res.status(201).json({
            mensagem: 'Categoria cadastrada com sucesso.',
            categoria
        });
    } catch (erro) {
        console.error('Erro ao cadastrar categoria:', erro);

        if (erro.code === 'P2002') {
            return res.status(409).json({
                erro: 'Já existe uma categoria com esse nome.'
            });
        }

        res.status(500).json({
            erro: 'Não foi possível cadastrar a categoria.'
        });
    }
});

// Editar categoria - somente administrador
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { nome, descricao } = req.body;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID da categoria inválido.'
            });
        }

        if (!nome?.trim()) {
            return res.status(400).json({
                erro: 'Informe o nome da categoria.'
            });
        }

        const existente = await prisma.categoria.findUnique({
            where: { id }
        });

        if (!existente) {
            return res.status(404).json({
                erro: 'Categoria não encontrada.'
            });
        }

        const categoria = await prisma.categoria.update({
            where: { id },
            data: {
                nome: nome.trim(),
                descricao: descricao?.trim() || null
            }
        });

        res.json({
            mensagem: 'Categoria atualizada com sucesso.',
            categoria
        });
    } catch (erro) {
        console.error('Erro ao atualizar categoria:', erro);

        if (erro.code === 'P2002') {
            return res.status(409).json({
                erro: 'Já existe uma categoria com esse nome.'
            });
        }

        res.status(500).json({
            erro: 'Não foi possível atualizar a categoria.'
        });
    }
});

// Excluir categoria - somente administrador
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID da categoria inválido.'
            });
        }

        const categoria = await prisma.categoria.findUnique({
            where: { id }
        });

        if (!categoria) {
            return res.status(404).json({
                erro: 'Categoria não encontrada.'
            });
        }

        await prisma.categoria.delete({
            where: { id }
        });

        res.json({
            mensagem: 'Categoria excluída com sucesso.'
        });
    } catch (erro) {
        console.error('Erro ao excluir categoria:', erro);

        if (erro.code === 'P2003') {
            return res.status(409).json({
                erro: 'Não é possível excluir uma categoria que possui produtos cadastrados.'
            });
        }

        res.status(500).json({
            erro: 'Não foi possível excluir a categoria.'
        });
    }
});

module.exports = router;