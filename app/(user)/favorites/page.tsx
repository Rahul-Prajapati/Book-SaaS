"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { toastApiFailure, toastApiResponse } from "@/lib/client/api-toast";

interface Favorite {
  id: number;
  bookId: number;
  createdAt: string;
  book: {
    id: number;
    title: string;
    author: string;
    description: string;
    coverImageUrl: string;
    category: {
      id: number;
      name: string;
      slug: string;
      icon: string;
    };
    averageRating: number;
    _count: {
      reviews: number;
      favorites: number;
    };
  };
}

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchUser();
    fetchFavorites();
  }, []);

  async function fetchUser() {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        // console.log("user data:", data);
        setUser(data);
      }
    } catch (error) {
      console.error("Failed to fetch user", error);
    }
  }

  async function fetchFavorites() {
    setLoading(true);
    try {
      const response = await fetch("/api/user/favorites");
      if (response.ok) {
        const data = await response.json();
        console.log("favorites data:", data);
        setFavorites(data);
      } else if (response.status === 401) {
        router.push("/login");
      }
    } catch (error) {
      console.error("Failed to fetch favorites", error);
    } finally {
      setLoading(false);
    }
  }

  const handleRemoveFavorite = async (bookId: number) => {
    if (!confirm("Remove this book form your favorites?")) {
      return;
    }

    try {
      const response = await fetch(`/api/user/favorites/${bookId}`, {
        method: "DELETE",
      });
      await toastApiResponse(response, {
        success: "Removed from favorites.",
        error: "Could not remove this book from favorites.",
      });

      if (response.ok) {
        setFavorites(favorites.filter((fav) => fav.bookId !== bookId));
      }
    } catch (error) {
      toastApiFailure(error, "Could not remove this book from favorites.");
    }
  };

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

  const randerStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            className={
              i < Math.round(rating) ? "text-yellow-400" : "text-gray-300"
            }
          >
            ★
          </span>
        ))}
        <span className="text-sm text-gray-600 ml-2">
          ({rating.toFixed(1)})
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                  BookWise
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
                  className="text-indigo-600 hover:text-gray-900 font-medium"
                >
                  My Favorites
                </Link>
                <Link
                  href="/pricing"
                  className="text-gray-600 hover:text-gray-900 font-medium"
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            My Favorites
          </h1>
          <p className="text-gray-600">
            {loading
              ? "Loading.."
              : `${favorites.length} book${
                  favorites.length !== 1 ? "s" : ""
                } saved `}
          </p>
        </div>

        {/* Favorites Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-xl text-gray-600">
              Loading your favorites...
            </div>
          </div>
        ) : favorites.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">❤️</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No favorites yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start adding books to your favorites to keep track of the ones you
              love!
            </p>
            <Link
              href="/books"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Browse Books
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <Link href={`/books/${favorite.book.id}`}>
                  <div className="relative h-64 bg-gray-100">
                    {favorite.book.coverImageUrl ? (
                      <Image
                        src={favorite.book.coverImageUrl}
                        alt={favorite.book.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <span className="text-6xl">📖</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemoveFavorite(favorite.bookId);
                      }}
                      className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-xl">❤️</span>
                    </button>
                  </div>
                </Link>

                <div className="p-4">
                  <div className="mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                      {favorite.book.category.icon && (
                        <span className="mr-1">
                          {favorite.book.category.icon}
                        </span>
                      )}
                      {favorite.book.category.name}
                    </span>
                  </div>

                  <Link href={`/books/id`}>
                    <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2 hover:text-indigo-600">
                      {favorite.book.title}
                    </h3>
                  </Link>

                  <p className="text-sm text-gray-600 mb-2">
                    by {favorite.book.author}
                  </p>

                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                    {favorite.book.description}
                  </p>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">
                      {randerStars(favorite.book.averageRating)}
                      <span className="text-xs text-gray-500">
                        {favorite.book._count.reviews} reviews
                      </span>
                    </span>
                  </div>

                  <Link
                    href={`/books/${favorite.book.id}`}
                    className="block w-full py-2 bg-indigo-600 text-white rounded-lg font-semibold text-center hover:bg-indigo-700 transition-colors"
                  >
                    Read Summary
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
