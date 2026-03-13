/**
 * Syllabus PDF text extraction using AWS Textract.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  KILL SWITCH — set to false to disable all PDF processing  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
const ENABLE_SYLLABUS_PDF = true;

const {
  TextractClient,
  DetectDocumentTextCommand,
} = require('@aws-sdk/client-textract');

const textract = new TextractClient({
  region: process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || 'us-west-2',
});

/**
 * Download a PDF from a URL and extract text via Textract.
 * Returns the extracted text or null on failure.
 */
async function extractTextFromPdfUrl(url) {
  // Download the PDF bytes
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download PDF: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());

  // Textract DetectDocumentText accepts up to 10MB inline
  if (buffer.length > 10 * 1024 * 1024) {
    console.warn('Syllabus PDF too large for inline Textract (>10MB), skipping');
    return null;
  }

  const command = new DetectDocumentTextCommand({
    Document: { Bytes: buffer },
  });

  const result = await textract.send(command);

  // Collect all LINE blocks into text
  const lines = (result.Blocks || [])
    .filter((b) => b.BlockType === 'LINE')
    .map((b) => b.Text)
    .filter(Boolean);

  return lines.join('\n');
}

/**
 * Process all syllabus PDF files in the canvasData courses.
 * Mutates each course: appends extracted text to syllabusBody.
 *
 * Call this BEFORE trimForAI.
 */
async function processSyllabusPdfs(canvasData) {
  if (!ENABLE_SYLLABUS_PDF) return canvasData;
  if (!canvasData?.courses) return canvasData;

  const promises = canvasData.courses.map(async (course) => {
    const pdfFiles = (course.syllabusFiles || []).filter((f) =>
      f.name?.toLowerCase().endsWith('.pdf') && f.url
    );

    if (pdfFiles.length === 0) return;

    for (const file of pdfFiles) {
      try {
        console.log(`  OCR: extracting text from ${file.name} (${course.code})`);
        const text = await extractTextFromPdfUrl(file.url);
        if (text && text.length > 0) {
          // Append to existing syllabusBody or create it
          const header = `\n\n--- Syllabus from ${file.name} ---\n`;
          course.syllabusBody = (course.syllabusBody || '') + header + text;
          console.log(`  OCR: got ${text.length} chars from ${file.name}`);
        }
      } catch (err) {
        console.error(`  OCR failed for ${file.name} (${course.code}):`, err.message);
        // Non-fatal — keep going
      }
    }
  });

  await Promise.all(promises);
  return canvasData;
}

module.exports = { processSyllabusPdfs, ENABLE_SYLLABUS_PDF };
