//
// Copyright 2026 DXOS.org
//

/// <reference types="vite/client" />

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Schema from 'effect/Schema';
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
import { Format } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { discordSourceLayer } from '@dxos/plugin-discord';
import { IconButton, Panel, Toolbar } from '@dxos/react-ui';
import { Form, type FormFieldMap, createSelectField } from '@dxos/react-ui-form';
import { useListSelection } from '@dxos/react-ui-list';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { SemanticStore, type Type, parseSparqlToQuery } from '@dxos/semantic-index';

import { SemanticFactsViewer } from './SemanticFactsViewer';

const CRAWL_STAGES: Stage[] = [makeAgentProfileStage(), makeExtractFactsStage()];

// Default SPARQL: every fact. Parsed to a structured query and run over the store (no Comunica).
const DEFAULT_SPARQL = 'SELECT ?fact ?p ?o WHERE { ?fact ?p ?o }';

const CrawlOptions = Schema.Struct({
  token: Schema.String.annotations({ title: 'Discord bot token' }),
  channel: Schema.String.annotations({ title: 'Channel' }),
  maxDays: Schema.Number.annotations({ title: 'Lookback (days)' }),
  descendThreads: Schema.Boolean.annotations({ title: 'Crawl threads' }),
  query: Schema.String.pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotations({ title: 'SPARQL' }),
  ),
});
type CrawlOptions = Schema.Schema.Type<typeof CrawlOptions>;

// Browser persistence: the semantic store runs in-memory (OPFS SQLite is worker-only, so it can't run
// on the storybook main thread), and the extracted facts are snapshotted to localStorage — rehydrated
// on mount and re-saved after each crawl, so facts survive reloads. Reset clears both.
const FACTS_STORAGE_KEY = 'dxos.crawler.facts';
// The agent registry is in-memory too; snapshot the discovered agents so the third column survives
// reloads alongside the facts (facts only carry the agent's id via `attribution.agent`, not its label).
const AGENTS_STORAGE_KEY = 'dxos.crawler.agents';
const makeStore = () => ManagedRuntime.make(SemanticStore.layerMemory);
const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Over quota — skip the snapshot.
  }
};

type CrawlAction = 'channels' | 'crawl' | 'reset' | 'sparql';

// Seed the form from Vite env (only `VITE_`-prefixed vars reach the browser). Set them when serving,
// e.g. `VITE_DISCORD_TOKEN=… VITE_DISCORD_CHANNEL=id moon run storybook-react:serve`.
const initialOptions = (): CrawlOptions => ({
  token: String(import.meta.env.VITE_DISCORD_TOKEN ?? ''),
  channel: String(import.meta.env.VITE_DISCORD_CHANNEL ?? ''),
  maxDays: Number(import.meta.env.VITE_DISCORD_MAX_DAYS ?? 14),
  descendThreads: import.meta.env.VITE_DISCORD_THREADS !== '0',
  query: DEFAULT_SPARQL,
});

type StoryArgs = {};

/**
 * Drive the crawler from the browser: enter a Discord bot token + options, list the channels the bot
 * can read, choose one (the `channel` field is the form's built-in select, populated with the
 * discovered channels via `createSelectField`), crawl it through the pipeline (edge LLM extraction),
 * and view the facts.
 */
const DefaultStory = (_: StoryArgs) => {
  const [options, setOptions] = useState<CrawlOptions>(initialOptions);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [facts, setFacts] = useState<Type.Fact[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<CrawlAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Multi-select over the agent column. `Listbox` is single-select only, so selection is driven by
  // the `useListSelection` aspect (multi mode) and reflected via the `dx-selected`/`aria-selected`
  // grammar on each row. An empty set means "no filter" (show every fact).
  const [selectedAgents, setSelectedAgents] = useState<ReadonlySet<string>>(new Set());
  const selection = useListSelection({ mode: 'multi', value: selectedAgents, onValueChange: setSelectedAgents });

  // Facts are attributed to an agent via `attribution.agent` (the canonical token); filter the viewer
  // to the selected agents' facts (no selection = all facts).
  const visibleFacts = useMemo(
    () =>
      selectedAgents.size === 0
        ? facts
        : facts.filter((fact) => fact.attribution.agent != null && selectedAgents.has(fact.attribution.agent)),
    [facts, selectedAgents],
  );

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
          return { summary, messages, agents, facts: extracted };
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
      setSelectedAgents(new Set());
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
    <div className='dx-container grid grid-cols-3 gap-2'>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <IconButton
              icon='ph--list--regular'
              label='List channels'
              disabled={!options.token || !!busy}
              onClick={handleListChannels}
            />
            <IconButton
              icon='ph--bulldozer--regular'
              label='Crawl'
              variant='primary'
              disabled={!options.token || !options.channel || !!busy}
              onClick={handleCrawl}
            />
            <IconButton
              icon='ph--play--regular'
              label='Run SPARQL'
              disabled={!!busy || !options.query}
              onClick={handleRunSparql}
            />
            <Toolbar.Separator />
            <IconButton
              icon='ph--trash--regular'
              label='Reset'
              disabled={!!busy || facts.length === 0}
              onClick={handleReset}
            />
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
      <SemanticFactsViewer facts={visibleFacts} />
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Toolbar.Text classNames='grow'>Agents{agents.length > 0 ? ` (${agents.length})` : ''}</Toolbar.Text>
            <IconButton
              icon='ph--x--regular'
              label='Clear selection'
              disabled={selectedAgents.size === 0}
              onClick={() => setSelectedAgents(new Set())}
            />
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content classNames='overflow-auto'>
          {agents.length === 0 ? (
            <p className='p-2 text-sm text-subdued-text'>No agents yet — crawl a channel.</p>
          ) : (
            <ul role='listbox' aria-label='Agents' aria-multiselectable className='flex flex-col'>
              {agents.map((agent) => {
                const { rowProps } = selection.bind(agent.id);
                return (
                  <li key={agent.id}>
                    <button
                      type='button'
                      role='option'
                      {...rowProps}
                      className='dx-hover dx-selected flex w-full items-center gap-2 px-3 py-2 text-start cursor-pointer outline-none'
                    >
                      <span className='grow truncate'>{agent.label ?? agent.id}</span>
                      <span className='text-subdued-text tabular-nums'>{agent.messageCount}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel.Content>
      </Panel.Root>
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
