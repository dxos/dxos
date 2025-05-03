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
import { asyncTimeout } from '@dxos/async';

type ProcessTranscriptMessageParams = {
  message: MessageType;
  aiService: AIServiceClient;
  context: {
    objects?: BaseEchoObject[];
  };

  options?: {
    /**
     * Timeout for the entity extraction.
     */
    timeout?: number;

    /**
     * Fallback to raw text if the entity extraction fails.
     * Otherwise the function will throw an error.
     * @default false
     */
    fallbackToRaw?: boolean;
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
  try {
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

    const runParser = async (): Promise<ProcessTranscriptMessageResult> => {
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

    if (params.options?.timeout && params.options.timeout > 0) {
      return await asyncTimeout(runParser, params.options.timeout);
    } else {
      return await runParser();
    }
  } catch (error) {
    if (params.options?.fallbackToRaw) {
      return {
        message: params.message,
      };
    } else {
      throw error;
    }
  }
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
