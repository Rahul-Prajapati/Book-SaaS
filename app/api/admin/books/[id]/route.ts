import { auth } from "@/lib/auth";
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
