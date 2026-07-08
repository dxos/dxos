//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type StateError, type StateStore, type Type, tapStage } from '@dxos/crawler';
import { log } from '@dxos/log';
import { type Stage } from '@dxos/pipeline';

import { ExtractedQuestionStore } from '../stores';

/**
 * Deterministic question detector: sentence-level split, keep sentences that end in `?` and are
 * long enough to carry a real question (drops interjections like "eh?"). LLM-grade detection can
 * replace this behind the same stage seam later.
 */
export const detectQuestions = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.endsWith('?') && sentence.length >= 8 && sentence.length <= 400);

/**
 * Per-message stage: extract the questions a user asked and record each
 * (user × channel × message × question) row — idempotent, so it can run on the live crawl or on a
 * replay pass over the stored working set.
 */
export const extractQuestionsStage = (): Stage.Stage<
  Type.Event,
  Type.Event,
  StateError,
  ExtractedQuestionStore | StateStore
> =>
  tapStage('extract-questions', ['Message'], (event) =>
    event._tag !== 'Message'
      ? Effect.void
      : Effect.gen(function* () {
          const questions = detectQuestions(event.message.text);
          if (questions.length === 0) {
            return;
          }
          const store = yield* ExtractedQuestionStore;
          yield* Effect.forEach(
            questions,
            (question) =>
              store
                .put({
                  authorId: event.message.author.id,
                  ...(event.message.author.displayName ? { authorLabel: event.message.author.displayName } : {}),
                  targetId: event.target.id,
                  messageId: event.message.id,
                  question,
                  ...(event.message.createdAt ? { askedAt: event.message.createdAt } : {}),
                })
                .pipe(
                  Effect.tap(() =>
                    Effect.sync(() =>
                      log.info('question', {
                        author: event.message.author.displayName ?? event.message.author.id,
                        target: event.target.id,
                        message: event.message.id,
                        question,
                      }),
                    ),
                  ),
                ),
            { discard: true },
          );
        }),
  );
