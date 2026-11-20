const express = require('express');
const prisma = require('../lib/prisma');
const { requireAdmin } = require('../middleware/auth');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();

// ==================== CONFIGURAÇÃO DAS IMAGENS ====================

const pastaUploads = path.join(__dirname, '..', 'public', 'uploads');

fs.mkdirSync(pastaUploads, { recursive: true });

const extensoesPermitidas = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
};

const armazenamento = multer.diskStorage({
    destination: (req, arquivo, callback) => {
        callback(null, pastaUploads);
    },

    filename: (req, arquivo, callback) => {
        const extensao = extensoesPermitidas[arquivo.mimetype];
        callback(null, crypto.randomUUID() + extensao);
    }
});

const upload = multer({
    storage: armazenamento,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, arquivo, callback) => {
        if (!extensoesPermitidas[arquivo.mimetype]) {
            return callback(
                new Error('Envie uma imagem JPG, PNG ou WEBP.')
            );
        }

        callback(null, true);
    }
});

// Receber imagem e tratar erros do upload
function receberImagem(req, res, next) {
    upload.single('imagem')(req, res, erro => {
        if (erro) {
            return res.status(400).json({
                erro: erro.code === 'LIMIT_FILE_SIZE'
                    ? 'A imagem deve ter no máximo 5 MB.'
                    : erro.message
            });
        }

        next();
    });
}

// Remover imagem salva no servidor
async function removerImagem(imagem) {
    if (!imagem || !imagem.startsWith('/uploads/')) {
        return;
    }

    const nomeArquivo = path.basename(imagem);
    const caminho = path.join(pastaUploads, nomeArquivo);

    try {
        await fs.promises.unlink(caminho);
    } catch (erro) {
        if (erro.code !== 'ENOENT') {
            console.error('Erro ao remover imagem:', erro);
        }
    }
}

// ==================== LISTAR PRODUTOS ====================

router.get('/', async (req, res) => {
    try {
        const produtos = await prisma.produto.findMany({
            include: {
                categoria: true
            },
            orderBy: {
                id: 'desc'
            }
        });

        res.json(produtos);
    } catch (erro) {
        console.error('Erro ao listar produtos:', erro);

        res.status(500).json({
            erro: 'Não foi possível carregar os produtos.'
        });
    }
});

// ==================== CADASTRAR PRODUTO ====================

router.post('/', requireAdmin, receberImagem, async (req, res) => {
    try {
        const {
            nome,
            descricao,
            codigo,
            preco,
            estoque,
            estoqueMinimo,
            unidade,
            categoriaId
        } = req.body;

        if (
            !nome?.trim() ||
            !codigo?.trim() ||
            preco === undefined ||
            preco === '' ||
            categoriaId === undefined ||
            categoriaId === ''
        ) {
            return res.status(400).json({
                erro: 'Preencha o nome, código, preço e categoria.'
            });
        }

        const precoNumero = Number(preco);
        const estoqueNumero = Number(estoque ?? 0);
        const estoqueMinimoNumero = Number(estoqueMinimo ?? 5);
        const categoriaIdNumero = Number(categoriaId);

        if (
            !Number.isFinite(precoNumero) ||
            precoNumero < 0 ||
            !Number.isInteger(estoqueNumero) ||
            estoqueNumero < 0 ||
            !Number.isInteger(estoqueMinimoNumero) ||
            estoqueMinimoNumero < 0 ||
            !Number.isInteger(categoriaIdNumero) ||
            categoriaIdNumero <= 0
        ) {
            return res.status(400).json({
                erro: 'Verifique o preço, estoque e categoria informados.'
            });
        }

        const categoria = await prisma.categoria.findUnique({
            where: {
                id: categoriaIdNumero
            }
        });

        if (!categoria) {
            return res.status(400).json({
                erro: 'A categoria informada não existe.'
            });
        }

        const produto = await prisma.produto.create({
            data: {
                nome: nome.trim(),
                descricao: descricao?.trim() || null,
                codigo: codigo.trim(),
                preco: precoNumero,
                estoque: estoqueNumero,
                estoqueMinimo: estoqueMinimoNumero,
                unidade: unidade?.trim() || 'UN',
                categoriaId: categoriaIdNumero,
                imagem: req.file
                    ? `/uploads/${req.file.filename}`
                    : null
            },

            include: {
                categoria: true
            }
        });

        res.status(201).json({
            mensagem: 'Produto cadastrado com sucesso.',
            produto
        });

    } catch (erro) {
        console.error('Erro ao cadastrar produto:', erro);

        if (req.file) {
            await removerImagem(`/uploads/${req.file.filename}`);
        }

        if (erro.code === 'P2002') {
            return res.status(409).json({
                erro: 'Já existe um produto com esse código.'
            });
        }

        res.status(500).json({
            erro: 'Não foi possível cadastrar o produto.'
        });
    }
});

// ==================== EDITAR PRODUTO ====================

router.put('/:id', requireAdmin, receberImagem, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do produto inválido.'
            });
        }

        const existente = await prisma.produto.findUnique({
            where: { id }
        });

        if (!existente) {
            return res.status(404).json({
                erro: 'Produto não encontrado.'
            });
        }

        const {
            nome,
            descricao,
            codigo,
            preco,
            estoque,
            estoqueMinimo,
            unidade,
            categoriaId
        } = req.body;

        const dados = {};

        if (nome !== undefined) {
            if (!nome.trim()) {
                return res.status(400).json({
                    erro: 'O nome do produto não pode ficar vazio.'
                });
            }

            dados.nome = nome.trim();
        }

        if (descricao !== undefined) {
            dados.descricao = descricao?.trim() || null;
        }

        if (codigo !== undefined) {
            if (!codigo.trim()) {
                return res.status(400).json({
                    erro: 'O código do produto não pode ficar vazio.'
                });
            }

            dados.codigo = codigo.trim();
        }

        if (preco !== undefined) {
            const valor = Number(preco);

            if (!Number.isFinite(valor) || valor < 0) {
                return res.status(400).json({
                    erro: 'Informe um preço válido.'
                });
            }

            dados.preco = valor;
        }

        if (estoque !== undefined) {
            const valor = Number(estoque);

            if (!Number.isInteger(valor) || valor < 0) {
                return res.status(400).json({
                    erro: 'Informe uma quantidade de estoque válida.'
                });
            }

            dados.estoque = valor;
        }

        if (estoqueMinimo !== undefined) {
            const valor = Number(estoqueMinimo);

            if (!Number.isInteger(valor) || valor < 0) {
                return res.status(400).json({
                    erro: 'Informe um estoque mínimo válido.'
                });
            }

            dados.estoqueMinimo = valor;
        }

        if (unidade !== undefined) {
            dados.unidade = unidade.trim() || 'UN';
        }

        if (categoriaId !== undefined) {
            const valor = Number(categoriaId);

            if (!Number.isInteger(valor) || valor <= 0) {
                return res.status(400).json({
                    erro: 'Informe uma categoria válida.'
                });
            }

            const categoria = await prisma.categoria.findUnique({
                where: { id: valor }
            });

            if (!categoria) {
                return res.status(400).json({
                    erro: 'A categoria informada não existe.'
                });
            }

            dados.categoriaId = valor;
        }

        // Só altera a imagem se uma nova for enviada
        if (req.file) {
            dados.imagem = `/uploads/${req.file.filename}`;
        }

        const produto = await prisma.produto.update({
            where: { id },
            data: dados,
            include: {
                categoria: true
            }
        });

        // Remove a imagem antiga depois da atualização
        if (req.file && existente.imagem) {
            await removerImagem(existente.imagem);
        }

        res.json({
            mensagem: 'Produto atualizado com sucesso.',
            produto
        });

    } catch (erro) {
        console.error('Erro ao atualizar produto:', erro);

        if (req.file) {
            await removerImagem(`/uploads/${req.file.filename}`);
        }

        if (erro.code === 'P2002') {
            return res.status(409).json({
                erro: 'Já existe um produto com esse código.'
            });
        }

        res.status(500).json({
            erro: 'Não foi possível atualizar o produto.'
        });
    }
});

// ==================== EXCLUIR PRODUTO ====================

router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do produto inválido.'
            });
        }

        const produto = await prisma.produto.findUnique({
            where: { id },
            include: {
                itensPedido: {
                    select: { id: true },
                    take: 1
                }
            }
        });

        if (!produto) {
            return res.status(404).json({
                erro: 'Produto não encontrado.'
            });
        }

        if (produto.itensPedido.length > 0) {
            return res.status(409).json({
                erro: 'Este produto já faz parte de um pedido e não pode ser excluído. Você pode editar o produto ou deixá-lo indisponível.'
            });
        }

        await prisma.produto.delete({
            where: { id }
        });

        if (produto.imagem) {
            await removerImagem(produto.imagem);
        }

        res.json({
            mensagem: 'Produto excluído com sucesso.'
        });

    } catch (erro) {
        console.error('Erro ao excluir produto:', erro);

        res.status(500).json({
            erro: 'Não foi possível excluir o produto.'
        });
    }
});

// ==================== ATIVAR OU DESATIVAR ====================

router.patch('/:id/ativo', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { ativo } = req.body;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do produto inválido.'
            });
        }

        if (typeof ativo !== 'boolean') {
            return res.status(400).json({
                erro: 'Informe se o produto estará ativo ou inativo.'
            });
        }

        const produto = await prisma.produto.findUnique({
            where: { id }
        });

        if (!produto) {
            return res.status(404).json({
                erro: 'Produto não encontrado.'
            });
        }

        await prisma.produto.update({
            where: { id },
            data: { ativo }
        });

        res.json({
            mensagem: ativo
                ? 'Produto reativado com sucesso.'
                : 'Produto desativado com sucesso.'
        });

    } catch (erro) {
        console.error('Erro ao alterar situação do produto:', erro);

        res.status(500).json({
            erro: 'Não foi possível alterar a situação do produto.'
        });
    }
});

module.exports = router;