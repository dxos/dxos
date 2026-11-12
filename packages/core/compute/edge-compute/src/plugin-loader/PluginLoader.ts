//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { parse } from 'es-module-lexer/js';

/** A plugin bundle's files by path relative to its root, with `/` separators. */
export type Files = Readonly<Record<string, Uint8Array>>;

/** Each bare specifier mapped to the bundle path it loads, as an import map maps it to a URL. */
export type ImportMap = Readonly<Record<string, string>>;

export const MANIFEST_FILE = 'manifest.json';
export const VENDOR_DIR = 'vendor/';
export const VENDOR_MANIFEST_FILE = `${VENDOR_DIR}manifest.json`;

/** The vendored package whose `PluginHost` the main module starts. */
export const HOST_SPECIFIER = '@dxos/plugin-host-cloudflare';

export const MAIN_MODULE = '__plugin_main__.js';

/** The runtime a plugin bundle is loaded with; matches what compute-service loads Worker Loader functions with. */
export const COMPATIBILITY_DATE = '2026-03-17';

/**
 * `no_handle_cross_request_promise_resolution` matches every EDGE worker: past the 2024-10-14 default a promise settled
 * from another request's context has its continuation dropped.
 */
export const COMPATIBILITY_FLAGS: readonly string[] = [
  'nodejs_compat',
  'nodejs_als',
  'no_handle_cross_request_promise_resolution',
];

const JS_FILE = /\.(mjs|js)$/;

const decoder = new TextDecoder();
const encoder = new TextEncoder();

const text = (files: Files, path: string): string | undefined => {
  const content = files[path];
  return content === undefined ? undefined : decoder.decode(content);
};

const isBare = (specifier: string): boolean => !specifier.startsWith('.') && !specifier.startsWith('/');

/** The bundle path a relative specifier names from `from`, or `undefined` when it leaves the bundle. */
const resolveRelative = (from: string, specifier: string): string | undefined => {
  const segments = from.split('/').slice(0, -1);
  for (const segment of specifier.split('/')) {
    if (segment === '..') {
      if (segments.length === 0) {
        return undefined;
      }
      segments.pop();
    } else if (segment !== '.' && segment !== '') {
      segments.push(segment);
    }
  }
  return segments.join('/');
};

/** `path` relative to the directory of `from`, starting with `./` or `../`. */
const relativePath = (from: string, path: string): string => {
  const fromDir = from.split('/').slice(0, -1);
  const target = path.split('/');
  let common = 0;
  while (common < fromDir.length && common < target.length - 1 && fromDir[common] === target[common]) {
    common++;
  }
  const up = fromDir.length - common;
  const rest = target.slice(common).join('/');
  return up === 0 ? `./${rest}` : `${'../'.repeat(up)}${rest}`;
};

/** One import of a module: its specifier, or `undefined` for a computed one, and the span to replace. */
type ImportRecord = { specifier: string | undefined; start: number; end: number; quoted: boolean };

/** The imports of an ES module; dynamic ones with a computed specifier have none. */
const parseImports = async (source: string): Promise<ImportRecord[]> => {
  const [imports] = parse(source);
  return imports
    .filter((entry) => entry.d !== -2)
    .map((entry) =>
      // A static import's span excludes the quotes; a dynamic import's covers the whole argument.
      entry.d === -1
        ? { specifier: entry.n, start: entry.s, end: entry.e, quoted: false }
        : { specifier: entry.n, start: entry.s, end: entry.e, quoted: true },
    );
};

/** `vendor/manifest.json` of a bundle, each file as its bundle path; `undefined` when the bundle has none. */
export const readVendor = (files: Files): ImportMap | undefined => {
  const source = text(files, VENDOR_MANIFEST_FILE);
  if (source === undefined) {
    return undefined;
  }
  const { specifiers }: { specifiers?: Record<string, string> } = JSON.parse(source);
  return Object.fromEntries(
    Object.entries(specifiers ?? {}).flatMap(([specifier, file]) => {
      const path = resolveRelative(VENDOR_MANIFEST_FILE, file);
      return path === undefined ? [] : [[specifier, path]];
    }),
  );
};

/**
 * Rewrites each bare import to the file `imports` maps it to, relative to the importing file: Worker Loader resolves a
 * bare specifier against the importing file's directory, never a package registry. Specifiers `imports` does not map
 * are left unchanged.
 */
export const rewriteImports = async (files: Files, imports: ImportMap): Promise<Record<string, Uint8Array>> => {
  const rewritten: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) {
    if (!JS_FILE.test(path)) {
      rewritten[path] = content;
      continue;
    }
    const source = decoder.decode(content);
    let output = source;
    const records = (await parseImports(source)).sort((left, right) => right.start - left.start);
    for (const { specifier, start, end, quoted } of records) {
      const target = specifier !== undefined && isBare(specifier) ? imports[specifier] : undefined;
      if (target !== undefined) {
        const replacement = relativePath(path, target);
        output = output.slice(0, start) + (quoted ? JSON.stringify(replacement) : replacement) + output.slice(end);
      }
    }
    rewritten[path] = output === source ? content : encoder.encode(output);
  }
  return rewritten;
};

/**
 * Keeps the `roots` and the files reachable from them by literal imports: the isolate holds every module it is given,
 * and the bundle's browser-only bodies, with the UI packages they pull into `vendor/`, never run on EDGE.
 */
const prune = async (
  files: Record<string, Uint8Array>,
  roots: readonly string[],
): Promise<Record<string, Uint8Array>> => {
  const kept = new Set(roots.filter((path) => files[path] !== undefined));
  const queue = [...kept].filter((path) => JS_FILE.test(path));
  for (let path = queue.pop(); path !== undefined; path = queue.pop()) {
    for (const { specifier } of await parseImports(decoder.decode(files[path]))) {
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

const prefixed = (prefix: string, path: string | undefined): string | undefined =>
  path === undefined ? undefined : `${prefix}${path}`;

/** The runtime EDGE runs a plugin in; a module that names its environments runs here only when it names this one. */
const RUNTIME = 'workerd';

/**
 * One bundle's plugin as main-module source: its manifest, and a loader for each body and adapter of a module that runs
 * on workerd, keyed by the URL the manifest gives it, with the paths those loaders import. The loaders import literal
 * paths, since a computed specifier cannot resolve in Worker Loader: a body or local adapter by its path under
 * `prefix`, an adapter's bare specifier by the file the import map gives it.
 */
const pluginSource = (
  bundle: Files,
  prefix: string,
  imports: ImportMap,
): { readonly source: string; readonly paths: readonly string[] } => {
  const manifestJson = text(bundle, MANIFEST_FILE) ?? '{}';
  const manifest: { modules?: { url: string; adapter?: { url: string }; environments?: string[] }[] } =
    JSON.parse(manifestJson);
  const runsHere = ({ environments }: { environments?: string[] }) =>
    environments === undefined || environments.includes(RUNTIME);
  const loaders = (manifest.modules ?? []).filter(runsHere).flatMap(({ url, adapter }) => {
    const body = resolveRelative(MANIFEST_FILE, url);
    const adapterPath = !adapter
      ? undefined
      : isBare(adapter.url)
        ? imports[adapter.url]
        : prefixed(prefix, resolveRelative(MANIFEST_FILE, adapter.url));
    return [
      ...(body === undefined ? [] : [[url, `${prefix}${body}`]]),
      ...(adapter && adapterPath ? [[adapter.url, adapterPath]] : []),
    ];
  });
  const entries = loaders.map(([key, path]) => `${JSON.stringify(key)}: () => import(${JSON.stringify(`./${path}`)})`);
  return {
    source: `{ manifest: ${manifestJson}, loaders: { ${entries.join(', ')} } }`,
    paths: loaders.map(([, path]) => path),
  };
};

/** What Worker Loader runs for a bundle: its rewritten files, the main module's name and source. */
export type WorkerCode = {
  readonly files: Record<string, Uint8Array>;
  readonly mainModule: string;
  readonly main: string;
};

/**
 * The modules a Dynamic Worker loads for a plugin bundle: its files with every bare import rewritten through its
 * `vendor/` import map, and a main module that builds the plugin from its manifest, starts the vendored `PluginHost`
 * and exports its `describe` and `invoke` as a `PluginProtocol.Entrypoint`. A plugin runs alone on EDGE: another
 * plugin's package it imports is vendored like any other.
 */
export const workerCode = async (files: Files): Promise<WorkerCode> => {
  const imports: Record<string, string> = { ...readVendor(files) };
  const host = imports[HOST_SPECIFIER];
  const { source: plugin, paths } = pluginSource(files, '', imports);
  const main = [
    "import { WorkerEntrypoint } from 'cloudflare:workers';",
    'let host;',
    // A host that predates versioning exports no `PROTOCOL_VERSION`.
    'let protocolVersion;',
    // Imported inside a request: module evaluation runs in global scope, where workerd disallows timers. `env` is the
    // isolate's, the same on every call, so the plugin is made once with its `PLUGIN_OPTIONS`.
    'const getHost = async (env) => {',
    '  if (host === undefined) {',
    // Without a vendored host the bundle still loads, so its modules can be checked; only starting the plugin fails.
    host === undefined
      ? `    throw new Error(${JSON.stringify(`vendor/ does not provide ${HOST_SPECIFIER}, which EDGE starts the plugin with.`)});`
      : `    const { PluginHost } = await import('./${host}');`,
    `    const plugin = ${plugin};`,
    '    protocolVersion = PluginHost.PROTOCOL_VERSION ?? 1;',
    '    host ??= PluginHost.make(() => ({',
    '      primary: PluginHost.fromManifest(plugin.manifest, plugin.loaders, env?.PLUGIN_OPTIONS),',
    '    }));',
    '  }',
    '  return host;',
    '};',
    'export default class PluginEntrypoint extends WorkerEntrypoint {',
    // Workers RPC drops an error's stack, which is the whole diagnosis of a failed activation.
    '  async describe() {',
    '    try {',
    '      return await (await getHost(this.env)).describe();',
    '    } catch (error) {',
    '      throw new Error(String(error?.stack ?? error));',
    '    }',
    '  }',
    '  async invoke(request, scope) { return (await getHost(this.env)).invoke(request, this.env, scope); }',
    // Starting the host does not activate the plugin: that happens on the first describe or invoke.
    '  async protocolVersion() {',
    '    await getHost(this.env);',
    '    return protocolVersion;',
    '  }',
    '}',
  ].join('\n');
  return {
    files: await prune(await rewriteImports(files, imports), host === undefined ? paths : [...paths, host]),
    mainModule: MAIN_MODULE,
    main,
  };
};

/** A Worker Loader module: source text, or a `.wasm` file's bytes. */
export type LoaderModule = { readonly js: string } | { readonly wasm: ArrayBuffer };

/** The `modules` of a Worker Loader `WorkerCode` for {@link workerCode}'s output; source maps are left out. */
export const toLoaderModules = ({ files, mainModule, main }: WorkerCode): Record<string, LoaderModule> => ({
  [mainModule]: { js: main },
  ...Object.fromEntries(
    Object.entries(files).flatMap(([path, content]): [string, LoaderModule][] =>
      JS_FILE.test(path)
        ? [[path, { js: decoder.decode(content) }]]
        : path.endsWith('.wasm')
          ? [[path, { wasm: toArrayBuffer(content) }]]
          : [],
    ),
  ),
});

const toArrayBuffer = (content: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(content.byteLength);
  new Uint8Array(buffer).set(content);
  return buffer;
};
