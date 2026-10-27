require('dotenv').config();

const bcrypt = require('bcryptjs');
const prisma = require('./lib/prisma');

async function criarAdmin() {
    try {
        const nome = 'Administrador';
        const email = 'admin@atacado.com';
        const senha = 'Admin12345';

        const existente = await prisma.usuario.findUnique({
            where: { email }
        });

        if (existente) {
            const senhaHash = await bcrypt.hash(senha, 12);

            await prisma.usuario.update({
                where: { email },
                data: {
                    tipo: 'ADMIN',
                    ativo: true,
                    senha: senhaHash
                }
            });

            console.log('Conta de administrador atualizada.');
        } else {
            const senhaHash = await bcrypt.hash(senha, 12);

            await prisma.usuario.create({
                data: {
                    nome,
                    email,
                    senha: senhaHash,
                    tipo: 'ADMIN',
                    ativo: true
                }
            });

            console.log('Administrador criado com sucesso!');
        }

        console.log('E-mail: admin@atacado.com');
        console.log('Senha: Admin12345');
    } catch (erro) {
        console.error('Erro ao criar administrador:', erro);
    } finally {
        await prisma.$disconnect();
    }
}

criarAdmin();