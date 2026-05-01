//
// Copyright 2026 DXOS.org
//

import type * as HttpClient from '@effect/platform/HttpClient';
import type * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import type { Obj, Ref } from '@dxos/echo';
import type { Operation } from '@dxos/operation';
import type { OAuthProvider } from '@dxos/protocols';
import type { AccessToken } from '@dxos/types';

import type * as Integration from './Integration';

/** Descriptor for one remote target returned by discovery operations. */
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
}) => Effect.Effect<void, Error, HttpClient.HttpClient>;

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
  getSyncTargets?: Operation.Definition.Any;
  sync?: Operation.Definition.Any;
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
