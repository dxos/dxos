//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Relation, Type } from '@dxos/echo';

/**
 * A draft's citation. Source = the draft message; target = the canonical document it relies on.
 */
export class Cites extends Type.makeRelation<Cites>(DXN.make('org.dxos.stories.support.relation.cites', '0.1.0'))({
  source: Obj.Unknown,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
    /** The section of the document relied on. */
    heading: Schema.String,
    /** The text relied on, as the draft quotes it. */
    quote: Schema.String,
  }),
) {}

/** Creates a `Cites` relation from a draft to the document it cites. */
export const make = (props: Relation.MakeProps<typeof Cites>) => Relation.make(Cites, props);
