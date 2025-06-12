//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { Expando, Ref } from '@dxos/echo-schema';

export const AIChatType = Schema.Struct({
  id: Type.ObjectId,
  name: Schema.optional(Schema.String),
  // TODO(wittjosiah): Should be a ref to a Queue.
  queue: Ref(Expando),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/AIChat',
    version: '0.2.0',
  }),
);
export interface AIChatType extends Schema.Schema.Type<typeof AIChatType> {}

export const CompanionTo = Schema.Struct({
  id: Type.ObjectId,
}).pipe(
  Type.Relation({
    typename: 'dxos.org/relation/CompanionTo',
    version: '0.1.0',
    source: AIChatType,
    target: Expando,
  }),
);
export interface CompanionTo extends Schema.Schema.Type<typeof CompanionTo> {}
