"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Chapter {
  id: number;
  chapterNumber: number;
  chapterTitle: string;
  chapterSummary: string;
  audioUrl: string | null;
  audioDuration: number;
}

interface Summary {
  mainSummary: string;
  tableOfContents: any;
}

interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  publicationYear: number | null;
  isbn: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  summaryGenerated: boolean;
  audioGenerated: boolean;
  category: {
    name: string;
  };
  summary: Summary | null;
  chapters: Chapter[];
}

export default function BookDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<Book | null>(null);
  const [currentAudio, setCurrentAudio] = useState<number | null>(null);

  useEffect(() => {
    async function fetchBook() {
      try {
        const response = await fetch(`/api/admin/books/${bookId}/details`);
        if (response.ok) {
          const data = await response.json();
          //console.log("book data:", data);
          setBook(data);
        }
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch book details", error);
        setLoading(false);
      }
    }
    fetchBook();
  }, [bookId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Book not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{book.title}</h1>
          <p className="text-gray-600 mt-2">by {book.author}</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/admin/books/${bookId}/edit`}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
          >
            ✏️ Edit Book
          </Link>
          <button
            onClick={() => router.push("/admin/books")}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
          >
            ← Back to Books
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Book Info */}
        <div className="col-span-1 space-y-6">
          {/* Cover Image */}
          {book.coverImageUrl && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <img
                src={book.coverImageUrl}
                alt={book.title}
                className="w-full rounded-lg shadow-lg"
              />
            </div>
          )}

          {/* Book Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Book Details
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Category</p>
                <p className="font-semibold text-gray-900">
                  {book.category.name}
                </p>
              </div>
              {book.publicationYear && (
                <div>
                  <p className="text-sm text-gray-600">Publication Year</p>
                  <p className="font-semibold text-gray-900">
                    {book.publicationYear}
                  </p>
                </div>
              )}
              {book.isbn && (
                <div>
                  <p className="text-sm text-gray-600">ISBN</p>
                  <p className="font-semibold text-gray-900">{book.isbn}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    book.isPublished
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {book.isPublished ? "Published" : "Draft"}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Featured</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    book.isFeatured
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-700"
                  } `}
                >
                  {book.isFeatured ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          {/* Generation Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              AI Generation Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Summary</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    book.summaryGenerated
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  } `}
                >
                  {book.summaryGenerated ? "✓ Generated" : "✗ Not Generated"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Audio</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    book.audioGenerated
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  } `}
                >
                  {book.audioGenerated ? "✓ Generated" : "✗ Not Generated"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Summary & Chapters */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Description
            </h2>
            <p className="text-gray-700 leading-relaxed">{book.description}</p>
          </div>

          {/* AI Summary */}
          {book.summary && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-2xl">🤖</span>
                <h2 className="text-xl font-bold text-gray-900">
                  AI-Generated Summary
                </h2>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {book.summary.mainSummary}
                </p>
              </div>
            </div>
          )}

          {/* Chapters with Audio */}
          {book.chapters && book.chapters.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center space-x-2 mb-6">
                <span className="text-2xl">📚</span>
                <h2 className="text-xl font-bold text-gray-900">Chapters</h2>
              </div>
              <div className="space-y-4">
                {book.chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          Chapter {chapter.chapterNumber} :{" "}
                          {chapter.chapterTitle}
                        </h3>
                        {chapter.audioDuration > 0 && (
                          <p className="text-sm text-gray-500 mt-1">
                            Duration: {Math.floor(chapter.audioDuration / 60)}{" "}
                            min {chapter.audioDuration % 60} sec
                          </p>
                        )}
                      </div>
                      {chapter.audioUrl && (
                        <button
                          onClick={() =>
                            setCurrentAudio(
                              currentAudio === chapter.id ? null : chapter.id
                            )
                          }
                          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                            currentAudio === chapter.id
                              ? "bg-red-600 text-white hover:bg-red-700"
                              : "bg-purple-600 text-white hover:bg-purple-700"
                          } `}
                        >
                          {currentAudio === chapter.id
                            ? "⏸ Pause"
                            : "▶ Play Audio"}
                        </button>
                      )}
                    </div>

                    <p className="text-gray-700 leading-relaxed mb-4">
                      {chapter.chapterSummary}
                    </p>

                    {/* Audio Player */}
                    {chapter.audioUrl && currentAudio === chapter.id && (
                      <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <audio
                          controls
                          autoPlay
                          className="w-full"
                          src={chapter.audioUrl}
                          onEnded={() => setCurrentAudio(null)}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}

                    {!chapter.audioUrl && (
                      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          ⚠️ Audio not generated for this chapter
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Summary Message */}
          {!book.summary && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No Summary Generated Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Generate an AI summary to see the book summary and chapters here
              </p>
              <Link
                href={`/admin/books/${bookId}/edit`}
                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
              >
                Go to Edit Page to Generate Summary
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
