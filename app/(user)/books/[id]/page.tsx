"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { toastApiFailure, toastApiResponse } from "@/lib/client/api-toast";
import { trackAudioListenTime } from "@/lib/client/audio-listen-time";
import { useUserProfile } from "@/components/providers/UserProfileProvider";

interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  coverImageUrl: string;
  summary: {
    id: number;
    mainSummary: string | null;
    keyTakeaways: any;
    fullSummary: string | null;
    tableOfContents: any;
  } | null;
  chapters: Array<{
    id: number;
    chapterNumber: number;
    chapterTitle: string;
    chapterSummary: string;
    audioUrl: string | null;
    audioDuration: number;
  }>;
  category: {
    id: number;
    name: string;
    slug: string;
    icon: string;
  };
  reviews: Review[];
  averageRating: number;
  isFavorited: boolean;
  userSubscriptionTier: string;
  _count: {
    reviews: number;
    favorites: number;
  };
}

interface Review {
  id: number;
  rating: number;
  reviewText: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
}

export default function BookDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
    null
  );
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useUserProfile();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: "" });
  const handledDownloadError = useRef<string | null>(null);

  useEffect(() => {
    params.then((p) => setResolvedParams(p));
  }, [params]);

  useEffect(() => {
    const downloadError = searchParams.get("downloadError");
    const messages: Record<string, string> = {
      upgrade_required: "Upgrade your plan to download this PDF.",
      pdf_unavailable: "This book’s PDF is currently unavailable.",
      download_failed: "The PDF could not be downloaded right now. Please try again later.",
    };
    const message = downloadError ? messages[downloadError] : undefined;
    if (!message) return;
    if (handledDownloadError.current === downloadError) return;

    handledDownloadError.current = downloadError;
    toast.error(message);
    const query = new URLSearchParams(window.location.search);
    query.delete("downloadError");
    const remainingQuery = query.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ""}${window.location.hash}`
    );
  }, [searchParams]);

  useEffect(() => {
    if (resolvedParams) {
      fetchBook();
    }
  }, [resolvedParams]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    return trackAudioListenTime(audio);
  }, [book, currentChapterIndex]);

  async function fetchBook() {
    if (!resolvedParams) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/books/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log("user details:", data);
        setBook(data);
      } else if (response.status === 404) {
        toast.error("Book not found");
        router.push("/books");
      }
    } catch (error) {
      console.error("Failed to fetch book", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleFavorite = async () => {
    if (!user) {
      toast.error("Please log in to add favorites");
      router.push("/login");
      return;
    }

    if(!isPremiumUser){
      toast.error("Please upgrade to premium for this action");
      router.push("/pricing");
      return;
    }

    if (!book) return;

    try {
      if (book.isFavorited) {
        const response = await fetch(`/api/user/favorites/${book.id}`, {
          method: "DELETE",
        });
        await toastApiResponse(response, { success: "Removed from favorites." });
        if (!response.ok) return;
      } else {
        const response = await fetch("/api/user/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId: book.id }),
        });
        await toastApiResponse(response, { success: "Added to favorites." });
        if (!response.ok) return;
      }
      await fetchBook();
    } catch (error) {
      toastApiFailure(error, "Could not update favorites.");
    }
  };

  const FREE_AUDIO_LIMIT = 10;

  const hasReachedFreeLimitRef = useRef(false);

  const handlePlayPause = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!isPremiumUser && audioRef.current.currentTime >= FREE_AUDIO_LIMIT) {
      audioRef.current.currentTime = FREE_AUDIO_LIMIT;
      setCurrentTime(FREE_AUDIO_LIMIT);

      toast(
        "Free users can listen to only 10 seconds. Upgrade to Premium for full access."
      );

      return;
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("Audio playback failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error(errorMessage);
    }
  };

  const handleChapterChange = (index: number) => {
    setCurrentChapterIndex(index);
    setCurrentTime(0);
    setIsPlaying(false);

    // Reset audio when chapter changes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }
  };

  const handleNextChapter = () => {
    if (!book) return;
    const chapterWithAudio = book.chapters.filter((ch) => ch.audioUrl);
    if (currentChapterIndex < chapterWithAudio.length - 1) {
      handleChapterChange(currentChapterIndex + 1);
    }
  };

  const handlePreviousChapter = () => {
    if (currentChapterIndex > 0) {
      handleChapterChange(currentChapterIndex - 1);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }

    if (!audioRef.current) return;

    const currentTime = audioRef.current.currentTime;

    if (!isPremiumUser && currentTime >= FREE_AUDIO_LIMIT) {
      audioRef.current.pause();
      audioRef.current.currentTime = FREE_AUDIO_LIMIT;

      setCurrentTime(FREE_AUDIO_LIMIT);
      setIsPlaying(false);

      if(!hasReachedFreeLimitRef.current){
        hasReachedFreeLimitRef.current = true;

        toast(
          "Free users can listen to only 10 seconds. Upgrade to Premium for full access."
        );

        return;

      } 
    }

    setCurrentTime(currentTime);
  };

  const handleLoadMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {

    let time = parseFloat(e.target.value);

    if (!isPremiumUser && time > FREE_AUDIO_LIMIT) {
      time = FREE_AUDIO_LIMIT;

      toast("Free users can listen to only 10 seconds.");
      return;
    }

    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);

      if (!isPremiumUser && time >= FREE_AUDIO_LIMIT) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDownloadPDF = () => {
    if (!user) {
      toast.error("Please log in to download PDFs");
      router.push("/login");
      return;
    }

    if (!isPremiumUser) {
      toast.error("Upgrade your plan to download PDFs.");
      router.push("/pricing");
      return;
    }

    if (!book) return;
    window.location.assign(`/api/books/${book.id}/download`);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please log in to submit a review");
      router.push("/login");
    }
    /// Validation comment length
    if (reviewData.comment.trim().length < 10) {
      toast.error("Your review must be at least 10 characters long");
      return;
    }

    if (reviewData.comment.trim().length > 1000) {
      toast.error(
        "Your review is too long. Please keep in under 1000 characters"
      );
      return;
    }

    try {
      const response = await fetch("/api/user/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: book?.id,
          rating: reviewData.rating,
          comment: reviewData.comment.trim(),
        }),
      });
      await toastApiResponse(response, {
        success: "Review submitted. It will appear after admin approval.",
        error: "Failed to submit review.",
      });
      if (response.ok) {
        setShowReviewForm(false);
        setReviewData({ rating: 5, comment: "" });
        fetchBook();
      } else {
        return;
      }
    } catch (error) {
      toastApiFailure(error, "Failed to submit review.");
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

  const renderStars = (
    rating: number,
    interactive = false,
    onRate?: (rating: number) => void
  ) => {
    return (
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => interactive && onRate && onRate(i + 1)}
            disabled={!interactive}
            className={`${
              interactive ? "cursor-pointer hover:scale-110" : ""
            } ${i < rating ? "text-yellow-400" : "text-gray-300"} text-2xl`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  if (loading || !book) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading Book...</div>
      </div>
    );
  }

  const summary = book.summary;
  const chapters = book.chapters || [];
  const chaptersWithAudio = chapters.filter((ch) => ch.audioUrl);
  const currentChapter = chaptersWithAudio[currentChapterIndex];
  const isPremiumUser = user?.subscriptionTier !== "FREE";

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Book Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-24">
              <div className="relative h-96 bg-gray-100 rounded-xl mb-4 overflow-hidden">
                {book.coverImageUrl ? (
                  <Image
                    src={book.coverImageUrl}
                    alt={book.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <span className="text-8xl">📖</span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-700">
                  {book.category.icon && (
                    <span className="mr-1">{book.category.icon}</span>
                  )}
                  {book.category.name}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {book.title}
              </h1>
              <p className="text-lg text-gray-600 mb-4">by {book.author}</p>

              <div className="flex items-center justify-between mb-4">
                {renderStars(Math.round(book.averageRating))}
                <span className="text-sm text-gray-600">
                  {book._count.reviews} reviews
                </span>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleToggleFavorite}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors 
                ${
                  book.isFavorited
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } `}
                >
                  {book.isFavorited
                    ? "❤️ Remove from Favorites"
                    : "🤍 Add to Favorites"}
                </button>

                <button
                  onClick={handleDownloadPDF}
                  disabled={!isPremiumUser}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    isPremiumUser
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  } `}
                >
                  {isPremiumUser ? "📥 Download PDF" : "🔒 Upgrade for PDF"}
                </button>
              </div>

              {!isPremiumUser && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium mb-2">
                    🔒 Limited Access
                  </p>
                  <p className="text-xs text-yellow-700 mb-3">
                    You can only listen to 10 seconds of audio. Upgrade to
                    premium for full access!
                  </p>
                  <Link
                    href="/pricing"
                    className="block w-full py-2 bg-yellow-600 text-white rounded-lg font-semibold text-center hover:bg-yellow-700 text-sm"
                  >
                    View Plans
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Summary & Audio */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                About This Book
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {book.description}
              </p>
            </div>

            {/* Audio Player */}
            {chaptersWithAudio.length > 0 && currentChapter && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Audio Summary
                </h2>

                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-sm text-white/80">Now Playing</p>
                      <p className="font-semibold">{book.title}</p>
                      <p className="text-sm text-white/90 mt-1">
                        Chapter {currentChapter.chapterNumber}:{" "}
                        {currentChapter.chapterTitle}
                      </p>
                    </div>
                    <button
                      onClick={handlePlayPause}
                      className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-indigo-600 hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-2xl">
                        {" "}
                        {isPlaying ? "⏸️" : "▶️"}
                      </span>
                    </button>
                  </div>

                  {/* Chapter Navigation */}
                  <div className="flex items-center justify-center space-x-4 mb-4">
                    <button
                      onClick={handlePreviousChapter}
                      disabled={currentChapterIndex === 0}
                      className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ⏮️ Previous
                    </button>
                    <span className="text-sm text-white/80">
                      Chapter {currentChapterIndex + 1} of{" "}
                      {chaptersWithAudio.length}
                    </span>
                    <button
                      onClick={handleNextChapter}
                      disabled={
                        currentChapterIndex === chaptersWithAudio.length - 1
                      }
                      className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next ⏭️
                    </button>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max={
                        isPremiumUser
                          ? duration
                          : Math.min(duration, FREE_AUDIO_LIMIT)
                      }
                      value={Math.min(
                        currentTime,
                        isPremiumUser ? duration : FREE_AUDIO_LIMIT
                      )}
                      onChange={handleSeek}
                      className="w-full h-2 bg-white/30 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-sm text-white/80">
                      <span>{formatTime(currentTime)}</span>
                      
                      <span>
                        {formatTime(
                          isPremiumUser
                            ? duration
                            : Math.min(duration, FREE_AUDIO_LIMIT)
                        )}
                      </span>
                    </div>
                  </div>

                  <audio
                    ref={audioRef}
                    src={currentChapter?.audioUrl || ""}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadMetadata}
                    onEnded={handleNextChapter}
                    key={currentChapterIndex}
                  />

                  {!isPremiumUser && (
                    <div className="mt-4 p-3 bg-yellow-500 rounded-lg">
                      <p className="text-sm font-medium text-white">
                        ⚠️ Free users can only listen to 10 seconds. Upgrade for
                        full access!
                      </p>
                    </div>
                  )}
                </div>

                {/* Chapter Selection */}
                {chaptersWithAudio.length > 1 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      Select Chapter:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {chaptersWithAudio.map((chapter, index) => (
                        <button
                          key={chapter.id}
                          onClick={() => handleChapterChange(index)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentChapterIndex === index
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          Ch. {chapter.chapterNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chapters */}
            {chapters.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Table of Contents
                </h2>
                <div className="space-y-4">
                  {chapters.map((chapter: any, index: number) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:border-indigo-500 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">
                            Chapter {chapter.chapterNumber}:{" "}
                            {chapter.chapterTitle}
                          </h3>
                          {chapter.chapterSummary && (
                            <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                              {chapter.chapterSummary}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>

                {user && (
                  <button
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                    onClick={() => setShowReviewForm(!showReviewForm)}
                  >
                    Write a Review
                  </button>
                )}
              </div>

              {showReviewForm && (
                <form
                  onSubmit={handleSubmitReview}
                  className="mb-8 p-6 bg-gray-50 rounded-xl"
                >
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Your Rating
                    </label>
                    {renderStars(reviewData.rating, true, (rating) =>
                      setReviewData({ ...reviewData, rating })
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Your Review
                      </label>
                      <span
                        className={`text-xs ${
                          reviewData.comment.length < 10
                            ? "text-red-600"
                            : reviewData.comment.length > 1000
                            ? "text-red-600"
                            : "text-gray-500"
                        } `}
                      >
                        {reviewData.comment.length}/1000 Characters
                        {reviewData.comment.length < 10 && "(min: 10)"}
                      </span>
                    </div>
                    <textarea
                      value={reviewData.comment}
                      onChange={(e) =>
                        setReviewData({
                          ...reviewData,
                          comment: e.target.value,
                        })
                      }
                      required
                      rows={4}
                      maxLength={1000}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Share your thoughts about this book (minimum 10 characters)..."
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                    >
                      Submit Review
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {book.reviews.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  No reviews yet. Be the first to review this book!
                </p>
              ) : (
                <div className="space-y-6">
                  {book.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border-b border-gray-200 pb-6 last:border-0"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {review.user.fullName}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            {renderStars(review.rating)}
                            {review.isVerifiedPurchase && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                                ✓ Verified Purchase
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {" "}
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        {review.reviewText}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
