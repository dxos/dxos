//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { WebSearchSkill } from '@dxos/assistant-toolkit';
import { Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import { completedBlocks, toolInvocations } from '../assertions';
import { createEvalRunner } from '../runner';

// Ported from the gated `Web` scenario (../testing/web-search.test.ts).
// Grades the real tool-invocation and transcript effects directly instead of the agent's
// self-reported `completedCriteria` — this is the first tool-match scorer (TESTING.md Phase 2).

const task = createEvalRunner({
  instructions: trim`
    Run a web search for the capital of France.
    I'm testing that the tool works, call "web-search" only.
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  // TODO(dmaretskyi): Update to use skill keys and get skills from registry.
  skills: [Ref.make(WebSearchSkill.make())],
  dbQuery: () =>
    Effect.gen(function* () {
      const invocations = yield* toolInvocations();
      const blocks = yield* completedBlocks();

      const nonCompletionTools = new Set(
        invocations.filter((invocation) => invocation.name !== 'completeJob').map((invocation) => invocation.name),
      );

      const assistantText = blocks
        .filter(({ role, block }) => role === 'assistant' && block._tag === 'text')
        .map(({ block }) => (block as { text: string }).text)
        .join('\n');

      return {
        onlyWebSearchUsed:
          nonCompletionTools.size === 1 &&
          [...nonCompletionTools][0]
            .toLowerCase()
            .replace(/[^a-z]/g, '')
            .includes('websearch'),
        mentionsParis: assistantText.includes('Paris'),
      };
    }),
});

evalite('Web — search the web', {
  data: [{ input: null }],
  task,
  scorers: [
    {
      name: 'answer-correct',
      description: 'The agent reports the capital of France (Paris) in its response.',
      scorer: ({ output }) => (output.dbQuery.mentionsParis ? 1 : 0),
    },
    {
      name: 'only-web-search-used',
      description: 'The web search tool was the only tool invoked (besides completeJob).',
      scorer: ({ output }) => (output.dbQuery.onlyWebSearchUsed ? 1 : 0),
    },
  ],
});
