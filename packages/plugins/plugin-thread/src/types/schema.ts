//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import { DataType } from '@dxos/schema';

export const ThreadStatus = Schema.Union(
  Schema.Literal('staged'),
  Schema.Literal('active'),
  Schema.Literal('resolved'),
);

const _ThreadType = Schema.Struct({
  name: Schema.optional(Schema.String),
  status: Schema.optional(ThreadStatus),
  messages: Schema.mutable(Schema.Array(Type.Ref(DataType.Message))),
}).pipe(Type.Obj({ typename: 'dxos.org/type/Thread', version: '0.1.0' }));
export interface ThreadType extends Schema.Schema.Type<typeof _ThreadType> {}
export const ThreadType: Type.obj<Schema.Schema<ThreadType, Schema.Schema.Encoded<typeof _ThreadType>, never>> =
  _ThreadType;

const _ChannelType = Schema.Struct({
  name: Schema.optional(Schema.String),
  defaultThread: Type.Ref(ThreadType),
  // TODO(wittjosiah): Should be an "ordered collection".
  threads: Schema.mutable(Schema.Array(Type.Ref(ThreadType))),
}).pipe(Type.Obj({ typename: 'dxos.org/type/Channel', version: '0.1.0' }));
export interface ChannelType extends Schema.Schema.Type<typeof _ChannelType> {}
export const ChannelType: Type.obj<Schema.Schema<ChannelType, Schema.Schema.Encoded<typeof _ChannelType>, never>> =
  _ChannelType;
