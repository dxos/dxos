//
// Copyright 2026 DXOS.org
//

import { PluginLoader } from '@dxos/edge-compute/plugin-loader';

import { loadBundle } from './load-bundle.ts';
import * as PluginBundle from './PluginBundle.ts';

const MB = 1024 * 1024;

/** What a bundle may cost EDGE to load, checked by {@link verifyBundle}. */
export type Budget = {
  /** Bytes of modules handed to Worker Loader; they and all they allocate share the isolate's 128 MB. */
  readonly moduleBytes: number;
  /** A cold load, import and activation (`describe()`), which EDGE abandons after 20 s; the margin absorbs a slower or busier host. */
  readonly activationMs: number;
};

export const DEFAULT_BUDGET: Budget = { moduleBytes: 32 * MB, activationMs: 15_000 };

const formatBytes = (bytes: number) => `${(bytes / MB).toFixed(1)} MB`;

/** What checking a built bundle found. */
export type Verification = {
  readonly problems: readonly PluginBundle.Problem[];
  /** One line on what was checked, for a passing bundle. */
  readonly summary: string;
};

/**
 * Checks a built plugin bundle as EDGE would take it: the static checks of {@link PluginBundle.check}, then, unless
 * `load` is false, loads it alone in workerd, imports each workerd module and, when `vendor/`
 * carries the host, calls `describe()` and reports an activation failure or a plugin that contributes nothing.
 * `requireHost` makes a bundle without the host a problem rather than a reason to skip `describe()`. A bundle whose
 * modules or cold load and activation exceed `budget` is a problem too.
 */
export const verifyBundle = async (
  dir: string,
  {
    load = true,
    requireHost = false,
    budget = DEFAULT_BUDGET,
  }: { load?: boolean; requireHost?: boolean; budget?: Budget } = {},
): Promise<Verification> => {
  const files = await PluginBundle.readBundle(dir);
  const { problems, roots, vendor } = PluginBundle.check(files);
  if (problems.length > 0 || !load) {
    return { problems, summary: `${Object.keys(files).length} files` };
  }

  const start = performance.now();
  await using bundle = await loadBundle(files);
  if (bundle.moduleBytes > budget.moduleBytes) {
    return {
      problems: [
        {
          path: PluginBundle.VENDOR_DIR,
          message: `loads ${formatBytes(bundle.moduleBytes)} of modules, over the ${formatBytes(budget.moduleBytes)} budget`,
        },
      ],
      summary: '',
    };
  }
  const failures = await bundle.importModules(roots);
  if (failures.length > 0) {
    return {
      problems: failures.map(({ path, message }) => ({ path, message: `does not import: ${message}` })),
      summary: '',
    };
  }
  const overTime = (what: string, elapsedMs: number): PluginBundle.Problem[] =>
    elapsedMs > budget.activationMs
      ? [
          {
            path: PluginBundle.MANIFEST_FILE,
            message: `${what} in ${elapsedMs} ms, over the ${budget.activationMs} ms budget`,
          },
        ]
      : [];
  if (!vendor?.specifiers[PluginLoader.HOST_SPECIFIER]) {
    if (requireHost) {
      return {
        problems: [
          { path: PluginBundle.VENDOR_MANIFEST_FILE, message: `does not provide ${PluginLoader.HOST_SPECIFIER}` },
        ],
        summary: '',
      };
    }
    return {
      problems: overTime('loads and imports', Math.round(performance.now() - start)),
      summary: `${roots.length} workerd modules imported (${formatBytes(bundle.moduleBytes)}); no vendored host, so describe() was not run`,
    };
  }
  const catalog = await bundle.describe();
  const activationMs = Math.round(performance.now() - start);
  const contributions = catalog.operations.length + catalog.skills.length + catalog.types.length;
  return {
    problems: [
      ...catalog.failures.map(({ id, phase, message }) => ({ path: id, message: `failed to ${phase}: ${message}` })),
      ...(contributions === 0
        ? [{ path: PluginBundle.MANIFEST_FILE, message: 'contributes no operations, skills or types on EDGE' }]
        : []),
      ...overTime('loads and activates', activationMs),
    ],
    summary: `${roots.length} workerd modules imported (${formatBytes(bundle.moduleBytes)}, activated in ${activationMs} ms); ${catalog.operations.length} operations, ${catalog.skills.length} skills, ${catalog.types.length} types`,
  };
};
