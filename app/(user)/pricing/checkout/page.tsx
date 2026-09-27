"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planType = searchParams.get("plan");

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(
    null
  );

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

    if (!paymentProofFile) {
      toast.error("Please upload payment proof");
      return;
    }

    setSubmitting(true);

    try {
      // upload payment proof file
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append("file", paymentProofFile);
      uploadFormData.append("type", "payment_proof");

      const uploadResponse = await fetch("/api/admin/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload payment proof");
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

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.error || "Failed to create order");
      }
      toast.success(
        "Payment submitted successfully! Our team will review and active your subscriptions"
      );
      router.push("/dashboard");
    } catch (error) {
      console.error("Checkout error", error);
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bank Details */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Step 1: Bank Transfer Details
                </h2>
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="font-semibold">Bank Name:</span>
                    <span>BookWise International Bank</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Account Name:</span>
                    <span>BookWise LLC</span>
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
            </form>
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
