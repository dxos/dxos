//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Feed as EchoFeed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { FeedAnnotation } from '@dxos/schema';

/** Subscription feed schema — an RSS/Atom subscription. */
export const Feed = Schema.Struct({
  /** User-facing title of the feed. */
  name: Schema.String.pipe(Schema.optional),
  /** The URL of the RSS/Atom feed. */
  url: Schema.String.pipe(Schema.optional),
  /** Description of the feed. */
  description: Schema.String.pipe(Schema.optional),
  /** URL of the feed's associated website. */
  link: Schema.String.pipe(Schema.optional),
  /** URL of the feed's icon/image. */
  iconUrl: Schema.String.pipe(Schema.optional),
  /** Backing ECHO feed for posts. */
  feed: Ref.Ref(EchoFeed.Feed).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.subscription.feed',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--rss--regular',
    hue: 'orange',
  }),
  FeedAnnotation.set(true),
);

export interface Feed extends Schema.Schema.Type<typeof Feed> {}

/** Checks if a value is a Subscription.Feed object. */
export const instanceOf = (value: unknown): value is Feed => Obj.instanceOf(Feed, value);

/** Creates a Subscription.Feed with a backing ECHO feed. */
export const makeFeed = (props: Omit<Obj.MakeProps<typeof Feed>, 'feed'> = {}): Feed => {
  const echoFeed = EchoFeed.make();
  const subscriptionFeed = Obj.make(Feed, {
    feed: Ref.make(echoFeed),
    ...props,
  });
  Obj.setParent(echoFeed, subscriptionFeed);
  return subscriptionFeed;
};

/** A single post/entry within a subscription feed. */
export const Post = Schema.Struct({
  /** Post title. */
  title: Schema.String.pipe(Schema.optional),
  /** URL link to the original article. */
  link: Schema.String.pipe(Schema.optional),
  /** Plain-text or HTML description/summary. */
  description: Schema.String.pipe(Schema.optional),
  /** Author name. */
  author: Schema.String.pipe(Schema.optional),
  /** ISO 8601 publication date. */
  published: Schema.String.pipe(Schema.optional),
  /** Unique identifier (guid) from the feed. */
  guid: Schema.String.pipe(Schema.optional),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.subscription.post',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--article--regular',
    hue: 'orange',
  }),
);

export interface Post extends Schema.Schema.Type<typeof Post> {}

/** Creates a Subscription.Post object. */
export const makePost = (props: Obj.MakeProps<typeof Post> = {}): Post => Obj.make(Post, props);
