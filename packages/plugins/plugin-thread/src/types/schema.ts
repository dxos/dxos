//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { DataType } from '@dxos/schema';

export const ThreadStatus = Schema.Union(
  Schema.Literal('staged'),
  Schema.Literal('active'),
  Schema.Literal('resolved'),
);

export const ThreadType = Schema.Struct({
  name: Schema.optional(Schema.String),
  status: Schema.optional(ThreadStatus),
  messages: Schema.mutable(Schema.Array(Type.Ref(DataType.Message))),
}).pipe(Type.Obj({ typename: 'dxos.org/type/Thread', version: '0.1.0' }));
export type ThreadType = Schema.Schema.Type<typeof ThreadType>;

export const ChannelType = Schema.Struct({
  name: Schema.optional(Schema.String),
  defaultThread: Type.Ref(ThreadType),
  // TODO(wittjosiah): Should be an "ordered collection".
  threads: Schema.mutable(Schema.Array(Type.Ref(ThreadType))),
}).pipe(Type.Obj({ typename: 'dxos.org/type/Channel', version: '0.1.0' }));
export type ChannelType = Schema.Schema.Type<typeof ChannelType>;
