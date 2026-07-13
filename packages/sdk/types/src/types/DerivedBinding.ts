//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Feed, Obj, Ref, Relation, Type } from '@dxos/echo';

import * as Cursor from './Cursor';

/**
 * One derived feed-processing binding. Source = the local {@link Feed} a `SyncBinding` sync
 * populated; target = the local root object the derived output is written into. Unlike
 * `SyncBinding` (whose source is a remote `Connection`), `DerivedBinding` has no remote endpoint —
 * it tracks its own progress over the source feed via its own {@link Cursor}.
 */
export class DerivedBinding extends Type.makeRelation<DerivedBinding>(
  DXN.make('org.dxos.type.derivedBinding', '0.1.0'),
)({
  source: Feed.Feed,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
    /**
     * Durable progress cursor for this binding — the resume position (`value`) plus last-run
     * status (`lastRunAt`/`lastError`). Materialized as a child at creation, mirroring
     * `SyncBinding.cursor`.
     */
    cursor: Ref.Ref(Cursor.Cursor),
    /** Processor-specific options; opaque here — processors validate their shape. */
    options: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.optional),
  }),
) {}

export const instanceOf = (value: unknown): value is DerivedBinding => Relation.instanceOf(DerivedBinding, value);

/**
 * Creates a `DerivedBinding` relation linking a source {@link Feed} to its derived local root, with
 * a fresh {@link Cursor} materialized as a child (cascade-deleted with the binding). The cursor is
 * constructed here so callers never build one; pass `cursor` to initialize its fields (`value`,
 * `lastRunAt`, `lastError`) — e.g. to seed processing state.
 */
export const make = ({
  cursor: cursorProps,
  ...props
}: Omit<Relation.MakeProps<typeof DerivedBinding>, 'cursor'> & {
  cursor?: Obj.MakeProps<typeof Cursor.Cursor>;
}) => {
  const cursor = Cursor.make(cursorProps);
  const binding = Relation.make(DerivedBinding, { ...props, cursor: Ref.make(cursor) });
  // The cursor is owned by the binding: parenting cascade-deletes it with the binding, and persists it
  // transitively when the binding is added.
  Relation.setParent(cursor, binding);
  return binding;
};
