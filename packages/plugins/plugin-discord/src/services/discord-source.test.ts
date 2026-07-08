//
// Copyright 2026 DXOS.org
//

import type { MessageResponse } from 'dfx/types';
import type * as ConfigError from 'effect/ConfigError';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, expect, test } from 'vitest';

import { type AiService } from '@dxos/ai';
import { DirectAiServiceLayer } from '@dxos/ai/testing';
import {
  AgentRegistry,
  Crawler,
  Source,
  type Type,
  agentProfileStage,
  extractFactsStage,
  extractTopics,
  listFacts,
} from '@dxos/crawler';
import { Pipeline } from '@dxos/pipeline';
import { coreLayer, deterministicAiService } from '@dxos/crawler/testing';
import { EffectEx } from '@dxos/effect';

import { discordSourceLayer, mapDiscordMessage, threadRefsOf } from './discord-source';

// Test fixture: only the fields the mapper reads are populated (the full MessageResponse is large).
const sample = (over: Record<string, unknown> = {}): MessageResponse =>
  ({
    id: '1',
    type: 0,
    content: 'hi',
    timestamp: '2026-01-01T00:00:00.000Z',
    author: { id: 'u1', username: 'alice', global_name: 'Alice' },
    ...over,
  }) as unknown as MessageResponse;

describe('DiscordSource mapping', () => {
  test('maps a raw message, preserving the stable author id', () => {
    const message = mapDiscordMessage(
      sample({ id: '42', content: 'DXOS rocks', author: { id: 'u9', username: 'bob', global_name: 'Bob' } }),
    );
    expect(message?.id).toBe('42');
    expect(message?.author.id).toBe('u9');
    expect(message?.author.source).toBe('discord');
    expect(message?.author.displayName).toBe('Bob');
    expect(message?.text).toBe('DXOS rocks');
  });

  test('normalizes mention markup so raw channel/user ids never reach extraction', () => {
    const message = mapDiscordMessage(
      sample({
        content: 'Thread automatically created by <@900> in <#837690136044503110>',
        mentions: [{ id: '900', username: 'dmaretskyi', global_name: 'Dima' }],
      }),
    );
    expect(message?.text).toBe('Thread automatically created by @Dima in');
    expect(message?.text).not.toContain('837690136044503110');
  });

  test('falls back to username when global_name is absent', () => {
    const message = mapDiscordMessage(sample({ author: { id: 'u2', username: 'carol', global_name: null } }));
    expect(message?.author.displayName).toBe('carol');
  });

  test('captures the reply parent for REPLY messages', () => {
    const message = mapDiscordMessage(sample({ type: 19, referenced_message: { id: '7' } }));
    expect(message?.parentId).toBe('7');
  });

  test('skips system messages (non DEFAULT/REPLY)', () => {
    expect(mapDiscordMessage(sample({ type: 7 }))).toBeUndefined();
  });

  test('extracts thread refs from messages that spawned threads', () => {
    const refs = threadRefsOf([sample({ id: '5', thread: { id: 't5', name: 'Topic' } }), sample({ id: '6' })]);
    expect(refs).toEqual([{ threadId: 't5', parentMessageId: '5', name: 'Topic' }]);
  });
});

// Live end-to-end crawl. Skipped unless a token + channel id are provided.
//   DISCORD_TOKEN=... DISCORD_CHANNEL_ID=... moon run plugin-discord:test -- discord-source
const token = process.env.DISCORD_TOKEN;
const channelId = process.env.DISCORD_CHANNEL_ID;

describe('DiscordSource live crawl', () => {
  test.skipIf(!(token && channelId))(
    'crawls a real channel into the fact graph and surfaces topics',
    async () => {
      // Real LLM extraction makes one call PER message, so bound the lookback (DISCORD_MAX_DAYS,
      // default 7) to keep the run tractable; widen it for a deeper crawl. DISCORD_THREADS=0 skips threads.
      const maxDays = Number(process.env.DISCORD_MAX_DAYS ?? 7);
      const descendThreads = process.env.DISCORD_THREADS !== '0';
      const config: Type.Config = { channels: [channelId!], descendThreads, seed: { maxDays } };

      // Real LLM extraction (attributed S-P-O + valence) when an Anthropic key is set; otherwise the
      // deterministic proper-noun stand-in. DirectAiServiceLayer reads DX_ANTHROPIC_API_KEY.
      const useRealLlm = Boolean(process.env.DX_ANTHROPIC_API_KEY);
      const aiLayer: Layer.Layer<AiService.AiService, ConfigError.ConfigError> = useRealLlm
        ? DirectAiServiceLayer
        : deterministicAiService();
      const layer = Layer.mergeAll(discordSourceLayer(token!), coreLayer, aiLayer);

      // Set DISCORD_LIST_FACTS=1 to dump every extracted fact after processing.
      const dumpFacts = Boolean(process.env.DISCORD_LIST_FACTS);
      console.log(
        `\nExtractor: ${useRealLlm ? 'LLM (claude-haiku-4-5)' : 'deterministic (no LLM)'}` +
          `  ·  lookback ${maxDays}d  ·  threads ${descendThreads ? 'on' : 'off'}`,
      );

      const { summary, agents, report, facts } = await EffectEx.runPromise(
        Effect.gen(function* () {
          yield* Crawler.stream(config).pipe(
            agentProfileStage(),
            extractFactsStage(),
            Pipeline.run({ sink: Crawler.commit }),
          );
          const summary = yield* Crawler.summarize();
          const registry = yield* AgentRegistry;
          const agents = yield* registry.list();
          const report = yield* extractTopics({ limit: 15 });
          const facts = dumpFacts ? yield* listFacts() : [];
          return { summary, agents, report, facts };
        }).pipe(Effect.provide(layer)),
      );

      console.log(
        `\nCrawled — ${agents.length} agents, ${report.factCount} facts` +
          (summary.errored > 0 ? ` (${summary.errored} channel(s) skipped — no access)` : ''),
      );
      for (const topic of report.topics) {
        console.log(`  ${topic.label}  (agents ${topic.agents}, mentions ${topic.mentions})`);
      }
      if (dumpFacts) {
        console.log(`\nFacts (${facts.length}):`);
        for (const fact of facts) {
          console.log(`  ${fact.agent ?? '?'}  ${fact.subject} —${fact.predicate}→ ${fact.object}   (${fact.source})`);
        }
      }

      // A clean completion is the smoke signal. Content depends on activity in the lookback window —
      // a quiet channel legitimately yields zero facts, so hint rather than fail.
      expect(summary.done).toBe(true);
      if (report.factCount === 0) {
        console.log(
          `No facts in the last ${maxDays}d (${agents.length} agents seen). Widen with DISCORD_MAX_DAYS=<n>.`,
        );
      }
    },
    // Real LLM extraction is one call per message; allow headroom (tune lookback to fit).
    300_000,
  );
});

// Channel discovery. Skipped unless a token is provided. Backs `moon run plugin-discord:channels`.
//   DISCORD_TOKEN=... moon run plugin-discord:channels
describe('DiscordSource channels', () => {
  test.skipIf(!token)(
    'lists channels the bot can access',
    async () => {
      const channels = await EffectEx.runPromise(
        Effect.gen(function* () {
          const source = yield* Source;
          return yield* source.listChannels();
        }).pipe(Effect.provide(discordSourceLayer(token!))),
      );

      console.log(`\n${channels.length} channel(s) visible to the bot:`);
      for (const channel of channels) {
        console.log(`  ${channel.id}  ${channel.name ?? ''}`);
      }

      expect(Array.isArray(channels)).toBe(true);
    },
    30_000,
  );
});
