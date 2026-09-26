import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

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
        category: {
          select: {
            name: true,
          },
        },
        summary: true,
        chapters: {
          orderBy: {
            chapterNumber: "asc",
          },
        },
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book Not Found" }, { status: 404 });
    }
    return NextResponse.json(book);
  } catch (error) {
    console.error("Error fetching book details", error);
  }
}
