//
// Copyright 2026 DXOS.org
//

import type { MessageResponse } from 'dfx/types';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, expect, test } from 'vitest';

import {
  AgentRegistry,
  Source,
  type Stage,
  type Type,
  extractTopics,
  listFacts,
  makeAgentProfileStage,
  makeExtractFactsStage,
  run,
} from '@dxos/crawler';
import { servicesLayer } from '@dxos/crawler/testing';
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
      const config: Type.Config = { channels: [channelId!], descendThreads: true };
      const stages: Stage[] = [makeAgentProfileStage(), makeExtractFactsStage()];
      const layer = Layer.merge(discordSourceLayer(token!), servicesLayer);

      // Set DISCORD_LIST_FACTS=1 to dump every extracted fact after processing.
      const dumpFacts = Boolean(process.env.DISCORD_LIST_FACTS);

      const { summary, agents, report, facts } = await EffectEx.runPromise(
        Effect.gen(function* () {
          const summary = yield* run(config, stages);
          const registry = yield* AgentRegistry;
          const agents = yield* registry.list();
          const report = yield* extractTopics({ limit: 15 });
          const facts = dumpFacts ? yield* listFacts() : [];
          return { summary, agents, report, facts };
        }).pipe(Effect.provide(layer)),
      );

      console.log(
        `\nCrawled ${summary.steps} steps — ${agents.length} agents, ${report.factCount} facts` +
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

      // The run always completes cleanly; inaccessible channels are skipped, not fatal.
      expect(summary.done).toBe(true);
      // Only assert content when at least one channel was actually readable.
      if (summary.errored === 0) {
        expect(report.factCount).toBeGreaterThan(0);
      }
    },
    60_000,
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
