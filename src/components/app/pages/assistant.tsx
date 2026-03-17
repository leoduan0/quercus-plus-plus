"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { chatWithAssistantAction } from "@/app/actions/assistant";
import { useData } from "@/components/app/data-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const SUGGESTIONS = [
  "What assignments do I have due this week?",
  "What's my current grade in STA130?",
  "Can I skip the PHL246 tutorial today?",
  "How much do I need on the CSC111 final to get 80%?",
  "Summarize recent announcements across all my courses.",
];

export function AssistantPage() {
  const { data, getSyllabusSummaries } = useData();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const trimmed = (text || input).trim();
      if (!trimmed || loading) return;

      const userMsg = { role: "user", content: trimmed, ts: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const isFirst = !sessionId;
        let enrichedData = data;
        if (isFirst && data?.courses) {
          const summaries = getSyllabusSummaries();
          if (Object.keys(summaries).length > 0) {
            enrichedData = {
              ...data,
              courses: data.courses.map((c) => {
                const s = summaries[String(c.id)];
                if (!s) return c;
                return {
                  ...c,
                  syllabusSummary: s.summary,
                  syllabusWeights: s.weights,
                };
              }),
            };
          }
        }

        const result = await chatWithAssistantAction({
          message: trimmed,
          ...(isFirst ? { canvasData: enrichedData } : {}),
          ...(sessionId ? { sessionId } : {}),
        });

        if (result.sessionId) setSessionId(result.sessionId);

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.reply, ts: Date.now() },
        ]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${err.message}. Make sure your AWS credentials are set.`,
            ts: Date.now(),
            error: true,
          },
        ]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, loading, sessionId, data, getSyllabusSummaries],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setSessionId(null);
  };

  return (
    <Card className="flex min-h-[70vh] flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-6">
        {messages.length === 0 && (
          <div className="rounded-3xl border border-canvas-border bg-white p-6 text-center">
            <h3 className="font-display text-xl text-canvas-ink">
              Ask about your courses
            </h3>
            <p className="mt-2 text-sm text-canvas-muted">
              I have access to your Quercus data — assignments, grades,
              announcements, syllabi.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s, i) => (
                <Button
                  key={i}
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
          {messages.map((msg, i) => (
            <div
              key={i}
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
            className="min-h-[48px] resize-none"
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
  );
}
