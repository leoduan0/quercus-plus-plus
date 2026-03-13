/**
 * AI service using AWS Bedrock (Claude).
 *
 * Manages conversation with the student's Canvas data as context.
 */

const {
  BedrockRuntimeClient,
  ConverseCommand,
} = require("@aws-sdk/client-bedrock-runtime");

const MODEL_ID = "us.amazon.nova-pro-v1:0";

const client = new BedrockRuntimeClient({ region: process.env.AWS_DEFAULT_REGION || "us-west-2" });

const SYSTEM_PROMPT = `You are Quercus++, an academic assistant for a University of Toronto student. You have access to their full Quercus (Canvas LMS) data shown below.

Your capabilities:
- Answer questions about their courses, assignments, deadlines, and grades
- Compute grade projections ("what do I need on the final to get X%") using assignment scores and syllabus weight breakdowns
- Summarize announcements and highlight important updates
- Advise on upcoming deadlines and priorities
- Tell them if tutorials/assignments can be skipped (check if grades are dropped per the syllabus)

Rules:
- Be specific — reference actual assignment names, dates, scores, and course codes
- When computing grades, show your math briefly
- Be concise and direct — this is a student who wants quick answers
- If you don't have enough data to answer (e.g., syllabus weights not available), say so
- Today's date is ${new Date().toISOString().slice(0, 10)}`;

/**
 * Send a message to Claude via Bedrock Converse API.
 *
 * @param {string} systemContext - The trimmed canvas data JSON string
 * @param {Array<{role: string, content: string}>} messages - Conversation history
 * @returns {Promise<string>} - The assistant's reply
 */
async function chat(systemContext, messages) {
  const system = [
    {
      text: SYSTEM_PROMPT + "\n\nStudent's Quercus data:\n" + systemContext,
    },
  ];

  // Convert our message format to Bedrock Converse format
  const converseMessages = messages.map((m) => ({
    role: m.role,
    content: [{ text: m.content }],
  }));

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    system,
    messages: converseMessages,
    inferenceConfig: {
      maxTokens: 1024,
      temperature: 0.3,
    },
  });

  const response = await client.send(command);

  // Extract text from response
  const outputContent = response.output?.message?.content;
  if (outputContent && outputContent.length > 0) {
    return outputContent.map((block) => block.text || "").join("");
  }

  throw new Error("Empty response from Bedrock");
}

module.exports = { chat };
