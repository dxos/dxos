//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import type { Database, Key, Obj, Ref } from '@dxos/echo';

import { meta } from '#meta';

/** Result of {@link IntegrationCoordinator.createIntegration}: OAuth draft (`oauth-started`), custom dialog (`dialog-opened`; finish via {@link IntegrationCoordinator.createCustomIntegration}), or unused sync persist (`integration-created`). */
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
   * Create flow entry: OAuth → in-memory stubs + popup, persist on callback; non-OAuth → `CUSTOM_TOKEN_DIALOG`, then {@link createCustomIntegration}. `providerId` selects the registry entry stored on the Integration.
   */
  createIntegration: (input: {
    db: Database.Database;
    spaceId: Key.SpaceId;
    providerId: string;
    /** Optional first target ref when starting from an existing surface (e.g. mailbox/calendar); forwarded to `onTokenCreated` and sync-target UI. */
    existingTarget?: Ref.Ref<Obj.Unknown>;
  }) => Effect.Effect<CreateIntegrationResult, Error>;
  /** Persist manual token + Integration after `CUSTOM_TOKEN_DIALOG`; same finalize path as OAuth (`AccessTokenCreated`, navigation). */
  createCustomIntegration: (input: {
    db: Database.Database;
    providerId: string;
    source: string;
    account?: string;
    token: string;
    name?: string;
  }) => Effect.Effect<CreateCustomIntegrationResult, Error>;
};

export const IntegrationCoordinator = Capability.make<IntegrationCoordinator>(
  `${meta.id}.capability.integration-coordinator`,
);
