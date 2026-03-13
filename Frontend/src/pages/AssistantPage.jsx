import { useState, useRef, useEffect, useCallback } from "react";
import { useData } from "../contexts/DataContext";
import "./AssistantPage.css";

const SUGGESTIONS = [
  "What assignments do I have due this week?",
  "What's my current grade in STA130?",
  "Can I skip the PHL246 tutorial today?",
  "How much do I need on the CSC111 final to get 80%?",
  "Summarize recent announcements across all my courses.",
];

export default function AssistantPage() {
  const { data } = useData();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || input).trim();
      if (!trimmed || loading) return;

      const userMsg = { role: "user", content: trimmed, ts: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const isFirst = !sessionId;
        const body = {
          message: trimmed,
          ...(isFirst ? { canvasData: data } : {}),
          ...(sessionId ? { sessionId } : {}),
        };

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error(`Chat API ${res.status}`);

        const result = await res.json();
        if (result.sessionId) setSessionId(result.sessionId);

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.reply, ts: Date.now() },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${err.message}. Make sure the backend is running.`,
            ts: Date.now(),
            error: true,
          },
        ]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, loading, sessionId, data]
  );

  const handleKeyDown = (e) => {
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
    <div className="page assistant-page">
      <div className="chat-container">
        {/* Messages area */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <h3>Ask about your courses</h3>
              <p>
                I have access to all your Quercus data — assignments, grades,
                announcements, syllabi. Ask me anything.
              </p>
              <div className="chat-suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="chat-suggestion"
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`chat-bubble ${msg.role} ${msg.error ? "error" : ""}`}
            >
              <div className="bubble-content">{msg.content}</div>
            </div>
          ))}

          {loading && (
            <div className="chat-bubble assistant">
              <div className="bubble-content typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="chat-input-bar">
          {messages.length > 0 && (
            <button
              className="chat-new-btn"
              onClick={handleNewConversation}
              title="New conversation"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M12 5v14m-7-7h14" />
              </svg>
            </button>
          )}
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Ask about your courses…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            className="chat-send"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
