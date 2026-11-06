//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { levelOf, referencesBySection, sectionsOf } from './definition-levels.ts';
import { buildDefinitionGraph, selectDefinitions } from './spec-model.ts';

const SPEC = [
  '## Types',
  '```mdl',
  'type Room',
  '```',
  '```mdl',
  'type Meeting',
  '  fields:',
  '    room: Ref<Room>',
  '```',
  '## Operations',
  '```mdl',
  'op join: Joins a meeting.',
  '  input: { meeting: Ref<Meeting> }',
  '```',
  '```mdl',
  'op leave: Leaves a meeting.',
  '  input: { meeting: Ref<Meeting>, room: Ref<Room> }',
  '```',
].join('\n');

const model = selectDefinitions(buildDefinitionGraph(SPEC), []);
const sections = sectionsOf(model);

describe('definition levels', () => {
  test('groups definitions by their heading, in spec order', ({ expect }) => {
    expect(sections.map(({ title, definitions }) => [title, definitions.map(({ id }) => id)])).toEqual([
      ['Types', ['Room', 'Meeting']],
      ['Operations', ['join', 'leave']],
    ]);
  });

  test('draws the whole spec as its sections, with no arrows between them', ({ expect }) => {
    const level = levelOf(model, sections, {});
    expect(level.nodes.map(({ id }) => id)).toEqual(['section:Types', 'section:Operations']);
    expect(level.edges).toEqual([]);
  });

  test('draws a section as its own definitions, counting their references by section', ({ expect }) => {
    const level = levelOf(model, sections, { section: 'section:Types' });
    expect(level.nodes.map(({ id }) => id)).toEqual(['Room', 'Meeting']);
    expect(level.edges).toEqual([]);
    const references = referencesBySection(model, sections);
    expect(references.get('Meeting')).toEqual(new Map([['section:Types', 1]]));
    expect(references.get('leave')).toEqual(new Map([['section:Types', 2]]));
  });

  test('draws a definition with its neighbours, up to the limit', ({ expect }) => {
    const level = levelOf(model, sections, { definition: 'Meeting' }, { neighbours: 2 });
    expect(level.nodes.map(({ id }) => id)).toEqual(['Meeting', 'Room', 'join']);
    expect(level.hidden).toBe(1);
    expect(level.edges.every(({ from, to }) => from === 'Meeting' || to === 'Meeting')).toBe(true);
  });
});
