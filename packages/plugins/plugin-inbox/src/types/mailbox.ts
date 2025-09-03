//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Queue } from '@dxos/client/echo';
import { type DXN, Obj, Ref, Type } from '@dxos/echo';

export enum MessageState {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

export const Mailbox = Schema.Struct({
  name: Schema.optional(Schema.String),
  queue: Type.Ref(Queue),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Mailbox',
    version: '0.1.0',
  }),
);
export type Mailbox = Schema.Schema.Type<typeof Mailbox>;

type MailboxProps = Omit<Obj.MakeProps<typeof Mailbox>, 'queue'> & {
  queue: DXN;
};

/**
 * Make a mailbox object.
 */
export const make = (props: MailboxProps) => {
  const queue = Ref.fromDXN(props.queue);
  return Obj.make(Mailbox, { ...props, queue });
};
