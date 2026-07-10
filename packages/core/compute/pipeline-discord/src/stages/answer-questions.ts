//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { type StateError, type StateStore, type Type, tapStage } from '@dxos/crawler';
import { type Stage } from '@dxos/pipeline';
import { FactStore, type RDF, generateQuery } from '@dxos/pipeline-rdf';
import { trim } from '@dxos/util';

import { type StoreError } from '../errors';
import { QuestionStore } from '../stores';

const DEFAULT_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

const AnswerShape = Schema.Struct({
  answer: Schema.optional(Schema.String),
});

const termValue = (term: RDF.Term): string => ('entity' in term ? term.entity : term.literal);

const answerPrompt = (question: string, facts: readonly RDF.Fact[]): string => {
  const lines = facts.map(
    (fact) =>
      `- ${termValue(fact.assertion.subject)} ${fact.assertion.predicate} ${termValue(fact.assertion.object)}` +
      ` (source: ${fact.attribution.source})`,
  );
  return trim`
    Answer the question using ONLY the facts below. If the facts do not contain enough information
    for a confident, specific answer, omit the "answer" field entirely — do not guess.

    Question: ${question}

    Facts:
    ${lines.join('\n')}
  `;
};

/** Default cap on failed answer attempts per question — bounds redundant LLM calls over a crawl. */
const DEFAULT_MAX_ATTEMPTS = 5;

export type AnswerOptions = {
  /** Stop retrying an open question after this many failed attempts (default 5). */
  readonly maxAttempts?: number;
};

/**
 * Attempt each still-answerable open question against the current fact graph: translate the
 * question to a structured fact query, and — when facts match — ask the model to synthesize a
 * cited answer. A failed attempt (query generation, retrieval, or synthesis) is logged, increments
 * the question's attempt counter, and leaves it open; it never fails the surrounding crawl. Once a
 * question reaches `maxAttempts` it is skipped, so a permanently-unanswerable question does not
 * incur an LLM round trip on every target boundary. Returns the number of questions answered.
 */
export const answerOpenQuestions = (
  options: AnswerOptions = {},
): Effect.Effect<number, StoreError, QuestionStore | FactStore | AiService.AiService> =>
  Effect.gen(function* () {
    const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const questions = yield* QuestionStore;
    const factStore = yield* FactStore;
    const open = (yield* questions.list('open')).filter((question) => question.attempts < maxAttempts);
    let answered = 0;
    for (const question of open) {
      const attempt = Effect.gen(function* () {
        const query = yield* generateQuery(question.text);
        const facts = yield* factStore.query(query);
        if (facts.length === 0) {
          return false;
        }
        // Provide the model directly (no `Layer.orDie`): an unavailable model surfaces
        // `AiModelNotAvailableError` in the error channel, where the per-question `catchAll` below
        // leaves the question open — `orDie` would make it a defect that aborts the whole crawl.
        const { value } = yield* LanguageModel.generateObject({
          schema: AnswerShape,
          prompt: answerPrompt(question.text, facts),
        }).pipe(Effect.provide(AiService.model(DEFAULT_MODEL)));
        const text = value.answer?.trim();
        if (!text) {
          return false;
        }
        yield* questions.answer(
          question.id,
          text,
          facts.map((fact) => fact.id),
        );
        return true;
      });
      const ok = yield* attempt.pipe(
        Effect.catchAll((error) =>
          Effect.logWarning(`answer-questions: ${question.id} left open — ${error}`).pipe(Effect.as(false)),
        ),
      );
      if (ok) {
        answered++;
      } else {
        // Count the miss so a question that never resolves stops being retried at every boundary.
        yield* questions.recordAttempt(question.id);
      }
    }
    return answered;
  });

/**
 * Pipeline stage: when a channel or thread finishes draining, try to answer the open questions
 * against the facts accumulated so far. Not per-message — answering costs an LLM round trip.
 */
export const answerQuestionsStage = (): Stage.Stage<
  Type.Event,
  Type.Event,
  StateError,
  QuestionStore | FactStore | AiService.AiService | StateStore
> => tapStage('answer-questions', ['ThreadEnd', 'ChannelEnd'], () => answerOpenQuestions().pipe(Effect.asVoid));
