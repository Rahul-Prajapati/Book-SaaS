import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanChangeError, getSubscriptionEndDate } from "@/lib/subscription-plans";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const approveSchema = z.object({
  action: z.enum(["APPROVED", "REJECT"]),
  rejectedReason: z.string().optional(),
  notes: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validation request from body
    const validation = approveSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Get the order data from subscription order table
    const order = await prisma.subscriptionOrder.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Oder not found" }, { status: 404 });
    }

    if (order.orderStatus !== "PENDING") {
      return NextResponse.json(
        { error: "This order has already been processed" },
        { status: 400 }
      );
    }

    if (data.action === "APPROVED") {
      const now = new Date();
      const approvalError = await prisma.$transaction(async (tx) => {
        const currentUser = await tx.user.findUnique({ where: { id: order.userId } });
        if (!currentUser) return "User not found";
        const planError = getPlanChangeError(
          currentUser.subscriptionTier,
          currentUser.subscriptionStatus,
          order.planType
        );
        if (planError) return planError;

        const updated = await tx.subscriptionOrder.updateMany({
          where: { id: order.id, orderStatus: "PENDING" },
          data: {
            orderStatus: "APPROVED",
            approvedBy: session.user.id,
            approvedAt: now,
            notes: data.notes || null,
          },
        });
        if (updated.count === 0) return "This order has already been processed";

        await tx.user.update({
          where: { id: order.userId },
          data: {
            subscriptionTier: order.planType,
            subscriptionStatus: "ACTIVE",
            subscriptionStartDate: now,
            subscriptionEndDate: getSubscriptionEndDate(order.planType, now),
          },
        });
        return null;
      });
      if (approvalError) return NextResponse.json({ error: approvalError }, { status: 409 });

      return NextResponse.json({
        message: "Subscription approved and activated successfully",
      });
    } else {
      // Reject
      await prisma.subscriptionOrder.update({
        where: { id: parseInt(id) },
        data: {
          orderStatus: "REJECTED",
          rejectedReason: data.rejectedReason || "Payment verification failed",
          notes: data.notes || null,
        },
      });

      return NextResponse.json({
        message: "Subscription order rejected",
      });
    }
  } catch (error) {
    console.error("Error processing subscription order", error);
  }
}
