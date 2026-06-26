//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, test } from 'vitest';

import { Obj, Text } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { createObject, getObjectCore } from './echo-handler';

// Materialize an Automerge-backed object (dispatches through `EchoReactiveHandler`).
const make = (value: string) => createObject(Obj.make(TestSchema.Example, { string: value }));

describe('Text (Automerge)', () => {
  describe('update', () => {
    test('replaces the value', ({ expect }) => {
      const obj = make('hello');
      Obj.update(obj, () => {
        Text.update(obj, 'string', 'goodbye');
      });
      expect(obj.string).toBe('goodbye');
      expect(Obj.getValue(obj, ['string'])).toBe('goodbye');
    });
  });

  describe('splice', () => {
    test('inserts at an index and returns the empty removed substring', ({ expect }) => {
      const obj = make('helloworld');
      Obj.update(obj, () => {
        expect(Text.splice(obj, 'string', 5, 0, ' ')).toBe('');
      });
      expect(obj.string).toBe('hello world');
    });

    test('deletes and returns the removed substring', ({ expect }) => {
      const obj = make('hello world');
      Obj.update(obj, () => {
        expect(Text.splice(obj, 'string', 5, 6)).toBe(' world');
      });
      expect(obj.string).toBe('hello');
    });

    test('replaces in place', ({ expect }) => {
      const obj = make('hello world');
      Obj.update(obj, () => {
        expect(Text.splice(obj, 'string', 6, 5, 'there')).toBe('world');
      });
      expect(obj.string).toBe('hello there');
    });

    test('start past end appends', ({ expect }) => {
      const obj = make('abc');
      Obj.update(obj, () => {
        expect(Text.splice(obj, 'string', 100, 0, 'def')).toBe('');
      });
      expect(obj.string).toBe('abcdef');
    });
  });

  describe('applyEdits', () => {
    test('replaces the first occurrence', ({ expect }) => {
      const obj = make('foo foo foo');
      Obj.update(obj, () => {
        Text.applyEdits(obj, 'string', [{ oldString: 'foo', newString: 'bar' }]);
      });
      expect(obj.string).toBe('bar foo foo');
    });

    test('replaces all occurrences', ({ expect }) => {
      const obj = make('foo foo foo');
      Obj.update(obj, () => {
        Text.applyEdits(obj, 'string', [{ oldString: 'foo', newString: 'bar', replaceAll: true }]);
      });
      expect(obj.string).toBe('bar bar bar');
    });

    test('appends when oldString is missing', ({ expect }) => {
      const obj = make('hello');
      let result = '';
      Obj.update(obj, () => {
        result = Text.applyEdits(obj, 'string', [{ newString: ' world' }]);
      });
      expect(result).toBe('hello world');
      expect(obj.string).toBe('hello world');
    });

    test('throws when a non-replaceAll oldString is not found', ({ expect }) => {
      const obj = make('hello');
      expect(() =>
        Obj.update(obj, () => {
          Text.applyEdits(obj, 'string', [{ oldString: 'missing', newString: 'x' }]);
        }),
      ).toThrow();
    });
  });

  describe('strict mode', () => {
    test('mutations throw outside Obj.update', ({ expect }) => {
      const obj = make('hello');
      expect(() => Text.update(obj, 'string', 'x')).toThrow(/Obj\.update/);
      expect(() => Text.splice(obj, 'string', 0, 1, 'x')).toThrow(/Obj\.update/);
      expect(() => Text.applyEdits(obj, 'string', [{ oldString: 'h', newString: 'H' }])).toThrow(/Obj\.update/);
    });
  });

  describe('minimal-delta semantics', () => {
    test('a cursor survives a splice at an earlier offset', ({ expect }) => {
      const obj = make('Hello World');
      const accessor = getObjectCore(obj).getDocAccessor(['string']);
      // Anchor a cursor on 'W' (index 6). A whole-string replace would invalidate it.
      const cursor = A.getCursor(accessor.handle.doc(), accessor.path.slice(), 6);

      Obj.update(obj, () => {
        Text.splice(obj, 'string', 0, 0, 'Say: ');
      });

      const position = A.getCursorPosition(accessor.handle.doc(), accessor.path.slice(), cursor);
      const text: string = Obj.getValue(obj, ['string']);
      expect(text).toBe('Say: Hello World');
      expect(position).toBe(11);
      expect(text[position]).toBe('W');
    });

    test('a cursor before the edited region survives an update', ({ expect }) => {
      const obj = make('Hello World');
      const accessor = getObjectCore(obj).getDocAccessor(['string']);
      // Anchor a cursor on 'H' (index 0), before the region the diff rewrites.
      const cursor = A.getCursor(accessor.handle.doc(), accessor.path.slice(), 0);

      // `A.updateText` rewrites only the changed suffix ('World' -> 'Mars'), so the earlier anchor holds.
      Obj.update(obj, () => {
        Text.update(obj, 'string', 'Hello Mars');
      });

      const position = A.getCursorPosition(accessor.handle.doc(), accessor.path.slice(), cursor);
      const text: string = Obj.getValue(obj, ['string']);
      expect(text).toBe('Hello Mars');
      expect(position).toBe(0);
      expect(text[position]).toBe('H');
    });
  });
});
