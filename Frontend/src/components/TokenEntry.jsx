import { useState } from "react";
import { validateToken } from "../services/canvasApi";

export default function TokenEntry({ onToken }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    setChecking(true);
    setError("");

    try {
      const profile = await validateToken(trimmed);
      onToken(trimmed, profile);
    } catch {
      setError("Invalid token — couldn't connect to Quercus. Check your token and try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="token-gate">
      <div className="token-card">
        <h1>Quercus++</h1>
        <p className="token-subtitle">
          Connect your Quercus account to get started.
        </p>

        <form onSubmit={handleSubmit} className="token-form">
          <label htmlFor="token-input">Canvas API Token</label>
          <input
            id="token-input"
            type="password"
            placeholder="Paste your token here…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            disabled={checking}
          />
          <button type="submit" disabled={checking || !value.trim()}>
            {checking ? "Validating…" : "Connect"}
          </button>
          {error && <p className="token-error">{error}</p>}
        </form>

        <details className="token-help">
          <summary>How do I get my API token?</summary>
          <ol>
            <li>Go to <strong>Quercus</strong> → Account → Settings</li>
            <li>Scroll to <strong>Approved Integrations</strong></li>
            <li>Click <strong>+ New Access Token</strong></li>
            <li>Give it a name (e.g. "Quercus++") and click <strong>Generate Token</strong></li>
            <li>Copy the token and paste it above</li>
          </ol>
          <p>Your token is stored only in your browser's localStorage. We never send it to our servers.</p>
        </details>
      </div>
    </div>
  );
}
