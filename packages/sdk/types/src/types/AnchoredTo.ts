//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Relation, Type } from '@dxos/echo';
import { Expando } from '@dxos/schema';

export const AnchoredTo = Schema.Struct({
  id: Obj.ID,
  anchor: Schema.optional(Schema.String),
}).pipe(
  Type.relation({
    typename: 'dxos.org/relation/AnchoredTo',
    version: '0.1.0',
    source: Expando.Expando, // TODO(burdon): Type.Obj.Any.
    target: Expando.Expando, // TODO(burdon): Type.Obj.Any.
  }),
);

export interface AnchoredTo extends Schema.Schema.Type<typeof AnchoredTo> {}

export const make = (props: Relation.MakeProps<typeof AnchoredTo>) => Relation.make(AnchoredTo, props);
