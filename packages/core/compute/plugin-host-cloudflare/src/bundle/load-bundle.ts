//
// Copyright 2026 DXOS.org
//

import { Miniflare } from 'miniflare';

import { type PluginProtocol } from '@dxos/protocols';

import * as PluginRelease from '../PluginRelease.ts';
import * as PluginBundle from './PluginBundle.ts';

/** Why one module failed to import. */
export type ImportFailure = { readonly path: string; readonly message: string };

/** A plugin bundle loaded into workerd through Worker Loader, as EDGE loads it, driven from Node. */
export interface LoadedBundle extends AsyncDisposable {
  /** Activates the plugin with the vendored host and returns what it contributes. */
  describe(): Promise<PluginProtocol.Catalog>;
  /** Imports each path of the bundle once and reports the ones that throw. */
  importModules(paths: readonly string[]): Promise<readonly ImportFailure[]>;
}

/** The main module that imports bundle paths one by one, for checking a bundle without its host. */
const IMPORT_MAIN = `
export default {
  async fetch(request) {
    const failures = [];
    for (const path of await request.json()) {
      try {
        await import('./' + path);
      } catch (error) {
        failures.push({ path, message: String(error?.stack ?? error) });
      }
    }
    return Response.json(failures);
  },
};
`;

/** A worker that loads the bundle it is bound to through Worker Loader and forwards each call to it. */
const LOADER_HOST = `
const decode = (base64) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

const load = (env, id, mainModule, main) =>
  env.LOADER.get(id, () => {
    const modules = { [mainModule]: { js: main } };
    for (const [path, content] of Object.entries(env.FILES)) {
      if (/\\.(js|mjs)$/.test(path)) {
        modules[path] = { js: new TextDecoder().decode(decode(content)) };
      } else if (path.endsWith('.wasm')) {
        modules[path] = { wasm: decode(content).buffer };
      }
    }
    return {
      compatibilityDate: env.COMPATIBILITY_DATE,
      compatibilityFlags: env.COMPATIBILITY_FLAGS,
      mainModule,
      modules,
      globalOutbound: null,
    };
  });

export default {
  async fetch(request, env) {
    const { method, paths } = await request.json();
    try {
      if (method === 'import') {
        return load(env, 'import', '__import__.js', env.IMPORT_MAIN).getEntrypoint().fetch('http://bundle/', {
          method: 'POST',
          body: JSON.stringify(paths),
        });
      }
      const result = await load(env, 'host', env.MAIN_MODULE, env.HOST_MAIN).getEntrypoint().describe();
      return Response.json({ result });
    } catch (error) {
      return Response.json({ error: String(error?.stack ?? error) }, { status: 500 });
    }
  },
};
`;

export type LoadBundleOptions = {
  /** The bundles of plugins the primary depends on, which share its `vendor/`. */
  dependencies?: readonly PluginBundle.Files[];
};

/**
 * Loads a plugin bundle through Worker Loader in a local workerd, exactly as EDGE's loader does: bare imports rewritten
 * to `vendor/`, `dependsOn` bundles beside it, and a main module that starts the vendored host.
 */
export const loadBundle = async (files: PluginBundle.Files, options: LoadBundleOptions = {}): Promise<LoadedBundle> => {
  const { problems, vendor } = PluginBundle.check(files);
  if (!vendor) {
    throw new Error(
      `The bundle has no ${PluginBundle.VENDOR_MANIFEST_FILE}: ${problems.map(({ message }) => message).join('; ')}`,
    );
  }
  const { files: modules, mainModule, main } = PluginBundle.workerCode(files, vendor, options.dependencies ?? []);
  const miniflare = new Miniflare({
    modules: true,
    script: LOADER_HOST,
    compatibilityDate: PluginRelease.COMPATIBILITY_DATE,
    compatibilityFlags: [...PluginRelease.COMPATIBILITY_FLAGS],
    workerLoaders: { LOADER: {} },
    bindings: {
      COMPATIBILITY_DATE: PluginRelease.COMPATIBILITY_DATE,
      COMPATIBILITY_FLAGS: [...PluginRelease.COMPATIBILITY_FLAGS],
      MAIN_MODULE: mainModule,
      HOST_MAIN: main,
      IMPORT_MAIN,
      FILES: Object.fromEntries(
        Object.entries(modules).map(([path, content]) => [path, Buffer.from(content).toString('base64')]),
      ),
    },
  });

  const call = async (method: 'describe' | 'import', paths?: readonly string[]): Promise<string> => {
    const response = await miniflare.dispatchFetch('http://bundle.local/', {
      method: 'POST',
      body: JSON.stringify({ method, paths }),
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`workerd answered ${response.status}: ${body}`);
    }
    return body;
  };

  return {
    describe: async () => {
      const { result }: { result: PluginProtocol.Catalog } = JSON.parse(await call('describe'));
      return result;
    },
    importModules: async (paths) => {
      const failures: ImportFailure[] = JSON.parse(await call('import', paths));
      return failures;
    },
    [Symbol.asyncDispose]: () => miniflare.dispose(),
  };
};
