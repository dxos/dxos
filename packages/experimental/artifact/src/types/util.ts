//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';

import { toJsonSchema, type JsonSchemaType } from '@dxos/echo-schema';

import { type Tool, type ToolExecutionContext, type ToolResult } from './tools';

export type DefineToolParams<Params extends S.Schema.AnyNoContext> = {
  /**
   * The name of the tool (may include hyphens but not underscores).
   */
  name: string;
  caption?: string;
  description: string;
  schema: Params;
  execute: (params: S.Schema.Type<Params>, context: ToolExecutionContext) => Promise<ToolResult>;
};

export const parseToolName = (name: string) => {
  return name.split('_').pop();
};

export const defineTool = <Params extends S.Schema.AnyNoContext>(
  namespace: string,
  { name, caption, description, schema, execute }: DefineToolParams<Params>,
): Tool => {
  return {
    name: [namespace, name].join('/').replace(/[^\w-]/g, '_'),
    namespace,
    function: name,
    caption,
    description,
    parameters: toFunctionParameterSchema(toJsonSchema(schema)),
    execute: (params: any, context?: any) => {
      const sanitized = S.decodeSync(schema)(params);
      return execute(sanitized, context ?? {});
    },
  };
};

/**
 * Adapts schemas to be able to pass to AI providers.
 */
export const toFunctionParameterSchema = (jsonSchema: JsonSchemaType) => {
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
