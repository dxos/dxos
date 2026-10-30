//
// Copyright 2026 DXOS.org
//

import { loadBundle } from './load-bundle.ts';
import * as PluginBundle from './PluginBundle.ts';

/** What checking a built bundle found. */
export type Verification = {
  readonly problems: readonly PluginBundle.Problem[];
  /** One line on what was checked, for a passing bundle. */
  readonly summary: string;
};

/**
 * Checks a built plugin bundle as EDGE would take it: the static checks of {@link PluginBundle.check}, then, unless
 * `load` is false, loads it in workerd beside its dependency bundles, imports each workerd module and, when `vendor/`
 * carries the host, calls `describe()` and reports an activation failure or a plugin that contributes nothing.
 * `requireHost` makes a bundle without the host a problem rather than a reason to skip `describe()`.
 */
export const verifyBundle = async (
  dir: string,
  {
    dependencies = [],
    load = true,
    requireHost = false,
  }: { dependencies?: readonly string[]; load?: boolean; requireHost?: boolean } = {},
): Promise<Verification> => {
  const files = await PluginBundle.readBundle(dir);
  const { problems, roots, vendor } = PluginBundle.check(files);
  if (problems.length > 0 || !load) {
    return { problems, summary: `${Object.keys(files).length} files` };
  }

  const dependencyFiles = await Promise.all(dependencies.map((dependency) => PluginBundle.readBundle(dependency)));
  await using bundle = await loadBundle(files, { dependencies: dependencyFiles });
  const failures = await bundle.importModules(roots);
  if (failures.length > 0) {
    return {
      problems: failures.map(({ path, message }) => ({ path, message: `does not import: ${message}` })),
      summary: '',
    };
  }
  if (!vendor?.specifiers[PluginBundle.HOST_SPECIFIER]) {
    if (requireHost) {
      return {
        problems: [
          { path: PluginBundle.VENDOR_MANIFEST_FILE, message: `does not provide ${PluginBundle.HOST_SPECIFIER}` },
        ],
        summary: '',
      };
    }
    return {
      problems: [],
      summary: `${roots.length} workerd modules imported; no vendored host, so describe() was not run`,
    };
  }
  const catalog = await bundle.describe();
  const contributions = catalog.operations.length + catalog.skills.length + catalog.types.length;
  return {
    problems: [
      ...catalog.failures.map(({ id, phase, message }) => ({ path: id, message: `failed to ${phase}: ${message}` })),
      ...(contributions === 0
        ? [{ path: PluginBundle.MANIFEST_FILE, message: 'contributes no operations, skills or types on EDGE' }]
        : []),
    ],
    summary: `${roots.length} workerd modules imported; ${catalog.operations.length} operations, ${catalog.skills.length} skills, ${catalog.types.length} types`,
  };
};
