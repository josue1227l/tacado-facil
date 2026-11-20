require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const prisma = require('./lib/prisma');

const pedidosRoutes = require('./routes/pedidos');
const produtosRoutes = require('./routes/produtos');
const categoriasRoutes = require('./routes/categorias');
const authRoutes = require('./routes/auth');

const app = express();
const PORTA = 3000;

// Configurações do Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração de sessão
app.use(session({
    name: 'atacado.sid',
    secret: process.env.SESSION_SECRET || 'segredo-local-apenas-desenvolvimento',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60 * 8
    }
}));

// Arquivos públicos
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/pedidos', pedidosRoutes);

// Tela inicial da Feira
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'feira.html'));
});

// Entrada alternativa da Feira
app.get('/feira', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'feira.html'));
});

// Login e cadastro
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Painel: direciona conforme o tipo de usuário
app.get('/painel', async (req, res) => {
    try {
        if (!req.session.usuarioId) {
            return res.redirect('/login');
        }

        const usuario = await prisma.usuario.findUnique({
            where: {
                id: req.session.usuarioId
            },
            select: {
                id: true,
                tipo: true,
                ativo: true
            }
        });

        if (!usuario || !usuario.ativo) {
            return req.session.destroy(() => {
                res.clearCookie('atacado.sid');
                res.redirect('/login');
            });
        }

        if (usuario.tipo === 'ADMIN') {
            return res.sendFile(
                path.join(__dirname, 'views', 'index.html')
            );
        }

        return res.sendFile(
            path.join(__dirname, 'views', 'cliente.html')
        );

    } catch (erro) {
        console.error('Erro ao abrir painel:', erro);
        res.status(500).send('Erro ao abrir o painel do sistema.');
    }
});

// Página da demonstração
app.get('/demonstracao', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'demonstracao.html'));
});

// Inicialização do servidor
app.listen(PORTA, () => {
    console.log(`Atacado Fácil rodando em http://localhost:${PORTA}`);
});