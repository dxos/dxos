//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test, vi } from 'vitest';

import { type Presentation } from '@dxos/protocols/proto/dxos/halo/credentials';

import {
  type EdgeIdentity,
  authenticateViaChallengeEndpoint,
  fetchAuthChallenge,
  parseChallengeHeader,
  readAuthChallenge,
} from './edge-identity';

const CHALLENGE = 'AQAAAZlqjGgAq83vEjRWeJCrze8SNFZ4kA==';

const identity = (onChallenge?: (challenge: Uint8Array) => void): EdgeIdentity => ({
  peerKey: 'peer-key',
  identityDid: 'did:halo:test',
  presentCredentials: async ({ challenge }): Promise<Presentation> => {
    onChallenge?.(challenge);
    return {};
  },
});

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('parseChallengeHeader', () => {
  test('reads a quoted challenge', ({ expect }) => {
    expect(parseChallengeHeader(`VerifiablePresentation challenge="${CHALLENGE}"`)).toBe(CHALLENGE);
  });

  test('reads the legacy unquoted token form', ({ expect }) => {
    expect(parseChallengeHeader('VerifiablePresentation challenge=TODO')).toBe('TODO');
  });

  test('finds the VP challenge when it is not first in the list', ({ expect }) => {
    // RFC 9110 §11.6.1 allows a comma-separated list; edge emits both schemes whenever admin-key
    // auth is also allowed. Parsing only the first challenge used to break this case outright.
    expect(parseChallengeHeader(`Bearer realm="dxos", VerifiablePresentation challenge="${CHALLENGE}"`)).toBe(
      CHALLENGE,
    );
  });

  test('the quoted value is unwrapped, not passed through with its quotes', ({ expect }) => {
    const parsed = parseChallengeHeader(`VerifiablePresentation challenge="${CHALLENGE}"`);
    expect(parsed).not.toContain('"');
  });

  test('ignores a header with no VP challenge', ({ expect }) => {
    expect(parseChallengeHeader('Bearer realm="dxos"')).toBeUndefined();
    expect(parseChallengeHeader('')).toBeUndefined();
    expect(parseChallengeHeader(null)).toBeUndefined();
  });
});

describe('readAuthChallenge', () => {
  test('reads a 200 challenge from the response body', async ({ expect }) => {
    const response = jsonResponse({ success: true, data: { challenge: CHALLENGE } });
    expect(await readAuthChallenge(response)).toBe(CHALLENGE);
  });

  test('reads a 401 challenge from WWW-Authenticate', async ({ expect }) => {
    const response = new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': `VerifiablePresentation challenge="${CHALLENGE}"` },
    });
    expect(await readAuthChallenge(response)).toBe(CHALLENGE);
  });

  test('prefers the header when a response carries both', async ({ expect }) => {
    const response = new Response(JSON.stringify({ success: true, data: { challenge: 'from-body' } }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `VerifiablePresentation challenge="${CHALLENGE}"`,
      },
    });
    expect(await readAuthChallenge(response)).toBe(CHALLENGE);
  });

  test('leaves the body readable for the caller', async ({ expect }) => {
    // The response is cloned before parsing; consuming it here would break the retry path that
    // reads the same response afterwards.
    const response = jsonResponse({ success: true, data: { challenge: CHALLENGE } });
    await readAuthChallenge(response);
    expect(response.bodyUsed).toBe(false);
  });

  test('returns undefined for a response carrying no challenge', async ({ expect }) => {
    expect(await readAuthChallenge(jsonResponse({ success: true, data: { identityKey: 'abc' } }))).toBeUndefined();
    expect(await readAuthChallenge(new Response('nope', { status: 500 }))).toBeUndefined();
  });

  test('a non-JSON 200 does not throw', async ({ expect }) => {
    expect(await readAuthChallenge(new Response('<html/>', { status: 200 }))).toBeUndefined();
  });
});

describe('fetchAuthChallenge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('GETs /auth relative to the base URL', async ({ expect }) => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: { challenge: CHALLENGE } }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchAuthChallenge('https://edge.example.com')).toBe(CHALLENGE);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://edge.example.com/auth');
  });

  test('still works against a server whose /auth only answers 401', async ({ expect }) => {
    // Back-compat: the endpoint predating the 200 shape can only issue a challenge by rejecting.
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate': `VerifiablePresentation challenge="${CHALLENGE}"` },
        }),
    );
    expect(await fetchAuthChallenge('https://edge.example.com')).toBe(CHALLENGE);
  });

  test('a network failure yields undefined rather than throwing', async ({ expect }) => {
    // The caller falls back to the lazy 401 path, so a challenge endpoint outage must not be fatal.
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline');
    });
    expect(await fetchAuthChallenge('https://edge.example.com')).toBeUndefined();
  });
});

describe('authenticateViaChallengeEndpoint', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('signs the challenge bytes decoded from base64', async ({ expect }) => {
    vi.stubGlobal('fetch', async () => jsonResponse({ success: true, data: { challenge: CHALLENGE } }));

    let signed: Uint8Array | undefined;
    const presentation = await authenticateViaChallengeEndpoint(
      'https://edge.example.com',
      identity((challenge) => {
        signed = challenge;
      }),
    );

    expect(presentation).toBeDefined();
    // Normalised to a plain Uint8Array on both sides: the decoder hands back a Buffer, which
    // `toEqual` treats as a distinct type despite identical bytes.
    expect(new Uint8Array(signed!)).toEqual(new Uint8Array(Buffer.from(CHALLENGE, 'base64')));
  });

  test('returns undefined when no challenge is available', async ({ expect }) => {
    vi.stubGlobal('fetch', async () => new Response(null, { status: 404 }));
    expect(await authenticateViaChallengeEndpoint('https://edge.example.com', identity())).toBeUndefined();
  });
});
