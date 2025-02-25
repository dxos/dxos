//
// Copyright 2024 DXOS.org
//

import { JsonSchemaType, S } from '@dxos/echo-schema';

import { type MessageContentBlock } from './message';

declare global {
  /**
   * Extensions to the tool execution context.
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
  extensions?: ToolContextExtensions;
};

export type ToolResult =
  // TODO(dmaretskyi): Rename `contentBlocks`
  | { kind: 'success'; result: unknown; extractContentBlocks?: MessageContentBlock[] }
  | { kind: 'error'; message: string }
  | { kind: 'break'; result: unknown };

export const ToolResult = Object.freeze({
  /**
   * The tool execution was successful.
   * Gives the result back to the LLM.
   */
  // TODO(dmaretskyi): Rename `contentBlocks`
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

/**
 * Tool definition callable from GPT.
 * Extension of convention introduced by OpenAI.
 * https://platform.openai.com/docs/guides/function-calling
 * https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */
export const Tool = S.Struct({
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

export interface Tool extends S.Schema.Type<typeof Tool> {
  /**
   * Javascript function to execute the tool.
   */
  execute?: (params: unknown, context?: ToolExecutionContext) => Promise<ToolResult>;
}
