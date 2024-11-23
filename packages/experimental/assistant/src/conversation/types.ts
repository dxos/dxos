//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { toJsonSchema } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { type JsonSchemaType } from '@dxos/echo-schema';
import type { P } from 'vitest/dist/chunks/environment.CzISCQ7o';

export type LLMMessage = {
  role: 'user' | 'assistant';
  content: LLMMessageContent[];
  stopReason?: 'tool_use';
};

export type LLMMessageContent =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'tool_use';

      /**
       * Result must have the same id as the tool.
       */
      id: string;

      /**
       * Tool name.
       */
      name: string;
      input: unknown;
    }
  | {
      type: 'tool_result';
      tool_use_id: string;
      /**
       * Text or image types.
       */
      content: string;
      is_error?: boolean;
    };

export const createUserMessage = (text: string): LLMMessage => ({
  role: 'user',
  content: [{ type: 'text', text }],
});

export type LLMTool = {
  name: string;
  description: string;
  parameters: JsonSchemaType;
  execute: (params: unknown, context: ToolExecutionContext) => Promise<LLMToolResult>;
};

export type ToolExecutionContext = {};

export type LLMToolResult =
  | { kind: 'success'; result: unknown }
  | { kind: 'error'; message: string }
  | { kind: 'break'; result: unknown };

export const LLMToolResult = Object.freeze({
  /**
   * The tool execution was successful.
   * Gives the result back to the LLM.
   */
  Success: (result: unknown): LLMToolResult => ({ kind: 'success', result }),

  Error: (message: string): LLMToolResult => ({ kind: 'error', message }),
  /**
   * Stop the conversation and return the result.
   */
  Break: (result: unknown): LLMToolResult => ({ kind: 'break', result }),
});

export type LLMModel = '@hf/nousresearch/hermes-2-pro-mistral-7b' | '@anthropic/claude-3-5-sonnet-20241022';

export type DefineToolParams<Params extends S.Schema.AnyNoContext> = {
  name: string;
  description: string;
  schema: Params;
  execute: (params: S.Schema.Type<Params>, context: ToolExecutionContext) => Promise<LLMToolResult>;
};

export const defineTool = <Params extends S.Schema.AnyNoContext>({
  name,
  description,
  schema,
  execute,
}: DefineToolParams<Params>): LLMTool => {
  return {
    name,
    description,
    parameters: toFunctionParameterSchema(schema),
    execute: (params, context) => {
      const sanitized = S.decodeSync(schema)(params);
      return execute(sanitized, context);
    },
  };
};

const toFunctionParameterSchema = (schema: S.Schema.All) => {
  const jsonSchema = toJsonSchema(schema);
  log.info('tool schema', { jsonSchema });
  for (const key in jsonSchema.properties) {
    if (typeof jsonSchema.properties![key].description !== 'string') {
      throw new Error(`Property missing description: ${key}`);
    }
  }
  return jsonSchema;
};
