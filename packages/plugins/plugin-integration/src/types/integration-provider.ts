//
// Copyright 2026 DXOS.org
//

import type * as HttpClient from '@effect/platform/HttpClient';
import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import type { Operation } from '@dxos/compute';
import { type Obj, Ref } from '@dxos/echo';
import type { OAuthProvider } from '@dxos/protocols';
import type { AccessToken } from '@dxos/types';

import * as Integration from './Integration';

/** Descriptor for one remote target returned by discovery operations. */
export const RemoteTarget = Schema.Struct({
  /** Remote identifier (e.g. Trello board id). */
  id: Schema.String,
  /** User-readable label. */
  name: Schema.String,
  /** Optional secondary line. */
  description: Schema.String.pipe(Schema.optional),
  /** Service-specific extras for display. */
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }).pipe(Schema.optional),
});
export interface RemoteTarget extends Schema.Schema.Type<typeof RemoteTarget> {}

/** Input accepted by every {@link IntegrationProviderEntry.getSyncTargets} operation. */
export const GetSyncTargetsInput = Schema.Struct({
  integration: Ref.Ref(Integration.Integration),
});
export interface GetSyncTargetsInput extends Schema.Schema.Type<typeof GetSyncTargetsInput> {}

/** Output returned by {@link IntegrationProviderEntry.getSyncTargets} discovery operations. */
export const GetSyncTargetsOutput = Schema.Struct({
  targets: Schema.Array(RemoteTarget),
});
export interface GetSyncTargetsOutput extends Schema.Schema.Type<typeof GetSyncTargetsOutput> {}

/** Minimum input for provider {@link IntegrationProviderEntry.sync} operations. */
export type IntegrationSyncInput = {
  integration: Ref.Ref<Integration.Integration>;
};

/**
 * Result shape for provider sync operations (not consumed by integration UI yet).
 */
export type IntegrationSyncOutput = any;

/** Hook fired after OAuth creates an AccessToken for this integration. */
export type OnTokenCreated = (input: {
  accessToken: AccessToken.AccessToken;
  integration: Integration.Integration;
  /**
   * Pre-existing local object the caller wants to wire up as the
   * Integration's first target — set when the auth flow was initiated from
   * a surface that already has the target object in scope (e.g. an
   * `InitializeMailbox` button on an existing Mailbox). When omitted,
   * single-target providers (Gmail) create a fresh target object.
   */
  existingTarget?: Ref.Ref<Obj.Unknown>;
}) => Effect.Effect<void, never, HttpClient.HttpClient>;

/** OAuth spec for IntegrationProvider.oauth. */
export type IntegrationOAuthSpec = {
  provider: OAuthProvider;
  scopes: readonly string[];
};

/**
 * One IntegrationProvider capability row — shape of entries contributed via
 * {@link IntegrationProvider}.
 */
export type IntegrationProviderEntry = {
  id: string;
  /** Matches `AccessToken.source` (e.g. `'trello.com'`, `'google.com'`). */
  source: string;
  /** User-facing label; defaults to `id` when omitted. */
  label?: string;
  oauth?: IntegrationOAuthSpec;
  getSyncTargets?: Operation.Definition<GetSyncTargetsInput, GetSyncTargetsOutput>;
  sync?: Operation.Definition<IntegrationSyncInput, IntegrationSyncOutput>;
  /** Schema describing per-target rows in `Integration.targets` `.options`. */
  optionsSchema?: Schema.Schema<any, any>;
  onTokenCreated?: OnTokenCreated;
};

/**
 * Capability registry token for IntegrationProvider contributions (sync + OAuth wiring).
 */
export const IntegrationProvider = Capability.make<IntegrationProviderEntry[]>(
  'org.dxos.plugin.integration.capability.integration-provider',
);
