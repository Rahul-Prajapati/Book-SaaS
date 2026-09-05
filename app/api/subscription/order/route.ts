import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const orderSchema = z.object({
  planType: z.enum(["MONTHLY", "YEARLY", "LIFETIME"]),
  amount: z.number().positive(),
  paymentProofUrl: z.string().min(1),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();

    /// Validate request body
    const validation = orderSchema.safeParse(body);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message;
        }
      });
      return NextResponse.json(
        { error: "Vlaidation filed", errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if user already has a pending order or not
    const pendingOrder = await prisma.subscriptionOrder.findFirst({
      where: {
        userId: session.user.id,
        orderStatus: "PENDING",
      },
    });

    if (pendingOrder) {
      return NextResponse.json(
        { error: "You already have a pending subscription order" },
        { status: 400 }
      );
    }

    // Store data in subscription order table
    const order = await prisma.subscriptionOrder.create({
      data: {
        userId: session.user.id,
        planType: data.planType,
        amount: data.amount,
        currency: "USD",
        paymentMethod: "BANK_TRANSFER",
        paymentProofUrl: data.paymentProofUrl,
        transactionReference:
          data.transactionReference && data.transactionReference.trim() !== ""
            ? data.transactionReference
            : null,
        notes: data.notes && data.notes.trim() !== "" ? data.notes : null,
        orderStatus: "PENDING",
      },
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating subscription order", error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      { error: "Failed to fetch subscripton orders" },
      { status: 500 }
    );
  }
}
