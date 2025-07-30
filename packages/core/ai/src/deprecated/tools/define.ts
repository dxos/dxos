//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { type JsonSchemaType } from '@dxos/echo-schema';

import { type Message } from './message';
import { type Tool, ToolResult, type ToolExecutionContext, type ExecutableTool } from './tool';

const createToolName = (name: string) => {
  return name.replace(/[^\w-]/g, '_');
};

export const parseToolName = (name: string) => {
  return name.split('_').pop();
};

/**
 * Creates a well-formed tool definition.
 * @deprecated
 */
export const defineTool = (namespace: string, { name, ...props }: Omit<Tool, 'id' | 'namespace'>): Tool => {
  const id = [namespace, name].join('/');
  return {
    id,
    name: createToolName(id),
    namespace,
    function: name,
    ...props,
  };
};

type BaseProps = Omit<Tool, 'id' | 'namespace' | 'parameters'>;

interface CreateToolParams<Params extends Schema.Schema.AnyNoContext> extends BaseProps {
  schema: Params;
  execute: (params: Schema.Schema.Type<Params>, context: ToolExecutionContext) => Promise<ToolResult>;
}

interface CreateRawToolParams extends BaseProps {
  parameters: JsonSchemaType;
  execute: (params: any, context: ToolExecutionContext) => Promise<ToolResult>;
}

/**
 * Creates a runnable tool definition.
 */
// TODO(burdon): Use @effect/ai AiTool.
export const createTool = <Params extends Schema.Schema.AnyNoContext>(
  namespace: string,
  { name, schema, execute, ...props }: CreateToolParams<Params>,
): ExecutableTool => {
  return createRawTool(namespace, {
    name,
    parameters: toFunctionParameterSchema(Type.toJsonSchema(schema)),
    execute: (params: any, context?: any) => {
      const sanitized = Schema.decodeSync(schema)(params);
      return execute(sanitized, context ?? {});
    },
    ...props,
  });
};

export const createRawTool = (
  namespace: string,
  { name, parameters, execute, ...props }: CreateRawToolParams,
): ExecutableTool => {
  const tool = defineTool(namespace, { name, ...props });
  return {
    ...tool,
    parameters,
    execute,
  };
};

/**
 * Adapts schemas to be able to pass to AI providers.
 */
export const toFunctionParameterSchema = (jsonSchema: Type.JsonSchema): Type.JsonSchema => {
  const go = (jsonSchema: Type.JsonSchema) => {
    delete jsonSchema.propertyOrder;
    delete jsonSchema.annotations;
    if (jsonSchema.properties) {
      for (const key in jsonSchema.properties) {
        go(jsonSchema.properties![key]);
      }
    }

    if (jsonSchema.items) {
      if (Array.isArray(jsonSchema.items)) {
        for (const item of jsonSchema.items) {
          go(item);
        }
      } else {
        go(jsonSchema.items as Type.JsonSchema);
      }
    }
  };

  delete jsonSchema.anyOf;
  delete jsonSchema.$id;
  jsonSchema.type = 'object';
  jsonSchema.properties ??= {};
  go(jsonSchema);

  return jsonSchema;
};

/**
 * Forces the agent to submit a result in a structured format by calling a tool.
 *
 * Usage:
 *
 * ```ts
 * const outputParser = structuredOutputParser(Schema.Struct({ ... }))
 * const messages = await AiService.exec({
 *   ...
 *   tools: [outputParser.tool],
 * })
 * const result = outputParser.getResult(messages)
 * ```
 */
export const structuredOutputParser = <TSchema extends Schema.Schema.AnyNoContext>(schema: TSchema) => {
  const tool = createTool('system', {
    name: 'submit_result',
    description: 'You must call this tool with the result of your work.',
    schema,
    execute: async (params, context) => {
      // Assert that the params are valid.
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
