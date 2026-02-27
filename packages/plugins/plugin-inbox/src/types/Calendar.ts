//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Feed, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { AccessToken } from '@dxos/types';

import { meta } from '../meta';

/** Feed kind identifier for calendar feeds. */
export const kind = `${meta.id}/calendar`;

/** Checks if a value is a calendar feed. */
export const instanceOf = (value: unknown): value is Feed.Feed =>
  Obj.instanceOf(Type.Feed, value) && value.kind === kind;

/** Creates a calendar feed. */
export const make = (props?: Omit<Obj.MakeProps<typeof Type.Feed>, 'kind'>): Feed.Feed => Feed.make({ kind, ...props });

/** Configuration schema for a calendar feed. */
export const Config = Schema.Struct({
  feed: Type.Ref(Type.Feed),
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
    typename: 'dxos.org/type/CalendarConfig',
    version: '0.1.0',
  }),
);

export interface Config extends Schema.Schema.Type<typeof Config> {}

export const CreateCalendarSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  accessToken: Schema.optional(
    Type.Ref(AccessToken.AccessToken).annotations({
      title: 'Account',
      description: 'Google account credentials for syncing this calendar.',
    }),
  ),
});

/** Creates a calendar config object linked to a feed. */
export const makeConfig = (props: Obj.MakeProps<typeof Config>) => Obj.make(Config, props);
