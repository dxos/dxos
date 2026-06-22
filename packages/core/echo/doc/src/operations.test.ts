//
// Copyright 2025 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, test } from 'vitest';

import { type Accessor, type Handle, type KeyPath } from './doc';
import { applyEdits } from './edits';
import { append, diff, getHeads, onChange, splice } from './operations';

type Schema = { content: string };

// Minimal in-memory accessor over a standalone Automerge doc — exercises the operations without echo-client.
const makeAccessor = (initial: Schema, path: KeyPath = ['content']): Accessor<Schema> => {
  let doc = A.from(initial);
  const listeners = new Set<() => void>();
  const handle: Handle<Schema> = {
    doc: () => doc,
    change: (callback) => {
      doc = A.change(doc, callback);
      listeners.forEach((listener) => listener());
    },
    changeAt: (heads, callback) => {
      const { newDoc, newHeads } = A.changeAt(doc, heads, callback);
      doc = newDoc;
      return newHeads ?? undefined;
    },
    addListener: (_event, listener) => listeners.add(listener),
    removeListener: (_event, listener) => listeners.delete(listener),
  };
  return { handle, path } as Accessor<Schema>;
};

describe('operations', () => {
  describe('applyEdits', () => {
    test('replaces the first occurrence', ({ expect }) => {
      const accessor = makeAccessor({ content: 'the cat sat on the cat' });
      const result = applyEdits(accessor, [{ oldString: 'cat', newString: 'dog' }]);
      expect(result).toBe('the dog sat on the cat');
    });

    test('replaces all occurrences with replaceAll', ({ expect }) => {
      const accessor = makeAccessor({ content: 'the cat sat on the cat' });
      const result = applyEdits(accessor, [{ oldString: 'cat', newString: 'dog', replaceAll: true }]);
      expect(result).toBe('the dog sat on the dog');
    });

    test('throws when oldString is not found', ({ expect }) => {
      const accessor = makeAccessor({ content: 'hello' });
      expect(() => applyEdits(accessor, [{ oldString: 'xyz', newString: 'abc' }])).toThrow();
    });
  });

  test('append adds to the end', ({ expect }) => {
    const accessor = makeAccessor({ content: 'hello' });
    append(accessor, ' world');
    expect(accessor.handle.doc()!.content).toBe('hello world');
  });

  test('splice replaces a range', ({ expect }) => {
    const accessor = makeAccessor({ content: 'hello world' });
    splice(accessor, 0, 5, 'goodbye');
    expect(accessor.handle.doc()!.content).toBe('goodbye world');
  });

  test('onChange fires and unsubscribes', ({ expect }) => {
    const accessor = makeAccessor({ content: 'a' });
    let count = 0;
    const unsubscribe = onChange(accessor, () => count++);
    append(accessor, 'b');
    expect(count).toBe(1);
    unsubscribe();
    append(accessor, 'c');
    expect(count).toBe(1);
  });

  test('getHeads and diff track changes', ({ expect }) => {
    const accessor = makeAccessor({ content: 'a' });
    const before = getHeads(accessor);
    expect(diff(accessor, before, before)).toEqual([]);

    append(accessor, 'b');
    const after = getHeads(accessor);
    expect(diff(accessor, before, after).length).toBeGreaterThan(0);
  });
});
