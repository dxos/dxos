//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Relation, Type } from '@dxos/echo';

export const AnchoredTo = Schema.Struct({
  id: Obj.ID,
  anchor: Schema.optional(Schema.String),
  /** Branch the anchored thread pertains to (a branch-review comment); undefined = main/unbranched. */
  branch: Schema.String.pipe(Schema.optional),
}).pipe(
  Type.makeRelation({
    dxn: DXN.make('org.dxos.relation.anchoredTo', '0.1.0'),
    source: Obj.Unknown,
    target: Obj.Unknown,
  }),
);

export type AnchoredTo = Type.InstanceType<typeof AnchoredTo>;
export const make = (props: Relation.MakeProps<typeof AnchoredTo>) => Relation.make(AnchoredTo, props);
