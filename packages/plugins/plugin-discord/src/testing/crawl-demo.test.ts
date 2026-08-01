//
// Copyright 2026 DXOS.org
//

// Live crawl demo (node): seeds a set of Discord channels and runs the basic pipeline into a
// persistent SQLite file, so subsequent runs resume and the questions demo replays over it.
//   DISCORD_TOKEN=…  [DISCORD_CRAWL_CHANNELS=id,id,…] [DISCORD_CRAWL_DB=path] [DISCORD_MAX_DAYS=30]
//   moon run plugin-discord:crawl-demo

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { AgentRegistry, StateStore } from '@dxos/crawler';
import { deterministicAiService } from '@dxos/crawler/testing';
import { EffectEx } from '@dxos/effect';
import { DiscordPipeline, MessageStore } from '@dxos/pipeline-discord';
import { storesLayer } from '@dxos/pipeline-discord/testing';

import { discordSourceLayer } from '../services';

const token = process.env.DISCORD_TOKEN;
// Defaults: DXOS #general, #composer-vip, #dxos-team.
const channels = (process.env.DISCORD_CRAWL_CHANNELS ?? '837138313172353098,1364277975645945948,837690136044503110')
  .split(',')
  .map((id) => id.trim())
  .filter((id) => id.length > 0);
const dbPath = process.env.DISCORD_CRAWL_DB ?? join(tmpdir(), 'dxos-discord-crawl.db');
const maxDays = Number(process.env.DISCORD_MAX_DAYS ?? 30);

describe('crawl demo', () => {
  test.skipIf(!token)(
    'crawls the seed channels into the SQLite working set',
    async ({ expect }) => {
      const layer = Layer.mergeAll(
        storesLayer(SqliteClient.layer({ filename: dbPath }).pipe(Layer.orDie)),
        discordSourceLayer(token!),
        deterministicAiService(),
      );
      const result = await EffectEx.runPromise(
        Effect.gen(function* () {
          const summary = yield* DiscordPipeline.run({ channels, descendThreads: true, seed: { maxDays } });
          const stored = yield* (yield* MessageStore).count();
          const agents = yield* (yield* AgentRegistry).list();
          const targets = yield* (yield* StateStore).listTargets();
          return { summary, stored, agents, targets };
        }).pipe(Effect.provide(layer)),
      );

      console.log(`\ndb:       ${dbPath}`);
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
