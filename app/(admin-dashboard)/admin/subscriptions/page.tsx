"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

interface SubscriptionOrder {
  id: number;
  planType: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  paymentProofUrl: string | null;
  transactionReference: string | null;
  orderStatus: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  notes: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    subscriptionTier: string;
    subscriptionStatus: string;
  };
}

export default function SubscriptionPage() {
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [processing, setProcessing] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  async function fetchOrders() {
    try {
      const response = await fetch(
        `/api/admin/subscription-orders?status=${filter}`
      );
      if (response.ok) {
        const data = await response.json();
        //console.log("order data", data);
        setOrders(data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  }

  async function handleApprove(orderId: number) {
    if (!confirm("Are you sure you want to approve this subscription?")) {
      return;
    }
    setProcessing(orderId);

    try {
      const response = await fetch(
        `/api/admin/subscription-orders/${orderId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "APPROVED",
          }),
        }
      );

      if (response.ok) {
        toast.success("Subscription approved and activated successfully");
        fetchOrders();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to approve subscription");
      }
    } catch (error) {
      toast.error("An error occurred while approving the subscription");
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(orderId: number) {
    const reason = prompt("Please enter the reason for rejection");
    if (!reason) {
      return;
    }
    setProcessing(orderId);

    try {
      const response = await fetch(
        `/api/admin/subscription-orders/${orderId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "REJECT",
            rejectedReason: reason,
          }),
        }
      );

      if (response.ok) {
        toast.success("Subscription order rejected");
        fetchOrders();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to reject subscription");
      }
    } catch (error) {
      toast.error("An error occurred while rejecting the subscription");
    } finally {
      setProcessing(null);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "APPROVED":
        return "bg-green-100 text-green-700";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      case "CANCELLED":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading....</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Subscription Orders
        </h1>
        <p className="text-gray-600 mt-2">
          Review and approve subscription payments
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Orders</div>
          <div className="text-3xl font-bold text-gray-900">
            {orders.length}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Pending</div>
          <div className="text-3xl font-bold text-yellow-600">
            {orders.filter((o) => o.orderStatus === "PENDING").length}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Approved</div>
          <div className="text-3xl font-bold text-green-600">
            {orders.filter((o) => o.orderStatus === "APPROVED").length}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Rejected</div>
          <div className="text-3xl font-bold text-red-600">
            {orders.filter((o) => o.orderStatus === "REJECTED").length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center space-x-3">
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        <button
          onClick={() => setFilter("ALL")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            filter === "ALL"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          } `}
        >
          All Orders
        </button>
        <button
          onClick={() => setFilter("PENDING")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            filter === "PENDING"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          } `}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter("APPROVED")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            filter === "APPROVED"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          } `}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter("REJECTED")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            filter === "REJECTED"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          } `}
        >
          Rejected
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <p className="text-gray-500">No subscription orders found.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {order.planType} Plan
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        order.orderStatus
                      )} }`}
                    >
                      {order.orderStatus}
                    </span>
                  </div>
                  <Link
                    href={`/admin/users/id`}
                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {order.user.fullName} ({order.user.email})
                  </Link>
                  <p className="text-sm text-gray-600 mt-1">
                    Current: {order.user.subscriptionTier} (
                    {order.user.subscriptionStatus})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {order.currency} ${order.amount}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Payment Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Payment Details
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-medium">{order.paymentMethod}</span>
                    </div>
                    {order.transactionReference && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reference:</span>
                        <code className="text-xs bg-white px-2 py-1 rounded">
                          {order.transactionReference}
                        </code>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Proof */}
                {order.paymentProofUrl && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Payment Proof
                    </h4>
                    <img
                      src={order.paymentProofUrl}
                      alt="Payment proof"
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => setSelectedImage(order.paymentProofUrl)}
                    />
                    <button
                      onClick={() =>
                        window.open(order.paymentProofUrl!, "_blank")
                      }
                      className="text-xs text-indigo-600 hover:text-indigo-800 mt-2"
                    >
                      View Full Size →
                    </button>
                  </div>
                )}
              </div>

              {/* Notes and Rejection Reason */}
              {(order.notes || order.rejectedReason) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  {order.rejectedReason && (
                    <div className="mb-2">
                      <span className="font-semibold text-red-700">
                        Rejection Reason:{" "}
                      </span>
                      <span className="text-red-600">
                        {order.rejectedReason}
                      </span>
                    </div>
                  )}
                  {order.notes && (
                    <div>
                      <span className="font-semibold text-blue-800">
                        Notes:{" "}
                      </span>
                      <span className="text-blue-700">{order.notes}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {order.orderStatus === "PENDING" && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleApprove(order.id)}
                    disabled={processing === order.id}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    {processing === order.id
                      ? "Processing..."
                      : "Approve & Activate"}
                  </button>
                  <button
                    onClick={() => handleReject(order.id)}
                    disabled={processing === order.id}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}

              {order.approvedAt && (
                <p className="text-sm text-gray-600">
                  Approved on {new Date(order.approvedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedImage}
              alt="Payment proof"
              className="max-w-full max-h-[90vh] rounded-lg"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white text-gray-900 rounded-full p-2 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
