//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { FreeqAuthError } from '../errors';
import { makeAppPasswordCredentialProvider } from './CredentialProvider';

describe('AppPasswordCredentialProvider', () => {
  test('resolves DID + PDS, creates a session, and builds a base64url SASL response', async ({ expect }) => {
    const provider = makeAppPasswordCredentialProvider({
      handle: 'alice.bsky.social',
      appPassword: 'abcd-efgh-ijkl-mnop',
    });

    const httpClient = stubHttpClient({
      'https://bsky.social/xrpc/com.atproto.identity.resolveHandle': { did: 'did:plc:alice' },
      'https://plc.directory/did:plc:alice': {
        service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://pds.example' }],
      },
      'https://pds.example/xrpc/com.atproto.server.createSession': {
        did: 'did:plc:alice',
        accessJwt: 'JWT123',
        refreshJwt: 'R1',
      },
    });

    const payload = await provider
      .respond({ session_id: 's1', nonce: 'n1', timestamp: 1 })
      .pipe(Effect.provide(httpClient), Effect.runPromise);

    expect(payload).not.toMatch(/[+/=]/);

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized));
    expect(decoded).toEqual({
      did: 'did:plc:alice',
      method: 'pds-session',
      signature: 'JWT123',
      pds_url: 'https://pds.example',
      challenge_nonce: 'n1',
    });
  });

  test('fails with FreeqAuthError when handle resolution fails', async ({ expect }) => {
    const provider = makeAppPasswordCredentialProvider({
      handle: 'alice.bsky.social',
      appPassword: 'abcd-efgh-ijkl-mnop',
    });

    const httpClient = stubHttpClient({});

    const error = await provider
      .respond({ session_id: 's1', nonce: 'n1', timestamp: 1 })
      .pipe(Effect.flip, Effect.provide(httpClient), Effect.runPromise);

    expect(error).toBeInstanceOf(FreeqAuthError);
  });

  test('fails with FreeqAuthError when the createSession response body is malformed', async ({ expect }) => {
    const provider = makeAppPasswordCredentialProvider({
      handle: 'alice.bsky.social',
      appPassword: 'abcd-efgh-ijkl-mnop',
    });

    const httpClient = stubHttpClient({
      'https://bsky.social/xrpc/com.atproto.identity.resolveHandle': { did: 'did:plc:alice' },
      'https://plc.directory/did:plc:alice': {
        service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://pds.example' }],
      },
      'https://pds.example/xrpc/com.atproto.server.createSession': {},
    });

    const error = await provider
      .respond({ session_id: 's1', nonce: 'n1', timestamp: 1 })
      .pipe(Effect.flip, Effect.provide(httpClient), Effect.runPromise);

    expect(error).toBeInstanceOf(FreeqAuthError);
  });

  test('caches the resolved session/PDS across repeated respond() calls', async ({ expect }) => {
    const provider = makeAppPasswordCredentialProvider({
      handle: 'alice.bsky.social',
      appPassword: 'abcd-efgh-ijkl-mnop',
    });

    let resolveHandleCalls = 0;
    const httpClient = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) => {
        const url = request.url;
        if (url.startsWith('https://bsky.social/xrpc/com.atproto.identity.resolveHandle')) {
          resolveHandleCalls++;
          return Effect.succeed(
            HttpClientResponse.fromWeb(
              request,
              new Response(JSON.stringify({ did: 'did:plc:alice' }), { status: 200 }),
            ),
          );
        }
        if (url.startsWith('https://plc.directory/did:plc:alice')) {
          return Effect.succeed(
            HttpClientResponse.fromWeb(
              request,
              new Response(
                JSON.stringify({
                  service: [
                    { id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://pds.example' },
                  ],
                }),
                { status: 200 },
              ),
            ),
          );
        }
        return Effect.succeed(
          HttpClientResponse.fromWeb(
            request,
            new Response(JSON.stringify({ did: 'did:plc:alice', accessJwt: 'JWT123', refreshJwt: 'R1' }), {
              status: 200,
            }),
          ),
        );
      }),
    );

    await provider
      .respond({ session_id: 's1', nonce: 'n1', timestamp: 1 })
      .pipe(Effect.provide(httpClient), Effect.runPromise);
    await provider
      .respond({ session_id: 's2', nonce: 'n2', timestamp: 2 })
      .pipe(Effect.provide(httpClient), Effect.runPromise);

    expect(resolveHandleCalls).toBe(1);
  });

  test('uses a challenge_nonce that reflects the current challenge even when session is cached', async ({ expect }) => {
    const provider = makeAppPasswordCredentialProvider({
      handle: 'alice.bsky.social',
      appPassword: 'abcd-efgh-ijkl-mnop',
    });

    const httpClient = stubHttpClient({
      'https://bsky.social/xrpc/com.atproto.identity.resolveHandle': { did: 'did:plc:alice' },
      'https://plc.directory/did:plc:alice': {
        service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://pds.example' }],
      },
      'https://pds.example/xrpc/com.atproto.server.createSession': {
        did: 'did:plc:alice',
        accessJwt: 'JWT123',
        refreshJwt: 'R1',
      },
    });

    await provider
      .respond({ session_id: 's1', nonce: 'n1', timestamp: 1 })
      .pipe(Effect.provide(httpClient), Effect.runPromise);
    const second = await provider
      .respond({ session_id: 's2', nonce: 'n2', timestamp: 2 })
      .pipe(Effect.provide(httpClient), Effect.runPromise);

    const normalized = second.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized));
    expect(decoded.challenge_nonce).toBe('n2');
  });
});

// Routes each XRPC/DID-doc lookup the credential provider makes: resolveHandle
// on the entryway, the PLC directory DID doc, then createSession on the
// resolved PDS (not the entryway).
const stubHttpClient = (responses: Record<string, unknown>) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) => {
      const url = request.url;
      for (const [prefix, body] of Object.entries(responses)) {
        if (url.startsWith(prefix)) {
          return Effect.succeed(
            HttpClientResponse.fromWeb(request, new Response(JSON.stringify(body), { status: 200 })),
          );
        }
      }
      return Effect.succeed(HttpClientResponse.fromWeb(request, new Response('not found', { status: 404 })));
    }),
  );
