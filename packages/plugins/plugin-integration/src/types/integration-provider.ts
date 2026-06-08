//
// Copyright 2026 DXOS.org
//

import type * as HttpClient from '@effect/platform/HttpClient';
import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import type { Operation } from '@dxos/compute';
import { type Database, type Obj, Ref } from '@dxos/echo';
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
  /**
   * Use a top-level redirect flow instead of the default popup +
   * `postMessage`. Required for providers that nullify `window.opener`
   * (e.g. atproto / bsky.social). Edge redirects to `/redirect/oauth?...`
   * which a NavigationHandler picks up via persisted localStorage state.
   */
  useRedirectFlow?: boolean;
};

/**
 * Result of a provider credential form submission.
 *
 * `complete` — for non-OAuth flows: the form yields a fully built
 * `AccessToken` + `Integration` and the coordinator persists them.
 *
 * `oauth` — for OAuth flows that need pre-flight input (e.g. atproto
 * handle): the coordinator opens the auth window and forwards
 * `loginHint` to Edge.
 */
export type CredentialFormResult =
  | { kind: 'complete'; accessToken: AccessToken.AccessToken; integration: Integration.Integration }
  | { kind: 'oauth'; loginHint?: string };

/**
 * Per-provider form rendered by the generic provider-form dialog. One
 * shape covers both non-OAuth (custom token, IMAP) and OAuth pre-flight
 * (atproto handle) — the discriminator on `onSubmit`'s result tells the
 * coordinator which path to take next.
 */
export type CredentialForm<Values = any> = {
  /** Schema rendered by the generic provider-form dialog. */
  schema: Schema.Schema<Values, any>;
  /** Optional defaults pre-filled into the form. */
  defaultValues?: Partial<Values>;
  /**
   * Optional async pre-submit validation. Runs before the dialog closes so
   * errors are shown inline. The return value — e.g. a fetched user object —
   * is forwarded to `onSubmit` as `validated` to avoid a redundant API call.
   */
  onValidate?: (input: {
    values: Values;
    provider: IntegrationProviderEntry;
  }) => Effect.Effect<unknown, Error>;
  /** Build the next step of the integration flow from form values. */
  onSubmit: (input: {
    values: Values;
    provider: IntegrationProviderEntry;
    db: Database.Database;
    /** Present when `onValidate` was defined and succeeded; `undefined` otherwise. */
    validated?: unknown;
  }) => Effect.Effect<CredentialFormResult>;
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
  /**
   * Renders before authentication. Use for non-OAuth credentials (custom
   * token, IMAP host/port/user/password) or OAuth pre-flight inputs (atproto
   * handle / DID). The submit result decides what runs next — see
   * {@link CredentialFormResult}.
   */
  credentialForm?: CredentialForm<any>;
  onTokenCreated?: OnTokenCreated;
};

/**
 * Capability registry token for IntegrationProvider contributions (sync + OAuth wiring).
 */
export const IntegrationProvider = Capability.make<IntegrationProviderEntry[]>(
  'org.dxos.plugin.integration.capability.integration-provider',
);
