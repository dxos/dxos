//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Feed as EchoFeed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { FactoryAnnotation, type FactoryFn, FeedAnnotation } from '@dxos/schema';

/**
 * Label of the canonical {@link Tag.Tag} object used by the star toggle.
 * Toggling adds/removes that tag's DXN from the Post's `Obj.getMeta().tags`.
 */
export const STAR_TAG = 'starred';

/** Feed protocol type. */
export const FeedType = Schema.Literal('atproto', 'rss');
export type FeedType = Schema.Schema.Type<typeof FeedType>;

/**
 * Default upper bound on the number of (non-starred) Posts retained when
 * syncing a {@link Feed} or curating a Magazine. Applied when the object
 * has no explicit `keep` value.
 */
export const DEFAULT_KEEP = 10;

/**
 * Subscription feed schema: an RSS/Atom/AT Protocol subscription.
 */
export const Feed = Schema.Struct({
  /** User-facing title of the feed. */
  name: Schema.String.pipe(Schema.optional),
  /** The URL of the RSS/Atom feed or AT Protocol handle/DID. */
  url: Schema.String.pipe(Schema.optional),
  /** Protocol type — determines which fetcher is used for sync. */
  type: FeedType.pipe(Schema.optional),
  /** Description of the feed. */
  description: Schema.String.pipe(Schema.optional),
  /** URL of the feed's associated website. */
  link: Schema.String.pipe(Schema.optional),
  /** URL of the feed's icon/image. */
  iconUrl: Schema.String.pipe(Schema.optional),
  /**
   * Maximum number of (non-starred) Posts retained in the feed's queue when syncing.
   * Older posts beyond this bound are dropped; starred posts are preserved regardless.
   * Defaults to {@link DEFAULT_KEEP} when unset.
   */
  keep: Schema.Number.pipe(
    Schema.annotations({
      title: 'Keep',
      description: 'Maximum number of items to keep when syncing (starred items are always preserved).',
    }),
    Schema.optional,
  ),
  /** Opaque sync cursor — protocol-specific. */
  cursor: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
  /** Backing ECHO feed for posts. */
  feed: Ref.Ref(EchoFeed.Feed).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.subscription.feed',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name', 'url']),
  Annotation.IconAnnotation.set({
    icon: 'ph--rss--regular',
    hue: 'orange',
  }),
  FeedAnnotation.set(true),
  // Generic-form create flows use `Obj.make(schema, values)` by default, but
  // a Feed needs a backing `EchoFeed.Feed` linked via `feed: Ref.Ref(...)` —
  // `makeFeed` provides that. The cast keeps Feed's inferred schema type
  // intact: without it, TypeScript widens `S` in `FactoryAnnotation.set`'s
  // generic constraint when the value type recursively references `Feed`.
  FactoryAnnotation.set(((values) => makeFeed(values)) as FactoryFn),
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
  /** Source subscription feed; populated by `SyncFeed` so curated posts can show provenance. */
  feed: Ref.Ref(Feed).pipe(FormInputAnnotation.set(false), Schema.optional),
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
  /** Agent/curation-extracted snippet of the article body; suitable for tile preview. */
  snippet: Schema.String.pipe(Schema.optional),
  /** Full article body plain text, populated on demand from fetchArticle. */
  content: Schema.String.pipe(Schema.optional),
  /** Hero image URL extracted from the article page. */
  imageUrl: Schema.String.pipe(Schema.optional),
  /** ISO 8601 timestamp when the Post was first read; absence = unread. */
  readAt: Schema.String.pipe(Schema.optional),
  /** Agent-assigned tags (populated by a future tagging feature). */
  tags: Schema.Array(Schema.String).pipe(Schema.optional),
  /** Agent-assigned rank within a magazine (lower = more relevant). Set by the curation flow. */
  rank: Schema.Number.pipe(FormInputAnnotation.set(false), Schema.optional),
  /** Archive flag — archived posts are hidden by default in the magazine view. */
  archived: Schema.Boolean.pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.subscription.post',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['title']),
  Annotation.IconAnnotation.set({
    icon: 'ph--article--regular',
    hue: 'orange',
  }),
);

export interface Post extends Schema.Schema.Type<typeof Post> {}

/** Creates a Subscription.Post object. */
export const makePost = (props: Obj.MakeProps<typeof Post> = {}): Post => Obj.make(Post, props);

/** Schema for the create-feed dialog form. */
export const CreateFeedSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.annotations({
      title: 'Name',
    }),
  ),
  url: Schema.optional(
    Schema.String.annotations({
      title: 'URL',
      description: 'RSS Feed URL or Bluesky handle.',
    }),
  ),
  type: Schema.optional(
    FeedType.annotations({
      title: 'Type',
      description: 'Feed protocol type.',
    }),
  ),
});
