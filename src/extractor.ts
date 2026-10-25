import './polyfill';
import { parseHTML } from 'linkedom';
import Defuddle from 'defuddle/full';

export interface ExtractedDoc {
  title: string;
  author: string;
  published: string;
  description: string;
  markdown: string;
  domain: string;
  wordCount: number;
}

export async function extractReadableContent(html: string, pageUrl: string): Promise<ExtractedDoc> {
  const page = new URL(pageUrl);
  const { document } = parseHTML(html);
  const defuddle = new Defuddle(document as unknown as Document, {
    url: page.href,
    separateMarkdown: true,
  });
  const parsed = await defuddle.parseAsync();
  const markdown = String(parsed.contentMarkdown || '').trim();
  const title = String(parsed.title || page.hostname).trim();

  if (!markdown) throw new Error('No readable content found');

  return {
    title,
    author: String(parsed.author || '').trim(),
    published: String(parsed.published || '').trim(),
    description: String(parsed.description || '').trim(),
    markdown,
    domain: page.hostname.replace(/^www\./i, ''),
    wordCount: markdown.split(/\s+/).filter(Boolean).length,
  };
}
