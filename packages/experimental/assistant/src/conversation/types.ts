//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { toJsonSchema, JsonSchemaType, ObjectId } from '@dxos/echo-schema';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { type Message, type MessageContentBlock } from '../ai-service';

export const createUserMessage = (spaceId: SpaceId, threadId: ObjectId, text: string): Message => ({
  id: ObjectId.random(),
  spaceId,
  threadId,
  role: 'user',
  content: [{ type: 'text', text }],
});

export const LLMToolDefinition = S.Struct({
  name: S.String,
  description: S.String,
  parameters: JsonSchemaType,
  execute: S.Any,
});

export type LLMToolDefinition = {
  name: string;
  description: string;
  parameters: JsonSchemaType;
  execute: (params: unknown, context: ToolExecutionContext) => Promise<LLMToolResult>;
};

declare global {
  /**
   * Extensions to the tool execution context.
   *
   * Different modules can extend this definition to add their own properties.
   *
   * @example
   * ```ts
   * declare global {
   *   interface LLMToolContextExtensions {
   *     chess: {
   *       board: string;
   *     };
   *   }
   * }
   * ```
   *
   * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#global-augmentation
   */
  interface LLMToolContextExtensions {}
}

export type ToolExecutionContext = {
  extensions: LLMToolContextExtensions;
};

export type LLMToolResult =
  | { kind: 'success'; result: unknown; extractContentBlocks?: MessageContentBlock[] }
  | { kind: 'error'; message: string }
  | { kind: 'break'; result: unknown };

export const LLMToolResult = Object.freeze({
  /**
   * The tool execution was successful.
   * Gives the result back to the LLM.
   */
  Success: (result: unknown, extractContentBlocks?: MessageContentBlock[]): LLMToolResult => ({
    kind: 'success',
    result,
    extractContentBlocks,
  }),

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
  delete jsonSchema.anyOf;
  delete jsonSchema.$id;
  jsonSchema.type = 'object';
  jsonSchema.properties ??= {};
  for (const key in jsonSchema.properties) {
    if (typeof jsonSchema.properties![key].description !== 'string') {
      throw new Error(`Property missing description: ${key}`);
    }
  }
  return jsonSchema;
};
