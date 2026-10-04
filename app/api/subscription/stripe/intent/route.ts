import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getPlanChangeError, subscriptionPlanPrices } from "@/lib/subscription-plans";
import { reconcilePendingStripePayments } from "@/lib/subscription-payments";
import { PlanType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ planType: z.enum(["MONTHLY", "YEARLY", "LIFETIME"]) });

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    const planType = parsed.data.planType as PlanType;
    const existingUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!existingUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    await reconcilePendingStripePayments(existingUser.id);

    const user = await prisma.user.findUnique({ where: { id: existingUser.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const planError = getPlanChangeError(user.subscriptionTier, user.subscriptionStatus, planType);
    if (planError) return NextResponse.json({ error: planError }, { status: 400 });

    const [pendingOrder, pendingStripe] = await Promise.all([
      prisma.subscriptionOrder.findFirst({ where: { userId: user.id, orderStatus: "PENDING" } }),
      prisma.paymentTransaction.findFirst({
        where: { userId: user.id, paymentStatus: "PENDING", stripePaymentIntentId: { not: null } },
      }),
    ]);
    if (pendingOrder || pendingStripe) {
      return NextResponse.json({ error: "You already have a pending subscription payment. Complete or cancel it first." }, { status: 409 });
    }

    const price = subscriptionPlanPrices[planType];
    const intent = await getStripe().paymentIntents.create({
      amount: price.amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      receipt_email: user.email,
      description: price.label,
      metadata: { userId: user.id, planType },
    });

    await prisma.paymentTransaction.create({
      data: {
        userId: user.id,
        stripePaymentIntentId: intent.id,
        amount: price.decimal,
        currency: "USD",
        paymentStatus: "PENDING",
        planType,
        metadata: { planType, paymentMethod: "STRIPE" },
      },
    });

    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (error) {
    console.error("Error creating Stripe payment intent", error);
    return NextResponse.json({ error: "Could not start Stripe payment" }, { status: 500 });
  }
}
