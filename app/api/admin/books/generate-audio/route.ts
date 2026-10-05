import { auth } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
// import { writeFile, mkdir, unlink } from "fs/promises";
// import { join } from "path";
// import { existsSync } from "fs";

const openRouterAi = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const modelName = process.env.LLM_VOICE_MODEL_NAME!;
const llmvoice = process.env.LLM_MODEL_VOICE!;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId } = await request.json();

    if (!bookId) {
      return NextResponse.json(
        { error: "Book Id is required" },
        { status: 401 }
      );
    }

    // Get book and summary
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        summary: true,
        chapters: {
          orderBy: { chapterNumber: "asc" },
        },
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    if (!book.summary) {
      return NextResponse.json(
        { error: "Please generate summary first" },
        { status: 400 }
      );
    }

    // Create upload directory if its does not exist
    // const uploadDir = join(process.cwd(), "public", "uploads", "audio");
    // if (!existsSync(uploadDir)) {
    //   await mkdir(uploadDir, { recursive: true });
    // }

    // Create a readable stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendMessage = (message: string) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ message })}\n\n`)
          );
        };

        try {
          sendMessage("Staring audio generation...");
          let totalDuration = 0;

          // generate audio for each chapter

          for (let i = 0; i < book.chapters.length; i++) {
            const chapter = book.chapters[i];
            sendMessage(
              `Generating audio for Chapter ${chapter.chapterNumber}: ${chapter.chapterTitle}...`
            );

            // Generate sppech using Openai tts
            const mp3Response = await openRouterAi.audio.speech.create({
              //    model: "openrouter/free",
              model: modelName,
              // model: "fish-audio/s2.1-pro-free:free",
              voice: llmvoice,
              response_format: "mp3",
              input: `Chapter ${chapter.chapterNumber}: ${chapter.chapterTitle}. ${chapter.chapterSummary}`,
            });

            const audioFilename = `${book.id}-chapter-${
              chapter.chapterNumber
            }-${Date.now()}`;
            
            const audioBuffer = Buffer.from(
              await mp3Response.arrayBuffer()
            );
            
            const result = await new Promise<any>((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: "book-saas/audio",
                  resource_type: "video",
                  public_id: audioFilename,
                  format: "mp3",
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );
            
              uploadStream.end(audioBuffer);
            });
            
            const audioUrl = result.secure_url;
            
            // console.log("Audio uploaded to Cloudinary:", audioUrl);

            // Get the existing audio URL before replacing it
            // const existingChapter = await prisma.bookChapter.findUnique({
            //   where: { id: chapter.id },
            // });

            // const oldAudioUrl = existingChapter?.audioUrl;

            // Save audio file
            // const audioFilename = `${book.id}-chapter-${
            //   chapter.chapterNumber
            // }-${Date.now()}.mp3`;
            // const audioPath = join(uploadDir, audioFilename);
            // const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());
            // await writeFile(audioPath, audioBuffer);

            // const audioUrl = `/uploads/audio/${audioFilename}`;

            // Estimate duration (150 Words per minute, average 5 characters per word)
            const estimatedDuration = Math.ceil(
              (chapter.chapterSummary.length / 5 / 150) * 60
            );
            totalDuration += estimatedDuration;

            // Update chapter with audio url
            await prisma.bookChapter.update({
              where: { id: chapter.id },
              data: {
                audioUrl: audioUrl,
                audioDuration: estimatedDuration,
              },
            });
            sendMessage(
              `Chapter ${chapter.chapterNumber} audio generated successfully`
            );

            // Delete OLD audio file
            // if (oldAudioUrl) {
            //   const oldAudioRelativePath = oldAudioUrl.replace(/^\/+/, "");

            //   const oldAudioPath = join(
            //     process.cwd(),
            //     "public",
            //     oldAudioRelativePath
            //   );

            //   try {
            //     await unlink(oldAudioPath);
            //     console.log("Deleted old audio:", oldAudioPath);
            //   } catch (error: any) {
            //     // File may already have been deleted
            //     if (error.code !== "ENOENT") {
            //       console.error("Failed to delete old audio:", error);
            //     }
            //   }
            // }

            // 
          }

          // Update book with audio status
          await prisma.book.update({
            where: { id: book.id },
            data: {
              audioGenerated: true,
              totalAudioDuration: totalDuration,
            },
          });
          sendMessage("Audio generation completed");
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                message: "Completed",
                completed: true,
              })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          console.error("Error Generating audio!!", error);
          // return new Response(error instanceof Error ? error.message : String(error), { status: 500 });
          const errorMessage =
          error instanceof Error ? error.message : String(error);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: errorMessage,
              })}\n\n`
            )
          );
        
          controller.close();
      
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error Generating audio", error);
    return new Response(error instanceof Error ? error.message : String(error), { status: 500 });
  }
}
