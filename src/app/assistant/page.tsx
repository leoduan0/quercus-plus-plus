"use client"

import { useRouter } from "next/navigation"
import type { KeyboardEvent } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { chatWithAssistantAction } from "@/app/actions/assistant"
import { DataProvider, useData } from "@/components/data-context"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

const TOKEN_KEY = "quercusToken"

const SUGGESTIONS = [
  "What assignments do I have due this week?",
  "What's my current grade in STA130?",
  "Can I skip the PHL246 tutorial today?",
  "How much do I need on the CSC111 final to get 80%?",
  "Summarize recent announcements across all my courses.",
]

function AssistantBody() {
  const { data, getSyllabusSummaries } = useData()
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  })

  const sendMessage = useCallback(
    async (text?: string) => {
      const trimmed = (text || input).trim()
      if (!trimmed || loading) return

      const userMsg = { role: "user", content: trimmed, ts: Date.now() }
      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setLoading(true)

      try {
        const isFirst = !sessionId
        let enrichedData = data
        if (isFirst && data?.courses) {
          const summaries = getSyllabusSummaries()
          if (Object.keys(summaries).length > 0) {
            enrichedData = {
              ...data,
              courses: data.courses.map((c) => {
                const s = summaries[String(c.id)]
                if (!s) return c
                return {
                  ...c,
                  syllabusSummary: s.summary,
                  syllabusWeights: s.weights,
                }
              }),
            }
          }
        }

        const result = await chatWithAssistantAction({
          message: trimmed,
          ...(isFirst && enrichedData ? { canvasData: enrichedData } : {}),
          ...(sessionId ? { sessionId } : {}),
        })

        if (result.sessionId) setSessionId(result.sessionId)

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.reply, ts: Date.now() },
        ])
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Error. Make sure your AWS credentials are set.",
            ts: Date.now(),
            error: true,
          },
        ])
      } finally {
        setLoading(false)
        inputRef.current?.focus()
      }
    },
    [input, loading, sessionId, data, getSyllabusSummaries],
  )

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleNewConversation = () => {
    setMessages([])
    setSessionId(null)
  }

  return (
    <Card className="flex min-h-[70vh] flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-6">
        {messages.length === 0 && (
          <div className="rounded-3xl border border-canvas-border bg-white p-6 text-center">
            <h3 className="text-xl text-canvas-ink">Ask about your courses</h3>
            <p className="mt-2 text-sm text-canvas-muted">
              I have access to your Quercus data — assignments, grades,
              announcements, syllabi.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  msg.role === "user"
                    ? "bg-canvas-accent text-white"
                    : msg.error
                      ? "bg-red-50 text-red-700"
                      : "bg-white text-canvas-ink"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-canvas-muted">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-canvas-border bg-white/70 p-4">
        <div className="flex items-end gap-3">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" onClick={handleNewConversation}>
              +
            </Button>
          )}
          <Textarea
            ref={inputRef}
            className="min-h-12 resize-none"
            placeholder="Ask about your courses..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            Send
          </Button>
        </div>
      </div>
    </Card>
  )
}

function AssistantSkeleton() {
  return <Skeleton className="h-[70vh] w-full rounded-2xl" />
}

function AssistantPage() {
  const { data, loading, error } = useData()

  return (
    <>
      <Header activeTab="assistant" />
      <main className="p-4">
        {error ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-red-600">
            {error}
          </div>
        ) : loading || !data ? (
          <AssistantSkeleton />
        ) : (
          <AssistantBody />
        )}
      </main>
    </>
  )
}

export default function AssistantRoute() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) {
      router.replace("/")
      setReady(true)
      return
    }
    setToken(stored)
    setReady(true)
  }, [router])

  if (!ready || !token) return null

  return (
    <DataProvider token={token}>
      <AssistantPage />
    </DataProvider>
  )
}
