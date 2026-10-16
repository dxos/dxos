//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as EffectRef from 'effect/Ref';

import * as Operation from '@dxos/compute/Operation';
import { AgentRegistry, Crawler, CrawlState, StateStore, extractFactsStage } from '@dxos/crawler';
import { Database } from '@dxos/echo';
import { Pipeline } from '@dxos/pipeline';

import { DiscordOperation } from '#types';

import { discordSourceLayerFromConnection, factFeedStoreLayer } from '../services/index.ts';

/**
 * Runs one bounded slice of the crawl with every store taken from ECHO for this invocation: the frontier and fact
 * hashes in the `CrawlState`, facts appended to the fact feed. Authors resolve in a per-run registry: an author's
 * canonical id is their Discord user id, so it is the same in every run without a store.
 */
const handler: Operation.WithHandler<typeof DiscordOperation.CrawlDiscordChannels> =
  DiscordOperation.CrawlDiscordChannels.pipe(
    Operation.withHandler(
      Effect.fn(function* ({
        connection,
        channels,
        descendThreads,
        maxDays,
        maxDepth,
        maxSteps,
        state: stateRef,
        facts: factsRef,
      }) {
        const state = yield* Database.load(stateRef);
        const feed = yield* Database.load(factsRef);
        CrawlState.reconcileChannels(state, channels);
        CrawlState.setRunStatus(state, 'running');

        const steps = yield* EffectRef.make(0);
        let messages = 0;
        const run = Crawler.stream(
          {
            channels,
            descendThreads: descendThreads ?? true,
            ...(maxDepth !== undefined ? { maxDepth } : {}),
            ...(maxDays !== undefined ? { seed: { maxDays } } : {}),
          },
          { maxSteps: maxSteps ?? DiscordOperation.DEFAULT_BACK_INDEX_STEPS, steps },
        ).pipe(
          extractFactsStage({ batchSize: DiscordOperation.BACK_INDEX_PAGE_SIZE }),
          Pipeline.run({
            sink: (event) =>
              Crawler.commit(event).pipe(
                Effect.tap(() =>
                  Effect.sync(() => {
                    if (event._tag === 'Message') {
                      messages++;
                    }
                  }),
                ),
              ),
          }),
          Effect.andThen(Crawler.summarize()),
          Effect.provide(
            Layer.mergeAll(
              discordSourceLayerFromConnection(connection, { pageLimit: DiscordOperation.BACK_INDEX_PAGE_SIZE }),
              StateStore.layerEcho(state),
              AgentRegistry.layerMemory,
              factFeedStoreLayer({ feed, state }),
            ),
          ),
        );

        // Recorded rather than raised: a failed invocation's ECHO writes are not kept, so the error would be lost.
        const exit = yield* Effect.exit(run);
        const failure = Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined;
        const error = failure === undefined ? undefined : failure instanceof Error ? failure.message : String(failure);
        const summary = Exit.isSuccess(exit)
          ? exit.value
          : yield* Crawler.summarize().pipe(Effect.provide(StateStore.layerEcho(state)));
        const result = {
          done: summary.done,
          errored: summary.errored,
          steps: yield* EffectRef.get(steps),
          messages,
          ...(error !== undefined ? { error } : {}),
        };
        CrawlState.recordRun(state, { at: new Date(yield* Clock.currentTimeMillis).toISOString(), ...result });
        CrawlState.setRunStatus(state, error !== undefined ? 'error' : summary.done ? 'done' : 'running');
        return result;
      }),
    ),
  );

export default handler;
