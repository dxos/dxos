//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Obj, Relation, Type } from '@dxos/echo';

export const AnchoredTo = Schema.Struct({
  id: Obj.ID,
  anchor: Schema.optional(Schema.String),
}).pipe(
  Type.relation({
    typename: 'org.dxos.relation.anchored-to',
    version: '0.1.0',
    source: Obj.Unknown,
    target: Obj.Unknown,
  }),
);

export interface AnchoredTo extends Schema.Schema.Type<typeof AnchoredTo> {}

export const make = (props: Relation.MakeProps<typeof AnchoredTo>) => Relation.make(AnchoredTo, props);
