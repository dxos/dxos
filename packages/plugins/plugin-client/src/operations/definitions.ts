//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { PublicKey } from '@dxos/client';
import { Operation } from '@dxos/compute';

import { meta } from '#meta';

const CLIENT_OPERATION = `${meta.id}.operation`;

const IdentitySchema = Schema.Struct({
  identityKey: Schema.instanceOf(PublicKey),
  spaceKey: Schema.optional(Schema.instanceOf(PublicKey)),
  profile: Schema.optional(
    Schema.Struct({
      displayName: Schema.optional(Schema.String),
      avatarCid: Schema.optional(Schema.String),
      data: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
    }),
  ),
});

const ProfileSchema = Schema.Struct({
  displayName: Schema.optional(Schema.String),
  avatarCid: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
});

export const CreateIdentity = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.create-identity`, name: 'Create Identity', icon: 'ph--user--regular' },
  services: [Capability.Service],
  input: ProfileSchema,
  output: IdentitySchema,
});

export const JoinIdentity = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.join-identity`, name: 'Join Identity', icon: 'ph--sign-in--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    invitationCode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const ShareIdentity = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.share-identity`, name: 'Share Identity', icon: 'ph--share-network--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RecoverIdentity = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.recover-identity`, name: 'Recover Identity', icon: 'ph--key--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const ResetStorage = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.reset-storage`, name: 'Reset Storage', icon: 'ph--warning--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    mode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const CreateAgent = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.create-agent`, name: 'Create Agent', icon: 'ph--brain--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const CreateRecoveryCode = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.create-recovery-code`, name: 'Create Recovery Code', icon: 'ph--key--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const CreatePasskey = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.create-passkey`, name: 'Create Passkey', icon: 'ph--key--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RedeemPasskey = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.redeem-passkey`, name: 'Redeem Passkey', icon: 'ph--key--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RedeemToken = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.redeem-token`, name: 'Redeem Token', icon: 'ph--lock--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    token: Schema.String,
  }),
  output: Schema.Void,
});

/**
 * Recover an existing identity by completing an OAuth flow with a registered recovery provider
 * (e.g. atproto / Atmosphere). Opens the provider authorization popup, redeems the returned
 * one-time recovery proof via IdentityService.recoverIdentity, and admits this device into HALO.
 */
export const RedeemOAuthRecovery = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.redeem-oauth-recovery`, name: 'Redeem OAuth Recovery', icon: 'ph--cloud--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    provider: Schema.String,
    /** Provider login hint (atproto handle or DID) forwarded to Edge as `loginHint`. Required for atproto. */
    loginHint: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

/**
 * Phase 1 of OAuth-first recovery registration (redirect flow).
 *
 * Initiates the OAuth flow, persists a snapshot of the invitation code + hub URL keyed by the
 * flow's `accessTokenId`, then opens the provider authorization URL in a new tab. atproto/bsky
 * nullifies `window.opener`, so completion is finalized out-of-band: after auth, kms-service
 * redirects the tab to `/redirect/oauth-recovery` where the recovery finalizer reads the snapshot,
 * creates the local identity, calls {@link CompleteOAuthRegistration}, and redeems the invitation.
 * This operation returns immediately once the tab is open — it does not await completion.
 */
export const RegisterOAuthRecovery = Operation.make({
  meta: {
    key: `${CLIENT_OPERATION}.register-oauth-recovery`,
    name: 'Register OAuth Recovery',
    icon: 'ph--cloud--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    provider: Schema.String,
    /** Provider login hint (atproto handle or DID) forwarded to Edge as `loginHint`. Required for atproto. */
    loginHint: Schema.optional(Schema.String),
    /** Invitation code to redeem (with the provider-verified email) once registration completes. */
    code: Schema.String,
    /** Hub-service URL the invitation code is redeemed against. */
    hubUrl: Schema.String,
  }),
  output: Schema.Void,
});

/**
 * Phase 2 of OAuth-first recovery registration. Requires an existing local identity. Serializes
 * the personal-space genesis credential and submits it with the phase-1 `registrationToken` so
 * kms-service routes the stashed OAuth refresh token to the personal space and writes the
 * IdentityRecovery row.
 */
export const CompleteOAuthRegistration = Operation.make({
  meta: {
    key: `${CLIENT_OPERATION}.complete-oauth-registration`,
    name: 'Complete OAuth Registration',
    icon: 'ph--cloud--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    registrationToken: Schema.String,
  }),
  output: Schema.Struct({
    email: Schema.optional(Schema.String),
  }),
});
