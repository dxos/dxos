//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

import { buildPreview } from './preview.ts';

class Note extends Type.makeObject<Note>(DXN.make('org.dxos.test.note', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String), description: Schema.optional(Schema.String) }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.DescriptionAnnotation.set('description'),
    Annotation.IconAnnotation.set({ icon: 'ph--note--regular', hue: 'amber' }),
  ),
) {}

class Board extends Type.makeObject<Board>(DXN.make('org.dxos.test.board', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(Annotation.LabelAnnotation.set(['name'])),
) {}

class Part extends Type.makeObject<Part>(DXN.make('org.dxos.test.part', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(Annotation.LabelAnnotation.set(['name'])),
) {}

const resources = [
  {
    'en-US': {
      'org.dxos.test.note': { 'typename.label_one': 'Note', 'typename.label_other': 'Notes' },
      'org.dxos.test.board': { 'typename.label': 'Board' },
    },
  },
];

describe('buildPreview', () => {
  test('counts each named type, most numerous first, and keeps titled objects', ({ expect }) => {
    const first = Obj.make(Note, { name: 'Roadmap', description: '  Ship   publishing first. ' });
    const second = Obj.make(Note, {});
    const board = Obj.make(Board, { name: 'Onboarding' });
    const part = Obj.make(Part, { name: 'Body' });

    const preview = buildPreview({
      properties: { description: 'Team notes', icon: 'planet', hue: 'blue', iconHue: 'teal' },
      objects: [board, first, second, part],
      resources,
    });

    expect(preview).toEqual({
      description: 'Team notes',
      icon: 'ph--planet--regular',
      hue: 'teal',
      types: [
        { typename: 'org.dxos.test.note', label: 'Notes', icon: 'ph--note--regular', hue: 'amber', count: 2 },
        { typename: 'org.dxos.test.board', label: 'Board', icon: undefined, hue: undefined, count: 1 },
      ],
      objects: {
        [first.id]: {
          title: 'Roadmap',
          type: 'Note',
          icon: 'ph--note--regular',
          hue: 'amber',
          description: 'Ship publishing first.',
        },
        [board.id]: { title: 'Onboarding', type: 'Board', icon: undefined, hue: undefined },
      },
    });
  });

  test('truncates long titles', ({ expect }) => {
    const note = Obj.make(Note, { name: 'x'.repeat(200) });
    const { objects } = buildPreview({ properties: {}, objects: [note], resources });
    expect([...objects[note.id].title]).toHaveLength(120);
    expect(objects[note.id].title.endsWith('…')).toBe(true);
  });
});
