"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { validateCanvasTokenAction } from "@/app/actions/canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function TokenEntry({ onToken }: { onToken: (token: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    setChecking(true);
    setError("");

    try {
      await validateCanvasTokenAction(trimmed);
      onToken(trimmed);
    } catch {
      setError(
        "Invalid token — couldn't connect to Quercus. Check your token and try again.",
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="app-bg min-h-screen">
      <div className="app-surface flex min-h-screen items-center justify-center px-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Quercus++</CardTitle>
            <p className="text-sm text-canvas-muted">
              Connect your Quercus account to get started.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-canvas-muted">
                  Canvas API Token
                </label>
                <Input
                  type="password"
                  placeholder="Paste your token here..."
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={checking}
                />
              </div>
              <Button type="submit" disabled={checking || !value.trim()}>
                {checking ? "Validating..." : "Connect"}
              </Button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>

            <details className="mt-6 text-sm text-canvas-muted">
              <summary className="cursor-pointer font-semibold text-canvas-ink">
                How do I get my API token?
              </summary>
              <ol className="mt-3 list-decimal space-y-1 pl-5">
                <li>Go to Quercus → Account → Settings</li>
                <li>Scroll to Approved Integrations</li>
                <li>Click + New Access Token</li>
                <li>
                  Give it a name (e.g. "Quercus++") and click Generate Token
                </li>
                <li>Copy the token and paste it above</li>
              </ol>
              <p className="mt-3">
                Your token stays in your browser&apos;s localStorage and is only
                sent to Canvas.
              </p>
            </details>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
