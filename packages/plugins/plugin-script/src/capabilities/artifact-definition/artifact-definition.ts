//
// Copyright 2025 DXOS.org
//

// ISSUE(burdon): defineArtifact
// @ts-nocheck

import * as Effect from 'effect/Effect';

import * as Schema from 'effect/Schema';


import { ToolResult, createTool } from '@dxos/ai';

import {
  Capabilities,
  type PromiseIntentDispatcher,
  
  createIntent,
  Capability,
} from '@dxos/app-framework';

import { ArtifactId, createArtifactElement } from '@dxos/assistant';

import { defineArtifact } from '@dxos/blueprints';

import { Filter, Obj, Ref } from '@dxos/echo';

import { ScriptType } from '@dxos/functions';

import { invariant } from '@dxos/invariant';

import { SpaceAction } from '@dxos/plugin-space/types';

import { type Space } from '@dxos/react-client/echo';


import { meta } from '../../meta';

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export default Capability.makeModule(() =>
  Effect.sync(() => {
  const definition = defineArtifact({
    id: `artifact:${meta.id}`,
    name: meta.name,
    // TODO(dmaretskyi): Since writing scripts requires a lot of domain knowledge,
    //  we should offload the work of synthesizing the code to a separate model.
    //  The main reasoning model will give it a concrete task and the script model will synthesize the code, knowing all the docs.
    instructions: `
      If the user explicitly requests you to write a script, you can create one.
      If the user requests you to change one of the existing script, you can update it.
      You must not create a script unless the user explicitly requests it.
      Scripts are short code pieces of executable code that can be used to perform computations, integrate with external systems, and perform automated tasks.
      Each script must follow as strict shape for the definition but the body can contain any valid executable code.
      Scripts are written in JavaScript or TypeScript.
      Each script must define an input schema and output schema.
      Each script must have its own detailed description.

      Important: You cannot execute scripts. Scripts are only available as tools after the user deploys them. You must only call the available tools.

      Description:
        The description is a detailed description of the script.
        It is used to describe the script's purpose, input, and output.
        The description is used to generate the script's documentation.
        The description is also goes into the script metadata.
        The description is used by AI to understand the script and its purpose.
        The description must provide cases on when the script should be used.

      Schema:
        The schema is defined using a schema-DSL library called Effect Schema.
        The input schema describes the arguments that the script accepts.
        The output schema describes the result that the script produces.
        The schema is used to validate the script's input and output.
        The schema is also goes into the script metadata.
        The properties in the schema must have valid descriptions.
        The input and output schemas must both be a struct of fields.

      Restricts:
        The scripts can only import code from "dxos:functions" module. No other modules are allowed.
        Some web APIs are available - like fetch.

      Reasoning:
        Before writing a script, synthesize the following information:
        - Description
        - What APIs will be used.
        - Detailed input schema
        - Detailed output schema

      <apis>
        export function defineFunction(params: {
          description: string,
          inputSchema: Schema.Schema,
          outputSchema: Schema.Schema,
          handler: (params: { event: { data: TInput } }) => Promise<TOutput>
        }): FunctionDefinition
        /**
         * Effect Schema
         */
        export const Schema;

        // Examples:

        Schema.String
        Schema.Number
        Schema.Boolean
        Schema.Struct({
          from: Schema.String.annotations({ description: 'The source currency' }),
          to: Schema.String.annotations({ description: 'The target currency' }),
        })
        Schema.Array(Schema.String)
        Schema.Union(Schema.String, Schema.Number)
        Schema.optional(Schema.String)
        Schema.String.annotations({ description: 'The source currency' })
      </apis>

      <handler_function>
        Async function that takes the argument in the form of:

        type HandlerFunctionParam = {
          event: {
            data: T // The input schema
          },
        }

        The function must return the result that matches the output schema.
      </handler_function>

      <example>
        import { defineFunction, S } from 'dxos:functions';

        export default defineFunction({
          description: 'Returns the exchange rate between two currencies.',

          inputSchema: Schema.Struct({
            from: Schema.String.annotations({ description: 'The source currency' }),
            to: Schema.String.annotations({ description: 'The target currency' }),
          }),

          outputSchema: Schema.Struct({
            rate: Schema.String.annotations({ description: 'The exchange rate' }),
          }),

          handler: async ({
            event: {
              data: { from, to },
            },
          }: any) => {
            const res = await fetch(\`https://free.ratesdb.com/v1/rates?from=\${from}&to=\${to}\`);
            const {
              data: { rates },
            } = await res.json();

            return { rate: rates[to].toString() };
          },
        });
      </example>
  `,
    schema: ScriptType,
    tools: [
      createTool(meta.id, {
        name: 'create',
        description: 'Create a new script. Returns the artifact definition for the script',
        caption: 'Creating script...',
        schema: Schema.Struct({
          name: Schema.String.annotations({ description: 'The name of the script' }),
          code: Schema.String.annotations({
            description: 'The full code of the script in JavaScript or TypeScript. Must be valid executable code.',
          }),
        }),
        execute: async ({ name, code }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          invariant(extensions?.dispatch, 'No intent dispatcher');
          const script = Obj.make(ScriptType, { name, source: Ref.make(Text.make(code)) });
          extensions.space.db.add(script);
          await extensions.space.db.flush();

          const intent = createIntent(SpaceAction.AddObject, { target: extensions.space, object: script });
          const { data, error } = await extensions.dispatch(intent);
          if (!data || error) {
            return ToolResult.Error(error?.message ?? 'Failed to create chess game');
          }

          return ToolResult.Success(createArtifactElement(script.id));
        },
      }),
      createTool(meta.id, {
        name: 'inspect',
        description: 'Inspect a script. Returns the artifact definition for the script',
        caption: 'Inspecting script...',
        schema: Schema.Struct({
          id: ArtifactId,
        }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.space, 'No space');

          const script = (await extensions.space.db.query(Filter.id(id)).first()) as ScriptType;
          const { content } = await script.source.load();

          return ToolResult.Success({
            name: script.name,
            code: content,
          });
        },
      }),
      createTool(meta.id, {
        name: 'update',
        description: 'Update a script. Returns the artifact definition for the script',
        caption: 'Updating script...',
        schema: Schema.Struct({
          id: ArtifactId,
          code: Schema.String.annotations({
            description: 'The full code of the script in JavaScript or TypeScript. Must be valid executable code.',
          }),
        }),
        execute: async ({ id, code }, { extensions }) => {
          invariant(extensions?.space, 'No space');

          const script = (await extensions.space.db.query(Filter.id(id)).first()) as ScriptType;
          const source = await script.source.load();
          if (!source) {
            return ToolResult.Error('Script not found');
          }

          source.content = code;
          await extensions.space?.db.flush();

          return ToolResult.Success({
            name: script.name,
          });
        },
      }),
    ],
  });

  return Capability.contributes(Capabilities.ArtifactDefinition, definition);
  }),
);
