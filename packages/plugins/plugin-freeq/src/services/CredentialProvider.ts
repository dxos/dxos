//
// Copyright 2026 DXOS.org
//

import * as HttpBody from '@effect/platform/HttpBody';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { FreeqAuthError } from '../errors';

/** Default entryway used to resolve a handle to a DID when none is configured. */
const DEFAULT_ENTRYWAY = 'https://bsky.social';

export interface SaslChallenge {
  session_id: string;
  nonce: string;
  timestamp: number;
}

export interface CredentialProvider {
  // Returns the base64url SASL response payload for the given challenge.
  respond: (challenge: SaslChallenge) => Effect.Effect<string, FreeqAuthError, HttpClient.HttpClient>;
}

const SessionResponse = Schema.Struct({
  did: Schema.String,
  accessJwt: Schema.String,
  refreshJwt: Schema.String,
});

type SessionResponse = Schema.Schema.Type<typeof SessionResponse>;

const ResolveHandleResponse = Schema.Struct({ did: Schema.String });

const DidServiceSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),
  // Either the bare endpoint URL (the common case) or a structured object;
  // we only consume the string form, so the object case decodes to unknown.
  serviceEndpoint: Schema.Unknown,
});
const DidDocumentSchema = Schema.Struct({
  service: Schema.optional(Schema.Array(DidServiceSchema)),
});

/** Standard base64, converted to the URL-safe alphabet with padding stripped. */
const toBase64Url = (value: string): string =>
  btoa(String.fromCharCode(...new TextEncoder().encode(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** Resolves a handle (e.g. `user.bsky.social`) or DID to its PDS endpoint via the DID document. */
const resolvePds = (
  handleOrDid: string,
  entryway: string,
): Effect.Effect<string, FreeqAuthError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const did = handleOrDid.startsWith('did:')
      ? handleOrDid
      : yield* client
          .execute(
            HttpClientRequest.get(`${entryway}/xrpc/com.atproto.identity.resolveHandle`).pipe(
              HttpClientRequest.setUrlParams({ handle: handleOrDid }),
            ),
          )
          .pipe(
            Effect.flatMap(HttpClientResponse.schemaBodyJson(ResolveHandleResponse)),
            Effect.map((response) => response.did),
          );

    const docRequest = did.startsWith('did:web:')
      ? HttpClientRequest.get(`https://${did.slice('did:web:'.length)}/.well-known/did.json`)
      : HttpClientRequest.get(`https://plc.directory/${did}`);
    const doc = yield* client
      .execute(docRequest)
      .pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(DidDocumentSchema)));

    const service = doc.service?.find(
      (entry) => entry.id === '#atproto_pds' || entry.type === 'AtprotoPersonalDataServer',
    );
    const endpoint = service?.serviceEndpoint;
    if (typeof endpoint !== 'string' || endpoint.length === 0) {
      return yield* Effect.fail(new FreeqAuthError({ message: `Could not resolve a PDS for ${handleOrDid}.` }));
    }
    return endpoint;
  }).pipe(Effect.mapError((cause) => (cause instanceof FreeqAuthError ? cause : new FreeqAuthError({ cause }))));

const createSession = (
  pdsUrl: string,
  handle: string,
  appPassword: string,
): Effect.Effect<SessionResponse, FreeqAuthError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.post(`${pdsUrl}/xrpc/com.atproto.server.createSession`).pipe(
      HttpClientRequest.setHeader('content-type', 'application/json'),
      HttpClientRequest.setBody(
        HttpBody.text(JSON.stringify({ identifier: handle, password: appPassword }), 'application/json'),
      ),
    );
    const response = yield* client.execute(request);
    return yield* HttpClientResponse.schemaBodyJson(SessionResponse)(response);
  }).pipe(Effect.mapError((cause) => new FreeqAuthError({ cause })));

/**
 * Phase-1 credential provider. Resolves the account's DID and real PDS from
 * its handle (mirroring plugin-bluesky's `resolvePds`), exchanges the
 * app-password for a PDS session via `com.atproto.server.createSession`
 * issued against that PDS (never the entryway), then presents the session as
 * the freeq `pds-session` SASL response. DID/PDS/session are resolved lazily
 * on the first challenge and cached for the lifetime of the provider.
 */
export const makeAppPasswordCredentialProvider = (options: {
  handle: string;
  appPassword: string;
  entryway?: string;
}): CredentialProvider => {
  const entryway = options.entryway ?? DEFAULT_ENTRYWAY;
  let resolved: { did: string; pdsUrl: string; session: SessionResponse } | undefined;

  const resolve = Effect.gen(function* () {
    const pdsUrl = yield* resolvePds(options.handle, entryway);
    const session = yield* createSession(pdsUrl, options.handle, options.appPassword);
    return { did: session.did, pdsUrl, session };
  });

  const buildResponse = (current: { did: string; pdsUrl: string; session: SessionResponse }, nonce: string): string =>
    toBase64Url(
      JSON.stringify({
        did: current.did,
        method: 'pds-session',
        signature: current.session.accessJwt,
        pds_url: current.pdsUrl,
        challenge_nonce: nonce,
      }),
    );

  return {
    respond: (challenge) =>
      Effect.gen(function* () {
        resolved ??= yield* resolve;
        return buildResponse(resolved, challenge.nonce);
      }),
  };
};
