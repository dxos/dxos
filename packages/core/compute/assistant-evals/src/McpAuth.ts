//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { createHash, randomBytes } from 'node:crypto';

/** What a grant is minted for: the identity the session runs as and the spaces it may reach. */
export type GrantOptions = {
  /** The worker's `/mcp` endpoint; the OAuth endpoints are its siblings on the same origin. */
  readonly mcpUrl: string;
  /** Hex-encoded identity public key. */
  readonly identityKey: string;
  readonly haloSpaceId: string;
  readonly spaceIds: readonly string[];
};

/** Name the worker records for the client; shows up in its grant store, nowhere else. */
const CLIENT_NAME = 'dxos assistant-evals';

/**
 * Never dialed: the worker answers the form with a redirect to it, and the code is read off that
 * `Location` header rather than followed, so the host only has to be a valid URL.
 */
const REDIRECT_URI = 'http://127.0.0.1/callback';

const base64url = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64url');

const expectStatus = async (response: Response, status: number, step: string): Promise<void> => {
  if (response.status !== status) {
    const body = (await response.text()).replace(/\s+/g, ' ').slice(0, 200);
    throw new Error(`MCP dev grant: ${step} answered ${response.status}, expected ${status}: ${body}`);
  }
};

/**
 * Mints a bearer for a deployed dev worker without a browser, through the identity-key form the
 * worker serves on `/authorize?dev_form=1` when `DX_ENABLE_DEV_IDENTITY_FORM` is set — dev only, by
 * the worker's own gate.
 *
 * It is the OAuth grant a real MCP client performs — dynamic registration, PKCE, the authorization
 * code, the token exchange — with the passkey ceremony replaced by the form, which is the one step
 * a headless client cannot complete. The token it returns is the same kind the ceremony would have
 * produced, so the worker cannot tell an eval's session from a person's.
 *
 * The form takes the public key on trust, so it only exists on dev: the eval creates its own
 * identity and space and states them here, and the worker serves whatever is replicated to it.
 */
export const devGrant = async ({ mcpUrl, identityKey, haloSpaceId, spaceIds }: GrantOptions): Promise<string> => {
  const origin = new URL(mcpUrl).origin;

  const registration = await fetch(`${origin}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: CLIENT_NAME,
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: 'none',
    }),
  });
  await expectStatus(registration, 201, 'client registration');
  const { client_id: clientId } = (await registration.json()) as { client_id: string };

  // PKCE (RFC 7636): the verifier is the proof at the token exchange, since a public client has no
  // secret to present there.
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  const state = base64url(randomBytes(16));

  const authorize = new URL(`${origin}/authorize`);
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', REDIRECT_URI);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('code_challenge', challenge);
  authorize.searchParams.set('code_challenge_method', 'S256');
  authorize.searchParams.set('dev_form', '1');
  const form = await fetch(authorize, { redirect: 'manual' });
  await expectStatus(form, 200, 'authorize (dev form)');
  const nonce = (await form.text()).match(/name="nonce"\s+value="([^"]+)"/)?.[1];
  if (nonce == null) {
    throw new Error('MCP dev grant: the authorize page carried no form nonce; is the dev identity form enabled?');
  }

  const submitted = await fetch(`${origin}/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      nonce,
      identity_key: identityKey,
      halo_space_id: haloSpaceId,
      space_ids: spaceIds.join(','),
    }).toString(),
    redirect: 'manual',
  });
  await expectStatus(submitted, 302, 'form submission');
  const location = new URL(submitted.headers.get('location') ?? '', REDIRECT_URI);
  const code = location.searchParams.get('code');
  if (code == null || location.searchParams.get('state') !== state) {
    throw new Error(`MCP dev grant: the form redirected without a code for this state (${location.search}).`);
  }

  const exchange = await fetch(`${origin}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
    }).toString(),
  });
  await expectStatus(exchange, 200, 'token exchange');
  const { access_token: token } = (await exchange.json()) as { access_token?: string };
  if (token == null || token.length === 0) {
    throw new Error('MCP dev grant: the token exchange answered without an access token.');
  }
  return token;
};
