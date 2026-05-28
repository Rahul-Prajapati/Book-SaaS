import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, {status: 401});
        }

    // Fetch fresh user data from database 
    const user = await prisma.user.findUnique({
        where: {
            id: session.user.id, 
        },
        select: {
            id: true,
            email: true,
            fullName: true,
            subscriptionTier: true,
            subscriptionStatus: true,
            subscriptionStartDate: true,
            subscriptionEndDate: true,
            audioListenTime: true,
            createdAt:true,
        }
    });

    if (!user) {
       return NextResponse.json({ error: "User not found" }, {status: 404});
    } 
    return NextResponse.json(user);        
    } catch (error) {
        console.error("Error fetching user profile", error);
        return NextResponse.json(
            {error: "Failed to fetch user profile"},
            {status: 500}
        );
    }
}