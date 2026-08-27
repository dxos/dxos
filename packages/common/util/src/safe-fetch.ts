//
// Copyright 2026 DXOS.org
//

/**
 * Guarded fetch for URLs supplied by an untrusted party — typically a model, which chooses the URL
 * and would otherwise turn any handler that downloads it into a request-forgery primitive aimed at
 * whatever the host can reach.
 *
 * Extracted from `plugin-crm`'s `attachImage`, which is where these rules were first worked out.
 * Shared rather than copied: a second copy is how one of them silently stops blocking something.
 */

/** Hosts that must be rejected: cloud metadata services, loopback, and private ranges. */
const isBlockedIPv4 = (host: string): boolean => {
  const ipv4 = host.split('.').map(Number);
  if (ipv4.length !== 4 || !ipv4.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)) {
    return false;
  }

  const [first, second] = ipv4;
  return (
    first === 10 || // 10.0.0.0/8
    first === 127 || // 127.0.0.0/8
    (first === 169 && second === 254) || // 169.254.0.0/16 — link-local, includes cloud metadata at 169.254.169.254.
    (first === 172 && second !== undefined && second >= 16 && second <= 31) || // 172.16.0.0/12
    (first === 192 && second === 168) || // 192.168.0.0/16
    (first === 100 && second !== undefined && second >= 64 && second <= 127) // 100.64.0.0/10 — carrier-grade NAT.
  );
};

/**
 * Rejects internal metadata services and development loopback addresses, explicit private IPv4
 * ranges in case a raw-IP URL is supplied, and IPv6 loopback / unique-local / link-local literals.
 * The IPv6 parsing is deliberately loose — a false positive costs a rejected URL, a false negative
 * costs an SSRF.
 */
export const isBlockedHost = (host: string): boolean => {
  const normalized = host.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (normalized === 'localhost' || normalized === '0.0.0.0' || normalized === '::' || normalized === '::1') {
    return true;
  }

  if (normalized.includes(':')) {
    // fe80::/10 link-local.
    if (/^fe[89ab]/.test(normalized)) {
      return true;
    }
    // fc00::/7 unique-local.
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    // IPv4-mapped IPv6 (::ffff:a.b.c.d) — check the embedded dotted-quad.
    const mapped = /::ffff:([\d.]+)$/.exec(normalized);
    return mapped ? isBlockedIPv4(mapped[1]) : false;
  }

  return isBlockedIPv4(normalized);
};

/**
 * Parses and vets an externally-supplied URL. HTTPS only: a downgrade to plaintext would expose
 * whatever the response carries, and no legitimate caller needs it.
 *
 * @throws {Error} If the URL is unparseable, not https, or names a blocked host.
 */
export const validateExternalUrl = (raw: string): URL => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`Only https URLs are accepted (got ${parsed.protocol})`);
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new Error(`Refusing to fetch from disallowed host: ${parsed.hostname}`);
  }

  return parsed;
};

export type SafeFetchOptions = {
  /** Reject the response once this many bytes have arrived. */
  maxBytes: number;
  /** Abort the request after this long. */
  timeoutMs: number;
  /**
   * Fetch implementation. A browser caller passes a CORS proxy; a headless one omits this and goes
   * direct, having no CORS constraint to work around and no reason to route bytes through a hop.
   */
  fetch?: (url: URL, init: RequestInit) => Promise<Response>;
};

/**
 * Downloads an externally-supplied URL under a hard byte cap.
 *
 * The cap is enforced **while streaming**, not from `content-length`: a server that omits the
 * header or lies about it could otherwise feed bytes bounded only by the timeout. The declared
 * `content-length` is still checked first, since rejecting before the transfer is cheaper.
 */
export const safeFetchBytes = async (
  url: URL,
  { maxBytes, timeoutMs, fetch: fetchImpl = (target, init) => fetch(target, init) }: SafeFetchOptions,
): Promise<{ bytes: Uint8Array; contentType: string | undefined }> => {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`Exceeds size cap (${declared} bytes > ${maxBytes})`);
  }

  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim();
  const body = response.body;
  if (!body) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new Error(`Exceeds size cap (${buffer.byteLength} bytes > ${maxBytes})`);
    }
    return { bytes: buffer, contentType };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`Exceeds size cap (>${maxBytes} bytes)`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { bytes, contentType };
};
