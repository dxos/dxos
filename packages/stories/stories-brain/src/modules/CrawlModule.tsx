//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useCallback, useState } from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import * as Hooks from '@dxos/app-framework/Hooks';
import { AgentRegistry, type ChannelInfo, Source } from '@dxos/crawler';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DiscordPipeline, MessageStore } from '@dxos/pipeline-discord';
import { FactPipeline, FactStore } from '@dxos/pipeline-rdf';
import * as DiscordSource from '@dxos/plugin-discord/DiscordSource';

import { type CrawlAction, type CrawlOptions, CrawlPanel, initialOptions } from '../components/index.ts';
import { CrawlerStores, StoryBrain } from '../testing/index.ts';
import { useFactsStory } from './context.ts';

/**
 * LEFT (top): the crawl controls. Runs the Discord pipeline over the {@link CrawlerStores} runtime,
 * providing the story agent's brain as its `FactStore` so extracted facts land where the viewer reads.
 */
export const CrawlModule = () => {
  const { facts: store } = Hooks.useCapability(StoryBrain);
  const crawler = Hooks.useCapability(CrawlerStores);
  const { setFacts, setSelected } = useFactsStory();

  const [options, setOptions] = useState<CrawlOptions>(initialOptions);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<CrawlAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const guard = useCallback((action: CrawlAction, task: () => Promise<void>) => {
    setBusy(action);
    setError(null);
    void task()
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setBusy(null));
  }, []);

  // Enumerate the channels the bot can access (the source layer is rebuilt per call with the token).
  const handleListChannels = useCallback(() => {
    guard('channels', async () => {
      const result = await EffectEx.runPromise(
        Source.pipe(Effect.flatMap((source) => source.listChannels())).pipe(
          Effect.provide(DiscordSource.layer(options.token)),
        ),
      );
      setChannels(result);
      setOptions((prev) => ({ ...prev, channel: prev.channel || (result[0]?.id ?? '') }));
      setStatus(`${result.length} channel(s) visible`);
    });
  }, [guard, options.token]);

  // Crawl the selected channel; extracted facts land in the agent's brain (provided as the `FactStore`),
  // the crawler-only stores come from the runtime. `Layer.fresh` on AI gives it a direct fetch
  // (not the Discord source's CORS-proxy client, which would 404 LLM calls).
  const handleCrawl = useCallback(() => {
    if (!options.channel) {
      return;
    }
    guard('crawl', async () => {
      const result = await crawler.runPromise(
        Effect.gen(function* () {
          const summary = yield* DiscordPipeline.run({
            channels: [options.channel],
            descendThreads: options.descendThreads,
            seed: { maxDays: options.maxDays },
          });
          const crawled = yield* AgentRegistry.list();
          const stored = yield* MessageStore.count();
          const messages = crawled.reduce((total, actor) => total + actor.messageCount, 0);
          return { summary, messages, stored };
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              Layer.succeed(FactStore, store),
              DiscordSource.layer(options.token),
              Layer.fresh(AiServiceTestingPreset('edge-remote')),
            ),
          ),
        ),
      );
      const facts = await EffectEx.runPromise(store.query({}));
      setFacts(facts);
      const skipped = result.summary.errored > 0 ? ` · ${result.summary.errored} skipped` : '';
      setStatus(
        result.messages === 0 && result.summary.errored === 0
          ? `No messages in the last ${options.maxDays}d — widen the lookback.`
          : `Crawled ${result.messages} messages · ${result.stored} stored · ${facts.length} facts${skipped}`,
      );
    });
  }, [guard, crawler, store, options, setFacts]);

  // Process a loaded text/markdown file through the fact pipeline into the agent's brain.
  const handleLoadFile = useCallback(
    (name: string, text: string) => {
      guard('file', async () => {
        if (text.trim().length === 0) {
          setStatus(`${name} is empty.`);
          return;
        }
        await EffectEx.runPromise(
          FactPipeline.run([{ text, source: `file:${name}` }]).pipe(
            Effect.provide(
              Layer.provideMerge(Layer.succeed(FactStore, store), Layer.fresh(AiServiceTestingPreset('edge-remote'))),
            ),
          ),
        );
        const facts = await EffectEx.runPromise(store.query({}));
        setFacts(facts);
        setStatus(`Processed ${name} · ${facts.length} facts`);
      });
    },
    [guard, store, setFacts],
  );

  // Reset the agent's brain and the current selection.
  const handleReset = useCallback(() => {
    guard('reset', async () => {
      await EffectEx.runPromise(store.clear());
      setFacts([]);
      setSelected(undefined);
      setStatus('Cleared facts.');
    });
  }, [guard, store, setFacts, setSelected]);

  return (
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
  );
};
