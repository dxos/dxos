//
// Copyright 2025 DXOS.org
//

import { next as A, type Doc as AutomergeDoc } from '@automerge/automerge';
import { describe, it, test } from 'vitest';

import * as Doc from '@dxos/doc';
import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { DocAccessor } from '../core-db';
import { EchoTestBuilder } from '../testing';
import { createDocAccessor } from './doc-accessor';
import { createObject } from './echo-handler';

describe('diff', () => {
  it('should replace a word', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Task]);

    const obj = db.add(Obj.make(TestSchema.Task, { description: 'This is a document.' }));
    const accessor = createDocAccessor(obj, ['description']);
    accessor.handle.change((doc: AutomergeDoc<TestSchema.Task>) => {
      const idx = DocAccessor.getValue<string>(accessor).indexOf('a');
      A.splice(doc, accessor.path as A.Prop[], idx, 1, 'the');
    });
    const text = DocAccessor.getValue<string>(accessor);
    expect(text).toBe('This is the document.');
  });
});

// Proof-of-concept: `createDocAccessor` over an unattached (core-backed but not yet db.add-ed) object.
// `Obj.make` alone yields a core-less reactive proxy; routing it through `createObject` allocates a
// local Automerge doc so the editor can bind before persistence, then `db.add` re-homes that doc.
describe('in-memory (unattached object)', () => {
  test('createDocAccessor works before db.add and edits survive attach', async ({ expect }) => {
    // Core-backed but unattached: `createObject` allocates a local Automerge doc (no db).
    const obj = createObject(Obj.make(TestSchema.Task, { description: 'hello' }));

    // The editor binding does not throw off-db, and reads the local doc.
    const accessor = createDocAccessor(obj, ['description']);
    expect(DocAccessor.getValue<string>(accessor)).toBe('hello');

    // Edit in-memory via the same accessor the CodeMirror binding uses.
    accessor.handle.change((doc: AutomergeDoc<TestSchema.Task>) => {
      A.splice(doc, accessor.path as A.Prop[], 5, 0, ' world');
    });
    expect(DocAccessor.getValue<string>(accessor)).toBe('hello world');

    // Attach to a space; the local doc is re-homed into the space doc.
    const builder = new EchoTestBuilder();
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Task]);
    const added = db.add(obj);

    // Same proxy identity, content preserved through the re-home.
    expect(added).toBe(obj);
    expect(added.description).toBe('hello world');

    // Reactivity survives: edits after attach are visible on the live object.
    const boundAccessor = createDocAccessor(added, ['description']);
    boundAccessor.handle.change((doc: AutomergeDoc<TestSchema.Task>) => {
      A.splice(doc, boundAccessor.path as A.Prop[], 11, 0, '!');
    });
    expect(added.description).toBe('hello world!');
  });
});

// Agnostic top-level API: `createDocAccessor` lives in `@dxos/doc` and is fulfilled by the provider
// that `@dxos/echo-client` registers. The same call works whether the object is in-memory or
// attached, so consumers never import echo-client internals or branch on attachment state.
describe('createDocAccessor (agnostic via @dxos/doc)', () => {
  test('resolves an accessor for an in-memory object not yet added to a db', ({ expect }) => {
    const obj = Obj.make(TestSchema.Task, { description: 'hello' });
    const accessor = Doc.createAccessor(obj, ['description']);
    expect(Doc.Accessor.getValue<string>(accessor)).toBe('hello');

    accessor.handle.change((doc) => {
      A.splice(doc, accessor.path as A.Prop[], 5, 0, ' world');
    });
    expect(Doc.Accessor.getValue<string>(accessor)).toBe('hello world');
  });

  test('resolves an accessor for a db-attached object', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Task]);

    const obj = db.add(Obj.make(TestSchema.Task, { description: 'hi' }));
    const accessor = Doc.createAccessor(obj, ['description']);
    expect(Doc.Accessor.getValue<string>(accessor)).toBe('hi');

    accessor.handle.change((doc) => {
      A.splice(doc, accessor.path as A.Prop[], 2, 0, ' there');
    });
    expect(obj.description).toBe('hi there');
  });

  test('in-memory edits survive db.add via the agnostic API', async ({ expect }) => {
    const obj = Obj.make(TestSchema.Task, { description: 'draft' });
    const accessor = Doc.createAccessor(obj, ['description']);
    accessor.handle.change((doc) => {
      A.splice(doc, accessor.path as A.Prop[], 5, 0, 'ed');
    });
    expect(Doc.Accessor.getValue<string>(accessor)).toBe('drafted');

    const builder = new EchoTestBuilder();
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Task]);
    const added = db.add(obj);
    expect(added.description).toBe('drafted');
  });
});
