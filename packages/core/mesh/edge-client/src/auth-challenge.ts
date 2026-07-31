//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols/proto';

import { type EdgeIdentity } from './edge-identity';

/**
 * The VerifiablePresentation challenge/response handshake, shared by the HTTP and WebSocket
 * clients. Kept apart from {@link EdgeIdentity}, which is only the identity contract: this module
 * owns the wire format (header parsing, `/auth` round trip) rather than who is authenticating.
 *
 * Two ways in, because a client must work against servers on either side of the change that made
 * `/auth` answer 200:
 * - {@link fetchAuthChallenge} asks `/auth` up front. Preferred — acquiring a challenge is a
 *   successful operation.
 * - {@link handleAuthChallenge} reads the challenge off a 401 that already happened. The lazy
 *   fallback, and the only option on servers whose `/auth` can just reject.
 */

const VP_SCHEME = 'VerifiablePresentation';

/**
 * Pull the challenge out of a `WWW-Authenticate` value.
 *
 * `WWW-Authenticate` carries a comma-separated *list* of challenges (RFC 9110 §11.6.1), so the
 * VP challenge is not necessarily first — edge emits `Bearer realm="dxos", VerifiablePresentation …`
 * whenever both auth methods are allowed. Values may be quoted or a bare token; base64's `/` and
 * `=` are not `tchar`, so a real nonce is always quoted, while the historical `challenge=TODO`
 * placeholder is not.
 *
 * An empty challenge (`challenge=""`) is reported as absent rather than as the empty string. Edge
 * emits exactly that when its server keypair is unconfigured, and there is nothing a caller can
 * sign — treating it as present would route the request through the auth path only to fail on the
 * missing challenge, masking the original response.
 */
export const parseChallengeHeader = (header: string | null | undefined): string | undefined => {
  if (!header) {
    return undefined;
  }
  const match = new RegExp(`${VP_SCHEME}\\s+challenge=(?:"([^"]*)"|([^\\s,]*))`, 'i').exec(header);
  if (!match) {
    return undefined;
  }
  return (match[1] ?? match[2]) || undefined;
};

/**
 * Read the challenge from an `/auth` response.
 *
 * Two shapes are accepted so a client works against servers on either side of the change:
 * - `200` with `{ success: true, data: { challenge } }` — the current shape. Acquiring a challenge
 *   is a successful operation, so it is reported as one.
 * - `401` with `WWW-Authenticate` — every protected resource, plus older servers whose `/auth`
 *   could only issue a challenge by failing.
 */
export const readAuthChallenge = async (response: Response): Promise<string | undefined> => {
  const headerChallenge = parseChallengeHeader(response.headers.get('WWW-Authenticate'));
  if (headerChallenge) {
    return headerChallenge;
  }
  if (!response.ok) {
    return undefined;
  }
  try {
    const body = await response.clone().json();
    const challenge = body?.data?.challenge ?? body?.challenge;
    return typeof challenge === 'string' && challenge.length > 0 ? challenge : undefined;
  } catch (error) {
    log.verbose('auth challenge response was not JSON', { error });
    return undefined;
  }
};

/**
 * Fetch a challenge nonce from the edge `/auth` endpoint.
 *
 * This is the deliberate, up-front way to obtain a challenge. The alternative — firing a request
 * you expect to be rejected and reading the challenge off the 401 — logs an error in every browser
 * console and records a routine auth failure server-side on each client boot.
 *
 * Returns undefined if the endpoint is unreachable or answers in neither known shape; callers fall
 * back to the 401 path, which still works against every server.
 */
export const fetchAuthChallenge = async (baseHttpUrl: string | URL): Promise<string | undefined> => {
  try {
    const response = await fetch(new URL('/auth', baseHttpUrl));
    const challenge = await readAuthChallenge(response);
    if (!challenge) {
      log.verbose('no challenge in /auth response', { status: response.status });
    }
    return challenge;
  } catch (error) {
    log.verbose('failed to fetch auth challenge', { error });
    return undefined;
  }
};

/**
 * Sign a base64 challenge, returning the encoded presentation.
 *
 * The bytes are returned unencoded because the two transports frame them differently: HTTP wraps
 * them in an `Authorization` header, the WebSocket path in a subprotocol token.
 */
export const presentCredentialsForChallenge = async (
  identity: EdgeIdentity,
  challenge: string,
): Promise<Uint8Array> => {
  const presentation = await identity.presentCredentials({ challenge: Buffer.from(challenge, 'base64') });
  return schema.getCodecForType('dxos.halo.credentials.Presentation').encode(presentation);
};

/**
 * Obtain a challenge from `/auth` and sign it.
 * Returns undefined when no challenge could be obtained, leaving the caller on the 401 fallback.
 */
export const authenticateViaChallengeEndpoint = async (
  baseHttpUrl: string | URL,
  identity: EdgeIdentity,
): Promise<Uint8Array | undefined> => {
  const challenge = await fetchAuthChallenge(baseHttpUrl);
  return challenge === undefined ? undefined : presentCredentialsForChallenge(identity, challenge);
};

/**
 * Sign the challenge carried by a rejected response.
 * Retained for the lazy path: a request that 401s is retried with a presentation bound to the
 * challenge that rejection carried.
 */
export const handleAuthChallenge = async (failedResponse: Response, identity: EdgeIdentity): Promise<Uint8Array> => {
  const challenge = await readAuthChallenge(failedResponse);
  invariant(challenge !== undefined, 'No auth challenge in response.');
  return presentCredentialsForChallenge(identity, challenge);
};
