//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Iri from './Iri.ts';
import * as Model from './Model.ts';

const echo = `${Iri.PACKAGE}@dxos/echo`;
const log = `${Iri.PACKAGE}@dxos/log`;
const util = `${Iri.PACKAGE}@dxos/util`;
const file = `${Iri.FILE}packages/common/log/src/index.ts`;

describe('Iri', () => {
  test('kinds, labels and groups come from the namespace', ({ expect }) => {
    expect(Iri.kindOf(echo)).toBe('package');
    expect(Iri.labelOf(echo)).toBe('@dxos/echo');
    expect(Iri.kindOf(file)).toBe('file');
    expect(Iri.labelOf(file)).toBe('index.ts');
    expect(Iri.groupOf(file)).toBe('packages/common/log');
    expect(Iri.kindOf(`${file}#log`)).toBe('symbol');
    expect(Iri.labelOf(`${file}#log`)).toBe('log');
    expect(Iri.localName(`${Iri.DEUS}usesPackage`)).toBe('usesPackage');
    expect(Iri.localName('deus:imports')).toBe('imports');
  });

  test('a malformed percent sequence labels as written instead of throwing', ({ expect }) => {
    expect(Iri.labelOf(`${Iri.FILE}src/100%.ts`)).toBe('100%.ts');
    expect(Iri.labelOf(`${Iri.PACKAGE}@dxos/%zz`)).toBe('@dxos/%zz');
  });

  test('shorthand expands to full IRIs', ({ expect }) => {
    expect(Iri.expand('pkg:@dxos/echo')).toBe(echo);
    expect(Iri.expand('file:packages/common/log/src/index.ts')).toBe(file);
    expect(Iri.expand(echo)).toBe(echo);
  });
});

describe('Model', () => {
  test('fromRows makes arrows from ?from/?to and boxes from ?node', ({ expect }) => {
    const patch = Model.fromRows(
      [
        { from: echo, to: log, predicate: `${Iri.DEUS}usesPackage` },
        { node: util, label: 'Util' },
        { name: 'not an iri' },
      ],
      'imports',
    );
    expect(patch.edges).toEqual([{ from: echo, to: log, kind: 'usesPackage' }]);
    expect(patch.nodes.map(({ id }) => id)).toEqual([echo, log, util]);
    expect(patch.nodes[2].label).toBe('Util');
  });

  test('missing adds only new boxes and arrows, plus the boxes an arrow needs', ({ expect }) => {
    const current: Model.Patch = {
      nodes: [Model.makeNode(echo, { position: { x: 1, y: 2 } })],
      edges: [],
    };
    const added = Model.missing(current, {
      nodes: [Model.makeNode(echo)],
      edges: [
        { from: echo, to: log },
        { from: echo, to: log },
        { from: log, to: log },
      ],
    });
    expect(added.nodes.map(({ id }) => id)).toEqual([log]);
    expect(added.edges).toEqual([{ from: echo, to: log }]);
  });

  test('without drops boxes and every arrow touching them', ({ expect }) => {
    const graph: Model.Patch = {
      nodes: [echo, log, util].map((iri) => Model.makeNode(iri)),
      edges: [
        { from: echo, to: log },
        { from: util, to: echo },
      ],
    };
    const next = Model.without(graph, ['pkg:@dxos/log']);
    expect(next.nodes.map(({ id }) => id)).toEqual([echo, util]);
    expect(next.edges).toEqual([{ from: util, to: echo }]);
  });
});
