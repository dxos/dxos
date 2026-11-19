//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { declarationsOf } from './declarations.ts';
import {
  BASE_DIALECTS,
  DIALECTS,
  SOFTWARE_DIALECT,
  dialectTexts,
  extendsOf,
  fileDialects,
  resolveDialects,
  withDialects,
} from './dialects.ts';

describe('dialectTexts', () => {
  test('a dialect comes after the dialects it extends, each once', ({ expect }) => {
    const known = new Map([
      ['a', '---\nid: a\n---\n'],
      ['b', '---\nid: b\nextends:\n  - a\n---\n'],
      ['c', '---\nid: c\nextends:\n  - a\n  - b\n---\n'],
    ]);
    expect(dialectTexts(['c', 'missing'], known).map((text) => extendsOf(text).length)).toEqual([0, 1, 2]);
  });

  test('reads extends as a list or inline, without versions', ({ expect }) => {
    expect(extendsOf('---\nid: x\nextends:\n  - a@1.0\n  - b\n---\n')).toEqual(['a', 'b']);
    expect(extendsOf('---\nid: x\nextends: [a@0.1.0, b]\n---\n')).toEqual(['a', 'b']);
    expect(extendsOf('---\nid: x\nextends: a\n---\n')).toEqual(['a']);
  });

  test('every bundled dialect is found by its id', ({ expect }) => {
    expect(dialectTexts([...DIALECTS.keys()])).toHaveLength(DIALECTS.size);
    expect(declarationsOf(dialectTexts(['org.dxos.spec.video'])).get('shot')).toEqual({
      role: 'structure',
      links: { assets: 'aggregates', scene: 'part-of' },
      icon: 'ph--video-camera--regular',
      hue: 'blue',
    });
  });
});

describe('fileDialects', () => {
  test('a file is read with the dialects its frontmatter extends', ({ expect }) => {
    expect(fileDialects('---\nextends: [org.dxos.spec.video@1.0]\n---\n# Launch\n')).toEqual(['org.dxos.spec.video']);
    expect(fileDialects('---\nextends: [org.dxos.spec.video] \n---\n# Launch\n')).toEqual(['org.dxos.spec.video']);
    expect(fileDialects('---\nextends: [org.dxos.spec.video] # video\n---\n')).toEqual(['org.dxos.spec.video']);
    expect(fileDialects('---\nextends: # dialects\n  - org.dxos.spec.video # video\n---\n')).toEqual([
      'org.dxos.spec.video',
    ]);
  });

  test('a file that extends no dialect is read as software, whatever specs it extends', ({ expect }) => {
    expect(fileDialects('# Notes\n')).toEqual([SOFTWARE_DIALECT]);
    expect(fileDialects('---\nid: com.example.notes\n---\n# Notes\n')).toEqual([SOFTWARE_DIALECT]);
    expect(fileDialects('---\nextends: [dxos.plugin.chess@0.1.0]\n---\n# Chess\n')).toEqual([SOFTWARE_DIALECT]);
  });
});

describe('resolveDialects', () => {
  test('a spec is read with the known dialects it names, else the base ones', ({ expect }) => {
    expect(resolveDialects(['org.dxos.spec.software'])).toEqual(['org.dxos.spec.software']);
    expect(resolveDialects(['dxos.plugin.chess', 'org.dxos.spec.video'])).toEqual(['org.dxos.spec.video']);
    expect(resolveDialects([])).toEqual(BASE_DIALECTS);
    expect(resolveDialects(['dxos.plugin.chess'])).toEqual(BASE_DIALECTS);
  });
});

describe('withDialects', () => {
  test('adds or removes dialects, and removing the last leaves the base ones, since an empty list is unset', ({
    expect,
  }) => {
    expect(withDialects([], ['org.dxos.spec.video'], true)).toEqual(['org.dxos.spec.video']);
    expect(withDialects(['org.dxos.spec.video'], ['org.dxos.spec.video'], true)).toEqual(['org.dxos.spec.video']);
    expect(withDialects(['org.dxos.spec.qa', 'org.dxos.spec.video'], ['org.dxos.spec.video'], false)).toEqual([
      'org.dxos.spec.qa',
    ]);
    expect(withDialects(['org.dxos.spec.video'], ['org.dxos.spec.video'], false)).toEqual(BASE_DIALECTS);
  });
});
