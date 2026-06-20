//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, DXN, Ref, Registry } from '@dxos/echo';

import { meta } from '#meta';

import * as Magazine from './Magazine';
import * as Subscription from './Subscription';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/** Fetches an RSS/Atom feed and appends new posts to the backing ECHO feed. */
export const SyncFeed = Operation.make({
  meta: {
    key: makeKey('syncFeed'),
    name: 'Sync Feed',
    description: 'Fetches RSS/Atom feed and writes posts to the ECHO feed.',
    icon: 'ph--arrows-clockwise--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    feed: Ref.Ref(Subscription.Subscription),
  }),
  output: Schema.Void,
});

/**
 * Fetches a Post's article page over HTTP and returns extracted plain text plus
 * any image URLs found. Read-only; does not mutate the Post. Agent-facing tool
 * (the surviving curation tool: the agent may call it to read a candidate's full
 * text when title + description are insufficient to judge relevance).
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
    force: Schema.optional(
      Schema.Boolean.annotations({
        description: 'Re-fetch and append fresh content even if an entry already exists (refresh).',
      }),
    ),
  }),
  output: Schema.Void,
});

/**
 * End-to-end magazine curation: syncs all referenced feeds (in parallel), then runs an in-memory
 * routine (the magazine's topic instructions + the registry-resolved Magazine skill) through the
 * agent to select matching posts, adds the selected posts mechanically, and finally enforces each
 * feed's `keep` bound. Drives the MagazineArticle Curate button; schedulable via triggers.
 */
export const CurateMagazine = Operation.make({
  meta: {
    key: makeKey('curateMagazine'),
    name: 'Curate Magazine',
    description: 'Syncs feeds, selects matching posts via the magazine skill, and applies per-feed keep limits.',
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({
    magazine: Ref.Ref(Magazine.Magazine).annotations({
      description: 'The Magazine to curate.',
    }),
  }),
  output: Schema.Struct({
    synced: Schema.Number.annotations({ description: 'Number of feeds successfully synced.' }),
    curated: Schema.Number.annotations({ description: 'Number of posts added to the magazine.' }),
  }),
  // Database.Service for candidate collection, Registry.Service to resolve the methodology skill;
  // sub-operations (SyncFeed, AgentPrompt) resolve through the ambient Operation.Service invoker.
  services: [Database.Service, Registry.Service],
});

/**
 * Clears a Magazine's curated posts, preserving any that are starred. Drives the MagazineArticle
 * Clear button.
 */
export const ClearMagazine = Operation.make({
  meta: {
    key: makeKey('clearMagazine'),
    name: 'Clear Magazine',
    description: "Removes a Magazine's posts, keeping any that are starred.",
    icon: 'ph--trash--regular',
  },
  input: Schema.Struct({
    magazine: Ref.Ref(Magazine.Magazine).annotations({
      description: 'The Magazine to clear.',
    }),
  }),
  output: Schema.Void,
  services: [Database.Service],
});
