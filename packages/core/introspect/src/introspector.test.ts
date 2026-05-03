//
// Copyright 2026 DXOS.org
//

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, test } from 'vitest';

import { createIntrospector, type Introspector } from './introspector';
import { formatSymbolRef, parseRef } from './refs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(__dirname, '__fixtures__');

describe('refs', () => {
  test('roundtrip', ({ expect }) => {
    const ref = formatSymbolRef('@dxos/echo-schema', 'Expando');
    expect(parseRef(ref)).toEqual({ kind: 'symbol', package: '@dxos/echo-schema', name: 'Expando' });
  });

  test('rejects malformed', ({ expect }) => {
    expect(() => parseRef('no-hash')).toThrow();
    expect(() => parseRef('#name')).toThrow();
    expect(() => parseRef('pkg#')).toThrow();
  });
});

describe('introspector against fixture monorepo', () => {
  let intro: Introspector;

  beforeAll(async () => {
    intro = createIntrospector({ monorepoRoot: FIXTURE_ROOT });
    await intro.ready;
  });

  test('lists fixture packages', ({ expect }) => {
    const all = intro.listPackages();
    const names = all.map((p) => p.name).sort();
    expect(names).toEqual(['@fixture/pkg-a', '@fixture/pkg-b']);
  });

  test('filters packages by name', ({ expect }) => {
    expect(intro.listPackages({ name: 'pkg-a' }).map((p) => p.name)).toEqual(['@fixture/pkg-a']);
  });

  test('filters by privateOnly', ({ expect }) => {
    expect(intro.listPackages({ privateOnly: true }).map((p) => p.name)).toEqual(['@fixture/pkg-a']);
  });

  test('getPackage returns workspace and external deps', ({ expect }) => {
    const detail = intro.getPackage('@fixture/pkg-a');
    expect(detail).not.toBeNull();
    expect(detail!.workspaceDependencies).toEqual(['@fixture/pkg-b']);
    expect(detail!.externalDependencies).toEqual(['left-pad']);
    expect(detail!.entryPoints).toEqual(['src/index.ts']);
  });

  test('getPackage returns null for unknown', ({ expect }) => {
    expect(intro.getPackage('@fixture/missing')).toBeNull();
  });

  test('findSymbol locates exports across packages', ({ expect }) => {
    const matches = intro.findSymbol('add');
    expect(matches.find((m) => m.name === 'add')).toMatchObject({
      ref: '@fixture/pkg-a#add',
      kind: 'function',
    });
  });

  test('findSymbol filters by kind', ({ expect }) => {
    const types = intro.findSymbol('Status', 'type');
    expect(types.some((m) => m.name === 'Status' && m.kind === 'type')).toBe(true);
  });

  test('findSymbol classifies arrow-function variables as functions', ({ expect }) => {
    const matches = intro.findSymbol('add');
    const add = matches.find((m) => m.name === 'add');
    expect(add?.kind).toBe('function');
  });

  test('findSymbol classifies plain string variables as variables', ({ expect }) => {
    const matches = intro.findSymbol('greeting');
    const greeting = matches.find((m) => m.name === 'greeting');
    expect(greeting?.kind).toBe('variable');
  });

  test('findSymbol classifies classes', ({ expect }) => {
    const matches = intro.findSymbol('Counter');
    expect(matches.find((m) => m.name === 'Counter')?.kind).toBe('class');
  });

  test('findSymbol classifies interfaces', ({ expect }) => {
    const matches = intro.findSymbol('UserOptions');
    expect(matches.find((m) => m.name === 'UserOptions')?.kind).toBe('interface');
  });

  test('getSymbol returns signature and location', ({ expect }) => {
    const detail = intro.getSymbol('@fixture/pkg-a#add');
    expect(detail).not.toBeNull();
    expect(detail!.kind).toBe('function');
    expect(detail!.signature).toContain('add');
    expect(detail!.location.file).toContain('pkg-a/src/index.ts');
    expect(detail!.location.line).toBeGreaterThan(0);
    expect(detail!.summary).toBe('Adds two numbers together.');
    expect(detail!.source).toBeUndefined();
  });

  test('getSymbol with include=source returns full text', ({ expect }) => {
    const detail = intro.getSymbol('@fixture/pkg-a#Counter', ['source']);
    expect(detail!.source).toContain('class Counter');
  });

  test('getSymbol returns null for unknown ref', ({ expect }) => {
    expect(intro.getSymbol('@fixture/pkg-a#nonexistent')).toBeNull();
    expect(intro.getSymbol('@fixture/pkg-missing#thing')).toBeNull();
    expect(intro.getSymbol('not-a-ref')).toBeNull();
  });
});
