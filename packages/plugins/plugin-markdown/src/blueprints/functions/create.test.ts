//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService, ConsolePrinter } from '@dxos/ai';
import { MemoizedAiService, TestAiService } from '@dxos/ai/testing';
import {
  AiContextService,
  AiConversation,
  AiConversationService,
  type ContextBinding,
  GenerationObserver,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { SpaceProperties } from '@dxos/client-protocol';
import { DXN, Database, Obj, Query, Ref } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { CredentialsService, FunctionInvocationService, QueueService, TracingService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTest, TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import { invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Collection } from '@dxos/schema';
import { HasSubject, type Message } from '@dxos/types';
import { AssistantTestLayer } from '@dxos/assistant/testing';

import { WithProperties, testToolkit } from '../../testing';
import * as MarkdownBlueprint from '../markdown-blueprint';

import create from './create';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  functions: [...MarkdownBlueprint.functions],
  types: [SpaceProperties, Collection.Collection, Blueprint.Blueprint, Markdown.Document, HasSubject.HasSubject],
  tracing: 'pretty',
});

describe('create', () => {
  it.effect(
    'call a function to create a markdown document',
    Effect.fnUntraced(
      function* (_) {
        const name = 'BlueYard';
        const content = 'Founders and portfolio of BlueYard.';
        const result = yield* FunctionInvocationService.invokeFunction(create, {
          name,
          content,
        });

        const doc = yield* Database.resolve(DXN.parse(result.id), Markdown.Document);
        expect(doc.name).toBe(name);
        const text = yield* Database.load(doc.content);
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
        const markdownBlueprint = yield* Database.add(Obj.clone(MarkdownBlueprint.make()));
        yield* AiContextService.bindContext({
          blueprints: [Ref.make(markdownBlueprint)],
        });

        yield* AiConversationService.run({
          prompt: `Create a document with a cookie recipe.`,
        });

        {
          const docs = yield* Database.runQuery(Query.type(Markdown.Document));
          if (docs.length !== 1) {
            throw new Error(`Expected 1 document; got ${docs.length}: ${docs.map((_) => _.name)}`);
          }

          const doc = docs[0];
          invariant(Obj.instanceOf(Markdown.Document, doc));
          console.log({
            name: doc.name,
            content: yield* Database.load(doc.content).pipe(Effect.map((_) => _.content)),
          });
        }
      },
      WithProperties,
      Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer))),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );
});
