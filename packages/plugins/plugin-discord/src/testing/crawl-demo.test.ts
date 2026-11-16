//
// Copyright 2026 DXOS.org
//

// Live crawl demo (node): seeds a set of Discord channels and runs the basic pipeline into persistent SQLite
// files — messages and crawl state in one, the RDF fact store in another — so subsequent runs resume, extracting
// facts only from messages not yet committed, and the questions demo replays over the messages.
// Each DISCORD_CRAWL_CHANNELS entry is `id` or `id:days`, the latter overriding DISCORD_MAX_DAYS for that channel. A
// channel's lookback applies only while it has no cursor, so to reach further back on one already crawled, list it in
// DISCORD_CRAWL_REWIND: it restarts from its lookback window, and messages already stored are skipped.
//   DISCORD_TOKEN=…  [DISCORD_CRAWL_CHANNELS=id[:days],…] [DISCORD_CRAWL_REWIND=id,…] [DISCORD_CRAWL_DB=path]
//   [DISCORD_FACTS_DB=path] [DISCORD_MAX_DAYS=30] [DISCORD_CRAWL_TIMEOUT_MIN=60] [DISCORD_LIST_FACTS=1]
//   [DISCORD_TRACE_LOG=path] [DX_ANTHROPIC_API_KEY=…]  moon run plugin-discord:crawl-demo
// Every model call is metered: the run prints its cost and appends its trace to DISCORD_TRACE_LOG (JSON lines).

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import type * as ConfigError from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, test } from 'vitest';

import { type AiService } from '@dxos/ai';
import { DirectAiServiceLayer } from '@dxos/ai/testing';
import { AgentRegistry, StateStore, listFacts } from '@dxos/crawler';
import { deterministicAiService } from '@dxos/crawler/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DiscordPipeline, MessageStore } from '@dxos/pipeline-discord';
import { storesLayer } from '@dxos/pipeline-discord/testing';
import { FactStoreLive } from '@dxos/pipeline-rdf';

import { discordSourceLayer } from '../services/index.ts';
import { costReport, meter } from './metering.ts';
import { extractOptionsFromEnv } from './vocabularies.ts';

const token = process.env.DISCORD_TOKEN;
// Defaults: DXOS #general, #composer-vip, #dxos-team.
const list = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
const entries = list(
  process.env.DISCORD_CRAWL_CHANNELS ?? '837138313172353098,1364277975645945948,837690136044503110',
).map((entry) => {
  const [id, days] = entry.split(':');
  return { id, ...(days ? { maxDays: Number(days) } : {}) };
});
const channels = entries.map(({ id }) => id);
const channelSettings = Object.fromEntries(
  entries.flatMap(({ id, maxDays }) => (maxDays === undefined ? [] : [[id, { maxDays }] as const])),
);
const rewind = list(process.env.DISCORD_CRAWL_REWIND);
const timeoutMinutes = Number(process.env.DISCORD_CRAWL_TIMEOUT_MIN ?? 60);
const dbPath = process.env.DISCORD_CRAWL_DB ?? join(tmpdir(), 'dxos-discord-crawl.db');
// A file of its own: the fact store needs synchronous SQLite (`node:sqlite`), a different driver from the stores' client.
const factsPath = process.env.DISCORD_FACTS_DB ?? join(tmpdir(), 'dxos-discord-facts.db');
const tracePath = process.env.DISCORD_TRACE_LOG ?? join(dirname(dbPath), 'dxos-discord-trace.jsonl');
const dumpFacts = Boolean(process.env.DISCORD_LIST_FACTS);
// SQLite creates the file but not its directory, and a configured location may not exist yet.
for (const path of [dbPath, factsPath]) {
  mkdirSync(dirname(path), { recursive: true });
}
const maxDays = Number(process.env.DISCORD_MAX_DAYS ?? 30);
const useRealLlm = Boolean(process.env.DX_ANTHROPIC_API_KEY);

const DISCORD_API = 'https://discord.com/api/v10';
/** View Channels + Read Message History: all a read-only crawl needs. */
const READ_PERMISSIONS = 66560;

type Access = { readonly bot: string; readonly invite: string; readonly denied: readonly string[] };

/**
 * Asks Discord which seed channels the bot can open, so a bot missing from the server (or from a private channel)
 * stops the demo with an invite link instead of marking every channel errored.
 */
const checkAccess = async (botToken: string): Promise<Access> => {
  const get = (path: string) => fetch(`${DISCORD_API}/${path}`, { headers: { Authorization: `Bot ${botToken}` } });
  const app = await get('oauth2/applications/@me');
  if (!app.ok) {
    throw new Error(`Discord rejected the bot token (HTTP ${app.status}).`);
  }
  const { id, name }: { id: string; name: string } = await app.json();
  const statuses = await Promise.all(
    channels.map(async (channel) => ({ channel, ok: (await get(`channels/${channel}`)).ok })),
  );
  return {
    bot: name,
    invite: `https://discord.com/oauth2/authorize?client_id=${id}&scope=bot&permissions=${READ_PERMISSIONS}`,
    denied: statuses.filter((status) => !status.ok).map((status) => status.channel),
  };
};

describe('crawl demo', () => {
  test.skipIf(!token)(
    'crawls the seed channels into the SQLite working set',
    async ({ expect, skip }) => {
      const access = await checkAccess(token!);
      if (access.denied.length > 0) {
        console.log(
          `\nBot "${access.bot}" cannot read ${access.denied.length}/${channels.length} channel(s): ${access.denied.join(', ')}`,
        );
        console.log(`Add it to the server (needs Manage Server), then grant its role access to private channels:`);
        console.log(`  ${access.invite}\n`);
        skip(`bot "${access.bot}" lacks access to ${access.denied.join(', ')}`);
      }

      const aiLayer: Layer.Layer<AiService.AiService, ConfigError.ConfigError> = useRealLlm
        ? DirectAiServiceLayer
        : deterministicAiService();
      const metering = meter(aiLayer, tracePath);
      const layer = Layer.mergeAll(
        storesLayer(SqliteClient.layer({ filename: dbPath }).pipe(Layer.orDie), FactStoreLive.layerFile(factsPath)),
        discordSourceLayer(token!),
        metering.layer,
      );
      const result = await EffectEx.runPromise(
        Effect.gen(function* () {
          if (rewind.length > 0) {
            yield* StateStore.resetTargets(rewind);
          }
          const before = yield* MessageStore.count();
          const summary = yield* DiscordPipeline.run(
            {
              channels,
              descendThreads: true,
              seed: { maxDays },
              channelSettings,
            },
            { extract: extractOptionsFromEnv() },
          );
          const stored = yield* MessageStore.count();
          const agents = yield* AgentRegistry.list();
          const targets = yield* StateStore.listTargets();
          const facts = yield* listFacts();
          return { summary, stored, added: stored - before, agents, targets, facts };
        }).pipe(Effect.provide(layer)),
      );

      console.log(`\nExtractor: ${useRealLlm ? 'LLM (claude-haiku-5-5)' : 'deterministic (no LLM)'}`);
      console.log(`db:       ${dbPath}`);
      console.log(`channels: ${channels.join(', ')}`);
      console.log(
        `steps:    ${result.summary.steps}  done: ${result.summary.done}  errored: ${result.summary.errored}`,
      );
      console.log(`facts db: ${factsPath}`);
      console.log(`messages: ${result.stored}`);
      console.log(`facts:    ${result.facts.length}`);
      console.log(`targets:  ${result.targets.map((target) => `${target.id}(${target.status})`).join(', ')}`);
      console.log(`agents:   ${result.agents.length}`);
      console.log(`trace:    ${tracePath}`);
      for (const line of costReport(metering.events(), result.added)) {
        console.log(line);
      }
      for (const agent of result.agents.slice(0, 10)) {
        console.log(`  ${String(agent.messageCount).padStart(4)}  ${agent.label ?? agent.id}`);
      }
      if (dumpFacts) {
        console.log(`\nFacts (${result.facts.length}):`);
        for (const fact of result.facts) {
          console.log(`  ${fact.agent ?? '?'}  ${fact.subject} —${fact.predicate}→ ${fact.object}   (${fact.source})`);
        }
      }

      expect(result.summary.done).toBe(true);
      expect(result.stored).toBeGreaterThan(0);
    },
    // A long lookback can outlast this; the crawl resumes from its cursors on the next run.
    timeoutMinutes * 60_000,
  );
});
