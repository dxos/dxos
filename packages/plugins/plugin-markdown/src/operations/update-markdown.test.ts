//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { WithProperties } from '@dxos/app-toolkit/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Collection, Database, DXN, Feed, Obj, Ref, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { HasSubject } from '@dxos/types';

import { MarkdownOperationHandlerSet } from '#operations';
import { OperationTestLayer } from '#testing';
import { MarkdownOperation } from '#types';

EntityId.dangerouslyDisableRandomness();

/** Outline-shaped text-bearing type (mirrors `org.dxos.type.outline`): not a `Markdown.Document`. */
class TestOutline extends Type.makeObject<TestOutline>(DXN.make('com.example.type.testOutline', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Ref.Ref(Text.Text),
  }),
) {}

/** `OperationTestLayer` plus the outline-shaped type. */
const OutlineTestLayer = AssistantTestLayer({
  operationHandlers: MarkdownOperationHandlerSet.handlers,
  types: [
    SpaceProperties,
    Collection.Collection,
    Skill.Skill,
    Markdown.Document,
    HasSubject.HasSubject,
    Feed.Feed,
    TestOutline,
    Text.Text,
  ],
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
      Effect.provide(OperationTestLayer),
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
      Effect.provide(OperationTestLayer),
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
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'edits any text-bearing document, not only Markdown.Document',
    Effect.fnUntraced(
      function* (_) {
        // The MCP document tools route outline edits through this operation; a typed resolve
        // used to reject anything that was not a Markdown.Document.
        const outline = Obj.make(TestOutline, {
          name: 'MCP Tasks',
          content: Ref.make(Text.make({ content: '- [ ] Update tasks via MCP' })),
        });
        yield* Database.add(outline);

        const { applied, length } = yield* Operation.invoke(MarkdownOperation.Update, {
          doc: Ref.make(outline),
          edits: [{ newString: '\n- [ ] Added from the operation' }],
        });

        // A receipt rather than the document; the text itself is read back below.
        expect(applied).toBe(1);
        expect(length).toBe('- [ ] Update tasks via MCP\n- [ ] Added from the operation'.length);
        const text = yield* Database.load(outline.content);
        expect(text.content).toBe('- [ ] Update tasks via MCP\n- [ ] Added from the operation');
      },
      WithProperties,
      Effect.provide(OutlineTestLayer),
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
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
