//
// Copyright 2024 DXOS.org
//

import { type PublicKey } from '@dxos/client';
import { type Credential, type Identity, type Presentation } from '@dxos/client/halo';

import { codec } from './codec';

// TODO(burdon): Factor out to @dxos/hub-protocol.

export const matchServiceCredential =
  (capabilities: string[] = []) =>
  (credential: Credential) => {
    if (credential.subject.assertion['@type'] !== 'dxos.halo.credentials.ServiceAccess') {
      return false;
    }

    const { capabilities: credentialCapabilities } = credential.subject.assertion;
    return capabilities.every((capability) => credentialCapabilities.includes(capability));
  };

export type SignupResult = {
  login: boolean;
  token?: string;
  type?: string;
};

/**
 * POST `/account/invitation-code/redeem` on hub-service. Unauthenticated.
 * Used directly from the welcome form (for test emails) and from the orchestrator.
 *
 * The server interprets request shape per email kind:
 * - Test email: code is ignored. Returns `{ loginToken }` (existing account, recover),
 *   `{ needsIdentity: true }` (new, no identityKey provided), or
 *   `{ accountId, emailVerificationSent }` (new, identityKey provided -> account created).
 * - Non-test email: code + identityKey required.
 */
export type RedeemResult =
  | { accountId: string; emailVerificationSent: boolean }
  | { loginToken: string }
  | { needsIdentity: true };

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
 * Magic link sign-up.
 */
export const signup = async ({
  hubUrl,
  email,
  redirectUrl,
  identity,
}: {
  hubUrl: string;
  email: string;
  redirectUrl?: string;
  identity: Identity | null;
}): Promise<SignupResult> => {
  const response = await fetch(new URL('/account/signup', hubUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      identityDid: identity ? `did:key:${identity.identityKey.toHex()}` : undefined,
      redirectUrl,
    }),
  });

  if (!response.ok) {
    throw new Error('signup failed', { cause: response.statusText });
  }

  const { token, type } = await response.json();
  if (token) {
    // Debugging link.
    const activationLink = new URL('/', window.location.href);
    activationLink.searchParams.set('token', token);
    activationLink.searchParams.set('type', type);
    // eslint-disable-next-line
    console.log(activationLink.href);
  }

  return { login: type === 'login', token, type };
};

/**
 * Activate account.
 * @param params.hubUrl
 * @param params.identity
 * @param params.token
 */
export const activateAccount = async ({
  hubUrl,
  identity,
  token,
  referrer,
}: {
  hubUrl: string;
  identity: Identity;
  token?: string;
  referrer?: PublicKey;
}): Promise<Credential> => {
  const response = await fetch(new URL('/account/activate', hubUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identityDid: `did:key:${identity.identityKey.toHex()}`,
      referrerDid: referrer ? `did:key:${referrer.toHex()}` : undefined,
      token,
    }),
  });
  if (!response.ok) {
    throw new Error('activation failed', { cause: response.statusText });
  }

  // Decode and save credential in HALO.
  const { credential } = await response.json();
  return credential && codec.decode<Credential>(credential);
};

type ProfileResponse = {
  identityDid: string;
  email?: string;
  capabilities: string[];
};

/**
 * Get profile.
 *
 * @param params.hubUrl
 * @param params.credential
 */
export const getProfile = async ({
  hubUrl,
  presentation,
}: {
  hubUrl: string;
  presentation: Presentation;
}): Promise<ProfileResponse> => {
  const response = await fetch(new URL('/account/profile', hubUrl), {
    headers: { Authorization: `Bearer ${codec.encode(presentation)}` },
  });
  if (!response.ok) {
    throw new Error('profile fetch failed', { cause: response.statusText });
  }

  return response.json();
};

/**
 * Upgrade  credential.
 *
 * @param params.hubUrl
 * @param params.credential
 */
export const upgradeCredential = async ({
  hubUrl,
  presentation,
}: {
  hubUrl: string;
  presentation: Presentation;
}): Promise<Credential> => {
  const response = await fetch(new URL('/account/upgrade', hubUrl), {
    headers: { Authorization: `Bearer ${codec.encode(presentation)}` },
  });
  if (!response.ok) {
    throw new Error('upgrade failed', { cause: response.statusText });
  }

  const { credential: upgradedCredential } = await response.json();
  return upgradedCredential && codec.decode<Credential>(upgradedCredential);
};
