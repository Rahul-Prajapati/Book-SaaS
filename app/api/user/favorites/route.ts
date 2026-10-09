import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const favoriteSchema = z.object({
    bookId: z.number().positive(),
});

export async function GET(request: NextRequest) {

    try {

         const session = await auth();

         if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, {status: 401});
        }

    const favorites = await prisma.userFavorite.findMany({
        where: {
            userId: session.user.id,
        },
        include: {
            book:{
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            icon: true,
                        },
                    },
                    _count: {
                       select: {
                         reviews: true,
                         favorites: true,
                       },
                    },
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    const bookIds = favorites.map((favorite) => favorite.bookId);
    const ratings = bookIds.length
      ? await prisma.bookReview.groupBy({
          by: ["bookId"],
          where: { bookId: { in: bookIds }, isApproved: true },
          _avg: { rating: true },
        })
      : [];
    const ratingByBookId = new Map(
      ratings.map((rating) => [rating.bookId, rating._avg.rating ?? 0])
    );

    const favoritesWithRatings = favorites.map((favorite) => ({
      id: favorite.id,
      bookId: favorite.bookId,
      createdAt: favorite.createdAt,
      book: {
        ...favorite.book,
        averageRating: ratingByBookId.get(favorite.bookId) ?? 0,
      },
    }));

    return NextResponse.json(favoritesWithRatings);
      
    } catch (error) {
        console.error("Error Fetching favories",error);
    }

}



/// Post or add data in favorites table 
export async function POST(request: NextRequest){
    try {
        const session = await auth();

         if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, {status: 401});
        }

    const body = await request.json();
    const validation = favoriteSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json(
            {error: "Invaild request", details: validation.error.issues},
            {status: 400}
        );
    }

    const {bookId} = validation.data;

    // check book is exists and is published
    const book = await prisma.book.findFirst({
        where: {
            id: bookId,
            isPublished: true
        },
    });
    
    if (!book) {
        return NextResponse.json(
            {error: "Book not found or not published"}, 
            {status: 404}
        );
    }

    // Check if this book already in favorited 
    const existingFavorite = await prisma.userFavorite.findFirst({
        where: {
            userId: session.user.id,
            bookId,
        },
    });

    if (existingFavorite) {
        return NextResponse.json(
            {error: "Book already in favorites"}, 
            {status: 400}
        );
    }

    /// Add this book to favorites 
    const favorite = await prisma.userFavorite.create({
        data: {
            userId: session.user.id,
            bookId,
        },
        include: {
            book: {
                include: {
                    category: true,
                },
            },
        },
    });
    return NextResponse.json(favorite, {status: 201});
    } catch (error) {
        console.error("Error adding favorite", error);
    }

}
