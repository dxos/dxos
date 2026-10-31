//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Relation, Type } from '@dxos/echo';

/**
 * Provenance relation. Source = the object that was made; target = the object it was made from (a migrated canvas
 * from its legacy canvas, a converted drawing's canvas from the canvas it converted). Copies made from one source in
 * parallel (by two peers) share its target, which is how they are found and reconciled.
 */
export class CreatedFrom extends Type.makeRelation<CreatedFrom>(DXN.make('org.dxos.relation.createdFrom', '0.1.0'))({
  source: Obj.Unknown,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
    /** Why it was made: `migration` and `conversion` are the ones in use; any other string is allowed. */
    reason: Schema.String,
    /** When it was made, as an ISO date. */
    createdAt: Schema.String,
  }),
) {}

/** Creates a `CreatedFrom` relation from the object made to the object it was made from. */
export const make = (props: Relation.MakeProps<typeof CreatedFrom>) => Relation.make(CreatedFrom, props);
