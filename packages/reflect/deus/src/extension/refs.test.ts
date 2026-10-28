//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { findSpecRefs, specDependencies } from './refs.ts';

const mdl = (...lines: string[]) => ['```mdl', ...lines, '```', ''].join('\n');

describe('findSpecRefs', () => {
  test('finds a reference in prose and in an mdl block', ({ expect }) => {
    const text = `See org.dxos.ui.react-ui-canvas#F-9.2 for it.\n\n${mdl('feat F-1: x', '  requires: org.dxos.ui.react-ui-canvas#F-9.2')}`;
    const refs = findSpecRefs(text);
    expect(refs.map(({ id, item }) => ({ id, item }))).toEqual([
      { id: 'org.dxos.ui.react-ui-canvas', item: 'F-9.2' },
      { id: 'org.dxos.ui.react-ui-canvas', item: 'F-9.2' },
    ]);
    expect(text.slice(refs[0].from, refs[0].to)).toBe('org.dxos.ui.react-ui-canvas#F-9.2');
  });

  test('excludes trailing sentence punctuation', ({ expect }) => {
    expect(findSpecRefs('see org.a.b#Foo.').map(({ item }) => item)).toEqual(['Foo']);
  });

  test('ignores github keys and URLs', ({ expect }) => {
    expect(findSpecRefs('github:dxos/dxos/lang/review.mdl#X and https://dxos.org#top')).toEqual([]);
  });

  test('ignores references in non-mdl fences', ({ expect }) => {
    const text = '```ts\nconst a = "org.a.b#X";\n```\n\n```\norg.a.b#Y\n```\n';
    expect(findSpecRefs(text)).toEqual([]);
  });
});

describe('specDependencies', () => {
  test('reads uses blocks and the plugin block dependsOn', ({ expect }) => {
    const text = [
      mdl(
        'plugin CanvasPlugin: A canvas.',
        '  id: org.dxos.plugin.canvas',
        '  dependsOn: [org.dxos.plugin.illustrator, org.dxos.plugin.x]',
      ),
      mdl('uses org.dxos.ui.react-ui-canvas: The engine.'),
    ].join('\n');
    const deps = specDependencies(text);
    expect(deps.map(({ id, via }) => ({ id, via }))).toEqual([
      { id: 'org.dxos.plugin.illustrator', via: 'dependsOn' },
      { id: 'org.dxos.plugin.x', via: 'dependsOn' },
      { id: 'org.dxos.ui.react-ui-canvas', via: 'uses' },
    ]);
    for (const { id, from, to } of deps) {
      expect(text.slice(from, to)).toBe(id);
    }
  });
});
