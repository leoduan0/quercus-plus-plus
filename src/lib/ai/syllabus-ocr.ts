import {
  DetectDocumentTextCommand,
  TextractClient,
} from "@aws-sdk/client-textract";
import type { CanvasData } from "@/lib/types";

const ENABLE_SYLLABUS_PDF = true;

const textract = new TextractClient({
  region:
    process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || "us-west-2",
});

async function extractTextFromPdfUrl(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to download PDF: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > 10 * 1024 * 1024) {
    console.warn(
      "Syllabus PDF too large for inline Textract (>10MB), skipping",
    );
    return null;
  }

  const command = new DetectDocumentTextCommand({
    Document: { Bytes: buffer },
  });

  const result = await textract.send(command);

  const lines = (result.Blocks || [])
    .filter((b) => b.BlockType === "LINE")
    .map((b) => b.Text)
    .filter(Boolean);

  return lines.join("\n");
}

export async function processSyllabusPdfs(canvasData: CanvasData) {
  if (!ENABLE_SYLLABUS_PDF) return canvasData;
  if (!canvasData?.courses) return canvasData;

  const promises = canvasData.courses.map(async (course) => {
    const pdfFiles = (course.syllabusFiles || []).filter(
      (f) => f.name?.toLowerCase().endsWith(".pdf") && f.url,
    );

    if (pdfFiles.length === 0) return;

    for (const file of pdfFiles) {
      try {
        const text = await extractTextFromPdfUrl(file.url!);
        if (text && text.length > 0) {
          const header = `\n\n--- Syllabus from ${file.name} ---\n`;
          course.syllabusBody = (course.syllabusBody || "") + header + text;
        }
      } catch (err: any) {
        console.error(`OCR failed for ${file.name}:`, err.message);
      }
    }
  });

  await Promise.all(promises);
  return canvasData;
}

export { ENABLE_SYLLABUS_PDF };
