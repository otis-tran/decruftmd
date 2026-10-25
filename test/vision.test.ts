import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('../src/fetch', () => ({
  normalizeTargetUrl: (input: string) => new URL(input),
  fetchBounded: fetchMock,
}));

import { enrichImages } from '../src/vision';

describe('enrichImages', () => {
  beforeEach(() => fetchMock.mockReset());

  it('annotates eligible images and applies the hard limit', async () => {
    fetchMock.mockResolvedValue({ bytes: new Uint8Array([1, 2]), contentType: 'image/png', url: new URL('https://example.com/a.png') });
    const ai = { run: vi.fn().mockResolvedValue({ response: 'A chart showing growth.' }) };
    const source = '![chart](https://example.com/a.png)\n\n![second](https://example.com/b.png)';

    const result = await enrichImages(source, 'https://example.com/', ai, 99);

    expect(ai.run).toHaveBeenCalledTimes(2);
    expect(result.imagesAnalyzed).toBe(2);
    expect(result.markdown).toContain('**[AI Visual Context]**: A chart showing growth.');
  });

  it('leaves Markdown unchanged when AI fails', async () => {
    fetchMock.mockResolvedValue({ bytes: new Uint8Array([1]), contentType: 'image/png', url: new URL('https://example.com/a.png') });
    const ai = { run: vi.fn().mockRejectedValue(new Error('unavailable')) };
    const markdown = '![chart](https://example.com/a.png)';

    await expect(enrichImages(markdown, 'https://example.com/', ai)).resolves.toEqual({ markdown, imagesAnalyzed: 0 });
  });

  it('places linked-image context after the complete Markdown link', async () => {
    fetchMock.mockResolvedValue({ bytes: new Uint8Array([1, 2]), contentType: 'image/png', url: new URL('https://example.com/a.png') });
    const ai = { run: vi.fn().mockResolvedValue({ response: 'An informative diagram.' }) };
    const source = '[*![](https://example.com/a.png)*](https://example.com/full.png)';

    const result = await enrichImages(source, 'https://example.com/', ai, 1);

    expect(result.imagesAnalyzed).toBe(1);
    expect(result.markdown).toBe(`${source}\n> **[AI Visual Context]**: An informative diagram.\n`);
  });
});
