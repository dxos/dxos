//
// Copyright 2026 DXOS.org
//

// Run in the node environment (not the package-default happy-dom): the agent's outbound Anthropic
// call goes through real `fetch`; happy-dom's fetch enforces CORS and blocks the cross-origin request.
// extractArticle falls back to defuddle/node (linkedom) when DOMParser is absent, so the real
// fetchArticleContent tool works here without a DOM polyfill.
// @vitest-environment node

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, vi } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedAiService } from '@dxos/ai/testing';
import { AgentHandlers } from '@dxos/assistant-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Feed, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { StateMap, TagIndex, Text } from '@dxos/schema';

import { MagazineSkill } from '../skills';
import { FeedOperation, Magazine, Subscription } from '../types';
import { MagazineOperationHandlerSet } from './index';

/**
 * Holds the ids of the two on-topic candidate Posts, filled by the test after it creates them (and
 * before invoking the curation operation) since the curation agent's `completeJob` call must select
 * those exact ids. Read lazily by the scripted tool call, at model-call time.
 */
const selectedIds: { artemis?: string; jwst?: string } = {};

const TestLayer = AssistantTestLayer({
  // MagazineOperationHandlerSet provides CurateMagazine + SyncFeed + FetchArticleContent (the skill
  // tool); AgentHandlers provides the RunInstructions handler the curate operation invokes.
  operationHandlers: [MagazineOperationHandlerSet, AgentHandlers],
  types: [
    Feed.Feed,
    Subscription.Subscription,
    Subscription.Post,
    Magazine.Magazine,
    Tag.Tag,
    Text.Text,
    StateMap.StateMap,
    TagIndex.TagIndex,
  ],
  skills: [MagazineSkill.make()],
  // The curation agent (RunInstructions, via the Magazine skill) is scripted to select the two
  // on-topic candidates and stop: `completeJob` (RunInstructions' inline tool, not an
  // operation-backed one — hence a raw `toolCall` rather than `operationToolCall`) carrying the
  // selection, then a final text turn so the agent loop terminates.
  aiService: ScriptedAiService.layer([
    ScriptedAiService.toolCall('completeJob', () => ({
      success: {
        posts: [
          { id: selectedIds.artemis, snippet: "Covers NASA's Artemis II crewed lunar flyby rehearsal." },
          { id: selectedIds.jwst, snippet: 'Covers JWST confirming the most distant galaxy yet observed.' },
        ],
      },
    })),
    ScriptedAiService.text(
      'Curated the two space and astronomy articles; skipped the unrelated business and tooling stories.',
    ),
  ]),
});

/**
 * Candidate posts seeded into the subscription's backing queue: two clearly on-topic for a
 * space/astronomy magazine, two clearly off-topic.
 */
const CANDIDATES = [
  {
    guid: 'artemis-ii',
    title: "NASA's Artemis II crew completes lunar flyby rehearsal",
    description:
      'The four astronauts ran a full simulation of the crewed Moon flyby, practicing re-entry and recovery procedures ahead of next year’s launch.',
    onTopic: true,
  },
  {
    guid: 'jwst-galaxy',
    title: 'James Webb telescope confirms the most distant galaxy yet seen',
    description:
      'Astronomers used JWST spectroscopy to confirm a galaxy as it appeared 290 million years after the Big Bang, a new record for cosmic distance.',
    onTopic: true,
  },
  {
    guid: 'retail-earnings',
    title: 'Retail chain beats quarterly earnings estimates',
    description:
      'Shares rose 6% after the company reported stronger-than-expected holiday sales and raised its full-year profit guidance.',
    onTopic: false,
  },
  {
    guid: 'js-bundler',
    title: 'New JavaScript build tool promises 10x faster bundling',
    description:
      'The Rust-based bundler aims to replace existing toolchains for large web applications with incremental compilation.',
    onTopic: false,
  },
];

/** Minimal article page so the real extractArticle (defuddle) has a body to parse. */
const articleHtml = (title: string, body: string) =>
  `<!doctype html><html><head><title>${title}</title></head><body><article><h1>${title}</h1><p>${body}</p></article></body></html>`;

// Preserve the real fetch so the stub can pass through any URL that isn't a scripted candidate
// article (the agent's model calls are scripted in-process, not over the network — this only
// guards the fetchArticleContent tool's own outbound fetches).
// eslint-disable-next-line no-restricted-globals
const realFetch = globalThis.fetch.bind(globalThis);

describe('CurateMagazine (LLM)', () => {
  // Stub only the network boundary: serve canned HTML for the candidate article URLs (so the real
  // fetchArticleContent tool runs deterministically), and pass everything else (Anthropic) through.
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const candidate = CANDIDATES.find((entry) => url.includes(entry.guid));
        if (candidate) {
          return new Response(articleHtml(candidate.title, candidate.description), {
            status: 200,
            headers: { 'content-type': 'text/html' },
          });
        }
        return realFetch(input, init);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.effect(
    'selects only the posts matching the magazine topic',
    Effect.fnUntraced(
      function* ({ expect }) {
        // Subscription with no `url` → the SyncFeed phase is skipped (no network); curation reads the
        // posts we seed directly into the backing queue below.
        const subscription = yield* Database.add(
          Subscription.makeSubscription({ name: 'Tech & Science Daily', type: 'rss' }),
        );
        yield* Database.flush();

        const postFeed = yield* Database.load(subscription.feed);
        const posts = CANDIDATES.map((candidate) =>
          Obj.make(Subscription.Post, {
            title: candidate.title,
            description: candidate.description,
            link: `https://example.com/${candidate.guid}`,
            guid: candidate.guid,
            published: '2026-05-01T00:00:00Z',
            source: Ref.make(subscription),
          }),
        );
        yield* Feed.append(postFeed, posts);
        yield* Database.flush();

        // Set before the operation invoke below: the scripted `completeJob` call reads these lazily
        // when the model turn is consumed.
        selectedIds.artemis = posts[0].id;
        selectedIds.jwst = posts[1].id;

        const magazine = yield* Database.add(
          Magazine.make({
            name: 'The Cosmos',
            feeds: [Ref.make(subscription)],
            instructions:
              'Curate articles about space exploration and astronomy — missions, spacecraft, telescopes, and astrophysics discoveries. Exclude unrelated business, finance, or software-tooling news.',
          }),
        );
        yield* Database.flush();

        const result = yield* Operation.invoke(FeedOperation.CurateMagazine, { magazine: Ref.make(magazine) });

        // Load the curated post refs to read their titles (`ref.target` is not hydrated synchronously).
        const curatedPosts = yield* Effect.promise(() => Promise.all(magazine.posts.map((ref) => ref.load())));
        const curatedTitles = curatedPosts.map((post) => post.title);

        // The two space/astronomy posts are curated; the business + tooling posts are not.
        expect(curatedTitles).toContain(CANDIDATES[0].title);
        expect(curatedTitles).toContain(CANDIDATES[1].title);
        expect(curatedTitles).not.toContain(CANDIDATES[2].title);
        expect(curatedTitles).not.toContain(CANDIDATES[3].title);
        expect(result.curated).toBe(2);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
