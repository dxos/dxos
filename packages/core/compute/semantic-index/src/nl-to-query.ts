//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';

import { SemanticIndexError } from './errors';
import { type SemanticQuery } from './internal/sparql/query-builder';
import { DEFAULT_MODEL } from './internal/stages/extract';

const QueryShape = Schema.Struct({
  subjectEntity: Schema.optional(Schema.String),
  entity: Schema.optional(Schema.String),
  predicate: Schema.optional(Schema.String),
  minConfidence: Schema.optional(Schema.Number),
});

const PROMPT = `Translate a natural-language question into a structured query over a fact graph.
Each fact has a subject entity, a predicate (a short verb phrase), an object entity, plus factuality,
polarity and an optional confidence (0..1).

Entities are slugs: lowercase the label and replace each run of non-alphanumeric characters with '-'
(e.g. "Sarah Johnson" -> "sarah-johnson", "DXOS Composer" -> "dxos-composer").

Emit only the fields the question implies; omit the rest:
- entity: an entity slug appearing as subject OR object (use this for "everything about X").
- subjectEntity: an entity slug constrained to the subject position.
- predicate: a verb phrase to match exactly.
- minConfidence: a lower bound on confidence.

Examples:
- "show me everything about Blueyard" -> { "entity": "blueyard" }
- "what did Blueyard receive?" -> { "subjectEntity": "blueyard", "predicate": "receive" }
- "what is Tim uncertain about?" -> { "subjectEntity": "tim", "predicate": "be uncertain about" }`;

/**
 * Translate a natural-language question into a structured {@link SemanticQuery}, grounded in the fact
 * ontology. Pair with {@link SemanticStoreApi.query} (which runs in the browser, unlike raw SPARQL).
 */
export const generateQuery = (
  question: string,
): Effect.Effect<SemanticQuery, SemanticIndexError, AiService.AiService> =>
  Effect.gen(function* () {
    const response = yield* LanguageModel.generateObject({
      schema: QueryShape,
      prompt: `${PROMPT}\n\nQuestion: ${question}`,
    });
    return response.value;
  }).pipe(
    Effect.provide(AiService.model(DEFAULT_MODEL).pipe(Layer.orDie)),
    Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to generate query', cause })),
  );
