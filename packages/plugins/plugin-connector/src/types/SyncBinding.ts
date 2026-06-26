//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Relation, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/Format';

import * as Connection from './Connection';

/**
 * One synced thing. Source = the {@link Connection} that authenticates the sync;
 * target = the local root object it syncs into (Mailbox, Kanban, Project, …).
 * Carries the per-binding sync state (cursor, timestamps, error) and the
 * last-seen remote snapshots used for three-way merge.
 *
 * Both endpoints must exist before the relation is created, so the local target
 * object is materialized when the binding is created (eager), not lazily on
 * first sync.
 */
export class SyncBinding extends Type.makeRelation<SyncBinding>(DXN.make('org.dxos.type.syncBinding', '0.1.0'))(
  {
    source: Connection.Connection,
    target: Obj.Unknown,
  },
)(
  Schema.Struct({
    id: Obj.ID,
    /** Remote foreign id (board id, calendar id, channel id, …). */
    remoteId: Schema.String.pipe(Schema.optional),
    /** Cached display label for the remote target. */
    name: Schema.String.pipe(Schema.optional),
    /** Provider-defined sync cursor (opaque). */
    cursor: Schema.String.pipe(Schema.optional),
    /** Last successful sync (ISO). */
    lastSyncAt: Format.DateTime.pipe(Schema.optional),
    /** Last sync failure message. */
    lastError: Schema.String.pipe(Schema.optional),
    /**
     * Last-seen remote fields keyed by foreign id (matches `Obj.Meta.keys`).
     * Shape is provider-defined; drives pull merge `(local, remote, snapshot)` — remote wins on conflict.
     */
    snapshots: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.optional),
    /** Provider-specific options; opaque here — providers validate their shape. */
    options: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.optional),
  }),
) {}

export const instanceOf = (value: unknown): value is SyncBinding => Relation.instanceOf(SyncBinding, value);

/** Creates a `SyncBinding` relation linking a {@link Connection} to its synced local root. */
export const make = (props: Relation.MakeProps<typeof SyncBinding>) => Relation.make(SyncBinding, props);
