//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Ref from 'effect/Ref';

import { type AiService } from '@dxos/ai';
import {
  AgentRegistry,
  Crawler,
  type ExtractFactsOptions,
  Source,
  type StateError,
  StateStore,
  type Type,
  agentProfileStage,
  extractFactsStage,
} from '@dxos/crawler';
import { type Database } from '@dxos/echo';
import { Pipeline } from '@dxos/pipeline';
import { FactStore } from '@dxos/pipeline-rdf';

import {
  answerOpenQuestions,
  answerQuestionsStage,
  extractQuestionsStage,
  persistMessageStage,
  topicsStage,
} from './stages';
import { ExtractedQuestionStore, MessageStore, QuestionStore } from './stores';
import { type DetectOptions } from './topics/detect-topics';

export type RunOptions = {
  /** Stop after this many crawl steps (pause); re-invoking over the same stores resumes. */
  readonly maxSteps?: number;
  /** Options for the fact-extraction stage. */
  readonly extract?: ExtractFactsOptions;
  /**
   * ECHO database for the pipeline's object outputs: Persons for question askers and Topics per
   * drained target. Detection/extraction still run without it; nothing is persisted to ECHO.
   */
  readonly db?: Database.Database;
  /** Topic-detection tuning (session gap, affinity threshold). */
  readonly detect?: DetectOptions;
};

export type RunSummary = {
  readonly steps: number;
  /** True if the frontier is fully drained; false if stopped at the step bound. */
  readonly done: boolean;
  /** Targets skipped because a fetch or stage failed. */
  readonly errored: number;
};

export const DiscordPipeline = {
  /**
   * Default assembly over a crawl: persist → agent-profile → extract-questions → extract-facts →
   * topics → answer-questions, drained through the commit sink so durable cursors advance only
   * after a message clears every stage. Interruptible (structurally) and resumable: all state
   * lives in the provided stores.
   */
  run: (
    config: Type.Config,
    options: RunOptions = {},
  ): Effect.Effect<
    RunSummary,
    StateError,
    | Source
    | StateStore
    | MessageStore
    | AgentRegistry
    | FactStore
    | QuestionStore
    | ExtractedQuestionStore
    | AiService.AiService
  > =>
    Effect.gen(function* () {
      const store = yield* StateStore;
      const steps = yield* Ref.make(0);
      const crawl = Effect.gen(function* () {
        yield* store.setRunStatus('running');
        yield* Crawler.stream(config, { maxSteps: options.maxSteps, steps }).pipe(
          persistMessageStage(),
          agentProfileStage(),
          extractQuestionsStage({ db: options.db }),
          extractFactsStage(options.extract),
          topicsStage({ db: options.db, detect: options.detect }),
          answerQuestionsStage(),
          Pipeline.run({ sink: Crawler.commit }),
        );
        // Final pass over any questions still open once the whole run has drained.
        yield* answerOpenQuestions().pipe(
          Effect.catchAll((error) => Effect.logWarning(`final answer pass failed: ${error}`).pipe(Effect.as(0))),
        );
        const { done, errored } = yield* Crawler.summarize();
        yield* store.setRunStatus(done ? 'done' : 'paused');
        return { steps: yield* Ref.get(steps), done, errored };
      });
      // Record a failed terminal state on an unexpected abort so a crashed crawl is
      // distinguishable from a live one.
      return yield* crawl.pipe(Effect.tapError(() => store.setRunStatus('error').pipe(Effect.ignore)));
    }),
};
