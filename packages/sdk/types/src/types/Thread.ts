//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { SystemTypeAnnotation } from '@dxos/echo/internal';

import * as Message from './Message';

export const ThreadStatus = Schema.Union(
  Schema.Literal('staged'),
  Schema.Literal('active'),
  Schema.Literal('resolved'),
);

export const Thread = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  status: ThreadStatus.pipe(Schema.optional),
  messages: Schema.Array(Ref.Ref(Message.Message)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.thread',
    version: '0.1.0',
  }),
  // TODO(wittjosiah): Remove.
  SystemTypeAnnotation.set(true),
);

export interface Thread extends Schema.Schema.Type<typeof Thread> {}

export const make = ({
  status = 'staged',
  messages = [],
  ...props
}: Partial<Obj.MakeProps<typeof Thread>> = {}): Thread => Obj.make(Thread, { status, messages, ...props });
