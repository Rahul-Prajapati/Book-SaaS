"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";

interface Category {
  id: number;
  name: string;
}

interface Book {
  id: number;
  title: string;
  author: string;
  categoryId: number;
  description: string;
  publicationYear: number | null;
  isbn: string | null;
  coverImageUrl: string | null;
  originalPdfUrl: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  summaryGenerated: boolean;
  audioGenerated: boolean;
}

export default function EditBookPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [book, setBook] = useState<Book | null>(null);

  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState("");
  const [audioProgress, setAudioProgress] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    categoryId: "",
    description: "",
    publicationYear: "",
    isbn: "",
    isFeatured: false,
    isPublished: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  /// Fetch Book and Categories
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch book

        const bookResponse = await fetch(`/api/admin/books/${bookId}`);
        if (bookResponse.ok) {
          const bookData = await bookResponse.json();
          setBook(bookData);
          setFormData({
            title: bookData.title,
            author: bookData.author,
            categoryId: bookData.categoryId.toString(),
            description: bookData.description,
            publicationYear: bookData.publicationYear?.toString() || "",
            isbn: bookData.isbn || "",
            isFeatured: bookData.isFeatured,
            isPublished: bookData.isPublished,
          });
        }

        // Fetch Categoeies
        const categoriesResponse = await fetch("/api/admin/categories");
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData);
        }
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    }
    fetchData();
  }, [bookId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const response = await fetch(`/api/admin/books/${bookId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          categoryId: parseInt(formData.categoryId),
          publicationYear: formData.publicationYear
            ? parseInt(formData.publicationYear)
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ general: data.error || "Filed to update book" });
        }
        setLoading(false);
        return;
      }
      toast.success("Book updated successfully");
      router.push("/admin/books");
    } catch (error) {
      setErrors({ general: "An error occurred while updating the book" });
    }
  };

  /// Function for generate book summary by chatgpt/gemini api
  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    setSummaryProgress("Extracting text from PDF...");

    try {
      const response = await fetch("/api/admin/books/generate-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookId: parseInt(bookId) }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data:")) {
              const data = JSON.parse(line.slice(6));
              setSummaryProgress(data.message);

              if (data.completed) {
                setGeneratingSummary(false);
                toast.success("Summary generated successfully");
                // Refreah book data
                window.location.reload();
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      setGeneratingSummary(false);
      setSummaryProgress("");
      toast.error("Failed to generate summary");
    }
  };

  const handleGenerateAudio = async () => {
    setGeneratingAudio(true);
    setAudioProgress("Generating audio from summary...");

    try {
      const response = await fetch("/api/admin/books/generate-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookId: parseInt(bookId) }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data:")) {
              const data = JSON.parse(line.slice(6));
              setAudioProgress(data.message);

              if (data.completed) {
                setGeneratingAudio(false);
                toast.success("Audio generated successfully");
                // Refreah book data
                window.location.reload();
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      setGeneratingAudio(false);
      setAudioProgress("");
      toast.error("Failed to generate Audio");
    }
  };

  if (!book) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Book not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Book</h1>
        <p className="text-gray-600 mt-2">
          Update Book details and manage content
        </p>
      </div>

      <div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {errors.general}
            </div>
          )}

          {/* Book Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📚 Book Information
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter book title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author *
                  </label>
                  <input
                    type="text"
                    name="author"
                    value={formData.author}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter author name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter book description"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Publication Year
                  </label>
                  <input
                    type="number"
                    name="publicationYear"
                    value={formData.publicationYear}
                    onChange={handleChange}
                    min="1900"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ISBN
                  </label>
                  <input
                    type="text"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="978-0-123456-78-9"
                  />
                </div>
              </div>

              {book?.coverImageUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Cover Image
                  </label>
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    className="w-32 h-48 object-cover rounded-lg border"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Publishing Options */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🚀 Publishing Options
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isFeatured"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600"
                />
                <label
                  htmlFor="isFeatured"
                  className="text-sm font-medium text-gray-700"
                >
                  Featured Book (Show on homepage)
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isPublished"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600"
                />
                <label
                  htmlFor="isPublished"
                  className="text-sm font-medium text-gray-700"
                >
                  Publish Book (Make visible to users)
                </label>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  💡 Keep unpublished while generating summary and audio
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* AI Summary Generation */}

        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            🤖 AI Summary Generation
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">
                  {book.summaryGenerated
                    ? "Summary Already Generated"
                    : "Generate AI-Powered summary from PDF"}
                </p>
              </div>

              <button
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50"
              >
                {generatingSummary
                  ? "Generating..."
                  : book.summaryGenerated
                  ? "Regenerating Summary"
                  : "Generate Summary"}
              </button>
            </div>

            {summaryProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">{summaryProgress}</p>
              </div>
            )}
          </div>
        </div>

        {/* Audio Generation */}

        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            🎧 Audio Generation
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">
                  {book.audioGenerated
                    ? "Audio Alrady generated"
                    : book.summaryGenerated
                    ? "Generate audio from summary"
                    : " Please generate summary first"}
                </p>
              </div>

              <button
                onClick={handleGenerateAudio}
                disabled={generatingAudio || !book.summaryGenerated}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50"
              >
                {generatingAudio
                  ? "Generating..."
                  : book.audioGenerated
                  ? "Regenerate Audio"
                  : "🎧 Generate Audio"}
              </button>
            </div>

            {audioProgress && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800">{audioProgress}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
