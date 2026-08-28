//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { encodeCompat } from '@dxos/protocols/buf-shape-compat';
import { PresentationSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

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
 *
 * Only the VP challenge's own parameters are read. Two things would otherwise be mistaken for it:
 * a `Bearer realm="VerifiablePresentation challenge=…"`, which declares Bearer alone, and a
 * `challenge` belonging to a later scheme when the VP challenge carries none. Signing either would
 * retry an unrelated 401, running a non-idempotent request twice.
 */
export const parseChallengeHeader = (header: string | null | undefined): string | undefined => {
  if (!header) {
    return undefined;
  }

  // Segment, rather than regex over the whole header: an auth-param value may contain a comma
  // inside quotes, so no single delimiter separates challenges.
  const segments = splitOutsideQuotes(header);
  let parameters: string[] | undefined;
  for (let index = 0; index < segments.length && parameters === undefined; index++) {
    const afterScheme = stripVpScheme(segments[index]);
    if (afterScheme !== undefined) {
      parameters = [afterScheme, ...segments.slice(index + 1)];
    }
  }
  if (parameters === undefined) {
    return undefined;
  }

  for (const parameter of parameters) {
    const match = /^\s*challenge\s*=\s*(?:"([^"]*)"|([^\s,]*))/i.exec(parameter);
    if (match) {
      return (match[1] ?? match[2]) || undefined;
    }
    // A segment that is not an auth-param starts the next challenge, whose params are not ours.
    if (parameter.trim().length > 0 && !/^\s*[!#$%&'*+\-.^_`|~\w]+\s*=/.test(parameter)) {
      return undefined;
    }
  }
  return undefined;
};

/**
 * The segment's text after the VP auth-scheme token, or undefined if it does not start with it.
 * The scheme must be a whole token, so a longer scheme merely beginning with it does not match.
 */
const stripVpScheme = (segment: string): string | undefined => {
  const trimmed = segment.trimStart();
  if (!trimmed.toLowerCase().startsWith(VP_SCHEME.toLowerCase())) {
    return undefined;
  }
  const remainder = trimmed.slice(VP_SCHEME.length);
  return remainder === '' || remainder.startsWith(' ') || remainder.startsWith('\t') ? remainder : undefined;
};

/** Split on commas that are not inside a quoted string. */
const splitOutsideQuotes = (header: string): string[] => {
  const segments: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < header.length; index++) {
    const character = header[index];
    if (inQuotes) {
      current += character;
      if (character === '\\' && index + 1 < header.length) {
        current += header[++index];
      } else if (character === '"') {
        inQuotes = false;
      }
      continue;
    }
    if (character === '"') {
      inQuotes = true;
      current += character;
    } else if (character === ',') {
      segments.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  segments.push(current);
  return segments;
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

export type AuthChallengeInfo = {
  /** Base64 challenge nonce. */
  challenge: string;
  /**
   * Server-advertised challenge validity. Absent on servers predating the TTL contract — there the
   * only refresh signal is the eventual 401.
   */
  expiresInMs?: number;
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
export const fetchAuthChallengeInfo = async (baseHttpUrl: string | URL): Promise<AuthChallengeInfo | undefined> => {
  try {
    const response = await fetch(new URL('/auth', baseHttpUrl));
    const challenge = await readAuthChallenge(response);
    if (!challenge) {
      log.verbose('no challenge in /auth response', { status: response.status });
      return undefined;
    }
    let expiresInMs: number | undefined;
    try {
      const body = await response.clone().json();
      const advertised = body?.data?.expiresInMs;
      // Finite-positive only: `1e400` parses to `Infinity`, which would schedule a refresh at never.
      expiresInMs = Number.isFinite(advertised) && advertised > 0 ? advertised : undefined;
    } catch {
      // Header-shaped challenge (the 401 fallback) — no JSON body to read a TTL from.
    }
    return { challenge, expiresInMs };
  } catch (error) {
    log.verbose('failed to fetch auth challenge', { error });
    return undefined;
  }
};

/** The challenge alone; see {@link fetchAuthChallengeInfo}. */
export const fetchAuthChallenge = async (baseHttpUrl: string | URL): Promise<string | undefined> =>
  (await fetchAuthChallengeInfo(baseHttpUrl))?.challenge;

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
  return encodeCompat(PresentationSchema, presentation);
};

export type ChallengeAuthentication = {
  /** Encoded presentation bound to the fetched challenge. */
  presentation: Uint8Array;
  /** TTL advertised beside the challenge, when the server provides one. */
  expiresInMs?: number;
};

/**
 * Obtain a challenge from `/auth` and sign it.
 * Returns undefined when no challenge could be obtained, leaving the caller on the 401 fallback.
 */
export const authenticateViaChallengeEndpoint = async (
  baseHttpUrl: string | URL,
  identity: EdgeIdentity,
): Promise<ChallengeAuthentication | undefined> => {
  const info = await fetchAuthChallengeInfo(baseHttpUrl);
  if (info === undefined) {
    return undefined;
  }
  return {
    presentation: await presentCredentialsForChallenge(identity, info.challenge),
    expiresInMs: info.expiresInMs,
  };
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
