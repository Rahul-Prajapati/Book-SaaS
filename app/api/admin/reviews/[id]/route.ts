import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reviewUpdateSchema = z.object({
  isApproved: z.boolean(),
});

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

    // Validation request from body
    const validation = reviewUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if review exists
    const existingReview = await prisma.bookReview.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    /// Update review
    const review = await prisma.bookReview.update({
      where: { id: parseInt(id) },
      data: {
        isApproved: data.isApproved,
      },
    });
    return NextResponse.json(review);
  } catch (error) {
    console.error("error pdating reveiw", error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if review exists
    const review = await prisma.bookReview.findUnique({
      where: { id: parseInt(id) },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    /// Delete review
    await prisma.bookReview.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: "Review Deleted successfully" });
  } catch (error) {
    console.error("error deleting review", error);
  }
}
