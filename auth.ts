import { PrismaClient } from "@prisma/client";
import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

const prisma = new PrismaClient();

// Relevant documentation: https://authjs.dev/getting-started/typescript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // Add your authentication providers here
    // For now, we'll add a placeholder that you can configure later
  ],
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
        // You can add role logic here based on your database
        session.user.role = "USER";
      }
      return session;
    },
  },
});
