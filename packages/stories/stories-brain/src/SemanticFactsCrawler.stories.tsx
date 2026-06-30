//
// Copyright 2026 DXOS.org
//

/// <reference types="vite/client" />

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import {
  AgentRegistry,
  type ChannelInfo,
  type Profile,
  Source,
  type Stage,
  StateStore,
  makeAgentProfileStage,
  makeExtractFactsStage,
  run,
} from '@dxos/crawler';
import { EffectEx } from '@dxos/effect';
import { discordSourceLayer } from '@dxos/plugin-discord';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { SemanticStore, type Type, parseSparqlToQuery } from '@dxos/semantic-index';

import { AgentList } from './AgentList';
import { type CrawlAction, CrawlOptions, CrawlPanel, initialOptions } from './CrawlPanel';
import { SemanticFactsViewer } from './SemanticFactsViewer';

const CRAWL_STAGES: Stage[] = [makeAgentProfileStage(), makeExtractFactsStage()];

const makeStore = () => ManagedRuntime.make(SemanticStore.layerMemory);

// Browser persistence: the semantic store runs in-memory (OPFS SQLite is worker-only, so it can't run
// on the storybook main thread), and the extracted facts + resolved agents are snapshotted to
// localStorage — rehydrated on mount and re-saved after each crawl, so both survive reloads.
const FACTS_STORAGE_KEY = 'dxos.crawler.facts';
const AGENTS_STORAGE_KEY = 'dxos.crawler.agents';
const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Over quota — skip the snapshot.
  }
};

// Filter facts to a single agent's attributions (`attribution.agent` is the canonical token); an
// undefined selection means "no filter".
const factsForAgent = (facts: Type.Fact[], agent?: string): Type.Fact[] =>
  agent == null ? facts : facts.filter((fact) => fact.attribution.agent === agent);

type StoryArgs = {};

/**
 * Drive the crawler from the browser: enter a Discord bot token + options, list the channels the bot
 * can read, choose one, crawl it through the pipeline (edge LLM extraction), view the facts, and
 * filter them by the resolved agents (third column). Composed from {@link CrawlPanel},
 * {@link SemanticFactsViewer} and {@link AgentList}.
 */
const DefaultStory = (_: StoryArgs) => {
  const [options, setOptions] = useState<CrawlOptions>(initialOptions);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [facts, setFacts] = useState<Type.Fact[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<CrawlAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleFacts = useMemo(() => factsForAgent(facts, selectedAgent), [facts, selectedAgent]);

  // Stable in-memory store across crawls; recreated if disposed (StrictMode remount).
  const storeRef = useRef<ReturnType<typeof makeStore> | null>(null);
  const getStore = () => (storeRef.current ??= makeStore());
  useEffect(
    () => () => {
      void storeRef.current?.dispose();
      storeRef.current = null;
    },
    [],
  );

  // Rehydrate persisted facts into the store + view on mount, plus the agent column snapshot.
  useEffect(() => {
    const rawFacts = localStorage.getItem(FACTS_STORAGE_KEY);
    if (rawFacts) {
      try {
        const saved: Type.Fact[] = JSON.parse(rawFacts);
        void getStore()
          .runPromise(SemanticStore.pipe(Effect.flatMap((store) => store.putFacts(saved))))
          .then(() => setFacts(saved));
      } catch {
        // Ignore a malformed snapshot.
      }
    }
    const rawAgents = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (rawAgents) {
      try {
        setAgents(JSON.parse(rawAgents));
      } catch {
        // Ignore a malformed snapshot.
      }
    }
  }, []);

  const guard = async (action: CrawlAction, task: () => Promise<void>) => {
    setBusy(action);
    setError(null);
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  // Enumerate the channels the bot can access (the source layer is rebuilt per call with the token).
  const handleListChannels = () =>
    void guard('channels', async () => {
      const result = await EffectEx.runPromise(
        Source.pipe(Effect.flatMap((source) => source.listChannels())).pipe(
          Effect.provide(discordSourceLayer(options.token)),
        ),
      );
      setChannels(result);
      // Default to the first channel if none selected yet.
      setOptions((prev) => ({ ...prev, channel: prev.channel || (result[0]?.id ?? '') }));
      setStatus(`${result.length} channel(s) visible`);
    });

  // Crawl the selected channel through the pipeline, then read the resulting facts from the store.
  const handleCrawl = () => {
    if (!options.channel) {
      return;
    }

    void guard('crawl', async () => {
      // Per-crawl frontier + agents + edge LLM; the SemanticStore comes from the persistent runtime so
      // facts accumulate across crawls. `Layer.fresh` on the AI layer is REQUIRED: the Discord source
      // provides a CORS-proxy FetchHttpClient.Fetch, and Effect memoizes the shared FetchHttpClient
      // layer — without fresh, the edge-AI client inherits the proxy and routes LLM calls through
      // cors-proxy (→ 404). Fresh gives the AI its own direct fetch.
      const perCrawl = Layer.mergeAll(
        discordSourceLayer(options.token),
        StateStore.layerMemory,
        AgentRegistry.layerMemory,
        Layer.fresh(AiServiceTestingPreset('edge-remote')),
      );
      const result = await getStore().runPromise(
        Effect.gen(function* () {
          const summary = yield* run(
            { channels: [options.channel], descendThreads: options.descendThreads, seed: { maxDays: options.maxDays } },
            CRAWL_STAGES,
          );
          const registry = yield* AgentRegistry;
          const crawled = yield* registry.list();
          const store = yield* SemanticStore;
          const extracted = yield* store.query({});
          // Every message is observed by the agent-profile stage, so the summed counts == messages seen.
          const messages = crawled.reduce((total, agent) => total + agent.messageCount, 0);
          return { summary, messages, agents: crawled, facts: extracted };
        }).pipe(Effect.provide(perCrawl)),
      );
      setFacts(result.facts);
      setAgents(result.agents);
      save(FACTS_STORAGE_KEY, result.facts);
      save(AGENTS_STORAGE_KEY, result.agents);
      const skipped = result.summary.errored > 0 ? ` · ${result.summary.errored} skipped` : '';
      setStatus(
        result.messages === 0 && result.summary.errored === 0
          ? `No messages in the last ${options.maxDays}d — widen the lookback.`
          : `Crawled ${result.messages} messages · ${result.agents.length} agents · ${result.facts.length} facts${skipped}`,
      );
    });
  };

  // Clear the persisted facts + agents (store + snapshots) and the current selection.
  const handleReset = () =>
    void guard('reset', async () => {
      await getStore().runPromise(SemanticStore.pipe(Effect.flatMap((store) => store.clear())));
      localStorage.removeItem(FACTS_STORAGE_KEY);
      localStorage.removeItem(AGENTS_STORAGE_KEY);
      setFacts([]);
      setAgents([]);
      setSelectedAgent(undefined);
      setStatus('Cleared persisted facts.');
    });

  // Parse the SPARQL (the form's `query` field) into a structured query and run it over the store.
  const handleRunSparql = () =>
    void guard('sparql', async () => {
      const query = parseSparqlToQuery(options.query);
      const results = await getStore().runPromise(SemanticStore.pipe(Effect.flatMap((store) => store.query(query))));
      setFacts(results);
      setStatus(`SPARQL → ${results.length} fact(s)`);
    });

  return (
    <div className='dx-container grid grid-cols-3 gap-2'>
      <CrawlPanel
        options={options}
        channels={channels}
        busy={busy}
        status={status}
        error={error}
        onValuesChanged={(next) => setOptions((prev) => ({ ...prev, ...next }))}
        onListChannels={handleListChannels}
        onCrawl={handleCrawl}
        onRunSparql={handleRunSparql}
        onReset={handleReset}
      />
      <SemanticFactsViewer facts={visibleFacts} />
      <AgentList agents={agents} selected={selectedAgent} onSelect={setSelectedAgent} />
    </div>
  );
};

// A small hand-authored corpus exercised by the in-memory variant: two agents (Alice, Bob) and the
// facts attributed to each.
const SAMPLE_AGENTS: Profile[] = [
  { id: 'alice', label: 'Alice', identifiers: [{ namespace: 'sample', value: 'alice' }], messageCount: 2 },
  { id: 'bob', label: 'Bob', identifiers: [{ namespace: 'sample', value: 'bob' }], messageCount: 2 },
];

const sampleFact = (
  id: string,
  agent: string,
  subject: string,
  predicate: string,
  object: string,
  confidence: number,
): Type.Fact => ({
  id,
  assertion: { subject: { entity: subject }, predicate, object: { entity: object } },
  valence: { factuality: 'CT+', polarity: '+', confidence },
  attribution: { agent, source: `sample:${id}`, generatedAtTime: '2026-06-29T00:00:00.000Z' },
  recordedAt: '2026-06-29T00:00:00.000Z',
  extractor: { id: 'sample', model: 'sample', version: '1' },
  sourceHash: id,
});

const SAMPLE_FACTS: Type.Fact[] = [
  sampleFact('s1', 'alice', 'alice', 'works at', 'dxos', 0.95),
  sampleFact('s2', 'alice', 'alice', 'met', 'bob', 0.8),
  sampleFact('s3', 'bob', 'bob', 'leads', 'engineering', 0.9),
  sampleFact('s4', 'bob', 'bob', 'attended', 'blueyard summit', 0.7),
];

/**
 * No crawl: seed an in-memory {@link SemanticStore} with a hand-authored Alice/Bob corpus, read the
 * facts back through it, and filter by agent. Reuses {@link SemanticFactsViewer} and {@link AgentList}
 * to show the columns are independent of the Discord pipeline.
 */
const InMemoryStory = (_: StoryArgs) => {
  const [facts, setFacts] = useState<Type.Fact[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>(undefined);

  const visibleFacts = useMemo(() => factsForAgent(facts, selectedAgent), [facts, selectedAgent]);

  const storeRef = useRef<ReturnType<typeof makeStore> | null>(null);
  const getStore = () => (storeRef.current ??= makeStore());
  useEffect(
    () => () => {
      void storeRef.current?.dispose();
      storeRef.current = null;
    },
    [],
  );

  // Seed the store once and read the facts back through it (rather than rendering the array directly).
  useEffect(() => {
    void getStore()
      .runPromise(
        Effect.gen(function* () {
          const store = yield* SemanticStore;
          yield* store.putFacts(SAMPLE_FACTS);
          return yield* store.query({});
        }),
      )
      .then(setFacts);
  }, []);

  return (
    <div className='dx-container grid grid-cols-2 gap-2'>
      <SemanticFactsViewer facts={visibleFacts} />
      <AgentList agents={SAMPLE_AGENTS} selected={selectedAgent} onSelect={setSelectedAgent} />
    </div>
  );
};

const meta = {
  title: 'stories/stories-brain/SemanticFactsCrawler',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InMemory: Story = { render: InMemoryStory };
