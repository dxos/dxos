//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import type { Database, Key, Obj, Ref } from '@dxos/echo';

import { meta } from '#meta';

/**
 * Long-lived coordinator for integration creation + OAuth flows.
 *
 * Owns the `window.message` listener that catches OAuth callbacks (because
 * `useOAuth` was tied to a React component lifetime, the listener died as
 * soon as the user navigated away — including immediately after closing the
 * "create integration" dialog). This capability is mounted at plugin
 * activation and torn down at deactivation, so OAuth callbacks always have
 * somewhere to land regardless of which UI is currently visible.
 *
 * `createIntegration` is the full lifecycle:
 *  1. Build `AccessToken` + `Integration` stubs in memory (NOT yet in the db).
 *  2. Open the OAuth popup; return.
 *  3. When the OAuth callback fires, persist both objects to the db, reparent
 *     the token under the Integration, run the provider's `onTokenCreated`,
 *     and navigate the user to the new Integration's article.
 *
 * Nothing lands in the database until OAuth succeeds — closing the popup or
 * a network failure leaves no stranded objects.
 */
export type IntegrationCoordinator = {
  /**
   * Entry point for the create-Integration flow. Branches on whether the
   * provider has an OAuth spec:
   *
   *  - **OAuth providers**: builds in-memory `AccessToken` + `Integration`
   *    stubs, stashes them, and opens the OAuth popup. The stubs are
   *    persisted only after the OAuth callback fires successfully.
   *  - **Non-OAuth providers** (e.g. the built-in `custom` token): opens
   *    the `CUSTOM_TOKEN_DIALOG` and returns immediately. The dialog
   *    collects `{ source, account?, token }` from the user and finishes
   *    the flow via {@link createCustomIntegration}.
   *
   * `providerId` selects an entry from the `IntegrationProvider` capability
   * registry. The resulting Integration records `providerId` so subsequent
   * operations (sync, onTokenCreated, etc.) route back to the same provider.
   */
  createIntegration: (input: {
    db: Database.Database;
    spaceId: Key.SpaceId;
    providerId: string;
    /**
     * Existing local object to wire up as the Integration's first target.
     * Set when the auth flow is initiated from a surface that already has
     * the target in scope (e.g. an `InitializeMailbox` button on an existing
     * Mailbox, or a `NewCalendar` button on an existing Calendar). Threaded
     * through to the provider's `onTokenCreated` and to the sync-targets
     * dialog so providers can attach the existing object instead of
     * materializing a fresh one.
     */
    existingTarget?: Ref.Ref<Obj.Unknown>;
  }) => Effect.Effect<{ integrationId: string }, Error>;
  /**
   * Persist a manually-entered access token + Integration. Used by the
   * `CUSTOM_TOKEN_DIALOG` after the user submits — there's no OAuth callback
   * to wait on, so values are written directly. Runs the same finalization
   * path as the OAuth flow (`AccessTokenCreated` dispatch, navigation).
   */
  createCustomIntegration: (input: {
    db: Database.Database;
    providerId: string;
    source: string;
    account?: string;
    token: string;
    name?: string;
  }) => Effect.Effect<{ integrationId: string }, Error>;
};

export const IntegrationCoordinator = Capability.make<IntegrationCoordinator>(
  `${meta.id}.capability.integration-coordinator`,
);
