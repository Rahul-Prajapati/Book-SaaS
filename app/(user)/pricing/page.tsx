"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { toastApiFailure, toastApiResponse } from "@/lib/client/api-toast";

interface Session {
  user: {
    id: string;
    email: string;
    fullName: string;
    subscriptionTier: string;
    subscriptionStatus: string;
  };
}

export default function PricingPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchSession();
  }, []);

  async function fetchSession() {
    try {
      const sessionResponse = await fetch("/api/auth/session");
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData) {
          const profileResponse = await fetch("/api/user/profile");
          if (profileResponse.ok) {
            const userData = await profileResponse.json();
            console.log("User data", userData);
            setUser(userData);
            setSession({
              ...sessionData,
              user: {
                ...sessionData.user,
                subscriptionTier: userData.subscriptionTier,
                subscriptionStatus: userData.subscriptionStatus,
              },
            });
          } else {
            setSession(sessionData);
          }
        } else {
          setSession(sessionData);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch session:", error);
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      });
      await toastApiResponse(response, {
        success: "Signed out successfully.",
        error: "Could not sign out.",
      });
      if (response.ok) {
        window.location.href = "/";
      }
    } catch (error) {
      toastApiFailure(error, "Could not sign out.");
    }
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      type: "FREE",
      description: "Perfect for exploring BookStore",
      features: [
        "Browse all books catalog",
        "Read book descriptions",
        "View table of contents",
        "Listen to ONLY 10 seconds of audio",
        "Add reviews and ratings",
        "Limited access",
      ],
      limitations: [
        "Cannot listen to full audio",
        "Cannot download PDFs",
        "No favorites feature",
      ],
      buttonText: "Current Plan",
      popular: false,
      disabled: true,
    },
    {
      name: "Monthly",
      price: "$9.99",
      period: "per month",
      type: "MONTHLY",
      description: "Full access with monthly flexibility",
      features: [
        "Full access to 10,000+ book summaries",
        "Read complete summaries online",
        "Listen to full audio summaries",
        "Download PDFs",
        "Add books to favorites",
        "Unlimited access",
        "Cancel anytime",
      ],
      buttonText: "Get Started",
      popular: false,
      disabled: false,
    },
    {
      name: "Yearly",
      price: "$60",
      period: "per year",
      type: "YEARLY",
      savings: "Save $59.88 vs Monthly",
      description: "Best value for serious learners",
      pricePerMonth: "$5.00/mo",
      features: [
        "Full access to 10,000+ book summaries",
        "Read complete summaries online",
        "Listen to full audio summaries",
        "Download PDFs",
        "Add books to favorites",
        "Unlimited access",
        "Priority support",
      ],
      buttonText: "Get Started",
      popular: true,
      disabled: false,
    },
    {
      name: "Lifetime",
      price: "$129.99",
      period: "one-time payment",
      type: "LIFETIME",
      savings: "Best long-term value",
      description: "Pay once, access forever",
      features: [
        "Full access to 10,000+ book summaries",
        "Read complete summaries online",
        "Listen to full audio summaries",
        "Download PDFs",
        "Add books to favorites",
        "Unlimited access",
        "Lifetime updates",
        "VIP support",
        "All future features included",
      ],
      buttonText: "Get Lifetime Access",
      popular: false,
      disabled: false,
    },
  ];

  const handleSelectPlan = (planType: string) => {
    if (!session) {
      router.push("/login?redirect=/pricing");
      return;
    }

    if (planType === "FREE") {
      return;
    }

    // Check fi user alrady has thsi plan or better
    if (
      session.user.subscriptionTier === planType &&
      session.user.subscriptionStatus === "ACTIVE"
    ) {
      toast.error("You already have this plan active");
      return;
    }

    if (session.user.subscriptionTier === "LIFETIME") {
      toast.error("You already have lifetime access!");
      return;
    }

    // Redireact to payment page
    router.push(`/pricing/checkout?plan=${planType}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">B</span>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  BookStore
                </span>
              </Link>
              <div className="hidden md:flex items-center space-x-6">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/books"
                  className="text-gray-600 font-semibold hover:text-indigo-700"
                >
                  Browse Books
                </Link>
                <Link
                  href="/favorites"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  My Favorites
                </Link>
                <Link
                  href="/pricing"
                  className="text-indigo-600 hover:text-gray-900 font-medium"
                >
                  Pricing
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {user.subscriptionTier}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock unlimited access to thousands of book summaries and audio
            content
          </p>
        </div>

        {/* Current Plan Banner */}
        {session && session.user.subscriptionTier !== "FREE" && (
          <div className="mb-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white text-center">
            <p className="text-lg">
              Your current plan:{" "}
              <strong>{session.user.subscriptionTier}</strong> (
              {session.user.subscriptionStatus})
            </p>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.type}
              className={`relative bg-white rounded-2xl shadow-xl border-2 transition-all hover:shadow-2xl ${
                plan.popular ? "border-indigo-600 scale-105" : "border-gray-200"
              } `}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{plan.period}</p>
                  {plan.pricePerMonth && (
                    <p className="text-indigo-600 font-semibold mt-1">
                      {plan.pricePerMonth}
                    </p>
                  )}

                  {plan.savings && (
                    <p className="text-green-600 font-semibold text-sm mt-1">
                      {plan.savings}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.type)}
                  disabled={
                    plan.disabled ||
                    (session?.user.subscriptionTier === plan.type &&
                      session?.user.subscriptionStatus === "ACTIVE")
                  }
                  className={`w-full py-3 rounded-lg font-semibold mb-6 transition-all ${
                    plan.popular
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg"
                      : plan.disabled
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  } `}
                >
                  {session?.user.subscriptionTier === plan.type &&
                  session?.user.subscriptionStatus === "ACTIVE"
                    ? "Current Plan"
                    : plan.buttonText}
                </button>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations &&
                    plan.limitations.map((limitation, index) => (
                      <li key={index} className="flex items-start">
                        <svg
                          className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        <span className="text-gray-500 text-sm">
                          {limitation}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-xl p-12 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                How does the payment process work?
              </h3>
              <p className="text-gray-600">
                We currently accept bank transfer payments. After selecting a
                plan, you'll upload your payment proof, and our team will
                activate your subscription within 24 hours of verification.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Yes! Monthly and Yearly subscriptions can be cancelled anytime.
                Lifetime plans are one-time purchases with no recurring charges.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                What's included in all plans?
              </h3>
              <p className="text-gray-600">
                All paid plans include full access to 10,000+ book summaries,
                complete audio summaries, PDF downloads, and the ability to add
                books to favorites.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                How long does activation take?
              </h3>
              <p className="text-gray-600">
                Once you submit your payment proof, our team typically reviews
                and activates subscriptions within 24 hours during business
                days.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Trusted by thousands of learners worldwide
          </p>
          <div className="flex justify-center items-center space-x-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">10,000+</div>
              <div className="text-sm text-gray-600">Book Summaries</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">50,000+</div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">4.9/5</div>
              <div className="text-sm text-gray-600">Average Rating</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
