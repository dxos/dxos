//
// Copyright 2026 DXOS.org
//

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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
 * Marks all @dxos/* workspace packages as external before rolldown resolves them.
 *
 * rolldown follows pnpm symlinks to their real paths (e.g. node_modules/@dxos/keys
 * → packages/common/keys/src/index.ts). The real path doesn't contain "node_modules",
 * so skipNodeModulesBundle's regex check misses it and the package gets bundled.
 * This plugin intercepts at the specifier level — before any path resolution — and
 * returns external:true for all @dxos/* imports that are not explicitly bundled.
 */
const workspaceExternalPlugin = (bundlePkgs: string[]) =>
  ({
    name: 'dx-workspace-external',
    resolveId: {
      order: 'pre' as const,
      handler(id: string) {
        if (id.startsWith('@dxos/') && !bundlePkgs.some((p) => id === p || id.startsWith(`${p}/`))) {
          return { id, external: true };
        }
      },
    },
  }) as any;

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

/**
 * Handles `?raw` import suffixes (Vite convention) by loading the file as a
 * plain string and re-exporting it as the default export.
 *
 * Supports both relative paths (`./shader.glsl?raw`) and package subpath
 * imports (`#query-lite?raw`) by delegating non-relative specifiers to
 * rolldown's own resolver before wrapping the result.
 */
const rawImportPlugin = () =>
  ({
    name: 'dx-raw-import',
    resolveId: {
      async handler(this: any, id: string, importer?: string) {
        if (!id.endsWith('?raw')) {
          return;
        }
        const cleanId = id.slice(0, -4);
        // For bare specifiers and package subpath imports (#...) delegate to
        // rolldown's resolver so package.json "imports" / "exports" are honoured.
        if (!cleanId.startsWith('.') && !cleanId.startsWith('/')) {
          const resolved = await this.resolve(cleanId, importer, { skipSelf: true });
          if (!resolved || resolved.external) {
            return;
          }
          return { id: `\0raw:${resolved.id}` };
        }
        // Relative or absolute path — compute directly.
        const base = importer ? dirname(importer.replace(/\?.*/, '')) : process.cwd();
        const resolved = cleanId.startsWith('/') ? cleanId : join(base, cleanId);
        return { id: `\0raw:${resolved}` };
      },
    },
    load: {
      async handler(id: string) {
        if (!id.startsWith('\0raw:')) {
          return;
        }
        const filePath = id.slice(5);
        const content = await readFile(filePath, 'utf8');
        return { code: `export default ${JSON.stringify(content)}` };
      },
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
  const resolveGlobs = (arr?: string[]) => (arr ?? ['src']).map((p) => (p.startsWith('/') ? p : resolve(cwd, p)));

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

  const wsExternalPlugin = workspaceExternalPlugin(bundlePackages);
  const rawPlugin = rawImportPlugin();

  if (platforms.includes('browser')) {
    const browserPlugins: any[] = [rawPlugin, wsExternalPlugin, logPlugin];
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
      plugins: [rawPlugin, wsExternalPlugin, logPlugin],
    });
  }

  if (platforms.includes('neutral')) {
    configs.push({
      ...sharedConfig,
      entry: entryPoints,
      platform: 'neutral',
      format: 'esm',
      outDir: `${outputPath}/neutral`,
      plugins: [rawPlugin, wsExternalPlugin, logPlugin],
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
      // Use tsc resolver so TypeScript uses the `types` export condition (pre-built .d.ts)
      // instead of OXC which picks up the `source` condition and resolves to .ts source files
      // in sibling workspace packages — which tsgo cannot process.
      resolver: 'tsc',
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
