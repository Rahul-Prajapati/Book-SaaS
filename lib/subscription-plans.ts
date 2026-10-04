import type { PlanType } from "@prisma/client";

export const subscriptionPlanPrices: Record<PlanType, { amount: number; decimal: string; label: string }> = {
  MONTHLY: { amount: 999, decimal: "9.99", label: "Monthly subscription" },
  YEARLY: { amount: 6000, decimal: "60.00", label: "Yearly subscription" },
  LIFETIME: { amount: 12999, decimal: "129.99", label: "Lifetime access" },
};

const tierRank: Record<string, number> = {
  FREE: 0,
  MONTHLY: 1,
  YEARLY: 2,
  LIFETIME: 3,
};

export function getPlanChangeError(
  currentTier: string,
  subscriptionStatus: string,
  requestedPlan: string
): string | null {
  if (subscriptionStatus !== "ACTIVE") return null;

  if (currentTier === "LIFETIME") return "You already have lifetime access.";
  if (requestedPlan === currentTier) return "You already have this plan active.";
  if ((tierRank[requestedPlan] ?? -1) <= (tierRank[currentTier] ?? -1)) {
    return `Your active ${currentTier.toLowerCase()} plan is higher. Choose a higher plan to upgrade.`;
  }

  return null;
}

export function getSubscriptionEndDate(planType: PlanType, startDate: Date) {
  if (planType === "MONTHLY") {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  }
  if (planType === "YEARLY") {
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    return endDate;
  }
  return null;
}
