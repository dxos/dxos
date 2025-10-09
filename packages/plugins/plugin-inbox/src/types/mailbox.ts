//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { type DXN, Obj, Ref, type Tag, Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';
import { ItemAnnotation } from '@dxos/schema';

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
  // Tags mapped from labels.
  // TODO(burdon): Reconcile with Space tags.
  tags: Schema.mutable(Schema.Record({ key: Schema.String, value: Tag })),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Mailbox',
    version: '0.1.0',
  }),
  ItemAnnotation.set(true),
);

export type Mailbox = Schema.Schema.Type<typeof Mailbox>;

type MailboxProps = Omit<Obj.MakeProps<typeof Mailbox>, 'queue' | 'tags'> & {
  queue: DXN;
  tags?: Record<string, Tag>;
};

/**
 * Make a mailbox object.
 */
export const make = (props: MailboxProps) => {
  const queue = Ref.fromDXN(props.queue);
  return Obj.make(Mailbox, { tags: {}, ...props, queue });
};
