//
// Copyright 2026 DXOS.org
//

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, test } from 'vitest';

import { formatSymbolRef, parseRef } from '../refs';
import { type Introspector, createIntrospector } from './introspector';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(__dirname, '..', '__fixtures__');

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

describe('introspector against fixture monorepo', { timeout: 30_000 }, () => {
  // Fixture shape:
  //   @fixture/pkg-a — ECHO type definition (Schema.Struct + Type.makeObject) for Task,
  //                    plus a make() factory using Obj.make.
  //   @fixture/pkg-b — React component (TaskCard) consuming a Task via useObject,
  //                    plus a TaskCardProps interface.
  let introspector: Introspector;

  beforeAll(async () => {
    introspector = createIntrospector({ rootPath: FIXTURE_ROOT, cache: false });
    await introspector.ready;
  }, 30_000);

  test('lists fixture packages', ({ expect }) => {
    const all = introspector.listPackages();
    const names = all.map((p) => p.name).sort();
    expect(names).toEqual(['@fixture/pkg-a', '@fixture/pkg-b']);
  });

  test('filters packages by name', ({ expect }) => {
    expect(introspector.listPackages({ name: 'pkg-a' }).map((p) => p.name)).toEqual(['@fixture/pkg-a']);
  });

  test('filters by privateOnly', ({ expect }) => {
    expect(introspector.listPackages({ privateOnly: true }).map((p) => p.name)).toEqual(['@fixture/pkg-a']);
  });

  test('getPackage returns workspace and external deps', ({ expect }) => {
    const detail = introspector.getPackage('@fixture/pkg-b');
    expect(detail).not.toBeNull();
    expect(detail!.workspaceDependencies).toEqual(['@dxos/echo-react', '@fixture/pkg-a']);
    expect(detail!.externalDependencies).toEqual(['react']);
    expect(detail!.entryPoints).toEqual(['src/index.ts']);
  });

  test('getPackage returns null for unknown', ({ expect }) => {
    expect(introspector.getPackage('@fixture/missing')).toBeNull();
  });

  test('findSymbol locates the ECHO Task schema', ({ expect }) => {
    const matches = introspector.findSymbol('Task');
    const taskMatch = matches.find((m) => m.ref === '@fixture/pkg-a#Task');
    expect(taskMatch).toBeDefined();
    expect(taskMatch!.summary).toContain('Task item');
  });

  test('findSymbol locates the make factory as a function', ({ expect }) => {
    const matches = introspector.findSymbol('make');
    const make = matches.find((m) => m.ref === '@fixture/pkg-a#make');
    expect(make).toBeDefined();
    expect(make!.kind).toBe('function');
    expect(make!.summary).toContain('factory');
  });

  test('findSymbol locates the React component as a function', ({ expect }) => {
    const matches = introspector.findSymbol('TaskCard');
    const card = matches.find((m) => m.name === 'TaskCard');
    expect(card?.ref).toBe('@fixture/pkg-b#TaskCard');
    expect(card?.kind).toBe('function');
  });

  test('findSymbol locates the Props interface', ({ expect }) => {
    const matches = introspector.findSymbol('TaskCardProps');
    const props = matches.find((m) => m.name === 'TaskCardProps');
    expect(props?.kind).toBe('interface');
  });

  test('findSymbol filters by kind', ({ expect }) => {
    const interfaces = introspector.findSymbol('TaskCard', 'interface');
    expect(interfaces.every((m) => m.kind === 'interface')).toBe(true);
    expect(interfaces.some((m) => m.name === 'TaskCardProps')).toBe(true);
  });

  test('listSymbols returns every export of a package', ({ expect }) => {
    const symbols = introspector.listSymbols('@fixture/pkg-a');
    const names = symbols.map((s) => s.name).sort();
    expect(names).toContain('Task');
    expect(names).toContain('make');
    expect(symbols.every((s) => s.package === '@fixture/pkg-a')).toBe(true);
  });

  test('listSymbols filters by kind', ({ expect }) => {
    const props = introspector.listSymbols('@fixture/pkg-b', 'interface');
    expect(props.every((s) => s.kind === 'interface')).toBe(true);
    expect(props.some((s) => s.name === 'TaskCardProps')).toBe(true);
  });

  test('listSymbols returns [] for unknown package', ({ expect }) => {
    expect(introspector.listSymbols('@fixture/missing')).toEqual([]);
  });

  test('getSymbol resolves through barrels to the original file', ({ expect }) => {
    // pkg-a's entry is src/index.ts which barrels src/Task.ts.
    // ts-morph's getExportedDeclarations follows the re-export back to the original.
    const detail = introspector.getSymbol('@fixture/pkg-a#Task');
    expect(detail).not.toBeNull();
    expect(detail!.signature).toContain('Task');
    expect(detail!.location.file).toContain('pkg-a/src/Task.ts');
    expect(detail!.location.line).toBeGreaterThan(0);
    expect(detail!.summary).toContain('Task item');
    expect(detail!.source).toBeUndefined();
  });

  test('getSymbol with include=source returns Schema.Struct + annotations', ({ expect }) => {
    const detail = introspector.getSymbol('@fixture/pkg-a#Task', ['source']);
    expect(detail!.source).toContain('Schema.Struct');
    expect(detail!.source).toContain('Type.makeObject');
    expect(detail!.source).toContain('com.example.type.Task');
    // Property-level description annotation.
    expect(detail!.source).toContain("description: 'Short summary of the task.'");
    // Type-level Label annotation.
    expect(detail!.source).toContain("LabelAnnotation.set(['title'])");
  });

  test('getSymbol surfaces the class declaration of Task in source', ({ expect }) => {
    // ECHO idiom uses a class declaration:
    // `export class Task extends Type.makeObject<Task>(DXN.make(...))(Schema.Struct({...})) {}`
    const detail = introspector.getSymbol('@fixture/pkg-a#Task', ['source']);
    expect(detail!.source).toContain('export class Task');
    expect(detail!.source).toContain('Type.makeObject');
  });

  test('getSymbol on the React component captures its useObject body', ({ expect }) => {
    const detail = introspector.getSymbol('@fixture/pkg-b#TaskCard', ['source']);
    expect(detail).not.toBeNull();
    expect(detail!.source).toContain('useObject');
    expect(detail!.location.file).toContain('pkg-b/src/TaskCard/TaskCard.tsx');
  });

  test('getSymbol returns null for unknown ref', ({ expect }) => {
    expect(introspector.getSymbol('@fixture/pkg-a#nonexistent')).toBeNull();
    expect(introspector.getSymbol('@fixture/pkg-missing#thing')).toBeNull();
    expect(introspector.getSymbol('not-a-ref')).toBeNull();
  });

  test('listIdioms returns idioms catalogued in fixtures', ({ expect }) => {
    const all = introspector.listIdioms();
    const taskFactory = all.find((idiom) => idiom.slug === 'com.example.idiom.taskFactory');
    expect(taskFactory).toBeDefined();
    expect(taskFactory!.applies).toContain('Task');
    expect(taskFactory!.host.kind).toBe('symbol');
    expect(taskFactory!.host.symbol).toBe('make');
    expect(taskFactory!.host.file).toContain('pkg-a/src/Task.ts');
    expect(taskFactory!.uses).toEqual(['{@link Task}']);
  });

  test('listIdioms filters by slug substring (case-insensitive)', ({ expect }) => {
    const matches = introspector.listIdioms({ slug: 'TASKFACTORY' });
    expect(matches.map((idiom) => idiom.slug)).toContain('com.example.idiom.taskFactory');
    expect(introspector.listIdioms({ slug: 'no-such-slug' })).toEqual([]);
  });

  test('listIdioms filters by host kind', ({ expect }) => {
    const symbols = introspector.listIdioms({ hostKind: 'symbol' });
    expect(symbols.every((idiom) => idiom.host.kind === 'symbol')).toBe(true);
    expect(introspector.listIdioms({ hostKind: 'test' })).toEqual([]);
  });
});
