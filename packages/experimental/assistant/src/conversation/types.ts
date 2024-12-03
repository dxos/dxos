//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { toJsonSchema } from '@dxos/echo-schema';
import { type JsonSchemaType } from '@dxos/echo-schema';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { ObjectId, type Message } from '../ai-service';

export const createUserMessage = (spaceId: SpaceId, threadId: ObjectId, text: string): Message => ({
  id: ObjectId.random(),
  spaceId,
  threadId,
  role: 'user',
  content: [{ type: 'text', text }],
});

export type LLMToolDefinition = {
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
}: DefineToolParams<Params>): LLMToolDefinition => {
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
  log('tool schema', { jsonSchema });
  for (const key in jsonSchema.properties) {
    if (typeof jsonSchema.properties![key].description !== 'string') {
      throw new Error(`Property missing description: ${key}`);
    }
  }
  return jsonSchema;
};
