//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { FactStore, type SemanticIndexError, normalizeEntityId } from '@dxos/pipeline-rdf';
import { trim } from '@dxos/util';

import { BrainOperation } from '#types';

import { factLine, toCompactFact } from './facts';

export default BrainOperation.SummarizeSubject.pipe(
  Operation.withHandler(
    Effect.fn(function* (input) {
      return yield* summarizeSubject(input);
    }),
  ),
);

const SUMMARIZE_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

const summarizePrompt = (subject: string, focus: string | undefined, lines: string): string => trim`
  You are a careful analyst. Summarize what is known about "${subject}" based ONLY on the facts below.
  ${focus ? `Focus on: ${focus}.` : ''}
  Each fact line reads: [id] subject — predicate — object (factuality confidence, date).
  Factuality codes: CT certain, PR probable, PS possible; a trailing "-" means the statement is negated, "u"/"U" unknown.
  Hedge non-certain facts ("probably", "possibly") and state negated facts as negations.
  Cite the supporting fact ids in square brackets after each claim.
  Respond with a concise prose summary only — do not invent information beyond the facts.

  Facts:
  ${lines}
`;

/**
 * Queries all facts mentioning the subject (as subject or object entity) and prompts the LLM for a
 * grounded, id-citing summary. Returns an empty summary when no facts match — the LLM is never
 * invoked without grounding. Named export so the flow is unit-testable without the operation runtime.
 */
export const summarizeSubject = ({
  subject,
  focus,
}: typeof BrainOperation.SummarizeSubject.input.Type): Effect.Effect<
  typeof BrainOperation.SummarizeSubject.output.Type,
  SemanticIndexError,
  FactStore | AiService.AiService
> =>
  Effect.gen(function* () {
    const store = yield* FactStore;
    const facts = yield* store.query({ entity: normalizeEntityId(subject) });
    if (facts.length === 0) {
      return { summary: '', factCount: 0 };
    }

    const lines = facts.map((fact) => factLine(toCompactFact(fact))).join('\n');
    // LLM failures (provider error, 30s hang) are defects, not domain errors: the store query is the
    // recoverable part; a broken model configuration should surface loudly rather than as ''.
    const summary = yield* LanguageModel.generateText({ prompt: summarizePrompt(subject, focus, lines) }).pipe(
      Effect.provide(AiService.model(SUMMARIZE_MODEL).pipe(Layer.orDie)),
      Effect.timeout('30 seconds'),
      Effect.map((response) => response.text),
      Effect.orDie,
    );
    return { summary, factCount: facts.length };
  });
