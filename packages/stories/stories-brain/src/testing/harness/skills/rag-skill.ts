//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation, OperationHandlerSet, Skill, Template } from '@dxos/compute';
import { DXN } from '@dxos/echo';
import { trim } from '@dxos/util';

import { VectorStore } from '../internal/vector';

export const RAG_SKILL_KEY = 'org.dxos.stories-brain.skill.rag';

const makeKey = (name: string) => DXN.make(`org.dxos.stories-brain.operation.${name}`);

/** Retrieves message snippets by semantic (vector) similarity to a natural-language query. */
export const RetrieveSnippets = Operation.make({
  meta: {
    key: makeKey('retrieveSnippets'),
    name: 'Retrieve Snippets',
    description:
      'Retrieves the most semantically similar email snippets to a query from a vector index over the mailbox.',
    icon: 'ph--magnifying-glass--regular',
  },
  services: [VectorStore],
  input: Schema.Struct({
    query: Schema.String.annotations({
      description: 'Natural-language query, e.g. "messages from Nicole Gudmand about invoices".',
    }),
    limit: Schema.optional(
      Schema.Number.pipe(Schema.positive(), Schema.int()).annotations({
        description: 'Maximum snippets to return (default 8).',
      }),
    ),
  }),
  output: Schema.Struct({
    snippets: Schema.Array(
      Schema.Struct({
        text: Schema.String,
        source: Schema.String,
        score: Schema.Number,
      }),
    ),
  }),
}).pipe(Operation.visible);

const retrieveHandler = RetrieveSnippets.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ query, limit }) {
      const store = yield* VectorStore;
      const snippets = yield* Effect.promise(() => store.search(query, limit ?? 8));
      return { snippets };
    }),
  ),
);

export const RagOperationHandlerSet = OperationHandlerSet.make(retrieveHandler);

/** A retrieval-augmented-generation skill: one tool that fetches semantically-relevant message snippets. */
export const RagSkill = {
  key: RAG_SKILL_KEY,
  make: () =>
    Skill.make({
      key: RAG_SKILL_KEY,
      name: 'RAG',
      agentCanEnable: true,
      tools: Skill.toolDefinitions({
        operations: [RetrieveSnippets],
        tools: [],
      }),
      instructions: Template.make({
        source: trim`
          You can retrieve relevant email snippets from a semantic vector index of the user's mailbox.

          - Use the Retrieve Snippets tool with a natural-language \`query\` describing what you need
            (sender, topic, or both). Higher \`score\` means more similar (1.0 is closest).
          - The index covers message sender, subject, and body, so queries like
            "messages from <person>" or "<topic> updates" both work.
          - Ground your answer in the returned snippets and cite their \`source\`; do not invent
            content beyond what the snippets contain.
        `,
      }),
    }),
};
