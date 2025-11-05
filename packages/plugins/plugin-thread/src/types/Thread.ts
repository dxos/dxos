//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { DataType } from '@dxos/schema';

export const ThreadStatus = Schema.Union(
  Schema.Literal('staged'),
  Schema.Literal('active'),
  Schema.Literal('resolved'),
);

const _Thread = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  status: ThreadStatus.pipe(Schema.optional),
  messages: Schema.mutable(Schema.Array(Type.Ref(DataType.Message.Message))),
}).pipe(Type.Obj({ typename: 'dxos.org/type/Thread', version: '0.1.0' }));
export interface Thread extends Schema.Schema.Type<typeof _Thread> {}
export interface ThreadEncoded extends Schema.Schema.Encoded<typeof _Thread> {}
export const Thread: Schema.Schema<Thread, ThreadEncoded> = _Thread;

export const make = ({ status = 'staged', messages = [], ...props }: Partial<Obj.MakeProps<typeof Thread>> = {}) =>
  Obj.make(Thread, { status, messages, ...props });
