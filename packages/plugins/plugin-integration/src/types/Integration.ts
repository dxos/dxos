//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Format } from '@dxos/echo/Format';
import { AccessToken } from '@dxos/types';

/** One sync target: chosen remote item (`remoteId`) plus optional local root (`object`). */
const IntegrationTarget = Schema.Struct({
  /** Local root; set at OAuth for single-target flows or on first sync otherwise. */
  object: Ref.Ref(Obj.Unknown).pipe(Schema.optional),
  /** Remote foreign id before materialization (board id, calendar id, …). */
  remoteId: Schema.String.pipe(Schema.optional),
  /** Display label for UI before sync. */
  name: Schema.String.pipe(Schema.optional),
  /** Provider-defined sync cursor (opaque). */
  cursor: Schema.String.pipe(Schema.optional),
  /** Last successful sync (ISO). */
  lastSyncAt: Format.DateTime.pipe(Schema.optional),
  /** Last sync failure message. */
  lastError: Schema.String.pipe(Schema.optional),
  /** Provider-specific options; opaque here—providers validate their shape. */
  options: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(
    FormInputAnnotation.set(false),
    Schema.optional,
  ),
}).pipe(FormInputAnnotation.set(false));

export type IntegrationTarget = Schema.Schema.Type<typeof IntegrationTarget>;

/**
 * v0.1.0: single-credential shape. Retained as the source for the v0.1.0 → v0.2.0 migration.
 * Existing rows (Gmail, Bluesky, GitHub, Slack, Linear, Trello, custom-token) were created with this shape.
 */
export const IntegrationV1 = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  providerId: Schema.String.pipe(Schema.optional),
  accessToken: Ref.Ref(AccessToken.AccessToken),
  targets: Schema.Array(IntegrationTarget),
  snapshots: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(
    FormInputAnnotation.set(false),
    Schema.optional,
  ),
}).pipe(
  Type.makeObject(DXN.make('org.dxos.type.integration', '0.1.0')),
);

export type IntegrationV1 = Schema.Schema.Type<typeof IntegrationV1>;

/**
 * External-service integration: one or more {@link AccessToken}s plus synced local roots (`targets`).
 * Routed by `providerId` (not `accessToken.source` alone—multiple providers may share a source).
 * Recurrence lives in Triggers, not on this type.
 *
 * v0.2.0: `accessTokens` is an array to support providers needing multiple credentials
 * (e.g. IMAP + SMTP), disambiguated by `AccessToken.source` prefix. Single-credential
 * providers store a one-element array. See {@link primaryAccessToken}.
 */
export const Integration = Schema.Struct({
  /** Display name (e.g. "Work Trello"). */
  name: Schema.String.pipe(Schema.optional),
  /** Capability id for sync/OAuth/`onTokenCreated`; optional for legacy rows. */
  providerId: Schema.String.pipe(Schema.optional),
  /**
   * Stored OAuth/API credentials. Index 0 is the primary credential for the provider.
   * Additional entries are disambiguated by `AccessToken.source` prefix (e.g. `'imap:<host>'`, `'smtp:<host>'`).
   */
  accessTokens: Schema.Array(Ref.Ref(AccessToken.AccessToken)),
  /** Targets to sync (remote id ↔ local root per row). */
  targets: Schema.Array(IntegrationTarget),
  /**
   * Last-seen remote fields keyed by foreign id (matches `Obj.Meta.keys`).
   * Shape is provider-defined; drives pull merge `(local, remote, snapshot)` — remote wins on conflict.
   */
  snapshots: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(
    FormInputAnnotation.set(false),
    Schema.optional,
  ),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--plugs-connected--regular', hue: 'indigo' }),
  Type.makeObject(DXN.make('org.dxos.type.integration', '0.2.0')),
);

export type Integration = Type.InstanceType<typeof Integration>;

export const instanceOf = (value: unknown): value is Integration => Obj.instanceOf(Integration, value);

export const make = (props: Obj.MakeProps<typeof Integration>) => Obj.make(Integration, props);

/**
 * Returns the primary AccessToken ref (index 0). For single-credential providers this is the
 * only credential. For multi-credential providers it's the canonical/primary credential
 * (e.g. IMAP for mail integrations). Returns undefined if no tokens are present (defensive;
 * the schema requires at least one in practice).
 */
export const primaryAccessToken = (integration: Integration): Ref.Ref<AccessToken.AccessToken> | undefined =>
  integration.accessTokens[0];

/**
 * Finds the first AccessToken in `tokens` whose `source` starts with `sourcePrefix`.
 * Used by multi-credential providers (IMAP+SMTP) to disambiguate after loading all
 * referenced AccessTokens via `Database.load`.
 */
export const findAccessTokenBySource = (
  tokens: ReadonlyArray<AccessToken.AccessToken>,
  sourcePrefix: string,
): AccessToken.AccessToken | undefined => tokens.find((token) => token.source.startsWith(sourcePrefix));
