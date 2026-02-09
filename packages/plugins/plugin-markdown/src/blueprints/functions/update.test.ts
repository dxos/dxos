//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { MemoizedAiService } from '@dxos/ai/testing';
import { AiContextService, AiConversationService } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { SpaceProperties } from '@dxos/client-protocol';
import { Database, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionInvocationService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Collection } from '@dxos/schema';
import { HasSubject } from '@dxos/types';
import { trim } from '@dxos/util';

import { WithProperties } from '../../testing';
import * as MarkdownBlueprint from '../markdown-blueprint';

import update from './update';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  functions: [...MarkdownBlueprint.functions],
  types: [SpaceProperties, Collection.Collection, Blueprint.Blueprint, Markdown.Document, HasSubject.HasSubject],
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

        yield* FunctionInvocationService.invokeFunction(update, {
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

  it.scoped(
    'create and update a markdown document',
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

        yield* AiConversationService.run({
          prompt: 'Add a section with a holiday-themed variation.',
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

  it.scoped(
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
        const markdownBlueprint = yield* Database.add(Obj.clone(MarkdownBlueprint.make()));
        yield* AiContextService.bindContext({
          blueprints: [Ref.make(markdownBlueprint)],
          objects: [Ref.make(document)],
        });

        yield* AiConversationService.run({
          prompt: 'Add the missing ingredient (its flour).',
        });

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
      Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer))),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );

  it.scoped(
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
        const markdownBlueprint = yield* Database.add(Obj.clone(MarkdownBlueprint.make()));
        yield* AiContextService.bindContext({
          blueprints: [Ref.make(markdownBlueprint)],
          objects: [Ref.make(document)],
        });

        yield* AiConversationService.run({
          prompt: 'Add milk to the shopping list.',
        });
        yield* AiConversationService.run({
          prompt: 'Add bread to the shopping list.',
        });
        yield* AiConversationService.run({
          prompt: 'Add eggs to the shopping list.',
        });

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
      Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer))),
      TestHelpers.provideTestContext,
    ),
    MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000,
  );
});
