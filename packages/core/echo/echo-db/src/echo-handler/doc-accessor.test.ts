//
// Copyright 2025 DXOS.org
//

import { next as A, type Doc } from '@automerge/automerge';
import { describe, it } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { DocAccessor } from '../core-db';
import { EchoTestBuilder } from '../testing';

import { createDocAccessor } from './doc-accessor';

describe('diff', () => {
  it('should replace a word', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    const { db, graph } = await builder.createDatabase();
    graph.schemaRegistry.register([TestSchema.Task]);

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
