//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Database, DXN, Obj, Type } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { SpaceId } from '@dxos/keys';
import { parseMentions } from '@dxos/react-ui-assistant';

import { insertMention, resolveMentions } from './useObjectMentions.ts';

class TestObject extends Type.makeObject<TestObject>(DXN.make('com.example.type.testObject', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }),
) {}

describe('insertMention', () => {
  test.each(['Q4 [draft]', 'C:\\temp', 'ends with \\'])('round-trips %s', (label) => {
    const object = Obj.make(TestObject, { name: label });
    const view = new EditorView({ state: EditorState.create({ doc: '' }) });
    insertMention(view, object, label);
    expect(parseMentions(view.state.doc.toString())).toEqual([{ label, uri: Obj.getURI(object) }]);
    view.destroy();
  });
});

describe('resolveMentions', () => {
  test('links that name no object of the space are not mentions', async () => {
    await Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const object = yield* Database.add(Obj.make(TestObject, { name: 'Roadmap' }));
      const text = [
        `[Roadmap](${Obj.getURI(object)})`,
        `[the space](echo://${db.spaceId})`,
        `[gone](echo://${db.spaceId}/01J00000000000000000000000)`,
        '[pasted](echo://a/b/c)',
        '[bare](echo:x)',
        `[type](${Type.getURI(TestObject)})`,
        `[bad id](echo://${db.spaceId}/notanid)`,
        '[bad local id](echo:///notanid)',
        `[elsewhere](echo://${SpaceId.random()}/${object.id})`,
      ].join(' ');
      const refs = yield* Effect.promise(() => resolveMentions(db, text));
      expect(refs.map((ref) => ref.uri)).toEqual([Obj.getURI(object)]);
    })
      .pipe(Effect.provide(TestDatabaseLayer({ types: [TestObject] })))
      .pipe(Effect.runPromise);
  });
});
