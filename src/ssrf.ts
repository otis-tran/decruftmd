const IPV4_PRIVATE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x00000000, 0x00ffffff], // 0.0.0.0/8
  [0x0a000000, 0x0affffff], // 10.0.0.0/8
  [0x64400000, 0x647fffff], // 100.64.0.0/10
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16
  [0xac100000, 0xac1fffff], // 172.16.0.0/12
  [0xc0000000, 0xc00000ff], // 192.0.0.0/24
  [0xc0000200, 0xc00002ff], // 192.0.2.0/24
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
  [0xc6120000, 0xc613ffff], // 198.18.0.0/15
  [0xc6336400, 0xc63364ff], // 198.51.100.0/24
  [0xcb007100, 0xcb0071ff], // 203.0.113.0/24
  [0xe0000000, 0xffffffff], // multicast, reserved, broadcast
];

export function normalizeTargetUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, 'invalid_url', 'A valid absolute HTTP(S) URL is required');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new HttpError(400, 'invalid_url', 'Only HTTP and HTTPS URLs are allowed');
  }
  if (url.username || url.password) {
    throw new HttpError(400, 'invalid_url', 'URLs containing credentials are not allowed');
  }
  if (url.port) {
    throw new HttpError(400, 'invalid_url', 'Non-standard ports are not allowed');
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!hostname || isBlockedHost(hostname)) {
    throw new HttpError(400, 'blocked_target', 'Private and local network targets are not allowed');
  }
  url.hash = '';
  return url;
}

function isBlockedHost(host: string): boolean {
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === 'metadata.google.internal' || host === 'metadata' || host === 'instance-data') return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split('.').map(Number);
    if (parts.some((part) => part > 255)) return true;
    const address = (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
    return IPV4_PRIVATE_RANGES.some(([start, end]) => address >= start && address <= end);
  }
  if (host.includes(':')) return isBlockedIpv6(host);
  return false;
}

function isBlockedIpv6(input: string): boolean {
  const host = input.toLowerCase().split('%')[0];
  if (host === '::' || host === '::1') return true;
  // IPv4-mapped IPv6 and IPv4-compatible forms inherit the embedded IPv4 policy.
  const dotted = host.match(/(?:^|:)(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (dotted) {
    const octets = dotted.split('.').map(Number);
    if (octets.some((part) => part > 255)) return true;
    const v4 = octets.join('.');
    if (host.startsWith('::ffff:') || host.startsWith('::')) return isBlockedHost(v4);
  }
  const normalized = expandIpv6(host);
  if (!normalized) return true;
  if (normalized.slice(0, 5).every((part) => part === 0) && normalized[5] === 0xffff) {
    const address = ((normalized[6] << 16) | normalized[7]) >>> 0;
    return IPV4_PRIVATE_RANGES.some(([start, end]) => address >= start && address <= end);
  }
  if (normalized.slice(0, 6).every((part) => part === 0)) {
    const address = ((normalized[6] << 16) | normalized[7]) >>> 0;
    return IPV4_PRIVATE_RANGES.some(([start, end]) => address >= start && address <= end);
  }
  const first = normalized[0];
  // Unspecified/loopback, unique-local fc00::/7, link-local fe80::/10,
  // multicast ff00::/8, IPv4 translation and documentation ranges.
  if (normalized.every((part) => part === 0) || (normalized.slice(0, 7).every((part) => part === 0) && normalized[7] === 1)) return true;
  if ((first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00) return true;
  if (first === 0x0064 && normalized[1] === 0xff9b) return true;
  return first === 0x2001 && normalized[1] === 0x0db8;
}

function expandIpv6(host: string): number[] | null {
  if ((host.match(/::/g) || []).length > 1) return null;
  const halves = host.split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length > 1 && halves[1] ? halves[1].split(':') : [];
  if ([...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  return [...left.map((part) => parseInt(part, 16)), ...Array(missing).fill(0), ...right.map((part) => parseInt(part, 16))];
}

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}
