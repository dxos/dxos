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
export const VENDOR_DIR = 'vendor/';
export const VENDOR_MANIFEST_FILE = `${VENDOR_DIR}manifest.json`;

/** The runtime this checker loads bundles for. */
export const RUNTIME = 'workerd';

/**
 * `vendor/manifest.json`: each bare specifier the plugin's files import, and every shared package those import, mapped
 * to its file under `vendor/`.
 */
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
  const imports = [
    ...module.staticImports.map(({ moduleRequest }) => literal(moduleRequest)),
    ...module.staticExports.flatMap(({ entries }) =>
      entries.flatMap(({ moduleRequest }) => (moduleRequest ? [literal(moduleRequest)] : [])),
    ),
    ...module.dynamicImports.map(({ moduleRequest: { start, end } }): ImportRecord => {
      const expression = source.slice(start, end);
      const quoted = /^(['"`])([^'"`$]*)\1$/.exec(expression);
      return { specifier: quoted?.[2], start, end, dynamic: true };
    }),
  ];
  // `export { a, b } from 'x'` lists its specifier once per name; a rewrite must replace each span once.
  return { imports: [...new Map(imports.map((record) => [record.start, record])).values()], errors: [] };
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
 * module parses, every relative import and manifest URL names a file in the bundle, every bare import a workerd host can
 * load is vendored,
 * `vendor/` imports nothing outside itself, and nothing a workerd module imports statically is a
 * stylesheet, another asset, or a browser-only module body.
 */
export const check = (files: Files): CheckResult => {
  const problems: Problem[] = [];
  const modules = checkManifest(files, problems);
  const vendor = checkVendor(files, problems);
  if (files[CATALOG_FILE] !== undefined) {
    parseJson(files, CATALOG_FILE, problems);
  }

  // Imports EDGE could not resolve, reported only where it loads the file (see `loaded` below).
  const unvendored: Problem[] = [];
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
          unvendored.push({ path, message: 'imports a computed specifier, which cannot be checked or vendored' });
        }
        continue;
      }
      if (BUILTIN.test(specifier)) {
        continue;
      }
      if (isBare(specifier)) {
        if (!vendor?.specifiers[specifier]) {
          unvendored.push({ path, message: `imports ${specifier}, which vendor/ does not provide` });
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

  // A host builds the plugin from the manifest and imports each body itself; the entry module is never loaded.
  const roots = [...bodies].filter(([, module]) => runsHere(module)).map(([path]) => path);

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

  // What a workerd host can load: the bodies that run here and everything they import, lazily included. A browser or
  // node body need not resolve on EDGE.
  const loaded = new Set<string>();
  const load = (path: string, followDynamic: boolean) => {
    const body = bodies.get(path);
    if (loaded.has(path) || (body && !runsHere(body))) {
      return;
    }
    loaded.add(path);
    for (const edge of graph.get(path) ?? []) {
      if (edge.path !== undefined && (followDynamic || !edge.dynamic)) {
        load(edge.path, true);
      }
    }
  };
  roots.forEach((root) => load(root, true));
  problems.push(...unvendored.filter(({ path }) => loaded.has(path) || isVendored(path)));

  return { problems, roots, vendor };
};

/** Each bare specifier mapped to the bundle path it loads, as an import map maps it to a URL. */
export type ImportMap = Readonly<Record<string, string>>;

/**
 * Rewrites each bare import to the file `imports` maps it to, relative to the importing file, as EDGE's loader does
 * before handing the bundle to Worker Loader, which resolves a bare specifier against the importing file's directory.
 * Specifiers `imports` does not map are left unchanged.
 */
export const rewriteImports = (files: Files, imports: ImportMap): Record<string, Uint8Array> => {
  const encoder = new TextEncoder();
  return Object.fromEntries(
    Object.entries(files).map(([path, content]) => {
      if (!JS_FILE.test(path)) {
        return [path, content];
      }
      const source = decoder.decode(content);
      let rewritten = source;
      for (const { specifier, start, end } of [...parseImports(path, source).imports].sort(
        (a, b) => b.start - a.start,
      )) {
        const target = specifier !== undefined && isBare(specifier) ? imports[specifier] : undefined;
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

/** `vendor/manifest.json` with each file resolved to its bundle path, or `undefined` when the bundle has none. */
export const readVendor = (files: Files): VendorMap | undefined => checkVendor(files, []);

/** Where a `dependsOn` plugin's bundle sits beside the primary's, one directory per dependency. */
export const DEPENDENCY_DIR = 'deps/';

const VENDOR_FILE = new RegExp(`^(${DEPENDENCY_DIR}\\d+/)?${VENDOR_DIR}`);

/**
 * Keeps every file outside the `vendor/` directories, the vendored `roots`, and the vendored files reachable from those
 * by literal imports: the import map joins several bundles' `vendor/`, and each package is loaded from one of them.
 */
const pruneVendor = (files: Record<string, Uint8Array>, roots: readonly string[]): Record<string, Uint8Array> => {
  const kept = new Set([...Object.keys(files).filter((path) => !VENDOR_FILE.test(path)), ...roots]);
  const queue = [...kept].filter((path) => JS_FILE.test(path));
  for (let path = queue.pop(); path !== undefined; path = queue.pop()) {
    for (const { specifier } of parseImports(path, decoder.decode(files[path])).imports) {
      const target = specifier !== undefined && !isBare(specifier) ? resolveRelative(path, specifier) : undefined;
      if (target !== undefined && files[target] !== undefined && !kept.has(target)) {
        kept.add(target);
        // A copied `.wasm` or source map is kept; only modules import further.
        if (JS_FILE.test(target)) {
          queue.push(target);
        }
      }
    }
  }
  return Object.fromEntries(Object.entries(files).filter(([path]) => kept.has(path)));
};

/** The vendored package whose `PluginHost` the main module starts. */
export const HOST_SPECIFIER = '@dxos/plugin-host-cloudflare';

export const MAIN_MODULE = '__plugin_main__.js';

/**
 * One bundle's plugin as main-module source: its manifest, and a loader for each module body and adapter, keyed by the
 * URL the manifest gives it. The loaders import literal paths, since a computed specifier cannot resolve in Worker
 * Loader: a body by its path under `prefix`, an adapter's bare specifier by the file the import map gives it.
 */
const pluginSource = (bundle: Files, prefix: string, imports: Readonly<Record<string, string>>): string => {
  const manifest: { modules?: { url: string; adapter?: { url: string } }[] } = JSON.parse(
    text(bundle, MANIFEST_FILE) ?? '{}',
  );
  const loaders = (manifest.modules ?? []).flatMap(({ url, adapter }) => [
    [url, `${prefix}${posix.normalize(url)}`],
    ...(adapter && imports[adapter.url] ? [[adapter.url, imports[adapter.url]]] : []),
  ]);
  const entries = loaders.map(([key, path]) => `${JSON.stringify(key)}: () => import(${JSON.stringify(`./${path}`)})`);
  return `{ manifest: ${text(bundle, MANIFEST_FILE) ?? '{}'}, loaders: { ${entries.join(', ')} } }`;
};

/** What Worker Loader runs for a bundle: its rewritten files, the main module's name and source. */
export type WorkerCode = {
  readonly files: Record<string, Uint8Array>;
  readonly mainModule: string;
  readonly main: string;
};

/**
 * The modules a Dynamic Worker loads for a bundle: its files and the bundles of its `dependsOn` plugins (under
 * `deps/<n>/`), with every bare import rewritten through one import map joining their `vendor/` directories (the
 * primary's first, so the isolate holds one copy of each package), and a main module that starts the vendored host and
 * exports its `describe` and `invoke` as a `PluginProtocol.Entrypoint`.
 */
export const workerCode = (files: Files, vendor: VendorMap, dependencies: readonly Files[] = []): WorkerCode => {
  const imports: Record<string, string> = { ...vendor.specifiers };
  const combined: Record<string, Uint8Array> = { ...files };
  dependencies.forEach((dependency, index) => {
    const prefix = `${DEPENDENCY_DIR}${index}/`;
    for (const [specifier, path] of Object.entries(readVendor(dependency)?.specifiers ?? {})) {
      imports[specifier] ??= `${prefix}${path}`;
    }
    for (const [path, content] of Object.entries(dependency)) {
      combined[`${prefix}${path}`] = content;
    }
  });
  const host = imports[HOST_SPECIFIER];
  const plugins = [files, ...dependencies].map((bundle, index) =>
    pluginSource(bundle, index === 0 ? '' : `${DEPENDENCY_DIR}${index - 1}/`, imports),
  );
  const main = [
    "import { WorkerEntrypoint } from 'cloudflare:workers';",
    'let host;',
    // Imported inside a request: module evaluation runs in global scope, where workerd disallows timers.
    'const getHost = async () => {',
    '  if (host === undefined) {',
    // Without a vendored host the bundle still loads, so its modules can be checked; only starting the plugin fails.
    host === undefined
      ? `    throw new Error(${JSON.stringify(`vendor/ does not provide ${HOST_SPECIFIER}, which EDGE starts the plugin with.`)});`
      : `    const { PluginHost } = await import('./${host}');`,
    `    const [primary, ...dependencies] = [${plugins.join(', ')}];`,
    '    host ??= PluginHost.make(() => ({',
    '      primary: PluginHost.fromManifest(primary.manifest, primary.loaders),',
    '      dependencies: dependencies.map(({ manifest, loaders }) => PluginHost.fromManifest(manifest, loaders)),',
    '    }));',
    '  }',
    '  return host;',
    '};',
    // Implements `PluginProtocol.Entrypoint` from `@dxos/protocols`.
    'export default class PluginEntrypoint extends WorkerEntrypoint {',
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
  return {
    files: pruneVendor(rewriteImports(combined, imports), host === undefined ? [] : [host]),
    mainModule: MAIN_MODULE,
    main,
  };
};
