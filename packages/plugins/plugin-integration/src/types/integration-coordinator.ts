//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import type { Database, Key, Obj, Ref } from '@dxos/echo';

import { meta } from '#meta';

/** Result of {@link IntegrationCoordinator.createIntegration}: OAuth draft (`oauth-started`), custom dialog or login-hint dialog (`dialog-opened`), or unused sync persist (`integration-created`). */
export type CreateIntegrationResult =
  | { kind: 'oauth-started'; draftIntegrationId: string }
  | { kind: 'dialog-opened' }
  | { kind: 'integration-created'; integrationId: string };

/** Result of {@link IntegrationCoordinator.createCustomIntegration}. */
export type CreateCustomIntegrationResult = { kind: 'integration-created'; integrationId: string };

/**
 * Integration creation + OAuth: plugin-scoped `window.message` listener survives UI teardown (unlike hook-only OAuth). OAuth keeps stubs in memory until callback; DB writes only after success.
 */
export type IntegrationCoordinator = {
  /**
   * Create flow entry: OAuth → in-memory stubs + popup, persist on callback; non-OAuth → `PROVIDER_FORM_DIALOG`, then {@link createCustomIntegration}. `providerId` selects the registry entry stored on the Integration.
   * Providers with `oauth.requiresLoginHint` open `OAUTH_LOGIN_HINT_DIALOG`
   * unless a `loginHint` is supplied. Providers with
   * `oauth.useRedirectFlow` persist the pending entry to `localStorage`
   * and open the auth URL in a new tab; finalize runs in the new tab via
   * the `/redirect/oauth` NavigationHandler.
   */
  createIntegration: (input: {
    db: Database.Database;
    spaceId: Key.SpaceId;
    providerId: string;
    /** Optional first target ref when starting from an existing surface (e.g. mailbox/calendar); forwarded to `onTokenCreated` and sync-target UI. */
    existingTarget?: Ref.Ref<Obj.Unknown>;
    /** Provider-specific hint forwarded to Edge as `loginHint` (atproto handle / DID). */
    loginHint?: string;
  }) => Effect.Effect<CreateIntegrationResult, Error>;
  /** Persist manual token + Integration after `PROVIDER_FORM_DIALOG`; same finalize path as OAuth (navigation). */
  createCustomIntegration: (input: {
    db: Database.Database;
    providerId: string;
    source: string;
    account?: string;
    token: string;
    name?: string;
  }) => Effect.Effect<CreateCustomIntegrationResult, Error>;
  /**
   * Form-driven submit dispatched from the generic provider-form dialog.
   * Looks up the provider, runs `provider.credentialForm.onSubmit`, and
   * branches on the result: `complete` finalizes directly (non-OAuth);
   * `oauth` re-enters {@link createIntegration} with `loginHint`.
   */
  submitCredentialForm: (input: {
    db: Database.Database;
    spaceId: Key.SpaceId;
    providerId: string;
    values: unknown;
  }) => Effect.Effect<CreateIntegrationResult, Error>;
  /**
   * Finalize a redirect-flow OAuth callback received via `/redirect/oauth`.
   * Restores the pending entry from `localStorage`, builds the
   * `AccessToken` + `Integration`, and runs the standard finalize path.
   * Called by the plugin-integration NavigationHandler.
   */
  finalizeRedirectFlow: (input: { accessTokenId: string; accessToken: string }) => Effect.Effect<void, Error>;
};

export const IntegrationCoordinator = Capability.make<IntegrationCoordinator>(
  `${meta.id}.capability.integrationCoordinator`,
);
