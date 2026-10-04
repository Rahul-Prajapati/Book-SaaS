import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
// import { readFile } from "fs/promises";
// import { join } from "path";
import { DOMMatrix as CanvasDOMMatrix } from "canvas";
import pdf from "pdf-extraction";

const openRouterAi = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const modelName = process.env.LLM_MODEL_NAME!;

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

    // Get book details
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    /// Create readble stream for Server-send events.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendMessage = (message: string) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ message })}\n\n`)
          );
        };

        try {
          sendMessage("Starting summary generation...");
          // extract text from pdf
          let pdfText = "";
          if (book.originalPdfUrl) {
            sendMessage("Extracting text from PDF...");
            try {
              // global.DOMMatrix = DOMMatrix;
              (global as any).DOMMatrix = CanvasDOMMatrix;

              // const pdfPath = join(
              //   process.cwd(),
              //   "public",
              //   book.originalPdfUrl
              // );
              // const dataBuffer = await readFile(pdfPath);

              // console.log("originpdf url :::", book.originalPdfUrl);

              const pdfResponse = await fetch(book.originalPdfUrl);

              // console.log("pdfResponse :::", pdfResponse);

              if (!pdfResponse.ok) {
                throw new Error(
                  `Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`
                );
              }

              const dataBuffer = Buffer.from(await pdfResponse.arrayBuffer());
              const pdfData = await pdf(dataBuffer);

              pdfText = pdfData.text;

              // Limit to first 15000 characters to avoid token limits
              if (pdfText.length > 15000) {
                pdfText = pdfText.substring(0, 15000);
              }
              sendMessage(`Extracted ${pdfText.length} characters from PDF`);
            } catch (error) {
              console.error("PDF extraction error:", error);
              sendMessage(
                "Warning: Could not extract pdf text using description instead"
              );
              pdfText = book.description || "";
            }
          } else {
            pdfText = book.description || "";
          }
          sendMessage("Sending to CHAT GPT API...");

          // GENERATE MAIN SUMMARY FOR THE BOOK

          const summaryCompletion = await openRouterAi.chat.completions.create({
            model: modelName,
            // model: "openrouter/free",
            
            // model: "nex-agi/nex-n2.5-pro:free",
            messages: [
              {
                role: "system",
                content:
                  "You are a professional book summarizer.You write polished book summaries for readers, Create concise, engaging summaries that capture the key insights and main ideas of books.Never include analysis, planning, drafts, or discussion of the prompt.",
              },
              {
                role: "user",
                content: `Create a comprehensive summary for the following book:
  
  Title: ${book.title}
  Author: ${book.author}
  
  Book Content:
  ${pdfText}
  
  Return a reader-facing response only, with these sections:
  1. A main summary (150-200 words) that captures the essence of the book
  2. 5-7 key takeaways (bullet points)
  3. Target audience
  4. Main themes`,
              },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          });

          const summaryText =
            summaryCompletion.choices[0].message.content || "";
          sendMessage("Generating table of contents...");

          // Generate table of contents

          const tocCompletion = await openRouterAi.chat.completions.create({
            model: "openrouter/free",
            //  model: "nex-agi/nex-n2.5-pro:free",
            messages: [
              {
                role: "system",
                content: `You are creating a table of contents for a book summary. 
                  Return ONLY a JSON array. Do not include markdown, code fences, explanations, safety messages or analysis..
                  `,
              },
              {
                role: "user",
                content: `Create a table of contents (chapter list) for "${book.title}" by ${book.author}.
               Return ONLY a JSON array of objects with this structure: [{"chapterNumber": 1, "title": "Chapter Title", "description": "Brief description"}]
               Create 8-12 logical chapters.`,
              },
            ],
            temperature: 0.7,
            max_tokens: 800,
          });

          let tableOfContents = [];
          try {
            const tocText = tocCompletion.choices[0].message.content || "[]";
            tableOfContents = JSON.parse(tocText);
          } catch (e) {
            console.error("Failed to parse toc", e);
            tableOfContents = [
              {
                chapterNumber: 1,
                title: "Introduction",
                description: "Overview of the book",
              },
              {
                chapterNumber: 2,
                title: "Main Content",
                description: "Key concepts and ideas",
              },
              {
                chapterNumber: 3,
                title: "Conclusion",
                description: "Final thoughts and takeaways",
              },
            ];
          }

          sendMessage("Generating details chapter summaries...");

          // Generate details in 150 word summary for each chapter

          const chaptersWithSummaries = [];
          for (let i = 0; i < tableOfContents.length; i++) {
            const chapter = tableOfContents[i];
            sendMessage(
              `Generating professional summary for Chapter ${chapter.chapterNumber}: ${chapter.title}...`
            );

            try {
              const chapterSummaryCompletion =
                await openRouterAi.chat.completions.create({
                  model: "openrouter/free",
                  //  model: "nex-agi/nex-n2.5-pro:free",
                  messages: [
                    {
                      role: "system",
                      content:
                        "You are a professional book summarizer. Write polished book summaries for readers, create detailed, engaging, and professional chapter summaries that capture the key insights and actionable takeaways. Output only the requested summary. Never reveal analysis, planning, instructions, drafts, or discussion of the prompt.",
                    },
                    {
                      role: "user",
                      content: `Based on the following book content, create a detailed 150-words professional summary for this specific chapter:

Book: "${book.title}" by ${book.author}
Chapter ${chapter.chapterNumber}: ${chapter.title}

Book Content:
${pdfText}

Create a comprehensive, professional summary of exactly 120-180 words that:
1. Captures the main ideas and key concepts of this chapter
2. Highlights actionable insights and takeaways
3. Uses engaging, professional language
4. Provides value to readers looking to understand this chapter's core message

Return ONLY the 120-180 word summary text, nothing else.`,
                    },
                  ],
                  temperature: 0.7,
                  max_tokens: 500,
                });

              const detailedSummary =
                chapterSummaryCompletion.choices[0].message.content ||
                chapter.description;
              chaptersWithSummaries.push({
                ...chapter,
                detailedSummary: detailedSummary,
              });

              sendMessage(`Chapter ${chapter.chapterNumber} summary completed`);
            } catch (error) {
              console.error(
                `Error generating summary for chapter ${chapter.chapterNumber}:`,
                error
              );
              chaptersWithSummaries.push({
                ...chapter,
                detailedSummary: chapter.description,
              });
              sendMessage(
                `Warning: using brief description for chapter ${chapter.chapterNumber}`
              );
            }
          }

          sendMessage("Saving summary to database...");

          // save to database with upsert to check first if data exist or not
          await prisma.bookSummary.upsert({
            where: { bookId: book.id },
            update: {
              mainSummary: summaryText,
              tableOfContents: tableOfContents,
            },
            create: {
              bookId: book.id,
              mainSummary: summaryText,
              tableOfContents: tableOfContents,
            },
          });

          // Create chapters with detials in book chapter table
          for (const chapter of chaptersWithSummaries) {
            await prisma.bookChapter.create({
              data: {
                bookId: book.id,
                chapterNumber: chapter.chapterNumber,
                chapterTitle: chapter.title,
                chapterSummary: chapter.detailedSummary,
                audioUrl: null,
                audioDuration: 0,
              },
            });
          }

          /// Update book Status
          await prisma.book.update({
            where: { id: book.id },
            data: { summaryGenerated: true },
          });
          sendMessage("Summary generation completed");
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
          console.error("Error generating summary", error);
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
    console.error("Error generating summary", error);
  }
}
