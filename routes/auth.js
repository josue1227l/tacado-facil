const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

const router = express.Router();

// Cadastro de cliente
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

        res.status(201).json({
            mensagem: 'Cadastro realizado com sucesso.',
            usuario
        });
    } catch (erro) {
        console.error('Erro no cadastro:', erro);

        res.status(500).json({
            erro: 'Não foi possível realizar o cadastro.'
        });
    }
});

// Login
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

        // Cria uma nova sessão após autenticar
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

                res.json({
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

        res.status(500).json({
            erro: 'Não foi possível realizar o login.'
        });
    }
});

// Consultar usuário conectado
router.get('/me', async (req, res) => {
    try {
        if (!req.session.usuarioId) {
            return res.status(401).json({
                erro: 'Você não está autenticado.'
            });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { id: req.session.usuarioId },
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
                res.status(401).json({
                    erro: 'Sessão inválida. Faça login novamente.'
                });
            });
        }

        res.json({ usuario });
    } catch (erro) {
        res.status(500).json({
            erro: 'Não foi possível consultar o usuário.'
        });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy(erro => {
        if (erro) {
            return res.status(500).json({
                erro: 'Não foi possível encerrar a sessão.'
            });
        }

        res.clearCookie('atacado.sid');

        res.json({
            mensagem: 'Logout realizado com sucesso.'
        });
    });
});

module.exports = router;