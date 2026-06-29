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
  makeAgentProfileStage,
  makeExtractFactsStage,
  run,
} from '@dxos/crawler';
import { coreLayer } from '@dxos/crawler/testing';
import { EffectEx } from '@dxos/effect';
import { discordSourceLayer } from '@dxos/plugin-discord';
import { Button, Panel, Toolbar } from '@dxos/react-ui';
import { Editor, type EditorController } from '@dxos/react-ui-editor';
import { Form, type FormFieldMap, createSelectField } from '@dxos/react-ui-form';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { SemanticPipeline, SemanticStore, type Type, buildSparql, generateQuery } from '@dxos/semantic-index';

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
});
type CrawlOptions = Schema.Schema.Type<typeof CrawlOptions>;

const CRAWL_STAGES: Stage[] = [makeAgentProfileStage(), makeExtractFactsStage()];

// Seed the form from Vite env (only `VITE_`-prefixed vars reach the browser). Set them when serving,
// e.g. `VITE_DISCORD_TOKEN=… VITE_DISCORD_CHANNEL=id moon run storybook-react:serve`.
const initialOptions = (): CrawlOptions => ({
  token: String(import.meta.env.VITE_DISCORD_TOKEN ?? ''),
  channel: String(import.meta.env.VITE_DISCORD_CHANNEL ?? ''),
  maxDays: Number(import.meta.env.VITE_DISCORD_MAX_DAYS ?? 7),
  descendThreads: import.meta.env.VITE_DISCORD_THREADS !== '0',
});

type CrawlAction = 'channels' | 'crawl';

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
      // Fresh state + in-memory store per crawl; edge LLM does the extraction (no local key needed).
      const layer = Layer.mergeAll(discordSourceLayer(options.token), coreLayer, AiServiceTestingPreset('edge-remote'));
      const result = await EffectEx.runPromise(
        Effect.gen(function* () {
          const summary = yield* run(
            { channels: [options.channel], descendThreads: options.descendThreads, seed: { maxDays: options.maxDays } },
            CRAWL_STAGES,
          );
          const registry = yield* AgentRegistry;
          const agents = yield* registry.list();
          const store = yield* SemanticStore;
          const extracted = yield* store.query({});
          return { summary, agentCount: agents.length, facts: extracted };
        }).pipe(Effect.provide(layer)),
      );
      setFacts(result.facts);
      setStatus(
        `Crawled ${result.summary.steps} step(s) · ${result.agentCount} agents · ${result.facts.length} facts` +
          (result.summary.errored > 0 ? ` · ${result.summary.errored} skipped` : ''),
      );
    });
  };

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
          <Panel.Statusbar classNames={error ? 'text-error truncate' : 'text-subdued truncate'}>
            {error ?? status}
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
