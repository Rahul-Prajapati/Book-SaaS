import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  // Fetch data from database
  const [
    totalBooks,
    totalUsers,
    totalCategories,
    paidSubscriptions,
    recentUsers,
    recentBooks,
  ] = await Promise.all([
    prisma.book.count(),
    prisma.user.count(),
    prisma.category.count(),
    prisma.user.count({
      where: {
        subscriptionTier: {
          in: ["MONTHLY", "YEARLY", "LIFETIME"],
        },
      },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        subscriptionTier: true,
        createdAt: true,
      },
    }),
    prisma.book.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        author: true,
        isPublished: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {session.user.name || "Admin"}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Books */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Books</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {totalBooks}
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {totalUsers}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        {/* Paid Subscriptions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Paid Subscribers
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {paidSubscriptions}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💎</span>
            </div>
          </div>
        </div>

        {/* Total Categories */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {totalCategories}
              </p>
            </div>
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏷️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Users</h2>
          </div>
          <div className="p-6">
            {recentUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No users yet</p>
            ) : (
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {user.fullName || "No Name"}
                      </p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          user.subscriptionTier === "LIFETIME"
                            ? "bg-purple-100 text-purple-700"
                            : user.subscriptionTier === "YEARLY"
                            ? "bg-indigo-100 text-indigo-700"
                            : user.subscriptionTier === "MONTHLY"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {user.subscriptionTier}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Books */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Books</h2>
          </div>
          <div className="p-6">
            {recentBooks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No books yet</p>
            ) : (
              <div className="space-y-4">
                {recentBooks.map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {book.title}
                      </p>
                      <p className="text-sm text-gray-600">{book.author}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          book.isPublished
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        } `}
                      >
                        {book.isPublished ? "PUBLISHED" : "DRAFT"}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(book.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white">
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/books/new"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 transition-all flex items-center space-x-3"
          >
            <span className="text-2xl">➕</span>
            <span className="font-semibold">Add New Book</span>
          </a>
          <a
            href="/admin/books"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 transition-all flex items-center space-x-3"
          >
            <span className="text-2xl">📖</span>
            <span className="font-semibold">Manage Books</span>
          </a>
          <a
            href="/admin/users"
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 transition-all flex items-center space-x-3"
          >
            <span className="text-2xl">👤</span>
            <span className="font-semibold">Manage Users</span>
          </a>
        </div>
      </div>
    </div>
  );
}
