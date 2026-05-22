import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { UserRole, SubscriptionTier  } from "@/src/generated/enums";

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma), 
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
        error: "/login"
    },
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email"},
                password: { label: "Password", type: "password"},
            },
            async authorize(credentials){
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password is required");
                }
        /// Find user in database 
        const user = await prisma.user.findUnique({
            where : {
                email: credentials.email as string,
            },
        });

        if (!user || !user.passwordHash) {
            throw new Error("Invalid email or password");
        }
        /// Verify password 
        const isPasswordVaild = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
        );

        if (!isPasswordVaild) {
            throw new Error("Invalid email or password");
        }

        // Return user object 
        return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: user.role,
            subscriptionTier: user.subscriptionTier
             }; 
           },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.subscriptionTier = user.subscriptionTier;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as UserRole;
                session.user.subscriptionTier = token.subscriptionTier as SubscriptionTier;
            }
            return session;
        },
    } ,
});