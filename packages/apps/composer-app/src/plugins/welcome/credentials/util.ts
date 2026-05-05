//
// Copyright 2024 DXOS.org
//

/**
 * POST `/account/invitation-code/redeem` on hub-service. Unauthenticated.
 * Two-step signup: the redeemer supplies the invitation code + their identity
 * key + the email they want to register with (codes are anonymous at issue
 * time). Optional fields are accepted because the server overloads this
 * endpoint with internal handling for some addresses; standard callers should
 * always pass all three.
 */
export type RedeemResult =
  | { accountId: string; emailVerificationSent: boolean }
  | { loginToken: string }
  | { needsIdentity: true };

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
  identityKey,
  message,
}: {
  hubUrl: string;
  email: string;
  identityKey?: string;
  message?: string;
}): Promise<void> => {
  await fetch(new URL('/account/request-access', hubUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, identityKey, message }),
  });
};

export const redeemAccountInvitation = async ({
  hubUrl,
  email,
  identityKey,
  code,
}: {
  hubUrl: string;
  email: string;
  identityKey?: string;
  code?: string;
}): Promise<RedeemResult> => {
  const response = await fetch(new URL('/account/invitation-code/redeem', hubUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, identityKey, code }),
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
 * never creates new accounts (other than the test-email carve-out). Server
 * inlines `token` for test emails; regular emails are delivered out-of-band
 * and the response is `{}`. The response shape is identical for unknown
 * emails (enumeration-safe).
 *
 * Test-email carve-out: when a test address has no Account yet, the server
 * returns `{ needsIdentity: true }`. The caller creates a local identity and
 * retries with `identityKey`; the retry creates a fresh test Account and
 * returns `{ admitted: true }` (no token, since there's nothing to recover).
 */
export const login = async ({
  hubUrl,
  email,
  identityKey,
}: {
  hubUrl: string;
  email: string;
  identityKey?: string;
}): Promise<{ token?: string; needsIdentity?: boolean; admitted?: boolean }> => {
  const response = await fetch(new URL('/account/login', hubUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, identityKey }),
  });
  if (!response.ok) {
    throw new Error('login failed', { cause: response.statusText });
  }
  return response.json();
};
