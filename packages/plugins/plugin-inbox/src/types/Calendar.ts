//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { FeedAnnotation } from '@dxos/schema';
import { AccessToken } from '@dxos/types';

/** Calendar object schema. */
export const Calendar = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
  // Track the last synced update timestamp to handle out-of-order event updates.
  lastSyncedUpdate: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
  accessToken: Schema.optional(
    Ref.Ref(AccessToken.AccessToken).annotations({
      title: 'Account',
      description: 'Google account credentials for syncing this calendar.',
    }),
  ),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.calendar',
    version: '0.1.0',
  }),
  FeedAnnotation.set(true),
);

export interface Calendar extends Schema.Schema.Type<typeof Calendar> {}

/** Checks if a value is a Calendar object. */
export const instanceOf = (value: unknown): value is Calendar => Obj.instanceOf(Calendar, value);

export const CreateCalendarSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  accessToken: Schema.optional(
    Ref.Ref(AccessToken.AccessToken).annotations({
      title: 'Account',
      description: 'Google account credentials for syncing this calendar.',
    }),
  ),
});

type CalendarProps = Omit<Obj.MakeProps<typeof Calendar>, 'feed' | 'lastSyncedUpdate'>;

/** Creates a calendar object with a backing feed. */
export const make = (props: CalendarProps = {}) => {
  const feed = Feed.make();
  const calendar = Obj.make(Calendar, {
    feed: Ref.make(feed),
    ...props,
  });
  // TODO(wittjosiah): Parent should be declarative in the schema.
  Obj.setParent(feed, calendar);
  return calendar;
};
