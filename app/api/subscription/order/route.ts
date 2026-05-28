import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, {status: 401});
        }

    // Get users subscription orders data 
    const orders = await prisma.subscriptionOrder.findMany({
        where: {
            userId: session.user.id, 
        },
        orderBy: {
            createdAt: "desc",
        },        
    }); 
    
    return NextResponse.json(orders);  

    } catch (error) {
        console.error("Error fetching subscripton orders", error);
        return NextResponse.json(
            {error: "Failed to fetch subscripton orders"},
            {status: 500}
        );
    }
}