import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type DownloadErrorCode =
  | "login_required"
  | "upgrade_required"
  | "book_unavailable"
  | "pdf_unavailable"
  | "download_failed";

function redirectWithDownloadError(
  request: Request,
  path: string,
  code: DownloadErrorCode
) {
  const destination = new URL(path, request.url);
  destination.searchParams.set("downloadError", code);
  return NextResponse.redirect(destination);
}

function getCloudinaryPdfUrl(value: string | null) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!value || !cloudName) return null;

  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);

    if (
      url.protocol !== "https:" ||
      url.hostname !== "res.cloudinary.com" ||
      url.port !== "" ||
      url.username ||
      url.password ||
      segments[0] !== cloudName ||
      segments[1] !== "image" ||
      segments[2] !== "upload" ||
      !segments.some((segment) => /^v\d+$/.test(segment))
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let destinationPath = "/books";

  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "USER" && session.user.role !== "ADMIN")) {
      return redirectWithDownloadError(request, "/login", "login_required");
    }

    const { id } = await params;
    if (!/^\d+$/.test(id)) {
      return redirectWithDownloadError(request, "/books", "book_unavailable");
    }
    destinationPath = `/books/${id}`;

    const [user, book] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { subscriptionTier: true },
      }),
      prisma.book.findFirst({
        where: { id: Number(id), isPublished: true },
        select: { title: true, originalPdfUrl: true },
      }),
    ]);

    if (!book) return redirectWithDownloadError(request, "/books", "book_unavailable");
    if (!user || user.subscriptionTier === "FREE") {
      return redirectWithDownloadError(request, destinationPath, "upgrade_required");
    }

    const pdfUrl = getCloudinaryPdfUrl(book.originalPdfUrl);
    if (!pdfUrl) {
      console.error("Book has a missing or invalid Cloudinary PDF URL", { bookId: id });
      return redirectWithDownloadError(request, destinationPath, "pdf_unavailable");
    }

    const pdfResponse = await fetch(pdfUrl, {
      cache: "no-store",
      redirect: "error",
    });
    if (!pdfResponse.ok || !pdfResponse.body) {
      console.error("Cloudinary PDF request failed", { bookId: id, status: pdfResponse.status });
      return redirectWithDownloadError(request, destinationPath, "download_failed");
    }

    const safeTitle = book.title
      .replace(/[\\/:*?"<>|\r\n]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "book";
    const filename = `${safeTitle}.pdf`;
    const fallbackFilename = filename
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/["\\]/g, "_");
    const encodedFilename = encodeURIComponent(filename).replace(/[!'()*]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    );

    return new Response(pdfResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodedFilename}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error downloading book PDF", error);
    return redirectWithDownloadError(request, destinationPath, "download_failed");
  }
}
