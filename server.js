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

const PORTA = process.env.PORT || 3000;
const PRODUCAO = process.env.NODE_ENV === 'production';

// Configurações de produção
if (PRODUCAO) {
    app.set('trust proxy', 1);

    if (!process.env.SESSION_SECRET) {
        throw new Error('SESSION_SECRET não foi configurado.');
    }

    if (!process.env.NEON_DATABASE_URL) {
        throw new Error('NEON_DATABASE_URL não foi configurado.');
    }
}

// Configurações do Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Armazenamento persistente das sessões em produção
let armazenamentoSessoes;

if (PRODUCAO) {
    const { Pool } = require('pg');
    const PgSession = require('connect-pg-simple')(session);

    const pool = new Pool({
        connectionString: process.env.NEON_DATABASE_URL
    });

    armazenamentoSessoes = new PgSession({
        pool,
        createTableIfMissing: true,
        tableName: 'session'
    });

    pool.on('error', (erro) => {
        console.error('Erro no banco de sessões:', erro);
    });
}

// Configuração da sessão
const configuracaoSessao = {
    name: 'atacado.sid',
    secret: process.env.SESSION_SECRET || 'segredo-local-apenas-desenvolvimento',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: PRODUCAO,
        maxAge: 1000 * 60 * 60 * 8
    }
};

if (armazenamentoSessoes) {
    configuracaoSessao.store = armazenamentoSessoes;
}

app.use(session(configuracaoSessao));

// Arquivos públicos
app.use(express.static(path.join(__dirname, 'public')));

// Rota para verificar se o servidor está funcionando
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'online',
        sistema: 'Atacado Fácil'
    });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/pedidos', pedidosRoutes);

// Página inicial
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Painel direcionado conforme o tipo de usuário
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

        if (usuario.tipo === 'FUNCIONARIO') {
            return res.sendFile(
                path.join(__dirname, 'views', 'funcionario.html')
            );
        }

        if (usuario.tipo === 'CLIENTE') {
            return res.sendFile(
                path.join(__dirname, 'views', 'cliente.html')
            );
        }

        return res.status(403).send('Tipo de usuário não autorizado.');

    } catch (erro) {
        console.error('Erro ao abrir painel:', erro);

        return res.status(500).send(
            'Erro ao abrir o painel do sistema.'
        );
    }
});

// Inicialização do servidor
async function iniciarServidor() {
    try {
        await prisma.$connect();

        app.listen(PORTA, () => {
            console.log(`Atacado Fácil rodando na porta ${PORTA}`);
            console.log(
                `Ambiente: ${PRODUCAO ? 'Produção' : 'Desenvolvimento'}`
            );
        });

    } catch (erro) {
        console.error('Erro ao conectar ao banco de dados:', erro);
        process.exit(1);
    }
}

iniciarServidor();