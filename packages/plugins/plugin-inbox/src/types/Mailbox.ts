//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Space } from '@dxos/client/echo';
import { Obj, Ref, Type } from '@dxos/echo';
import { FormAnnotation } from '@dxos/echo/internal';
import { Queue } from '@dxos/echo-db';

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
  queue: Type.Ref(Queue).pipe(FormAnnotation.set(false)),
  // TODO(wittjosiah): Factor out to relation?
  filters: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      filter: Schema.String,
    }),
  ).pipe(FormAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Mailbox',
    version: '0.1.0',
  }),
);

export type Mailbox = Schema.Schema.Type<typeof Mailbox>;

type MailboxProps = Omit<Obj.MakeProps<typeof Mailbox>, 'queue' | 'filters'> & {
  space: Space;
  filters?: { name: string; filter: string }[];
};

export const make = ({ space, ...props }: MailboxProps) => {
  const queue = space.queues.create();
  return Obj.make(Mailbox, {
    queue: Ref.fromDXN(queue.dxn),
    filters: [],
    ...props,
  });
};
