//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { type DXN, Obj, Ref, Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';
import { ItemAnnotation } from '@dxos/schema';

import { Tag } from './tag';

// TODO(burdon): Implement as labels?
export enum MessageState {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

// TODO(burdon): Rename MessageBox? (not email specific).
export const Mailbox = Schema.Struct({
  name: Schema.optional(Schema.String),
  queue: Type.Ref(Queue),
  tags: Schema.optional(Schema.Record({ key: Schema.String, value: Tag })),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Mailbox',
    version: '0.1.0',
  }),
  ItemAnnotation.set(true),
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
