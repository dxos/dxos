//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type SpecIndex } from '@dxos/deus/spec-index';

import CALLS_SPEC from '../../../../plugin-calls/PLUGIN.mdl?raw';
import { specDeclarations } from './declarations.ts';
import { type BuildDefinitionGraphOptions, buildDefinitionGraph, selectDefinitions } from './spec-model.ts';

/** The graph of a spec read in the software dialect, as plugin-code reads its own specs. */
const softwareGraph = (text: string, options: BuildDefinitionGraphOptions = {}) =>
  buildDefinitionGraph(text, { declarations: specDeclarations(text, ['org.dxos.spec.software']), ...options });

describe('spec model', () => {
  test('links each definition through its typed fields, and keeps prose names apart', ({ expect }) => {
    const spec = [
      '## Types',
      '```mdl',
      'type Meeting',
      '  fields:',
      '    room: Ref<Room>',
      '```',
      '```mdl',
      'type Room: Where a Meeting happens.',
      '```',
      '## Features',
      '```mdl',
      'feat F-1: Meetings',
      '  req F-1.2: Holds a call.',
      '  req F-1.3: Lists rooms.',
      '```',
      '```mdl',
      'scenario T-1: Covers F-1.2',
      '  covers: [F-1.2]',
      '  then: Meeting.call is set',
      '```',
    ].join('\n');
    const { definitions, edges } = softwareGraph(spec);
    // A field typed `Ref<Room>` points at Room without holding it, though a type composes its other fields' types.
    expect(edges).toContainEqual({
      id: 'Meeting->Room',
      from: 'Meeting',
      to: 'Room',
      kind: 'reference',
      relation: 'references',
      field: 'fields',
    });
    // A requirement id resolves to its feature; a name in prose is not a link.
    expect(definitions.find(({ id }) => id === 'T-1')).toMatchObject({ dependsOn: ['F-1'] });
    expect(definitions.find(({ id }) => id === 'Room')).toMatchObject({ section: 'Types', dependsOn: [] });
    expect(definitions.find(({ id }) => id === 'F-1')).toMatchObject({ section: 'Features', requirements: 2 });
    expect(buildDefinitionGraph(CALLS_SPEC).definitions.some(({ kind }) => kind === 'decision' || kind === 'ext')).toBe(
      false,
    );
  });

  test("relates each field's names as its type's links say, turning a link read from the other end round", ({
    expect,
  }) => {
    const spec = [
      '```mdl\next shot\n  uri: org.dxos.mdl.shot@0.1\n  links:\n    scene: part-of\n```',
      '```mdl\ntype Base\n```',
      '```mdl\ntype Sub\n  extends: [Base]\n```',
      '```mdl\nscene SC-1: Open\n```',
      '```mdl\nshot SH-1: Wide\n  scene: SC-1\n```',
    ].join('\n');
    const { edges } = softwareGraph(spec);
    expect(edges.map(({ id, relation }) => ({ id, relation }))).toEqual([
      { id: 'Sub->Base', relation: 'extends' },
      { id: 'SC-1->SH-1', relation: 'composes' },
    ]);
  });

  test('keeps the one-line value of each fact field, without its comment', ({ expect }) => {
    const spec = [
      '```mdl',
      'feat F-1: Meetings',
      '  status: operational',
      '```',
      '```mdl',
      'test QA-1: Join a call',
      '  status: passing   # recorded 2026-11-04',
      '  desc: Joins.',
      '```',
    ].join('\n');
    const byId = (id: string) =>
      buildDefinitionGraph(spec, { factFields: new Set(['status']) }).definitions.find(
        (definition) => definition.id === id,
      );
    expect(byId('F-1')?.facts).toEqual({ status: 'operational' });
    expect(byId('QA-1')?.facts).toEqual({ status: 'passing' });
    expect(buildDefinitionGraph(spec).definitions[0].facts).toBeUndefined();
  });

  test('drops excluded kinds and their edges, and counts dependents', ({ expect }) => {
    const graph = softwareGraph(CALLS_SPEC);
    const { definitions, edges, dependents, kinds } = selectDefinitions(graph, ['scenario', 'test']);
    expect(kinds).not.toContain('scenario');
    expect(definitions.length).toBeLessThan(graph.definitions.length);
    const ids = new Set(definitions.map(({ id }) => id));
    expect(edges.every(({ from, to }) => ids.has(from) && ids.has(to))).toBe(true);
    expect(dependents.get('CallTransport')).toBe(edges.filter(({ to }) => to === 'CallTransport').length);
    expect(definitions.every(({ dependsOn }) => dependsOn.every((id) => ids.has(id)))).toBe(true);
  });
});

describe('spec references', () => {
  const index: SpecIndex = {
    specs: { 'org.test.alpha': { path: 'packages/alpha/PLUGIN.mdl', items: ['F-1', 'Scene'] } },
    duplicates: {},
  };
  const fence = (body: string) => ['```mdl', body, '```'].join('\n');
  const spec = [
    fence(['feat F-1: Draws things', '  desc: Renders an org.test.alpha#Scene, not foo.bar#Thing.'].join('\n')),
    fence('type Scene'),
    fence('type Thing'),
  ].join('\n\n');

  test('a reference to an indexed spec becomes an external node keyed by its file', ({ expect }) => {
    const graph = buildDefinitionGraph(spec, { index });
    const id = 'github:dxos/dxos/packages/alpha/PLUGIN.mdl#Scene';
    expect(graph.definitions.find((definition) => definition.id === id)).toMatchObject({
      external: {
        target: 'spec',
        key: { owner: 'dxos', repo: 'dxos', path: 'packages/alpha/PLUGIN.mdl', fragment: 'Scene' },
        fragment: 'Scene',
      },
    });
    expect(graph.edges).toContainEqual(expect.objectContaining({ from: 'F-1', to: id }));
  });

  test('a reference’s item is not read as a local block of the same name', ({ expect }) => {
    const graph = buildDefinitionGraph(spec, { index });
    expect(graph.edges).not.toContainEqual(expect.objectContaining({ from: 'F-1', to: 'Scene' }));
  });

  test('a reference outside the indexed namespaces creates nothing', ({ expect }) => {
    const graph = buildDefinitionGraph(spec, { index });
    expect(graph.definitions.filter(({ external }) => external).map(({ id }) => id)).toEqual([
      'github:dxos/dxos/packages/alpha/PLUGIN.mdl#Scene',
    ]);
  });
});
