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

export const Calendar = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
<<<<<<< HEAD
  queue: Type.Ref(Queue).pipe(Annotation.FormAnnotation.set(false)),
||||||| 87517e966b
  queue: Type.Ref(Queue).pipe(FormAnnotation.set(false)),
=======
  queue: Type.Ref(Queue).pipe(FormInputAnnotation.set(false)),
>>>>>>> main
  // Track the last synced update timestamp to handle out-of-order event updates.
<<<<<<< HEAD
  lastSyncedUpdate: Schema.String.pipe(Annotation.FormAnnotation.set(false), Schema.optional),
||||||| 87517e966b
  lastSyncedUpdate: Schema.String.pipe(FormAnnotation.set(false), Schema.optional),
=======
  lastSyncedUpdate: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
>>>>>>> main
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Calendar',
    version: '0.1.0',
  }),
);

export interface Calendar extends Schema.Schema.Type<typeof Calendar> {}

type CalendarProps = Omit<Obj.MakeProps<typeof Calendar>, 'queue' | 'lastSyncedUpdate'> & {
  space: Space;
};

export const make = ({ space, ...props }: CalendarProps) => {
  const queue = space.queues.create();
  return Obj.make(Calendar, {
    queue: Ref.fromDXN(queue.dxn),
    ...props,
  });
};
