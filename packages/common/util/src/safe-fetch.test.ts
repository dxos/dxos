//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { isBlockedHost, safeFetchBytes, validateExternalUrl } from './safe-fetch';

describe('isBlockedHost', () => {
  test('blocks loopback and unspecified addresses', ({ expect }) => {
    for (const host of ['localhost', 'LOCALHOST', '127.0.0.1', '127.1.2.3', '0.0.0.0', '::1', '::', '[::1]']) {
      expect(isBlockedHost(host), host).toBe(true);
    }
  });

  // 169.254.169.254 is the cloud metadata endpoint — the single most valuable SSRF target.
  test('blocks private and link-local IPv4 ranges', ({ expect }) => {
    for (const host of ['10.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1']) {
      expect(isBlockedHost(host), host).toBe(true);
    }
  });

  test('allows public IPv4, including ranges adjacent to the private ones', ({ expect }) => {
    for (const host of ['8.8.8.8', '172.15.0.1', '172.32.0.1', '192.169.0.1', '100.63.0.1', '100.128.0.1']) {
      expect(isBlockedHost(host), host).toBe(false);
    }
  });

  test('blocks IPv6 link-local and unique-local literals', ({ expect }) => {
    for (const host of ['fe80::1', 'fe90::1', 'fea0::1', 'feb0::1', 'fc00::1', 'fd12:3456::1', '[fe80::1]']) {
      expect(isBlockedHost(host), host).toBe(true);
    }
  });

  // An IPv4-mapped literal would otherwise smuggle a private address past the IPv6 branch.
  test('unwraps IPv4-mapped IPv6 before deciding', ({ expect }) => {
    expect(isBlockedHost('::ffff:127.0.0.1')).toBe(true);
    expect(isBlockedHost('::ffff:169.254.169.254')).toBe(true);
    expect(isBlockedHost('::ffff:8.8.8.8')).toBe(false);
  });

  // The same addresses spelled in hex, which the dotted-quad check alone does not see.
  test('unwraps the hex spelling of IPv4-mapped IPv6', ({ expect }) => {
    expect(isBlockedHost('::ffff:7f00:1')).toBe(true); // 127.0.0.1
    expect(isBlockedHost('::ffff:a9fe:a9fe')).toBe(true); // 169.254.169.254
    expect(isBlockedHost('::ffff:c0a8:101')).toBe(true); // 192.168.1.1
    expect(isBlockedHost('::ffff:808:808')).toBe(false); // 8.8.8.8
  });

  test('allows ordinary hostnames', ({ expect }) => {
    for (const host of ['example.com', 'cdn.example.co.uk', 'localhost.example.com']) {
      expect(isBlockedHost(host), host).toBe(false);
    }
  });
});

describe('validateExternalUrl', () => {
  test('accepts an https url on a public host', ({ expect }) => {
    expect(validateExternalUrl('https://example.com/a.png').toString()).toBe('https://example.com/a.png');
  });

  test('rejects plaintext, other schemes, and unparseable input', ({ expect }) => {
    expect(() => validateExternalUrl('http://example.com/a.png')).toThrow(/Only https/);
    expect(() => validateExternalUrl('file:///etc/passwd')).toThrow(/Only https/);
    expect(() => validateExternalUrl('not a url')).toThrow(/Invalid URL/);
  });

  test('rejects a blocked host', ({ expect }) => {
    expect(() => validateExternalUrl('https://169.254.169.254/latest/meta-data/')).toThrow(/disallowed host/);
  });
});

describe('safeFetchBytes', () => {
  const respond = (body: BodyInit | null, init?: ResponseInit) => ({
    fetch: async () => new Response(body, init),
  });

  test('returns the bytes and the bare content type', async ({ expect }) => {
    const result = await safeFetchBytes(new URL('https://example.com/a'), {
      maxBytes: 1024,
      timeoutMs: 1000,
      ...respond(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png; charset=binary' } }),
    });
    expect(result.bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(result.contentType).toBe('image/png');
  });

  test('rejects a declared length over the cap before transferring', async ({ expect }) => {
    await expect(
      safeFetchBytes(new URL('https://example.com/a'), {
        maxBytes: 10,
        timeoutMs: 1000,
        ...respond(new Uint8Array(4), { headers: { 'content-length': '999' } }),
      }),
    ).rejects.toThrow(/Exceeds size cap \(999/);
  });

  // The case content-length cannot cover: a server that under-declares, or omits the header, and
  // then streams past the cap.
  test('enforces the cap while streaming, not just from the header', async ({ expect }) => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(8));
        controller.enqueue(new Uint8Array(8));
        controller.close();
      },
    });
    await expect(
      safeFetchBytes(new URL('https://example.com/a'), {
        maxBytes: 10,
        timeoutMs: 1000,
        fetch: async () => new Response(stream, { headers: { 'content-length': '2' } }),
      }),
    ).rejects.toThrow(/Exceeds size cap \(>10/);
  });

  // A public host redirecting to a private one is the way an origin check gets bypassed.
  test('refuses to follow a redirect', async ({ expect }) => {
    const seen: RequestInit[] = [];
    await expect(
      safeFetchBytes(new URL('https://example.com/a'), {
        maxBytes: 1024,
        timeoutMs: 1000,
        fetch: async (_target, init) => {
          seen.push(init);
          return new Response('', { status: 302, headers: { location: 'https://127.0.0.1/' } });
        },
      }),
    ).rejects.toThrow(/Refusing to follow a redirect/);
    expect(seen[0]?.redirect).toBe('error');
  });

  test('raises a non-ok response', async ({ expect }) => {
    await expect(
      safeFetchBytes(new URL('https://example.com/a'), {
        maxBytes: 1024,
        timeoutMs: 1000,
        ...respond('', { status: 404, statusText: 'Not Found' }),
      }),
    ).rejects.toThrow(/Failed to download: 404/);
  });

  test('reassembles multi-chunk bodies in order', async ({ expect }) => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4]));
        controller.close();
      },
    });
    const result = await safeFetchBytes(new URL('https://example.com/a'), {
      maxBytes: 1024,
      timeoutMs: 1000,
      fetch: async () => new Response(stream),
    });
    expect(result.bytes).toEqual(new Uint8Array([1, 2, 3, 4]));
  });
});
