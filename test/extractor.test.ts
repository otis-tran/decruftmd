import { describe, expect, it } from 'vitest';
import { extractReadableContent } from '../src/extractor';

describe('extractReadableContent', () => {
  it('extracts article metadata and removes page chrome', async () => {
    const result = await extractReadableContent(`<!doctype html><html><head><title>Article title</title><meta name="author" content="Ada Lovelace"><meta property="article:published_time" content="2025-01-02"><meta name="description" content="A useful article"></head><body><nav>Navigation clutter</nav><article><h1>Article title</h1><p>This is a sufficiently useful paragraph containing the actual article content.</p><p>It continues with additional information about the subject matter and its implications for readers.</p></article><script>tracking()</script></body></html>`, 'https://www.example.com/posts/one');

    expect(result.title).toBeTruthy();
    expect(result.author).toBe('Ada Lovelace');
    expect(result.published).toContain('2025-01-02');
    expect(result.description).toBe('A useful article');
    expect(result.domain).toBe('example.com');
    expect(result.markdown).not.toContain('Navigation clutter');
    expect(result.markdown).not.toContain('tracking()');
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it('rejects pages without readable content', async () => {
    await expect(extractReadableContent('<html><body><nav>Only navigation</nav></body></html>', 'https://example.com')).rejects.toThrow('No readable content');
  });
});
