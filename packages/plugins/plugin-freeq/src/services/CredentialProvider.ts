//
// Copyright 2026 DXOS.org
//

import * as HttpBody from '@effect/platform/HttpBody';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';

import { FreeqAuthError } from '../errors';

export interface SaslChallenge {
  sessionId: string;
  nonce: string;
  ts: number;
}

export interface CredentialProvider {
  // Returns the base64 SASL response payload for the given challenge.
  respond: (challenge: SaslChallenge) => Effect.Effect<string, FreeqAuthError, HttpClient.HttpClient>;
}

interface SessionResponse {
  did: string;
  accessJwt: string;
  refreshJwt: string;
}

const toBase64 = (value: string): string => btoa(String.fromCharCode(...new TextEncoder().encode(value)));

/**
 * Phase-1 credential provider. Exchanges an ATProto handle + app-password for a
 * PDS session JWT via `com.atproto.server.createSession`, then presents the JWT
 * as the freeq PDS-session SASL response. The session is created lazily on the
 * first challenge and cached for the lifetime of the provider.
 */
export const makeAppPasswordCredentialProvider = (options: {
  handle: string;
  appPassword: string;
  pdsUrl: string;
}): CredentialProvider => {
  let session: SessionResponse | undefined;

  const createSession = Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.post(`${options.pdsUrl}/xrpc/com.atproto.server.createSession`).pipe(
      HttpClientRequest.setHeader('content-type', 'application/json'),
      HttpClientRequest.setBody(
        HttpBody.text(
          JSON.stringify({ identifier: options.handle, password: options.appPassword }),
          'application/json',
        ),
      ),
    );
    const response = yield* client.execute(request);
    return yield* response.json;
  }).pipe(
    // `response.json` is `unknown`; the PDS response shape is asserted here rather than
    // schema-validated because this is an external boundary with no typed alternative yet.
    Effect.map((body) => body as SessionResponse),
    Effect.mapError((cause) => new FreeqAuthError({ cause })),
  );

  // The SASL response shape is provisional; confirm against the freeq server.
  const buildResponse = (current: SessionResponse): string =>
    toBase64(JSON.stringify({ method: 'pds-session', did: current.did, jwt: current.accessJwt }));

  return {
    respond: (_challenge) =>
      Effect.gen(function* () {
        session ??= yield* createSession;
        return buildResponse(session);
      }),
  };
};
