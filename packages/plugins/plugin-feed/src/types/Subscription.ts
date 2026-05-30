//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Feed as EchoFeed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { FactoryAnnotation, type FactoryFn, FeedAnnotation } from '@dxos/schema';

/** Subscription protocol type. */
export const FeedType = Schema.Literal('atproto', 'rss');
export type FeedType = Schema.Schema.Type<typeof FeedType>;

/**
 * Default upper bound on the number of (non-starred) Posts retained when
 * syncing a {@link Subscription} or curating a Magazine. Applied when the object
 * has no explicit `keep` value.
 */
export const DEFAULT_KEEP = 10;

/**
 * Subscription feed schema: an RSS/Atom/AT Protocol subscription.
 */
export const Subscription = Schema.Struct({
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
      description: 'Number of synced items.',
    }),
    Schema.optional,
  ),
  /** Opaque sync cursor — protocol-specific. */
  cursor: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
  /** Backing ECHO feed (queue) for Posts: immutable feed entries appended by sync. */
  feed: Ref.Ref(EchoFeed.Feed).pipe(FormInputAnnotation.set(false)),
  /**
   * Backing ECHO feed (queue) for fetched article bodies — one
   * {@link PostContent} entry per Post whose content has been loaded.
   *
   * Feeds (not the {@link postState} side map) are the right home for big
   * immutable payloads: they're append-only, lazily replicated, and don't
   * inflate the Subscription document. The side map keeps only the small
   * per-Post user state (read/archived/star/imageUrl).
   *
   * Optional for backwards compatibility with older Subscription documents
   * that pre-date this feed; new subscriptions always have one via
   * {@link makeSubscription}.
   */
  contentFeed: Ref.Ref(EchoFeed.Feed).pipe(FormInputAnnotation.set(false), Schema.optional),
  /**
   * Per-Post state keyed by Post id. The Posts themselves live in this
   * subscription's `feed` queue (immutable feed entries); their mutable
   * state lives here so the queue stays append-only and Posts never enter
   * `space.db`.
   *
   * Authority: shared across every Magazine that references this
   * Subscription's Posts. Marking a Post read here makes it read in every
   * magazine view; archiving / starring likewise.
   *
   * Only small per-Post state lives here — fetched bodies (which can be
   * many KB each) go into the {@link contentFeed} queue.
   *
   * - `imageUrl`: hero image extracted at curate time (from `description`) or
   *   later refined by `LoadPostContent` (from the full article HTML). Hot-
   *   path: every magazine tile reads it.
   * - `readAt`: ISO 8601 timestamp when first opened.
   * - `archived`: hides the Post from default magazine views.
   * - `starred` / `starredAt`: cross-magazine star flag (replaces the older
   *   `Obj.getMeta(post).tags + STAR_TAG` pattern).
   */
  postState: Schema.Record({
    key: Schema.String,
    value: Schema.Struct({
      imageUrl: Schema.optional(Schema.String),
      readAt: Schema.optional(Schema.String),
      archived: Schema.optional(Schema.Boolean),
      starred: Schema.optional(Schema.Boolean), // TODO(burdon): Model using tags.
      starredAt: Schema.optional(Schema.String), // TODO(burdon): Can we remove this?
    }),
  }).pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  LabelAnnotation.set(['name', 'url']),
  Annotation.IconAnnotation.set({
    icon: 'ph--rss--regular',
    hue: 'orange',
  }),
  FeedAnnotation.set(true),
  FactoryAnnotation.set(((values) => makeSubscription(values)) as FactoryFn),
  Type.makeObject(DXN.make('org.dxos.type.subscription.feed', '0.1.0')),
);

export type Subscription = Type.InstanceType<typeof Subscription>;

/** Checks if a value is a Subscription.Subscription object. */
export const instanceOf = (value: unknown): value is Subscription => Obj.instanceOf(Subscription, value);

/** Creates a Subscription.Subscription with backing ECHO feeds for posts and fetched content. */
export const makeSubscription = (
  props: Omit<Obj.MakeProps<typeof Subscription>, 'feed' | 'contentFeed'> = {},
): Subscription => {
  const postFeed = EchoFeed.make();
  const contentFeed = EchoFeed.make();
  const subscription = Obj.make(Subscription, {
    feed: Ref.make(postFeed),
    contentFeed: Ref.make(contentFeed),
    ...props,
  });
  Obj.setParent(postFeed, subscription);
  Obj.setParent(contentFeed, subscription);
  return subscription;
};

/**
 * An entry in a Subscription's {@link Subscription.contentFeed} queue: the
 * fetched body of a Post, keyed (via `postId`) back to the queue Post in the
 * parallel `feed` queue.
 *
 * Lives in a queue (not on `Subscription.postState`) because fetched bodies
 * can be many KB; storing them inline would inflate the Subscription document
 * unboundedly and force every reader to download every body. The queue is
 * lazily replicated and append-only — a natural fit for immutable content.
 */
export const PostContent = Schema.Struct({
  /** Id of the source Post (in the Subscription's `feed` queue). */
  postId: Schema.String,
  /** Extracted article body, in Markdown. */
  text: Schema.String,
  /** ISO 8601 timestamp when the content was fetched. */
  fetchedAt: Schema.String,
}).pipe(Type.makeObject(DXN.make('org.dxos.type.subscription.postContent', '0.1.0')));

export type PostContent = Type.InstanceType<typeof PostContent>;

/**
 * A single post/entry within a subscription feed.
 *
 * Immutable feed-entry: every field below is set at sync time by the protocol
 * fetcher and never written to again. Mutable state (read, archived, starred,
 * fetched content, hero image) lives on
 * {@link Subscription.Subscription.postState} keyed by Post id; curation
 * outputs (snippet, rank) live on `Magazine.postState`.
 */
export const Post = Schema.Struct({
  /** Source subscription feed; populated by `SyncSubscription` so curated posts can show provenance. */
  source: Ref.Ref(Subscription).pipe(FormInputAnnotation.set(false), Schema.optional),
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
  LabelAnnotation.set(['title']),
  Annotation.IconAnnotation.set({
    icon: 'ph--article--regular',
    hue: 'orange',
  }),
  Type.makeObject(DXN.make('org.dxos.type.subscription.post', '0.1.0')),
);

export type Post = Type.InstanceType<typeof Post>;

/** Creates a Subscription.Post object. */
export const makePost = (props: Obj.MakeProps<typeof Post> = {}): Post => Obj.make(Post, props);

/** Schema for the create-feed dialog form. */
export const CreateSubscriptionSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.annotations({
      title: 'Name',
    }),
  ),
  url: Schema.optional(
    Schema.String.annotations({
      title: 'URL',
      description: 'RSS Subscription URL or Bluesky handle.',
    }),
  ),
  type: Schema.optional(
    FeedType.annotations({
      title: 'Type',
      description: 'Subscription protocol type.',
    }),
  ),
});
