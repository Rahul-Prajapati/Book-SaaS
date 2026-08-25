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

    // Calculate average rating for each book 
    const favoritesWithRatings = await Promise.all(
        favorites.map(async(favorite) => {
            const avgRating = await prisma.bookReview.aggregate({
                where: {
                    bookId: favorite.book.id,
                    isApproved: true
                },
                _avg:{
                    rating: true,
                },
            });

        return {
            id: favorite.id,
            bookId: favorite.bookId,
            createdAt: favorite.createdAt,
            book: {
                ...favorite.book,
                averageRating: avgRating._avg.rating || 0,
            },
        };
        })
    );

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