//
// Copyright 2026 DXOS.org
//

import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { PluginLoader } from '@dxos/edge-compute/plugin-loader';

import * as PluginBundle from './PluginBundle.ts';

const PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url));

/** Defined by `@dxos/blob/hosted`, which the host imports and a plugin does not install. */
const HOST_ONLY_EXPORT = 'createEdgeBlobBackend';

const requireHere = createRequire(import.meta.url);

/** Installs `target` at `<root>/node_modules/<name>` as a symlink, the way pnpm installs a dependency. */
const link = async (root: string, name: string, target: string) => {
  const path = join(root, 'node_modules', name);
  await mkdir(dirname(path), { recursive: true });
  await symlink(target, path, 'dir');
};

// A plugin outside the dxos workspace whose only `@dxos` dependency is the EDGE host, installed as pnpm installs it and
// built as `dx registry publish` builds it: the host's own dependencies sit beside its real directory, not the plugin.
describe('a plugin that depends only on the EDGE host', { timeout: 180_000 }, () => {
  let root: string;
  let files: PluginBundle.Files;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'plugin-builder-host-deps-'));

    // The host as pnpm's store holds it: its files in a directory of their own, each dependency linked beside it.
    const hostDir = await realpath(join(PACKAGE_DIR, 'node_modules', PluginLoader.HOST_SPECIFIER));
    const { dependencies } = JSON.parse(await readFile(join(hostDir, 'package.json'), 'utf8'));
    const store = join(root, 'store');
    const storeHost = join(store, 'node_modules', PluginLoader.HOST_SPECIFIER);
    await mkdir(storeHost, { recursive: true });
    await cp(join(hostDir, 'package.json'), join(storeHost, 'package.json'));
    await cp(join(hostDir, 'dist'), join(storeHost, 'dist'), { recursive: true });
    for (const name of Object.keys(dependencies)) {
      await link(store, name, await realpath(join(hostDir, 'node_modules', name)));
    }

    const plugin = join(root, 'plugin');
    await mkdir(join(plugin, 'src'), { recursive: true });
    await writeFile(
      join(plugin, 'package.json'),
      JSON.stringify({ name: 'host-deps-sample', version: '1.0.0', type: 'module' }),
    );
    await writeFile(
      join(plugin, 'dx.config.mjs'),
      "export default { plugin: { key: 'org.example.plugin.hostDeps', name: 'Host deps' } };\n",
    );
    await writeFile(join(plugin, 'src', 'plugin.tsx'), "export default 'host-deps';\n");
    await link(plugin, PluginLoader.HOST_SPECIFIER, storeHost);
    // Every bundle chunk carries the CJS `require` shim, which imports React; a Composer plugin installs it.
    for (const name of ['react', 'react-dom']) {
      await link(plugin, name, dirname(requireHere.resolve(`${name}/package.json`)));
    }

    const [{ build }, { composerPlugin }] = await Promise.all([
      import('vite'),
      import('@dxos/app-framework/vite-plugin'),
    ]);
    const cwd = process.cwd();
    process.chdir(plugin);
    try {
      await build({ root: plugin, configFile: false, logLevel: 'warn', plugins: composerPlugin() });
    } finally {
      process.chdir(cwd);
    }
    files = await PluginBundle.readBundle(join(plugin, 'dist'));
  }, 300_000);

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  test('vendors the host with the dependencies the plugin does not install', ({ expect }) => {
    const { problems, vendor } = PluginBundle.check(files);
    // The sample declares no modules, so only its manifest is incomplete; `vendor/` must resolve in full.
    expect(problems.filter(({ path }) => path !== PluginBundle.MANIFEST_FILE)).toEqual([]);
    expect(vendor?.specifiers[PluginLoader.HOST_SPECIFIER]).toBeDefined();
    const decoder = new TextDecoder();
    const vendored = Object.entries(files)
      .filter(([path]) => path.startsWith(PluginBundle.VENDOR_DIR) && path.endsWith('.mjs'))
      .map(([, content]) => decoder.decode(content));
    expect(vendored.some((source) => source.includes(`var ${HOST_ONLY_EXPORT} =`))).toBe(true);
  });
});
