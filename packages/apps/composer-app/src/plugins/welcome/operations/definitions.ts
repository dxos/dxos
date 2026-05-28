//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

const WELCOME_OPERATION = 'org.dxos.plugin.welcome.operation';

// TODO(wittjosiah): Consider if any of this is generic enough for client plugin.

/**
 * Recover an existing identity by completing an OAuth flow with a registered recovery provider
 * (e.g. atproto / Atmosphere). Opens the provider authorization popup, redeems the returned
 * one-time recovery proof via IdentityService.recoverIdentity, and admits this device into HALO.
 */
export const RedeemOAuthRecovery = Operation.make({
  meta: { key: `${WELCOME_OPERATION}.redeem-oauth-recovery`, name: 'Redeem OAuth Recovery', icon: 'ph--cloud--regular' },
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
    key: `${WELCOME_OPERATION}.register-oauth-recovery`,
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
