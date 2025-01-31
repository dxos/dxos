//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { JsonSchemaType } from '@dxos/echo-schema';

import { type MessageContentBlock } from './message';

declare global {
  /**
   * Extensions to the tool execution context.
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
  extensions?: LLMToolContextExtensions;
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

/**
 * Tool definition callable from GPT.
 * Extension of convention introduced by OpenAI.
 * https://platform.openai.com/docs/guides/function-calling
 * https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */
// TODO(burdon): Rename Tool? FunctionCall? RPC?
export const LLMTool = S.Struct({
  /**
   * Unique name.
   */
  name: S.String,

  /**
   * If the tool is implemented by the service a type should be provided.
   * For user-implemented tools, this field should be omitted.
   * Can be used to determine the environment in which the tool is implemented (e.g., client/server).
   * See {@link ToolTypes} for the list of supported types.
   */
  type: S.optional(S.String),

  /**
   * Required for user-implemented tools.
   */
  description: S.optional(S.String),

  /**
   * Input schema for the tool in the JSON Schema format.
   * Required for user-implemented tools.
   */
  // TODO(burdon): Rename inputSchema.
  parameters: S.optional(JsonSchemaType),

  /**
   * Tool-specific options passed to the tool during invocation.
   */
  options: S.optional(S.Any),
});

export interface LLMTool extends S.Schema.Type<typeof LLMTool> {
  /**
   * Javascript function to execute the tool.
   */
  execute?: (params: unknown, context?: ToolExecutionContext) => Promise<LLMToolResult>;
}
