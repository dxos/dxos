//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { FeedAnnotation } from '@dxos/schema';
import { AccessToken } from '@dxos/types';

// @import-as-namespace

/** @deprecated Use YouTubeChannel instead. */
export const LegacyYouTubeChannel = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  channelId: Schema.String.pipe(Schema.optional),
  channelUrl: Schema.String.pipe(Schema.optional),
  feed: Ref.Ref(Feed.Feed),
  lastSyncedAt: Schema.String.pipe(Schema.optional),
  accessToken: Schema.optional(Ref.Ref(AccessToken.AccessToken)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.youtube-channel',
    version: '0.1.0',
  }),
);

export interface LegacyYouTubeChannel extends Schema.Schema.Type<typeof LegacyYouTubeChannel> {}

/**
 * YouTubeChannel schema representing a YouTube channel to sync videos from.
 */
export const YouTubeChannel = Schema.Struct({
  /** Display name for the channel. */
  name: Schema.String.pipe(Schema.optional),
  /** YouTube channel ID (e.g., UC...). */
  channelId: Schema.String.pipe(Schema.optional),
  /** YouTube channel URL or handle. */
  channelUrl: Schema.String.pipe(Schema.optional),
  /** Feed containing YouTubeVideo objects. */
  feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
  /** Last sync timestamp. */
  lastSyncedAt: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
  /** Google API credentials for fetching channel data. */
  accessToken: Schema.optional(
    Ref.Ref(AccessToken.AccessToken).annotations({
      title: 'Account',
      description: 'Google account credentials for syncing this YouTube channel.',
    }),
  ),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.youtubeChannel',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--youtube-logo--regular',
    hue: 'red',
  }),
  FeedAnnotation.set(true),
);

export interface YouTubeChannel extends Schema.Schema.Type<typeof YouTubeChannel> {}

/** Checks if a value is a YouTubeChannel object. */
export const instanceOf = (value: unknown): value is YouTubeChannel => Obj.instanceOf(YouTubeChannel, value);

export const CreateYouTubeChannelSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  channelUrl: Schema.optional(
    Schema.String.annotations({
      title: 'Channel URL',
      description: 'YouTube channel URL, handle (e.g., @channelname), or channel ID.',
    }),
  ),
  accessToken: Schema.optional(
    Ref.Ref(AccessToken.AccessToken).annotations({
      title: 'Account',
      description: 'Google account credentials for syncing this YouTube channel.',
    }),
  ),
});
export interface CreateYouTubeChannelSchema extends Schema.Schema.Type<typeof CreateYouTubeChannelSchema> {}

type YouTubeChannelProps = Omit<Obj.MakeProps<typeof YouTubeChannel>, 'feed' | 'lastSyncedAt'>;

/** Creates a YouTubeChannel object with a backing feed. */
export const make = (props: YouTubeChannelProps = {}) => {
  const feed = Feed.make();
  const channel = Obj.make(YouTubeChannel, {
    feed: Ref.make(feed),
    ...props,
  });
  Obj.setParent(feed, channel);
  return channel;
};
