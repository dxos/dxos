//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Queue } from '@dxos/client/echo';
import { Type } from '@dxos/echo';

export const AIChatType = Schema.Struct({
  id: Type.ObjectId,
  name: Schema.optional(Schema.String),
  queue: Type.Ref(Queue),
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
    target: Type.Expando,
  }),
);
export interface CompanionTo extends Schema.Schema.Type<typeof CompanionTo> {}
