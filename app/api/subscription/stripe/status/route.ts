import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { synchronizeStripePayment } from "@/lib/subscription-payments";
import { getStripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.string().startsWith("pi_");

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const paymentIntentId = schema.safeParse(request.nextUrl.searchParams.get("paymentIntentId"));
    if (!paymentIntentId.success) return NextResponse.json({ error: "Invalid payment intent" }, { status: 400 });

    const transaction = await prisma.paymentTransaction.findFirst({
      where: { stripePaymentIntentId: paymentIntentId.data, userId: session.user.id },
      select: { stripePaymentIntentId: true },
    });
    if (!transaction) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    const intent = await getStripe().paymentIntents.retrieve(paymentIntentId.data);
    const paymentStatus = await synchronizeStripePayment(intent);
    return NextResponse.json({ paymentStatus }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error fetching Stripe payment status", error);
    return NextResponse.json({ error: "Could not check payment status" }, { status: 500 });
  }
}
