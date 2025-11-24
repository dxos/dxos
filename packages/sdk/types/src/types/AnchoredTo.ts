//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';

export const AnchoredTo = Schema.Struct({
  anchor: Schema.optional(Schema.String),
}).pipe(
  Type.Relation({
    typename: 'dxos.org/relation/AnchoredTo',
    version: '0.1.0',
    source: Type.Expando, // TODO(burdon): Type.Obj.Any.
    target: Type.Expando, // TODO(burdon): Type.Obj.Any.
  }),
);

export interface AnchoredTo extends Schema.Schema.Type<typeof AnchoredTo> {}

export const make = (props: Obj.MakeProps<typeof AnchoredTo>) => Obj.make(AnchoredTo, props);
