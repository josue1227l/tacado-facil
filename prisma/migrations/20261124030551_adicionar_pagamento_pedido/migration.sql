-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "funcionarioId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "total" REAL NOT NULL DEFAULT 0,
    "formaPagamento" TEXT NOT NULL DEFAULT 'NAO_INFORMADO',
    "statusPagamento" TEXT NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("atualizadoEm", "criadoEm", "funcionarioId", "id", "status", "total", "usuarioId") SELECT "atualizadoEm", "criadoEm", "funcionarioId", "id", "status", "total", "usuarioId" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
