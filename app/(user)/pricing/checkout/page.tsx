"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { toastApiFailure, toastApiResponse } from "@/lib/client/api-toast";
import { useUserProfile } from "@/components/providers/UserProfileProvider";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_")
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function StripePaymentForm({ planType, paymentIntentId, onCancel, onPaymentSubmitted, confirmingPayment, confirmationMessage, onRetryConfirmation }: {
  planType: string;
  paymentIntentId: string;
  onCancel: () => Promise<void>;
  onPaymentSubmitted: (id: string) => void;
  confirmingPayment: boolean;
  confirmationMessage: string | null;
  onRetryConfirmation: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function handleCancel() {
    setProcessing(true);
    try {
      await onCancel();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel payment");
    } finally {
      setProcessing(false);
    }
  }

  async function handleStripeSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/pricing/checkout?plan=${planType}&payment=stripe` },
      redirect: "if_required",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Payment could not be completed.");
      setProcessing(false);
      return;
    }
    setCompleted(true);
    onPaymentSubmitted(result.paymentIntent?.id ?? paymentIntentId);
  }

  if (completed) {
    return (
      <div className="space-y-3 text-gray-800">
        <p>{confirmingPayment ? "Payment submitted. Waiting for server confirmation…" : confirmationMessage ?? "Payment submitted."}</p>
        {!confirmingPayment && confirmationMessage && (
          <button type="button" onClick={onRetryConfirmation} className="text-indigo-700 underline">Check confirmation again</button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleStripeSubmit} className="space-y-5">
      <PaymentElement />
      <button type="submit" disabled={!stripe || processing} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold disabled:opacity-50">
        {processing ? "Processing payment..." : "Pay with Stripe"}
      </button>
      <button type="button" onClick={handleCancel} disabled={processing} className="w-full px-6 py-2 text-gray-600 underline disabled:opacity-50">Cancel payment</button>
    </form>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh: refreshProfile } = useUserProfile({ loadOnMount: false });
  const planType = searchParams.get("plan");

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(
    null
  );
  const [paymentMethod, setPaymentMethod] = useState<"BANK_TRANSFER" | "STRIPE">(() =>
    searchParams.get("payment") === "stripe" ? "STRIPE" : "BANK_TRANSFER"
  );
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const returnedFromStripe = searchParams.get("payment") === "stripe";
  const stripeReturnStatus = searchParams.get("redirect_status");
  const returnedPaymentIntentId = searchParams.get("payment_intent");

  const [formData, setFormData] = useState({
    transactionReference: "",
    notes: "",
  });

  const PlanDetails: Record<
    string,
    { name: string; price: string; amount: number }
  > = {
    MONTHLY: { name: "Monthly Plan", price: "$9.99/month", amount: 9.99 },
    YEARLY: { name: "Yearly Plan", price: "$60/year ($5/mo)", amount: 60.0 },
    LIFETIME: {
      name: "Lifetime Plan",
      price: "$129.99 one-time",
      amount: 129.99,
    },
  };

  const selectedPlan = planType
    ? PlanDetails[planType as keyof typeof PlanDetails]
    : null;

  const verifyStripePayment = useCallback(async (paymentIntentId: string) => {
    setConfirmingPayment(true);
    setConfirmationMessage(null);
    try {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const response = await fetch(
          `/api/subscription/stripe/status?paymentIntentId=${encodeURIComponent(paymentIntentId)}`,
          { cache: "no-store" }
        );
        const data = await response.json();
        if (response.ok && data.paymentStatus === "SUCCEEDED") {
          await refreshProfile();
          window.location.assign("/dashboard?subscription=updated");
          return;
        }
        if (response.ok && data.paymentStatus === "FAILED") {
          const message = "Stripe reported that this payment was unsuccessful. You can try again with a new payment method.";
          setConfirmationMessage(message);
          toast.error(message);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
      const message = "Payment confirmation is taking longer than expected. Check that Stripe webhook forwarding is running, then check again.";
      setConfirmationMessage(message);
      toast.error(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not confirm the payment yet.";
      setConfirmationMessage(message);
      toast.error(message);
    } finally {
      setConfirmingPayment(false);
    }
  }, [refreshProfile]);

  useEffect(() => {
    if (returnedFromStripe && stripeReturnStatus === "succeeded" && returnedPaymentIntentId) {
      void verifyStripePayment(returnedPaymentIntentId);
    } else if (returnedFromStripe && stripeReturnStatus === "failed") {
      toast.error("Stripe could not complete the payment. Please try again.");
      setPaymentMethod("BANK_TRANSFER");
      router.replace(`/pricing/checkout?plan=${encodeURIComponent(planType ?? "")}`);
    }
  }, [returnedFromStripe, stripeReturnStatus, returnedPaymentIntentId, verifyStripePayment, router, planType]);

  const cancelStripePayment = async () => {
    if (!stripeClientSecret) return;
    const paymentIntentId = stripeClientSecret.split("_secret_")[0];
    const response = await fetch("/api/subscription/stripe/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not cancel payment");
    toast.success(data.discarded ? "Payment canceled. The unpaid attempt was removed." : "Payment canceled. The failed attempt remains in payment history.");
    setStripeClientSecret(null);
    setPaymentMethod("BANK_TRANSFER");
  };

  useEffect(() => {
    if (paymentMethod !== "STRIPE" || !planType || stripeClientSecret || returnedFromStripe) return;
    setLoadingStripe(true);
    fetch("/api/subscription/stripe/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planType }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not start Stripe payment");
        setStripeClientSecret(data.clientSecret);
      })
      .catch((error) => toast.error(error.message ?? "Could not start Stripe payment"))
      .finally(() => setLoadingStripe(false));
  }, [paymentMethod, planType, stripeClientSecret, returnedFromStripe]);

  useEffect(() => {
    if (!planType || !selectedPlan) {
      router.push("/pricing");
    }
  }, [planType, selectedPlan, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less then 5MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      setPaymentProofFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!selectedPlan) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === "STRIPE") return;
    const proofFile = paymentProofFile;
    if (!proofFile) {
      toast.error("Please upload payment proof");
      return;
    }

    setSubmitting(true);

    try {
      // upload payment proof file
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append("file", proofFile, proofFile.name);
      uploadFormData.append("type", "payment_proof");

      const uploadResponse = await fetch("/api/admin/upload", {
        method: "POST",
        body: uploadFormData,
      });

      await toastApiResponse(uploadResponse, {
        success: "Payment proof uploaded.",
        error: "Failed to upload payment proof.",
      });

      if (!uploadResponse.ok) {
        setSubmitting(false);
        setUploading(false);
        return;
      }

      const uploadData = await uploadResponse.json();
      setUploading(false);

      /// Create subscription order data
      const orderResponse = await fetch("/api/subscription/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType: planType,
          amount: selectedPlan?.amount,
          paymentProofUrl: uploadData.url,
          transactionReference: formData.transactionReference,
          notes: formData.notes,
        }),
      });

      await toastApiResponse(orderResponse, {
        success: "Payment submitted successfully. Our team will review your order.",
        error: "Failed to create order.",
      });

      if (!orderResponse.ok) {
        setSubmitting(false);
        return;
      }
      router.push("/dashboard");
    } catch (error) {
      toastApiFailure(error, "Checkout could not be completed.");
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Complete Your Purchase
          </h1>
          <p className="text-gray-600 mt-2">
            Follow the steps below to upgrade your subscription
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Order Summary
              </h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-semibold text-gray-900">
                    {selectedPlan.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price</span>
                  <span className="font-semibold text-gray-900">
                    {selectedPlan.price}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-2xl text-indigo-600">
                    ${selectedPlan.amount}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-semibold mb-2">
                  What happens next?
                </p>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Complete bank transfer</li>
                  <li>Upload payment proof</li>
                  <li>Admin reviews within 24h</li>
                  <li>Account activated</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Right Column - Payment Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Choose payment method</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={() => setPaymentMethod("STRIPE")} className={`flex-1 rounded-lg border p-4 text-left ${paymentMethod === "STRIPE" ? "border-indigo-600 bg-indigo-50" : "border-gray-300"}`}>
                  <span className="block text-blue-400 font-semibold">Pay by card with Stripe</span>
                  <span className="text-sm text-gray-600">Secure test payment</span>
                </button>
                <button type="button" disabled={returnedFromStripe || confirmingPayment} onClick={async () => {
                  if (paymentMethod === "STRIPE" && stripeClientSecret) {
                    try {
                      await cancelStripePayment();
                      return;
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Could not cancel payment");
                      return;
                    }
                  }
                  setPaymentMethod("BANK_TRANSFER");
                }} className={`flex-1 rounded-lg border p-4 text-left disabled:opacity-50 ${paymentMethod === "BANK_TRANSFER" ? "border-indigo-600 bg-indigo-50" : "border-gray-300"}`}>
                  <span className="block text-blue-400 font-semibold">Bank transfer</span>
                  <span className="text-sm text-gray-600">Upload your receipt for admin review</span>
                </button>
              </div>
            </div>

            {paymentMethod === "STRIPE" ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Pay securely with Stripe</h2>
                {returnedFromStripe ? (
                  <div className="space-y-3">
                    <p className={stripeReturnStatus === "failed" ? "text-red-600" : "text-gray-700"}>
                      {stripeReturnStatus === "failed"
                        ? "The Stripe payment was not completed. You can return to pricing and try again."
                        : confirmingPayment
                          ? "Payment received by Stripe. Waiting for server confirmation…"
                          : confirmationMessage ?? "Stripe returned your payment. Subscription activation will follow after server confirmation."}
                    </p>
                    {returnedPaymentIntentId && !confirmingPayment && stripeReturnStatus !== "failed" && (
                      <button type="button" onClick={() => void verifyStripePayment(returnedPaymentIntentId)} className="px-4 py-2 text-indigo-700 underline">Check confirmation again</button>
                    )}
                  </div>
                ) : !stripePromise ? (
                  <p className="text-red-600">Stripe is not configured. Add the publishable key to enable test payments.</p>
                ) : loadingStripe ? (
                  <p className="text-gray-600">Preparing secure payment form...</p>
                ) : stripeClientSecret ? (
                  <Elements stripe={stripePromise} options={{
                    clientSecret: stripeClientSecret,
                    appearance: { variables: { colorText: "#111827", colorTextSecondary: "#374151" } },
                  }}>
                    <StripePaymentForm
                      planType={planType!}
                      paymentIntentId={stripeClientSecret.split("_secret_")[0]}
                      onCancel={cancelStripePayment}
                      onPaymentSubmitted={(paymentIntentId) => void verifyStripePayment(paymentIntentId)}
                      confirmingPayment={confirmingPayment}
                      confirmationMessage={confirmationMessage}
                      onRetryConfirmation={() => void verifyStripePayment(stripeClientSecret.split("_secret_")[0])}
                    />
                  </Elements>
                ) : (
                  <p className="text-red-600">Could not initialize Stripe payment. Refresh or choose bank transfer.</p>
                )}
              </div>
            ) : <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bank Details */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Step 1: Bank Transfer Details
                </h2>
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="font-semibold">Bank Name:</span>
                    <span>BookStore International Bank</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Account Name:</span>
                    <span>BookStore LLC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Account Number:</span>
                    <span className="font-mono">1234567890</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Routing Number:</span>
                    <span className="font-mono">987654321</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">SWIFT Code:</span>
                    <span className="font-mono">BKWSUS33</span>
                  </div>
                  <div className="border-t border-white/20 pt-3 flex justify-between">
                    <span className="font-semibold">Amount to Transfer:</span>
                    <span className="text-2xl font-bold">
                      ${selectedPlan.amount} USD
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Please make the transfer and keep the receipt/screenshot for
                  upload in the next step.
                </p>
              </div>

              {/* Upload Payment Proof */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Step 2: Upload Payment Proof
                </h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Screenshot/Receipt *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="payment-proof"
                      required
                    />
                    <label htmlFor="payment-proof" className="cursor-pointer">
                      {paymentProofPreview ? (
                        <div>
                          <img
                            src={paymentProofPreview}
                            alt="Payment proof"
                            className="max-h-64 mx-auto rounded-lg mb-3"
                          />
                          <p className="text-sm text-gray-600">
                            Click to change image
                          </p>
                        </div>
                      ) : (
                        <div>
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                          >
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <p className="mt-2 text-sm text-gray-600">
                            Click to upload payment proof
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG, JPG up to 5MB
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction Reference Number
                  </label>
                  <input
                    type="text"
                    name="transactionReference"
                    value={formData.transactionReference}
                    onChange={handleChange}
                    placeholder="e.g., TXN123456789"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Reference number from your bank transfer
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Any additional information..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => router.push("/pricing")}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                  disabled={submitting || uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading || !paymentProofFile}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading
                    ? "Uploading..."
                    : submitting
                    ? "Submitting"
                    : "Submit Payment"}
                </button>
              </div>
            </form>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-xl text-gray-600">Loading...</div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
