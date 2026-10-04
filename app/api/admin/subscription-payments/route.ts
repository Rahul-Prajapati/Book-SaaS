import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reconcilePendingStripePayments } from "@/lib/subscription-payments";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get("status");
    if (status && !["SUCCEEDED", "FAILED", "PENDING", "ALL"].includes(status)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }

    try {
      await reconcilePendingStripePayments();
    } catch (error) {
      console.error("Could not reconcile pending Stripe payments", error);
    }

    const paymentStatus = status === "SUCCEEDED" || status === "FAILED" || status === "PENDING" ? status : undefined;
    const [payments, manualTotal, pending, approved, rejected, stripeSucceeded, stripeFailed, stripePending] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where: paymentStatus
          ? { paymentStatus, stripePaymentIntentId: { not: null } }
          : { paymentStatus: { in: ["SUCCEEDED", "FAILED", "PENDING"] }, stripePaymentIntentId: { not: null } },
        include: { user: { select: { id: true, email: true, fullName: true, subscriptionTier: true, subscriptionStatus: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.subscriptionOrder.count(),
      prisma.subscriptionOrder.count({ where: { orderStatus: "PENDING" } }),
      prisma.subscriptionOrder.count({ where: { orderStatus: "APPROVED" } }),
      prisma.subscriptionOrder.count({ where: { orderStatus: "REJECTED" } }),
      prisma.paymentTransaction.count({ where: { paymentStatus: "SUCCEEDED", stripePaymentIntentId: { not: null } } }),
      prisma.paymentTransaction.count({ where: { paymentStatus: "FAILED", stripePaymentIntentId: { not: null } } }),
      prisma.paymentTransaction.count({ where: { paymentStatus: "PENDING", stripePaymentIntentId: { not: null } } }),
    ]);

    return NextResponse.json({
      payments,
      counts: {
        total: manualTotal + stripeSucceeded,
        pending,
        approved: approved + stripeSucceeded,
        rejected,
        stripeSucceeded,
        stripeFailed,
        stripePending,
      },
    });
  } catch (error) {
    console.error("Error fetching admin subscription payments", error);
    return NextResponse.json({ error: "Failed to fetch subscription payments" }, { status: 500 });
  }
}
