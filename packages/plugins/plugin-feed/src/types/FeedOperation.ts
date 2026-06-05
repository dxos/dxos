//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { SpaceSchema } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Database, DXN, Feed, Obj, Ref, Type } from '@dxos/echo';

import { meta } from '#meta';

import * as Magazine from './Magazine';
import * as Subscription from './Subscription';

const makeKey = (name: string) => DXN.make(`${meta.id}.operation.${name}`);

export const OnCreateSpace = Operation.make({
  meta: { key: makeKey('onCreateSpace'), name: 'On Create Space', icon: 'ph--rss--regular' },
  input: Schema.Struct({
    space: SpaceSchema,
  }),
  output: Schema.Void,
});

/** Fetches an RSS/Atom feed and appends new posts to the backing ECHO feed. */
export const SyncFeed = Operation.make({
  meta: {
    key: makeKey('syncFeed'),
    name: 'Sync Feed',
    description: 'Fetches RSS/Atom feed and writes posts to the ECHO feed.',
    icon: 'ph--arrows-clockwise--regular',
  },
  services: [Feed.FeedService, Database.Service],
  input: Schema.Struct({
    feed: Ref.Ref(Subscription.Subscription),
  }),
  output: Schema.Void,
});

/**
 * Returns lightweight summaries of Posts from the Magazine's referenced feeds
 * that have not yet been added to the Magazine. Agent-facing curation tool.
 */
export const ListCandidatePosts = Operation.make({
  meta: {
    key: makeKey('listCandidatePosts'),
    name: 'List Candidate Posts',
    description: "Returns uncurated Posts from a Magazine's referenced feeds.",
    icon: 'ph--list--regular',
  },
  input: Schema.Struct({
    magazine: Ref.Ref(Magazine.Magazine).annotations({
      description: 'The Magazine whose candidate Posts to list.',
    }),
  }),
  output: Schema.Array(
    Schema.Struct({
      postId: Obj.ID.annotations({ description: 'Entity id of the candidate Post.' }),
      feedName: Schema.optional(Schema.String),
      title: Schema.optional(Schema.String),
      description: Schema.optional(Schema.String),
      author: Schema.optional(Schema.String),
      published: Schema.optional(Schema.String),
      link: Schema.optional(Schema.String),
    }),
  ),
  services: [Database.Service],
});

/**
 * Fetches a Post's article page over HTTP and returns extracted plain text plus
 * any image URLs found. Read-only; does not mutate the Post. Agent-facing tool.
 */
export const FetchArticleContent = Operation.make({
  meta: {
    key: makeKey('fetchArticleContent'),
    name: 'Fetch Article Content',
    description: "Fetches and extracts text + image URLs from a Post's article page.",
    icon: 'ph--article--regular',
  },
  input: Schema.Struct({
    post: Ref.Ref(Subscription.Post).annotations({
      description: 'The Post to fetch content for. The Post must have a link.',
    }),
  }),
  output: Schema.Struct({
    text: Schema.String.annotations({ description: 'Extracted plain text from the article page.' }),
    imageUrls: Schema.Array(Schema.String).annotations({
      description: 'Image URLs found on the page (og:image first, then <img> src values).',
    }),
  }),
  services: [Database.Service],
});

/**
 * Fetches a Post's article page over HTTP and writes the extracted plain text
 * and hero image URL to the source Subscription's content feed. Per-Post read/star/archive
 * state on the Subscription is keyed by Post entity id.
 * (the Post itself is an immutable queue item). Idempotent — skips if
 * `content` is already set or the Post has no link. Used by the reader view
 * to populate the full article on first open.
 */
export const LoadPostContent = Operation.make({
  meta: {
    key: makeKey('loadPostContent'),
    name: 'Load Post Content',
    description: 'Fetches and stores the full article content on a Post.',
    icon: 'ph--download--regular',
  },
  input: Schema.Struct({
    post: Ref.Ref(Subscription.Post).annotations({
      description: 'The Post to load content for.',
    }),
  }),
  output: Schema.Void,
});

/**
 * Writes snippet and imageUrl onto the Post and appends the Post ref to the
 * Magazine's posts list. Idempotent. Agent-facing tool.
 */
export const AddPostToMagazine = Operation.make({
  meta: {
    key: makeKey('addPostToMagazine'),
    name: 'Add Post to Magazine',
    description: 'Enriches a Post with snippet/imageUrl and appends it to a Magazine.',
    icon: 'ph--plus--regular',
  },
  input: Schema.Struct({
    magazine: Ref.Ref(Magazine.Magazine).annotations({
      description: 'The Magazine to append to.',
    }),
    post: Ref.Ref(Subscription.Post).annotations({
      description: 'The Post to enrich and add.',
    }),
    snippet: Schema.String.annotations({
      description: 'Short text (~200 chars) extracted from the article for display.',
    }),
    imageUrl: Schema.optional(
      Schema.String.annotations({
        description: 'Hero image URL to display with the Post. Optional.',
      }),
    ),
  }),
  output: Type.getSchema(Subscription.Post),
  services: [Database.Service],
});

/**
 * End-to-end magazine curation: syncs all referenced feeds, then runs the
 * magazine's Routine through the AI blueprint to select and enrich posts, and
 * finally enforces each feed's `keep` bound. Drives the MagazineArticle Curate button.
 */
export const CurateMagazine = Operation.make({
  meta: {
    key: makeKey('curateMagazine'),
    name: 'Curate Magazine',
    description: 'Syncs feeds, runs the magazine routine to curate posts, and applies per-feed keep limits.',
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({
    magazine: Ref.Ref(Magazine.Magazine).annotations({
      description: 'The Magazine to curate.',
    }),
  }),
  output: Schema.Struct({
    synced: Schema.Number.annotations({ description: 'Number of feeds successfully synced.' }),
  }),
  services: [Capability.Service],
});
