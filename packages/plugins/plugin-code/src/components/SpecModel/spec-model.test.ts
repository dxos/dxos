//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type SpecIndex } from '@dxos/deus/spec-index';

import CALLS_SPEC from '../../../../plugin-calls/PLUGIN.mdl?raw';
import TRIP_SPEC from '../../../../plugin-trip/PLUGIN.mdl?raw';
import {
  buildApiModel,
  buildDataModel,
  buildDefinitionGraph,
  parseField,
  parseFields,
  selectDefinitions,
  splitTopLevel,
} from './spec-model.ts';

describe('spec model', () => {
  test('parses top-level fields with inline and nested values', ({ expect }) => {
    const fields = parseFields(['  desc: |', '    A call.', '  fields:', '    name?: string  # shown', ''].join('\n'));
    expect(fields.get('desc')).toEqual({ inline: undefined, lines: ['A call.'] });
    expect(parseField(fields.get('fields')?.lines[0] ?? '')).toEqual({
      name: 'name',
      type: 'string',
      optional: true,
      comment: 'shown',
    });
  });

  test('links each definition to the definitions it names', ({ expect }) => {
    const { definitions, edges } = buildDefinitionGraph(CALLS_SPEC);
    expect(definitions.some(({ kind }) => kind === 'decision' || kind === 'ext')).toBe(false);
    expect(edges).toContainEqual(expect.objectContaining({ from: 'Call', to: 'CallTransport' }));
    expect(definitions.find(({ id }) => id === 'T-1')?.dependsOn).toEqual(
      expect.arrayContaining(['startCall', 'CallState']),
    );
  });

  test('resolves a requirement id to its feature and a member to its type', ({ expect }) => {
    const spec = [
      '```mdl',
      'type Meeting',
      '```',
      '```mdl',
      'feat F-1: Meetings',
      '  req F-1.2: Holds a call.',
      '```',
      '```mdl',
      'scenario T-1: Covers [F-1.2]',
      '  then: Meeting.call is set',
      '```',
    ].join('\n');
    expect(buildDefinitionGraph(spec).definitions.find(({ id }) => id === 'T-1')?.dependsOn).toEqual([
      'F-1',
      'Meeting',
    ]);
  });

  test('keeps stored types and the types they embed', ({ expect }) => {
    const { types, edges } = buildDataModel(TRIP_SPEC);
    const ids = types.map(({ id }) => id);
    expect(types.find(({ id }) => id === 'Trip')?.stored).toBe('typename');
    expect(ids).toEqual(expect.arrayContaining(['Segment', 'FlightSegment', 'SegmentCore', 'Place']));
    expect(edges).toContainEqual(expect.objectContaining({ kind: 'variant', from: 'Segment', to: 'FlightSegment' }));
    expect(edges).toContainEqual(
      expect.objectContaining({ kind: 'extends', from: 'FlightSegment', to: 'SegmentCore' }),
    );
    // Runtime-only types stay out.
    expect(buildDataModel(CALLS_SPEC).types.map(({ id }) => id)).not.toContain('Participant');
  });

  test('reads table blocks as stored roots linked by their foreign keys', ({ expect }) => {
    const spec = [
      '```mdl',
      'table feeds: One feed of a space.',
      '  store: feed store (feed_migrations)',
      '  columns:',
      '    feedPrivateId: INTEGER PRIMARY KEY AUTOINCREMENT  # local row id',
      '    options?: TEXT                                    # json FeedOptions',
      '```',
      '',
      '```mdl',
      'table blocks: One block of a feed.',
      '  store: feed store (feed_migrations)',
      '  columns:',
      '    insertionId: INTEGER PRIMARY KEY AUTOINCREMENT',
      '    feedPrivateId: INTEGER REFERENCES feeds(feedPrivateId)',
      '```',
    ].join('\n');
    const { types, edges } = buildDataModel(spec);
    expect(types.find(({ id }) => id === 'feeds')).toMatchObject({
      stored: 'table',
      store: 'feed store (feed_migrations)',
      fields: [
        expect.objectContaining({ name: 'feedPrivateId' }),
        expect.objectContaining({ name: 'options', optional: true }),
      ],
    });
    expect(edges).toContainEqual(
      expect.objectContaining({ kind: 'references', from: 'blocks', to: 'feeds', field: 'feedPrivateId' }),
    );
  });

  test('reads operations and service methods as signatures', ({ expect }) => {
    const { groups, effects } = buildApiModel(CALLS_SPEC);
    const startCall = groups.find(({ id }) => id === 'startCall');
    expect(startCall).toMatchObject({ kind: 'op', requires: ['CallsCapabilities.Manager'] });
    expect(startCall?.errors.map(({ name }) => name)).toContain('DisplayNameMissing');
    const swarm = groups.find(({ id }) => id === 'CallSwarmSynchronizer');
    expect(swarm?.endpoints.find(({ name }) => name === 'join')).toMatchObject({ output: 'Participant[]' });
    expect(swarm?.endpoints.find(({ name }) => name === 'onPeerJoin')).toMatchObject({ event: true });
    expect(effects).toEqual(expect.arrayContaining(['device', 'network', 'echo:write']));
  });

  test('drops excluded kinds and their edges, and counts dependents', ({ expect }) => {
    const graph = buildDefinitionGraph(CALLS_SPEC);
    const { definitions, edges, dependents, kinds } = selectDefinitions(graph, ['scenario', 'test']);
    expect(kinds).not.toContain('scenario');
    expect(definitions.length).toBeLessThan(graph.definitions.length);
    const ids = new Set(definitions.map(({ id }) => id));
    expect(edges.every(({ from, to }) => ids.has(from) && ids.has(to))).toBe(true);
    expect(dependents.get('CallTransport')).toBe(edges.filter(({ to }) => to === 'CallTransport').length);
    expect(definitions.every(({ dependsOn }) => dependsOn.every((id) => ids.has(id)))).toBe(true);
  });

  test('keeps generic and compound parameter types whole', ({ expect }) => {
    expect(splitTopLevel('peers: Map<string, Participant>, id: string, cb: (a: A, b: B) => void')).toEqual([
      'peers: Map<string, Participant>',
      ' id: string',
      ' cb: (a: A, b: B) => void',
    ]);
    const spec = [
      '```mdl',
      'service Swarm',
      '  ops:',
      '    join(peers: Map<string, Peer>, id: string) -> Peer[]',
      '```',
    ].join('\n');
    const [join] = buildApiModel(spec).groups[0].endpoints;
    expect(join.inputs.map(({ name, type }) => `${name}: ${type}`)).toEqual(['peers: Map<string, Peer>', 'id: string']);
    expect(join.output).toBe('Peer[]');
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
    const graph = buildDefinitionGraph(spec, new Map(), [], index);
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
    const graph = buildDefinitionGraph(spec, new Map(), [], index);
    expect(graph.edges).not.toContainEqual(expect.objectContaining({ from: 'F-1', to: 'Scene' }));
  });

  test('a reference outside the indexed namespaces creates nothing', ({ expect }) => {
    const graph = buildDefinitionGraph(spec, new Map(), [], index);
    expect(graph.definitions.filter(({ external }) => external).map(({ id }) => id)).toEqual([
      'github:dxos/dxos/packages/alpha/PLUGIN.mdl#Scene',
    ]);
  });
});
