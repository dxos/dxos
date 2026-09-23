//
// Copyright 2026 DXOS.org
//

import { RuleTester } from 'eslint';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, it } from 'vitest';

import rule, { normalizeStem } from '../rules/no-similar-sibling-files.js';

// The rule reads the linted file's directory, so the siblings must exist on disk; a temp dir keeps them out of the repo lint.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'no-similar-sibling-files-'));
const makeDir = (name: string, files: string[]) => {
  const dir = path.join(root, name);
  fs.mkdirSync(dir);
  for (const file of files) {
    fs.writeFileSync(path.join(dir, file), '');
  }
  return dir;
};

const clean = makeDir('clean', ['Space.ts', 'Space.test.ts', 'Space.stories.tsx', 'Spaceship.ts', 'Spaces.md']);
const plural = makeDir('plural', ['Space.ts', 'Spaces.ts', 'Capability.ts', 'Capabilities.tsx']);
const casing = makeDir('casing', ['IconRegistry.ts', 'icon-registry.ts', 'Branch.ts', 'branch.ts']);

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: await import('@typescript-eslint/parser'),
  },
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('no-similar-sibling-files', () => {
  it('normalizes case, separators and plurals', ({ expect }) => {
    expect(normalizeStem('Spaces')).toBe('space');
    expect(normalizeStem('SpaceCapabilities')).toBe('spacecapability');
    expect(normalizeStem('icon-registry')).toBe('iconregistry');
    expect(normalizeStem('Boxes')).toBe('box');
    expect(normalizeStem('Class')).toBe('class');
  });

  it('accepts distinct names and same-module variants', () => {
    ruleTester.run('no-similar-sibling-files', rule, {
      valid: [
        { filename: path.join(clean, 'Space.ts'), code: 'export {};' },
        { filename: path.join(clean, 'Space.test.ts'), code: 'export {};' },
        { filename: path.join(clean, 'Spaceship.ts'), code: 'export {};' },
        // Exempted by path suffix.
        { filename: path.join(plural, 'Space.ts'), code: 'export {};', options: [{ allow: ['plural/Space.ts'] }] },
      ],
      invalid: [],
    });
  });

  it('rejects plural, case and separator variants', () => {
    ruleTester.run('no-similar-sibling-files', rule, {
      valid: [],
      invalid: [
        { filename: path.join(plural, 'Space.ts'), code: 'export {};', errors: [{ messageId: 'similarSibling' }] },
        { filename: path.join(plural, 'Spaces.ts'), code: 'export {};', errors: [{ messageId: 'similarSibling' }] },
        {
          filename: path.join(plural, 'Capability.ts'),
          code: 'export {};',
          errors: [{ messageId: 'similarSibling' }],
        },
        {
          filename: path.join(casing, 'icon-registry.ts'),
          code: 'export {};',
          errors: [{ messageId: 'similarSibling' }],
        },
        { filename: path.join(casing, 'branch.ts'), code: 'export {};', errors: [{ messageId: 'similarSibling' }] },
      ],
    });
  });
});
