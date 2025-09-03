//
// Copyright 2025 DXOS.org
//

import { Array, Effect, Layer, Option, Schema, pipe } from 'effect';

import { AiService, ConsolePrinter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiSession, GenerationObserver } from '@dxos/assistant';
import { TracingService, defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

/**
 * Summarize a mailbox.
 */
export default defineFunction({
  name: 'dxos.org/function/inbox/summarize',
  description: 'Summarize a mailbox.',
  inputSchema: Schema.Struct({
    messages: Schema.String.annotations({
      description: 'The contents of the mailbox.',
    }),
  }),
  outputSchema: Schema.Struct({
    summary: Schema.String.annotations({
      description: 'The summary of the mailbox.',
    }),
  }),
  handler: Effect.fnUntraced(
    function* ({ data: { messages } }) {
      const result = yield* new AiSession().run({
        prompt: messages,
        history: [],
        system: systemPrompt,
        observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'summarize' })),
      });

      const summary = pipe(
        result,
        Array.findLast((msg) => msg.sender.role === 'assistant' && msg.blocks.some((block) => block._tag === 'text')),
        Option.flatMap((msg) =>
          pipe(
            msg.blocks,
            Array.findLast((block) => block._tag === 'text'),
            Option.map((block) => block.text),
          ),
        ),
        Option.getOrThrowWith(() => new Error('No summary found')),
      );

      return { summary };
    },
    Effect.provide(
      Layer.mergeAll(
        AiService.model('@anthropic/claude-sonnet-4-0'),
        ToolResolverService.layerEmpty,
        ToolExecutionService.layerEmpty,
        TracingService.layerNoop,
      ),
    ),
  ),
});

const systemPrompt = trim`
  You are a helpful assistant that summarizes mailboxes.

  # Goal
  Create a markdown summary of the mailbox with text notes provided.

  # Formatting
  - Format the summary as a markdown document without extra comments like "Here is the summary of the mailbox:".
  - Use markdown formatting for headings and bullet points.
  - Format the summary as a list of key points and takeaways.

  # Tasks
  At the end of the summary include tasks.
  Extract only the tasks that are:
  - Directly actionable.
  - Clearly assigned to a person or team (or can easily be inferred).
  - Strongly implied by the conversation and/or user note (no speculative tasks).
  - Specific enough that someone reading them would know exactly what to do next.

  Format all tasks as markdown checkboxes using the syntax:
  - [ ] Task description.

  Additional information can be included (indented).

  If no actionable tasks are found, omit this tasks section.
`;
