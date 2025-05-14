//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { failedInvariant } from '@dxos/invariant';

import type { Message } from './message';
import { ToolResult, type Tool, type ToolExecutionContext } from './tools';

export type DefineToolParams<Params extends Schema.Schema.AnyNoContext> = {
  /**
   * The name of the tool (may include hyphens but not underscores).
   */
  name: string;
  caption?: string;
  description: string;
  schema: Params;
  execute: (params: Schema.Schema.Type<Params>, context: ToolExecutionContext) => Promise<ToolResult>;
};

export const parseToolName = (name: string) => {
  return name.split('_').pop();
};

export const defineTool = <Params extends Schema.Schema.AnyNoContext>(
  namespace: string,
  { name, caption, description, schema, execute }: DefineToolParams<Params>,
): Tool => {
  return {
    name: [namespace, name].join('/').replace(/[^\w-]/g, '_'),
    namespace,
    function: name,
    caption,
    description,
    parameters: toFunctionParameterSchema(Type.toJsonSchema(schema)),
    execute: (params: any, context?: any) => {
      const sanitized = Schema.decodeSync(schema)(params);
      return execute(sanitized, context ?? {});
    },
  };
};

/**
 * Adapts schemas to be able to pass to AI providers.
 */
export const toFunctionParameterSchema = (jsonSchema: Type.JsonSchema) => {
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

/**
 * Forces the agent to submit a result in a structured format by calling a tool.
 *
 * Usage:
 *
 * ```ts
 * const outputParser = structuredOutputParser(Schema.Struct({ ... }))
 * const messages = await aiService.exec({
 *   ...
 *   tools: [outputParser.tool],
 * })
 * const result = outputParser.getResult(messages)
 * ```
 */
export const structuredOutputParser = <TSchema extends Schema.Schema.AnyNoContext>(schema: TSchema) => {
  const tool = defineTool('system', {
    name: 'submit_result',
    description: 'You must call this tool with the result of your work.',
    schema,
    execute: async (params, context) => {
      return ToolResult.Break(params);
    },
  });

  return {
    tool,
    getResult: (messages: Message[]): Schema.Schema.Type<TSchema> => {
      const result = messages
        .findLast((message) => message.role === 'assistant')
        ?.content.filter((content) => content.type === 'tool_use')
        .find((content) => content.name === tool.name)?.input as any;

      return Schema.decodeUnknownSync(schema)(result);
    },
  };
};
