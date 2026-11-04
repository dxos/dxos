//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { type ProjectCapabilities } from '#types';

import { mergeGroups } from './ConfigSection.tsx';

const field = (key: string, order?: number): ProjectCapabilities.ConfigField => ({
  key,
  schema: Schema.String,
  value: () =>
    Atom.writable(
      () => '',
      () => {},
    ),
  order,
});

describe('mergeGroups', () => {
  test('one id merges into one group, its fields sorted by order and equal orders kept in contribution order', ({
    expect,
  }) => {
    const groups = mergeGroups([
      { id: 'software', label: 'Software', order: 10, fields: [field('folder', 1), field('notes', 1)] },
      { id: 'agent', label: 'Agent', fields: [field('instructions')] },
      { id: 'software', label: 'Software', order: 10, fields: [field('repositories')] },
    ]);

    expect(groups.map(({ id }) => id)).toEqual(['agent', 'software']);
    expect(groups[1].fields.map(({ key }) => key)).toEqual(['repositories', 'folder', 'notes']);
  });
});
