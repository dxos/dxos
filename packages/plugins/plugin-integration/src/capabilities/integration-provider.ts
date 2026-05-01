//
// Copyright 2026 DXOS.org
//

import type * as HttpClient from '@effect/platform/HttpClient';
import type * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type Operation } from '@dxos/operation';
import { type OAuthProvider } from '@dxos/protocols';
import { type AccessToken } from '@dxos/types';

import { type Integration } from '../types';

/**
 * Descriptor for one remote target available from a service.
 *
 * Returned by an `IntegrationProvider`'s `getSyncTargets` operation —
 * read-only metadata about a remote item (board, calendar, …). Local objects
 * are NOT created during discovery; the provider's `sync` op materializes
 * them on first run for whichever targets the user selected in the checklist.
 */
export type RemoteTarget = {
  /** Remote identifier (e.g. Trello board id). */
  id: string;
  /** User-readable label. */
  name: string;
  /** Optional secondary line. */
  description?: string;
  /** Service-specific extras for display. */
  metadata?: Record<string, unknown>;
};

/**
 * Hook fired by plugin-integration after a matching AccessToken is created
 * (OAuth callback). Implementations typically populate service-specific
 * fields on the token (e.g. `account` from `/members/me`) and — for
 * single-target integrations like Gmail where there's no `getSyncTargets`
 * UI — create the default target object and attach it to the integration's
 * `targets` array.
 *
 * Both `accessToken` and `integration` are *persisted* objects; mutate via
 * `Obj.change`. Errors are caught and logged by plugin-integration so a
 * hook failure can't strand the integration that's already in the database.
 *
 * The hook may use `HttpClient` (provided by plugin-integration via
 * `FetchHttpClient.layer`); other Effect requirements aren't supported.
 */
export type OnTokenCreated = (input: {
  accessToken: AccessToken.AccessToken;
  integration: Integration.Integration;
}) => Effect.Effect<void, Error, HttpClient.HttpClient>;

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
/**
 * OAuth flow specification for a provider. The coordinator reads this to
 * open the OAuth popup; the AccessToken's `scopes` field is set from
 * `scopes` so we can later disambiguate which provider a token belongs to
 * even when multiple providers share the same `source` (e.g. Gmail and
 * Google Calendar both `source: 'google.com'` with different scopes).
 */
export type IntegrationOAuthSpec = {
  provider: OAuthProvider;
  scopes: readonly string[];
};

export type IntegrationProvider = {
  /**
   * Stable plugin-defined identifier for this provider entry. Unique across
   * all providers — the create-Integration form picks providers by this id,
   * and `Integration.providerId` records which provider an Integration
   * belongs to. Distinct from `source` so multiple providers can share the
   * same OAuth domain (Gmail/Calendar both use `source: 'google.com'`).
   */
  id: string;
  /** Matches `AccessToken.source` (e.g. `'trello.com'`, `'google.com'`). */
  source: string;
  /**
   * User-facing label shown in the integration source selector
   * (e.g. `'Trello'`, `'Linear'`). Defaults to `id` when omitted.
   */
  label?: string;
  /**
   * OAuth flow spec. When omitted, the provider has no OAuth flow — used
   * for non-OAuth integrations (e.g. manual API key entry, future).
   */
  oauth?: IntegrationOAuthSpec;
  /**
   * Operation definition for discovery — return descriptors for every remote
   * target reachable from the integration's access token. Implementations
   * MUST be read-only — no local objects are created here. Materialization
   * happens lazily in the provider's `sync` op on first run for any target
   * that hasn't been seen yet.
   *
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
   * Optional schema describing the per-target `options` shape this provider
   * understands (e.g. `SyncOptions` for Gmail, `CalendarSyncOptions` for
   * Calendar). When set, the IntegrationArticle renders an inline form on
   * each target row that edits `target.options`. When unset, `options` are
   * simply unused for this provider.
   */
  optionsSchema?: Schema.Schema<any, any>;
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
 * Resolve the contributed `IntegrationProvider` by stable `id`. Prefer this
 * over source-based lookup — multiple providers can share the same source
 * (Gmail and Google Calendar both `source: 'google.com'`).
 */
export const useIntegrationProviderById = (providerId: string | undefined): IntegrationProvider | undefined => {
  const providers = useCapabilities(IntegrationProvider).flat();
  return providerId ? providers.find((p) => p.id === providerId) : undefined;
};

/**
 * Legacy lookup by `source` — kept for callers that only have the access
 * token's `source` and no providerId context. Returns the *first* matching
 * provider, which is ambiguous when multiple providers share a source. New
 * call sites should use {@link useIntegrationProviderById} instead.
 */
export const useIntegrationProvider = (source: string | undefined): IntegrationProvider | undefined => {
  const providers = useCapabilities(IntegrationProvider).flat();
  return source ? providers.find((p) => p.source === source) : undefined;
};
