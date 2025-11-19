//
// Copyright 2024 DXOS.org
//

import type * as AiError from '@effect/ai/AiError';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import {
  type AiModelNotAvailableError,
  AiService,
  type AiToolNotFoundError,
  type PromptPreprocessingError,
  ToolExecutionService,
  ToolResolverService,
} from '@dxos/ai';
import { type AiAssistantError, AiSession } from '@dxos/assistant';
import { Type } from '@dxos/echo';
import { TracingService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Transcript } from '@dxos/types';
import { trim } from '@dxos/util';

import { type Meeting } from './types';

// TODO(wittjosiah): Also include content of object which are linked to the meeting.
export const getMeetingContent = async (
  meeting: Meeting.Meeting,
  resolve: (typename: string) => Record<string, any>,
) => {
  const notes = await meeting.notes.load();
  const { getTextContent } = resolve(Type.getTypename(Transcript.Transcript)!);
  const transcript = await meeting.transcript.load();
  const content = `${await getTextContent(transcript)}\n\n${notes.content}`;
  return content;
};

export const summarizeTranscript: (content: string) => Effect.Effect<
  string,
  // TODO(dmaretskyi): There should be a clear re-export for all AI-related errors.
  AiAssistantError | PromptPreprocessingError | AiModelNotAvailableError | AiToolNotFoundError | AiError.AiError,
  AiService.AiService
> = Effect.fn('summarizeTranscript')(
  function* (content) {
    log.info('summarizing meeting', { contentLength: content.length });

    const output = yield* new AiSession().run({
      system: SUMMARIZE_PROMPT,
      prompt: content,
    });

    log.info('transcript summary', { output });
    invariant(output[0].blocks[0]._tag === 'text', 'Expected text content');
    return output[0].blocks[0].text;
  },
  Effect.provide(
    Layer.mergeAll(
      AiService.model('@anthropic/claude-3-5-haiku-latest'),
      ToolResolverService.layerEmpty,
      ToolExecutionService.layerEmpty,
      TracingService.layerNoop,
    ),
  ),
);

// TODO(dmaretskyi): Add example to set consistent structure for the summary.
const SUMMARIZE_PROMPT = trim`
  # Goal
  Create a markdown summary of the transcript provided.

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
