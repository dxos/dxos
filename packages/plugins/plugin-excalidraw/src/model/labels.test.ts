//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ContentMap, Mermaid } from '@dxos/plugin-illustrator/model';

import { applyCommands } from './builder';

const FLOWCHART = 'flowchart TB\n  A[Alpha]\n  B[Beta]\n  A --> B\n';

describe('excalidraw labels', () => {
  test('emits a text companion for every labelled box', ({ expect }) => {
    const content: ContentMap = {};
    applyCommands(content, Mermaid.compile(FLOWCHART));

    const records = Object.values(content);
    const text = records.filter((record) => record.type === 'text');
    expect(text.map((record) => record.text).sort()).toEqual(['Alpha', 'Beta']);
    // Labels are companions of their box, not standalone elements.
    expect(text.every((record) => record.customData?.part === 'label')).toBe(true);
  });
});
