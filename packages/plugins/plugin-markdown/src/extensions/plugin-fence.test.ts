//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { type PluginFencesOptions, buildPluginFenceDecorations, findPluginFences } from './plugin-fence.ts';

const MERMAID = 'org.dxos.plugin.mermaid';

const DOC = ['# Title', '', '```mermaid', 'graph TD', '  A --> B', '```', '', '```ts', 'const x = 1;', '```', ''].join(
  '\n',
);

const options = (canEnable: boolean): PluginFencesOptions => ({
  canEnable: () => canEnable,
  onSelect: () => {},
  label: 'Open the plugin registry',
});

const widgetCount = (state: EditorState, canEnable: boolean) => {
  let count = 0;
  buildPluginFenceDecorations(state, options(canEnable)).between(0, state.doc.length, (_from, _to, decoration) => {
    if (decoration.spec.widget) {
      count++;
    }
  });
  return count;
};

describe('findPluginFences', () => {
  test('maps a fence language to its plugin', ({ expect }) => {
    const state = EditorState.create({ doc: DOC });
    const fences = findPluginFences(state);
    expect(fences).toEqual([{ from: state.doc.line(3).from, language: 'mermaid', pluginId: MERMAID }]);
  });

  test('ignores fence-like lines inside another fence', ({ expect }) => {
    const doc = ['````md', '```mermaid', 'graph TD', '```', '````', ''].join('\n');
    expect(findPluginFences(EditorState.create({ doc }))).toHaveLength(0);
  });

  test('ignores unmapped languages', ({ expect }) => {
    expect(findPluginFences(EditorState.create({ doc: '```ts\nx\n```\n' }))).toHaveLength(0);
  });
});

describe('buildPluginFenceDecorations', () => {
  test('offers the plugin while it is disabled', ({ expect }) => {
    expect(widgetCount(EditorState.create({ doc: DOC }), true)).toBe(1);
  });

  test('offers nothing once the plugin is enabled', ({ expect }) => {
    expect(widgetCount(EditorState.create({ doc: DOC }), false)).toBe(0);
  });
});
