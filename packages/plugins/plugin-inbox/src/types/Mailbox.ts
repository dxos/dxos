//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Space } from '@dxos/client/echo';
<<<<<<< HEAD
import { Annotation, Obj, Ref, Type } from '@dxos/echo';
||||||| 87517e966b
import { Obj, Ref, Type } from '@dxos/echo';
import { FormAnnotation } from '@dxos/echo/internal';
=======
import { Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
>>>>>>> main
import { Queue } from '@dxos/echo-db';

// TODO(burdon): Implement as labels?
export enum MessageState {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

export const Labels = Schema.Record({
  key: Schema.String,
  value: Schema.String,
});

export type Labels = Schema.Schema.Type<typeof Labels>;

// TODO(burdon): Rename MessageBox? (not email specific).
export const Mailbox = Schema.Struct({
  name: Schema.optional(Schema.String),
<<<<<<< HEAD
  queue: Type.Ref(Queue).pipe(Annotation.FormAnnotation.set(false)),
  labels: Labels.pipe(Schema.mutable, Annotation.FormAnnotation.set(false), Schema.optional),
||||||| 87517e966b
  queue: Type.Ref(Queue).pipe(FormAnnotation.set(false)),
  labels: Labels.pipe(Schema.mutable, FormAnnotation.set(false), Schema.optional),
=======
  queue: Type.Ref(Queue).pipe(FormInputAnnotation.set(false)),
  labels: Labels.pipe(Schema.mutable, FormInputAnnotation.set(false), Schema.optional),
>>>>>>> main
  // TODO(wittjosiah): Factor out to relation?
  filters: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      filter: Schema.String,
    }),
<<<<<<< HEAD
  ).pipe(Annotation.FormAnnotation.set(false)),
||||||| 87517e966b
  ).pipe(FormAnnotation.set(false)),
=======
  ).pipe(FormInputAnnotation.set(false)),
>>>>>>> main
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
    labels: {},
    filters: [],
    ...props,
  });
};
