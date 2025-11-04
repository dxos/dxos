//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Array from 'effect/Array';
import * as Function from 'effect/Function';

import { AiService } from '@dxos/ai';
import { AiSession, SessionContext, ContextProvider } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect';
import { DatabaseService, TracingService, ContextQueueService } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { MemoizedAiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { ComputeEventLogger, CredentialsService, FunctionInvocationService } from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { ObjectId, type DXN } from '@dxos/keys';

import { Type, Obj } from '@dxos/echo';
import { trim } from '@dxos/util';
import * as LanguageModel from '@effect/ai/LanguageModel';
import { makeGraphWriterHandler, makeGraphWriterToolkit, makeGraphWriterHandlerToDatabase } from './graph';
import { unreachable, invariant } from '@dxos/invariant';
import * as Prompt from '@effect/ai/Prompt';
ObjectId.dangerouslyDisableRandomness();

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions(),
  makeToolExecutionServiceFromFunctions(),
  ComputeEventLogger.layerFromTracing,
).pipe(
  Layer.provideMerge(FunctionInvocationService.layerTest({ functions: [] })),
  Layer.provideMerge(
    Layer.mergeAll(
      MemoizedAiService.layerTest().pipe(Layer.provide(AiServiceTestingPreset('direct'))),
      TestDatabaseLayer({
        spaceKey: 'fixed',
        indexing: { vector: true },
        types: [Blueprint.Blueprint, DataType.Message, DataType.Person, DataType.Organization],
      }),
      CredentialsService.configuredLayer([]),
      TracingService.layerNoop,
    ),
  ),
);

const popToolUseBlocks = (prompt: Prompt.Prompt) => {
  if (prompt.content.length === 0) {
    return prompt;
  }
  return Prompt.fromMessages([
    ...prompt.content.slice(0, -1),
    Function.pipe(prompt.content.at(-1)!, (msg) => {
      if (msg.role !== 'assistant') {
        return msg;
      }
      return Prompt.makeMessage('assistant', {
        content: Function.pipe(
          msg.content,
          Array.reverse,
          Array.dropWhile((_) => _.type === 'tool-call'),
          Array.reverse,
        ),
      });
    }),
  ]);
};

class OutOfLineWriter extends Toolkit.make(
  Tool.make('create-object', {
    description: trim`
      Create a new database object
      This will launch an agent that has access to the current context that will fill the object with data.
    `,
    parameters: {
      schema: Schema.String.annotations({
        description: 'The fully-qualified schema name',
        examples: ['example.com/type/Person'],
      }),
    },
    success: Schema.Unknown,
    dependencies: [SessionContext, DatabaseService, LanguageModel.LanguageModel],
  }),
) {
  static layer = this.toLayer({
    'create-object': Effect.fnUntraced(function* ({ schema: schemaTypename }) {
      const { db } = yield* DatabaseService;
      const schema = db.graph.schemaRegistry.schemas.find((_) => Type.getTypename(_) === schemaTypename);
      if (!schema) {
        throw new Error(`Schema not found (only statically registered schemas are available): ${schemaTypename}`);
      }

      let createdObjects: DXN[] = [];
      const graphWriter = makeGraphWriterToolkit({
        schema: [schema],
      });
      const toolkit = yield* graphWriter.pipe(
        Effect.provide(
          makeGraphWriterHandlerToDatabase(graphWriter, { onAppend: (objects) => createdObjects.push(...objects) }),
        ),
      );
      const result = yield* LanguageModel.generateText({
        prompt: popToolUseBlocks(yield* SessionContext.historyPrompt),
        toolkit,
        toolChoice: 'required',
      }).pipe(Effect.orDie);

      const objects = createdObjects.map((dxn) => db.ref(dxn).target ?? unreachable());
      invariant(objects.length === 1);

      return Obj.toJSON(objects[0]);
    }),
  });
}

const SchemaContextProvider: ContextProvider = Effect.fn(
  'SchemaContextProvider',
  {},
)(function* () {
  const { db } = yield* DatabaseService;
  const schema = db.graph.schemaRegistry.schemas.map((_) => Type.getTypename(_));
  return {
    system: `Available schemas:\n${schema.join('\n')}`,
  };
});

describe('Out-of-line writer', () => {
  it.effect(
    'create org',
    Effect.fn(
      function* (_) {
        const toolkit = yield* OutOfLineWriter.pipe(Effect.provide(OutOfLineWriter.layer));
        const response = yield* new AiSession().run({
          prompt: 'Create a Cyberdyne Systems organization',
          toolkit,
          contextProviders: [SchemaContextProvider],
        });

        log.info('response', { response });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined,
  );
});
