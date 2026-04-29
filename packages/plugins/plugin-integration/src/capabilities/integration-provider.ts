//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type Obj, type Ref } from '@dxos/echo';

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
 * One entry per supported service. Service plugins contribute via
 * `Capability.contributes(IntegrationProvider, [...])`. plugin-integration
 * looks up the entry whose `source` matches an Integration's
 * `accessToken.target.source` and dispatches to its operations.
 *
 * The provider exposes only two service-specific operations. Selection
 * mechanics (diffing the user's chosen targets against `integration.targets`)
 * are owned by plugin-integration and identical across services.
 */
export type IntegrationProvider = {
  /** Matches `AccessToken.source` (e.g. `'trello.com'`). */
  source: string;
  /**
   * Operation key for discovery + idempotent materialization.
   * `(input: { integrationId: Obj.ID }) => { targets: RemoteTarget[] }`.
   */
  getSyncTargets: string;
  /**
   * Operation key for bidirectional reconcile of currently-selected targets.
   * `(input: { integrationId: Obj.ID; targetId?: Obj.ID }) => { ... }`.
   */
  sync: string;
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
