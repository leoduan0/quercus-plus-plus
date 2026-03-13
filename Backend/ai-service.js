const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require('@aws-sdk/client-bedrock-runtime');

const MODEL_ID =
  process.env.BEDROCK_MODEL_ID || 'us.amazon.nova-pro-v1:0';

const client = new BedrockRuntimeClient({
  region: process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || 'us-west-2',
});

// Detect model family from model ID string
const isNovaModel = (id) => id.includes('amazon.nova');
const isClaudeModel = (id) => id.includes('anthropic.claude');

// ---------------------------------------------------------------------------
// Invoke wrapper — handles both Amazon Nova and Anthropic Claude formats
// ---------------------------------------------------------------------------
async function invokeModel(systemPrompt, messages, opts = {}) {
  let payload;

  if (isNovaModel(MODEL_ID)) {
    payload = {
      system: [{ text: systemPrompt }],
      messages: messages.map((m) => ({
        role: m.role,
        content: [{ text: m.content }],
      })),
      inferenceConfig: {
        maxTokens: opts.maxTokens || 4096,
        temperature: opts.temperature ?? 0.01,
        topP: opts.topP ?? 0.9,
      },
    };
  } else if (isClaudeModel(MODEL_ID)) {
    payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: opts.maxTokens || 4096,
      temperature: opts.temperature ?? 0.01,
      top_k: 250,
      top_p: opts.topP ?? 0.01,
      stop_sequences: ['\n\nHuman'],
      system: systemPrompt,
      messages,
    };
  } else {
    throw new Error(`Unsupported model: ${MODEL_ID}`);
  }

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  const response = await client.send(command);
  const body = JSON.parse(Buffer.from(response.body).toString('utf-8'));

  if (isNovaModel(MODEL_ID)) {
    return body.output.message.content[0].text;
  }
  return body.content[0].text;
}

// ---------------------------------------------------------------------------
// Router — decides which "retriever" should handle the question
// ---------------------------------------------------------------------------
const ROUTER_SYSTEM = `You are a query router. Given a user question and two available retrievers,
decide which retriever is most appropriate to answer the question.

Retrievers:
1. "structured_data" - Best for questions that require looking up specific facts from course data, such as grades, assignment due dates, scores, upcoming events, or to-do items. Use this when the answer can be found by querying structured records.
2. "knowledge_base" - Best for general academic advice, study tips, explanations of concepts, and questions that rely on broader knowledge rather than specific course records.

Respond with ONLY a JSON object: {"retriever": "structured_data"} or {"retriever": "knowledge_base"}`;

async function routeQuery(question) {
  const text = await invokeModel(
    ROUTER_SYSTEM,
    [{ role: 'user', content: question }],
    { maxTokens: 64, temperature: 0, topP: 0.9 },
  );

  try {
    const jsonMatch = text.match(/\{[^}]+\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text.trim());
    return parsed.retriever === 'knowledge_base' ? 'knowledge_base' : 'structured_data';
  } catch {
    return 'structured_data';
  }
}

// ---------------------------------------------------------------------------
// Structured-data retriever
// ---------------------------------------------------------------------------
function retrieveStructuredContext(context) {
  if (!context) return 'No course data available.';
  // Handle both string and object context
  const contextStr = typeof context === 'string' ? context : JSON.stringify(context, null, 2);
  return `STUDENT COURSE DATA (structured records):\n${contextStr}`;
}

// ---------------------------------------------------------------------------
// Knowledge-base retriever
// ---------------------------------------------------------------------------
function retrieveKnowledgeBaseContext() {
  return 'Use your general academic knowledge to answer this question.';
}

// ---------------------------------------------------------------------------
// Main chat function
// Signature matches what app.js expects: chat(contextString, messages)
// ---------------------------------------------------------------------------
async function chat(context, messages) {
  const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

  // Step 1: Route to the right retriever
  const retriever = await routeQuery(latestUserMessage);

  // Step 2: Retrieve context from the chosen retriever
  const retrievedContext =
    retriever === 'structured_data'
      ? retrieveStructuredContext(context)
      : retrieveKnowledgeBaseContext();

  // Step 3: Build system prompt with retrieved context
  const systemPrompt = `You are Quercus++, an academic assistant for University of Toronto students.
Keep answers SHORT and to the point — bullet points over paragraphs. No fluff.
Use actual assignment names, dates, scores, and course codes.
When the student asks about grading, weights, or policies, refer to the syllabus data if available.
If you compute grades, show your math briefly.
If you don't have enough data, say so.
Today's date is ${new Date().toISOString().slice(0, 10)}.

${retrievedContext}`;

  // Step 4: Generate response with full conversation history
  return invokeModel(systemPrompt, messages);
}

module.exports = { chat };
