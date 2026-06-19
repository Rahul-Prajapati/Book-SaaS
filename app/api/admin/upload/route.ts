import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (type === "payment_proof") {
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      // for cover and pdf must be admin
      if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let uploadDir: string;
    let urlPath: string;

    if (type === "cover") {
      uploadDir = join(process.cwd(), "public", "uploads", "covers");
      urlPath = "covers";
    } else if (type === "pdf") {
      uploadDir = join(process.cwd(), "public", "uploads", "pdfs");
      urlPath = "pdfs";
    } else if (type === "payment_proof") {
      uploadDir = join(process.cwd(), "public", "uploads", "payment-proofs");
      urlPath = "payment-proofs";
    } else {
      return NextResponse.json(
        { error: "Invalid upload type" },
        { status: 400 }
      );
    }

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique file name
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${originalName}`;
    const filepath = join(uploadDir, filename);

    // save this file
    await writeFile(filepath, buffer);

    // Return URL
    const url = `/uploads/${urlPath}/${filename}`;
    return NextResponse.json({ url, filename }, { status: 200 });
  } catch (error) {
    console.error("Error uploading file", error);
  }
}
