//
// Copyright 2026 DXOS.org
//

import type * as HttpClient from '@effect/platform/HttpClient';
import type * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { type Obj, type Ref } from '@dxos/echo';
import { type Operation } from '@dxos/operation';
import { type AccessToken } from '@dxos/types';

/**
 * Descriptor for one remote target available from a service.
 *
 * Returned by an `IntegrationProvider`'s `getSyncTargets` operation. The
 * `object` ref points to a local find-or-created placeholder that this
 * provider has materialized (idempotently keyed by foreign id) — picking
 * which targets to keep is a separate, generic step in plugin-integration.
 */
export type RemoteTarget = {
  /** Remote identifier (e.g. Trello board id). */
  id: string;
  /** User-readable label. */
  name: string;
  /** Optional secondary line. */
  description?: string;
  /** Ref to the find-or-created local placeholder object. */
  object: Ref.Ref<Obj.Unknown>;
  /** Service-specific extras for display. */
  metadata?: Record<string, unknown>;
};

/**
 * Hook fired by plugin-integration after a matching AccessToken is created
 * (manual entry or OAuth callback). Implementations typically populate
 * service-specific fields on the token (e.g. `account` from `/members/me`).
 *
 * The hook receives the *persisted* token and can mutate it via `Obj.change`.
 * Errors are caught and logged by plugin-integration so a hook failure can't
 * strand the token in the Custom tokens section — the wrapping Integration
 * is auto-created BEFORE this hook runs.
 *
 * The hook may use `HttpClient` (provided by plugin-integration via
 * `FetchHttpClient.layer`); other Effect requirements aren't supported.
 */
export type OnTokenCreated = (
  accessToken: AccessToken.AccessToken,
) => Effect.Effect<void, Error, HttpClient.HttpClient>;

/**
 * One entry per supported service. Service plugins contribute via
 * `Capability.contributes(IntegrationProvider, [...])`. plugin-integration
 * looks up the entry whose `source` matches an Integration's
 * `accessToken.target.source` and dispatches to its operations and hooks.
 *
 * Sync operations are optional: a "shell" provider that only registers
 * `source` (and optionally `onTokenCreated`) is valid. It signals "this
 * OAuth provider exists but we don't have sync support yet" — the OAuth
 * preset shows in the menu, the token wraps in an Integration, but
 * "Change sync targets" is unavailable.
 */
export type IntegrationProvider = {
  /** Matches `AccessToken.source` (e.g. `'trello.com'`). */
  source: string;
  /**
   * Operation definition for discovery + idempotent materialization.
   * Signature: `(input: { integration: Ref<Integration> }) => { targets: RemoteTarget[] }`.
   * When omitted, "Change sync targets" is unavailable.
   *
   * Stored as the full `Operation.Definition` (not just the key) because
   * `OperationInvoker.invokePromise` requires the definition to dispatch.
   */
  getSyncTargets?: Operation.Definition.Any;
  /**
   * Operation definition for bidirectional reconcile of currently-selected targets.
   * Signature: `(input: { integration: Ref<Integration>; targetId?: Ref<Obj.Unknown> }) => { ... }`.
   * When omitted, "Sync now" is unavailable.
   */
  sync?: Operation.Definition.Any;
  /**
   * Optional service-specific token-created hook. See {@link OnTokenCreated}.
   */
  onTokenCreated?: OnTokenCreated;
};

/**
 * Capability registry of integration providers contributed by service plugins.
 */
export const IntegrationProvider = Capability.make<IntegrationProvider[]>(
  'org.dxos.plugin.integration.capability.integration-provider',
);

import { useCapabilities } from '@dxos/app-framework/ui';

/**
 * Resolve the contributed `IntegrationProvider` whose `source` matches.
 * Returns `undefined` if no service plugin handles this source.
 */
export const useIntegrationProvider = (source: string | undefined): IntegrationProvider | undefined => {
  const providers = useCapabilities(IntegrationProvider).flat();
  return source ? providers.find((p) => p.source === source) : undefined;
};
