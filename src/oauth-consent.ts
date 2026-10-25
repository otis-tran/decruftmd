export function renderConsentPage(params: {
  clientName: string;
  clientUri?: string;
  state: string;
  error?: string;
}): string {
  const safeName = escapeHtml(params.clientName || 'AI Assistant');
  const safeError = params.error ? `<div class="error">${escapeHtml(params.error)}</div>` : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorize ${safeName} — decruftmd</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --primary: #38bdf8;
      --primary-hover: #0284c7;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
    p { color: var(--muted); font-size: 0.9rem; line-height: 1.4; margin-bottom: 1.25rem; }
    .badge {
      display: inline-block;
      background: rgba(56, 189, 248, 0.1);
      color: var(--primary);
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      margin-bottom: 1.25rem;
    }
    .error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--danger);
      color: #fca5a5;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: var(--text);
    }
    input[type="password"] {
      width: 100%;
      background: #0b1120;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.95rem;
      outline: none;
      margin-bottom: 1.25rem;
      transition: border-color 0.15s;
    }
    input[type="password"]:focus {
      border-color: var(--primary);
    }
    .actions { display: flex; gap: 0.75rem; }
    button {
      flex: 1;
      padding: 0.75rem;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      transition: background 0.15s;
    }
    .btn-primary { background: var(--primary); color: #0f172a; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-cancel { background: transparent; color: var(--muted); border: 1px solid var(--border); }
    .btn-cancel:hover { background: #1a2234; color: var(--text); }
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorize ${safeName}</h1>
    <p>Grant <strong>${safeName}</strong> permission to read web articles and convert them to clean Markdown via <strong>decruftmd</strong>.</p>
    <div class="badge">Tool: read_url</div>
    ${safeError}
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="state" value="${escapeHtml(params.state)}">
      <label for="api_key">Enter your decruftmd API Key to approve:</label>
      <input type="password" id="api_key" name="api_key" placeholder="decruft_..." required autofocus autocomplete="current-password">
      <div class="actions">
        <button type="submit" name="decision" value="deny" class="btn-cancel">Deny</button>
        <button type="submit" name="decision" value="allow" class="btn-primary">Approve</button>
      </div>
    </form>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
}
