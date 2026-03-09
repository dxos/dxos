//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { FeedAnnotation } from '@dxos/schema';
import { AccessToken } from '@dxos/types';

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

/** Mailbox object schema. */
export const Mailbox = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  feed: Type.Ref(Type.Feed).pipe(FormInputAnnotation.set(false)),
  labels: Labels.pipe(FormInputAnnotation.set(false), Schema.optional),
  // TODO(wittjosiah): Factor out to relation?
  filters: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      filter: Schema.String,
    }),
  ).pipe(FormInputAnnotation.set(false)),
  accessToken: Schema.optional(
    Type.Ref(AccessToken.AccessToken).annotations({
      title: 'Account',
      description: 'Google account credentials for syncing this mailbox.',
    }),
  ),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/Mailbox',
    version: '0.2.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--tray--regular',
    hue: 'red',
  }),
  FeedAnnotation.set(true),
);

export interface Mailbox extends Schema.Schema.Type<typeof Mailbox> {}

/** Checks if a value is a Mailbox object. */
export const instanceOf = (value: unknown): value is Mailbox => Obj.instanceOf(Mailbox, value);

export const CreateMailboxSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  accessToken: Schema.optional(
    Type.Ref(AccessToken.AccessToken).annotations({
      title: 'Account',
      description: 'Google account credentials for syncing this mailbox.',
    }),
  ),
});

type MailboxProps = Omit<Obj.MakeProps<typeof Mailbox>, 'feed' | 'filters'> & {
  filters?: { name: string; filter: string }[];
};

/** Creates a mailbox object with a backing feed. */
export const make = (props: MailboxProps = {}) => {
  const feed = Feed.make();
  return Obj.make(Mailbox, {
    feed: Ref.make(feed),
    labels: {},
    filters: [],
    ...props,
  });
};
