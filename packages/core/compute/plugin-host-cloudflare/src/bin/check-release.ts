//
// Copyright 2026 DXOS.org
//

/* eslint-disable no-console */

import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { checkRelease } from '../bundler/check-release.ts';

/**
 * Checks that a plugin package can be published to EDGE: for each `./<X>Plugin` export with a `workerd` build, bundles
 * the release, loads it through Worker Loader and fails when it is not self-contained, a module fails to activate, or
 * it contributes nothing.
 *
 * Usage: `check-release [--package <dir>] [--entry <file> [--dependency <file>]...] [--out <file>] [--release-dir <dir>]`.
 * `--entry` checks one module exporting a plugin's `make` instead of the package's exports, with `--dependency` naming
 * the plugins it may depend on; `--out` writes the manifest and catalog as JSON; `--release-dir` writes each release's
 * files to `<dir>/<pluginKey>/<version>/`, the layout registry-service publishes from.
 */
const main = async () => {
  const { values } = parseArgs({
    options: {
      'package': { type: 'string' },
      'entry': { type: 'string' },
      'dependency': { type: 'string', multiple: true },
      'out': { type: 'string' },
      'release-dir': { type: 'string' },
    },
  });
  const packageDir = resolve(values.package ?? process.cwd());
  const entryPoints = values.entry ? [resolve(values.entry)] : await workerdPluginEntries(packageDir);
  if (entryPoints.length === 0) {
    console.error(`${packageDir}: no ./<X>Plugin export with a workerd build`);
    process.exit(1);
  }

  const dependencies = values.entry
    ? (values.dependency ?? []).map((dependency) => resolve(dependency))
    : await dependencyPluginEntries(packageDir);
  const { version } = await readPackage(packageDir);
  const reports = [];
  let failed = false;
  for (const entryPoint of entryPoints) {
    const { files, manifest, catalog, moduleBytes, problems } = await checkRelease({
      entryPoint,
      dependencies,
      resolveDir: packageDir,
    });
    if (values['release-dir'] && problems.length === 0) {
      await writeRelease(join(values['release-dir'], catalog.plugin.key, version), files);
    }
    reports.push({ entryPoint, manifest, catalog, moduleBytes, problems });
    const summary = `${catalog.operations.length} operations, ${catalog.skills.length} skills, ${catalog.types.length} types`;
    if (problems.length > 0) {
      failed = true;
      console.error(`✗ ${entryPoint} (${summary})`);
      problems.forEach((problem) => console.error(`  - ${problem}`));
    } else {
      const size = `${(moduleBytes / 1024 / 1024).toFixed(1)} MiB in ${manifest.files.length} files`;
      console.log(`✓ ${entryPoint} (${summary}; ${size}; ${manifest.hash.slice(0, 12)})`);
    }
  }

  if (values.out) {
    await writeFile(values.out, JSON.stringify(reports, null, 2));
  }
  process.exit(failed ? 1 : 0);
};

/**
 * The workerd plugin entries of every plugin package this one depends on, transitively: the pool a release's
 * `dependsOn` closure is drawn from.
 */
const dependencyPluginEntries = async (packageDir: string): Promise<string[]> => {
  const visited = new Set<string>([await realpath(packageDir)]);
  const entries: string[] = [];
  const visit = async (dir: string) => {
    const { dependencies = {} } = await readPackage(dir);
    for (const name of Object.keys(dependencies).filter((name) => name.startsWith('@dxos/plugin-'))) {
      // Through `node_modules` rather than `require.resolve`: plugin packages do not export `./package.json`.
      const dependencyDir = await realpath(join(dir, 'node_modules', name));
      if (visited.has(dependencyDir)) {
        continue;
      }
      visited.add(dependencyDir);
      entries.push(...(await workerdPluginEntries(dependencyDir)));
      await visit(dependencyDir);
    }
  };
  await visit(packageDir);
  return entries;
};

const writeRelease = async (dir: string, files: Readonly<Record<string, Uint8Array>>): Promise<void> => {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), content);
  }
};

const readPackage = async (dir: string) => JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));

/** The built workerd files of the package's `./<X>Plugin` exports. */
const workerdPluginEntries = async (packageDir: string): Promise<string[]> => {
  const { exports = {} } = await readPackage(packageDir);
  return Object.entries<unknown>(exports).flatMap(([subpath, conditions]) => {
    const workerd =
      typeof conditions === 'object' && conditions !== null && 'workerd' in conditions ? conditions.workerd : undefined;
    return /^\.\/\w+Plugin$/.test(subpath) && typeof workerd === 'string' ? [join(packageDir, workerd)] : [];
  });
};

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
