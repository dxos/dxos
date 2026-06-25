//
// Copyright 2026 DXOS.org
//

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  type ArrayLiteralExpression,
  type CallExpression,
  type Identifier,
  type ObjectLiteralExpression,
  Project,
  ScriptTarget,
  type SourceFile,
  SyntaxKind,
} from 'ts-morph';

import type { Capability, Operation, Plugin, PluginId, Schema, SourceLocation, Surface } from '../types';

// stderr-only — stdout is reserved for the MCP JSON-RPC stream.
const warn = (msg: string, err?: unknown): void => {
  console.error(err ? `[introspect plugins] ${msg}: ${String(err)}` : `[introspect plugins] ${msg}`);
};

export type PluginRecord = {
  plugin: Plugin;
  surfaces: Surface[];
  capabilities: Capability[];
  operations: Operation[];
  schemas: Schema[];
};

type PackageLike = {
  name: string;
  path: string;
  /**
   * Other workspace packages this package depends on (`workspace:*` deps from
   * package.json). Used to derive plugin-to-plugin dependency edges: if pkg A
   * depends on pkg B and both are plugins, plugin A `dependsOn` plugin B.
   */
  workspaceDependencies?: readonly string[];
};

/**
 * Discover plugins among the monorepo's packages and statically extract their
 * surfaces, capabilities, operations, and schemas.
 *
 * A "plugin" is any package containing a top-level `meta` export whose value
 * is annotated as `Plugin.Meta` and whose object literal carries a `string`
 * `id` property. Extraction is best-effort: dynamic / computed contributions
 * fall through and produce no records rather than throwing.
 */
export const extractPlugins = (rootPath: string, packages: readonly PackageLike[]): PluginRecord[] => {
  const records: PluginRecord[] = [];
  for (const pkg of packages) {
    const record = tryExtract(rootPath, pkg);
    if (record) {
      records.push(record);
    }
  }

  // Resolve `dependsOn`: for each plugin, intersect its package's workspace
  // dependencies with the set of packages that are themselves plugins. This
  // is purely package-level — it doesn't infer dependencies from consumed
  // capability slots, only from declared workspace deps in package.json.
  // Stable order: sorted by plugin id so output is deterministic across runs.
  const pluginIdByPackage = new Map<string, PluginId>();
  for (const record of records) {
    pluginIdByPackage.set(record.plugin.package, record.plugin.id);
  }
  const packageByName = new Map<string, PackageLike>(packages.map((pkg) => [pkg.name, pkg]));
  for (const record of records) {
    const pkg = packageByName.get(record.plugin.package);
    const deps = pkg?.workspaceDependencies ?? [];
    // Use a Set so duplicate dep entries (defensive — `discoverPackages`
    // already dedupes via Object.entries) can't produce duplicate edges.
    const dependsOnSet = new Set<PluginId>();
    for (const depName of deps) {
      const depPluginId = pluginIdByPackage.get(depName);
      if (depPluginId && depPluginId !== record.plugin.id) {
        dependsOnSet.add(depPluginId);
      }
    }
    const dependsOn = [...dependsOnSet].sort();
    // `Plugin.dependsOn` is `readonly` in the schema-derived type — replace
    // the plugin object instead of mutating it in place.
    record.plugin = { ...record.plugin, dependsOn };
  }

  return records;
};

const tryExtract = (rootPath: string, pkg: PackageLike): PluginRecord | null => {
  const metaPath = join(rootPath, pkg.path, 'src', 'meta.ts');
  if (!existsSync(metaPath)) {
    return null;
  }

  const project = new Project({
    useInMemoryFileSystem: false,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: { target: ScriptTarget.ESNext, allowJs: false, jsx: 4 /* Preserve */ },
  });

  let metaSource: SourceFile;
  try {
    metaSource = project.addSourceFileAtPath(metaPath);
  } catch (err) {
    warn(`failed to read ${metaPath}`, err);
    return null;
  }

  // Inline `Plugin.makeMeta({...})` / bare object literal, else resolve the metadata from the package's
  // `dx.config.ts` (the `Plugin.getMetaFromConfig(config)` form most plugins now use).
  const meta = readPluginMeta(metaSource, pkg) ?? readPluginMetaFromConfig(rootPath, pkg, project);
  if (!meta) {
    return null;
  }

  // Walk every .ts/.tsx file under src/ — capabilities and surfaces typically
  // live in a `capabilities/` directory, schemas in the main plugin file, etc.
  const srcDir = join(rootPath, pkg.path, 'src');
  let allFiles: SourceFile[];
  try {
    project.addSourceFilesAtPaths([
      `${srcDir}/**/*.ts`,
      `${srcDir}/**/*.tsx`,
      `!${srcDir}/**/*.test.ts`,
      `!${srcDir}/**/*.test.tsx`,
      `!${srcDir}/**/*.stories.tsx`,
    ]);
    allFiles = project.getSourceFiles();
  } catch (err) {
    warn(`failed to load source files for ${pkg.name}`, err);
    allFiles = [metaSource];
  }

  const surfaces: Surface[] = [];
  const capabilities: Capability[] = [];
  const operations: Operation[] = [];
  const schemas: Schema[] = [];

  for (const sourceFile of allFiles) {
    extractFromFile(sourceFile, rootPath, meta.id, { surfaces, capabilities, operations, schemas });
  }

  // Plugins commonly ship multiple entrypoint variants (e.g.
  // `FooPlugin.node.ts` + `FooPlugin.tsx` + `cli/plugin.ts`) that each call
  // `addSchemaModule({ schema: [...] })` with the same set of types. Each
  // `addSchemaModule` call produces a separate Schema record, so the same
  // (pluginId, name) ends up duplicated 2-3x. Dedupe — keep first occurrence
  // so the surfaced location is deterministic (first source file walked).
  // Capabilities and operations are intentionally NOT deduped: their `type`
  // field is the slot name (e.g. `Capabilities.OperationHandler`), and
  // multiple `Capability.contributes` calls to the same slot represent
  // genuinely distinct contributions.
  const dedupedSchemas = dedupeBy(schemas, (s) => `${s.pluginId}|${s.name}`);

  return {
    plugin: meta,
    surfaces,
    capabilities,
    operations,
    schemas: dedupedSchemas,
  };
};

const dedupeBy = <T>(items: T[], keyFn: (item: T) => string): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  return out;
};

/**
 * Extracts the NSID (first string argument) from a `DXN.make('<nsid>'[, '<version>'])`
 * property value — e.g. the `key` field of a plugin `Meta`.
 */
const readDxnName = (obj: ObjectLiteralExpression, name: string): string | undefined => {
  const prop = obj.getProperty(name);
  if (!prop || prop.getKind() !== SyntaxKind.PropertyAssignment) {
    return undefined;
  }
  const init = prop.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializer();
  if (!init || init.getKind() !== SyntaxKind.CallExpression) {
    return undefined;
  }
  const call = init.asKindOrThrow(SyntaxKind.CallExpression);
  if (!call.getExpression().getText().endsWith('DXN.make')) {
    return undefined;
  }
  const first = call.getArguments()[0];
  return first?.getKind() === SyntaxKind.StringLiteral
    ? first.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue()
    : undefined;
};

const readPluginMeta = (file: SourceFile, pkg: PackageLike): Plugin | null => {
  // Match `export const meta = Plugin.makeMeta({ ... })` (or a legacy bare object literal).
  const metaDecl = file.getVariableDeclaration('meta');
  if (!metaDecl) {
    return null;
  }
  // The initializer is either the options object literal directly (legacy) or a
  // `Plugin.makeMeta({...})` call whose first argument is that object literal.
  let initializer = metaDecl.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
  if (!initializer) {
    const call = metaDecl.getInitializerIfKind(SyntaxKind.CallExpression);
    const arg = call?.getExpression().getText().endsWith('makeMeta') ? call.getArguments()[0] : undefined;
    if (arg?.getKind() === SyntaxKind.ObjectLiteralExpression) {
      initializer = arg.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    }
  }
  if (!initializer) {
    return null;
  }

  // Identity is the bare NSID of the `key` DXN; fall back to a legacy plain-string `id`.
  const id = readDxnName(initializer, 'key') ?? readStringProperty(initializer, 'id');
  if (!id) {
    return null;
  }

  return {
    id,
    package: pkg.name,
    name: readStringProperty(initializer, 'name'),
    description: readStringProperty(initializer, 'description'),
    // `icon` is an object literal (`{ key, hue }`); fall back to a legacy bare-string icon.
    icon: readNestedStringProperty(initializer, 'icon', 'key') ?? readStringProperty(initializer, 'icon'),
    iconHue: readNestedStringProperty(initializer, 'icon', 'hue') ?? readStringProperty(initializer, 'iconHue'),
    tags: readStringArrayProperty(initializer, 'tags'),
    // Filled in by `extractPlugins` once every plugin's package mapping is
    // known — left empty here to keep the per-package walk independent.
    dependsOn: [],
    metaLocation: locationOf(file, metaDecl.getStart()),
  };
};

/**
 * Resolve plugin metadata from a package's `dx.config.ts` for the
 * `export const meta = Plugin.getMetaFromConfig(config)` form, where `config` is the default export
 * `Config2.make({ plugin: { key, name, ... } })`. The config `key` is the bare NSID string (the runtime
 * wraps it in `DXN.make`), and `icon` is an object literal (`{ key, hue }`).
 */
const readPluginMetaFromConfig = (rootPath: string, pkg: PackageLike, project: Project): Plugin | null => {
  const configPath = join(rootPath, pkg.path, 'dx.config.ts');
  if (!existsSync(configPath)) {
    return null;
  }

  let configSource: SourceFile;
  try {
    configSource = project.addSourceFileAtPath(configPath);
  } catch (err) {
    warn(`failed to read ${configPath}`, err);
    return null;
  }

  const exportAssignment = configSource.getExportAssignment((decl) => !decl.isExportEquals());
  const makeCall = exportAssignment?.getExpressionIfKind(SyntaxKind.CallExpression);
  const configArg = makeCall?.getArguments()[0];
  if (!configArg || configArg.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    return null;
  }

  const pluginObj = (configArg as ObjectLiteralExpression)
    .getProperty('plugin')
    ?.asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
  if (!pluginObj) {
    return null;
  }

  const id = readStringProperty(pluginObj, 'key');
  if (!id) {
    return null;
  }

  return {
    id,
    package: pkg.name,
    name: readStringProperty(pluginObj, 'name'),
    description: readStringProperty(pluginObj, 'description'),
    icon: readNestedStringProperty(pluginObj, 'icon', 'key'),
    iconHue: readNestedStringProperty(pluginObj, 'icon', 'hue'),
    tags: readStringArrayProperty(pluginObj, 'tags'),
    // Filled in by `extractPlugins` from workspace deps (see above).
    dependsOn: [],
    metaLocation: locationOf(configSource, pluginObj.getStart()),
  };
};

/** Read `obj.<name>.<key>` when `<name>` is an object-literal property (e.g. `icon: { key, hue }`). */
const readNestedStringProperty = (obj: ObjectLiteralExpression, name: string, key: string): string | undefined => {
  const nested = obj
    .getProperty(name)
    ?.asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
  return nested ? readStringProperty(nested, key) : undefined;
};

type Buckets = {
  surfaces: Surface[];
  capabilities: Capability[];
  operations: Operation[];
  schemas: Schema[];
};

const SURFACE_CALL = 'Surface.create';
const CAPABILITY_CONTRIBUTES_CALL = 'Capability.contributes';
const ADD_SCHEMA_MODULE_CALL = 'addSchemaModule';

const extractFromFile = (file: SourceFile, rootPath: string, pluginId: PluginId, buckets: Buckets): void => {
  for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callee = call.getExpression().getText();

    if (callee.endsWith(SURFACE_CALL)) {
      const surface = readSurface(call, pluginId, file);
      if (surface) {
        buckets.surfaces.push(surface);
      }
      continue;
    }

    if (callee.endsWith(CAPABILITY_CONTRIBUTES_CALL)) {
      const args = call.getArguments();
      const typeArg = args[0];
      if (!typeArg || typeArg.getKind() !== SyntaxKind.PropertyAccessExpression) {
        continue;
      }
      const type = typeArg.getText();
      const location = locationOf(file, call.getStart());
      buckets.capabilities.push({ pluginId, type, location });
      // Heuristic: contributions whose capability slot includes "Operation"
      // (e.g. `Capabilities.OperationHandler`, `Capabilities.OperationInvoker`)
      // count as operation contributions too. Plugins frequently route
      // operations through a specifically-named capability slot rather than a
      // dedicated module. Legacy `*Intent*` slots are also matched so older
      // branches still surface something while the rename is in flight.
      if (/operation|intent/i.test(type)) {
        buckets.operations.push({ pluginId, type, location });
      }
      continue;
    }

    if (callee.endsWith(ADD_SCHEMA_MODULE_CALL)) {
      readSchemas(call, pluginId, file, buckets.schemas);
      continue;
    }
  }
};

const readSurface = (call: CallExpression, pluginId: PluginId, file: SourceFile): Surface | null => {
  const arg = call.getArguments()[0];
  if (!arg || arg.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    return null;
  }
  const obj = arg as ObjectLiteralExpression;
  const id = readStringProperty(obj, 'id');
  if (!id) {
    return null;
  }
  const role = readRoleProperty(obj);
  return {
    pluginId,
    id,
    role,
    location: locationOf(file, call.getStart()),
  };
};

const readSchemas = (call: CallExpression, pluginId: PluginId, file: SourceFile, into: Schema[]): void => {
  // `AppPlugin.addSchemaModule({ schema: [Spec.Spec, CodeProject.CodeProject, ...] })`
  const arg = call.getArguments()[0];
  if (!arg || arg.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    return;
  }
  const obj = arg as ObjectLiteralExpression;
  const schemaProp = obj.getProperty('schema');
  if (!schemaProp) {
    return;
  }
  const initializer = schemaProp.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression);
  if (!initializer) {
    return;
  }
  const arr = initializer as ArrayLiteralExpression;
  for (const element of arr.getElements()) {
    const text = element.getText();
    into.push({
      pluginId,
      name: text,
      location: locationOf(file, element.getStart()),
    });
  }
};

const readStringProperty = (obj: ObjectLiteralExpression, name: string): string | undefined => {
  const prop = obj.getProperty(name);
  if (!prop || prop.getKind() !== SyntaxKind.PropertyAssignment) {
    return undefined;
  }
  const initializer = prop.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializer();
  if (!initializer) {
    return undefined;
  }
  if (initializer.getKind() === SyntaxKind.StringLiteral) {
    return initializer.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue();
  }
  if (initializer.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
    return initializer.asKindOrThrow(SyntaxKind.NoSubstitutionTemplateLiteral).getLiteralValue();
  }
  // Tagged template — recognise `trim\`…\`` from `@dxos/util`, used by many
  // plugins for multi-line `description` fields. We replicate the runtime
  // behaviour for the no-substitution case: strip leading/trailing blank
  // lines and remove the smallest common indent.
  if (initializer.getKind() === SyntaxKind.TaggedTemplateExpression) {
    const tagged = initializer.asKindOrThrow(SyntaxKind.TaggedTemplateExpression);
    const tag = tagged.getTag();
    if (tag.getKind() === SyntaxKind.Identifier && tag.getText() === 'trim') {
      const template = tagged.getTemplate();
      if (template.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
        return applyTrim(template.asKindOrThrow(SyntaxKind.NoSubstitutionTemplateLiteral).getLiteralValue());
      }
    }
  }
  return undefined;
};

// Mirrors `@dxos/util`'s `trim` for the no-substitution case: drop leading
// and trailing blank lines, then strip the smallest common indent.
const applyTrim = (raw: string): string => {
  const lines = raw.split('\n');
  while (lines.length && !lines[0].trim()) {
    lines.shift();
  }
  while (lines.length && !lines[lines.length - 1].trim()) {
    lines.pop();
  }
  if (lines.length === 0) {
    return '';
  }
  const minIndent = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => line.match(/^[ \t]*/)?.[0].length ?? 0),
  );
  return lines.map((line) => line.slice(minIndent)).join('\n');
};

const readStringArrayProperty = (obj: ObjectLiteralExpression, name: string): string[] => {
  const prop = obj.getProperty(name);
  if (!prop || prop.getKind() !== SyntaxKind.PropertyAssignment) {
    return [];
  }
  const initializer = prop.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializer();
  if (!initializer || initializer.getKind() !== SyntaxKind.ArrayLiteralExpression) {
    return [];
  }
  const arr = initializer.asKindOrThrow(SyntaxKind.ArrayLiteralExpression);
  return arr
    .getElements()
    .map((element) => {
      if (element.getKind() === SyntaxKind.StringLiteral) {
        return element.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue();
      }
      if (element.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
        return element.asKindOrThrow(SyntaxKind.NoSubstitutionTemplateLiteral).getLiteralValue();
      }
      return undefined;
    })
    .filter((value): value is string => typeof value === 'string');
};

const readRoleProperty = (obj: ObjectLiteralExpression): string[] => {
  const prop = obj.getProperty('role');
  if (!prop || prop.getKind() !== SyntaxKind.PropertyAssignment) {
    return [];
  }
  const initializer = prop.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializer();
  if (!initializer) {
    return [];
  }
  if (initializer.getKind() === SyntaxKind.StringLiteral) {
    return [initializer.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue()];
  }
  if (initializer.getKind() === SyntaxKind.ArrayLiteralExpression) {
    const arr = initializer.asKindOrThrow(SyntaxKind.ArrayLiteralExpression);
    return arr
      .getElements()
      .map((element) =>
        element.getKind() === SyntaxKind.StringLiteral
          ? element.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue()
          : undefined,
      )
      .filter((value): value is string => typeof value === 'string');
  }
  return [];
};

const locationOf = (file: SourceFile, position: number): SourceLocation => {
  const { line, column } = file.getLineAndColumnAtPos(position);
  // Use a path relative to the monorepo root if it's a child, else absolute.
  const filePath = file.getFilePath();
  return {
    file: relativePath(filePath, file),
    line,
    column,
  };
};

const relativePath = (filePath: string, _file: SourceFile): string => {
  // Walk up to find the closest `packages/` segment so the location is
  // monorepo-relative without needing the rootPath threaded through.
  const idx = filePath.indexOf('/packages/');
  return idx >= 0 ? filePath.slice(idx + 1) : filePath;
};

// Suppress unused-import warning while keeping the type available for callers.
export type { Identifier };
