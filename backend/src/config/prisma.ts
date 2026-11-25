import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { env } from "./env";
import { poolConfig } from "./poolConfig";

// Prisma 7 connects through a driver adapter, not through schema.prisma.
const adapter = new PrismaPg(
  poolConfig(env.DATABASE_URL, env.DATABASE_CA_CERT),
);

export const prisma = new PrismaClient({ adapter });
