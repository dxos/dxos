#!/usr/bin/env pnpm --silent vite-node --script

//
// Copyright 2025 DXOS.org
//

import { Effect, Layer } from 'effect';

import { AiService, DebugConsolePrinter } from '@dxos/ai';
import { AiServiceTestingPreset, EXA_API_KEY } from '@dxos/ai/testing';
import {
  AiConversation,
  type ContextBinding,
  GenerationObserver,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import {
  ComputeEventLogger,
  CredentialsService,
  DatabaseService,
  LocalFunctionExecutionService,
  QueueService,
  RemoteFunctionExecutionService,
  TracingService,
} from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { DataType } from '@dxos/schema';

import { RESEARCH_BLUEPRINT } from '../../blueprints';
import { testToolkit } from '../../blueprints/testing';

import { default as research } from './research';
import { ResearchGraph } from './research-graph';
import { ResearchDataTypes } from './types';

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([research], testToolkit),
  makeToolExecutionServiceFromFunctions([research], testToolkit, testToolkit.toLayer({}) as any),
  ComputeEventLogger.layerFromTracing,
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      AiServiceTestingPreset('direct'),
      TestDatabaseLayer({
        indexing: { vector: true },
        types: [...ResearchDataTypes, ResearchGraph, Blueprint.Blueprint],
      }),
      CredentialsService.configuredLayer([{ service: 'exa.ai', apiKey: EXA_API_KEY }]),
      LocalFunctionExecutionService.layer,
      RemoteFunctionExecutionService.mockLayer,
      TracingService.layerNoop,
    ),
  ),
);

const main = Effect.fn(function* () {
  yield* DatabaseService.add(Obj.make(DataType.Organization, { name: 'Notion', website: 'https://www.notion.com' }));
  yield* DatabaseService.flush({ indexes: true });

  const conversation = new AiConversation({
    queue: yield* QueueService.createQueue<DataType.Message | ContextBinding>(),
  });
  const observer = GenerationObserver.fromPrinter(new DebugConsolePrinter());

  const blueprint = yield* DatabaseService.add(Obj.clone(RESEARCH_BLUEPRINT));
  yield* Effect.promise(() => conversation.context.bind({ blueprints: [Ref.make(blueprint)] }));

  yield* conversation.run({
    prompt: `Research notion founders.`,
    observer,
  });
}, Effect.provide(TestLayer));

await Effect.runPromise(main());
