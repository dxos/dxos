//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { MemoizedAiService } from '@dxos/ai/testing';
import { AgentService } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { SpaceProperties } from '@dxos/client-protocol';
import { DXN, Database, Feed, Obj, Query } from '@dxos/echo';
import { Collection } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionInvocationService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown/types';
import { HasSubject } from '@dxos/types';

import { WithProperties } from '#testing';

import MarkdownBlueprint from '../blueprints/markdown-blueprint';
import { Create } from './definitions';
import { MarkdownOperationHandlerSet } from './index';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: MarkdownOperationHandlerSet,
  types: [
    SpaceProperties,
    Collection.Collection,
    Blueprint.Blueprint,
    Markdown.Document,
    HasSubject.HasSubject,
    Feed.Feed,
  ],
  blueprints: [MarkdownBlueprint.make()],
  tracing: 'pretty',
});

describe('create', () => {
  it.effect(
    'call a function to create a markdown document',
    Effect.fnUntraced(
      function* (_) {
        const name = 'BlueYard';
        const content = 'Founders and portfolio of BlueYard.';
        const result = yield* FunctionInvocationService.invokeFunction(Create, {
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

  it.effect(
    'create a markdown document',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          blueprints: [MarkdownBlueprint.make()],
        });
        yield* agent.submitPrompt('Create a document with a cookie recipe.');
        yield* agent.waitForCompletion();

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
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );
});
