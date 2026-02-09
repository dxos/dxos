//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Space } from '@dxos/client/echo';
import { Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { Queue } from '@dxos/echo-db';
import { QueueAnnotation } from '@dxos/schema';
import { AccessToken } from '@dxos/types';

export const Calendar = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  queue: Type.Ref(Queue).pipe(FormInputAnnotation.set(false)),
  // Track the last synced update timestamp to handle out-of-order event updates.
  lastSyncedUpdate: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
  accessToken: Schema.optional(
    Type.Ref(AccessToken.AccessToken).annotations({
      title: 'Account',
      description: 'Google account credentials for syncing this calendar.',
    }),
  ),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/Calendar',
    version: '0.1.0',
  }),
  QueueAnnotation.set(true),
);

export interface Calendar extends Schema.Schema.Type<typeof Calendar> {}

export const CreateCalendarSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  accessToken: Schema.optional(
    Type.Ref(AccessToken.AccessToken).annotations({
      title: 'Account',
      description: 'Google account credentials for syncing this calendar.',
    }),
  ),
});

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
