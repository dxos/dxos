//
// Copyright 2026 DXOS.org
//

import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { type UserConfig } from 'tsdown';
import ts from 'typescript';

import { DEFAULT_LOG_META_TRANSFORM_SPEC, rolldownLogMetaPlugin } from './log-meta-plugin.ts';

export { DEFAULT_LOG_META_TRANSFORM_SPEC, rolldownLogMetaPlugin } from './log-meta-plugin.ts';

export interface DxTsdownOptions {
  /**
   * Entry points to build (default: ['src/index.ts']).
   */
  entry?: string[];
  /**
   * Target platforms (default: ['browser', 'node']).
   */
  platform?: Array<'browser' | 'node' | 'neutral'>;
  /**
   * Inject @dxos/node-std/globals into browser output (default: false).
   */
  injectGlobals?: boolean;
  /**
   * Import Buffer/process/global from @dxos/node-std (default: false).
   */
  importGlobals?: boolean;
  /**
   * npm packages to inline into the bundle (default: []).
   */
  bundlePackages?: string[];
  /**
   * JS output base directory (default: 'dist/lib').
   */
  outputPath?: string;
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
export const workspaceExternalPlugin = (bundlePkgs: string[]) =>
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
export const injectGlobalsPlugin = () =>
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
export const rawImportPlugin = () =>
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

/**
 * Handles `?url` import suffixes by resolving the file path and returning it
 * as a string export. This mirrors Vite's ?url handling for build contexts.
 */
export const urlImportPlugin = () =>
  ({
    name: 'dx-url-import',
    resolveId: {
      async handler(this: any, id: string, importer?: string) {
        if (!id.endsWith('?url')) {
          return;
        }
        const cleanId = id.slice(0, -4);
        if (!cleanId.startsWith('.') && !cleanId.startsWith('/')) {
          const resolved = await this.resolve(cleanId, importer, { skipSelf: true });
          if (!resolved || resolved.external) {
            return;
          }
          return { id: `\0url:${resolved.id}` };
        }
        const base = importer ? dirname(importer.replace(/\?.*/, '')) : process.cwd();
        const resolved = cleanId.startsWith('/') ? cleanId : join(base, cleanId);
        return { id: `\0url:${resolved}` };
      },
    },
    load: {
      async handler(id: string) {
        if (!id.startsWith('\0url:')) {
          return;
        }
        const filePath = id.slice(5);
        const fileName = filePath.split('/').pop()!;
        return { code: `export default ${JSON.stringify(fileName)}` };
      },
    },
  }) as any;

/**
 * Writes a standalone temp tsconfig for the DTS-generation pass.
 *
 * Using `extends` is intentionally avoided: the base tsconfig carries
 * `declarationDir` / `outDir` that conflict with the outDir we pass to tsc.
 * Instead we inline the minimum settings needed and resolve include/exclude
 * paths to absolute paths so the file works from an arbitrary temp directory.
 */
const writeDtsTsconfig = async (cwd: string): Promise<string> => {
  const tmp = await mkdtemp(join(tmpdir(), 'dx-tsdown-'));
  const tmpTsconfig = join(tmp, 'tsconfig.json');

  // Always compile only the src/ directory for declaration generation.
  const srcDir = resolve(cwd, 'src');

  const config = {
    compilerOptions: {
      target: 'esnext',
      module: 'preserve',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      declaration: true,
      emitDeclarationOnly: true,
      noEmitOnError: false,
      strict: true,
      skipLibCheck: true,
      resolvePackageJsonImports: true,
      resolvePackageJsonExports: true,
      allowImportingTsExtensions: true,
      composite: false,
      incremental: false,
      lib: ['DOM', 'ESNext'],
      types: ['node'],
      // Explicit rootDir so output is dist/types/index.d.ts (not dist/types/src/index.d.ts).
      rootDir: srcDir,
    },
    include: [srcDir],
    references: [],
  };

  await writeFile(tmpTsconfig, JSON.stringify(config, null, 2));
  return tmpTsconfig;
};

const TSC_FORMAT_HOST: ts.FormatDiagnosticsHost = {
  getCurrentDirectory: () => process.cwd(),
  getCanonicalFileName: (f) => f,
  getNewLine: () => '\n',
};

/**
 * Runs `tsc --emitDeclarationOnly` using the TypeScript compiler API.
 */
const runTscDts = async (tmpTsconfig: string, outDir: string): Promise<void> => {
  const configFile = ts.readConfigFile(tmpTsconfig, ts.sys.readFile);
  if (configFile.error) {
    console.error(ts.formatDiagnostic(configFile.error, TSC_FORMAT_HOST));
    return;
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, dirname(tmpTsconfig));
  const options: ts.CompilerOptions = {
    ...parsed.options,
    outDir,
    declarationDir: outDir,
    noEmit: false,
    emitDeclarationOnly: true,
    noEmitOnError: false,
  };

  await mkdir(outDir, { recursive: true });

  const host = ts.createCompilerHost(options, true);
  const program = ts.createProgram(parsed.fileNames, options, host);
  program.emit();

  const diag = ts.getPreEmitDiagnostics(program);
  const errors = [...diag].filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length > 0) {
    console.warn(`[dx-tsdown] tsc: ${errors.length} type error(s) (declarations still emitted)`);
  }

  // tsc emits .d.ts files next to source files when those files are outside
  // rootDir (e.g. data/ files dynamically imported from src/). Delete them.
  const srcDir = options.rootDir ?? '';
  await Promise.all(
    program
      .getSourceFiles()
      .filter((f) => !f.fileName.includes('/node_modules/') && !f.fileName.startsWith(srcDir))
      .map(async (f) => {
        const dtsPath = f.fileName.replace(/\.tsx?$/, '.d.ts');
        try {
          await access(dtsPath);
          await rm(dtsPath);
        } catch {
          // File doesn't exist — nothing to clean up.
        }
      }),
  );
};

const generateDts = async (cwd: string): Promise<void> => {
  const dtsTsconfig = await writeDtsTsconfig(cwd);
  const dtsTmpDir = join(dtsTsconfig, '..');
  const dtsOutDir = resolve(cwd, 'dist/types');
  try {
    await runTscDts(dtsTsconfig, dtsOutDir);
  } finally {
    await rm(dtsTmpDir, { recursive: true, force: true });
  }
};

const sharedConfig = (bundlePackages: string[]): Partial<UserConfig> => ({
  skipNodeModulesBundle: true,
  // Include trailing-slash variants (e.g. 'util/') so rolldown bundles them alongside 'util'.
  // Some packages use trailing-slash imports to bypass Vite aliases (e.g. node-std/src/util.js).
  noExternal: bundlePackages.length > 0 ? [...bundlePackages, ...bundlePackages.map((p) => `${p}/`)] : undefined,
  dts: false,
  report: false,
  fixedExtension: true,
  hash: false,
  clean: false,
  sourcemap: true,
  // Prefix internal rolldown chunks with "chunk-" so they never clash
  // case-insensitively with entry-point output files (e.g. ref.mjs vs Ref.mjs).
  outputOptions: { chunkFileNames: 'chunk-[name].mjs' },
});

/**
 * Creates tsdown UserConfig array for a DXOS package.
 *
 * Includes all standard DXOS plugins (workspace-external, raw-import, url-import,
 * log-meta) and triggers tsc declaration generation on success.
 */
export const defineConfig = (options: DxTsdownOptions = {}): UserConfig[] => {
  const {
    entry = ['src/index.ts'],
    platform = ['browser', 'node'],
    injectGlobals = false,
    importGlobals = false,
    bundlePackages = [],
    outputPath = 'dist/lib',
  } = options;

  const cwd = process.cwd();
  const logPlugin = rolldownLogMetaPlugin({ to_transform: DEFAULT_LOG_META_TRANSFORM_SPEC }) as any;
  const wsExternalPlugin = workspaceExternalPlugin(bundlePackages);
  const rawPlugin = rawImportPlugin();
  const urlPlugin = urlImportPlugin();

  const base = sharedConfig(bundlePackages);
  const configs: UserConfig[] = [];

  if (platform.includes('browser')) {
    const browserPlugins: any[] = [rawPlugin, urlPlugin, wsExternalPlugin, logPlugin];
    if (injectGlobals) {
      browserPlugins.push(injectGlobalsPlugin());
    }

    configs.push({
      ...base,
      entry,
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

  if (platform.includes('node')) {
    configs.push({
      ...base,
      entry,
      platform: 'node',
      format: 'esm',
      outDir: `${outputPath}/node-esm`,
      plugins: [rawPlugin, urlPlugin, wsExternalPlugin, logPlugin],
    });
  }

  if (platform.includes('neutral')) {
    configs.push({
      ...base,
      entry,
      platform: 'neutral',
      format: 'esm',
      outDir: `${outputPath}/neutral`,
      plugins: [rawPlugin, urlPlugin, wsExternalPlugin, logPlugin],
    });
  }

  // Run tsc DTS generation on success of the first config.
  if (configs.length > 0) {
    const prev = configs[0].onSuccess;
    configs[0] = {
      ...configs[0],
      onSuccess: async (resolvedConfig, signal) => {
        if (typeof prev === 'function') {
          await prev(resolvedConfig, signal);
        }
        await generateDts(cwd);
      },
    };
  }

  return configs;
};
