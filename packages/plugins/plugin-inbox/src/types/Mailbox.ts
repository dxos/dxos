//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Feed, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { AccessToken } from '@dxos/types';

import { meta } from '../meta';

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

/** Feed kind identifier for mailbox feeds. */
export const kind = `${meta.id}/mailbox`;

/** Checks if a value is a mailbox feed. */
export const instanceOf = (value: unknown): value is Feed.Feed =>
  Obj.instanceOf(Type.Feed, value) && value.kind === kind;

/** Creates a mailbox feed. */
export const make = (props?: Omit<Obj.MakeProps<typeof Type.Feed>, 'kind'>): Feed.Feed => Feed.make({ kind, ...props });

/** Configuration schema for a mailbox feed. */
export const Config = Schema.Struct({
  feed: Type.Ref(Type.Feed),
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
    typename: 'dxos.org/type/MailboxConfig',
    version: '0.1.0',
  }),
);

export interface Config extends Schema.Schema.Type<typeof Config> {}

export const CreateMailboxSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  accessToken: Schema.optional(
    Type.Ref(AccessToken.AccessToken).annotations({
      title: 'Account',
      description: 'Google account credentials for syncing this mailbox.',
    }),
  ),
});

type ConfigProps = Omit<Obj.MakeProps<typeof Config>, 'filters'> & {
  filters?: { name: string; filter: string }[];
};

/** Creates a mailbox config object linked to a feed. */
export const makeConfig = (props: ConfigProps) =>
  Obj.make(Config, {
    labels: {},
    filters: [],
    ...props,
  });
