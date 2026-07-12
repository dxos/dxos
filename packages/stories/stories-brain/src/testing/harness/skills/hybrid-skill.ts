//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation, OperationHandlerSet, Skill, Template } from '@dxos/compute';
import { DXN } from '@dxos/echo';
import { trim } from '@dxos/util';

import { SubjectIndex } from '../internal/subject-index';

export const HYBRID_SKILL_KEY = 'org.dxos.stories-brain.skill.hybrid';

/** Fact-indexed retrieval: find a subject's facts, then return the source messages they came from. */
export const RetrieveSubject = Operation.make({
  meta: {
    key: DXN.make('org.dxos.stories-brain.operation.retrieveSubject'),
    name: 'Retrieve Subject',
    description: trim`
      Uses the fact store as an index: finds facts about a person/organization, 
      follows them to the source email messages, and returns those messages (verbatim) plus the facts.
    `,
    icon: 'ph--link--regular',
  },
  services: [SubjectIndex],
  input: Schema.Struct({
    subject: Schema.String.annotations({ description: 'Person or organization name, e.g. "Nicole Gudmand".' }),
    limit: Schema.optional(
      Schema.Number.pipe(Schema.positive(), Schema.int()).annotations({
        description: 'Maximum source messages to return (default 10).',
      }),
    ),
  }),
  output: Schema.Struct({
    subject: Schema.String,
    factCount: Schema.Number,
    messages: Schema.Array(
      Schema.Struct({
        source: Schema.String,
        from: Schema.String,
        subject: Schema.String,
        text: Schema.String,
      }),
    ),
    facts: Schema.Array(Schema.Struct({ subject: Schema.String, predicate: Schema.String, object: Schema.String })),
  }),
}).pipe(Operation.visible);

const retrieveHandler = RetrieveSubject.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ subject, limit }) {
      const index = yield* SubjectIndex;
      return index.retrieve(subject, limit ?? 10);
    }),
  ),
);

export const HybridOperationHandlerSet = OperationHandlerSet.make(retrieveHandler);

/**
 * Hybrid skill: the fact store as a retrieval index into the actual messages. One tool returns both
 * the entity's facts and the source messages those facts were extracted from, so the agent grounds
 * its answer in verbatim message text located precisely via facts.
 */
export const HybridSkill = {
  key: HYBRID_SKILL_KEY,
  make: () =>
    Skill.make({
      key: HYBRID_SKILL_KEY,
      name: 'Fact-indexed retrieval',
      agentCanEnable: true,
      tools: Skill.toolDefinitions({
        operations: [RetrieveSubject],
        tools: [],
      }),
      instructions: Template.make({
        source: trim`
          The fact store is a semantic index over the user's email. To answer questions about a
          specific person or organization, use the Retrieve Subject tool with their name.

          - It returns \`messages\` (the actual source emails those facts were extracted from) and
            \`facts\` (the structured claims). Ground your answer in the \`messages\` — quote and cite
            them by \`source\` — and use \`facts\` to organize the summary (commitments, requests, etc.).
          - This is the best tool for "summarize messages from/about X": the facts pinpoint exactly
            which emails are relevant, and the messages give you the verbatim content.
          - If \`factCount\` is 0, say so rather than guessing.
        `,
      }),
    }),
};
