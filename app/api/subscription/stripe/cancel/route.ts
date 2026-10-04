import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { synchronizeStripePayment } from "@/lib/subscription-payments";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ paymentIntentId: z.string().startsWith("pi_") });

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid payment intent" }, { status: 400 });
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { stripePaymentIntentId: parsed.data.paymentIntentId },
      select: { id: true, userId: true, paymentStatus: true },
    });
    if (!transaction || transaction.userId !== session.user.id) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    if (transaction.paymentStatus === "SUCCEEDED" || transaction.paymentStatus === "REFUNDED") {
      return NextResponse.json({ error: "This payment can no longer be canceled" }, { status: 400 });
    }

    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(parsed.data.paymentIntentId);
    if (intent.status === "succeeded") {
      await synchronizeStripePayment(intent);
      return NextResponse.json({ error: "This payment already succeeded. Your subscription is being confirmed." }, { status: 409 });
    }

    const canceledIntent = intent.status === "canceled"
      ? intent
      : await stripe.paymentIntents.cancel(parsed.data.paymentIntentId, {
        cancellation_reason: "requested_by_customer",
      });
    const finalStatus = await synchronizeStripePayment(canceledIntent, "payment_intent.canceled");

    return NextResponse.json({ canceled: true, discarded: finalStatus === null });
  } catch (error) {
    console.error("Error canceling Stripe payment", error);
    return NextResponse.json({ error: "Could not cancel this payment" }, { status: 400 });
  }
}
