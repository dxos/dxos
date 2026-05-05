//
// Copyright 2026 DXOS.org
//

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, test } from 'vitest';

import { createIntrospector, type Introspector } from './introspector';
import {
  formatCapabilityRef,
  formatOperationRef,
  formatPluginRef,
  formatSchemaRef,
  formatSurfaceRef,
  formatSymbolRef,
  parseRef,
} from './refs';

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

  test('plugin/surface/capability/operation refs roundtrip', ({ expect }) => {
    expect(parseRef(formatPluginRef('org.dxos.plugin.markdown'))).toEqual({
      kind: 'plugin',
      id: 'org.dxos.plugin.markdown',
    });
    expect(parseRef(formatSurfaceRef('org.dxos.plugin.markdown', 'surface.document'))).toEqual({
      kind: 'surface',
      owner: 'org.dxos.plugin.markdown',
      id: 'surface.document',
    });
    expect(parseRef(formatCapabilityRef('Capabilities.ReactSurface', 'org.dxos.plugin.markdown'))).toEqual({
      kind: 'capability',
      key: 'Capabilities.ReactSurface',
      owner: 'org.dxos.plugin.markdown',
    });
    expect(parseRef(formatOperationRef('org.dxos.function.markdown.create'))).toEqual({
      kind: 'operation',
      key: 'org.dxos.function.markdown.create',
    });
    expect(parseRef(formatSchemaRef('org.dxos.type.document'))).toEqual({
      kind: 'schema',
      typename: 'org.dxos.type.document',
    });
  });

  test('capability ref roundtrips with scoped package owners', ({ expect }) => {
    // Regression: parseRef previously used lastIndexOf('@'), which landed inside
    // a scoped owner like '@dxos/plugin-markdown' and misattributed the scope
    // to the key. Capability keys are JS identifiers — no `@` — so splitting on
    // the first `@` always preserves the owner.
    const ref = formatCapabilityRef('Capabilities.ReactSurface', '@dxos/plugin-markdown');
    expect(ref).toBe('capability:Capabilities.ReactSurface@@dxos/plugin-markdown');
    expect(parseRef(ref)).toEqual({
      kind: 'capability',
      key: 'Capabilities.ReactSurface',
      owner: '@dxos/plugin-markdown',
    });
  });
});

describe('introspector against fixture monorepo', { timeout: 30_000 }, () => {
  // Fixture shape:
  //   @fixture/pkg-a — ECHO type definition (Schema.Struct + Type.object) for Task,
  //                    plus a make() factory using Obj.make.
  //   @fixture/pkg-b — React component (TaskCard) consuming a Task via useObject,
  //                    plus a TaskCardProps interface.
  let introspector: Introspector;

  beforeAll(async () => {
    introspector = createIntrospector({ monorepoRoot: FIXTURE_ROOT, cache: false });
    await introspector.ready;
  });

  test('lists fixture packages', ({ expect }) => {
    const all = introspector.listPackages();
    const names = all.map((p) => p.name).sort();
    expect(names).toEqual(['@fixture/pkg-a', '@fixture/pkg-b', '@fixture/pkg-plugin']);
  });

  test('filters packages by name', ({ expect }) => {
    expect(introspector.listPackages({ name: 'pkg-a' }).map((p) => p.name)).toEqual(['@fixture/pkg-a']);
  });

  test('filters by privateOnly', ({ expect }) => {
    expect(
      introspector
        .listPackages({ privateOnly: true })
        .map((p) => p.name)
        .sort(),
    ).toEqual(['@fixture/pkg-a', '@fixture/pkg-plugin']);
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
    expect(detail!.source).toContain('Type.object');
    expect(detail!.source).toContain('com.example.type.Task');
    // Property-level description annotation.
    expect(detail!.source).toContain("description: 'Short summary of the task.'");
    // Type-level Label annotation.
    expect(detail!.source).toContain("LabelAnnotation.set(['title'])");
  });

  test('getSymbol surfaces both merged declarations of Task in source', ({ expect }) => {
    // ECHO idiom: `export const Task = Schema.Struct(...)` AND
    // `export interface Task extends Schema.Schema.Type<typeof Task> {}` — both
    // declarations share a name, and the indexer concatenates their source so
    // consumers see the full pattern rather than only the value form.
    const detail = introspector.getSymbol('@fixture/pkg-a#Task', ['source']);
    expect(detail!.source).toContain('export const Task');
    expect(detail!.source).toContain('export interface Task extends Schema.Schema.Type<typeof Task>');
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

  // ----- Plugin / surface / capability / operation extraction (steps 4–5) -----

  test('listPlugins detects the fixture plugin from meta + Plugin.define', ({ expect }) => {
    const plugins = introspector.listPlugins();
    const fixture = plugins.find((p) => p.id === 'com.example.plugin.fixture');
    expect(fixture).toBeDefined();
    expect(fixture!.name).toBe('Fixture Plugin');
    expect(fixture!.package).toBe('@fixture/pkg-plugin');
    expect(fixture!.entryFile).toContain('pkg-plugin/src/FixturePlugin.ts');
    expect(fixture!.ref).toBe('plugin:com.example.plugin.fixture');
  });

  test('listPlugins ignores packages without Plugin.define (pkg-a is just an ECHO type)', ({ expect }) => {
    const plugins = introspector.listPlugins();
    expect(plugins.some((p) => p.package === '@fixture/pkg-a')).toBe(false);
    expect(plugins.some((p) => p.package === '@fixture/pkg-b')).toBe(false);
  });

  test('listPlugins query filter matches against id, name, and package', ({ expect }) => {
    expect(introspector.listPlugins({ query: 'fixture' }).map((p) => p.id)).toEqual(['com.example.plugin.fixture']);
    expect(introspector.listPlugins({ query: 'PKG-PLUGIN' }).map((p) => p.id)).toEqual(['com.example.plugin.fixture']);
    expect(introspector.listPlugins({ query: 'noplugin' })).toEqual([]);
  });

  test('getPlugin returns full detail with modules, surfaces, capabilities, operations', ({ expect }) => {
    const detail = introspector.getPlugin('com.example.plugin.fixture');
    expect(detail).not.toBeNull();
    expect(detail!.id).toBe('com.example.plugin.fixture');

    // Modules — pulled from the .pipe(...) chain. We expect entries for at least
    // the addOperationHandlerModule, addSurfaceModule, and addModule helpers.
    const helpers = detail!.modules.map((m) => m.helper).sort();
    expect(helpers).toContain('addOperationHandlerModule');
    expect(helpers).toContain('addSurfaceModule');
    expect(helpers).toContain('addModule');

    // Surfaces — both Surface.create calls land in the detail.
    const surfaceIds = detail!.surfaces.map((s) => s.id).sort();
    expect(surfaceIds).toEqual(['surface.fixture-article', 'surface.fixture-card']);
    const card = detail!.surfaces.find((s) => s.id === 'surface.fixture-card');
    expect(card!.roles).toEqual(['card']);
    expect(card!.pluginId).toBe('com.example.plugin.fixture');
    expect(card!.ref).toBe('surface:com.example.plugin.fixture:surface.fixture-card');
    const article = detail!.surfaces.find((s) => s.id === 'surface.fixture-article');
    expect(article!.roles).toEqual(['article', 'section']);

    // Capabilities — readable as the source-text key (e.g. Capabilities.ReactSurface).
    const keys = detail!.capabilities.map((c) => c.key).sort();
    expect(keys).toContain('Capabilities.ReactSurface');
    expect(keys).toContain('Capabilities.OperationHandler');
    const reactSurface = detail!.capabilities.find((c) => c.key === 'Capabilities.ReactSurface');
    expect(reactSurface!.pluginId).toBe('com.example.plugin.fixture');

    // Operations — both definitions surface with their meta intact.
    const opKeys = detail!.operations.map((o) => o.key).sort();
    expect(opKeys).toEqual(['com.example.fixture.close', 'com.example.fixture.open']);
    const open = detail!.operations.find((o) => o.key === 'com.example.fixture.open');
    expect(open!.name).toBe('Open Fixture');
    expect(open!.description).toBe('Opens a fixture document.');
    expect(open!.pluginId).toBe('com.example.plugin.fixture');
    expect(open!.ref).toBe('operation:com.example.fixture.open');

    // Meta extras flow through (icon/iconHue/etc).
    expect(detail!.meta.icon).toBe('ph--cube--regular');
    expect(detail!.meta.iconHue).toBe('amber');
  });

  test('getPlugin returns null for unknown id', ({ expect }) => {
    expect(introspector.getPlugin('com.example.plugin.missing')).toBeNull();
  });

  test('listSurfaces aggregates across all plugins and supports pluginId filter', ({ expect }) => {
    const all = introspector.listSurfaces();
    expect(all.map((s) => s.id).sort()).toEqual(['surface.fixture-article', 'surface.fixture-card']);

    const filtered = introspector.listSurfaces('com.example.plugin.fixture');
    expect(filtered.map((s) => s.id).sort()).toEqual(['surface.fixture-article', 'surface.fixture-card']);

    expect(introspector.listSurfaces('com.example.plugin.missing')).toEqual([]);
  });

  test('listCapabilities aggregates across all plugins', ({ expect }) => {
    const keys = introspector
      .listCapabilities()
      .map((c) => c.key)
      .sort();
    expect(keys).toContain('Capabilities.ReactSurface');
    expect(keys).toContain('Capabilities.OperationHandler');
  });

  test('listOperations aggregates across all plugins', ({ expect }) => {
    const keys = introspector
      .listOperations()
      .map((o) => o.key)
      .sort();
    expect(keys).toEqual(['com.example.fixture.close', 'com.example.fixture.open']);
  });

  // ----- Schema extraction (step 6) -----

  test('listSchemas detects every ECHO-registered fixture schema', ({ expect }) => {
    const schemas = introspector.listSchemas();
    const typenames = schemas.map((s) => s.typename).sort();
    expect(typenames).toContain('com.example.type.Task');
    expect(typenames).toContain('com.example.type.Note');
  });

  test('listSchemas filters by package', ({ expect }) => {
    const taskOnly = introspector.listSchemas('@fixture/pkg-a');
    expect(taskOnly.map((s) => s.typename)).toEqual(['com.example.type.Task']);

    const noteOnly = introspector.listSchemas('@fixture/pkg-plugin');
    expect(noteOnly.map((s) => s.typename)).toEqual(['com.example.type.Note']);

    expect(introspector.listSchemas('@fixture/missing')).toEqual([]);
  });

  test('listSchemas summary captures version, package, name, and field count', ({ expect }) => {
    const all = introspector.listSchemas();
    const note = all.find((s) => s.typename === 'com.example.type.Note');
    expect(note).toBeDefined();
    expect(note!.version).toBe('0.2.0');
    expect(note!.package).toBe('@fixture/pkg-plugin');
    expect(note!.name).toBe('Note');
    expect(note!.fieldCount).toBe(3);
    expect(note!.ref).toBe('schema:com.example.type.Note');
  });

  test('getSchema returns full field detail for Task', ({ expect }) => {
    const detail = introspector.getSchema('com.example.type.Task');
    expect(detail).not.toBeNull();
    expect(detail!.typename).toBe('com.example.type.Task');
    expect(detail!.version).toBe('0.1.0');
    expect(detail!.name).toBe('Task');
    expect(detail!.package).toBe('@fixture/pkg-a');
    const fieldNames = detail!.fields.map((f) => f.name).sort();
    expect(fieldNames).toEqual(['description', 'done', 'title']);

    const description = detail!.fields.find((f) => f.name === 'description');
    expect(description!.optional).toBe(true);
    expect(description!.type).toContain('Schema.optional');

    const done = detail!.fields.find((f) => f.name === 'done');
    expect(done!.optional).toBe(false);
    expect(done!.type).toContain('Schema.Boolean');
  });

  test('getSchema returns null for unknown typename', ({ expect }) => {
    expect(introspector.getSchema('com.example.type.missing')).toBeNull();
  });

  test('findSchemaUsage finds cross-package references via typename string', ({ expect }) => {
    // Note's `relatedTo` field carries the Task typename in a JSDoc/annotation
    // string. The textual scan should pick that up while excluding Task's
    // *defining* line (the Type.object call).
    const usages = introspector.findSchemaUsage('com.example.type.Task');
    expect(usages.length).toBeGreaterThan(0);

    // At least one usage from pkg-plugin (the cross-package reference).
    expect(usages.some((u) => u.package === '@fixture/pkg-plugin')).toBe(true);

    // The defining `Type.object` line in pkg-a/src/Task.ts must be filtered out.
    expect(usages.every((u) => !u.snippet.includes('Type.object'))).toBe(true);
  });

  test('findSchemaUsage returns [] for unknown typename', ({ expect }) => {
    expect(introspector.findSchemaUsage('com.example.type.missing')).toEqual([]);
  });

  test('findSchemaUsage scans non-schema-defining packages too', ({ expect }) => {
    // Regression: an earlier draft reused the schema *extractor's* candidate-
    // file set (only files containing `Type.object`/`Type.Obj`) as the search
    // space for usage scans. That dropped every package that referenced a
    // typename without defining its own schema.
    //
    // pkg-b has no `Type.object` calls — it's a React component package — so
    // its files were skipped entirely. Adding a typename mention to its
    // JSDoc proves the broader `usageScanFiles` set walks every src file.
    const usages = introspector.findSchemaUsage('com.example.type.Task');
    expect(usages.some((u) => u.package === '@fixture/pkg-b')).toBe(true);
  });
});
