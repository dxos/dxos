//
// Copyright 2024 DXOS.org
//

/**
 * POST `/account/invitation-code/redeem` on hub-service. Unauthenticated.
 * Two-step signup: the redeemer supplies the invitation code + their identity
 * DID + the email they want to register with (codes are anonymous at issue
 * time). Optional fields are accepted because the server overloads this
 * endpoint with internal handling for some addresses; standard callers should
 * always pass all three.
 */
export type RedeemResult = { accountId: string; emailVerificationSent: boolean } | { needsIdentity: true };

/**
 * POST `/account/invitation-code/validate` on hub-service. Returns true if the code
 * exists, isn't revoked, and hasn't been redeemed yet.
 */
export const validateInvitationCode = async ({ hubUrl, code }: { hubUrl: string; code: string }): Promise<boolean> => {
  try {
    const response = await fetch(new URL('/account/invitation-code/validate', hubUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.replace(/-/g, '').toUpperCase() }),
    });
    const envelope = (await response.json()) as { success: boolean; data?: { valid: boolean } };
    return !!envelope.success && !!envelope.data?.valid;
  } catch {
    return false;
  }
};

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
  await fetch(new URL('/account/request-access', hubUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, identityDid, message }),
  });
};

export const redeemAccountInvitation = async ({
  hubUrl,
  email,
  identityDid,
  identityKey,
  code,
}: {
  hubUrl: string;
  email: string;
  identityDid?: string;
  identityKey?: string;
  code?: string;
}): Promise<RedeemResult> => {
  const response = await fetch(new URL('/account/invitation-code/redeem', hubUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, identityDid, identityKey, code }),
  });
  let envelope: { success: boolean; message?: string; data?: any };
  try {
    envelope = await response.json();
  } catch (parseErr) {
    throw new Error(`Account redemption failed: HTTP ${response.status} (non-JSON response)`);
  }
  if (!envelope.success) {
    const error: any = new Error(`Account redemption failed: ${envelope.message ?? 'unknown error'}`);
    error.data = envelope.data;
    throw error;
  }
  return envelope.data as RedeemResult;
};

/**
 * POST `/account/login` on hub-service. Existing-account email recovery only;
 * never creates new accounts (other than the test-email carve-out). Regular
 * emails are delivered out-of-band and the response is `{}`. The response
 * shape is identical for unknown emails (enumeration-safe).
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
}): Promise<{ token?: string; needsIdentity?: boolean; admitted?: boolean }> => {
  const response = await fetch(new URL('/account/login', hubUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, identityDid, identityKey, redirectUrl }),
  });
  if (!response.ok) {
    throw new Error('login failed', { cause: response.statusText });
  }
  return response.json();
};
