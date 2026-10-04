import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured");
  if (!secretKey.startsWith("sk_test_")) throw new Error("Only Stripe test mode keys are allowed for this payment flow");
  if (!stripeClient) stripeClient = new Stripe(secretKey);
  return stripeClient;
}

