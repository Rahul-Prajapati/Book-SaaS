"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  toastApiFailure,
  toastApiResponse,
  toastApiSuccess,
} from "@/lib/client/api-toast";

interface Category {
  id: number;
  name: string;
}

export default function AddNewBookPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState("");
  const [audioProgress, setAudioProgress] = useState("");
  const [bookId, setBookId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    categoryId: "",
    description: "",
    publicationYear: "",
    isbn: "",
    tags: "",
    isFeatured: false,
    isPublished: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  /// Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/admin/categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    }
    fetchCategories();
  }, []);

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

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      /// Upload Files first
      let coverImageUrl = "";
      let pdfUrl = "";

      if (coverImageFile) {
        const formData = new FormData();
        formData.append("file", coverImageFile);
        formData.append("type", "cover");

        const uploadResponse = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        await toastApiResponse(uploadResponse, {
          success: "Cover image uploaded.",
          error: "Failed to upload cover image.",
        });

        if (uploadResponse.ok) {
          const data = await uploadResponse.json();
          coverImageUrl = data.url;
        } else {
          setLoading(false);
          return;
        }
      }

      if (pdfFile) {
        const formData = new FormData();
        // formData.append("file", pdfFile);
        formData.append("file", pdfFile, pdfFile.name);
        formData.append("type", "pdf");

        const uploadResponse = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        await toastApiResponse(uploadResponse, {
          success: "Book PDF uploaded.",
          error: "Failed to upload book PDF.",
        });

        if (uploadResponse.ok) {
          const data = await uploadResponse.json();
          pdfUrl = data.url;
        } else {
          setLoading(false);
          return;
        }
      }

      // Create book

      const response = await fetch("/api/admin/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          author: formData.author,
          categoryId: parseInt(formData.categoryId),
          description: formData.description,
          publicationYear: formData.publicationYear
            ? parseInt(formData.publicationYear)
            : null,
          isbn: formData.isbn || null,
          tags: formData.tags || null,
          coverImageUrl: coverImageUrl || null,
          pdfUrl: pdfUrl || null,
          isFeatured: formData.isFeatured,
          isPublished: formData.isPublished,
        }),
      });

      const data = await response.clone().json().catch(() => ({}));
      await toastApiResponse(response, {
        success: "Book created successfully. You can now generate its summary and audio.",
        error: "Failed to create book.",
      });
      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ general: data.error || "Failed to create book" });
        }
        setLoading(false);
        return;
      }
      // Save book id for summary and audio generation
      setBookId(data.id);
      setLoading(false);

    } catch (error) {
      setErrors({ general: "Failed to create book" });
      toastApiFailure(error, "Could not create book.");
      setLoading(false);
    }
  };

  /// Function for generate book summary by chatgpt api
  const handleGenerateSummary = async () => {
    if (!bookId) {
      toast.error("Please save the book first before generating summary");
      return;
    }

    setGeneratingSummary(true);
    setSummaryProgress("Extracting text from PDF...");

    try {
      const response = await fetch("/api/admin/books/generate-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookId }),
      });

      if (!response.ok) {
        await toastApiResponse(response, { error: "Failed to generate summary." });
        setGeneratingSummary(false);
        setSummaryProgress("");
        return;
      }

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

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.completed) {
                setGeneratingSummary(false);
                toastApiSuccess("Summary generated successfully.");
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
      toastApiFailure(error, "Failed to generate summary.");
    }
  };

  /// Function for generate book summary Audio by chatgpt api

  const handleGenerateAudio = async () => {
    if (!bookId) {
      toast.error("Please save the book first before generating summary");
      return;
    }

    setGeneratingAudio(true);
    setAudioProgress("Generating audio from summary...");

    try {
      const response = await fetch("/api/admin/books/generate-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookId }),
      });
      if (!response.ok) {
        await toastApiResponse(response, { error: "Failed to generate audio." });
        setGeneratingAudio(false);
        setAudioProgress("");
        return;
      }
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
              if (data.error) {
                throw new Error(data.error);
              }
              setAudioProgress(data.message);

              if (data.completed) {
                setGeneratingAudio(false);
                toastApiSuccess("Audio generated successfully.");
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
      toastApiFailure(error, "Failed to generate audio.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New Book</h1>
        <p className="text-gray-600 mt-2">
          Create a new book entry with AI-generated summary and audio
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Cover Image *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  {coverImagePreview && (
                    <img
                      src={coverImagePreview}
                      alt="Cover preview"
                      className="mt-2 w-32 h-48 object-cover rounded-lg border"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload PDF File *
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  {pdfFile && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {pdfFile.name}
                    </p>
                  )}
                </div>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>

                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="business, finance"
                  />
                </div>
              </div>
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
              {loading ? "Creating..." : "Create Book"}
            </button>
          </div>
        </form>

        {/* AI Summary Generation */}

        {bookId && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🤖 AI Summary Generation
            </h2>
            <div className="space-y-4">
              <p className="text-gray-600">
                Generate AI-powered summary using ChatGPT
              </p>

              {summaryProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">{summaryProgress}</p>
                </div>
              )}

              <button
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50"
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
              >
                {generatingSummary
                  ? "Generating..."
                  : "Generate Summary with ChatGPT"}
              </button>
            </div>
          </div>
        )}

        {/* Audio Generation */}

        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            🎧 Audio Generation
          </h2>

          <div className="space-y-4">
            <p className="text-gray-600">Generate audio using Text-to-Speech</p>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-800">audioProgress</p>
            </div>

            <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50">
              🎧 Generate Audio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
