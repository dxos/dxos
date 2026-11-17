//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseFields } from '@dxos/deus/review';

import CALLS_SPEC from '../../../../plugin-calls/PLUGIN.mdl?raw';
import TRIP_SPEC from '../../../../plugin-trip/PLUGIN.mdl?raw';
import { buildApiModel, buildDataModel, parseField, splitTopLevel } from './data-model.ts';

describe('data and API models', () => {
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

  test('reads an inline input record as parameters', ({ expect }) => {
    const spec = ['```mdl', 'op listFiles', '  input:  { project: Ref<CodeProject>, path?: string }', '```'].join('\n');
    const [listFiles] = buildApiModel(spec).groups[0].endpoints;
    expect(listFiles.inputs).toEqual([
      { name: 'project', optional: false, type: 'Ref<CodeProject>' },
      { name: 'path', optional: true, type: 'string' },
    ]);
  });
});
