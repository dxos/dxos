//
// Copyright 2026 DXOS.org
//

/**
 * Validates that class names resolve correctly against the Tailwind v4 design system.
 */

import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { __unstable__loadDesignSystem } from 'tailwindcss';
import { beforeAll, describe, test } from 'vitest';

const THEME_CSS_PATH = path.resolve(__dirname, '../src/theme.css');

let ds: Awaited<ReturnType<typeof __unstable__loadDesignSystem>>;

beforeAll(async () => {
  const themeCss = fs.readFileSync(THEME_CSS_PATH, 'utf-8');
  const themeBase = path.dirname(THEME_CSS_PATH);
  const req = createRequire(pathToFileURL(THEME_CSS_PATH).href);

  const loadStylesheet = async (id: string, base: string) => {
    if (id.startsWith('.') || id.startsWith('/')) {
      const resolved = path.resolve(base, id);
      return { path: resolved, base: path.dirname(resolved), content: fs.readFileSync(resolved, 'utf-8') };
    }
    const specifier = id === 'tailwindcss' ? 'tailwindcss/index.css' : id;
    const resolved = req.resolve(specifier);
    return { path: resolved, base: path.dirname(resolved), content: fs.readFileSync(resolved, 'utf-8') };
  };

  const loadModule = async (id: string, base: string, _hint: string) => {
    const resolved = id.startsWith('.') ? path.resolve(base, id) : req.resolve(id);
    const mod = await import(pathToFileURL(resolved).href);
    return { path: resolved, base: path.dirname(resolved), module: mod.default ?? mod };
  };

  ds = await __unstable__loadDesignSystem(themeCss, {
    base: themeBase,
    loadStylesheet,
    loadModule,
  } as Parameters<typeof __unstable__loadDesignSystem>[1]);
});

/** Returns true if the candidate generates valid CSS. */
const isValidClass = (candidate: string): boolean => {
  const [css] = ds.candidatesToCss([candidate]);
  return css !== null;
};

describe('tailwind classes', () => {
  test('core utilities resolve', ({ expect }) => {
    expect(isValidClass('flex')).toBe(true);
    expect(isValidClass('hidden')).toBe(true);
    expect(isValidClass('block')).toBe(true);
    expect(isValidClass('grid')).toBe(true);
  });

  test('spacing utilities resolve', ({ expect }) => {
    expect(isValidClass('p-2')).toBe(true);
    expect(isValidClass('mx-4')).toBe(true);
    expect(isValidClass('mt-auto')).toBe(true);
  });

  test('color utilities resolve', ({ expect }) => {
    expect(isValidClass('bg-red-500')).toBe(true);
    expect(isValidClass('text-blue-200')).toBe(true);
  });

  test('custom theme tokens resolve', ({ expect }) => {
    expect(isValidClass('text-subdued')).toBe(true);
  });

  test('CSS variable shorthand uses parentheses in v4', ({ expect }) => {
    expect(isValidClass('pl-(--nav-sidebar-size)')).toBe(true);
    expect(isValidClass('bg-(--surface-bg)')).toBe(true);
  });

  test('v3 bracket variable shorthand is deprecated but still resolves', ({ expect }) => {
    // Both syntaxes resolve in v4; parentheses are preferred.
    expect(isValidClass('pl-[--nav-sidebar-size]')).toBe(true);
    expect(isValidClass('bg-[--surface-bg]')).toBe(true);
  });

  test('nonsense classes do not resolve', ({ expect }) => {
    expect(isValidClass('banana-split')).toBe(false);
    expect(isValidClass('foo-bar-baz')).toBe(false);
  });

  test('variants resolve', ({ expect }) => {
    expect(isValidClass('hover:bg-red-500')).toBe(true);
    expect(isValidClass('sm:flex')).toBe(true);
    expect(isValidClass('dark:text-white')).toBe(true);
  });
});
