"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Review {
  id: number;
  rating: number;
  reviewTitle: string | null;
  reviewText: string | null;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: string;
  book: {
    id: number;
    title: string;
    author: string;
    coverImageUrl: string | null;
  };
  user: {
    id: string;
    fullName: string;
    email: string;
  };
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    try {
      const response = await fetch("/api/admin/reviews");
      if (response.ok) {
        const data = await response.json();
        // console.log("review all data", data);
        setReviews(data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
      setLoading(false);
    }
  }

  async function handleToggleApproval(
    reviewId: number,
    currentStatus: boolean
  ) {
    setUpdating(reviewId);

    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isApproved: !currentStatus }),
      });
      if (response.ok) {
        toast.success("Reveiw Updated successfully!");
        fetchReviews();
      } else {
        toast.error("Failed to update review");
      }
    } catch (error) {
      toast.error("An error occurred while updating the review");
    } finally {
      setUpdating(null);
    }
  }

  async function handleDelete(reviewId: number) {
    if (!confirm("Are you sure you want to delete this review?")) {
      return;
    }
    setUpdating(reviewId);

    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Reveiw deleted successfully!");
        fetchReviews();
      } else {
        toast.error("Failed to deleting review");
      }
    } catch (error) {
      toast.error("An error occurred while deleting the review");
    } finally {
      setUpdating(null);
    }
  }

  const filteredReviews = reviews.filter((review) => {
    if (filter === "all") return true;
    if (filter === "approved") return review.isApproved;
    if (filter === "pending") return !review.isApproved;
    if (filter === "verified") return review.isVerifiedPurchase;
    return true;
  });

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
        <p className="text-gray-600 mt-2">
          Manage user book reviews and ratings
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Reviews</div>
          <div className="text-3xl font-bold text-gray-900">
            {reviews.length}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Average Rating</div>
          <div className="text-3xl font-bold text-yellow-600">
            {averageRating} ★
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Approved</div>
          <div className="text-3xl font-bold text-green-600">
            {reviews.filter((r) => r.isApproved).length}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Pending</div>
          <div className="text-3xl font-bold text-orange-600">
            {reviews.filter((r) => !r.isApproved).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center space-x-3">
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold
            ${
              filter === "all"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            } `}
        >
          All Reviews
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold
            ${
              filter === "approved"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            } `}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold
            ${
              filter === "pending"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            } `}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter("verified")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold
            ${
              filter === "verified"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            } `}
        >
          Verified Purchase
        </button>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <p className="text-gray-500">No reviews found.</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-4">
                {/* Book Cover */}
                {review.book.coverImageUrl && (
                  <img
                    src={review.book.coverImageUrl}
                    alt={review.book.title}
                    className="w-20 h-28 object-cover rounded-lg"
                  />
                )}

                {/* Review Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Link
                        href={`/admin/books/${review.book.id}/details`}
                        className="text-lg font-bold text-gray-900 hover:text-indigo-600"
                      >
                        {review.book.title}
                      </Link>
                      <p className="text-sm text-gray-600">
                        {" "}
                        {review.book.author}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-xl ${
                            i < review.rating
                              ? "text-yellow-400"
                              : "text-gray-300"
                          } `}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Review Title */}
                  {review.reviewTitle && (
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {review.reviewTitle}
                    </h3>
                  )}

                  {/* Review Text */}
                  {review.reviewText && (
                    <p className="text-gray-700 mb-3">{review.reviewText}</p>
                  )}

                  {/* Review Meta */}
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <Link
                      href={`/admin/users/${review.user.id}`}
                      className="hover:text-indigo-600 font-medium"
                    >
                      {review.user.fullName}
                    </Link>
                    <span>•</span>
                    <span>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                    {review.isVerifiedPurchase && (
                      <>
                        <span>•</span>
                        <span className="text-green-600 font-medium">
                          ✓ Verified Purchase
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span> {review.helpfulCount} found helpful</span>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center space-x-2 mb-3">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                        review.isApproved
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      } `}
                    >
                      {review.isApproved ? "Approved" : "Pending Approval"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() =>
                        handleToggleApproval(review.id, review.isApproved)
                      }
                      disabled={updating === review.id}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold
            ${
              review.isApproved
                ? "bg-orange-100 text-orange-700 disabled:opacity-50"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            } disabled:opacity-50`}
                    >
                      {updating === review.id
                        ? "Updating..."
                        : review.isApproved
                        ? "Unapprove"
                        : "Approve"}
                    </button>
                    <button
                      onClick={() => handleDelete(review.id)}
                      disabled={updating === review.id}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
