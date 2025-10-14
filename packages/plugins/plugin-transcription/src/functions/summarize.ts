//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as pipe from 'effect/pipe';
import * as Schema from 'effect/Schema';

import { AiService, ConsolePrinter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiSession, GenerationObserver } from '@dxos/assistant';
import { TracingService, defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

/**
 * Summarize a transcript of a meeting.
 */
export default defineFunction({
  key: 'dxos.org/function/transcription/summarize',
  name: 'Summarize',
  description: 'Summarize a transcript of a meeting.',
  inputSchema: Schema.Struct({
    transcript: Schema.String.annotations({
      description: 'The transcript of the meeting.',
    }),
    notes: Schema.optional(Schema.String).annotations({
      description: 'Additional notes from the participants.',
    }),
  }),
  outputSchema: Schema.Struct({
    summary: Schema.String.annotations({
      description: 'The summary of the transcript.',
    }),
  }),
  handler: Effect.fnUntraced(
    function* ({ data: { transcript, notes } }) {
      const result = yield* new AiSession().run({
        prompt: `Transcript: ${transcript}\n\nNotes: ${notes}`,
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
  You are a helpful assistant that summarizes transcripts of meetings.

  # Goal
  Create a markdown summary of the meeting transcript with text notes provided.
  Notes are very important so make sure to include them in the summary if they contain meaningful information.

  # Formatting
  - Format the summary as a markdown document without extra comments like "Here is the summary of the transcript:".
  - Use markdown formatting for headings and bullet points.
  - Format the summary as a list of key points and takeaways.
  - All names of people should be in bold.

  # Note Taking
  - Correlate items in the summary with the person of origin to build a coherent narrative.
  - Include short quotes verbatim where appropriate. Especially when concerned with design decisions and problem descriptions.

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
