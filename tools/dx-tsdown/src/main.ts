//
// Copyright 2026 DXOS.org
//

import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { build, type UserConfig } from 'tsdown';
import ts from 'typescript';

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
  // Using the base tsconfig's include could pull in test/ or types/ directories
  // which makes tsc infer a rootDir of the package root, yielding
  // dist/types/src/index.d.ts instead of the expected dist/types/index.d.ts.
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
 *
 * Using the TypeScript API directly (rather than rolldown-plugin-dts's tsc
 * backend) avoids a visitor bug in rolldown-plugin-dts that crashes on get
 * accessor declarations ("Lexical environment is suspended").
 *
 * Errors are printed but do not prevent emit (noEmitOnError: false) so that
 * type errors in test/story files don't block the build.
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

  // Ensure the outDir exists so moon's missing_outputs check passes even
  // when there are no .ts source files to emit (e.g. JS-only packages).
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
  // rootDir (e.g. data/ files dynamically imported from src/). These are build
  // artifacts that don't belong in the source tree — delete them.
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
    // Prefix internal rolldown chunks with "chunk-" so they never clash
    // case-insensitively with entry-point output files (e.g. ref.mjs vs Ref.mjs).
    // esbuild de-duplicates modules by normalised (case-folded) path, so without
    // this prefix a second bundling pass (e.g. functions-runtime build-runtime)
    // confuses the two files and reports "No matching export" errors.
    outputOptions: { chunkFileNames: 'chunk-[name].mjs' },
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

  // DTS-only pass via the TypeScript compiler API.
  //
  // Neither tsgo nor rolldown-plugin-dts's tsc visitor is used:
  // - tsgo (alpha) incorrectly emits `__export` in .d.ts chunks for
  //   `export * as X from './module'` patterns, causing downstream
  //   EXPORT_UNDEFINED_VARIABLE errors.
  // - rolldown-plugin-dts's tsc visitor crashes with "Lexical environment
  //   is suspended" for classes that contain get accessors.
  //
  // Calling tsc's createProgram directly avoids both bugs.

  // tsc fails on composite projects whose referenced builds don't exist yet.
  // Write a temp tsconfig with composite/references stripped out.
  const dtsTsconfig = await writeDtsTsconfig(cwd);
  const dtsTmpDir = join(dtsTsconfig, '..');
  const dtsOutDir = resolve(cwd, 'dist/types');

  try {
    // Run JS builds and tsc DTS generation concurrently.
    await Promise.all([...configs.map((c) => build(c)), runTscDts(dtsTsconfig, dtsOutDir)]);
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false };
  } finally {
    await rm(dtsTmpDir, { recursive: true, force: true });
  }
};
