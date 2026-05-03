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
  // Fixture shape:
  //   @fixture/pkg-a — ECHO type definition (Schema.Struct + Type.object) for Task,
  //                    plus a make() factory using Obj.make.
  //   @fixture/pkg-b — React component (TaskCard) consuming a Task via useObject,
  //                    plus a TaskCardProps interface.
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
    const detail = intro.getPackage('@fixture/pkg-b');
    expect(detail).not.toBeNull();
    expect(detail!.workspaceDependencies).toEqual(['@dxos/echo-react', '@fixture/pkg-a']);
    expect(detail!.externalDependencies).toEqual(['react']);
    expect(detail!.entryPoints).toEqual(['src/index.tsx']);
  });

  test('getPackage returns null for unknown', ({ expect }) => {
    expect(intro.getPackage('@fixture/missing')).toBeNull();
  });

  test('findSymbol locates the ECHO Task schema', ({ expect }) => {
    const matches = intro.findSymbol('Task');
    const taskMatch = matches.find((m) => m.ref === '@fixture/pkg-a#Task');
    expect(taskMatch).toBeDefined();
    expect(taskMatch!.summary).toContain('Task item');
  });

  test('findSymbol locates the make factory as a function', ({ expect }) => {
    const matches = intro.findSymbol('make');
    const make = matches.find((m) => m.ref === '@fixture/pkg-a#make');
    expect(make).toBeDefined();
    expect(make!.kind).toBe('function');
    expect(make!.summary).toContain('factory');
  });

  test('findSymbol locates the React component as a function', ({ expect }) => {
    const matches = intro.findSymbol('TaskCard');
    const card = matches.find((m) => m.name === 'TaskCard');
    expect(card?.ref).toBe('@fixture/pkg-b#TaskCard');
    expect(card?.kind).toBe('function');
  });

  test('findSymbol locates the Props interface', ({ expect }) => {
    const matches = intro.findSymbol('TaskCardProps');
    const props = matches.find((m) => m.name === 'TaskCardProps');
    expect(props?.kind).toBe('interface');
  });

  test('findSymbol filters by kind', ({ expect }) => {
    const interfaces = intro.findSymbol('TaskCard', 'interface');
    expect(interfaces.every((m) => m.kind === 'interface')).toBe(true);
    expect(interfaces.some((m) => m.name === 'TaskCardProps')).toBe(true);
  });

  test('getSymbol returns signature, JSDoc summary, and source location for the ECHO type', ({ expect }) => {
    const detail = intro.getSymbol('@fixture/pkg-a#Task');
    expect(detail).not.toBeNull();
    expect(detail!.signature).toContain('Task');
    expect(detail!.location.file).toContain('pkg-a/src/index.ts');
    expect(detail!.location.line).toBeGreaterThan(0);
    expect(detail!.summary).toContain('Task item');
    expect(detail!.source).toBeUndefined();
  });

  test('getSymbol with include=source returns the full Schema.Struct body', ({ expect }) => {
    const detail = intro.getSymbol('@fixture/pkg-a#Task', ['source']);
    expect(detail!.source).toContain('Schema.Struct');
    expect(detail!.source).toContain('Type.object');
    expect(detail!.source).toContain('com.example.type.Task');
  });

  test('getSymbol on the React component captures its useObject body', ({ expect }) => {
    const detail = intro.getSymbol('@fixture/pkg-b#TaskCard', ['source']);
    expect(detail).not.toBeNull();
    expect(detail!.source).toContain('useObject');
  });

  test('getSymbol returns null for unknown ref', ({ expect }) => {
    expect(intro.getSymbol('@fixture/pkg-a#nonexistent')).toBeNull();
    expect(intro.getSymbol('@fixture/pkg-missing#thing')).toBeNull();
    expect(intro.getSymbol('not-a-ref')).toBeNull();
  });
});
