//
// Copyright 2025 DXOS.org
//

import { next as A, type Doc } from '@automerge/automerge';
import { describe, it, test } from 'vitest';

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
    accessor.handle.change((doc: Doc<TestSchema.Task>) => {
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
    accessor.handle.change((doc: Doc<TestSchema.Task>) => {
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
    boundAccessor.handle.change((doc: Doc<TestSchema.Task>) => {
      A.splice(doc, boundAccessor.path as A.Prop[], 11, 0, '!');
    });
    expect(added.description).toBe('hello world!');
  });
});
