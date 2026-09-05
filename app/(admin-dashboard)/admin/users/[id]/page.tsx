"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  audioListenTime: number;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    favorites: number;
    readingHistory: number;
    reviews: number;
  };
  favorites: any[];
  readingHistory: any[];
  reviews: any[];
}

export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    role: "USER",
    subscriptionTier: "FREE",
    subscriptionStatus: "INACTIVE",
    emailVerified: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUser();
  }, [userId]);

  async function fetchUser() {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setFormData({
          fullName: data.fullName,
          role: data.role,
          subscriptionTier: data.subscriptionTier,
          subscriptionStatus: data.subscriptionStatus,
          emailVerified: data.emailVerified,
        });
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setLoading(false);
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ general: data.error || "Failed to update user" });
        }
        setSaving(false);
        return;
      }

      toast.success("User updated successfully!");
      setEditing(false);
      fetchUser();
    } catch (error) {
      setErrors({ general: "An error occurred while updating the user" });
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete this user account? This action cannot be undone and will delete all their data including favorites, reading history, and reviews.`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to delete user");
        setDeleting(false);
        return;
      }

      toast.success("User deleted successfully!");
      router.push("/admin/users");
    } catch (error) {
      toast.error("An error occurred while deleting the user");
      setDeleting(false);
    }
  };

  const formatListenTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">User not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
          <p className="text-gray-600 mt-2">{user.email}</p>
        </div>
        <div className="flex items-center space-x-3">
          {!editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
              >
                Edit User
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete User"}
              </button>
            </>
          )}
          <button
            onClick={() => router.push("/admin/users")}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
          >
            Back to Users
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - User Info */}
        <div className="col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center">
                {user.fullName}
              </h2>
              <p className="text-sm text-gray-600 mt-1">{user.email}</p>
              <div className="mt-4 flex flex-col items-center space-y-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user.role === "ADMIN"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {user.role}
                </span>
                {user.emailVerified && (
                  <span className="text-xs text-green-600">
                    ✓ Email Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Subscription Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Subscription
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Plan</p>
                <p className="font-semibold text-gray-900">
                  {user.subscriptionTier}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                    user.subscriptionStatus === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {user.subscriptionStatus}
                </span>
              </div>
              {user.subscriptionStartDate && (
                <div>
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(user.subscriptionStartDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {user.subscriptionEndDate && (
                <div>
                  <p className="text-sm text-gray-600">End Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(user.subscriptionEndDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Activity Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Activity</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Favorites</span>
                <span className="font-semibold text-gray-900">
                  {user._count.favorites}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Reviews</span>
                <span className="font-semibold text-gray-900">
                  {user._count.reviews}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Books Read</span>
                <span className="font-semibold text-gray-900">
                  {user._count.readingHistory}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Listen Time</span>
                <span className="font-semibold text-gray-900">
                  {formatListenTime(user.audioListenTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Account Info
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">User ID</p>
                <code className="text-xs text-gray-900 bg-gray-100 px-2 py-1 rounded">
                  {user.id}
                </code>
              </div>
              <div>
                <p className="text-sm text-gray-600">Joined</p>
                <p className="font-semibold text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="font-semibold text-gray-900">
                  {new Date(user.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Edit Form or Details */}
        <div className="col-span-2 space-y-6">
          {editing ? (
            /* Edit Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {errors.general}
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Edit User Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subscription Tier *
                    </label>
                    <select
                      name="subscriptionTier"
                      value={formData.subscriptionTier}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="FREE">Free</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                      <option value="LIFETIME">Lifetime</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subscription Status *
                    </label>
                    <select
                      name="subscriptionStatus"
                      value={formData.subscriptionStatus}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="emailVerified"
                      name="emailVerified"
                      checked={formData.emailVerified}
                      onChange={handleChange}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <label
                      htmlFor="emailVerified"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email Verified
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      fullName: user.fullName,
                      role: user.role,
                      subscriptionTier: user.subscriptionTier,
                      subscriptionStatus: user.subscriptionStatus,
                      emailVerified: user.emailVerified,
                    });
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            /* Display Details */
            <>
              {/* Favorites */}
              {user.favorites.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Recent Favorites
                  </h3>
                  <div className="space-y-3">
                    {user.favorites.map((fav) => (
                      <div
                        key={fav.id}
                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg"
                      >
                        {fav.book.coverImageUrl && (
                          <img
                            src={fav.book.coverImageUrl}
                            alt={fav.book.title}
                            className="w-12 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <Link
                            href={`/admin/books/${fav.book.id}/details`}
                            className="font-semibold text-gray-900 hover:text-indigo-600"
                          >
                            {fav.book.title}
                          </Link>
                          <p className="text-sm text-gray-600">
                            {fav.book.author}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reading History */}
              {user.readingHistory.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Reading History
                  </h3>
                  <div className="space-y-3">
                    {user.readingHistory.map((history) => (
                      <div
                        key={history.id}
                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg"
                      >
                        {history.book.coverImageUrl && (
                          <img
                            src={history.book.coverImageUrl}
                            alt={history.book.title}
                            className="w-12 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <Link
                            href={`/admin/books/${history.book.id}/details`}
                            className="font-semibold text-gray-900 hover:text-indigo-600"
                          >
                            {history.book.title}
                          </Link>
                          <p className="text-sm text-gray-600">
                            {history.book.author}
                          </p>
                          <div className="mt-1 flex items-center space-x-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{
                                  width: `${history.completionPercentage}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {history.completionPercentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews */}
              {user.reviews.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Recent Reviews
                  </h3>
                  <div className="space-y-4">
                    {user.reviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Link
                              href={`/admin/books/${review.book.id}/details`}
                              className="font-semibold text-gray-900 hover:text-indigo-600"
                            >
                              {review.book.title}
                            </Link>
                            <p className="text-sm text-gray-600">
                              {review.book.author}
                            </p>
                          </div>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={
                                  i < review.rating
                                    ? "text-yellow-400"
                                    : "text-gray-300"
                                }
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                        {review.reviewTitle && (
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {review.reviewTitle}
                          </h4>
                        )}
                        {review.reviewText && (
                          <p className="text-sm text-gray-700">
                            {review.reviewText}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
