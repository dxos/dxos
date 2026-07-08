//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/echo';
import { FactStore } from '@dxos/pipeline-rdf';

import { meta } from '../meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * LLM-facing rendering of a fact: subject/predicate/object display strings plus the FactBank
 * factuality code, confidence, recording date, and source DXN.
 */
export const CompactFact = Schema.Struct({
  id: Schema.String,
  subject: Schema.String,
  predicate: Schema.String,
  object: Schema.String,
  factuality: Schema.String,
  confidence: Schema.optional(Schema.Number),
  date: Schema.String,
  source: Schema.String,
});
export type CompactFact = Schema.Schema.Type<typeof CompactFact>;

/** Default maximum number of facts returned by {@link QueryFacts}. */
export const DEFAULT_QUERY_FACTS_LIMIT = 50;

export const QueryFacts = Operation.make({
  meta: {
    key: makeKey('queryFacts'),
    name: 'Query Facts',
    description:
      'Queries the space fact store (a semantic index of subject-predicate-object facts extracted from user content) with structured filters.',
    icon: 'ph--brain--regular',
  },
  services: [FactStore],
  input: Schema.Struct({
    subjectEntity: Schema.optional(
      Schema.String.annotations({ description: 'Entity slug the fact subject must match, e.g. "alice-smith".' }),
    ),
    predicate: Schema.optional(Schema.String.annotations({ description: 'Exact predicate string, e.g. "works-at".' })),
    entity: Schema.optional(
      Schema.String.annotations({ description: 'Entity slug appearing as either subject or object.' }),
    ),
    source: Schema.optional(Schema.String.annotations({ description: 'Source DXN the facts were extracted from.' })),
    minConfidence: Schema.optional(
      Schema.Number.pipe(Schema.between(0, 1)).annotations({
        description: 'Lower bound (0..1) on factuality confidence.',
      }),
    ),
    limit: Schema.optional(
      Schema.Number.pipe(Schema.positive(), Schema.int()).annotations({
        description: 'Maximum facts returned (default 50).',
      }),
    ),
  }),
  output: Schema.Struct({
    facts: Schema.Array(CompactFact),
  }),
}).pipe(Operation.visible);

export const SummarizeSubject = Operation.make({
  meta: {
    key: makeKey('summarizeSubject'),
    name: 'Summarize Subject',
    description:
      'Composes a grounded summary of everything the space fact store knows about a subject (person, organization, topic), citing fact ids.',
    icon: 'ph--brain--regular',
  },
  services: [FactStore, AiService.AiService],
  input: Schema.Struct({
    subject: Schema.String.annotations({
      description: 'Entity slug or label to summarize, e.g. "Alice Smith" or "acme-corp".',
    }),
    focus: Schema.optional(
      Schema.String.annotations({ description: 'Optional angle, e.g. "commitments" or "recent activity".' }),
    ),
  }),
  output: Schema.Struct({
    summary: Schema.String,
    factCount: Schema.Number,
  }),
}).pipe(Operation.visible);
