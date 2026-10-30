//
// Copyright 2026 DXOS.org
//

import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { readdir, readFile } from 'node:fs/promises';
import { join, posix, relative, sep } from 'node:path';
import { parseSync } from 'oxc-parser';

/** A built plugin bundle: file contents keyed by path relative to the bundle root, with `/` separators. */
export type Files = Readonly<Record<string, Uint8Array>>;

export const MANIFEST_FILE = 'manifest.json';
export const CATALOG_FILE = 'catalog.json';
export const ENTRY_FILE = 'index.mjs';
export const VENDOR_DIR = 'vendor/';
export const VENDOR_MANIFEST_FILE = `${VENDOR_DIR}manifest.json`;

/** The runtime this checker loads bundles for. */
export const RUNTIME = 'workerd';

/** `vendor/manifest.json`: each bare specifier the plugin's files import, mapped to its file under `vendor/`. */
export const VendorMap = Schema.Struct({
  specifiers: Schema.Record(Schema.String, Schema.String),
  conditions: Schema.optional(Schema.Array(Schema.String)),
});
export type VendorMap = Schema.Schema.Type<typeof VendorMap>;

const ManifestTag = Schema.Struct({ identifier: Schema.String, arity: Schema.String });

/** The fields of the bundle's `manifest.json` (plugin metadata, flat, plus its modules) a host reads to load it. */
const Manifest = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
  version: Schema.String,
  modules: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      url: Schema.String,
      requires: Schema.Array(ManifestTag),
      provides: Schema.Array(ManifestTag),
      environments: Schema.optional(Schema.Array(Schema.String)),
      adapter: Schema.optional(Schema.Struct({ url: Schema.String })),
    }),
  ),
});
type ManifestModule = Schema.Schema.Type<typeof Manifest>['modules'][number];

/** Why a bundle cannot be loaded on EDGE; `path` is the file it concerns. */
export type Problem = { readonly path: string; readonly message: string };

/** One import of a module, with the span of its specifier (quotes included) when it is a string literal. */
type ImportRecord = {
  readonly specifier: string | undefined;
  readonly start: number;
  readonly end: number;
  readonly dynamic: boolean;
};

const JS_FILE = /\.(mjs|js)$/;
const WASM_FILE = /\.wasm$/;
const BUILTIN = /^(cloudflare|node):/;

/** Files a Worker Loader module map can hold; anything else imported from a workerd module fails to load. */
const isLoadable = (path: string): boolean => JS_FILE.test(path) || WASM_FILE.test(path);
const isBare = (specifier: string): boolean => !specifier.startsWith('.') && !specifier.startsWith('/');
const isVendored = (path: string): boolean => path.startsWith(VENDOR_DIR);

/** Reads every file under `dir` into {@link Files}. */
export const readBundle = async (dir: string): Promise<Files> => {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const files: Record<string, Uint8Array> = {};
  for (const entry of entries.filter((entry) => entry.isFile())) {
    const path = join(entry.parentPath, entry.name);
    files[relative(dir, path).split(sep).join('/')] = await readFile(path);
  }
  return files;
};

const decoder = new TextDecoder();
const text = (files: Files, path: string): string | undefined => {
  const content = files[path];
  return content === undefined ? undefined : decoder.decode(content);
};

const parseJson = (files: Files, path: string, problems: Problem[]): unknown => {
  const source = text(files, path);
  if (source === undefined) {
    problems.push({ path, message: 'missing' });
    return undefined;
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    problems.push({ path, message: `not JSON: ${error instanceof Error ? error.message : String(error)}` });
    return undefined;
  }
};

/** Decodes a JSON file with `schema`, reporting why it does not match. */
const decodeJson = <A, I>(
  files: Files,
  path: string,
  schema: Schema.Codec<A, I>,
  problems: Problem[],
): A | undefined => {
  const json = parseJson(files, path, problems);
  if (json === undefined) {
    return undefined;
  }
  const result = Schema.decodeUnknownResult(schema)(json);
  if (Result.isFailure(result)) {
    problems.push({ path, message: String(result.failure) });
    return undefined;
  }
  return result.success;
};

/** The imports of one module, or the parser's errors. */
const parseImports = (path: string, source: string): { imports: ImportRecord[]; errors: string[] } => {
  const { module, errors } = parseSync(path, source, { sourceType: 'module' });
  if (errors.length > 0) {
    return { imports: [], errors: errors.map((error) => error.message) };
  }
  const literal = ({ value, start, end }: { value: string; start: number; end: number }): ImportRecord => ({
    specifier: value,
    start,
    end,
    dynamic: false,
  });
  return {
    imports: [
      ...module.staticImports.map(({ moduleRequest }) => literal(moduleRequest)),
      ...module.staticExports.flatMap(({ entries }) =>
        entries.flatMap(({ moduleRequest }) => (moduleRequest ? [literal(moduleRequest)] : [])),
      ),
      ...module.dynamicImports.map(({ moduleRequest: { start, end } }): ImportRecord => {
        const expression = source.slice(start, end);
        const quoted = /^(['"`])([^'"`$]*)\1$/.exec(expression);
        return { specifier: quoted?.[2], start, end, dynamic: true };
      }),
    ],
    errors: [],
  };
};

/** The bundle path a relative specifier names from `from`, or `undefined` when it leaves the bundle. */
const resolveRelative = (from: string, specifier: string): string | undefined => {
  const path = posix.normalize(posix.join(posix.dirname(from), specifier));
  return path.startsWith('../') || path.startsWith('/') ? undefined : path;
};

const checkManifest = (files: Files, problems: Problem[]): readonly ManifestModule[] => {
  const manifest = decodeJson(files, MANIFEST_FILE, Manifest, problems);
  const ids = new Set<string>();
  for (const { id } of manifest?.modules ?? []) {
    if (ids.has(id)) {
      problems.push({ path: MANIFEST_FILE, message: `${id}: duplicate module id` });
    }
    ids.add(id);
  }
  return manifest?.modules ?? [];
};

const checkVendor = (files: Files, problems: Problem[]): VendorMap | undefined => {
  if (files[VENDOR_MANIFEST_FILE] === undefined) {
    return undefined;
  }
  const vendor = decodeJson(files, VENDOR_MANIFEST_FILE, VendorMap, problems);
  if (vendor === undefined) {
    return undefined;
  }
  const specifiers: Record<string, string> = {};
  for (const [specifier, file] of Object.entries(vendor.specifiers)) {
    const path = resolveRelative(VENDOR_MANIFEST_FILE, file);
    if (!path || !isVendored(path) || files[path] === undefined) {
      problems.push({ path: VENDOR_MANIFEST_FILE, message: `${specifier}: no file ${file} in vendor/` });
      continue;
    }
    specifiers[specifier] = path;
  }
  return { specifiers };
};

/** The bundle path a manifest URL names, or `undefined` when it is not a path inside the bundle. */
const resolveUrl = (url: string): string | undefined =>
  /^[a-z][a-z0-9+.-]*:/i.test(url) ? undefined : resolveRelative(MANIFEST_FILE, url);

/** What {@link check} found: the problems, and the files a workerd host imports first. */
export type CheckResult = {
  readonly problems: readonly Problem[];
  /** Module bodies (and the entry) whose environments include `workerd`, in manifest order. */
  readonly roots: readonly string[];
  /** `vendor/manifest.json` with each file resolved to its bundle path; absent when the bundle has none. */
  readonly vendor: VendorMap | undefined;
};

/**
 * Checks that a built plugin bundle loads on EDGE as is: the manifest and `vendor/manifest.json` are well formed, every
 * module parses, every relative import and manifest URL names a file in the bundle, every bare import of the plugin's
 * files is vendored, `vendor/` imports nothing outside itself, and nothing a workerd module imports statically is a
 * stylesheet, another asset, or a browser-only module body.
 */
export const check = (files: Files): CheckResult => {
  const problems: Problem[] = [];
  const modules = checkManifest(files, problems);
  const vendor = checkVendor(files, problems);
  if (files[CATALOG_FILE] !== undefined) {
    parseJson(files, CATALOG_FILE, problems);
  }

  // Every module's own imports, resolved to bundle paths; `undefined` marks a bare or unresolvable one.
  const graph = new Map<string, { path: string | undefined; specifier: string; dynamic: boolean }[]>();
  // Sorted, so the report reads the same whatever order the files were read in.
  for (const path of Object.keys(files)
    .filter((path) => JS_FILE.test(path))
    .sort()) {
    const { imports, errors } = parseImports(path, text(files, path) ?? '');
    errors.forEach((message) => problems.push({ path, message: `does not parse: ${message}` }));
    const edges: { path: string | undefined; specifier: string; dynamic: boolean }[] = [];
    for (const { specifier, dynamic } of imports) {
      if (specifier === undefined) {
        // Vendored framework code loads module bodies by URL (`Plugin.fromManifest`); the plugin's own files never should.
        if (!isVendored(path)) {
          problems.push({ path, message: 'imports a computed specifier, which cannot be checked or vendored' });
        }
        continue;
      }
      if (BUILTIN.test(specifier)) {
        continue;
      }
      if (isBare(specifier)) {
        if (isVendored(path)) {
          problems.push({
            path,
            message: `vendor/ imports ${specifier} bare; vendored packages import each other relatively`,
          });
        } else if (!vendor?.specifiers[specifier]) {
          problems.push({ path, message: `imports ${specifier}, which vendor/ does not provide` });
        }
        edges.push({ path: vendor?.specifiers[specifier], specifier, dynamic });
        continue;
      }
      const target = resolveRelative(path, specifier);
      if (target === undefined || files[target] === undefined) {
        problems.push({ path, message: `imports ${specifier}, which is not in the bundle` });
      } else if (isVendored(path) && !isVendored(target)) {
        problems.push({ path, message: `imports ${specifier}, outside vendor/` });
      }
      edges.push({ path: target, specifier, dynamic });
    }
    graph.set(path, edges);
  }

  const runsHere = (module: ManifestModule) => !module.environments || module.environments.includes(RUNTIME);
  const bodies = new Map<string, ManifestModule>();
  for (const module of modules) {
    for (const url of [module.url, module.adapter?.url].filter((url): url is string => url !== undefined)) {
      // A shared package's export (e.g. an adapter) loads through the same bare specifier the plugin's files use.
      if (isBare(url) && !/^[a-z][a-z0-9+.-]*:/i.test(url)) {
        if (!vendor?.specifiers[url]) {
          problems.push({ path: MANIFEST_FILE, message: `${module.id}: ${url}, which vendor/ does not provide` });
        }
        continue;
      }
      const path = resolveUrl(url);
      if (path === undefined || files[path] === undefined) {
        problems.push({ path: MANIFEST_FILE, message: `${module.id}: ${url} is not a file in the bundle` });
      } else {
        bodies.set(path, module);
      }
    }
  }

  const roots = [
    ...(files[ENTRY_FILE] !== undefined ? [ENTRY_FILE] : []),
    ...[...bodies].filter(([, module]) => runsHere(module)).map(([path]) => path),
  ];

  // What a workerd host evaluates: each root and everything it imports statically. Dynamic imports are followed only
  // when a manifest module runs here, since the entry's loaders name every body, browser-only ones included.
  const visited = new Set<string>();
  const visit = (path: string, chain: readonly string[]) => {
    if (visited.has(path)) {
      return;
    }
    visited.add(path);
    if (!isLoadable(path)) {
      problems.push({ path, message: `a workerd module imports it: ${[...chain, path].join(' → ')}` });
      return;
    }
    const body = bodies.get(path);
    if (body && !runsHere(body)) {
      problems.push({
        path,
        message: `browser-only module ${body.id} is imported statically by a workerd module: ${[...chain, path].join(' → ')}`,
      });
      return;
    }
    for (const edge of graph.get(path) ?? []) {
      if (edge.path !== undefined && !edge.dynamic) {
        visit(edge.path, [...chain, path]);
      }
    }
  };
  roots.forEach((root) => visit(root, []));

  return { problems, roots, vendor };
};

/**
 * Rewrites each bare import of the plugin's files to its file under `vendor/`, as EDGE's loader does before handing the
 * bundle to Worker Loader, which resolves a bare specifier against the importing file's directory. Files under
 * `vendor/`, and specifiers `vendor/` does not provide, are returned unchanged.
 */
export const rewriteImports = (files: Files, vendor: VendorMap): Record<string, Uint8Array> => {
  const encoder = new TextEncoder();
  return Object.fromEntries(
    Object.entries(files).map(([path, content]) => {
      if (!JS_FILE.test(path) || isVendored(path)) {
        return [path, content];
      }
      const source = decoder.decode(content);
      const { imports } = parseImports(path, source);
      let rewritten = source;
      for (const { specifier, start, end } of [...imports].sort((a, b) => b.start - a.start)) {
        const target = specifier !== undefined && isBare(specifier) ? vendor.specifiers[specifier] : undefined;
        if (target !== undefined) {
          const relativePath = posix.relative(posix.dirname(path), target);
          const replacement = JSON.stringify(relativePath.startsWith('.') ? relativePath : `./${relativePath}`);
          rewritten = rewritten.slice(0, start) + replacement + rewritten.slice(end);
        }
      }
      return [path, rewritten === source ? content : encoder.encode(rewritten)];
    }),
  );
};

/** The vendored package whose `PluginHost` the main module starts. */
export const HOST_SPECIFIER = '@dxos/plugin-host-cloudflare';

/** Where a `dependsOn` plugin's bundle sits beside the primary's, one directory per dependency. */
export const DEPENDENCY_DIR = 'deps/';

export const MAIN_MODULE = '__plugin_main__.js';

/** What Worker Loader runs for a bundle: its rewritten files, the main module's name and source. */
export type WorkerCode = {
  readonly files: Record<string, Uint8Array>;
  readonly mainModule: string;
  readonly main: string;
};

/**
 * The modules a Dynamic Worker loads for a bundle: its files with bare imports rewritten to `vendor/`, the bundles of
 * its `dependsOn` plugins under `deps/<n>/` rewritten to the same `vendor/` (so the isolate holds one copy of each
 * package), and a main module that starts the vendored host and exports its `describe`, `invoke` and `fetch`.
 */
export const workerCode = (files: Files, vendor: VendorMap, dependencies: readonly Files[] = []): WorkerCode => {
  const host = vendor.specifiers[HOST_SPECIFIER];
  const combined: Record<string, Uint8Array> = { ...files };
  dependencies.forEach((dependency, index) => {
    for (const [path, content] of Object.entries(dependency)) {
      // A dependency's own `vendor/` is not loaded: its imports resolve against the primary's.
      if (!isVendored(path)) {
        combined[`${DEPENDENCY_DIR}${index}/${path}`] = content;
      }
    }
  });
  const imports = [
    // Without a vendored host the bundle still loads, so its modules can be checked; only starting the plugin fails.
    host === undefined
      ? `Promise.reject(new Error(${JSON.stringify(`vendor/ does not provide ${HOST_SPECIFIER}, which EDGE starts the plugin with.`)}))`
      : `import('./${host}')`,
    `import('./${ENTRY_FILE}')`,
    ...dependencies.map((_, index) => `import('./${DEPENDENCY_DIR}${index}/${ENTRY_FILE}')`),
  ];
  const main = [
    "import { WorkerEntrypoint } from 'cloudflare:workers';",
    'let host;',
    // Imported inside a request: module evaluation runs in global scope, where workerd disallows timers.
    'const getHost = async () => {',
    '  if (host === undefined) {',
    `    const [{ PluginHost }, primary, ...dependencies] = await Promise.all([${imports.join(', ')}]);`,
    '    host ??= PluginHost.make(() => ({ primary: primary.make(), dependencies: dependencies.map((plugin) => plugin.make()) }));',
    '  }',
    '  return host;',
    '};',
    'export default class PluginEntrypoint extends WorkerEntrypoint {',
    '  async fetch(request) { return (await getHost()).fetch(request, this.env); }',
    // Workers RPC drops an error's stack, which is the whole diagnosis of a failed activation.
    '  async describe() {',
    '    try {',
    '      return await (await getHost()).describe();',
    '    } catch (error) {',
    '      throw new Error(String(error?.stack ?? error));',
    '    }',
    '  }',
    '  async invoke(request, scope) { return (await getHost()).invoke(request, this.env, scope); }',
    '}',
  ].join('\n');
  return { files: rewriteImports(combined, vendor), mainModule: MAIN_MODULE, main };
};
