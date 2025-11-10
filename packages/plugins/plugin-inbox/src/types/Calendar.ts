//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Space } from '@dxos/client/echo';
import { Obj, Ref, Type } from '@dxos/echo';
import { FormAnnotation } from '@dxos/echo/internal';
import { Queue } from '@dxos/echo-db';
import { ItemAnnotation } from '@dxos/schema';

export const Calendar = Schema.Struct({
  name: Schema.optional(Schema.String),
  queue: Type.Ref(Queue).pipe(FormAnnotation.set(false)),
  // Track the last synced update timestamp to handle out-of-order event updates.
  lastSyncedUpdate: Schema.String.pipe(Schema.optional, FormAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Calendar',
    version: '0.1.0',
  }),
  ItemAnnotation.set(true),
);

export type Calendar = Schema.Schema.Type<typeof Calendar>;

type CalendarProps = Omit<Obj.MakeProps<typeof Calendar>, 'queue'> & {
  space: Space;
};

export const make = ({ space, ...props }: CalendarProps) => {
  const queue = space.queues.create();
  return Obj.make(Calendar, {
    queue: Ref.fromDXN(queue.dxn),
    ...props,
  });
};
