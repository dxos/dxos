//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { makeAppPasswordCredentialProvider } from './CredentialProvider';

// Minimal stub HttpClient that returns a fixed createSession body.
const stubHttpClient = (body: unknown) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.succeed(HttpClientResponse.fromWeb(request, new Response(JSON.stringify(body), { status: 200 }))),
    ),
  );

describe('AppPasswordCredentialProvider', () => {
  test('exchanges app-password for a session and builds a base64 SASL response', async ({ expect }) => {
    const provider = makeAppPasswordCredentialProvider({
      handle: 'alice.bsky.social',
      appPassword: 'abcd-efgh-ijkl-mnop',
      pdsUrl: 'https://bsky.social',
    });

    const payload = await provider
      .respond({ sessionId: 's1', nonce: 'n1', ts: 1 })
      .pipe(
        Effect.provide(stubHttpClient({ did: 'did:plc:alice', accessJwt: 'JWT123', refreshJwt: 'R1' })),
        Effect.runPromise,
      );

    const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))));
    expect(decoded).toMatchObject({ method: 'pds-session', did: 'did:plc:alice', jwt: 'JWT123' });
  });
});
