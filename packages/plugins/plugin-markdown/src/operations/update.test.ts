//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer, runMemoizedTests } from '@dxos/agent-runtime/testing';
import { MemoizedAiService } from '@dxos/ai/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import { Operation, Skill } from '@dxos/compute';
import { Collection, Database, Feed, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';
import { HasSubject } from '@dxos/types';
import { trim } from '@dxos/util';

import { WithProperties } from '#testing';

import MarkdownSkill from '../skills/markdown-skill';
import { MarkdownOperation } from '../types';
import { MarkdownOperationHandlerSet } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: MarkdownOperationHandlerSet,
  types: [SpaceProperties, Collection.Collection, Skill.Skill, Markdown.Document, HasSubject.HasSubject, Feed.Feed],
  skills: [MarkdownSkill.make()],
  tracing: 'pretty',
});

describe.skipIf(!runMemoizedTests())('update', () => {
  it.effect(
    'call a function to update a markdown document',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({
          name: 'BlueYard',
          content: 'Founders and portfolio of BlueYard.',
        });
        yield* Database.add(doc);

        yield* Operation.invoke(MarkdownOperation.Update, {
          doc: Ref.make(doc),
          edits: [{ oldString: 'Founders', newString: '# Founders' }],
        });

        const updatedDoc = yield* Database.resolve(Obj.getURI(doc), Markdown.Document);
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
    'append to empty document when oldString is omitted',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({
          name: 'Empty Doc',
          content: '',
        });
        yield* Database.add(doc);

        yield* Operation.invoke(MarkdownOperation.Update, {
          doc: Ref.make(doc),
          edits: [{ newString: '# Hello' }],
        });

        const updatedDoc = yield* Database.resolve(Obj.getURI(doc), Markdown.Document);
        const text = yield* Database.load(updatedDoc.content);
        expect(text.content).toBe('# Hello');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'append to empty document when oldString is empty',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({
          name: 'Empty Doc',
          content: '',
        });
        yield* Database.add(doc);

        yield* Operation.invoke(MarkdownOperation.Update, {
          doc: Ref.make(doc),
          edits: [{ oldString: '', newString: '# Hello' }],
        });

        const updatedDoc = yield* Database.resolve(Obj.getURI(doc), Markdown.Document);
        const text = yield* Database.load(updatedDoc.content);
        expect(text.content).toBe('# Hello');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'append to non-empty document when oldString is omitted',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({
          name: 'Shopping list',
          content: '# Shopping list',
        });
        yield* Database.add(doc);

        yield* Operation.invoke(MarkdownOperation.Update, {
          doc: Ref.make(doc),
          edits: [{ newString: '\n- milk' }],
        });

        const updatedDoc = yield* Database.resolve(Obj.getURI(doc), Markdown.Document);
        const text = yield* Database.load(updatedDoc.content);
        expect(text.content).toBe('# Shopping list\n- milk');
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
          skills: [MarkdownSkill.make()],
        });

        yield* agent.submitPrompt('Create a document with a cookie recipe.');
        yield* agent.waitForCompletion();
        {
          const docs = yield* Database.query(Query.type(Markdown.Document)).run;
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
          const docs = yield* Database.query(Query.type(Markdown.Document)).run;
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
          skills: [MarkdownSkill.make()],
          context: [Ref.make(document)],
        });

        yield* agent.submitPrompt('Add the missing ingredient (its flour).');
        yield* agent.waitForCompletion();

        {
          const docs = yield* Database.query(Query.type(Markdown.Document)).run;
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
          skills: [MarkdownSkill.make()],
          context: [Ref.make(document)],
        });

        // The agent process completes once its input queue drains (maybeComplete → succeed), so all
        // prompts must be enqueued before awaiting completion; the agent then drains them in order,
        // each turn building on the previous edit. Awaiting between submits would let the process
        // succeed after the first turn, dropping the rest.
        yield* agent.submitPrompt('Add milk to the shopping list.');
        yield* agent.submitPrompt('Add bread to the shopping list.');
        yield* agent.submitPrompt('Add eggs to the shopping list.');
        yield* agent.waitForCompletion();

        {
          const docs = yield* Database.query(Query.type(Markdown.Document)).run;
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
