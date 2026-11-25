require('dotenv').config();

const sqlite = require('../lib/prisma');
const { PrismaClient } = require('../generated/postgres');

const postgres = new PrismaClient();

async function main() {
    try {
        console.log('Verificando os bancos...');

        const tabelas = [
            'usuario',
            'categoria',
            'produto',
            'pedido',
            'itemPedido'
        ];

        // Impede duplicação caso a transferência já tenha sido feita.
        for (const tabela of tabelas) {
            const quantidade = await postgres[tabela].count();

            if (quantidade > 0) {
                throw new Error(
                    `A tabela ${tabela} já possui ${quantidade} registros. Transferência cancelada.`
                );
            }
        }

        console.log('Lendo dados do SQLite...');

        // Leitura dos dados originais.
        const usuarios = await sqlite.usuario.findMany();
        const categorias = await sqlite.categoria.findMany();
        const produtos = await sqlite.produto.findMany();
        const pedidos = await sqlite.pedido.findMany();
        const itens = await sqlite.itemPedido.findMany();

        console.log('Iniciando transferência...');

        // Ordem respeita os relacionamentos entre as tabelas.
        await postgres.$transaction(async (tx) => {
            if (usuarios.length) {
                await tx.usuario.createMany({ data: usuarios });
            }

            if (categorias.length) {
                await tx.categoria.createMany({ data: categorias });
            }

            if (produtos.length) {
                await tx.produto.createMany({ data: produtos });
            }

            if (pedidos.length) {
                await tx.pedido.createMany({ data: pedidos });
            }

            if (itens.length) {
                await tx.itemPedido.createMany({ data: itens });
            }
        });

        // Ajusta as sequências automáticas dos IDs no PostgreSQL.
        const nomes = [
            'Usuario',
            'Categoria',
            'Produto',
            'Pedido',
            'ItemPedido'
        ];

        for (const nome of nomes) {
            await postgres.$queryRawUnsafe(`
                SELECT setval(
                    pg_get_serial_sequence('"${nome}"', 'id'),
                    COALESCE(MAX("id"), 1),
                    COUNT(*) > 0
                )
                FROM "${nome}"
            `);
        }

        console.log('\nTRANSFERÊNCIA CONCLUÍDA!');
        console.log('Usuários:', usuarios.length);
        console.log('Categorias:', categorias.length);
        console.log('Produtos:', produtos.length);
        console.log('Pedidos:', pedidos.length);
        console.log('Itens dos pedidos:', itens.length);

    } catch (erro) {
        console.error('\nERRO NA TRANSFERÊNCIA:');
        console.error(erro);
        process.exitCode = 1;

    } finally {
        await sqlite.$disconnect();
        await postgres.$disconnect();
    }
}

main();