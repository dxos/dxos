//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Database, Obj, Text } from '@dxos/echo';
import { getObjectCore } from '@dxos/echo-client';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import { EffectEx } from '@dxos/effect';

const TestLayer = TestDatabaseLayer({ types: [TestSchema.Person] });

// Exercise the `Text` string CRDT API against real database-backed (Automerge) objects.
describe('Text (database)', () => {
  describe('update', () => {
    test('replaces the value', ({ expect }) =>
      Effect.gen(function* () {
        const obj = yield* Database.add(Obj.make(TestSchema.Person, { name: 'hello' }));
        Obj.update(obj, () => {
          Text.update(obj, 'name', 'goodbye');
        });
        expect(obj.name).toBe('goodbye');
        expect(Obj.getValue(obj, ['name'])).toBe('goodbye');
      }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors));
  });

  describe('splice', () => {
    test('inserts at an index and returns the empty removed substring', ({ expect }) =>
      Effect.gen(function* () {
        const obj = yield* Database.add(Obj.make(TestSchema.Person, { name: 'helloworld' }));
        Obj.update(obj, () => {
          expect(Text.splice(obj, 'name', 5, 0, ' ')).toBe('');
        });
        expect(obj.name).toBe('hello world');
      }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors));

    test('deletes and returns the removed substring', ({ expect }) =>
      Effect.gen(function* () {
        const obj = yield* Database.add(Obj.make(TestSchema.Person, { name: 'hello world' }));
        Obj.update(obj, () => {
          expect(Text.splice(obj, 'name', 5, 6)).toBe(' world');
        });
        expect(obj.name).toBe('hello');
      }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors));

    test('replaces in place', ({ expect }) =>
      Effect.gen(function* () {
        const obj = yield* Database.add(Obj.make(TestSchema.Person, { name: 'hello world' }));
        Obj.update(obj, () => {
          expect(Text.splice(obj, 'name', 6, 5, 'there')).toBe('world');
        });
        expect(obj.name).toBe('hello there');
      }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors));

    test('start past end appends', ({ expect }) =>
      Effect.gen(function* () {
        const obj = yield* Database.add(Obj.make(TestSchema.Person, { name: 'abc' }));
        Obj.update(obj, () => {
          expect(Text.splice(obj, 'name', 100, 0, 'def')).toBe('');
        });
        expect(obj.name).toBe('abcdef');
      }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors));
  });

  describe('applyEdits', () => {
    test('replaces the first occurrence', ({ expect }) =>
      Effect.gen(function* () {
        const obj = yield* Database.add(Obj.make(TestSchema.Person, { name: 'foo foo foo' }));
        Obj.update(obj, () => {
          Text.applyEdits(obj, 'name', [{ oldString: 'foo', newString: 'bar' }]);
        });
        expect(obj.name).toBe('bar foo foo');
      }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors));

    test('replaces all occurrences', ({ expect }) =>
      Effect.gen(function* () {
        const obj = yield* Database.add(Obj.make(TestSchema.Person, { name: 'foo foo foo' }));
        Obj.update(obj, () => {
          Text.applyEdits(obj, 'name', [{ oldString: 'foo', newString: 'bar', replaceAll: true }]);
        });
        expect(obj.name).toBe('bar bar bar');
      }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors));

    test('appends when oldString is missing', ({ expect }) =>
      Effect.gen(function* () {
        const obj = yield* Database.add(Obj.make(TestSchema.Person, { name: 'hello' }));
        let result = '';
        Obj.update(obj, () => {
          result = Text.applyEdits(obj, 'name', [{ newString: ' world' }]);
        });
        expect(result).toBe('hello world');
        expect(obj.name).toBe('hello world');
      }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors));

    test('throws when a non-replaceAll oldString is not found', ({ expect }) =>
      Effect.gen(function* () {
        const obj = yield* Database.add(Obj.make(TestSchema.Person, { name: 'hello' }));
        expect(() =>
          Obj.update(obj, () => {
            Text.applyEdits(obj, 'name', [{ oldString: 'missing', newString: 'x' }]);
          }),
        ).toThrow();
      }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors));
  });

  describe('strict mode', () => {
    test('mutations throw outside Obj.update', ({ expect }) =>
      Effect.gen(function* () {
        const obj = yield* Database.add(Obj.make(TestSchema.Person, { name: 'hello' }));
        expect(() => Text.update(obj, 'name', 'x')).toThrow(/Obj\.update/);
        expect(() => Text.splice(obj, 'name', 0, 1, 'x')).toThrow(/Obj\.update/);
        expect(() => Text.applyEdits(obj, 'name', [{ oldString: 'h', newString: 'H' }])).toThrow(/Obj\.update/);
      }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors));
  });

  describe('minimal-delta semantics', () => {
    test('a cursor survives a splice at an earlier offset', ({ expect }) =>
      Effect.gen(function* () {
        const obj = yield* Database.add(Obj.make(TestSchema.Person, { name: 'Hello World' }));
        const accessor = getObjectCore(obj).getDocAccessor(['name']);
        // Anchor a cursor on 'W' (index 6). A whole-string replace would invalidate it.
        const cursor = A.getCursor(accessor.handle.doc(), accessor.path.slice(), 6);

        Obj.update(obj, () => {
          Text.splice(obj, 'name', 0, 0, 'Say: ');
        });

        const position = A.getCursorPosition(accessor.handle.doc(), accessor.path.slice(), cursor);
        const text: string = Obj.getValue(obj, ['name']);
        expect(text).toBe('Say: Hello World');
        expect(position).toBe(11);
        expect(text[position]).toBe('W');
      }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors));

    test('a cursor before the edited region survives an update', ({ expect }) =>
      Effect.gen(function* () {
        const obj = yield* Database.add(Obj.make(TestSchema.Person, { name: 'Hello World' }));
        const accessor = getObjectCore(obj).getDocAccessor(['name']);
        // Anchor a cursor on 'H' (index 0), before the region the diff rewrites.
        const cursor = A.getCursor(accessor.handle.doc(), accessor.path.slice(), 0);

        // `A.updateText` rewrites only the changed suffix ('World' -> 'Mars'), so the earlier anchor holds.
        Obj.update(obj, () => {
          Text.update(obj, 'name', 'Hello Mars');
        });

        const position = A.getCursorPosition(accessor.handle.doc(), accessor.path.slice(), cursor);
        const text: string = Obj.getValue(obj, ['name']);
        expect(text).toBe('Hello Mars');
        expect(position).toBe(0);
        expect(text[position]).toBe('H');
      }).pipe(Effect.provide(TestLayer), EffectEx.runAndForwardErrors));
  });
});
