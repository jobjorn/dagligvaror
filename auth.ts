import { PrismaClient } from "@prisma/client";
import NextAuth, { type DefaultSession } from "next-auth";

const prisma = new PrismaClient();

// Relevant documentation: https://authjs.dev/getting-started/typescript
declare module "next-auth" {
  interface Session {
    user: {
      accessToken: string;
      databaseNumber: number;
      companyName: string;
    } & DefaultSession["user"];
  }
}
