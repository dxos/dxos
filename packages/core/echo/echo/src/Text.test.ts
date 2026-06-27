//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Obj from './Obj';
import { TestSchema } from './testing';
import * as Text from './Text';

describe('Text', () => {
  describe('update', () => {
    test('replaces the value; readable via getValue', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'hello' });
      Obj.update(obj, () => {
        Text.update(obj, 'name', 'goodbye');
      });
      expect(Obj.getValue(obj, ['name'])).toBe('goodbye');
    });

    test('accepts a key-path array', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'hello' });
      Obj.update(obj, () => {
        Text.update(obj, ['name'], 'world');
      });
      expect(Obj.getValue(obj, ['name'])).toBe('world');
    });

    test('updates a nested string field', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'a', address: { city: 'Paris', coordinates: {} } });
      Obj.update(obj, () => {
        Text.update(obj, ['address', 'city'], 'London');
      });
      expect(Obj.getValue(obj, ['address', 'city'])).toBe('London');
    });
  });

  describe('splice', () => {
    test('inserts at an index', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'helloworld' });
      Obj.update(obj, () => {
        const removed = Text.splice(obj, 'name', 5, 0, ' ');
        expect(removed).toBe('');
      });
      expect(Obj.getValue(obj, ['name'])).toBe('hello world');
    });

    test('deletes and returns the removed substring', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'hello world' });
      Obj.update(obj, () => {
        const removed = Text.splice(obj, 'name', 5, 6);
        expect(removed).toBe(' world');
      });
      expect(Obj.getValue(obj, ['name'])).toBe('hello');
    });

    test('replaces in place', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'hello world' });
      Obj.update(obj, () => {
        const removed = Text.splice(obj, 'name', 6, 5, 'there');
        expect(removed).toBe('world');
      });
      expect(Obj.getValue(obj, ['name'])).toBe('hello there');
    });

    test('start past end appends', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'abc' });
      Obj.update(obj, () => {
        const removed = Text.splice(obj, 'name', 100, 0, 'def');
        expect(removed).toBe('');
      });
      expect(Obj.getValue(obj, ['name'])).toBe('abcdef');
    });

    test('mirrors Array.splice index semantics', ({ expect }) => {
      const reference = 'hello world';
      const obj = Obj.make(TestSchema.Person, { name: reference });
      let removed = '';
      Obj.update(obj, () => {
        removed = Text.splice(obj, 'name', 0, 5, 'HELLO');
      });
      // Mirror the same operation on a character array.
      const chars = [...reference];
      const removedChars = chars.splice(0, 5, ...'HELLO');
      expect(removed).toBe(removedChars.join(''));
      expect(Obj.getValue(obj, ['name'])).toBe(chars.join(''));
    });
  });

  describe('apply', () => {
    test('replaces the first occurrence', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'foo foo foo' });
      Obj.update(obj, () => {
        Text.apply(obj, 'name', [{ oldString: 'foo', newString: 'bar' }]);
      });
      expect(Obj.getValue(obj, ['name'])).toBe('bar foo foo');
    });

    test('replaces all occurrences', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'foo foo foo' });
      Obj.update(obj, () => {
        Text.apply(obj, 'name', [{ oldString: 'foo', newString: 'bar', replaceAll: true }]);
      });
      expect(Obj.getValue(obj, ['name'])).toBe('bar bar bar');
    });

    test('replaceAll does not re-match inserted text', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'a a a' });
      Obj.update(obj, () => {
        Text.apply(obj, 'name', [{ oldString: 'a', newString: 'aa', replaceAll: true }]);
      });
      expect(Obj.getValue(obj, ['name'])).toBe('aa aa aa');
    });

    test('appends when oldString is missing', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'hello' });
      Obj.update(obj, () => {
        Text.apply(obj, 'name', [{ newString: ' world' }]);
      });
      expect(Obj.getValue(obj, ['name'])).toBe('hello world');
    });

    test('appends when oldString is empty', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'hello' });
      Obj.update(obj, () => {
        Text.apply(obj, 'name', [{ oldString: '', newString: '!' }]);
      });
      expect(Obj.getValue(obj, ['name'])).toBe('hello!');
    });

    test('applies edits sequentially and returns the final text', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'hello' });
      let result = '';
      Obj.update(obj, () => {
        result = Text.apply(obj, 'name', [{ oldString: 'hello', newString: 'hi' }, { newString: ' there' }]);
      });
      expect(result).toBe('hi there');
      expect(Obj.getValue(obj, ['name'])).toBe('hi there');
    });

    test('throws when a non-replaceAll oldString is not found', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'hello' });
      expect(() =>
        Obj.update(obj, () => {
          Text.apply(obj, 'name', [{ oldString: 'missing', newString: 'x' }]);
        }),
      ).toThrow();
    });
  });

  describe('strict mode', () => {
    test('update throws outside Obj.update', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'hello' });
      expect(() => Text.update(obj, 'name', 'x')).toThrow(/Obj\.update/);
    });

    test('splice throws outside Obj.update', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'hello' });
      expect(() => Text.splice(obj, 'name', 0, 1, 'x')).toThrow(/Obj\.update/);
    });

    test('apply throws outside Obj.update', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'hello' });
      expect(() => Text.apply(obj, 'name', [{ oldString: 'h', newString: 'H' }])).toThrow(/Obj\.update/);
    });
  });

  describe('reactivity', () => {
    test('a subscriber fires once per Obj.update batch', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'hello' });
      let count = 0;
      const unsubscribe = Obj.subscribe(obj, () => {
        count++;
      });

      Obj.update(obj, () => {
        Text.splice(obj, 'name', 0, 5, 'goodbye');
        Text.splice(obj, 'name', 0, 0, '!');
      });

      expect(count).toBe(1);
      expect(Obj.getValue(obj, ['name'])).toBe('!goodbye');
      unsubscribe();
    });
  });
});
