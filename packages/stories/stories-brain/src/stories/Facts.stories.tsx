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
  Source,
  type Stage,
  StateStore,
  makeAgentProfileStage,
  makeExtractFactsStage,
  run,
} from '@dxos/crawler';
import { EffectEx } from '@dxos/effect';
import { FactPipeline, FactStore, type RDF, buildSparql, generateQuery, parseSparqlToQuery } from '@dxos/pipeline-rdf';
import { discordSourceLayer } from '@dxos/plugin-discord';
import { FactViewer } from '@dxos/react-ui-rdf';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import {
  type CrawlAction,
  CrawlOptions,
  CrawlPanel,
  DEFAULT_SPARQL,
  EntityList,
  QueryPanel,
  entitiesFromFacts,
  initialOptions,
} from '../components';

const CRAWL_STAGES: Stage[] = [makeAgentProfileStage(), makeExtractFactsStage()];

const makeStore = () => ManagedRuntime.make(FactStore.layerMemory);

// Browser persistence: the semantic store runs in-memory (OPFS SQLite is worker-only, so it can't run
// on the storybook main thread), and the extracted facts are snapshotted to localStorage —
// rehydrated on mount and re-saved after each crawl, so they survive reloads (entities derive from them).
const FACTS_STORAGE_KEY = 'dxos.crawler.facts';
const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Over quota — skip the snapshot.
  }
};

type StoryArgs = {};

/**
 * Drive the crawler from the browser: enter a Discord bot token + options, list the channels the bot
 * can read, choose one, crawl it through the pipeline (edge LLM extraction), view the facts, and
 * scope them by the entities mentioned (third column). Composed from {@link CrawlPanel},
 * {@link FactViewer} and {@link EntityList}.
 */
const DefaultStory = (_: StoryArgs) => {
  const [options, setOptions] = useState<CrawlOptions>(initialOptions);
  const [question, setQuestion] = useState('');
  const [query, setQuery] = useState(DEFAULT_SPARQL);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  const [context, setContext] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<CrawlAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The entity column + context are derived from the facts (subjects/objects), so loaded documents
  // populate them too — not just crawled message authors.
  const entities = useMemo(() => entitiesFromFacts(facts), [facts]);

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

  // Rehydrate persisted facts into the store + view on mount (entities derive from them).
  useEffect(() => {
    const rawFacts = localStorage.getItem(FACTS_STORAGE_KEY);
    if (rawFacts) {
      try {
        const saved: RDF.Fact[] = JSON.parse(rawFacts);
        void getStore()
          .runPromise(FactStore.pipe(Effect.flatMap((store) => store.putFacts(saved))))
          .then(() => setFacts(saved));
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
      // Per-crawl frontier + agents + edge LLM; the FactStore comes from the persistent runtime so
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
          const store = yield* FactStore;
          const extracted = yield* store.query({});
          // Every message is observed by the agent-profile stage, so the summed counts == messages seen.
          const messages = crawled.reduce((total, agent) => total + agent.messageCount, 0);
          return { summary, messages, facts: extracted };
        }).pipe(Effect.provide(perCrawl)),
      );
      setFacts(result.facts);
      save(FACTS_STORAGE_KEY, result.facts);
      const skipped = result.summary.errored > 0 ? ` · ${result.summary.errored} skipped` : '';
      setStatus(
        result.messages === 0 && result.summary.errored === 0
          ? `No messages in the last ${options.maxDays}d — widen the lookback.`
          : `Crawled ${result.messages} messages · ${result.facts.length} facts${skipped}`,
      );
    });
  };

  // Process a loaded text/markdown file through the pipeline (no Discord, no agent resolution) and
  // refresh the facts from the store. Uses a fresh edge-AI layer for extraction; the FactStore
  // comes from the persistent runtime so file facts accumulate alongside crawled ones.
  const handleLoadFile = (name: string, text: string) =>
    void guard('file', async () => {
      if (text.trim().length === 0) {
        setStatus(`${name} is empty.`);
        return;
      }
      const results = await getStore().runPromise(
        Effect.gen(function* () {
          yield* FactPipeline.run([{ text, source: `file:${name}` }]);
          const store = yield* FactStore;
          return yield* store.query({});
        }).pipe(Effect.provide(Layer.fresh(AiServiceTestingPreset('edge-remote')))),
      );
      setFacts(results);
      save(FACTS_STORAGE_KEY, results);
      setStatus(`Processed ${name} · ${results.length} facts`);
    });

  // Clear the persisted facts (store + snapshot) and the current context.
  const handleReset = () =>
    void guard('reset', async () => {
      await getStore().runPromise(FactStore.pipe(Effect.flatMap((store) => store.clear())));
      localStorage.removeItem(FACTS_STORAGE_KEY);
      setFacts([]);
      setContext(undefined);
      setStatus('Cleared persisted facts.');
    });

  // Translate the natural-language question into a structured query (LLM) and write it back as SPARQL
  // into the query field; the user can then Run it.
  const handleGenerate = () =>
    void guard('generate', async () => {
      const structured = await getStore().runPromise(
        generateQuery(question).pipe(Effect.provide(Layer.fresh(AiServiceTestingPreset('edge-remote')))),
      );
      setQuery(buildSparql(structured));
      setStatus('Generated SPARQL from question.');
    });

  // Parse the SPARQL (the query panel's field) into a structured query and run it over the store.
  const handleRunSparql = () =>
    void guard('sparql', async () => {
      const parsed = parseSparqlToQuery(query);
      const results = await getStore().runPromise(FactStore.pipe(Effect.flatMap((store) => store.query(parsed))));
      setFacts(results);
      setStatus(`SPARQL → ${results.length} fact(s)`);
    });

  // Reset the query field to the default and clear the SPARQL filter by re-reading all facts.
  const handleResetQuery = () =>
    void guard('sparql', async () => {
      setQuery(DEFAULT_SPARQL);
      const results = await getStore().runPromise(FactStore.pipe(Effect.flatMap((store) => store.query({}))));
      setFacts(results);
      setStatus(`Reset · ${results.length} fact(s)`);
    });

  // TODO(burdon): Generalize and factor out ModuleContainer system from stories-chat (using surfaces).
  //  Use as opporutnity to move Surfaces into sub-module.
  return (
    <div className='dx-container grid grid-cols-[1fr_2fr_1fr]'>
      <div role='none' className='grid grid-rows-2 gap-2 min-h-0'>
        <CrawlPanel
          options={options}
          channels={channels}
          busy={busy}
          status={status}
          error={error}
          onValuesChanged={(next) => setOptions((prev) => ({ ...prev, ...next }))}
          onListChannels={handleListChannels}
          onCrawl={handleCrawl}
          onLoadFile={handleLoadFile}
          onReset={handleReset}
        />
        <QueryPanel
          question={question}
          query={query}
          busy={!!busy}
          onQuestionChange={setQuestion}
          onQueryChange={setQuery}
          onGenerate={handleGenerate}
          onRun={handleRunSparql}
          onReset={handleResetQuery}
        />
      </div>
      <FactViewer.Root facts={facts} context={context} />
      <EntityList entities={entities} selected={context} onSelect={setContext} />
    </div>
  );
};

// A small hand-authored Alice/Bob corpus exercised by the in-memory variant.
const sampleFact = (id: string, subject: string, predicate: string, object: string, confidence: number): RDF.Fact => ({
  id,
  assertion: {
    subject: { entity: subject, label: subject === 'dxos' ? 'DXOS' : subject },
    predicate,
    object: { entity: object, label: object === 'dxos' ? 'DXOS' : object },
  },
  factuality: { value: 'CT+', polarity: '+', confidence },
  attribution: { source: `sample:${id}`, generatedAtTime: '2026-06-29T00:00:00.000Z' },
  recordedAt: '2026-06-29T00:00:00.000Z',
  extractor: { id: 'sample', model: 'sample', version: '1' },
  sourceHash: id,
});

const SAMPLE_FACTS: RDF.Fact[] = [
  sampleFact('s1', 'alice', 'works at', 'dxos', 0.95),
  sampleFact('s2', 'alice', 'met', 'bob', 0.8),
  sampleFact('s3', 'bob', 'works at', 'dxos', 0.9),
  sampleFact('s5', 'bob', 'leads', 'engineering', 0.9),
  sampleFact('s4', 'bob', 'attended', 'blueyard summit', 0.7),
];

/**
 * No crawl: seed an in-memory {@link FactStore} with a hand-authored Alice/Bob corpus, read the
 * facts back through it, and navigate by entity. Reuses {@link FactViewer} and
 * {@link EntityList} to show the columns are independent of the Discord pipeline.
 */
const InMemoryStory = (_: StoryArgs) => {
  const [facts, setFacts] = useState<RDF.Fact[]>([]);
  const [context, setContext] = useState<string | undefined>(undefined);

  const entities = useMemo(() => entitiesFromFacts(facts), [facts]);

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
          const store = yield* FactStore;
          yield* store.putFacts(SAMPLE_FACTS);
          return yield* store.query({});
        }),
      )
      .then(setFacts);
  }, []);

  return (
    <div className='dx-container grid grid-cols-2 gap-2'>
      <FactViewer.Root facts={facts} context={context} />
      <EntityList entities={entities} selected={context} onSelect={setContext} />
    </div>
  );
};

const meta = {
  title: 'stories/stories-brain/Facts',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InMemory: Story = { render: InMemoryStory };
