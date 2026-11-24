const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// CADASTRO DE CLIENTE
router.post('/cadastro', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome?.trim() || !email?.trim() || !senha) {
            return res.status(400).json({
                erro: 'Preencha nome, e-mail e senha.'
            });
        }

        if (senha.length < 8) {
            return res.status(400).json({
                erro: 'A senha deve ter pelo menos 8 caracteres.'
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const existente = await prisma.usuario.findUnique({
            where: { email: emailNormalizado }
        });

        if (existente) {
            return res.status(409).json({
                erro: 'Este e-mail já está cadastrado.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 12);

        const usuario = await prisma.usuario.create({
            data: {
                nome: nome.trim(),
                email: emailNormalizado,
                senha: senhaHash,
                tipo: 'CLIENTE'
            },
            select: {
                id: true,
                nome: true,
                email: true,
                tipo: true
            }
        });

        return res.status(201).json({
            mensagem: 'Cadastro realizado com sucesso.',
            usuario
        });

    } catch (erro) {
        console.error('Erro no cadastro:', erro);

        return res.status(500).json({
            erro: 'Não foi possível realizar o cadastro.'
        });
    }
});

// CADASTRAR FUNCIONÁRIO (SOMENTE ADMIN)
router.post('/funcionarios', requireAdmin, async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome?.trim() || !email?.trim() || !senha) {
            return res.status(400).json({
                erro: 'Preencha nome, e-mail e senha.'
            });
        }

        if (senha.length < 8) {
            return res.status(400).json({
                erro: 'A senha deve ter pelo menos 8 caracteres.'
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const existente = await prisma.usuario.findUnique({
            where: { email: emailNormalizado }
        });

        if (existente) {
            return res.status(409).json({
                erro: 'Este e-mail já está cadastrado.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 12);

        const funcionario = await prisma.usuario.create({
            data: {
                nome: nome.trim(),
                email: emailNormalizado,
                senha: senhaHash,
                tipo: 'FUNCIONARIO'
            },
            select: {
                id: true,
                nome: true,
                email: true,
                tipo: true,
                ativo: true
            }
        });

        return res.status(201).json({
            mensagem: 'Funcionário cadastrado com sucesso.',
            funcionario
        });

    } catch (erro) {
        console.error('Erro ao cadastrar funcionário:', erro);

        return res.status(500).json({
            erro: 'Não foi possível cadastrar o funcionário.'
        });
    }
});

// LISTAR FUNCIONÁRIOS (SOMENTE ADMIN)
router.get('/funcionarios', requireAdmin, async (req, res) => {
    try {
        const funcionarios = await prisma.usuario.findMany({
            where: {
                tipo: 'FUNCIONARIO'
            },
            select: {
                id: true,
                nome: true,
                email: true,
                tipo: true,
                ativo: true,
                criadoEm: true
            },
            orderBy: {
                nome: 'asc'
            }
        });

        return res.json({ funcionarios });

    } catch (erro) {
        console.error('Erro ao listar funcionários:', erro);

        return res.status(500).json({
            erro: 'Não foi possível listar os funcionários.'
        });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email?.trim() || !senha) {
            return res.status(400).json({
                erro: 'Informe o e-mail e a senha.'
            });
        }

        const usuario = await prisma.usuario.findUnique({
            where: {
                email: email.trim().toLowerCase()
            }
        });

        if (!usuario || !await bcrypt.compare(senha, usuario.senha)) {
            return res.status(401).json({
                erro: 'E-mail ou senha incorretos.'
            });
        }

        if (!usuario.ativo) {
            return res.status(403).json({
                erro: 'Esta conta está desativada.'
            });
        }

        req.session.regenerate(erro => {
            if (erro) {
                return res.status(500).json({
                    erro: 'Não foi possível iniciar a sessão.'
                });
            }

            req.session.usuarioId = usuario.id;

            req.session.save(erro => {
                if (erro) {
                    return res.status(500).json({
                        erro: 'Não foi possível salvar a sessão.'
                    });
                }

                return res.json({
                    mensagem: 'Login realizado com sucesso.',
                    usuario: {
                        id: usuario.id,
                        nome: usuario.nome,
                        email: usuario.email,
                        tipo: usuario.tipo
                    }
                });
            });
        });

    } catch (erro) {
        console.error('Erro no login:', erro);

        return res.status(500).json({
            erro: 'Não foi possível realizar o login.'
        });
    }
});

// CONSULTAR USUÁRIO CONECTADO
router.get('/me', async (req, res) => {
    try {
        if (!req.session.usuarioId) {
            return res.status(401).json({
                erro: 'Você não está autenticado.'
            });
        }

        const usuario = await prisma.usuario.findUnique({
            where: {
                id: req.session.usuarioId
            },
            select: {
                id: true,
                nome: true,
                email: true,
                tipo: true,
                ativo: true
            }
        });

        if (!usuario || !usuario.ativo) {
            return req.session.destroy(() => {
                res.clearCookie('atacado.sid');

                return res.status(401).json({
                    erro: 'Sessão inválida. Faça login novamente.'
                });
            });
        }

        return res.json({ usuario });

    } catch (erro) {
        console.error('Erro ao consultar usuário:', erro);

        return res.status(500).json({
            erro: 'Não foi possível consultar o usuário.'
        });
    }
});

// LOGOUT
router.post('/logout', (req, res) => {
    req.session.destroy(erro => {
        if (erro) {
            return res.status(500).json({
                erro: 'Não foi possível encerrar a sessão.'
            });
        }

        res.clearCookie('atacado.sid');

        return res.json({
            mensagem: 'Logout realizado com sucesso.'
        });
    });
});

module.exports = router;