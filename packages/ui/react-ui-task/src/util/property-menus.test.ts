//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { assigneeMenuActions } from './property-menus.ts';

describe('assigneeMenuActions', () => {
  test('the picker checks one holder: an agent at work with no person is not also unassigned', ({ expect }) => {
    const items = assigneeMenuActions({
      assignee: undefined,
      delegate: { label: 'Claude Code', icon: 'ph--robot--regular' },
      members: [],
      people: [],
      onChange: () => {},
      t: (key) => key,
    });
    const checked = items.flatMap(({ id, properties }) => ('checked' in properties && properties.checked ? [id] : []));
    expect(checked).toEqual(['assignee-delegate']);
  });
});
