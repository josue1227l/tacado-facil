require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    const caminhoCatalogo = path.join(__dirname, 'catalogo-inicial.json');

    if (!fs.existsSync(caminhoCatalogo)) {
        throw new Error('Arquivo catalogo-inicial.json não encontrado.');
    }

    const catalogo = JSON.parse(
        fs.readFileSync(caminhoCatalogo, 'utf8')
    );

    await prisma.$transaction(async (tx) => {
        const categoriasMapeadas = new Map();

        for (const categoria of catalogo.categorias) {
            const categoriaSalva = await tx.categoria.upsert({
                where: { nome: categoria.nome },
                create: {
                    nome: categoria.nome,
                    descricao: categoria.descricao
                },
                update: {
                    descricao: categoria.descricao
                }
            });

            categoriasMapeadas.set(categoria.id, categoriaSalva.id);
        }

        for (const produto of catalogo.produtos) {
            const categoriaId = categoriasMapeadas.get(produto.categoriaId);

            if (!categoriaId) {
                throw new Error(
                    `Categoria não encontrada para o produto ${produto.nome}`
                );
            }

            const dadosProduto = {
                nome: produto.nome,
                descricao: produto.descricao,
                codigo: produto.codigo,
                preco: produto.preco,
                estoqueMinimo: produto.estoqueMinimo,
                unidade: produto.unidade,
                ativo: produto.ativo,
                imagem: produto.imagem,
                categoriaId
            };

            await tx.produto.upsert({
                where: { codigo: produto.codigo },
                create: {
                    ...dadosProduto,
                    estoque: produto.estoque
                },
                update: dadosProduto
            });
        }
    });

    console.log('Catálogo importado com sucesso!');
    console.log(`Categorias processadas: ${catalogo.categorias.length}`);
    console.log(`Produtos processados: ${catalogo.produtos.length}`);
}

main()
    .catch((erro) => {
        console.error('Erro ao importar catálogo:', erro);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
