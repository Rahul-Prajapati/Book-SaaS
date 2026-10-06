import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const listenTimeSchema = z.object({
  seconds: z.number().int().min(1).max(30),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const validation = listenTimeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid listening time" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { audioListenTime: { increment: validation.data.seconds } },
      select: { id: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording audio listening time", error);
    return NextResponse.json(
      { error: "Failed to record listening time" },
      { status: 500 }
    );
  }
}
