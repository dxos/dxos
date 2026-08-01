//
// Copyright 2026 DXOS.org
//

// End-to-end smoke test over the REAL captured Discord fixture, doubling as the runnable demo:
//   moon run crawler:demo
// It crawls the fixture with the deterministic (no-token) extractor, builds the fact graph, and
// prints agents + topics + a sample query (the bridge from "topics discussed" to "ask the system").

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Ref from 'effect/Ref';
import { readFileSync } from 'node:fs';
import { expect } from 'vitest';

import { Pipeline } from '@dxos/pipeline';
import { FactStore } from '@dxos/pipeline-rdf';

import { AgentRegistry } from './AgentRegistry';
import * as Crawler from './Crawler';
import { agentProfileStage } from './stages/agent-profile';
import { extractFactsStage } from './stages/extract-facts';
import { extractTopics } from './stages/topics';
import { type Fixture, TestLayer } from './testing';
import type * as Type from './types';

const FIXTURE_URL = new URL('../../pipeline-rdf/src/testing/discord-messages.json', import.meta.url);
const fixture: Fixture = JSON.parse(readFileSync(FIXTURE_URL, 'utf8'));

const heading = (text: string) => `\n\x1b[1m${text}\x1b[0m`;

describe('demo', () => {
  it.effect(
    'crawls the real Discord fixture and reports agents + topics',
    Effect.fnUntraced(
      function* () {
        const config: Type.Config = { channels: [fixture.state.channelId], descendThreads: true };
        const steps = yield* Ref.make(0);
        yield* Crawler.stream(config, { steps }).pipe(
          agentProfileStage(),
          extractFactsStage(),
          Pipeline.run({ sink: Crawler.commit }),
        );
        const summary = { ...(yield* Crawler.summarize()), steps: yield* Ref.get(steps) };

        const registry = yield* AgentRegistry;
        const store = yield* FactStore;

        const agents = yield* registry.list();
        const facts = yield* store.query({});
        const report = yield* extractTopics({ limit: 15 });
        const top = report.topics[0];
        const about = top ? yield* store.query({ entity: top.entity }) : [];

        yield* Effect.sync(() => {
          console.log(heading('Crawl'));
          console.log(`  channel:  ${fixture.state.channelId}`);
          console.log(`  steps:    ${summary.steps}  (${summary.done ? 'done' : 'paused'})`);
          console.log(`  messages: ${fixture.messages.length}  threads: ${fixture.threads?.length ?? 0}`);
          console.log(`  facts:    ${facts.length}`);

          console.log(heading(`Agents (${agents.length})`));
          for (const agent of agents) {
            const window = [agent.firstSeen, agent.lastSeen].filter(Boolean).join(' … ') || 'n/a';
            console.log(`  ${String(agent.messageCount).padStart(3)}  ${agent.label ?? agent.id}   [${window}]`);
          }

          console.log(heading(`Topics (${report.topics.length})`));
          console.log(`  ${'topic'.padEnd(22)} agents  mentions`);
          for (const topic of report.topics) {
            console.log(
              `  ${topic.label.padEnd(22)} ${String(topic.agents).padStart(6)}  ${String(topic.mentions).padStart(8)}`,
            );
          }

          if (top) {
            console.log(heading(`Query: facts mentioning "${top.label}" (${about.length})`));
            for (const fact of about.slice(0, 8)) {
              const object =
                'entity' in fact.assertion.object ? fact.assertion.object.entity : fact.assertion.object.literal;
              console.log(
                `  ${fact.attribution.agent ?? '?'}  —${fact.assertion.predicate}→  ${object}   (${fact.attribution.source})`,
              );
            }
          }
        });

        // Smoke assertions over real data.
        expect(summary.done).toBe(true);
        expect(agents.length).toBeGreaterThan(0);
        expect(facts.length).toBeGreaterThan(0);
        expect(report.topics.length).toBeGreaterThan(0);
      },
      Effect.provide(TestLayer(fixture)),
    ),
  );
});
