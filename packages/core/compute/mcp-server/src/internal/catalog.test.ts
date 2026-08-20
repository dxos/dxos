//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Catalog from './catalog';
import type * as Projection from './projection';

const operation = ({
  key,
  name,
  description,
  skills = ['codeProject'],
  mutation,
}: {
  key: string;
  name?: string;
  description?: string;
  skills?: readonly string[];
  mutation?: 'none' | 'write' | 'destructive';
}): Projection.ProjectedOperation => ({
  key,
  entry: {
    key,
    name,
    description,
    skills,
    requiresSpace: true,
    mutation,
    inputSchema: { type: 'object', properties: { title: { type: 'string' } } },
    outputSchema: { type: 'object' },
  },
  parameters: { title: Schema.String },
  wireSchema: Schema.Struct({ title: Schema.String }),
});

const catalog = () =>
  Catalog.make([
    operation({ key: 'org.dxos.function.tasks.taskCreate', name: 'Create Task', description: 'Creates a task.' }),
    operation({
      key: 'org.dxos.function.space.queryObjects',
      name: 'Query Objects',
      description: 'Queries objects in a space.',
      skills: ['database'],
      mutation: 'none',
    }),
  ]);

const keysOf = (entries: readonly Projection.OperationEntry[]) => entries.map((entry) => entry.key);

describe('Catalog', () => {
  describe('find', () => {
    test('an empty query lists everything, compactly', ({ expect }) => {
      const entries = catalog().find({});
      expect(keysOf(entries)).to.deep.equal([
        'org.dxos.function.tasks.taskCreate',
        'org.dxos.function.space.queryObjects',
      ]);
      // The schemas are what a per-tool surface spent context on; a row carries none of it.
      expect(entries[0]).to.not.have.property('inputSchema');
      expect(entries[0]).to.not.have.property('outputSchema');
      expect(entries[0].description).to.equal('Creates a task.');
    });

    test('every query term must match, across key, name and description', ({ expect }) => {
      expect(keysOf(catalog().find({ query: 'create task' }))).to.deep.equal(['org.dxos.function.tasks.taskCreate']);
      expect(keysOf(catalog().find({ query: 'query' }))).to.deep.equal(['org.dxos.function.space.queryObjects']);
      expect(catalog().find({ query: 'create nonexistent' })).to.have.length(0);
    });

    test('matching is case-insensitive, since the model writes prose not keys', ({ expect }) => {
      expect(keysOf(catalog().find({ query: 'CREATES A TASK' }))).to.deep.equal(['org.dxos.function.tasks.taskCreate']);
    });

    test('a skill filter narrows to the operations that skill governs', ({ expect }) => {
      expect(keysOf(catalog().find({ skill: 'database' }))).to.deep.equal(['org.dxos.function.space.queryObjects']);
      expect(catalog().find({ skill: 'noSuchSkill' })).to.have.length(0);
    });

    test('naming keys is the lookup that returns the schemas', ({ expect }) => {
      const [entry] = catalog().find({ keys: ['org.dxos.function.tasks.taskCreate'] });
      expect(entry.key).to.equal('org.dxos.function.tasks.taskCreate');
      expect((entry.inputSchema as any).properties.title).to.deep.equal({ type: 'string' });
      expect(entry.outputSchema).to.deep.equal({ type: 'object' });
    });

    test('an unknown key contributes nothing rather than failing the search', ({ expect }) => {
      expect(catalog().find({ keys: ['org.dxos.nope'] })).to.have.length(0);
    });

    test('keys win over the other filters: the caller has already chosen', ({ expect }) => {
      const entries = catalog().find({ keys: ['org.dxos.function.space.queryObjects'], skill: 'codeProject' });
      expect(keysOf(entries)).to.deep.equal(['org.dxos.function.space.queryObjects']);
    });
  });

  describe('get', () => {
    test('a key resolves however the caller spelled it', ({ expect }) => {
      const subject = catalog();
      for (const spelling of [
        'org.dxos.function.tasks.taskCreate',
        'dxn:org.dxos.function.tasks.taskCreate',
        'dxn:org.dxos.function.tasks.taskCreate:0.1.0',
      ]) {
        expect(subject.get(spelling)?.key, spelling).to.equal('org.dxos.function.tasks.taskCreate');
      }
      expect(subject.get('org.dxos.nope')).to.be.undefined;
    });

    test('an entry carries the decode schema its input is validated through', ({ expect }) => {
      expect(catalog().get('org.dxos.function.tasks.taskCreate')?.decodeSchema).to.not.be.undefined;
    });
  });
});
