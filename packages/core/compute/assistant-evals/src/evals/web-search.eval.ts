//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { WebSearchSkill } from '@dxos/assistant-toolkit';
import { Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import { completedBlocks } from '../assertions.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';

// Ported from the gated `Web` scenario (../testing/web-search.test.ts).
// Grades the real tool-invocation and transcript effects directly instead of the agent's
// self-reported `completedCriteria` — this is the first tool-match scorer (TESTING.md Phase 2).

/** Everything the assistant said during the run, as one string. */
const assistantText = completedBlocks().pipe(
  Effect.map((blocks) =>
    blocks
      .filter(({ role, block }) => role === 'assistant' && block._tag === 'text')
      .map(({ block }) => (block as { text: string }).text)
      .join('\n'),
  ),
);

const SCORERS = [
  Scorer.make({
    name: 'answer-correct',
    description: 'The agent reports the capital of France (Paris) in its response.',
    query: assistantText,
    score: (text) => text.includes('Paris'),
  }),
  Scorer.toolCalls({
    name: 'only-web-search-used',
    description: 'The web search tool was the only tool invoked (besides completeJob).',
    score: (invocations) => {
      const names = new Set(
        invocations.filter((invocation) => invocation.name !== 'completeJob').map((invocation) => invocation.name),
      );
      return (
        names.size === 1 &&
        [...names][0]
          .toLowerCase()
          .replace(/[^a-z]/g, '')
          .includes('websearch')
      );
    },
  }),
];

const task = createEvalRunner({
  instructions: trim`
    Run a web search for the capital of France.
    I'm testing that the tool works, call "web-search" only.
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  // TODO(dmaretskyi): Update to use skill keys and get skills from registry.
  skills: [Ref.make(WebSearchSkill.make())],
  scorers: SCORERS,
});

evalite('Web — search the web', {
  data: [{ input: null }],
  task,
  scorers: Scorer.toEvalite(SCORERS),
});
