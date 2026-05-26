//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { BlueprintsAnnotation } from '@dxos/app-toolkit';
import { DXN, Annotation, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { FeedAnnotation } from '@dxos/schema';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.inbox';

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
  feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
  labels: Labels.pipe(FormInputAnnotation.set(false), Schema.optional),
  // TODO(wittjosiah): Factor out to relation?
  filters: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      filter: Schema.String,
    }),
  ).pipe(FormInputAnnotation.set(false)),
  extractors: Schema.Struct({
    enabled: Schema.Array(Schema.String),
    threshold: Schema.Number.pipe(Schema.between(0, 1)),
  }).pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Annotation.IconAnnotation.set({
    icon: 'ph--tray--regular',
    hue: 'rose',
  }),
  FeedAnnotation.set(true),
  BlueprintsAnnotation.set([BLUEPRINT_KEY]),
  Type.makeObject(DXN.make('org.dxos.type.mailbox', '0.1.0')),
);

export type Mailbox = Type.InstanceType<typeof Mailbox>;

/** Checks if a value is a Mailbox object. */
export const instanceOf = (value: unknown): value is Mailbox => Obj.instanceOf(Mailbox, value);

export const CreateMailboxSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
});

type MailboxProps = Omit<Obj.MakeProps<typeof Mailbox>, 'feed' | 'filters' | 'extractors'> & {
  filters?: { name: string; filter: string }[];
  extractors?: { enabled: string[]; threshold: number };
};

/** Creates a mailbox object with a backing feed. */
export const make = (props: MailboxProps = {}) => {
  const feed = Feed.make();
  const mailbox = Obj.make(Mailbox, {
    feed: Ref.make(feed),
    labels: {},
    filters: [],
    ...props,
  });

  // TODO(wittjosiah): Parent should be declarative in the schema.
  Obj.setParent(feed, mailbox);
  return mailbox;
};
