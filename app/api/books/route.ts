import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get("search") || "";
        const category = searchParams.get("category") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "12");
        const skip = (page - 1) * limit;

        const where: any = {
            isPublished: true,
        };

        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { author: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];            
        }

        if (category) {
            where.categoryId = parseInt(category);
        }

    // Fetch books data with pagination 
    const [books, totalCount] = await Promise.all([
        prisma.book.findMany({
            where,
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
            orderBy: {
                createdAt: "desc",
            },
            skip,
            take: limit,
        }),
        prisma.book.count({ where }),
    ]);

    // Calaculate avarage ratings 
    const booksWithRatings = await Promise.all(
        books.map(async(book) => {
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
        return {
            ...book,
            averageRating: avgRating._avg.rating || 0,
            isFavorited,
        };
        }) 
    );

    return NextResponse.json({
        books: booksWithRatings,
        pagination: {
            page,
            limit, 
            totalCount,
            totalPage: Math.ceil(totalCount / limit),
        },
    });
    } catch (error) {
        console.error("Error fetching books", error);
    }
}