import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await auth();

    const book = await prisma.book.findFirst({
      where: {
        id: parseInt(id),
        isPublished: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
        summary: {
          select: {
            id: true,
            mainSummary: true,
            keyTakeaways: true,
            fullSummary: true,
            tableOfContents: true,
          },
        },
        chapters: {
          orderBy: {
            displayOrder: "asc",
          },
          select: {
            id: true,
            chapterNumber: true,
            chapterTitle: true,
            chapterSummary: true,
            audioUrl: true,
            audioDuration: true,
          },
        },
        reviews: {
          where: {
            isApproved: true,
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
        _count: {
          select: {
            reviews: true,
            favorites: true,
          },
        },
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }
    // Calaculate avarage ratings

    const avgRating = await prisma.bookReview.aggregate({
      where: {
        bookId: book.id,
        isApproved: true,
      },
      _avg: {
        rating: true,
      },
    });

    /// Check if current user has favorited this book
    let isFavorited = false;
    if (session?.user) {
      const favorite = await prisma.userFavorite.findFirst({
        where: {
          userId: session.user.id,
          bookId: book.id,
        },
      });
      isFavorited = !!favorite;
    }

    // Get user subscription tier
    const userSubscriptionTier = session?.user?.subscriptionTier || "FREE";

    return NextResponse.json({
      ...book,
      averageRating: avgRating._avg.rating || 0,
      isFavorited,
      userSubscriptionTier,
    });
  } catch (error) {
    console.error("Error Fetching book", error);
  }
}
