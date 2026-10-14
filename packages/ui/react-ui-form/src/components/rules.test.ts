//
// Copyright 2026 DXOS.org
//

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';

const ROOT = import.meta.dirname;

// CodeMirror decorations are DOM built outside React, so their classes are not a view-layer layout.
const EXEMPT = new Set(['ref-editor-extension.ts', 'useRefEditor.ts']);

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : /\.tsx?$/.test(entry.name) && entry.name !== 'rules.test.ts' && !EXEMPT.has(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );

// AUDIT §3.3: a layout that needs a class belongs in a Next primitive, so the view layer carries none.
const FORBIDDEN = [
  { rule: 'className', pattern: /\bclassNames?\b/ },
  { rule: 'tv recipe', pattern: /\btv\(|from 'tailwind-variants'/ },
  { rule: 'wrapper div', pattern: /<div\b/ },
];

describe('src/next rules', () => {
  test('no className, classNames, tv recipe or div', () => {
    const violations = sources(ROOT).flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          FORBIDDEN.filter(({ pattern }) => pattern.test(line)).map(
            ({ rule }) => `${relative(ROOT, file)}:${index + 1} ${rule}`,
          ),
        ),
    );
    expect(violations).toEqual([]);
  });
});
