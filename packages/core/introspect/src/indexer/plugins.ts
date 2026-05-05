//
// Copyright 2026 DXOS.org
//

// Plugin / surface / capability / operation extractor.
//
// This module is invoked AFTER `extractSymbols` has produced a per-package
// ts-morph project. To keep things cheap, we only run the full plugin pass
// against packages that look like they declare a plugin — gated on a literal
// "Plugin.define(" appearing somewhere under src/. Surfaces, capabilities,
// and operations are extracted from the same ts-morph project so we don't
// re-parse files.
//
// What we DON'T do: evaluate runtime code, follow re-exports across packages,
// or attempt to resolve dynamic capabilities. If a contribution can't be read
// off a literal AST node, we log it (stderr) and skip — per spec.

import { globSync } from 'glob';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  type CallExpression,
  type Node,
  type ObjectLiteralExpression,
  Project,
  ScriptTarget,
  type SourceFile,
  SyntaxKind,
} from 'ts-morph';

import {
  formatCapabilityRef,
  formatOperationRef,
  formatPluginRef,
  formatSurfaceRef,
} from '../refs';
import type {
  Capability,
  Operation,
  PluginDetail,
  PluginModule,
  SourceLocation,
  Surface,
} from '../types';

const warn = (msg: string, err?: unknown): void => {
  console.error(err ? `[introspect plugins] ${msg}: ${String(err)}` : `[introspect plugins] ${msg}`);
};

export type PluginExtractionInput = {
  packageName: string;
  packagePath: string;
  monorepoRoot: string;
};

export type PluginExtraction = {
  /** Detail when this package declares a plugin; null otherwise. */
  plugin: PluginDetail | null;
  /** Surfaces extracted from this package (some packages contribute surfaces without being plugins themselves). */
  surfaces: Surface[];
  /** Capabilities contributed from this package. */
  capabilities: Capability[];
  /** Operations defined in this package. */
  operations: Operation[];
};

export const emptyExtraction = (): PluginExtraction => ({
  plugin: null,
  surfaces: [],
  capabilities: [],
  operations: [],
});

/**
 * Cheap pre-filter so the heavy ts-morph pass runs only against packages with
 * any plugin signal. Returns the matching source-file paths that contain at
 * least one of the relevant call patterns; empty array means "skip this
 * package."
 *
 * Walking every `**\/*.ts` per package is too slow on the real monorepo
 * (~250 packages, some with hundreds of files). Instead we look at the
 * canonical plugin file locations only — which is also where the spec says
 * plugins must live (`src/*Plugin.ts(x)`, `src/meta.ts`, `src/capabilities/`,
 * `src/operations/`, `src/index.ts`). A package that hides its plugin
 * definition outside these conventions won't be detected, and that's a
 * correct outcome — those wouldn't be discoverable to consumers either.
 */
export const findCandidateFiles = (monorepoRoot: string, packagePath: string): string[] => {
  const srcDir = join(monorepoRoot, packagePath, 'src');
  if (!existsSync(srcDir)) {
    return [];
  }
  const candidates = new Set<string>();
  // Conventional locations only. We use multiple targeted globs rather than a single
  // `**/*.{ts,tsx}` so we don't walk every file in every package.
  const patterns = [
    'index.ts',
    'meta.ts',
    '*Plugin.ts',
    '*Plugin.tsx',
    'capabilities/**/*.{ts,tsx}',
    'operations/**/*.{ts,tsx}',
  ];
  for (const pattern of patterns) {
    let matches: string[];
    try {
      matches = globSync(pattern, {
        cwd: srcDir,
        ignore: ['**/*.test.{ts,tsx}', '**/*.stories.{ts,tsx}', '**/__fixtures__/**', '**/__tests__/**'],
        absolute: true,
        nodir: true,
      });
    } catch {
      continue;
    }
    for (const file of matches) {
      let text: string;
      try {
        text = readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      if (
        text.includes('Plugin.define(') ||
        text.includes('Plugin.Meta') ||
        text.includes('Capability.contributes(') ||
        text.includes('Surface.create(') ||
        text.includes('Operation.make(')
      ) {
        candidates.add(file);
      }
    }
  }
  return [...candidates];
};

/**
 * Extract plugin metadata, surfaces, capabilities, and operations from a
 * package's source. Skips entirely when no candidate file contains the
 * relevant call patterns (most packages).
 *
 * Errors during extraction are logged and produce empty results rather than
 * throwing — the indexer's job is best-effort coverage.
 */
export const extractPluginArtifacts = (input: PluginExtractionInput): PluginExtraction => {
  const { packageName, packagePath, monorepoRoot } = input;

  const candidatePaths = findCandidateFiles(monorepoRoot, packagePath);
  if (candidatePaths.length === 0) {
    return emptyExtraction();
  }

  // A dedicated ts-morph project per package keeps parsing isolated and avoids
  // dragging in deps. We don't rely on type resolution here — only AST shape —
  // so skipFileDependencyResolution is safe.
  const project = new Project({
    useInMemoryFileSystem: false,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: {
      allowJs: false,
      target: ScriptTarget.ESNext,
      jsx: 4 /* JsxEmit.ReactJSX */,
      noEmit: true,
      skipLibCheck: true,
    },
  });

  const sourceFiles: SourceFile[] = [];
  for (const filePath of candidatePaths) {
    try {
      const sf = project.addSourceFileAtPathIfExists(filePath);
      if (sf) {
        sourceFiles.push(sf);
      }
    } catch (err) {
      warn(`failed to load ${filePath}`, err);
    }
  }

  const surfaces: Surface[] = [];
  const capabilities: Capability[] = [];
  const operations: Operation[] = [];
  const moduleCalls: PluginModule[] = [];

  // Find `meta.ts` first so plugin id is available before we ref capabilities/surfaces.
  let metaFile: SourceFile | undefined;
  let pluginEntry: { file: SourceFile; call: CallExpression } | undefined;

  for (const file of sourceFiles) {
    const fileName = file.getBaseName();
    if (fileName === 'meta.ts' && !metaFile) {
      // Prefer the meta.ts that actually exports a `meta` symbol typed Plugin.Meta.
      const metaExport = file.getVariableDeclaration('meta');
      if (metaExport) {
        metaFile = file;
      }
    }
  }

  // Walk every source file to find Plugin.define / Surface.create / Capability.contributes / Operation.make.
  for (const file of sourceFiles) {
    try {
      file.forEachDescendant((node) => {
        if (node.getKind() !== SyntaxKind.CallExpression) {
          return;
        }
        const call = node as CallExpression;
        const expr = call.getExpression();
        const exprText = expr.getText();

        if (exprText === 'Plugin.define' && !pluginEntry) {
          pluginEntry = { file, call };
        } else if (exprText === 'Surface.create') {
          const surface = readSurface(call, packageName, monorepoRoot);
          if (surface) {
            surfaces.push(surface);
          }
        } else if (exprText === 'Capability.contributes') {
          const cap = readCapability(call, packageName, monorepoRoot);
          if (cap) {
            capabilities.push(cap);
          }
        } else if (exprText === 'Operation.make') {
          const op = readOperation(call, packageName, monorepoRoot);
          if (op) {
            operations.push(op);
          }
        }
      });
    } catch (err) {
      warn(`extraction failed in ${packageName} (${file.getFilePath()})`, err);
    }
  }

  // Plugin only counts if we found BOTH a meta.ts and a Plugin.define call —
  // packages that contribute capabilities/surfaces without defining their own
  // plugin (e.g. shared @dxos/plugin-space/types) still surface their
  // capabilities/operations to callers, just without a plugin record.
  let plugin: PluginDetail | null = null;
  if (metaFile && pluginEntry) {
    const meta = readPluginMeta(metaFile);
    if (meta?.id && meta?.name) {
      // Walk the .pipe(...) chain on the Plugin.define call to enumerate modules.
      collectPluginModules(pluginEntry.call, monorepoRoot, moduleCalls);

      // Backfill ownership on contributions from this package.
      for (const surface of surfaces) {
        surface.pluginId = meta.id;
        surface.ref = formatSurfaceRef(meta.id, surface.id);
      }
      for (const cap of capabilities) {
        cap.pluginId = meta.id;
        cap.ref = formatCapabilityRef(cap.key, meta.id);
      }
      for (const op of operations) {
        op.pluginId = meta.id;
      }

      plugin = {
        ref: formatPluginRef(meta.id),
        id: meta.id,
        name: meta.name,
        description: meta.description,
        package: packageName,
        entryFile: relative(monorepoRoot, pluginEntry.file.getFilePath()),
        modules: moduleCalls,
        surfaces: [...surfaces],
        capabilities: [...capabilities],
        operations: [...operations],
        meta: meta.extra,
      };
    }
  }

  return { plugin, surfaces, capabilities, operations };
};

type MetaInfo = {
  id?: string;
  name?: string;
  description?: string;
  extra: Record<string, string | string[] | undefined>;
};

const readPluginMeta = (file: SourceFile): MetaInfo | null => {
  try {
    const decl = file.getVariableDeclaration('meta');
    if (!decl) {
      return null;
    }
    const initializer = decl.getInitializer();
    if (!initializer || initializer.getKind() !== SyntaxKind.ObjectLiteralExpression) {
      return null;
    }
    const obj = initializer as ObjectLiteralExpression;
    const props = readObjectLiteralProps(obj);
    const result: MetaInfo = {
      id: stringValue(props.id),
      name: stringValue(props.name),
      description: stringValue(props.description),
      extra: {},
    };
    for (const [key, raw] of Object.entries(props)) {
      if (key === 'id' || key === 'name' || key === 'description') {
        continue;
      }
      if (typeof raw === 'string') {
        result.extra[key] = raw;
      } else if (Array.isArray(raw)) {
        result.extra[key] = raw;
      }
    }
    return result;
  } catch (err) {
    warn(`meta read failed for ${file.getFilePath()}`, err);
    return null;
  }
};

const readSurface = (call: CallExpression, packageName: string, monorepoRoot: string): Surface | null => {
  const args = call.getArguments();
  if (args.length === 0 || args[0].getKind() !== SyntaxKind.ObjectLiteralExpression) {
    return null;
  }
  const props = readObjectLiteralProps(args[0] as ObjectLiteralExpression);
  const id = stringValue(props.id);
  if (!id) {
    return null;
  }
  const roleRaw = props.role;
  let roles: string[] | undefined;
  if (typeof roleRaw === 'string') {
    roles = [roleRaw];
  } else if (Array.isArray(roleRaw)) {
    roles = roleRaw.filter((r): r is string => typeof r === 'string');
  }
  return {
    // pluginId/ref are backfilled by the caller once meta.id is known.
    ref: formatSurfaceRef(packageName, id),
    id,
    pluginId: null,
    package: packageName,
    roles,
    location: nodeLocation(call, monorepoRoot),
  };
};

const readCapability = (call: CallExpression, packageName: string, monorepoRoot: string): Capability | null => {
  const args = call.getArguments();
  if (args.length === 0) {
    return null;
  }
  // First arg is the capability key — usually `Capabilities.X` or a constant identifier.
  // Capture its source text verbatim; resolving across imports is out of scope for v1.
  const key = args[0].getText();
  if (!key || key.length === 0) {
    return null;
  }
  return {
    ref: formatCapabilityRef(key, packageName),
    key,
    pluginId: null,
    package: packageName,
    location: nodeLocation(call, monorepoRoot),
  };
};

const readOperation = (call: CallExpression, packageName: string, monorepoRoot: string): Operation | null => {
  const args = call.getArguments();
  if (args.length === 0 || args[0].getKind() !== SyntaxKind.ObjectLiteralExpression) {
    return null;
  }
  const top = readObjectLiteralProps(args[0] as ObjectLiteralExpression);
  const meta = top.meta;
  if (!isPlainObject(meta)) {
    return null;
  }
  const key = stringValue(meta.key);
  if (!key) {
    return null;
  }
  return {
    ref: formatOperationRef(key),
    key,
    name: stringValue(meta.name),
    description: stringValue(meta.description),
    pluginId: null,
    package: packageName,
    location: nodeLocation(call, monorepoRoot),
  };
};

const collectPluginModules = (call: CallExpression, monorepoRoot: string, out: PluginModule[]): void => {
  // A plugin definition is `Plugin.define(meta).pipe(addModuleX, addModuleY, ...)`.
  // We walk up to the .pipe(...) call and inspect each argument.
  const parent = call.getParent();
  if (!parent) {
    return;
  }
  let pipeCall: CallExpression | undefined;
  // Climb past PropertyAccessExpression(.pipe) → CallExpression(.pipe(...)).
  let cursor: Node | undefined = parent;
  while (cursor) {
    if (cursor.getKind() === SyntaxKind.CallExpression) {
      const c = cursor as CallExpression;
      const e = c.getExpression();
      if (e.getKind() === SyntaxKind.PropertyAccessExpression && e.getText().endsWith('.pipe')) {
        pipeCall = c;
        break;
      }
    }
    cursor = cursor.getParent();
  }
  if (!pipeCall) {
    return;
  }
  for (const arg of pipeCall.getArguments()) {
    if (arg.getKind() !== SyntaxKind.CallExpression) {
      continue;
    }
    const sub = arg as CallExpression;
    const expr = sub.getExpression();
    const exprText = expr.getText();
    // Helper name is the trailing identifier after the last dot: AppPlugin.addSurfaceModule -> addSurfaceModule.
    const helper = exprText.includes('.') ? exprText.slice(exprText.lastIndexOf('.') + 1) : exprText;
    if (!helper.startsWith('add') && helper !== 'make') {
      continue;
    }
    let id: string | undefined;
    const subArgs = sub.getArguments();
    if (subArgs.length > 0 && subArgs[0].getKind() === SyntaxKind.ObjectLiteralExpression) {
      const props = readObjectLiteralProps(subArgs[0] as ObjectLiteralExpression);
      id = stringValue(props.id);
    }
    out.push({
      helper,
      id,
      location: nodeLocation(sub, monorepoRoot),
    });
  }
};

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

type LiteralValue = string | string[] | Record<string, unknown> | undefined;

const readObjectLiteralProps = (obj: ObjectLiteralExpression): Record<string, LiteralValue> => {
  const out: Record<string, LiteralValue> = {};
  for (const prop of obj.getProperties()) {
    if (prop.getKind() !== SyntaxKind.PropertyAssignment) {
      continue;
    }
    const pa = prop as unknown as { getName: () => string; getInitializer: () => Node | undefined };
    const name = pa.getName();
    const initializer = pa.getInitializer();
    if (!initializer) {
      continue;
    }
    out[name] = readLiteral(initializer);
  }
  return out;
};

const readLiteral = (node: Node): LiteralValue => {
  switch (node.getKind()) {
    case SyntaxKind.StringLiteral:
    case SyntaxKind.NoSubstitutionTemplateLiteral: {
      const text = node.getText();
      // Strip surrounding quotes/backticks.
      return text.slice(1, -1);
    }
    case SyntaxKind.TaggedTemplateExpression: {
      // `trim\`...\`` and friends — pull the template body so descriptions still surface.
      const tagged = node as unknown as { getTemplate: () => Node };
      try {
        const tpl = tagged.getTemplate();
        const text = tpl.getText();
        if (text.startsWith('`') && text.endsWith('`')) {
          return text.slice(1, -1).trim();
        }
        return text.trim();
      } catch {
        return undefined;
      }
    }
    case SyntaxKind.ArrayLiteralExpression: {
      const arr = node as unknown as { getElements: () => Node[] };
      const items: string[] = [];
      for (const el of arr.getElements()) {
        const v = readLiteral(el);
        if (typeof v === 'string') {
          items.push(v);
        }
      }
      return items;
    }
    case SyntaxKind.ObjectLiteralExpression: {
      const nested = readObjectLiteralProps(node as ObjectLiteralExpression);
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(nested)) {
        result[key] = value;
      }
      return result;
    }
    default:
      return undefined;
  }
};

const stringValue = (v: LiteralValue): string | undefined => (typeof v === 'string' ? v : undefined);

const isPlainObject = (v: LiteralValue): v is Record<string, LiteralValue> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const nodeLocation = (node: Node, monorepoRoot: string): SourceLocation => {
  const file = node.getSourceFile();
  const start = node.getStart();
  const lc = file.getLineAndColumnAtPos(start);
  return {
    file: relative(monorepoRoot, file.getFilePath()),
    line: lc.line,
    column: lc.column,
  };
};
