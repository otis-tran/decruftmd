import { describe, expect, it } from 'vitest';
import { normalizeTargetUrl } from '../src/ssrf.js';

describe('normalizeTargetUrl', () => {
  it.each([
    'http://localhost/', 'http://a.localhost/', 'http://127.0.0.1/', 'http://2130706433/',
    'http://0x7f000001/', 'http://10.0.0.1/', 'http://192.168.1.1/', 'http://169.254.169.254/',
    'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://[fc00::1]/', 'http://[fe80::1]/',
    'http://metadata.google.internal/',
  ])('blocks %s', (value) => {
    expect(() => normalizeTargetUrl(value)).toThrow();
  });

  it('requires HTTP(S), rejects credentials and non-standard ports', () => {
    for (const value of ['file:///etc/passwd', 'https://user:pass@example.com/', 'https://example.com:8443/']) {
      expect(() => normalizeTargetUrl(value)).toThrow();
    }
  });

  it('canonicalizes the URL and removes the fragment', () => {
    expect(normalizeTargetUrl('HTTPS://Example.COM/a#frag').href).toBe('https://example.com/a');
  });
});
