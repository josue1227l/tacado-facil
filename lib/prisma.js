const { PrismaClient: SQLiteClient } = require('@prisma/client');
const { PrismaClient: PostgresClient } = require('../generated/postgres');

let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PostgresClient();
    console.log('Banco conectado: PostgreSQL');
} else {
    prisma = new SQLiteClient();
    console.log('Banco conectado: SQLite');
}

module.exports = prisma;