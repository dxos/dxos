//
// Copyright 2025 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

import * as Doc from './Doc';
import { applyEdits } from './edits';

// `Doc.createAccessor` resolves an accessor for either backend: a database-attached object (its core
// is the space document) or an in-memory `Obj.make` object (a local core is materialized on demand).

describe('Doc', () => {
  describe('echo-db backend', () => {
    test('reads and edits an attached object', async ({ expect }) => {
      const builder = new EchoTestBuilder();
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([TestSchema.Task]);

      const obj = db.add(Obj.make(TestSchema.Task, { description: 'hello' }));
      const accessor = Doc.createAccessor(obj, ['description']);
      expect(Doc.getValue<string>(accessor)).toBe('hello');

      accessor.handle.change((doc) => {
        const path: A.Prop[] = [...accessor.path];
        A.splice(doc, path, 5, 0, ' world');
      });
      expect(obj.description).toBe('hello world');
    });
  });

  describe('in-memory backend', () => {
    test('binds before db.add and edits survive attach', async ({ expect }) => {
      const obj = Obj.make(TestSchema.Task, { description: 'hello' });

      // No db: a local core is materialized so the accessor can bind.
      const accessor = Doc.createAccessor(obj, ['description']);
      expect(Doc.getValue<string>(accessor)).toBe('hello');

      accessor.handle.change((doc) => {
        const path: A.Prop[] = [...accessor.path];
        A.splice(doc, path, 5, 0, ' world');
      });
      expect(Doc.getValue<string>(accessor)).toBe('hello world');

      const builder = new EchoTestBuilder();
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([TestSchema.Task]);
      const added = db.add(obj);
      expect(added).toBe(obj);
      expect(added.description).toBe('hello world');
    });
  });

  describe('applyEdits', () => {
    test('applies edits over an attached object', async ({ expect }) => {
      const builder = new EchoTestBuilder();
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([TestSchema.Task]);

      const obj = db.add(Obj.make(TestSchema.Task, { description: 'the cat sat' }));
      const accessor = Doc.createAccessor(obj, ['description']);
      expect(applyEdits(accessor, [{ oldString: 'cat', newString: 'dog' }])).toBe('the dog sat');
      expect(obj.description).toBe('the dog sat');
    });

    test('applies edits over an in-memory object', ({ expect }) => {
      const obj = Obj.make(TestSchema.Task, { description: 'the cat sat' });
      const accessor = Doc.createAccessor(obj, ['description']);
      expect(applyEdits(accessor, [{ oldString: 'cat', newString: 'dog' }])).toBe('the dog sat');
    });

    test('replaces all occurrences with replaceAll', ({ expect }) => {
      const obj = Obj.make(TestSchema.Task, { description: 'the cat sat on the cat' });
      const accessor = Doc.createAccessor(obj, ['description']);
      expect(applyEdits(accessor, [{ oldString: 'cat', newString: 'dog', replaceAll: true }])).toBe(
        'the dog sat on the dog',
      );
    });

    test('throws when oldString is not found', ({ expect }) => {
      const obj = Obj.make(TestSchema.Task, { description: 'hello' });
      const accessor = Doc.createAccessor(obj, ['description']);
      expect(() => applyEdits(accessor, [{ oldString: 'xyz', newString: 'abc' }])).toThrow();
    });

    test('throws on an empty oldString (would otherwise loop forever with replaceAll)', ({ expect }) => {
      const obj = Obj.make(TestSchema.Task, { description: 'hello' });
      const accessor = Doc.createAccessor(obj, ['description']);
      expect(() => applyEdits(accessor, [{ oldString: '', newString: 'x', replaceAll: true }])).toThrow();
    });
  });
});
