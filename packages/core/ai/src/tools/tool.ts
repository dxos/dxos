//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { JsonSchemaType } from '@dxos/echo-schema';

import { type MessageContentBlock } from './message';
import type { AgentStatus } from '../status-report';

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
  /**
   * Extensions are injected by the caller.
   */
  extensions?: ToolContextExtensions;

  /**
   * Report what tool is doing currently.
   */
  reportStatus?: (status: AgentStatus) => void;
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
export const Tool = Schema.Struct({
  // TODO(burdon): DXN?
  id: Schema.String,

  /**
   * Unique name.
   * ^[a-zA-Z0-9_-]{1,64}$
   */
  name: Schema.String,
  namespace: Schema.optional(Schema.String),
  function: Schema.optional(Schema.String),

  /**
   * If the tool is implemented by the service a type should be provided.
   * For user-implemented tools, this field should be omitted.
   * Can be used to determine the environment in which the tool is implemented (e.g., client/server).
   * See {@link ToolTypes} for the list of supported types.
   */
  type: Schema.optional(Schema.String),

  /**
   * Displayed to user when tool is called.
   */
  caption: Schema.optional(Schema.String),

  /**
   * Required for user-implemented tools.
   */
  description: Schema.optional(Schema.String),

  /**
   * Input schema for the tool in the JSON Schema format.
   * Required for user-implemented tools.
   */
  // TODO(burdon): Rename inputSchema.
  parameters: Schema.optional(JsonSchemaType),

  /**
   * Tool-specific options passed to the tool during invocation.
   */
  options: Schema.optional(Schema.Any),
});

export type Tool = Schema.Schema.Type<typeof Tool>;

export interface ExecutableTool extends Tool {
  execute: (params: unknown, context: ToolExecutionContext) => Promise<ToolResult>;
}

export const ToolId = Schema.String.annotations({
  identifier: 'ToolId',
  name: 'ToolId',
  description: 'Unique identifier for a tool.',
});
export type ToolId = Schema.Schema.Type<typeof ToolId>;

export interface ToolResolver {
  resolve: (id: ToolId) => Promise<ExecutableTool>;
}

/**
 * Registry of executable tools.
 */
// TODO(burdon): Tool resolution is duplicated in the session and ollama-client.
export class ToolRegistry implements ToolResolver {
  private readonly _tools = new Map<string, ExecutableTool>();

  constructor(tools: ExecutableTool[]) {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  toJSON() {
    return {
      tools: Array.from(this._tools.values()).map((tool) => ({
        name: tool.name,
        namespace: tool.namespace,
        type: tool.type,
      })),
    };
  }

  register(tool: ExecutableTool): this {
    this._tools.set(tool.id, tool);
    return this;
  }

  async resolve(id: ToolId): Promise<ExecutableTool> {
    const executable = this._tools.get(id);
    if (!executable) {
      throw new Error(`Tool not found: ${id}`);
    }
    return executable;
  }
}
