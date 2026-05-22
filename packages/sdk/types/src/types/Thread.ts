//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Ref, Type } from '@dxos/echo';
import { SystemTypeAnnotation } from '@dxos/echo/internal';

import * as Message from './Message';

export const ThreadStatus = Schema.Union(
  Schema.Literal('staged'),
  Schema.Literal('active'),
  Schema.Literal('resolved'),
);

/**
 * ECHO-backed message thread.
 */
export const Thread = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  status: ThreadStatus.pipe(Schema.optional),
  messages: Schema.Array(Ref.Ref(Message.Message)),
}).pipe(Type.object(DXN.fromNsidAndVersion('org.dxos.type.thread', '0.1.0')), SystemTypeAnnotation.set(true));

export interface Thread extends Schema.Schema.Type<typeof Thread> {}

export const make = ({
  status = 'staged',
  messages = [],
  ...props
}: Partial<Obj.MakeProps<typeof Thread>> = {}): Thread => Obj.make(Thread, { status, messages, ...props });
