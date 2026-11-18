//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';

import * as Operation from '@dxos/compute/Operation';
import { AgentRegistry, Crawler, CrawlState, StateStore } from '@dxos/crawler';
import { Database, Obj } from '@dxos/echo';
import { DiscordPipeline, ExtractedQuestionStore, MessageStore, QuestionStore } from '@dxos/pipeline-discord';

import { DiscordOperation } from '#types';

import { discordSourceLayerFromService, memoryFactStoreLayer } from '../services/index.ts';

/**
 * Runs one bounded slice of `DiscordPipeline` with its stores injected for this invocation: the frontier and fact
 * hashes in the `CrawlState`, facts put into the space's memory, Topics and Persons in the space, and Discord read as
 * the bot through `DiscordService`. Authors, messages and questions live in per-run stores: an author's canonical id
 * is their Discord user id, so it is the same in every run without a store.
 */
const handler: Operation.WithHandler<typeof DiscordOperation.CrawlDiscordChannels> =
  DiscordOperation.CrawlDiscordChannels.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ applicationId, channels, descendThreads, maxDays, maxDepth, maxSteps, state: stateRef }) {
        const state = yield* Database.load(stateRef);
        Obj.update(state, (state) => {
          CrawlState.reconcileChannels(state, channels);
          CrawlState.setRunStatus(state, 'running');
        });

        const { db } = yield* Database.Service;
        const run = Effect.gen(function* () {
          const summary = yield* DiscordPipeline.run(
            {
              channels,
              descendThreads: descendThreads ?? true,
              ...(maxDepth !== undefined ? { maxDepth } : {}),
              ...(maxDays !== undefined ? { seed: { maxDays } } : {}),
            },
            {
              maxSteps: maxSteps ?? DiscordOperation.DEFAULT_BACK_INDEX_STEPS,
              extract: { batchSize: DiscordOperation.BACK_INDEX_PAGE_SIZE },
              db,
            },
          );
          return { ...summary, messages: yield* MessageStore.count() };
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              discordSourceLayerFromService(
                { applicationId, spaceId: db.spaceId },
                { pageLimit: DiscordOperation.BACK_INDEX_PAGE_SIZE },
              ),
              StateStore.layerEcho(state),
              AgentRegistry.layerMemory,
              MessageStore.layerMemory,
              QuestionStore.layerMemory,
              ExtractedQuestionStore.layerMemory,
              memoryFactStoreLayer({ state }),
            ),
          ),
        );

        // Recorded rather than raised: a failed invocation's ECHO writes are not kept, so the error would be lost.
        const exit = yield* Effect.exit(run);
        const failure = Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined;
        const error = failure === undefined ? undefined : failure instanceof Error ? failure.message : String(failure);
        const summary = Exit.isSuccess(exit)
          ? exit.value
          : {
              ...(yield* Crawler.summarize().pipe(Effect.provide(StateStore.layerEcho(state)))),
              steps: 0,
              messages: 0,
            };
        const result = {
          done: summary.done,
          errored: summary.errored,
          steps: summary.steps,
          messages: summary.messages,
          ...(error !== undefined ? { error } : {}),
        };
        const at = new Date(yield* Clock.currentTimeMillis).toISOString();
        Obj.update(state, (state) => {
          CrawlState.recordRun(state, { at, ...result });
          CrawlState.setRunStatus(state, error !== undefined ? 'error' : summary.done ? 'done' : 'running');
        });
        return result;
      }),
    ),
  );

export default handler;
