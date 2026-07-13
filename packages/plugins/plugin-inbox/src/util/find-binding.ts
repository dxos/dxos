//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, type Obj, Query } from '@dxos/echo';
// Connection is referenced in the inferred type of findBindingForTarget (via SyncBinding's source
// relation); the import lets TypeScript name it in the emitted .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Connection, SyncBinding } from '@dxos/plugin-connector';

/**
 * Finds the {@link SyncBinding} whose local target is the given object (mailbox,
 * calendar, …). The binding's source is the {@link Connection} that authenticates
 * sync for that object; credentials and sync re-invocation flow from it.
 *
 * Uses ECHO's structural reverse-ref index (`targetOf`) rather than scanning —
 * the relation is keyed by its target endpoint.
 */
export const findBindingForTarget = (target: Obj.Unknown) =>
  Effect.gen(function* () {
    const bindings = yield* Database.query(Query.select(Filter.id(target.id)).targetOf(SyncBinding.SyncBinding)).run;
    return bindings[0];
  });
