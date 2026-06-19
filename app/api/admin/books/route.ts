import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";


const bookSchema = z.object({

    title: z.string().min(1, "Title is required"),
    author: z.string().min(1, "Author is required"),
    categoryId: z.number().int(),
    description: z.string().min(1, "Description is required"),
    publicationYear: z.number().int().min(1900).max(new Date().getFullYear()).nullable().optional(),
    isbn: z.string().nullable().optional(),
    tags: z.string().nullable().optional(),
    coverImageUrl: z.string().nullable().optional(),
    pdfUrl: z.string().nullable().optional(),
    isFeatured: z.boolean().default(false),
    isPublished: z.boolean().default(false),
});


export async function POST(request: NextRequest) {
    try {
        
const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized"}, { status: 401});
        }

    const body = await request.json();

    /// Validate request body 
    const validation = bookSchema.safeParse(body);
    if (!validation.success) {
        const errors: Record<string, string> = {};
        validation.error.issues.forEach((issue) => {
            if (issue.path[0]) {
                errors[issue.path[0].toString()] = issue.message;
            }
        });
        return NextResponse.json(
            {error: "Vlaidation filed", errors},
            { status: 400}
        );
    }

    const data = validation.data;
    
    /// Generate slug from name 
    const slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    /// Create book in book table 
    const book = await prisma.book.create({
        data: {
            title: data.title,
            slug: slug,
            author: data.author,
            categoryId: data.categoryId,
            description: data.description,
            publicationYear: data.publicationYear,
            isbn: data.isbn, 
            coverImageUrl: data.coverImageUrl,
            originalPdfUrl: data.pdfUrl,
            isFeatured: data.isFeatured,
            isPublished: data.isPublished,
            summaryGenerated: false,
            audioGenerated: false,
            createdById: session.user.id,
        },

    });

    return NextResponse.json(book,{status:201});
    } catch (error) {
        console.error("Error Creating book", error);
    }
}