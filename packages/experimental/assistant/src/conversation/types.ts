//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { type Message, type MessageContentBlock } from '@dxos/artifact';
import { toJsonSchema, JsonSchemaType, ObjectId } from '@dxos/echo-schema';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

export const createUserMessage = (spaceId: SpaceId, threadId: ObjectId, text: string): Message => ({
  id: ObjectId.random(),
  spaceId,
  threadId,
  role: 'user',
  blocks: [{ type: 'text', text }],
});

/**
 * @deprecated Use {@link LLMTool} instead.
 */
export const ToolDefinition = S.Struct({
  name: S.String,
  description: S.String,
  parameters: JsonSchemaType,
  execute: S.Any,
});

/**
 * @deprecated Use {@link LLMTool} instead.
 */
export type ToolDefinition = {
  name: string;
  description: string;
  parameters: JsonSchemaType;
  execute: (params: unknown, context: ToolExecutionContext) => Promise<ToolResult>;
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
   *   interface ToolContextExtensions {
   *     chess: {
   *       board: string;
   *     };
   *   }
   * }
   * ```
   *
   * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#global-augmentation
   */
  interface ToolContextExtensions {}
}

export type ToolExecutionContext = {
  extensions: ToolContextExtensions;
};

export type ToolResult =
  | { kind: 'success'; result: unknown; extractContentBlocks?: MessageContentBlock[] }
  | { kind: 'error'; message: string }
  | { kind: 'break'; result: unknown };

export const ToolResult = Object.freeze({
  /**
   * The tool execution was successful.
   * Gives the result back to the LLM.
   */
  Success: (result: unknown, extractContentBlocks?: MessageContentBlock[]): ToolResult => ({
    kind: 'success',
    result,
    extractContentBlocks,
  }),

  Error: (message: string): ToolResult => ({ kind: 'error', message }),
  /**
   * Stop the conversation and return the result.
   */
  Break: (result: unknown): ToolResult => ({ kind: 'break', result }),
});

export type DefineToolParams<Params extends S.Schema.AnyNoContext> = {
  name: string;
  description: string;
  schema: Params;
  execute: (params: S.Schema.Type<Params>, context: ToolExecutionContext) => Promise<ToolResult>;
};

export const defineTool = <Params extends S.Schema.AnyNoContext>({
  name,
  description,
  schema,
  execute,
}: DefineToolParams<Params>): ToolDefinition => {
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

/**
 * Adapts schems to be able to pass to AI providers.
 */
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
