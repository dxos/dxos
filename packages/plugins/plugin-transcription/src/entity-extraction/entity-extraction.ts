//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { createTemplate, Message, structuredOutputParser } from '@dxos/artifact';
import type { AIServiceClient } from '@dxos/assistant';
import { MixedStreamParser } from '@dxos/assistant';
import { raise } from '@dxos/debug';
import { create } from '@dxos/echo-schema';
import type { BaseEchoObject } from '@dxos/echo-schema';
import { type MessageType } from '@dxos/schema';

import SYSTEM_PROMPT from './system-prompt.tpl?raw';

type ProcessTranscriptMessageParams = {
  message: MessageType;
  aiService: AIServiceClient;
  context: {
    objects?: BaseEchoObject[];
  };
};

type ProcessTranscriptMessageResult = {
  message: MessageType;
};

/**
 * Process Handlebars template.
 */
const createSystemPrompt = (): string => {
  const template = createTemplate(SYSTEM_PROMPT);
  return template({});
};

export const processTranscriptMessage = async (
  params: ProcessTranscriptMessageParams,
): Promise<ProcessTranscriptMessageResult> => {
  // TODO(dmaretskyi): Move context to a vector search index.
  const systemPrompt = `
    ${createSystemPrompt()}
    Context:
    ${JSON.stringify(params.context.objects)}
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
                text: JSON.stringify(params.message),
              },
            ],
          }),
        ],
        tools: [outputParser.tool],
      }),
    ),
  );

  return {
    message: {
      ...params.message,
      blocks: params.message.blocks.map((block, i) => ({
        ...block,
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
