//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

<<<<<<< HEAD
import { type DXN, Obj, Ref, type Tag, Type } from '@dxos/echo';
||||||| 94b6a73268
import { type DXN, Obj, Ref, Type } from '@dxos/echo';
=======
import { type Space } from '@dxos/client/echo';
import { Obj, Ref, Type } from '@dxos/echo';
>>>>>>> origin/main
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
<<<<<<< HEAD
  // Tags mapped from labels.
  // TODO(burdon): Reconcile with Space tags.
  tags: Schema.mutable(Schema.Record({ key: Schema.String, value: Tag })),
||||||| 94b6a73268
=======
  // TODO(wittjosiah): Factor out to relation?
  savedFilters: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      filter: Schema.String,
    }),
  ),
>>>>>>> origin/main
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Mailbox',
    version: '0.1.0',
  }),
  ItemAnnotation.set(true),
);
export type Mailbox = Schema.Schema.Type<typeof Mailbox>;

<<<<<<< HEAD
type MailboxProps = Omit<Obj.MakeProps<typeof Mailbox>, 'queue' | 'tags'> & {
  queue: DXN;
  tags?: Record<string, Tag>;
||||||| 94b6a73268
type MailboxProps = Omit<Obj.MakeProps<typeof Mailbox>, 'queue'> & {
  queue: DXN;
=======
type MailboxProps = Omit<Obj.MakeProps<typeof Mailbox>, 'queue' | 'savedFilters'> & {
  space: Space;
  savedFilters?: { name: string; filter: string }[];
>>>>>>> origin/main
};

/**
 * Make a mailbox object.
 */
<<<<<<< HEAD
export const make = (props: MailboxProps) => {
  const queue = Ref.fromDXN(props.queue);
  return Obj.make(Mailbox, { tags: {}, ...props, queue });
||||||| 94b6a73268
export const make = (props: MailboxProps) => {
  const queue = Ref.fromDXN(props.queue);
  return Obj.make(Mailbox, { ...props, queue });
=======
export const make = ({ space, ...props }: MailboxProps) => {
  const queue = space.queues.create();
  return Obj.make(Mailbox, {
    queue: Ref.fromDXN(queue.dxn),
    savedFilters: [],
    ...props,
  });
>>>>>>> origin/main
};
