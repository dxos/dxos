//
// Copyright 2026 DXOS.org
//

// Live crawl demo (node): seeds a set of Discord channels and runs the basic pipeline into a
// persistent SQLite file, so subsequent runs resume and the questions demo replays over it.
//   DISCORD_TOKEN=…  [DISCORD_CRAWL_CHANNELS=id,id,…] [DISCORD_CRAWL_DB=path] [DISCORD_MAX_DAYS=30]
//   [DX_ANTHROPIC_API_KEY=…]  moon run plugin-discord:crawl-demo

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import type * as ConfigError from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { type AiService } from '@dxos/ai';
import { DirectAiServiceLayer } from '@dxos/ai/testing';
import { AgentRegistry, StateStore } from '@dxos/crawler';
import { deterministicAiService } from '@dxos/crawler/testing';
import { EffectEx } from '@dxos/effect';
import { DiscordPipeline, MessageStore } from '@dxos/pipeline-discord';
import { storesLayer } from '@dxos/pipeline-discord/testing';

import { discordSourceLayer } from '../services/index.ts';

const token = process.env.DISCORD_TOKEN;
// Defaults: DXOS #general, #composer-vip, #dxos-team.
const channels = (process.env.DISCORD_CRAWL_CHANNELS ?? '837138313172353098,1364277975645945948,837690136044503110')
  .split(',')
  .map((id) => id.trim())
  .filter((id) => id.length > 0);
const dbPath = process.env.DISCORD_CRAWL_DB ?? join(tmpdir(), 'dxos-discord-crawl.db');
const maxDays = Number(process.env.DISCORD_MAX_DAYS ?? 30);
const useRealLlm = Boolean(process.env.DX_ANTHROPIC_API_KEY);

describe('crawl demo', () => {
  test.skipIf(!token)(
    'crawls the seed channels into the SQLite working set',
    async ({ expect }) => {
      const aiLayer: Layer.Layer<AiService.AiService, ConfigError.ConfigError> = useRealLlm
        ? DirectAiServiceLayer
        : deterministicAiService();
      const layer = Layer.mergeAll(
        storesLayer(SqliteClient.layer({ filename: dbPath }).pipe(Layer.orDie)),
        discordSourceLayer(token!),
        aiLayer,
      );
      const result = await EffectEx.runPromise(
        Effect.gen(function* () {
          const summary = yield* DiscordPipeline.run({ channels, descendThreads: true, seed: { maxDays } });
          const stored = yield* MessageStore.count();
          const agents = yield* AgentRegistry.list();
          const targets = yield* StateStore.listTargets();
          return { summary, stored, agents, targets };
        }).pipe(Effect.provide(layer)),
      );

      console.log(`\nExtractor: ${useRealLlm ? 'LLM (claude-haiku-4-5)' : 'deterministic (no LLM)'}`);
      console.log(`db:       ${dbPath}`);
      console.log(`channels: ${channels.join(', ')}`);
      console.log(
        `steps:    ${result.summary.steps}  done: ${result.summary.done}  errored: ${result.summary.errored}`,
      );
      console.log(`messages: ${result.stored}`);
      console.log(`targets:  ${result.targets.map((target) => `${target.id}(${target.status})`).join(', ')}`);
      console.log(`agents:   ${result.agents.length}`);
      for (const agent of result.agents.slice(0, 10)) {
        console.log(`  ${String(agent.messageCount).padStart(4)}  ${agent.label ?? agent.id}`);
      }

      expect(result.summary.done).toBe(true);
      expect(result.stored).toBeGreaterThan(0);
    },
    600_000,
  );
});
