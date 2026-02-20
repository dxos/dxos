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

/**
 * YouTubeChannel schema representing a YouTube channel to sync videos from.
 */
export const YouTubeChannel = Schema.Struct({
  /** Display name for the channel. */
  name: Schema.optional(Schema.String),
  /** YouTube channel ID (e.g., UC...). */
  channelId: Schema.optional(Schema.String),
  /** YouTube channel URL or handle. */
  channelUrl: Schema.optional(Schema.String),
  /** Queue containing YouTubeVideo objects. */
  queue: Type.Ref(Queue).pipe(FormInputAnnotation.set(false)),
  /** Last sync timestamp. */
  lastSyncedAt: Schema.optional(Schema.String).pipe(FormInputAnnotation.set(false)),
  /** Google API credentials for fetching channel data. */
  accessToken: Schema.optional(
    Type.Ref(AccessToken.AccessToken).annotations({
      title: 'Account',
      description: 'Google account credentials for syncing this YouTube channel.',
    }),
  ),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/YouTubeChannel',
    version: '0.1.0',
  }),
  QueueAnnotation.set(true),
);

export interface YouTubeChannel extends Schema.Schema.Type<typeof YouTubeChannel> {}

export const CreateYouTubeChannelSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  channelUrl: Schema.optional(
    Schema.String.annotations({
      title: 'Channel URL',
      description: 'YouTube channel URL, handle (e.g., @channelname), or channel ID.',
    }),
  ),
  accessToken: Schema.optional(
    Type.Ref(AccessToken.AccessToken).annotations({
      title: 'Account',
      description: 'Google account credentials for syncing this YouTube channel.',
    }),
  ),
});

type YouTubeChannelProps = Omit<Obj.MakeProps<typeof YouTubeChannel>, 'queue' | 'lastSyncedAt'> & {
  space: Space;
};

export const make = ({ space, ...props }: YouTubeChannelProps) => {
  const queue = space.queues.create();
  return Obj.make(YouTubeChannel, {
    queue: Ref.fromDXN(queue.dxn),
    ...props,
  });
};
