//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type Space } from '@dxos/client/echo';
import { Database, DXN, Annotation, Feed, Filter, Obj, Query, Ref, Scope, Tag, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { EffectEx } from '@dxos/effect';
import { type EntityId } from '@dxos/keys';
import { FactoryAnnotation, type FactoryFn, FeedAnnotation, StateMap, TagIndex } from '@dxos/schema';

/** Subscription protocol type. */
export const FeedType = Schema.Literal('standard-site', 'rss');
export type FeedType = Schema.Schema.Type<typeof FeedType>;

/**
 * System per-Post flags (starred/archived) modelled as space-wide {@link Tag} objects (resolved via
 * `Tag.findOrCreate` on first use). Each entry is a single source of truth carrying its foreign
 * `key` plus display `label`/`hue`.
 */
export const SYSTEM_TAGS = {
  starred: { key: { source: 'org.dxos.plugin.magazine', id: 'starred' }, label: 'Starred', hue: 'amber' },
  archived: { key: { source: 'org.dxos.plugin.magazine', id: 'archived' }, label: 'Archived', hue: 'neutral' },
} as const;

/** A system per-Post flag modelled as a tag. */
export type SystemTag = keyof typeof SYSTEM_TAGS;

/** Per-Post mutable state stored on the Subscription (shared across magazines), keyed by Post id. */
export const PostState = Schema.Struct({
  /** ISO 8601 timestamp when first opened. */
  readAt: Schema.optional(Schema.String),
});
export type PostState = Schema.Schema.Type<typeof PostState>;

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
  feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
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
  contentFeed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false), Schema.optional),
  /**
   * Per-Post mutable state keyed by Post id, shared across every Magazine that references the Post.
   * Posts live immutably in the `feed` queue; their `readAt` marker lives here. (`snippet`/`imageUrl`
   * are derived from the Post, or refined onto `contentFeed` entries — not stored here; star/archive
   * are tags — see `tags`.)
   */
  postState: Ref.Ref(StateMap.StateMap).pipe(FormInputAnnotation.set(false)),
  /**
   * Per-Post tags keyed by tag uri → Post ids. Boolean flags (starred, archived — see
   * {@link SYSTEM_TAGS}) are modelled as {@link Tag} objects so they
   * participate in the space-wide tag system. Stored as a child {@link TagIndex} object.
   */
  tags: Ref.Ref(TagIndex.TagIndex).pipe(FormInputAnnotation.set(false)),
}).pipe(
  LabelAnnotation.set(['name', 'url']),
  Annotation.IconAnnotation.set({ icon: 'ph--rss--regular', hue: 'indigo' }),
  FeedAnnotation.set(true),
  FactoryAnnotation.set(((values) => makeSubscription(values)) as FactoryFn),
  Type.makeObject(DXN.make('org.dxos.type.subscription.feed', '0.1.0')),
);

export type Subscription = Type.InstanceType<typeof Subscription>;

/** Checks if a value is a Subscription.Subscription object. */
export const instanceOf = (value: unknown): value is Subscription => Obj.instanceOf(Subscription, value);

/** Creates a Subscription.Subscription with backing ECHO feeds for posts and fetched content. */
export const makeSubscription = (
  props: Omit<Obj.MakeProps<typeof Subscription>, 'feed' | 'contentFeed' | 'postState' | 'tags'> = {},
): Subscription => {
  const postFeed = Feed.make();
  const contentFeed = Feed.make();
  const postState = StateMap.make();
  const tags = TagIndex.make();
  const subscription = Obj.make(Subscription, {
    feed: Ref.make(postFeed),
    contentFeed: Ref.make(contentFeed),
    postState: Ref.make(postState),
    tags: Ref.make(tags),
    ...props,
  });
  Obj.setParent(postFeed, subscription);
  Obj.setParent(contentFeed, subscription);
  // Per-Post state and tag index are children: cascade-deleted with the subscription.
  Obj.setParent(postState, subscription);
  Obj.setParent(tags, subscription);
  return subscription;
};

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
  /** Plain-text or summary. */
  description: Schema.String.pipe(Schema.optional),
  /** Plain-text or HTML content. */
  content: Schema.String.pipe(Schema.optional),
  /** Author name. */
  author: Schema.String.pipe(Schema.optional),
  /** ISO 8601 publication date. */
  published: Schema.String.pipe(Schema.optional),
  /** Unique identifier (guid) from the feed. */
  guid: Schema.String.pipe(Schema.optional),
}).pipe(
  LabelAnnotation.set(['title']),
  Annotation.IconAnnotation.set({ icon: 'ph--article--regular', hue: 'orange' }),
  Type.makeObject(DXN.make('org.dxos.type.subscription.post', '0.1.0')),
);

export type Post = Type.InstanceType<typeof Post>;

/** Creates a Subscription.Post object. */
export const makePost = (props: Obj.MakeProps<typeof Post> = {}): Post => Obj.make(Post, props);

/**
 * An entry in a Subscription's {@link Subscription.contentFeed} queue: the
 * fetched body of a Post, linked back to the queue Post in the parallel `feed`
 * queue via {@link post}.
 *
 * Lives in a queue (not on `Subscription.postState`) because fetched bodies
 * can be many KB; storing them inline would inflate the Subscription document
 * unboundedly and force every reader to download every body. The queue is
 * lazily replicated and append-only — a natural fit for immutable content.
 */
export const PostContent = Schema.Struct({
  /** Source Post (in the Subscription's `feed` queue). */
  post: Ref.Ref(Post).pipe(FormInputAnnotation.set(false)),
  /** Extracted article body, in Markdown. */
  text: Schema.String,
  /** Refined snippet derived from the full article (preferred over the description-derived one). */
  snippet: Schema.optional(Schema.String),
  /** Refined hero image derived from the full article (preferred over the description-derived one). */
  imageUrl: Schema.optional(Schema.String),
  /** ISO 8601 timestamp when the content was fetched. */
  fetchedAt: Schema.String,
}).pipe(
  Annotation.HiddenAnnotation.set(true),
  Type.makeObject(DXN.make('org.dxos.type.subscription.postContent', '0.1.0')),
);

export type PostContent = Type.InstanceType<typeof PostContent>;

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
      description: 'RSS feed URL or atproto handle (e.g. dxos.org).',
    }),
  ),
  type: Schema.optional(
    FeedType.annotations({
      title: 'Type',
      description: 'Subscription protocol type.',
    }),
  ),
});

//
// Per-Post state, keyed by Post entity id (Posts are immutable queue items). Read marker lives in
// `postState`; star/archive are system Tags indexed in `tags`. Shared across magazines.
//

/** ISO timestamp the Post was first opened, or undefined. */
export const getReadAt = (
  subscription: Subscription | Obj.Snapshot<Subscription> | undefined,
  postId: EntityId,
): string | undefined => {
  const stateMap = subscription?.postState.target;
  return stateMap ? StateMap.bind<PostState>(stateMap).get(postId).readAt : undefined;
};

/** Sets/clears the Post's read marker. */
export const setReadAt = (subscription: Subscription, postId: EntityId, value: string | undefined): void => {
  const stateMap = subscription.postState.target;
  if (stateMap) {
    StateMap.bind<PostState>(stateMap).patch(postId, { readAt: value });
  }
};

/** Resolves the uri of an existing system Tag without creating one; `undefined` when absent. Async. */
export const findSystemTagUri = async (
  db: Pick<Database.Database, 'query'>,
  which: SystemTag,
): Promise<string | undefined> => {
  // Prefer the current key; fall back to the legacy 'org.dxos.plugin.feed' source so
  // starred/archived tags created before the plugin-feed → plugin-magazine rename still resolve.
  // Two separate queries ensure deterministic priority when both tags co-exist.
  const [currentTag] = await db.query(Filter.foreignKeys(Tag.Tag, [SYSTEM_TAGS[which].key])).run();
  if (currentTag) {
    return Obj.getURI(currentTag).toString();
  }
  const legacyKey = { source: 'org.dxos.plugin.feed', id: SYSTEM_TAGS[which].key.id };
  const [legacyTag] = await db.query(Filter.foreignKeys(Tag.Tag, [legacyKey])).run();
  return legacyTag ? Obj.getURI(legacyTag).toString() : undefined;
};

/** Whether a Post carries the given (resolved) tag uri on its Subscription. Pure. */
export const hasTag = (
  subscription: Subscription | Obj.Snapshot<Subscription> | undefined,
  postId: EntityId,
  tagUri: string | undefined,
): boolean => {
  const tagIndex = subscription?.tags.target;
  return !!(tagIndex && tagUri) && TagIndex.bind(tagIndex).objects(tagUri).includes(postId);
};

/** Sets/clears a system tag (`starred`/`archived`) on a Post (find-or-creates the Tag object). Async. */
export const setTag = async (
  subscription: Subscription,
  postId: EntityId,
  db: Pick<Database.Database, 'query' | 'add'>,
  which: SystemTag,
  value: boolean,
): Promise<void> => {
  const tag = await Tag.findOrCreate(db, SYSTEM_TAGS[which]);
  const uri = Obj.getURI(tag).toString();
  const tagIndex = subscription.tags.target;
  if (!tagIndex) {
    return;
  }
  const tags = TagIndex.bind(tagIndex);
  if (value) {
    tags.setTag(uri, postId);
  } else {
    tags.unsetTag(uri, postId);
  }
};

//
// Content feed (fetched article bodies; carries refined snippet/imageUrl).
//

/** Resolves a Post's source Subscription synchronously if its `source` ref is loaded, else undefined. */
export const getPostSubscription = (post: Post): Subscription | undefined => post.source?.target;

/**
 * Query for {@link PostContent} entries referencing a Post via the reverse-ref index.
 * Scoped to the Subscription's post and content feeds.
 */
export const queryPostContentForPost = (
  subscription: Subscription | Obj.Snapshot<Subscription>,
  post: Post | Obj.Snapshot<Post>,
): Query.Any | undefined => {
  const postFeed = subscription.feed?.target;
  const contentFeed = subscription.contentFeed?.target;
  if (!postFeed || !contentFeed) {
    return undefined;
  }
  const postFeedUri = Obj.getURI(postFeed);
  const contentFeedUri = Obj.getURI(contentFeed);
  return Query.select(Filter.id(post.id))
    .referencedBy(PostContent, 'post')
    .from(Scope.feed(postFeedUri), Scope.feed(contentFeedUri));
};

/** Pick the newest PostContent when multiple entries reference the same Post. */
export const pickLatestPostContent = (entries: readonly PostContent[]): PostContent | undefined => {
  if (entries.length === 0) {
    return undefined;
  }
  return [...entries].sort((entryA, entryB) => entryB.fetchedAt.localeCompare(entryA.fetchedAt))[0];
};

/** Looks up PostContent for a Post (newest wins); undefined if absent. */
export const findPostContent = async (
  subscription: Subscription | Obj.Snapshot<Subscription>,
  post: Post | Obj.Snapshot<Post>,
): Promise<PostContent | undefined> => {
  const db = Obj.getDatabase(subscription);
  const query = queryPostContentForPost(subscription, post);
  if (!db || !query) {
    return undefined;
  }
  return pickLatestPostContent(await db.query(query).run());
};

/** Returns the Subscription's `contentFeed`, lazily creating and attaching one when missing. */
const ensureContentFeed = (subscription: Subscription): Feed.Feed => {
  const existing = subscription.contentFeed?.target;
  if (existing) {
    return existing;
  }
  const created = Feed.make();
  Obj.update(subscription, (subscription) => {
    const mutable = subscription as Obj.Mutable<typeof subscription>;
    mutable.contentFeed = Ref.make(created);
  });
  Obj.setParent(created, subscription);
  return created;
};

/**
 * Appends a {@link PostContent} entry (body + refined snippet/imageUrl) to a Subscription's
 * `contentFeed`, lazily creating the feed on first use.
 */
export const appendPostContent = async (
  space: Pick<Space, 'db'>,
  subscription: Subscription,
  entry: {
    post: Post | Obj.Snapshot<Post>;
    text: string;
    snippet?: string;
    imageUrl?: string;
    fetchedAt?: string;
  },
): Promise<void> => {
  const echoFeed = ensureContentFeed(subscription);
  const content = Obj.make(PostContent, {
    post: Ref.fromURI(Obj.getURI(entry.post)),
    text: entry.text,
    ...(entry.snippet ? { snippet: entry.snippet } : {}),
    ...(entry.imageUrl ? { imageUrl: entry.imageUrl } : {}),
    fetchedAt: entry.fetchedAt ?? new Date().toISOString(),
  });
  await Feed.append(echoFeed, [content]).pipe(Effect.provide(Database.layer(space.db)), EffectEx.runAndForwardErrors);
};
