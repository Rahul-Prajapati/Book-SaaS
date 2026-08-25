"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

interface Book {
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
  isFavorited: boolean;
  _count: {
    reviews: number;
    favorites: number;
  };
}

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

export default function BooksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || ""
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1")
  );
  const [totalPages, setTotalPages] = useState(1);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchUser();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [searchQuery, selectedCategory, currentPage]);

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

  async function fetchCategories() {
    try {
      const response = await fetch("/api/user/categories");
      if (response.ok) {
        const data = await response.json();
        // console.log("category data:", data);
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch Categories", error);
    }
  }

  async function fetchBooks() {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
      });

      if (searchQuery) params.append("search", searchQuery);
      if (selectedCategory) params.append("category", selectedCategory);

      const response = await fetch(`/api/books?${params}`);
      if (response.ok) {
        const data = await response.json();
        //console.log("book data:", data);
        setBooks(data.books);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch books data", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    updateURL();
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedCategory) params.append("category", selectedCategory);
    if (currentPage > 1) params.append("page", currentPage.toString());
    router.push(`/books?${params}`);
  };


  const handleToggleFavorite = async (bookId: number, isFavorited:boolean) => {
    if (!user) {
        toast.error("Please log in to add favorites");
        router.push("/login");
        return;
    }

try {

    if (isFavorited) {
        await fetch(`/api/user/favorites/${bookId}`, { method: "DELETE"});
    } else {
        await fetch("/api/user/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookId}),
        });
    }
    fetchBooks()        
} catch (error) {
    console.error("Failed to toggle favorites:", error);
  }
};

  const handleSignOut = async () => {
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      });
      if (response.ok) {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Sign out error", error);
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
                  className="text-indigo-600 font-semibold hover:text-indigo-700"
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
            Browse Books
          </h1>
          <p className="text-gray-600">
            Discover 10,000+ professional book summaries
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search books by title, author, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Category Filter */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Filter by Category:
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoryChange("")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === ""
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id.toString())}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors 
                ${
                  selectedCategory === category.id.toString()
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } `}
                >
                  {category.icon && (
                    <span className="mr-2">{category.icon}</span>
                  )}
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-xl text-gray-600">Loading books...</div>
          </div>
        ) : books.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No books found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <Link href={`/books/${book.id}`}>
                    <div className="relative h-64 bg-gray-100">
                      {book.coverImageUrl ? (
                        <Image
                          src={book.coverImageUrl}
                          alt={book.title}
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
                        handleToggleFavorite(book.id, book.isFavorited);
                      }}

                      className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <span className="text-xl">
                          {" "}
                          {book.isFavorited ? "❤️" : "🤍"}{" "}
                        </span>
                      </button>
                    </div>
                  </Link>

                  <div className="p-4">
                    <div className="mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                        {book.category.icon && (
                          <span className="mr-1">{book.category.icon}</span>
                        )}
                        {book.category.name}
                      </span>
                    </div>

                    <Link href={`/books/${book.id}`}>
                      <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2 hover:text-indigo-600">
                        {book.title}
                      </h3>
                    </Link>

                    <p className="text-sm text-gray-600 mb-2">
                      by {book.author}
                    </p>

                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {book.description}
                    </p>

                    <div className="flex items-center justify-between">
                      {randerStars(book.averageRating)}
                      <span className="text-xs text-gray-500">
                        {book._count.reviews} reviews
                      </span>
                    </div>

                    {user?.subscriptionTier === "FREE" && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <Link
                          href="/pricing"
                          className="text-xs text-indigo-600 font-semibold hover:text-indigo-700"
                        >
                          🔒 Upgrade to unlock full audio & PDF
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      currentPage === i + 1
                        ? "bg-indigo-600 text-white"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    } `}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
