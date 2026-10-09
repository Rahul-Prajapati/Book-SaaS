import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
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

        const where: Prisma.BookWhereInput = {
            isPublished: true,
        };

        if (search) {
            where.OR = [
                { title: { contains: search } },
                { author: { contains: search } },
                { description: { contains: search } },
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

    const bookIds = books.map((book) => book.id);
    const [ratings, favorites] = await Promise.all([
        bookIds.length
            ? prisma.bookReview.groupBy({
                by: ["bookId"],
                where: { bookId: { in: bookIds }, isApproved: true },
                _avg: { rating: true },
            })
            : Promise.resolve([]),
        session?.user && bookIds.length
            ? prisma.userFavorite.findMany({
                where: { userId: session.user.id, bookId: { in: bookIds } },
                select: { bookId: true },
            })
            : Promise.resolve([]),
    ]);
    const ratingByBookId = new Map(
        ratings.map((rating) => [rating.bookId, rating._avg.rating ?? 0])
    );
    const favoritedBookIds = new Set(favorites.map((favorite) => favorite.bookId));

    const booksWithRatings = books.map((book) => ({
        ...book,
        averageRating: ratingByBookId.get(book.id) ?? 0,
        isFavorited: favoritedBookIds.has(book.id),
    }));

    return NextResponse.json({
        books: booksWithRatings,
        pagination: {
            page,
            limit, 
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
        },
    });
    } catch (error) {
        console.error("Error fetching books", error);
        return NextResponse.json(
            { error: "Failed to fetch books" },
            { status: 500 }
        );
    }
}
