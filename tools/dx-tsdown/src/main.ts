//
// Copyright 2026 DXOS.org
//

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build, type UserConfig } from 'tsdown';

import { DEFAULT_LOG_META_TRANSFORM_SPEC, rolldownLogMetaPlugin } from './log-meta-plugin.ts';

export interface TsdownExecutorOptions {
  entryPoints: string[];
  outputPath: string;
  platforms: Array<'browser' | 'node' | 'neutral'>;
  injectGlobals: boolean;
  importGlobals: boolean;
  bundlePackages: string[];
}

// Node globals shimmed for browser environments.
const NODE_GLOBALS = ['global', 'Buffer', 'process'] as const;

/**
 * Prepends `import "@dxos/node-std/globals"` to every browser output chunk.
 * Equivalent to dx-compile's --injectGlobals flag.
 */
const injectGlobalsPlugin = () =>
  ({
    name: 'dx-inject-globals',
    renderChunk(code: string) {
      return { code: 'import "@dxos/node-std/globals";\n' + code };
    },
  }) as any;

const cleanDir = async (path: string) => {
  await rm(path, { recursive: true, force: true });
};

/**
 * Writes a standalone temp tsconfig for the tsgo DTS-generation pass.
 *
 * Using `extends` is intentionally avoided: the base tsconfig carries
 * `declarationDir` / `outDir` which conflict with the `--outDir` flag that
 * rolldown-plugin-dts passes to tsgo, causing tsgo to silently emit nothing.
 * Instead we inline the minimum settings tsgo needs and resolve include paths
 * to absolute paths so the file works from an arbitrary temp directory.
 */
const writeTsgoTsconfig = async (cwd: string): Promise<string> => {
  const pkgTsconfig = resolve(cwd, 'tsconfig.json');
  let base: Record<string, any> = {};
  try {
    base = JSON.parse(await readFile(pkgTsconfig, 'utf8'));
  } catch {
    // no tsconfig — tsgo will use defaults
  }

  const tmp = await mkdtemp(join(tmpdir(), 'dx-tsdown-'));
  const tmpTsconfig = join(tmp, 'tsconfig.json');

  // Resolve include paths to absolute so they still point to the package
  // sources when the config is loaded from the temp dir.
  const resolveGlobs = (arr?: string[]) =>
    (arr ?? ['src']).map((p) => (p.startsWith('/') ? p : resolve(cwd, p)));

  const config = {
    compilerOptions: {
      // Minimum subset tsgo needs to emit declarations without needing full type graph.
      target: 'esnext',
      module: 'preserve',
      moduleResolution: 'bundler',
      declaration: true,
      emitDeclarationOnly: true,
      strict: true,
      skipLibCheck: true,
      resolvePackageJsonImports: true,
      resolvePackageJsonExports: true,
      allowImportingTsExtensions: true,
      composite: false,
      incremental: false,
      // Do NOT include declarationDir or outDir: --outDir from rolldown-plugin-dts
      // takes effect only when neither is set in the config.
    },
    include: resolveGlobs(base.include),
    references: [],
  };

  await writeFile(tmpTsconfig, JSON.stringify(config, null, 2));
  return tmpTsconfig;
};

export default async (options: TsdownExecutorOptions): Promise<{ success: boolean }> => {
  const { entryPoints, outputPath, platforms, injectGlobals, importGlobals, bundlePackages } = options;
  const cwd = process.cwd();

  const dirsToClear: string[] = [];
  if (platforms.includes('browser')) {
    dirsToClear.push(`${outputPath}/browser`);
  }
  if (platforms.includes('node')) {
    dirsToClear.push(`${outputPath}/node-esm`);
  }
  if (platforms.includes('neutral')) {
    dirsToClear.push(`${outputPath}/neutral`);
  }
  dirsToClear.push('dist/types');
  await Promise.all(dirsToClear.map(cleanDir));

  const logPlugin = rolldownLogMetaPlugin({ to_transform: DEFAULT_LOG_META_TRANSFORM_SPEC }) as any;

  const sharedConfig: Partial<UserConfig> = {
    skipNodeModulesBundle: true,
    noExternal: bundlePackages.length > 0 ? bundlePackages : undefined,
    dts: false,
    report: false,
    fixedExtension: true,
    hash: false,
    clean: false,
    sourcemap: true,
  };

  const configs: UserConfig[] = [];

  if (platforms.includes('browser')) {
    const browserPlugins: any[] = [logPlugin];
    if (injectGlobals) {
      browserPlugins.push(injectGlobalsPlugin());
    }

    configs.push({
      ...sharedConfig,
      entry: entryPoints,
      platform: 'browser',
      format: 'esm',
      outDir: `${outputPath}/browser`,
      plugins: browserPlugins,
      ...(importGlobals
        ? {
            inputOptions: {
              transform: {
                inject: Object.fromEntries(
                  NODE_GLOBALS.map((g) => [g, [`@dxos/node-std/inject-globals`, g] as [string, string]]),
                ),
              },
            },
          }
        : {}),
    });
  }

  if (platforms.includes('node')) {
    configs.push({
      ...sharedConfig,
      entry: entryPoints,
      platform: 'node',
      format: 'esm',
      outDir: `${outputPath}/node-esm`,
      plugins: [logPlugin],
    });
  }

  if (platforms.includes('neutral')) {
    configs.push({
      ...sharedConfig,
      entry: entryPoints,
      platform: 'neutral',
      format: 'esm',
      outDir: `${outputPath}/neutral`,
      plugins: [logPlugin],
    });
  }

  // DTS-only pass using tsgo via rolldown-plugin-dts.
  // emitDtsOnly strips JS chunks; outputs land in dist/types/ (no src/ prefix).
  const primaryPlatform: 'browser' | 'neutral' | 'node' = platforms.includes('browser')
    ? 'browser'
    : platforms.includes('neutral')
      ? 'neutral'
      : 'node';

  // tsgo silently produces no output when tsconfig has composite:true and
  // the referenced projects don't have pre-built composite artifacts.
  // Write a temp tsconfig with composite/references stripped out.
  const tsgoTsconfig = await writeTsgoTsconfig(cwd);
  const tsgoTmpDir = join(tsgoTsconfig, '..');

  configs.push({
    entry: entryPoints,
    platform: primaryPlatform,
    format: 'esm',
    outDir: 'dist/types',
    dts: {
      tsgo: true,
      emitDtsOnly: true,
      tsconfig: tsgoTsconfig,
    } as any,
    skipNodeModulesBundle: true,
    report: false,
    hash: false,
    clean: false,
  });

  try {
    // tsdown.build() takes a single InlineConfig; run configs concurrently.
    await Promise.all(configs.map((c) => build(c)));
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false };
  } finally {
    await rm(tsgoTmpDir, { recursive: true, force: true });
  }
};
