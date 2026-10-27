# Atacado Fácil

## Sobre o projeto
O **Atacado Fácil** é um sistema web de gestão de atacado desenvolvido com Node.js, Express, Prisma e SQLite. O sistema permite gerenciar produtos, categorias, estoque e pedidos.

## Funcionalidades
- Cadastro e autenticação de usuários.
- Gerenciamento de categorias e produtos.
- Controle de estoque.
- Realização e consulta de pedidos.
- Gerenciamento de pedidos pelo administrador.
- Ativação e desativação de produtos.

## Tecnologias utilizadas
- Node.js e Express
- Prisma ORM
- SQLite
- HTML, CSS e JavaScript
- Express Session e Bcryptjs

## Como executar
1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure o arquivo `.env`.

3. Prepare o banco de dados:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. Inicie o servidor:
   ```bash
   node server.js
   ```

5. Acesse `http://localhost:3000`.

## Integrantes
- Josué Carneiro de Vasconcelos Neto
- Álvaro

## Projeto acadêmico
Projeto desenvolvido em grupo para fins acadêmicos, com o objetivo de aplicar conhecimentos de desenvolvimento web, banco de dados, autenticação e operações CRUD.