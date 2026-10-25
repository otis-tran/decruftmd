export function renderWebUi(): string {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>decruftmd — Web to Clean Markdown</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #131b2e;
      --border: #1e293b;
      --border-focus: #38bdf8;
      --text: #f8fafc;
      --muted: #94a3b8;
      --primary: #38bdf8;
      --primary-hover: #0284c7;
      --accent: #10b981;
      --danger: #ef4444;
      --code-bg: #0b1120;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2.5rem 1rem;
    }
    .container {
      width: 100%;
      max-width: 900px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    header {
      text-align: center;
      margin-bottom: 0.5rem;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #f8fafc 30%, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.subtitle {
      color: var(--muted);
      font-size: 0.95rem;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }
    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .input-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-width: 240px;
    }
    label {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
    }
    input[type="text"], input[type="password"] {
      width: 100%;
      background: var(--code-bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    input:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }
    .options {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      font-size: 0.85rem;
      color: var(--text);
      padding: 0.25rem 0;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      text-transform: none;
      font-size: 0.9rem;
      color: var(--text);
    }
    input[type="checkbox"] {
      accent-color: var(--primary);
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    button.btn-convert {
      background: var(--primary);
      color: #090d16;
      border: none;
      padding: 0.8rem 1.75rem;
      font-size: 0.95rem;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s, transform 0.05s;
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    button.btn-convert:hover { background: var(--primary-hover); }
    button.btn-convert:active { transform: scale(0.98); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Result area */
    .result-container {
      display: none;
      flex-direction: column;
      gap: 1rem;
    }
    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .stats {
      font-size: 0.85rem;
      color: var(--muted);
      display: flex;
      gap: 1rem;
    }
    .stats span { color: var(--text); font-weight: 600; }
    .btn-copy {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.45rem 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s;
    }
    .btn-copy:hover {
      background: #1e293b;
      border-color: var(--primary);
    }
    .btn-copy.copied {
      background: rgba(16, 185, 129, 0.15);
      border-color: var(--accent);
      color: var(--accent);
    }
    pre {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85rem;
      line-height: 1.6;
      color: #e2e8f0;
      overflow-x: auto;
      max-height: 520px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .error-box {
      display: none;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--danger);
      color: #fca5a5;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>decruftmd</h1>
      <p class="subtitle">Gọt sạch HTML rác, trích xuất Markdown tinh gọn cho AI Agents & LLMs</p>
    </header>

    <div class="card">
      <form id="convertForm" class="form-grid">
        <div class="row">
          <div class="input-group" style="flex: 2;">
            <label for="url">URL trang web</label>
            <input type="text" id="url" placeholder="https://example.com/blog/article" required autofocus>
          </div>
          <div class="input-group" style="flex: 1;">
            <label for="key">API Key (Lưu tự động)</label>
            <input type="password" id="key" placeholder="decruft_...">
          </div>
        </div>

        <div class="options">
          <label class="checkbox-label">
            <input type="checkbox" id="images">
            Phân tích biểu đồ & hình ảnh (AI Vision)
          </label>
        </div>

        <button type="submit" id="btnSubmit" class="btn-convert">
          <span>Chuyển đổi sang Markdown</span>
        </button>
      </form>
    </div>

    <div id="errorBox" class="error-box"></div>

    <div id="resultContainer" class="result-container card">
      <div class="result-header">
        <div class="stats">
          <div>Từ: <span id="statWords">0</span></div>
          <div>Ảnh phân tích: <span id="statImages">0</span></div>
          <div>Cache: <span id="statCache">MISS</span></div>
        </div>
        <button id="btnCopy" class="btn-copy">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span id="copyText">Sao chép Markdown</span>
        </button>
      </div>
      <pre><code id="markdownOutput"></code></pre>
    </div>
  </div>

  <script>
    const form = document.getElementById('convertForm');
    const inputUrl = document.getElementById('url');
    const inputKey = document.getElementById('key');
    const checkImages = document.getElementById('images');
    const btnSubmit = document.getElementById('btnSubmit');
    const errorBox = document.getElementById('errorBox');
    const resultContainer = document.getElementById('resultContainer');
    const markdownOutput = document.getElementById('markdownOutput');
    const btnCopy = document.getElementById('btnCopy');
    const copyText = document.getElementById('copyText');
    const statWords = document.getElementById('statWords');
    const statImages = document.getElementById('statImages');
    const statCache = document.getElementById('statCache');

    // Load saved API key from localStorage
    const savedKey = localStorage.getItem('decruft_api_key');
    if (savedKey) inputKey.value = savedKey;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = inputUrl.value.trim();
      const apiKey = inputKey.value.trim();
      const analyzeImages = checkImages.checked;

      if (!url) return;
      if (apiKey) localStorage.setItem('decruft_api_key', apiKey);

      // UI loading state
      btnSubmit.disabled = true;
      btnSubmit.querySelector('span').innerText = 'Đang bóc tách & chuyển đổi...';
      errorBox.style.display = 'none';
      resultContainer.style.display = 'none';

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;

        const res = await fetch('/api/convert', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url,
            analyze_images: analyzeImages,
            max_images: analyzeImages ? 2 : 0
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message || ('HTTP ' + res.status));
        }

        statWords.innerText = data.word_count || 0;
        statImages.innerText = data.images_analyzed || 0;
        statCache.innerText = data.cached ? 'HIT' : 'MISS';
        markdownOutput.textContent = data.markdown || '';

        resultContainer.style.display = 'flex';
      } catch (err) {
        errorBox.innerText = 'Lỗi: ' + (err.message || 'Không thể chuyển đổi URL này.');
        errorBox.style.display = 'block';
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.querySelector('span').innerText = 'Chuyển đổi sang Markdown';
      }
    });

    btnCopy.addEventListener('click', async () => {
      const text = markdownOutput.textContent;
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        btnCopy.classList.add('copied');
        copyText.innerText = 'Đã chép!';
        setTimeout(() => {
          btnCopy.classList.remove('copied');
          copyText.innerText = 'Sao chép Markdown';
        }, 2000);
      } catch {
        alert('Không thể sao chép tự động, vui lòng chọn văn bản và bấm Ctrl/Cmd+C');
      }
    });
  </script>
</body>
</html>`;
}
