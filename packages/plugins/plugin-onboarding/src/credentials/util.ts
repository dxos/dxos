//
// Copyright 2024 DXOS.org
//

/** Slash-terminated: a relative path would otherwise replace hub's `/hub` prefix. */
const hubBase = (hubUrl: string): string => `${hubUrl.replace(/\/+$/, '')}/`;

/**
 * POST `/account/request-access` on hub-service. Adds an email to the waitlist
 * and (if configured server-side) pings Discord + Kit. Always reports success
 * back to the client to avoid leaking whether the email was already on the list.
 */
export const joinWaitlist = async ({
  hubUrl,
  email,
  identityDid,
  message,
}: {
  hubUrl: string;
  email: string;
  identityDid?: string;
  message?: string;
}): Promise<void> => {
  await fetch(new URL('account/request-access', hubBase(hubUrl)), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, identityDid, message }),
  });
};

/**
 * POST `/account/login` on hub-service. Existing-account email recovery only;
 * never creates new accounts (other than the test-email carve-out). The link
 * is delivered out-of-band and the response is `{}` — a recovery token is
 * never returned inline. The response shape is identical for unknown emails
 * (enumeration-safe).
 *
 * Test-email carve-out: test accounts are never restored. The server always
 * returns `{ needsIdentity: true }` when no `identityDid` is supplied. The
 * caller creates a fresh local identity and retries with `identityDid`; the
 * retry replaces any prior test Account on that email and returns
 * `{ admitted: true }` (no token, since there's nothing to recover).
 */
export const login = async ({
  hubUrl,
  email,
  identityDid,
  identityKey,
  redirectUrl,
}: {
  hubUrl: string;
  email: string;
  identityDid?: string;
  identityKey?: string;
  redirectUrl?: string;
}): Promise<{ needsIdentity?: boolean; admitted?: boolean }> => {
  const response = await fetch(new URL('account/login', hubBase(hubUrl)), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, identityDid, identityKey, redirectUrl }),
  });
  if (!response.ok) {
    throw new Error('login failed', { cause: response.statusText });
  }
  return response.json();
};
