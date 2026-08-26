//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Rollup, type Plugin as VitePlugin } from 'vite';

import { parseJsonc } from '../../core/jsonc.ts';

/** Filename every plugin publishes next to its `package.json`. */
export const DXPLUGIN_FILENAME = 'dxplugin.jsonc';

/** The descriptor as a build emits it: plain JSON, `src` pointing at the chunks that shipped. */
export const DXPLUGIN_BUILT_FILENAME = 'dxplugin.json';

/** Vite's escape hatch for a path outside the project root. */
const FS_PREFIX = '/@fs/';

/**
 * Descriptor as the dev server serves it over HTTP: strict JSON, so `res.json()` and a native JSON
 * module both work, and `src` left relative — resolved against the descriptor's own URL it already
 * names a path the dev server transforms on demand.
 */
const serialized = (raw: unknown): string => {
  const { modules, profile } = readDescriptor(raw);
  const { $schema: _schema, ...rest } = profile;
  return `${JSON.stringify({ ...rest, modules }, null, 2)}\n`;
};

/** A descriptor module, as the loader needs it: anything else on the entry rides through untouched. */
type RawModule = { src: string } & Record<string, unknown>;

const isModule = (value: unknown): value is RawModule =>
  typeof value === 'object' && value !== null && 'src' in value && typeof value.src === 'string';

/** Restores the leading separator `/@fs/` consumed, leaving a Windows drive path alone. */
const fsPathFromPrefixed = (path: string): string => (/^[A-Za-z]:/.test(path) ? path : `/${path}`);

/**
 * Narrows the parsed descriptor structurally rather than against the schema: keeping the loader
 * schema-free is what lets `vite.base.config.ts` import it by path without a build-order dependency
 * on this package. `Plugin.fromManifest` validates against `Config2.Descriptor` at load time.
 */
const readDescriptor = (raw: unknown): { modules: RawModule[]; profile: Record<string, unknown> } => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Plugin descriptor is not an object.');
  }
  const entries = Object.entries({ ...raw });
  const declared = entries.find(([key]) => key === 'modules')?.[1];
  const profile = Object.fromEntries(entries.filter(([key]) => key !== 'modules'));
  const listed: unknown[] = Array.isArray(declared) ? declared : [];
  const modules = listed.filter(isModule);
  if (modules.length !== listed.length) {
    throw new Error('Every plugin descriptor module must name a `src`.');
  }
  return { modules, profile };
};

/**
 * Declares a descriptor's modules as build entrypoints and reserves the asset its URL will point at.
 * The asset's source is withheld until `generateBundle`, where the chunks finally have filenames.
 */
const emitDescriptor = (
  ctx: Pick<Rollup.PluginContext, 'emitFile'>,
  path: string,
  fileName?: string,
): { asset: string; profile: Record<string, unknown>; modules: { module: RawModule; ref: string }[] } => {
  const { modules, profile } = readDescriptor(parseJsonc(readFileSync(path, 'utf-8')));
  const dir = dirname(path);
  return {
    // Source is a placeholder: rolldown has no `setAssetSource`, so the real JSON is written over
    // this entry in `generateBundle`, once `getFileName` can name the chunks.
    asset: ctx.emitFile({
      type: 'asset',
      source: '{}',
      ...(fileName ? { fileName } : { name: DXPLUGIN_BUILT_FILENAME }),
    } satisfies Rollup.EmittedAsset),
    profile,
    modules: modules.map((module) => ({
      module,
      // Declared rather than inferred from an `import()`: a module reachable only through a
      // descriptor would otherwise be tree-shaken away.
      ref: ctx.emitFile({ type: 'chunk', id: resolve(dir, module.src), preserveSignature: 'exports-only' }),
    })),
  };
};

/**
 * Loader for `dxplugin.jsonc` plugin descriptors, modelled on vite's own HTML handling: a
 * descriptor is not an opaque asset but a *document that references modules*, so the loader walks
 * its `modules[].src` list and hands each referenced file to vite as a first-class module.
 *
 * - **dev** — each `src` is rewritten to a URL the dev server already serves (`/@fs/<abs path>`),
 *   so the app's `await import(module.src)` hits the dev server and gets transformed-on-demand
 *   source, with HMR intact and no bundling step.
 * - **build** — each `src` is emitted as a build entrypoint (`this.emitFile({ type: 'chunk' })`)
 *   and rewritten to `import.meta.ROLLUP_FILE_URL_*`, which resolves at runtime to the built
 *   chunk's URL — the `.ts` paths become the `.js` assets that actually ship. The chunk is
 *   *declared* rather than inferred from an `import()` expression, so a module reachable only
 *   through a descriptor is never tree-shaken away.
 *
 * The descriptor stays **data**: importing one yields its URL, never a module wrapping it, so a
 * plugin built here and a plugin fetched from anywhere are loaded by the same code path —
 * `Plugin.loadManifest(url)`. The dev server answers a plain GET on that URL with strict JSON.
 */
export type DxPluginManifestOptions = {
  /**
   * Descriptor to build as a first-class input, relative to the project root. Its modules become
   * build entrypoints and a resolved `dxplugin.json` is emitted beside them, so a plugin's built
   * output stands on its own instead of only materializing where some module happens to import it.
   * Defaults to a `dxplugin.jsonc` at the project root, when one exists.
   */
  manifest?: string;
};

export const dxPluginManifest = (options: DxPluginManifestOptions = {}): VitePlugin => {
  let isBuild = false;
  let manifestPath: string | undefined;
  // Descriptors awaiting their asset source: chunk filenames only exist once the bundle is written,
  // so each emitted descriptor holds its modules' reference ids until `generateBundle` resolves them.
  const pending: { asset: string; profile: Record<string, unknown>; modules: { module: RawModule; ref: string }[] }[] =
    [];

  return {
    name: '@dxos/vite-plugin-dxplugin',
    // Ahead of vite's JSON plugin, which would otherwise claim the file and choke on its comments.
    enforce: 'pre',

    // Served as data, not as a module: a plain GET — a browser navigation, `curl`, or a host fetching
    // a plugin it was pointed at — has to answer with the descriptor itself. Vite's static middleware
    // would otherwise hand back the raw JSONC, which no `JSON.parse` accepts.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const [pathname] = (req.url ?? '').split('?');
        if (!pathname.endsWith(DXPLUGIN_FILENAME)) {
          next();
          return;
        }

        const decoded = decodeURIComponent(pathname);
        const path = decoded.startsWith(FS_PREFIX)
          ? // `/@fs/` strips to an absolute path on POSIX and to `C:/…` on Windows; neither keeps the slash.
            fsPathFromPrefixed(decoded.slice(FS_PREFIX.length))
          : join(server.config.root, decoded);

        // Checked against `server.fs.allow` inline rather than through vite's own helper, because
        // importing a *value* from vite would make it a runtime dependency of this file — and staying
        // dependency-free is what lets `vite.base.config.ts` import the loader by path.
        const allow = server.config.server.fs?.allow ?? [];
        if (!existsSync(path) || !allow.some((root) => !relative(root, path).startsWith('..'))) {
          next();
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(serialized(parseJsonc(readFileSync(path, 'utf-8'))));
      });
    },

    configResolved(config) {
      isBuild = config.command === 'build';
      const candidate = resolve(config.root ?? process.cwd(), options.manifest ?? DXPLUGIN_FILENAME);
      manifestPath = isBuild && existsSync(candidate) ? candidate : undefined;
    },

    // Declared here rather than inferred from an import: a plugin whose descriptor nothing imports
    // still has to ship its module chunks, since the descriptor is the entrypoint.
    buildStart() {
      if (!manifestPath) {
        return;
      }
      pending.push(emitDescriptor(this, manifestPath, DXPLUGIN_BUILT_FILENAME));
    },

    // JSON, not JSONC: the emitted copy is for hosts that fetch a published plugin and parse it with
    // whatever their runtime offers, so it must not require a comment-tolerant parser.
    generateBundle(_options, bundle) {
      for (const { asset, profile, modules } of pending) {
        // `$schema` is an authoring aid pointing into the workspace's `node_modules`; it means nothing
        // to a host that fetched this file, so it does not travel with the artifact.
        const { $schema: _schema, ...rest } = profile;
        const descriptor = {
          ...rest,
          modules: modules.map(({ module, ref }) => {
            const { src: _src, ...fields } = module;
            // Relative to the emitted descriptor, which sits at the bundle root beside the chunks.
            return { ...fields, src: `./${posix.normalize(this.getFileName(ref))}` };
          }),
        };
        const emitted = bundle[this.getFileName(asset)];
        if (emitted?.type === 'asset') {
          emitted.source = `${JSON.stringify(descriptor, null, 2)}\n`;
        }
      }
    },

    // A library build externalizes every non-relative import, and an externalized id never reaches
    // `load` — so a descriptor imported by its package specifier has to be resolved to its file here.
    async resolveId(id, importer) {
      if (!id.endsWith(DXPLUGIN_FILENAME)) {
        return null;
      }
      const resolved = await this.resolve(id, importer, { skipSelf: true });
      return resolved ? { id: resolved.id, external: false } : null;
    },

    load(id) {
      const [path] = id.split('?');
      if (!path.endsWith(DXPLUGIN_FILENAME)) {
        return null;
      }

      // The import yields a URL, not the descriptor: the data is fetched from it, so one code path
      // loads a plugin whether it was built here or published elsewhere.
      if (isBuild) {
        const { asset, profile, modules } = emitDescriptor(this, path);
        pending.push({ asset, profile, modules });
        return { code: `export default import.meta.ROLLUP_FILE_URL_${asset};\n`, moduleSideEffects: false };
      }

      // Only the browser dev server serves `/@fs/`; a node consumer (vitest, an SSR transform) reads
      // the file itself, so the dev form follows the environment rather than assuming a browser.
      const url =
        this.environment?.name === 'client' ? `${FS_PREFIX}${path.replace(/^\//, '')}` : pathToFileURL(path).href;
      return { code: `export default ${JSON.stringify(url)};\n`, moduleSideEffects: false };
    },
  };
};
