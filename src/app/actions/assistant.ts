"use server"

import { type ChatMessage, chatWithBedrock } from "@/lib/ai"
import type { CanvasData } from "@/lib/types"

type Session = {
  id: string
  context: string
  messages: ChatMessage[]
  lastActivity: number
}

const sessions = new Map<string, Session>()
const SESSION_TIMEOUT = 30 * 60 * 1000

if (typeof global !== "undefined") {
  setInterval(
    () => {
      const now = Date.now()
      for (const [id, session] of sessions) {
        if (now - session.lastActivity > SESSION_TIMEOUT) {
          sessions.delete(id)
        }
      }
    },
    5 * 60 * 1000,
  )
}

export async function chatWithAssistantAction(params: {
  message: string
  canvasData?: CanvasData
  sessionId?: string
}) {
  const { message, sessionId } = params

  if (!message) throw new Error("Missing message")

  let session: Session

  session = sessions.get(sessionId)!

  session.messages.push({ role: "user", content: message })
  session.lastActivity = Date.now()

  try {
    const reply = await chatWithBedrock(session.context, session.messages)
    session.messages.push({ role: "assistant", content: reply })
    return { reply, sessionId: session.id }
  } catch {
    session.messages.pop()
    throw new Error("AI service error")
  }
}

export async function summarizeSyllabusAction(params: {
  syllabusBody?: string
  syllabusFiles?: { id: number | string; name: string; url?: string | null }[]
  courseName?: string
}) {
  const { syllabusBody, syllabusFiles, courseName } = params

  if (!syllabusBody && (!syllabusFiles || syllabusFiles.length === 0)) {
    throw new Error("No syllabus data provided")
  }

  try {
    let fullText = syllabusBody || ""
    if (syllabusFiles && syllabusFiles.length > 0) {
      const fakeCourse = {
        syllabusBody: fullText,
        syllabusFiles,
        code: courseName,
      }
      await processSyllabusPdfs({ courses: [fakeCourse] } as CanvasData)
      fullText = fakeCourse.syllabusBody || fullText
    }

    if (!fullText || fullText.length < 50) {
      return { summary: null, weights: [] }
    }

    const prompt = `Given this course syllabus text, extract:
1. A concise 2-3 sentence summary of the course
2. The grade weight breakdown as a JSON array

Respond in EXACTLY this format (no other text):
SUMMARY: <your summary>
WEIGHTS: [{"category": "...", "weight": <number>}, ...]

If no weights are found, return WEIGHTS: []

Syllabus text:
${fullText.slice(0, 6000)}`

    const reply = await chatWithBedrock("", [{ role: "user", content: prompt }])

    const summaryMatch = reply.match(/SUMMARY:\s*(.+?)(?=\nWEIGHTS:)/s)
    const weightsMatch = reply.match(/WEIGHTS:\s*(\[[\s\S]*\])/)

    const summary = summaryMatch ? summaryMatch[1].trim() : reply.slice(0, 300)
    let weights: { category: string; weight: number }[] = []
    if (weightsMatch) {
      try {
        weights = JSON.parse(weightsMatch[1])
      } catch {
        weights = []
      }
    }

    return { summary, weights }
  } catch {
    throw new Error("Failed to summarize syllabus")
  }
}
