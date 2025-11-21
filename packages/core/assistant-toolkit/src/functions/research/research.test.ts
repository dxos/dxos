//
// Copyright 2025 DXOS.org
//

import { inspect } from 'node:util';

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService, ConsolePrinter, MemoizedAiService } from '@dxos/ai';
import { TestAiService } from '@dxos/ai/testing';
import {
  AiConversation,
  type ContextBinding,
  GenerationObserver,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import {
  CredentialsService,
  DatabaseService,
  FunctionInvocationService,
  QueueService,
  TracingService,
} from '@dxos/functions';
import { FunctionInvocationServiceLayerTest, TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import { invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { MarkdownBlueprint, MarkdownFunction } from '@dxos/plugin-markdown/toolkit';
import { Markdown } from '@dxos/plugin-markdown/types';
import { HasSubject, type Message, Organization } from '@dxos/types';

import { ResearchBlueprint } from '../../blueprints';
import { testToolkit } from '../../blueprints/testing';

import { default as createDocument } from './document-create';
import { default as research } from './research';
import { ResearchGraph, queryResearchGraph } from './research-graph';
import { ResearchDataTypes } from './types';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions(
    [research, createDocument, MarkdownFunction.create, MarkdownFunction.open, MarkdownFunction.update],
    testToolkit,
  ),
  makeToolExecutionServiceFromFunctions(testToolkit, testToolkit.toLayer({}) as any),
).pipe(
  Layer.provideMerge(
    FunctionInvocationServiceLayerTest({
      functions: [research, createDocument, MarkdownFunction.create, MarkdownFunction.open, MarkdownFunction.update],
    }),
  ),
  Layer.provideMerge(
    Layer.mergeAll(
      TestAiService(),
      TestDatabaseLayer({
        spaceKey: 'fixed',
        indexing: { vector: true },
        types: [...ResearchDataTypes, ResearchGraph, Blueprint.Blueprint, Markdown.Document, HasSubject.HasSubject],
      }),
      CredentialsService.configuredLayer([]),
      TracingService.layerNoop,
    ),
  ),
);

describe('Research', () => {
  it.effect(
    'call a function to generate a research report',
    Effect.fnUntraced(
      function* (_) {
        yield* DatabaseService.add(
          Obj.make(Organization.Organization, {
            name: 'BlueYard',
            website: 'https://blueyard.com',
          }),
        );
        yield* DatabaseService.flush({ indexes: true });
        const result = yield* FunctionInvocationService.invokeFunction(research, {
          query: 'Founders and portfolio of BlueYard.',
        });

        console.log(inspect(result, { depth: null, colors: true }));
        console.log(JSON.stringify(result, null, 2));

        yield* DatabaseService.flush({ indexes: true });
        const researchGraph = yield* queryResearchGraph();
        if (researchGraph) {
          const data = yield* DatabaseService.load(researchGraph.queue).pipe(
            Effect.flatMap((queue) => Effect.promise(() => queue.queryObjects())),
          );
          console.log(inspect(data, { depth: null, colors: true }));
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );

  it.scoped(
    'create and update research report',
    Effect.fnUntraced(
      function* (_) {
        const organization = yield* DatabaseService.add(
          Obj.make(Organization.Organization, {
            name: 'BlueYard',
            website: 'https://blueyard.com',
          }),
        );

        const queue = yield* QueueService.createQueue<Message.Message | ContextBinding>();
        const conversation = yield* acquireReleaseResource(() => new AiConversation(queue));

        yield* DatabaseService.flush({ indexes: true });
        const researchBlueprint = yield* DatabaseService.add(Obj.clone(ResearchBlueprint));
        const markdownBlueprint = yield* DatabaseService.add(Obj.clone(MarkdownBlueprint));
        yield* Effect.promise(() =>
          conversation.context.bind({
            blueprints: [Ref.make(researchBlueprint), Ref.make(markdownBlueprint)],
            objects: [Ref.make(organization)],
          }),
        );

        const observer = GenerationObserver.fromPrinter(new ConsolePrinter());

        yield* conversation.createRequest({
          observer,
          prompt: `Create a research summary about ${organization.name}.`,
        });
        {
          const { objects: docs } = yield* DatabaseService.runQuery(
            Query.select(Filter.ids(organization.id)).targetOf(HasSubject.HasSubject).source(),
          );
          if (docs.length !== 1) {
            throw new Error(`Expected 1 research document; got ${docs.length}: ${docs.map((_) => _.name)}`);
          }

          const doc = docs[0];
          invariant(Obj.instanceOf(Markdown.Document, doc));
          console.log({
            name: doc.name,
            content: yield* DatabaseService.load(doc.content).pipe(Effect.map((_) => _.content)),
          });
        }

        yield* conversation.createRequest({
          observer,
          prompt: 'Add a section about their portfolio.',
        });
        {
          const { objects: docs } = yield* DatabaseService.runQuery(
            Query.select(Filter.ids(organization.id)).targetOf(HasSubject.HasSubject).source(),
          );
          if (docs.length !== 1) {
            throw new Error(`Expected 1 research document; got ${docs.length}: ${docs.map((_) => _.name)}`);
          }

          const doc = docs[0];
          invariant(Obj.instanceOf(Markdown.Document, doc));
          console.log({
            name: doc.name,
            content: yield* DatabaseService.load(doc.content).pipe(Effect.map((_) => _.content)),
          });
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );
});
