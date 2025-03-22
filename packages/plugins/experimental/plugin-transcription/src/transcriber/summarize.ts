//
// Copyright 2024 DXOS.org
//

import { Message } from '@dxos/artifact';
import { DEFAULT_LLM_MODEL, MixedStreamParser, type AIServiceClient } from '@dxos/assistant';
import { create, makeRef } from '@dxos/client/echo';
import { QueueImpl } from '@dxos/echo-db';
import { createStatic, isInstanceOf } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { type EdgeHttpClient } from '@dxos/react-edge-client';
import { TextType } from '@dxos/schema';

import { TranscriptBlock, type TranscriptType } from '../types';

// TODO(dmaretskyi): Extract to the new file once transcript refactoring has settled.
export const summarizeTranscript = async (
  edge: EdgeHttpClient,
  ai: AIServiceClient,
  transcript: TranscriptType,
): Promise<DocumentType> => {
  invariant(transcript.queue, 'No queue found for transcript');

  const queue = new QueueImpl(edge, DXN.parse(transcript.queue));
  await queue.refresh();
  const content = queue.items
    .filter((block) => isInstanceOf(TranscriptBlock, block))
    .map((block) => `${block.author}: ${block.segments.map((segment) => segment.text).join('\n')}`)
    .join('\n\n');

  const parser = new MixedStreamParser();

  log.info('summarizing transcript', { blockCount: queue.items.length });
  const output = await parser.parse(
    await ai.exec({
      model: DEFAULT_LLM_MODEL,
      systemPrompt: SUMMARIZE_PROMPT,
      history: [createStatic(Message, { role: 'user', content: [{ type: 'text', text: content }] })],
    }),
  );

  log.info('transcript summary', { output });
  invariant(output[0].content[0].type === 'text', 'Expected text content');
  const summary = output[0].content[0].text;

  // TODO(dmaretskyi): .started is missing.
  const name = `Summary ${(transcript.started ?? new Date()).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  return create(DocumentType, {
    name,
    content: makeRef(create(TextType, { content: summary })),
    threads: [],
  });
};

// TODO(dmaretskyi): Add example to set consistent structure for the summary.
const SUMMARIZE_PROMPT = `
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
