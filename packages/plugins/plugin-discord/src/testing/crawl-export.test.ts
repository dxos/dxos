//
// Copyright 2026 DXOS.org
//

// Runs the basic Discord pipeline over a DiscordChatExporter JSON export (one file per channel/thread), rather than
// a live crawl, into persistent SQLite files so subsequent runs resume and extract only messages not yet committed.
// Bots and webhooks (e.g. the #github feed) are skipped. The classic LLM extractor runs when DX_ANTHROPIC_API_KEY is
// set (model: pipeline-rdf DEFAULT_MODEL, currently Claude Haiku 5.5), otherwise a deterministic no-LLM extractor.
// Every model call is metered: the run prints its cost at catalog list prices, and appends its trace to
// DISCORD_TRACE_LOG (JSON lines, next to the databases) so the cost of past runs can be queried.
//   [DISCORD_EXPORT_DIR=~/.local/share/dxos/discord-export/effect]
//   [DISCORD_CRAWL_DB=…] [DISCORD_FACTS_DB=…] [DISCORD_TRACE_LOG=…] [DISCORD_VOCABULARIES=all|none|schema,foaf,…]
//   [DISCORD_CLOSED_ONTOLOGY=1]
//   [DISCORD_LIST_FACTS=1] [DX_ANTHROPIC_API_KEY=…]  moon run plugin-discord:crawl-export
//
// The export dir default is unset in CI (runInCI: false); without it the test skips.

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import type * as ConfigError from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, test } from 'vitest';

import { type AiService } from '@dxos/ai';
import { DirectAiServiceLayer } from '@dxos/ai/testing';
import { AgentRegistry, listFacts } from '@dxos/crawler';
import { deterministicAiService } from '@dxos/crawler/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DiscordPipeline, MessageStore } from '@dxos/pipeline-discord';
import { storesLayer } from '@dxos/pipeline-discord/testing';
import { FactStoreLive } from '@dxos/pipeline-rdf';

import { exportChannelIds, exportSourceLayer } from './export-source.ts';
import { costReport, meter } from './metering.ts';
import { extractOptionsFromEnv } from './vocabularies.ts';

const defaultDir = join(homedir(), '.local/share/dxos/discord-export/effect');
const dir = process.env.DISCORD_EXPORT_DIR ?? (existsSync(defaultDir) ? defaultDir : undefined);
const base = join(homedir(), '.local/share/dxos/discord-pipeline/effect');
const dbPath = process.env.DISCORD_CRAWL_DB ?? join(base, 'crawl.db');
// A file of its own: the fact store needs synchronous SQLite (`node:sqlite`), a different driver from the stores' client.
const factsPath = process.env.DISCORD_FACTS_DB ?? join(base, 'facts.db');
const tracePath = process.env.DISCORD_TRACE_LOG ?? join(dirname(dbPath), 'trace.jsonl');
const dumpFacts = Boolean(process.env.DISCORD_LIST_FACTS);
const useRealLlm = Boolean(process.env.DX_ANTHROPIC_API_KEY);

describe('crawl export', () => {
  test.skipIf(!dir)(
    'runs the basic pipeline over an exported corpus into the SQLite working set',
    async ({ expect }) => {
      // SQLite creates the file but not its directory, and a configured location may not exist yet.
      for (const path of [dbPath, factsPath]) {
        mkdirSync(dirname(path), { recursive: true });
      }
      const channels = exportChannelIds(dir!);

      const aiLayer: Layer.Layer<AiService.AiService, ConfigError.ConfigError> = useRealLlm
        ? DirectAiServiceLayer
        : deterministicAiService();
      const metering = meter(aiLayer, tracePath);
      const layer = Layer.mergeAll(
        storesLayer(SqliteClient.layer({ filename: dbPath }).pipe(Layer.orDie), FactStoreLive.layerFile(factsPath)),
        exportSourceLayer(dir!),
        metering.layer,
      );

      const result = await EffectEx.runPromise(
        Effect.gen(function* () {
          const before = yield* MessageStore.count();
          const summary = yield* DiscordPipeline.run(
            { channels, descendThreads: false, seed: {} },
            { extract: extractOptionsFromEnv() },
          );
          const stored = yield* MessageStore.count();
          const agents = yield* AgentRegistry.list();
          const facts = yield* listFacts();
          return { summary, stored, added: stored - before, agents, facts };
        }).pipe(Effect.provide(layer)),
      );

      console.log(`\nExtractor: ${useRealLlm ? 'LLM (claude-haiku-5-5)' : 'deterministic (no LLM)'}`);
      console.log(`export:   ${dir}`);
      console.log(`ontology: ${process.env.DISCORD_VOCABULARIES ?? 'all vocabularies (default)'}`);
      console.log(`channels: ${channels.length}`);
      console.log(`db:       ${dbPath}`);
      console.log(`facts db: ${factsPath}`);
      console.log(
        `steps:    ${result.summary.steps}  done: ${result.summary.done}  errored: ${result.summary.errored}`,
      );
      console.log(`messages: ${result.stored} (${result.added} new)`);
      console.log(`facts:    ${result.facts.length}`);
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
    60 * 60_000,
  );
});
