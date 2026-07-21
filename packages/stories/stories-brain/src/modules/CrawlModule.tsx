//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useCallback, useState } from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { useCapability } from '@dxos/app-framework/ui';
import { AgentRegistry, type ChannelInfo, Source } from '@dxos/crawler';
import { EffectEx } from '@dxos/effect';
import { DiscordPipeline, MessageStore } from '@dxos/pipeline-discord';
import { FactPipeline } from '@dxos/pipeline-rdf';
import { BrainCapabilities } from '@dxos/plugin-brain/types';
import { discordSourceLayer } from '@dxos/plugin-discord';
import { type ModuleProps } from '@dxos/story-modules';

import { type CrawlAction, type CrawlOptions, CrawlPanel, initialOptions } from '../components';
import { CrawlerStores } from '../testing';
import { useFactsStory } from './context';

/**
 * LEFT (top): the crawl controls. Runs the Discord pipeline over the {@link CrawlerStores} runtime,
 * providing Brain's per-space `FactStore` so extracted facts land in the same store the viewer reads.
 */
export const CrawlModule = ({ space }: ModuleProps) => {
  const registry = useCapability(BrainCapabilities.FactStoreRegistry);
  const crawler = useCapability(CrawlerStores);
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
          Effect.provide(discordSourceLayer(options.token)),
        ),
      );
      setChannels(result);
      setOptions((prev) => ({ ...prev, channel: prev.channel || (result[0]?.id ?? '') }));
      setStatus(`${result.length} channel(s) visible`);
    });
  }, [guard, options.token]);

  // Crawl the selected channel; extracted facts land in Brain's per-space `FactStore` (provided as a
  // layer), the crawler-only stores come from the runtime. `Layer.fresh` on AI gives it a direct fetch
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
          const crawled = yield* (yield* AgentRegistry).list();
          const stored = yield* (yield* MessageStore).count();
          const messages = crawled.reduce((total, actor) => total + actor.messageCount, 0);
          return { summary, messages, stored };
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              registry.layerFor(space.id),
              discordSourceLayer(options.token),
              Layer.fresh(AiServiceTestingPreset('edge-remote')),
            ),
          ),
        ),
      );
      const facts = await EffectEx.runPromise(registry.forSpace(space.id).query({}));
      setFacts(facts);
      const skipped = result.summary.errored > 0 ? ` · ${result.summary.errored} skipped` : '';
      setStatus(
        result.messages === 0 && result.summary.errored === 0
          ? `No messages in the last ${options.maxDays}d — widen the lookback.`
          : `Crawled ${result.messages} messages · ${result.stored} stored · ${facts.length} facts${skipped}`,
      );
    });
  }, [guard, crawler, registry, space.id, options, setFacts]);

  // Process a loaded text/markdown file through the fact pipeline into Brain's `FactStore`.
  const handleLoadFile = useCallback(
    (name: string, text: string) => {
      guard('file', async () => {
        if (text.trim().length === 0) {
          setStatus(`${name} is empty.`);
          return;
        }
        await EffectEx.runPromise(
          FactPipeline.run([{ text, source: `file:${name}` }]).pipe(
            Effect.provide(registry.layerFor(space.id)),
            Effect.provide(Layer.fresh(AiServiceTestingPreset('edge-remote'))),
          ),
        );
        const facts = await EffectEx.runPromise(registry.forSpace(space.id).query({}));
        setFacts(facts);
        setStatus(`Processed ${name} · ${facts.length} facts`);
      });
    },
    [guard, registry, space.id, setFacts],
  );

  // Clear the space's `FactStore` and the current selection.
  const handleReset = useCallback(() => {
    guard('reset', async () => {
      await EffectEx.runPromise(registry.forSpace(space.id).clear());
      setFacts([]);
      setSelected(undefined);
      setStatus('Cleared facts.');
    });
  }, [guard, registry, space.id, setFacts, setSelected]);

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
