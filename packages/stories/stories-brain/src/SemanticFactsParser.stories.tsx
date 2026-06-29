//
// Copyright 2026 DXOS.org
//

/// <reference types="vite/client" />

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Schema from 'effect/Schema';
import React, { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

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
import { Format } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { discordSourceLayer } from '@dxos/plugin-discord';
import { Button, Panel, Toolbar } from '@dxos/react-ui';
import { Editor, type EditorController } from '@dxos/react-ui-editor';
import { Form, type FormFieldMap, createSelectField } from '@dxos/react-ui-form';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  SemanticPipeline,
  SemanticStore,
  type Type,
  buildSparql,
  generateQuery,
  parseSparqlToQuery,
} from '@dxos/semantic-index';

import { SemanticFactsViewer } from './SemanticFactsViewer';
import { SAMPLE_FACTS_TEXT, parseDiscordFixture } from './testing';

// One in-memory store (browser-friendly, no SQLite) + the edge LLM. Built lazily per story instance.
const makeRuntime = () =>
  ManagedRuntime.make(Layer.mergeAll(SemanticStore.layerMemory, AiServiceTestingPreset('edge-remote')));

type Action = 'parse' | 'fixture' | 'query';

type StoryArgs = { initialText?: string };

const DefaultStory = ({ initialText = SAMPLE_FACTS_TEXT }: StoryArgs) => {
  const editorRef = useRef<EditorController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [facts, setFacts] = useState<Type.Fact[]>([]);
  const [sparql, setSparql] = useState<string | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lazily create the runtime and recreate it if disposed, so it survives React StrictMode's
  // mount → unmount(dispose) → remount cycle (otherwise actions hit a disposed runtime).
  const runtimeRef = useRef<ReturnType<typeof makeRuntime> | null>(null);
  const getRuntime = () => (runtimeRef.current ??= makeRuntime());
  useEffect(
    () => () => {
      void runtimeRef.current?.dispose();
      runtimeRef.current = null;
    },
    [],
  );

  const run = async (action: Action, task: () => Promise<void>) => {
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

  // Extract + persist facts from the editor text into the shared store.
  const handleParse = () =>
    run('parse', async () => {
      const text = editorRef.current?.getText() ?? '';
      const extracted = await getRuntime().runPromise(
        SemanticPipeline.run([{ text, source: 'editor:input', date: new Date().toISOString() }]),
      );
      setFacts((prev) => [...prev, ...extracted]);
    });

  // Stream a picked discord fixture file (plugin-discord:generate-fixtures JSON) through the pipeline
  // one message at a time, appending facts as each completes.
  const handleFixtureFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // Allow re-picking the same file.
    if (!file) {
      return;
    }
    void run('fixture', async () => {
      const docs = parseDiscordFixture(JSON.parse(await file.text()));
      setFacts([]);
      for (const doc of docs) {
        const extracted = await getRuntime().runPromise(SemanticPipeline.run([doc]));
        setFacts((prev) => [...prev, ...extracted]);
      }
    });
  };

  // Turn the editor text into a SPARQL query (LLM), execute it over the store, and show the results.
  const handleQuery = () =>
    run('query', async () => {
      const question = editorRef.current?.getText() ?? '';
      const query = await getRuntime().runPromise(generateQuery(question));
      // Show the SPARQL equivalent; execution runs structurally over the in-memory store (no Comunica).
      setSparql(buildSparql(query));
      const results = await getRuntime().runPromise(SemanticStore.pipe(Effect.flatMap((store) => store.query(query))));
      setFacts(results);
    });

  return (
    <div className='dx-container grid grid-cols-2 gap-2'>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Button variant='primary' disabled={!!busy} onClick={handleParse}>
              {busy === 'parse' ? 'Parsing…' : 'Parse'}
            </Button>
            <Button disabled={!!busy} onClick={() => fileInputRef.current?.click()}>
              {busy === 'fixture' ? 'Loading…' : 'Load fixture'}
            </Button>
            <input
              ref={fileInputRef}
              type='file'
              accept='application/json,.json'
              className='hidden'
              onChange={handleFixtureFile}
            />
            <Button disabled={!!busy} onClick={handleQuery}>
              {busy === 'query' ? 'Querying…' : 'Query'}
            </Button>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content classNames='dx-container grid grid-row-2'>
          <Editor.Root ref={editorRef}>
            <Editor.View value={initialText} />
          </Editor.Root>
          <div className='dx-expander'>
            {sparql && (
              <pre className='text-xs whitespace-pre-wrap bg-base-surface p-2 rounded border border-separator overflow-auto'>
                {sparql}
              </pre>
            )}
          </div>
        </Panel.Content>
        {error && <Panel.Statusbar classNames='text-error truncate'>{error}</Panel.Statusbar>}
      </Panel.Root>
      <SemanticFactsViewer facts={facts} />
    </div>
  );
};

const CrawlOptions = Schema.Struct({
  token: Schema.String.annotations({ title: 'Discord bot token' }),
  channel: Schema.String.annotations({ title: 'Channel' }),
  maxDays: Schema.Number.annotations({ title: 'Lookback (days)' }),
  descendThreads: Schema.Boolean.annotations({ title: 'Crawl threads' }),
  // Markdown-annotated → the form renders a code editor (MarkdownField); executed via the toolbar.
  query: Schema.String.pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotations({ title: 'SPARQL' }),
  ),
});
type CrawlOptions = Schema.Schema.Type<typeof CrawlOptions>;

const CRAWL_STAGES: Stage[] = [makeAgentProfileStage(), makeExtractFactsStage()];

// Browser persistence: the semantic store runs in-memory (OPFS SQLite is worker-only, so it can't run
// on the storybook main thread), and the extracted facts are snapshotted to localStorage — rehydrated
// on mount and re-saved after each crawl, so facts survive reloads. Reset clears both.
const FACTS_STORAGE_KEY = 'dxos.crawler.facts';
const makeStore = () => ManagedRuntime.make(SemanticStore.layerMemory);
const saveFacts = (facts: readonly Type.Fact[]) => {
  try {
    localStorage.setItem(FACTS_STORAGE_KEY, JSON.stringify(facts));
  } catch {
    // Over quota — skip the snapshot.
  }
};

type CrawlAction = 'channels' | 'crawl' | 'reset' | 'sparql';

// Default SPARQL: every fact. Parsed to a structured query and run over the store (no Comunica).
const DEFAULT_SPARQL = 'SELECT ?fact ?p ?o WHERE { ?fact ?p ?o }';

// Seed the form from Vite env (only `VITE_`-prefixed vars reach the browser). Set them when serving,
// e.g. `VITE_DISCORD_TOKEN=… VITE_DISCORD_CHANNEL=id moon run storybook-react:serve`.
const initialOptions = (): CrawlOptions => ({
  token: String(import.meta.env.VITE_DISCORD_TOKEN ?? ''),
  channel: String(import.meta.env.VITE_DISCORD_CHANNEL ?? ''),
  maxDays: Number(import.meta.env.VITE_DISCORD_MAX_DAYS ?? 7),
  descendThreads: import.meta.env.VITE_DISCORD_THREADS !== '0',
  query: DEFAULT_SPARQL,
});

/**
 * Drive the crawler from the browser: enter a Discord bot token + options, list the channels the bot
 * can read, choose one (the `channel` field is the form's built-in select, populated with the
 * discovered channels via `createSelectField`), crawl it through the pipeline (edge LLM extraction),
 * and view the facts.
 */
const CrawlerStory = () => {
  const [options, setOptions] = useState<CrawlOptions>(initialOptions);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [facts, setFacts] = useState<Type.Fact[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<CrawlAction | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Rehydrate persisted facts into the store + view on mount.
  useEffect(() => {
    const raw = localStorage.getItem(FACTS_STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const saved: Type.Fact[] = JSON.parse(raw);
      void getStore()
        .runPromise(SemanticStore.pipe(Effect.flatMap((store) => store.putFacts(saved))))
        .then(() => setFacts(saved));
    } catch {
      // Ignore a malformed snapshot.
    }
  }, []);

  // The `channel` field uses the form's built-in select, populated with the discovered channels.
  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      channel: createSelectField({
        options: channels.map((channel) => ({ value: channel.id, label: channel.name ?? channel.id })),
        defaultLabel: null,
      }),
    }),
    [channels],
  );

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
          const agents = yield* registry.list();
          const store = yield* SemanticStore;
          const extracted = yield* store.query({});
          // Every message is observed by the agent-profile stage, so the summed counts == messages seen.
          const messages = agents.reduce((total, agent) => total + agent.messageCount, 0);
          return { summary, messages, agentCount: agents.length, facts: extracted };
        }).pipe(Effect.provide(perCrawl)),
      );
      setFacts(result.facts);
      saveFacts(result.facts);
      const skipped = result.summary.errored > 0 ? ` · ${result.summary.errored} skipped` : '';
      setStatus(
        result.messages === 0 && result.summary.errored === 0
          ? `No messages in the last ${options.maxDays}d — widen the lookback.`
          : `Crawled ${result.messages} messages · ${result.agentCount} agents · ${result.facts.length} facts${skipped}`,
      );
    });
  };

  // Clear the persisted facts (store + snapshot).
  const handleReset = () =>
    void guard('reset', async () => {
      await getStore().runPromise(SemanticStore.pipe(Effect.flatMap((store) => store.clear())));
      localStorage.removeItem(FACTS_STORAGE_KEY);
      setFacts([]);
      setStatus('Cleared persisted facts.');
    });

  // Parse the SPARQL (the form's `query` field) into a structured query and run it over the
  // persisted store (no Comunica).
  const handleRunSparql = () =>
    void guard('sparql', async () => {
      const query = parseSparqlToQuery(options.query);
      const results = await getStore().runPromise(SemanticStore.pipe(Effect.flatMap((store) => store.query(query))));
      setFacts(results);
      setStatus(`SPARQL → ${results.length} fact(s)`);
    });

  return (
    <div className='dx-container grid grid-cols-2 gap-2'>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Button disabled={!options.token || !!busy} onClick={handleListChannels}>
              {busy === 'channels' ? 'Listing…' : 'List channels'}
            </Button>
            <Button variant='primary' disabled={!options.token || !options.channel || !!busy} onClick={handleCrawl}>
              {busy === 'crawl' ? 'Crawling…' : 'Crawl'}
            </Button>
            <Button disabled={!!busy || !options.query} onClick={handleRunSparql}>
              {busy === 'sparql' ? 'Running…' : 'Run SPARQL'}
            </Button>
            <Button disabled={!!busy || facts.length === 0} onClick={handleReset}>
              {busy === 'reset' ? 'Resetting…' : 'Reset'}
            </Button>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content classNames='dx-container'>
          <Form.Root
            schema={CrawlOptions}
            values={options}
            fieldMap={fieldMap}
            onValuesChanged={(next) => setOptions((prev) => ({ ...prev, ...next }))}
          >
            <Form.Viewport>
              <Form.Content>
                <Form.FieldSet />
              </Form.Content>
            </Form.Viewport>
          </Form.Root>
        </Panel.Content>
        {(error || status) && (
          <Panel.Statusbar asChild>
            <Toolbar.Root>
              <Toolbar.Text classNames={[error ? 'text-error-text' : 'text-subdued-text']}>
                {error ?? status}
              </Toolbar.Text>
            </Toolbar.Root>
          </Panel.Statusbar>
        )}
      </Panel.Root>
      <SemanticFactsViewer facts={facts} />
    </div>
  );
};

const meta = {
  title: 'stories/stories-brain/SemanticFactsParser',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialText: SAMPLE_FACTS_TEXT,
  },
};

export const Crawler: Story = {
  render: () => <CrawlerStory />,
};
