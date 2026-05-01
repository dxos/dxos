//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { Format, FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
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
 * External-service integration: {@link AccessToken} plus synced local roots (`targets`).
 * Routed by `providerId` (not `accessToken.source` alone—multiple providers may share a source).
 * Recurrence lives in Triggers, not on this type.
 */
export const Integration = Schema.Struct({
  /** Display name (e.g. "Work Trello"). */
  name: Schema.String.pipe(Schema.optional),
  /** Capability id for sync/OAuth/`onTokenCreated`; optional for legacy rows. */
  providerId: Schema.String.pipe(Schema.optional),
  /** Stored OAuth/API credential. */
  accessToken: Ref.Ref(AccessToken.AccessToken),
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
  Type.object({
    typename: 'org.dxos.type.integration',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--plugs-connected--regular',
    hue: 'cyan',
  }),
);

export interface Integration extends Schema.Schema.Type<typeof Integration> {}

export const instanceOf = (value: unknown): value is Integration => Obj.instanceOf(Integration, value);

export const make = (props: Obj.MakeProps<typeof Integration>) => Obj.make(Integration, props);
