import { defineTool, Message } from '@dxos/artifact';
import type { AIServiceClient } from '@dxos/assistant';
import { MixedStreamParser } from '@dxos/assistant';
import { raise } from '@dxos/debug';
import { create } from '@dxos/echo-schema';
import { failedInvariant } from '@dxos/invariant';
import type { ContactType, MessageType } from '@dxos/schema';
import { Schema } from 'effect';
import type { TranscriptBlock } from '../types';
import type { DocumentType } from '../testing/test-data';

type ProcessTranscriptBlockParams = {
  block: TranscriptBlock;
  aiService: AIServiceClient;
  context: {
    documents?: DocumentType[];
    contacts?: ContactType[];
  };
};

type ProcessTranscriptBlockResult = {
  block: TranscriptBlock;
};

export const processTranscriptBlock = async (
  params: ProcessTranscriptBlockParams,
): Promise<ProcessTranscriptBlockResult> => {
  const systemPrompt = `
  You are a helpful assistant that processes transcripts.
  Your goal is to enhance the transcript with entity references.
  Insert inline references to the entities in the transcript.
  Keep the transcript structure and text as is.
  Call the submit_result tool to submit your result.

  The inline reference syntax is as follows:
   - [<optional name>][<ID>] or just [<ID>]
   - Example: [Earnings Report][01JT0JP9AX0XKGZX4MV4B69VT6]

  Context:

  ${JSON.stringify([...(params.context.contacts ?? []), ...(params.context.documents ?? [])])}
`;

  const messages = await new MixedStreamParser().parse(
    await params.aiService.execStream({
      model: '@anthropic/claude-3-5-haiku-20241022',
      systemPrompt,
      history: [
        create(Message, {
          role: 'user',
          content: [
            {
              type: 'text',
              text: JSON.stringify(params.block),
            },
          ],
        }),
      ],
      tools: [
        defineTool('test', {
          name: 'submit_result',
          description: 'Submit the result',
          schema: Schema.Struct({
            segments: Schema.Array(Schema.String).annotations({
              description: 'The enhanced text of the transcript segments, keep the order and structure exactly as is',
            }),
          }),
          execute: async (params, context) => failedInvariant(),
        }),
      ],
    }),
  );

  const result = messages
    .find((message) => message.role === 'assistant')
    ?.content.find((content) => content.type === 'tool_use')?.input as any;

  return {
    block: {
      ...params.block,
      segments: params.block.segments.map((segment, i) => ({
        ...segment,
        text: postprocessText(result?.segments[i] ?? raise(new Error('failed to process email'))),
      })),
    },
  };
};

/**
 * Finds and replaces all inline references with DXNs references.
 */
// TODO(dmaretskyi): Lookup and verifiy ids from provided context.
const postprocessText = (text: string) => {
  return text.replace(/\n/g, ' ').replace(/\[([^\]]+)\]\[([A-Z0-9]+)\]/g, (match, name, id) => {
    return `[${name}][dxn:echo:@:${id}]`;
  });
};
