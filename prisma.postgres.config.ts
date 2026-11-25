import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.postgres.prisma",
  migrations: {
    path: "prisma/migrations-postgres",
  },
  engine: "classic",
  datasource: {
    url: env("NEON_DATABASE_URL"),
  },
});