import { getStripe } from "@/lib/stripe";
import { synchronizeStripePayment, type StripePaymentEvent } from "@/lib/subscription-payments";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const intent = event.data.object as Stripe.PaymentIntent;
  if (!["payment_intent.succeeded", "payment_intent.payment_failed", "payment_intent.canceled"].includes(event.type)) {
    return NextResponse.json({ received: true });
  }

  try {
    await synchronizeStripePayment(intent, event.type as StripePaymentEvent);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Stripe webhook", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
