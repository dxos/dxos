//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';

import { meta } from '#meta';

import { Magazine, Subscription } from '../types';

const FEED_OPERATION = `${meta.id}.operation`;

/** Fetches an RSS/Atom feed and appends new posts to the backing ECHO feed. */
export const SyncFeed = Operation.make({
  meta: {
    key: `${FEED_OPERATION}.sync-feed`,
    name: 'Sync Feed',
    description: 'Fetches RSS/Atom feed and writes posts to the ECHO feed.',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    feed: Subscription.Feed,
  }),
  output: Schema.Void,
});

/**
 * Returns lightweight summaries of Posts from the Magazine's referenced feeds
 * that have not yet been added to the Magazine. Agent-facing curation tool.
 */
export const ListCandidatePosts = Operation.make({
  meta: {
    key: `${FEED_OPERATION}.list-candidate-posts`,
    name: 'List Candidate Posts',
    description: 'Returns uncurated Posts from a Magazine’s referenced feeds.',
  },
  input: Schema.Struct({
    magazine: Ref.Ref(Magazine.Magazine).annotations({
      description: 'The Magazine whose candidate Posts to list.',
    }),
  }),
  output: Schema.Array(
    Schema.Struct({
      postId: Schema.String.annotations({ description: 'DXN of the candidate Post.' }),
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
    key: `${FEED_OPERATION}.fetch-article-content`,
    name: 'Fetch Article Content',
    description: 'Fetches and extracts text + image URLs from a Post’s article page.',
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
 * to `post.content` and the first image URL to `post.imageUrl`. Idempotent —
 * skips if `post.content` is already set or the Post has no link. Used by the
 * reader view to populate the full article on first open.
 */
export const LoadPostContent = Operation.make({
  meta: {
    key: `${FEED_OPERATION}.load-post-content`,
    name: 'Load Post Content',
    description: 'Fetches and stores the full article content on a Post.',
  },
  input: Schema.Struct({
    post: Ref.Ref(Subscription.Post).annotations({
      description: 'The Post to load content for.',
    }),
  }),
  output: Schema.Void,
  // Database.Service is provided by the handler (resolved from the post ref's
  // target db), so it's not declared here — otherwise the React-side invoker,
  // which doesn't compose Database.Service into its runtime, would reject the
  // call before the handler ever runs. Same pattern as plugin-inbox/AddMailbox.
});

/**
 * Writes snippet and imageUrl onto the Post and appends the Post ref to the
 * Magazine's posts list. Idempotent. Agent-facing tool.
 */
export const AddPostToMagazine = Operation.make({
  meta: {
    key: `${FEED_OPERATION}.add-post-to-magazine`,
    name: 'Add Post to Magazine',
    description: 'Enriches a Post with snippet/imageUrl and appends it to a Magazine.',
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
  output: Subscription.Post,
  services: [Database.Service],
});

/**
 * End-to-end magazine refresh: loads each referenced feed, syncs new posts from
 * the source RSS/Atom URL, runs deterministic curation, then enforces each
 * feed's `keep` bound on the magazine's curated post list. Drives the
 * MagazineArticle Curate button.
 */
export const RefreshMagazine = Operation.make({
  meta: {
    key: `${FEED_OPERATION}.refresh-magazine`,
    name: 'Refresh Magazine',
    description: 'Syncs feeds, curates new posts, and applies per-feed keep limits.',
  },
  input: Schema.Struct({
    magazine: Ref.Ref(Magazine.Magazine).annotations({
      description: 'The Magazine to refresh.',
    }),
  }),
  output: Schema.Struct({
    synced: Schema.Number.annotations({ description: 'Number of feeds successfully synced.' }),
    added: Schema.Number.annotations({ description: 'Number of Posts added to the Magazine.' }),
  }),
  services: [Capability.Service],
});

/**
 * Deterministic one-shot curation. Used by the MagazineArticle Curate button.
 * For each uncurated Post in the Magazine's referenced feeds, derives a snippet
 * and image from the Post's existing description (no HTTP) and adds it.
 */
export const CurateMagazine = Operation.make({
  meta: {
    key: `${FEED_OPERATION}.curate-magazine`,
    name: 'Curate Magazine',
    description: 'Adds uncurated Posts from the Magazine’s feeds with derived snippets.',
  },
  input: Schema.Struct({
    magazine: Ref.Ref(Magazine.Magazine).annotations({
      description: 'The Magazine to curate.',
    }),
  }),
  output: Schema.Struct({
    added: Schema.Number.annotations({ description: 'Number of Posts added to the Magazine.' }),
  }),
  services: [Capability.Service],
});
