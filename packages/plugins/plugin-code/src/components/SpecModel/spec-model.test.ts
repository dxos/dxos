//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import CALLS_SPEC from '../../../../plugin-calls/PLUGIN.mdl?raw';
import TRIP_SPEC from '../../../../plugin-trip/PLUGIN.mdl?raw';
import { buildApiModel, buildDataModel, buildDefinitionGraph, parseField, parseFields } from './spec-model.ts';

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
});
