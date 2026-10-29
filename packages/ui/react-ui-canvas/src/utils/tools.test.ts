//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { defaultLinkRegistry, defaultNodeRegistry } from '../components/index.ts';
import { CREATE_GROUP, TOOLS_GROUP, pressSelects, toolGroups } from './tools.ts';

describe('toolGroups', () => {
  test('the link tools sit with the shapes, in the create group, after the fixed tools', () => {
    const groups = toolGroups(defaultNodeRegistry, defaultLinkRegistry, {
      create: true,
      link: true,
      update: true,
      delete: true,
    });
    expect(groups[0].name).toBe(TOOLS_GROUP);
    const create = groups.find((group) => group.name === CREATE_GROUP);
    expect(create?.entries.some((entry) => entry.tool.kind === 'node')).toBe(true);
    expect(create?.entries.at(-1)?.tool.kind).toBe('link');
    expect(groups.filter((group) => group.entries.some((entry) => entry.tool.kind === 'link'))).toHaveLength(1);
  });

  test('a press on an element selects it with Select and with a create tool; the hand only moves the view', () => {
    expect(pressSelects({ kind: 'select' })).toBe(true);
    expect(pressSelects({ kind: 'node', type: 'rect' })).toBe(true);
    expect(pressSelects({ kind: 'hand' })).toBe(false);
  });
});
