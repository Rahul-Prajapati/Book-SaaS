import { auth } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bookUpdateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  categoryId: z.number().int(),
  description: z.string().min(1, "Description is required"),
  publicationYear: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear())
    .nullable()
    .optional(),
  isbn: z.string().nullable().optional(),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(false),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const book = await prisma.book.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }
    return NextResponse.json(book);
  } catch (error) {
    console.error("Error fetching book", error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    /// Validate request body
    const validation = bookUpdateSchema.safeParse(body);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message;
        }
      });
      return NextResponse.json(
        { error: "Validation failed", errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    /// Generate slug from name
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // update Book
    const book = await prisma.book.update({
      where: { id: parseInt(id) },
      data: {
        title: data.title,
        slug: slug,
        author: data.author,
        categoryId: data.categoryId,
        description: data.description,
        publicationYear: data.publicationYear,
        isbn: data.isbn,
        isFeatured: data.isFeatured,
        isPublished: data.isPublished,
      },
    });

    return NextResponse.json(book);
  } catch (error) {
    console.error("Error updating book", error);
  }
}

type CloudinaryResourceType = "image" | "video";

function getCloudinaryPublicId(
  assetUrl: string | null,
  resourceType: CloudinaryResourceType
): string | null {
  if (!assetUrl || !process.env.CLOUDINARY_CLOUD_NAME) return null;

  try {
    const parsedUrl = new URL(assetUrl);
    const expectedCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (parsedUrl.hostname !== "res.cloudinary.com") return null;

    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    if (
      segments[0] !== expectedCloudName ||
      segments[1] !== resourceType ||
      segments[2] !== "upload"
    ) {
      return null;
    }

    const uploadPath = segments.slice(3);
    const versionIndex = uploadPath.findIndex((segment) => /^v\d+$/.test(segment));
    if (versionIndex < 0 || versionIndex === uploadPath.length - 1) return null;

    const publicIdSegments = uploadPath.slice(versionIndex + 1);
    const lastSegment = publicIdSegments.pop();
    if (!lastSegment) return null;

    // Cloudinary's public ID excludes the delivery URL's file extension.
    publicIdSegments.push(lastSegment.replace(/\.[^/.]+$/, ""));
    const publicId = publicIdSegments.filter(Boolean).join("/");
    return publicId || null;
  } catch {
    return null;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await params;
    if (!/^[1-9]\d*$/.test(rawId)) {
      return NextResponse.json({ error: "A valid book ID is required." }, { status: 400 });
    }

    const bookId = Number(rawId);
    if (!Number.isSafeInteger(bookId)) {
      return NextResponse.json({ error: "A valid book ID is required." }, { status: 400 });
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        coverImageUrl: true,
        originalPdfUrl: true,
        chapters: { select: { audioUrl: true } },
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    const deletedCount = await prisma.$transaction(async (transaction) => {
      const result = await transaction.book.deleteMany({ where: { id: bookId } });
      return result.count;
    });

    if (deletedCount === 0) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    const uniqueAssets = new Map<string, { publicId: string; resourceType: CloudinaryResourceType }>();
    const addAsset = (url: string | null, resourceType: CloudinaryResourceType) => {
      const publicId = getCloudinaryPublicId(url, resourceType);
      if (publicId) uniqueAssets.set(`${resourceType}:${publicId}`, { publicId, resourceType });
    };

    addAsset(book.coverImageUrl, "image");
    addAsset(book.originalPdfUrl, "image");
    for (const chapter of book.chapters) addAsset(chapter.audioUrl, "video");

    const cleanupResults = await Promise.allSettled(
      [...uniqueAssets.values()].map(async ({ publicId, resourceType }) => {
        const result = await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType,
          invalidate: true,
        });
        if (result.result !== "ok" && result.result !== "not found") {
          throw new Error(`Cloudinary returned ${result.result} for ${resourceType} asset.`);
        }
      })
    );

    const failedCleanupCount = cleanupResults.filter(
      (result) => result.status === "rejected"
    ).length;

    if (failedCleanupCount > 0) {
      console.error("Book deleted but Cloudinary cleanup failed", {
        bookId,
        failedCleanupCount,
      });
    }

    return NextResponse.json({
      message:
        failedCleanupCount > 0
          ? "Book deleted, but some Cloudinary files could not be removed."
          : "Book deleted successfully.",
      cleanupWarning: failedCleanupCount > 0,
      failedCleanupCount,
    });
  } catch (error) {
    console.error("Error deleting book", error);
    return NextResponse.json(
      { error: "Failed to delete the book. Please try again." },
      { status: 500 }
    );
  }
}
