import { DefaultSession } from "next-auth";
import { UserRole, SubscriptionTier  } from "@/src/generated/enums";
// import { UserRole, SubscriptionTier } from "@prisma/client";


declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: UserRole;
            subscriptionTier: SubscriptionTier;            
        } & DefaultSession["user"];
    }

    interface User {
        role: UserRole;
        subscriptionTier: SubscriptionTier;     
    }  
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: UserRole;
        subscriptionTier: SubscriptionTier;     
    }
}