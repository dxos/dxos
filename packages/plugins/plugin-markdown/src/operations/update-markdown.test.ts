//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import { Operation, Skill } from '@dxos/compute';
import { Collection, Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';
import { HasSubject } from '@dxos/types';

import { WithProperties } from '#testing';

import MarkdownSkill from '../skills/markdown-skill';
import { MarkdownOperation } from '../types';
import { MarkdownOperationHandlerSet } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: MarkdownOperationHandlerSet,
  types: [SpaceProperties, Collection.Collection, Skill.Skill, Markdown.Document, HasSubject.HasSubject, Feed.Feed],
  skills: [MarkdownSkill.make()],
  disableLlmMemoization: true,
});

describe('Update', () => {
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
});
