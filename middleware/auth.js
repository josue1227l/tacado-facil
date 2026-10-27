const prisma = require('../lib/prisma');

// Verifica se o usuário está conectado
async function requireLogin(req, res, next) {
    try {
        if (!req.session || !req.session.usuarioId) {
            return res.status(401).json({
                erro: 'Você precisa entrar na sua conta para continuar.'
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
            return res.status(401).json({
                erro: 'Sua sessão expirou. Entre novamente.'
            });
        }

        // Disponibiliza os dados do usuário para as rotas
        req.usuario = usuario;

        next();
    } catch (erro) {
        console.error('Erro na autenticação:', erro);

        return res.status(500).json({
            erro: 'Erro interno ao verificar a autenticação.'
        });
    }
}

// Verifica se o usuário é administrador
async function requireAdmin(req, res, next) {
    try {
        await requireLogin(req, res, () => {
            if (req.usuario.tipo !== 'ADMIN') {
                return res.status(403).json({
                    erro: 'Acesso permitido somente para administradores.'
                });
            }

            next();
        });
    } catch (erro) {
        console.error('Erro ao verificar administrador:', erro);

        return res.status(500).json({
            erro: 'Não foi possível verificar as permissões.'
        });
    }
}

module.exports = {
    requireLogin,
    requireAdmin
};