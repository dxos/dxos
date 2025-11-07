//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
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
import { PropertiesType } from '@dxos/client-protocol';
import { DXN, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers, acquireReleaseResource } from '@dxos/effect';
import {
  ComputeEventLogger,
  CredentialsService,
  DatabaseService,
  FunctionInvocationService,
  QueueService,
  TracingService,
} from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Collection } from '@dxos/schema';
import { HasSubject, type Message } from '@dxos/types';

import { WithProperties, testToolkit } from '../testing';
import { MarkdownBlueprint, MarkdownFunction } from '../toolkit';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([MarkdownFunction.create, MarkdownFunction.open, MarkdownFunction.update], testToolkit),
  makeToolExecutionServiceFromFunctions(testToolkit, testToolkit.toLayer({}) as any),
  ComputeEventLogger.layerFromTracing,
).pipe(
  Layer.provideMerge(
    FunctionInvocationService.layerTest({
      functions: [MarkdownFunction.create, MarkdownFunction.open, MarkdownFunction.update],
    }),
  ),
  Layer.provideMerge(
    Layer.mergeAll(
      TestAiService(),
      TestDatabaseLayer({
        spaceKey: 'fixed',
        indexing: { vector: true },
        types: [PropertiesType, Collection.Collection, Blueprint.Blueprint, Markdown.Document, HasSubject.HasSubject],
      }),
      CredentialsService.configuredLayer([]),
      TracingService.layerNoop,
    ),
  ),
);

describe('create', () => {
  it.effect(
    'call a function to create a markdown document',
    Effect.fnUntraced(
      function* (_) {
        const name = 'BlueYard';
        const content = 'Founders and portfolio of BlueYard.';
        const result = yield* FunctionInvocationService.invokeFunction(MarkdownFunction.create, {
          name,
          content,
        });

        const doc = yield* DatabaseService.resolve(DXN.parse(result.id), Markdown.Document);
        expect(doc.name).toBe(name);
        const text = yield* DatabaseService.load(doc.content);
        expect(text.content).toBe(content);
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'create a markdown document',
    Effect.fnUntraced(
      function* (_) {
        const queue = yield* QueueService.createQueue<Message.Message | ContextBinding>();
        const conversation = yield* acquireReleaseResource(() => new AiConversation(queue));

        yield* DatabaseService.flush({ indexes: true });
        const markdownBlueprint = yield* DatabaseService.add(Obj.clone(MarkdownBlueprint));
        yield* Effect.promise(() =>
          conversation.context.bind({
            blueprints: [Ref.make(markdownBlueprint)],
          }),
        );

        const observer = GenerationObserver.fromPrinter(new ConsolePrinter());
        yield* conversation.createRequest({
          observer,
          prompt: `Create a document with a cookie recipe.`,
        });
        {
          const { objects: docs } = yield* DatabaseService.runQuery(Query.type(Markdown.Document));
          if (docs.length !== 1) {
            throw new Error(`Expected 1 document; got ${docs.length}: ${docs.map((_) => _.name)}`);
          }

          const doc = docs[0];
          invariant(Obj.instanceOf(Markdown.Document, doc));
          console.log({
            name: doc.name,
            content: yield* DatabaseService.load(doc.content).pipe(Effect.map((_) => _.content)),
          });
        }
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );
});
