//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type EdgeIdentity, encodeAuthHeader, handleAuthChallenge, readAuthChallenge } from '@dxos/edge-client';

/** What a token is minted for: the EDGE that holds the identity's account, and the identity itself. */
export type MintOptions = {
  /** The EDGE origin the identity is registered against; hub answers under its `/hub` prefix. */
  readonly edgeUrl: string;
  /** Signs the challenge the mint requires, proving possession of the identity's device key. */
  readonly identity: EdgeIdentity;
  /** Shown beside the token in the identity's own listing, nowhere else. */
  readonly label?: string;
};

const DEFAULT_LABEL = 'dxos assistant-evals';

/** Loopback, where a cleartext hop never leaves the machine — a local stack and this module's tests. */
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '[::1]', 'localhost']);

const expectStatus = async (response: Response, status: number, step: string): Promise<void> => {
  if (response.status !== status) {
    const body = (await response.text()).replace(/\s+/g, ' ').slice(0, 200);
    throw new Error(`MCP API token: ${step} answered ${response.status}, expected ${status}: ${body}`);
  }
};

/**
 * The origin to mint against, refusing one that would carry the token in cleartext.
 *
 * Checked here rather than where the bearer is later attached to a request: the mint *itself*
 * transports the token, in its response, so a transport rejected only afterwards has already
 * published it to anything on the path.
 */
const mintOrigin = (edgeUrl: string): string => {
  const url = new URL(edgeUrl);
  if (url.protocol !== 'https:' && !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(`MCP API token: refusing to mint over ${url.protocol}//${url.host}; use HTTPS.`);
  }
  return url.origin;
};

/**
 * Mints an identity-bound API token for the deployed MCP worker, with no browser involved.
 *
 * It is the credential a CI job or an agent holds in place of a HALO key (`hub-service/README.md`
 * § API tokens in dxos/edge): minted once with a verifiable presentation — the same proof this
 * identity gives db-service and EDGE on every connection — and presented to `/mcp` as a bearer
 * thereafter, where hub resolves it back to the identity. The worker serves the spaces the
 * identity's agent holds, so nothing here names a space: replication is what grants access.
 */
export const mintApiToken = async ({ edgeUrl, identity, label = DEFAULT_LABEL }: MintOptions): Promise<string> => {
  const origin = mintOrigin(edgeUrl);
  const route = `${origin}/hub/api/api-tokens`;
  const body = JSON.stringify({ label });

  // The challenge comes from the route's own refusal rather than from EDGE's `/auth`: a nonce is an
  // HMAC under the verifier's key, so only a challenge hub minted is one hub accepts, and token CRUD
  // keeps anti-replay enforced.
  const challenged = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  await expectStatus(challenged, 401, 'challenge request');
  if ((await readAuthChallenge(challenged)) == null) {
    throw new Error(`MCP API token: ${route} refused without issuing a challenge to sign.`);
  }
  const presentation = await handleAuthChallenge(challenged, identity);

  const minted = await fetch(route, {
    method: 'POST',
    headers: { 'Authorization': encodeAuthHeader(presentation), 'Content-Type': 'application/json' },
    body,
  });
  await expectStatus(minted, 201, 'token mint');
  const { data } = (await minted.json()) as { data?: { token?: string } };
  if (data?.token == null || data.token.length === 0) {
    throw new Error('MCP API token: the mint answered without a token.');
  }
  return data.token;
};
