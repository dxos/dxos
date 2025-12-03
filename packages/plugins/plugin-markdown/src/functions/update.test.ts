//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService, ConsolePrinter } from '@dxos/ai';
import { MemoizedAiService, TestAiService } from '@dxos/ai/testing';
import {
  AiConversation,
  type ContextBinding,
  GenerationObserver,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { SpaceProperties } from '@dxos/client-protocol';
import { Obj, Query, Ref } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { CredentialsService, FunctionInvocationService, QueueService, TracingService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTest, TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import { invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Collection } from '@dxos/schema';
import { HasSubject, type Message } from '@dxos/types';

import { WithProperties, testToolkit } from '../testing';
import { MarkdownBlueprint, MarkdownFunction } from '../toolkit';
import { Database } from '@dxos/echo';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([MarkdownFunction.create, MarkdownFunction.open, MarkdownFunction.update], testToolkit),
  makeToolExecutionServiceFromFunctions(testToolkit, testToolkit.toLayer({}) as any),
).pipe(
  Layer.provideMerge(
    FunctionInvocationServiceLayerTest({
      functions: [MarkdownFunction.create, MarkdownFunction.open, MarkdownFunction.update],
    }),
  ),
  Layer.provideMerge(
    Layer.mergeAll(
      TestAiService(),
      TestDatabaseLayer({
        spaceKey: 'fixed',
        indexing: { vector: true },
        types: [SpaceProperties, Collection.Collection, Blueprint.Blueprint, Markdown.Document, HasSubject.HasSubject],
      }),
      CredentialsService.configuredLayer([]),
      TracingService.layerNoop,
    ),
  ),
);

describe('update', () => {
  it.effect(
    'call a function to update a markdown document',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({
          name: 'BlueYard',
          content: 'Founders and portfolio of BlueYard.',
        });
        yield* Database.Service.add(doc);

        yield* FunctionInvocationService.invokeFunction(MarkdownFunction.update, {
          id: doc.id,
          diffs: ['- Founders', '+ # Founders'],
        });

        const updatedDoc = yield* Database.Service.resolve(Obj.getDXN(doc), Markdown.Document);
        expect(updatedDoc.name).toBe(doc.name);
        const text = yield* Database.Service.load(updatedDoc.content);
        expect(text.content).toBe('# Founders and portfolio of BlueYard.');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'create and update a markdown document',
    Effect.fnUntraced(
      function* (_) {
        const queue = yield* QueueService.createQueue<Message.Message | ContextBinding>();
        const conversation = yield* acquireReleaseResource(() => new AiConversation(queue));

        yield* Database.Service.flush({ indexes: true });
        const markdownBlueprint = yield* Database.Service.add(Obj.clone(MarkdownBlueprint));
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
          const docs = yield* Database.Service.runQuery(Query.type(Markdown.Document));
          if (docs.length !== 1) {
            throw new Error(`Expected 1 document; got ${docs.length}: ${docs.map((_) => _.name)}`);
          }

          const doc = docs[0];
          invariant(Obj.instanceOf(Markdown.Document, doc));
          console.log({
            name: doc.name,
            content: yield* Database.Service.load(doc.content).pipe(Effect.map((_) => _.content)),
          });
        }

        yield* conversation.createRequest({
          observer,
          prompt: 'Add a section with a holiday-themed variation.',
        });
        {
          const docs = yield* Database.Service.runQuery(Query.type(Markdown.Document));
          if (docs.length !== 1) {
            throw new Error(`Expected 1 document; got ${docs.length}: ${docs.map((_) => _.name)}`);
          }

          const doc = docs[0];
          invariant(Obj.instanceOf(Markdown.Document, doc));
          console.log({
            name: doc.name,
            content: yield* Database.Service.load(doc.content).pipe(Effect.map((_) => _.content)),
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
