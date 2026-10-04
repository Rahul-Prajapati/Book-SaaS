import { prisma } from "@/lib/prisma";
import { getPlanChangeError, getSubscriptionEndDate } from "@/lib/subscription-plans";
import { getStripe } from "@/lib/stripe";
import { PaymentStatus, Prisma } from "@prisma/client";
import Stripe from "stripe";

export type StripePaymentEvent =
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed"
  | "payment_intent.canceled";

export async function reconcilePendingStripePayments(userId?: string) {
  const pendingPayments = await prisma.paymentTransaction.findMany({
    where: {
      ...(userId ? { userId } : {}),
      paymentStatus: "PENDING",
      stripePaymentIntentId: { not: null },
    },
    select: { stripePaymentIntentId: true },
  });
  if (pendingPayments.length === 0) return;

  const stripe = getStripe();
  const results = await Promise.allSettled(pendingPayments.map(async ({ stripePaymentIntentId }) => {
    if (!stripePaymentIntentId) return;
    const intent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
    await synchronizeStripePayment(intent);
  }));
  results.forEach((result) => {
    if (result.status === "rejected") console.error("Could not reconcile pending Stripe payment", result.reason);
  });
}

export async function synchronizeStripePayment(
  intent: Stripe.PaymentIntent,
  eventType?: StripePaymentEvent
) {
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { stripePaymentIntentId: intent.id },
  });

  if (!transaction) {
    if (eventType === "payment_intent.succeeded") {
      throw new Error("Stripe payment transaction not found");
    }
    return null;
  }

  if (intent.metadata.userId !== transaction.userId || intent.metadata.planType !== transaction.planType) {
    throw new Error("Stripe payment metadata does not match its transaction");
  }

  const outcome = eventType === "payment_intent.succeeded" || intent.status === "succeeded"
    ? "SUCCEEDED"
    : eventType === "payment_intent.payment_failed" ||
        (intent.status === "requires_payment_method" && Boolean(intent.last_payment_error))
      ? "FAILED"
      : eventType === "payment_intent.canceled" || intent.status === "canceled"
        ? "CANCELED"
        : "PENDING";

  if (outcome === "SUCCEEDED") {
    const expectedAmount = Math.round(Number(transaction.amount) * 100);
    if (intent.amount_received !== expectedAmount || intent.currency.toUpperCase() !== transaction.currency) {
      throw new Error("Stripe payment amount or currency does not match its transaction");
    }

    if (transaction.paymentStatus !== "SUCCEEDED") {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.paymentTransaction.updateMany({
          where: { id: transaction.id, paymentStatus: { not: "SUCCEEDED" } },
          data: { paymentStatus: "SUCCEEDED" },
        });
        if (updated.count === 0) return;

        const user = await tx.user.findUnique({ where: { id: transaction.userId } });
        if (!user) throw new Error("Payment owner no longer exists");
        const planError = getPlanChangeError(user.subscriptionTier, user.subscriptionStatus, transaction.planType);
        const currentMetadata = typeof transaction.metadata === "object" && transaction.metadata !== null && !Array.isArray(transaction.metadata)
          ? transaction.metadata as Prisma.JsonObject
          : {};

        if (planError) {
          await tx.paymentTransaction.update({
            where: { id: transaction.id },
            data: { metadata: { ...currentMetadata, activationSkipped: planError } },
          });
          return;
        }

        const now = new Date();
        await tx.user.update({
          where: { id: transaction.userId },
          data: {
            subscriptionTier: transaction.planType,
            subscriptionStatus: "ACTIVE",
            subscriptionStartDate: now,
            subscriptionEndDate: getSubscriptionEndDate(transaction.planType, now),
          },
        });
      });
    }
    return "SUCCEEDED" as PaymentStatus;
  }

  if (outcome === "FAILED") {
    const detail = intent.last_payment_error?.message ?? "Payment failed";
    await prisma.paymentTransaction.updateMany({
      where: { id: transaction.id, paymentStatus: { not: "SUCCEEDED" } },
      data: {
        paymentStatus: "FAILED",
        metadata: {
          ...(typeof transaction.metadata === "object" && transaction.metadata !== null && !Array.isArray(transaction.metadata)
            ? transaction.metadata as Prisma.JsonObject
            : {}),
          failureDetail: detail,
        },
      },
    });
    return "FAILED" as PaymentStatus;
  }

  if (outcome === "CANCELED") {
    const priorFailure = Boolean(intent.last_payment_error);
    if (intent.cancellation_reason === "requested_by_customer" && !priorFailure) {
      await prisma.paymentTransaction.deleteMany({
        where: { id: transaction.id, paymentStatus: { not: "SUCCEEDED" } },
      });
      return null;
    }

    await prisma.paymentTransaction.updateMany({
      where: { id: transaction.id, paymentStatus: { not: "SUCCEEDED" } },
      data: {
        paymentStatus: "FAILED",
        metadata: {
          ...(typeof transaction.metadata === "object" && transaction.metadata !== null && !Array.isArray(transaction.metadata)
            ? transaction.metadata as Prisma.JsonObject
            : {}),
          failureDetail: intent.cancellation_reason
            ? `Payment was canceled by Stripe (${intent.cancellation_reason})`
            : "Payment was canceled by Stripe",
        },
      },
    });
    return "FAILED" as PaymentStatus;
  }

  return transaction.paymentStatus;
}
