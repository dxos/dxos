//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { createArtifactElement } from '@dxos/assistant';
import { ObjectId, S } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { create, makeRef, type Space } from '@dxos/react-client/echo';
import { TextType } from '@dxos/schema';
import { SpaceAction } from '@dxos/plugin-space/types';

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export default () => {
  const definition = defineArtifact({
    id: 'plugin-script',
    // TODO(dmaretskyi): Since writing scripts requires a lot of domain knowledge,
    //                   we should offload the work of synthesizing the code to a separate model.
    //                   The main reasoning model will give it a concrete task and the script model will synthesize the code, knowing all the docs.
    instructions: `
      If the user explicitly requests you to write a script, you can create one.
      If the user requests you to change one of the existing script, you can update it.
      Scripts are short code pieces of executable code that can be used to perform computations, integrate with external systems, and perform automated tasks.
      Each script must follow as strict shape for the definition but the body can contain any valid executable code.
      Scripts are written in JavaScript or TypeScript.
      Each script must define an input schema and output schema.

      Schema: 
        The schema is defined using a schema-DSL library called Effect Schema.
        The input schema describes the arguments that the script accepts.
        The output schema describes the result that the script produces.
        The schema is used to validate the script's input and output.
        The schema is also goes into the script metadata.
        The properties in the schema must have valid descriptions.

      Restricts:
        The scripts can only import code from "dxos:functions" module. No other modules are allowed.
        Some web APIs are available - like fetch.

      <apis>
        export function defineFunction(params: { 
          description: string, 
          inputSchema: S.Schema, 
          outputSchema: S.Schema, 
          handler: (params: { event: { data: TInput } }) => Promise<TOutput> 
        }): FunctionDefinition
        /**
         * Effect Schema
         */
        export const S; 

        // Examples: 

        S.String
        S.Number
        S.Boolean
        S.Struct({
          from: S.String.annotations({ description: 'The source currency' }),
          to: S.String.annotations({ description: 'The target currency' }),
        })
        S.Array(S.String)
        S.Union(S.String, S.Number)
        S.Optional(S.String)
        S.String.annotations({ description: 'The source currency' })
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

        /**
         * Returns the exchange rate between two currencies.
         */
        export default defineFunction({
          inputSchema: S.Struct({
            from: S.String.annotations({ description: 'The source currency' }),
            to: S.String.annotations({ description: 'The target currency' }),
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

            return rates[to].toString();
          },
        });
      </example>
  `,
    schema: ScriptType,
    tools: [
      defineTool({
        name: 'script_new',
        description: 'Create a new script. Returns the artifact definition for the script',
        schema: S.Struct({
          name: S.String.annotations({ description: 'The name of the script' }),
          code: S.String.annotations({
            description: 'The full code of the script in JavaScript or TypeScript. Must be valid executable code.',
          }),
        }),
        execute: async ({ name, code }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          invariant(extensions?.dispatch, 'No intent dispatcher');
          const script = create(ScriptType, {
            name,
            source: makeRef(
              create(TextType, {
                content: code,
              }),
            ),
          });
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
      defineTool({
        name: 'script_inspect',
        description: 'Inspect a script. Returns the artifact definition for the script',
        schema: S.Struct({
          id: ObjectId,
        }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.space, 'No space');

          const script = (await extensions.space.db.query({ id }).first()) as ScriptType;
          const { content } = await script.source.load();

          return ToolResult.Success({
            name: script.name,
            code: content,
          });
        },
      }),
      defineTool({
        name: 'script_update',
        description: 'Update a script. Returns the artifact definition for the script',
        schema: S.Struct({
          id: ObjectId,
          code: S.String.annotations({
            description: 'The full code of the script in JavaScript or TypeScript. Must be valid executable code.',
          }),
        }),
        execute: async ({ id, code }, { extensions }) => {
          invariant(extensions?.space, 'No space');

          const script = (await extensions.space.db.query({ id }).first()) as ScriptType;
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

  return contributes(Capabilities.ArtifactDefinition, definition);
};
