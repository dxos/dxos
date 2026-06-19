//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

const ONBOARDING_OPERATION = 'org.dxos.plugin.onboarding.operation';

// TODO(wittjosiah): Consider if any of this is generic enough for client plugin.

/**
 * Imports the bundled Bramble Coffee Roasters exemplar space and stamps it with the current migration
 * version so it is treated as already migrated (same as newly-created spaces).
 * Idempotent: if a space tagged with EXEMPLAR_SPACE_TAG already exists it is returned as-is.
 */
export const ImportExemplarSpace = Operation.make({
  meta: {
    key: DXN.make(`${ONBOARDING_OPERATION}.importExemplarSpace`),
    name: 'Import Exemplar Space',
    icon: 'ph--potted-plant--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    /** When true, bypasses the idempotency check and always imports a fresh copy. */
    force: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Void,
});

/**
 * Recover an existing identity by completing an OAuth flow with a registered recovery provider
 * (e.g. atproto / Atmosphere). Opens the provider authorization popup, redeems the returned
 * one-time recovery proof via IdentityService.recoverIdentity, and admits this device into HALO.
 */
export const RedeemOAuthRecovery = Operation.make({
  meta: {
    key: DXN.make(`${ONBOARDING_OPERATION}.redeemOAuthRecovery`),
    name: 'Redeem OAuth Recovery',
    icon: 'ph--cloud--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    provider: Schema.String,
    /** Provider login hint (atproto handle or DID) forwarded to Edge as `loginHint`. Required for atproto. */
    loginHint: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

/**
 * Begins OAuth recovery registration (redirect flow).
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
    key: DXN.make(`${ONBOARDING_OPERATION}.registerOAuthRecovery`),
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
 * Completes OAuth recovery registration for an existing local identity. Submits the registration
 * token along with the identity and space keys so the OAuth refresh token is routed to the personal
 * space and the recovery binding is recorded.
 */
export const CompleteOAuthRegistration = Operation.make({
  meta: {
    key: DXN.make(`${ONBOARDING_OPERATION}.completeOAuthRegistration`),
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
