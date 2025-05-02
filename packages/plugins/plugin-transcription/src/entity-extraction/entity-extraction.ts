import { createTemplate, defineTool, Message, structuredOutputParser } from '@dxos/artifact';
import type { AIServiceClient } from '@dxos/assistant';
import { MixedStreamParser } from '@dxos/assistant';
import { raise } from '@dxos/debug';
import { create } from '@dxos/echo-schema';
import { failedInvariant } from '@dxos/invariant';
import type { ContactType, MessageType } from '@dxos/schema';
import { Schema } from 'effect';
import type { TranscriptBlock } from '../types';
import type { DocumentType } from '../testing/test-data';
import SYSTEM_PROMPT from './system-prompt.tpl?raw';

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

/**
 * Process Handlebars template.
 */
const createSystemPrompt = (): string => {
  const template = createTemplate(SYSTEM_PROMPT);
  return template({});
};

export const processTranscriptBlock = async (
  params: ProcessTranscriptBlockParams,
): Promise<ProcessTranscriptBlockResult> => {
  // TODO(dmaretskyi): Move context to a vector search index.
  const systemPrompt = `
    ${createSystemPrompt()}
    Context:
    ${JSON.stringify([...(params.context.contacts ?? []), ...(params.context.documents ?? [])])}
  `;

  const outputParser = structuredOutputParser(
    Schema.Struct({
      segments: Schema.Array(Schema.String).annotations({
        description: 'The enhanced text of the transcript segments, keep the order and structure exactly as is',
      }),
    }),
  );
  const result = outputParser.getResult(
    await new MixedStreamParser().parse(
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
        tools: [outputParser.tool],
      }),
    ),
  );

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
