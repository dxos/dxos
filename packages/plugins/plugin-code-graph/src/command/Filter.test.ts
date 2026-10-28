//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Iri, Model } from '#graph';

import * as Filter from './Filter.ts';

const nodes = [
  Model.makeNode(`${Iri.PACKAGE}@dxos/echo`),
  Model.makeNode(`${Iri.PACKAGE}@dxos/halo-protocol`),
  Model.makeNode(`${Iri.FILE}packages/core/halo/credentials/src/identity.ts`),
  Model.makeNode(`${Iri.FILE}packages/core/echo/echo/src/index.ts#Obj`),
];

const labels = (filter: string) => Filter.select(nodes, filter).map(({ label }) => label);

describe('Filter', () => {
  test('* selects every box', ({ expect }) => {
    expect(labels('*')).toHaveLength(nodes.length);
  });

  test('kind: selects one kind', ({ expect }) => {
    expect(labels('kind:package')).toEqual(['@dxos/echo', '@dxos/halo-protocol']);
    expect(labels('kind:symbol')).toEqual(['Obj']);
  });

  test('text matches labels, IRIs and packages, ignoring case', ({ expect }) => {
    expect(labels('HALO')).toEqual(['@dxos/halo-protocol', 'identity.ts']);
    expect(labels('core/echo')).toEqual(['Obj']);
  });

  test('a regular expression keeps its own alternation', ({ expect }) => {
    expect(labels('/^@dxos\\/(echo|halo)/')).toEqual(['@dxos/echo', '@dxos/halo-protocol']);
  });

  test('| separates alternatives', ({ expect }) => {
    expect(labels('identity | kind:symbol')).toEqual(['identity.ts', 'Obj']);
  });

  test('an invalid expression matches literally', ({ expect }) => {
    expect(labels('/[/')).toEqual([]);
  });
});
