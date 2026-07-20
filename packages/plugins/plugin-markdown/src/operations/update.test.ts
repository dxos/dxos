//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer, operationToolCall } from '@dxos/agent-runtime/testing';
import { ScriptedAiService } from '@dxos/ai/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import { Operation, Skill } from '@dxos/compute';
import { Collection, Database, Feed, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { Markdown } from '@dxos/plugin-markdown';
import { HasSubject } from '@dxos/types';
import { trim } from '@dxos/util';

import { WithProperties } from '#testing';

import MarkdownSkill from '../skills/markdown-skill';
import { MarkdownOperation } from '../types';
import { MarkdownOperationHandlerSet } from './index';

// The agent's tool-calling behaviour is scripted inline per test via a mock model (no recorded
// conversation to regenerate). The `update`/`open` tools take a top-level `doc` ref, which is
// resolved lazily to the bare URI of the document the test created before submitting each prompt.
const testLayer = (script: ScriptedAiService.Script) =>
  AssistantTestLayer({
    operationHandlers: MarkdownOperationHandlerSet,
    types: [SpaceProperties, Collection.Collection, Skill.Skill, Markdown.Document, HasSubject.HasSubject, Feed.Feed],
    skills: [MarkdownSkill.make()],
    tracing: 'pretty',
    aiService: ScriptedAiService.layer(script),
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
      // Direct operation invocation — no agent, so no scripted turns are consumed.
      Effect.provide(testLayer([])),
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
      // Direct operation invocation — no agent, so no scripted turns are consumed.
      Effect.provide(testLayer([])),
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
      // Direct operation invocation — no agent, so no scripted turns are consumed.
      Effect.provide(testLayer([])),
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
      // Direct operation invocation — no agent, so no scripted turns are consumed.
      Effect.provide(testLayer([])),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'create and update a markdown document',
    // The first prompt creates the document; the second updates it. The update tool's `doc` ref is
    // resolved lazily to the URI of the document the agent created, captured into the holder after
    // the first prompt completes and before the second is submitted.
    (() => {
      const ref: { doc?: string } = {};
      return Effect.fnUntraced(
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
            ref.doc = Obj.getURI(doc);
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
        Effect.provide(
          testLayer([
            operationToolCall(MarkdownOperation.Create, {
              name: 'Classic Chocolate Chip Cookies',
              content: '# Classic Chocolate Chip Cookies\n\nA timeless recipe for soft, chewy cookies.\n',
            }),
            ScriptedAiService.text('I created a document with a classic chocolate chip cookie recipe.'),
            ScriptedAiService.toolCall('update', () => ({
              doc: ref.doc,
              edits: [
                {
                  newString: '\n\n## Holiday Variation\n\nFold in crushed candy canes for a festive twist.\n',
                },
              ],
            })),
            ScriptedAiService.text('I added a holiday-themed variation section.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );

  it.effect(
    'update existing document',
    (() => {
      const ref: { doc?: string } = {};
      return Effect.fnUntraced(
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
          ref.doc = Obj.getURI(document);
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
        Effect.provide(
          testLayer([
            ScriptedAiService.toolCall('update', () => ({
              doc: ref.doc,
              edits: [{ oldString: '2 cups of ???', newString: '2 cups of flour' }],
            })),
            ScriptedAiService.text('I replaced the missing ingredient with 2 cups of flour.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );

  it.effect(
    'add lines to document one by one',
    // Three prompts are drained in order, each building on the previous edit. The streaming turns are
    // scripted in the same order: an `update` (appending the next item) followed by a text turn per
    // prompt, all targeting the same document via the lazily-resolved holder.
    (() => {
      const ref: { doc?: string } = {};
      return Effect.fnUntraced(
        function* (_) {
          const document = yield* Database.add(
            Markdown.make({
              name: 'Shopping list',
              content: trim`
              # Shopping list
            `,
            }),
          );
          ref.doc = Obj.getURI(document);
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
        Effect.provide(
          testLayer([
            ScriptedAiService.toolCall('update', () => ({
              doc: ref.doc,
              edits: [{ oldString: '# Shopping list', newString: '# Shopping list\n\n- Milk' }],
            })),
            ScriptedAiService.text('I added milk to your shopping list.'),
            ScriptedAiService.toolCall('update', () => ({
              doc: ref.doc,
              edits: [{ oldString: '- Milk', newString: '- Milk\n- Bread' }],
            })),
            ScriptedAiService.text('I added bread to your shopping list.'),
            ScriptedAiService.toolCall('update', () => ({
              doc: ref.doc,
              edits: [{ oldString: '- Bread', newString: '- Bread\n- Eggs' }],
            })),
            ScriptedAiService.text('I added eggs to your shopping list.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );
});
