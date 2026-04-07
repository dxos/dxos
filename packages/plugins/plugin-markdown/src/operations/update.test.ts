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
import { Database, Feed, Obj, Query, Ref } from '@dxos/echo';
import { Collection } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionInvocationService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown/types';
import { HasSubject } from '@dxos/types';
import { trim } from '@dxos/util';

import { WithProperties } from '#testing';
import MarkdownBlueprint from '../blueprints/markdown-blueprint';

import { Update } from './definitions';
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

describe('update', () => {
  it.effect(
    'call a function to update a markdown document',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({
          name: 'BlueYard',
          content: 'Founders and portfolio of BlueYard.',
        });
        yield* Database.add(doc);

        yield* FunctionInvocationService.invokeFunction(Update, {
          doc: Ref.make(doc),
          edits: [{ oldString: 'Founders', newString: '# Founders' }],
        });

        const updatedDoc = yield* Database.resolve(Obj.getDXN(doc), Markdown.Document);
        expect(updatedDoc.name).toBe(doc.name);
        const text = yield* Database.load(updatedDoc.content);
        expect(text.content).toBe('# Founders and portfolio of BlueYard.');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'create and update a markdown document',
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

        yield* agent.submitPrompt('Add a section with a holiday-themed variation.');
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

  it.effect(
    'update existing document',
    Effect.fnUntraced(
      function* (_) {
        const document = yield* Database.add(
          Markdown.make({
            name: 'Cookie Recipe',
            content: trim`
                Ingredients: 
                  - 2 cups of ???
                  - 1 cup of sugar
                  - 1 cup of butter
                  - 1 cup of eggs
          `,
          }),
        );
        const agent = yield* AgentService.createSession({
          blueprints: [MarkdownBlueprint.make()],
          context: [Ref.make(document)],
        });

        yield* agent.submitPrompt('Add the missing ingredient (its flour).');
        yield* agent.waitForCompletion();

        {
          const docs = yield* Database.runQuery(Query.type(Markdown.Document));
          if (docs.length !== 1) {
            throw new Error(`Expected 1 document; got ${docs.length}: ${docs.map((_) => _.name)}`);
          }

          const doc = docs[0];
          invariant(Obj.instanceOf(Markdown.Document, doc));
          const content = yield* Database.load(doc.content).pipe(Effect.map((_) => _.content));
          console.log({
            name: doc.name,
            content: yield* Database.load(doc.content).pipe(Effect.map((_) => _.content)),
          });
          expect(content.toLowerCase()).toContain('flour');
        }
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );

  it.effect(
    'add lines to document one by one',
    Effect.fnUntraced(
      function* (_) {
        const document = yield* Database.add(
          Markdown.make({
            name: 'Shopping list',
            content: trim`
              # Shopping list
            `,
          }),
        );
        const agent = yield* AgentService.createSession({
          blueprints: [MarkdownBlueprint.make()],
          context: [Ref.make(document)],
        });

        yield* agent.submitPrompt('Add milk to the shopping list.');
        yield* agent.waitForCompletion();
        yield* agent.submitPrompt('Add bread to the shopping list.');
        yield* agent.waitForCompletion();
        yield* agent.submitPrompt('Add eggs to the shopping list.');
        yield* agent.waitForCompletion();

        {
          const docs = yield* Database.runQuery(Query.type(Markdown.Document));
          if (docs.length !== 1) {
            throw new Error(`Expected 1 document; got ${docs.length}: ${docs.map((_) => _.name)}`);
          }

          const doc = docs[0];
          invariant(Obj.instanceOf(Markdown.Document, doc));
          const content = yield* Database.load(doc.content).pipe(Effect.map((_) => _.content));
          console.log({
            name: doc.name,
            content: yield* Database.load(doc.content).pipe(Effect.map((_) => _.content)),
          });
          expect(content.toLowerCase()).toContain('milk');
          expect(content.toLowerCase()).toContain('bread');
          expect(content.toLowerCase()).toContain('eggs');
        }
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );
});
