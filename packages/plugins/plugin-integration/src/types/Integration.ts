//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { Format, FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { AccessToken } from '@dxos/types';

/**
 * One target of an Integration: a remote item the user has chosen to sync.
 *
 * The selection-time identifier is `remoteId` (the foreign id from the remote
 * service — Trello board id, Google calendar id, …). The local placeholder
 * object (`object`) is populated lazily by the provider's `sync` op on first
 * run — discovery (`getSyncTargets`) is read-only and doesn't write any
 * objects to the space. Providers that auto-create their target at OAuth
 * time (e.g. Gmail's single Mailbox) set `object` directly and may omit
 * `remoteId`.
 */
const IntegrationTarget = Schema.Struct({
  /**
   * Local placeholder object. Set either at OAuth time (single-target
   * providers) or lazily on first sync. Undefined while a target is selected
   * but not yet materialized.
   */
  object: Ref.Ref(Obj.Unknown).pipe(Schema.optional),
  /**
   * Foreign id from the remote service (e.g. Trello board id). Identifies
   * the target before any local object exists; sync uses it to materialize
   * the placeholder.
   */
  remoteId: Schema.String.pipe(Schema.optional),
  /** Cached display name for the target — used by the article UI before first sync. */
  name: Schema.String.pipe(Schema.optional),
  /** Opaque, service-defined cursor for this target (e.g. a last-modified timestamp). */
  cursor: Schema.String.pipe(Schema.optional),
  /** Observed status: ISO timestamp of the most recent successful sync. */
  lastSyncAt: Format.DateTime.pipe(Schema.optional),
  /** Observed status: error message from the most recent failed sync, if any. */
  lastError: Schema.String.pipe(Schema.optional),
  /**
   * Per-target options interpreted by the contributing `IntegrationProvider`
   * (e.g. Gmail uses `{ syncBackDays?, filter? }`, Calendar adds
   * `syncForwardDays`). Plugin-integration treats this as opaque; each
   * provider documents and validates its own shape.
   */
  options: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(
    FormInputAnnotation.set(false),
    Schema.optional,
  ),
}).pipe(FormInputAnnotation.set(false));

export type IntegrationTarget = Schema.Schema.Type<typeof IntegrationTarget>;

/**
 * Generic representation of an external-service integration.
 *
 * Pairs an {@link AccessToken} with a list of root local objects that are populated
 * (and bidirectionally synced) from the external service.
 *
 * The schema is service-agnostic. Routing to the right `IntegrationProvider`
 * goes via `providerId` (set at create time) — `accessToken.source` alone
 * isn't sufficient because multiple providers can share the same OAuth
 * source (e.g. Gmail and Google Calendar both `'google.com'`).
 *
 * Scheduling/recurrence is deliberately not modeled here — DXOS Triggers own
 * recurring execution and can reference the service-specific sync operation
 * directly.
 */
export const Integration = Schema.Struct({
  /** User-friendly label distinct from account/source — e.g. "Work Trello". */
  name: Schema.String.pipe(Schema.optional),
  /**
   * Stable id of the `IntegrationProvider` capability entry that created
   * this Integration. Used to look up the provider's sync ops, OAuth spec,
   * and `onTokenCreated` hook on subsequent operations. Optional only for
   * forward compatibility with pre-providerId Integrations.
   */
  providerId: Schema.String.pipe(Schema.optional),
  accessToken: Ref.Ref(AccessToken.AccessToken),
  /** Root local objects this Integration populates. */
  targets: Schema.Array(IntegrationTarget),
  /**
   * Per-item snapshots of last-pulled remote state, keyed by `foreignId`
   * (the remote identifier, also stored in each item's `Obj.Meta.keys`).
   * The inner record is a service-defined map of fields — for Trello a card
   * snapshot stores `{ name, description, listName, url, closed }`; a board
   * snapshot stores `{ name, columns: { [listName]: { ids } } }`. Trello's
   * id namespace is unified, so a single flat map covers both granularities.
   *
   * Used to drive a three-way merge on pull: comparing `(local, remote, snapshot)`
   * per field lets us distinguish "user changed this locally" from "remote
   * changed this since the last sync" without writing the snapshot to the
   * SDK layer. On both-changed conflicts the policy is remote-wins.
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
