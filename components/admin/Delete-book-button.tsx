"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toastApiFailure, toastApiResponse } from "@/lib/client/api-toast";

type DeleteBookButtonProps = {
  bookId: number;
  title: string;
};

export default function DeleteBookButton({ bookId, title }: DeleteBookButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const requestInProgress = useRef(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Permanently delete "${title}"? This also removes its summaries, chapters, reviews, favorites, and reading history.`
    );
    if (!confirmed || requestInProgress.current) return;

    requestInProgress.current = true;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/books/${bookId}`, {
        method: "DELETE",
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        cleanupWarning?: boolean;
      };

      await toastApiResponse(response, {
        success: result.message || "Book deleted successfully.",
        error: result.error || "Failed to delete book.",
        successTone: result.cleanupWarning ? "error" : "success",
      });

      if (!response.ok) {
        router.refresh();
        return;
      }

      router.refresh();
    } catch (error) {
      toastApiFailure(error, "Failed to delete book.");
      // Refresh from the database in case the request completed but its response was lost.
      router.refresh();
    } finally {
      requestInProgress.current = false;
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-busy={deleting}
      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}
