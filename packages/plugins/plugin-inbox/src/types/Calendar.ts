//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Space } from '@dxos/client/echo';
import { Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { Queue } from '@dxos/echo-db';
import { QueueAnnotation } from '@dxos/schema';

export const Calendar = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  queue: Type.Ref(Queue).pipe(FormInputAnnotation.set(false)),
  // Track the last synced update timestamp to handle out-of-order event updates.
  lastSyncedUpdate: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Calendar',
    version: '0.1.0',
  }),
  QueueAnnotation.set(true),
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
