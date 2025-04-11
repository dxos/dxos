//
// Copyright 2024 DXOS.org
//

import { Message } from '@dxos/artifact';
import { DEFAULT_EDGE_MODEL, MixedStreamParser, type AIServiceClient } from '@dxos/assistant';
import { createStatic } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { isNonNullable } from '@dxos/util';

import { type MeetingType } from './types';

export const getMeetingContent = async (meeting: MeetingType, resolve: (typename: string) => Record<string, any>) => {
  const serializedArtifacts = await Promise.all(
    Object.entries(meeting.artifacts).map(async ([typename, ref]) => {
      const { getTextContent } = resolve(typename);
      const artifact = await ref.load();
      const content = await getTextContent?.(artifact);
      return content;
    }),
  );
  const content = serializedArtifacts.filter(isNonNullable).join('\n\n');
  return content;
};

export const summarizeTranscript = async (ai: AIServiceClient, content: string): Promise<string> => {
  log.info('summarizing meeting', { contentLength: content.length });

  const parser = new MixedStreamParser();
  const output = await parser.parse(
    await ai.exec({
      model: DEFAULT_EDGE_MODEL,
      systemPrompt: SUMMARIZE_PROMPT,
      history: [createStatic(Message, { role: 'user', content: [{ type: 'text', text: content }] })],
    }),
  );

  log.info('transcript summary', { output });
  invariant(output[0].content[0].type === 'text', 'Expected text content');
  return output[0].content[0].text;
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
