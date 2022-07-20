//
// Copyright 2021 DXOS.org
//

import chalk from 'chalk';
import { build, BuildOptions as EsbuildOptions } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import * as fs from 'fs';
import { sync as glob } from 'glob';
import { join } from 'path';
import { Arguments, Argv } from 'yargs';

import { FixMemdownPlugin, NodeGlobalsPolyfillPlugin, NodeModulesPlugin } from '@dxos/esbuild-plugins';

import { Config, defaults } from './config';
import { Project } from './project';
import { execCommand, execJest, execTool, execLint, execMocha, execScript } from './tools';

const PACKAGE_TIMEOUT = 10 * 60 * 1000;

const log = (str: string) => process.stdout.write(str);
const err = (str: string) => process.stderr.write(str);

export type Handler <T> = (argv: Arguments<T>) => Promise<void>;

/**
 * Wraps yargs handler.
 * @param title
 * @param handler
 * @param timeout
 * @param verbose
 */
export const handler = <T>(title: string, handler: Handler<T>, timeout = false, verbose = true): Handler<T> => async (argv: Arguments<T>) => {
  const t = timeout && setTimeout(() => {
    err(chalk`{red error}: Timed out in ${PACKAGE_TIMEOUT / 1000}s\n`);
    process.exit(1);
  }, PACKAGE_TIMEOUT);

  const start = Date.now();
  verbose && log(chalk`\n{green.bold ${title} started}`);
  await handler(argv);
  verbose && log(chalk`\n{green.bold ${title} complete} in {bold ${Date.now() - start}} ms\n`);

  t && clearTimeout(t);
};

export interface BuildOptions {
  minify?: boolean
  verbose?: boolean
  watch?: boolean
}

const buildProto = async (config: Config, project: Project) => {
  // Compile protocol buffer definitions.
  const protoFiles = glob(config.protobuf.src, { cwd: project.packageRoot });
  if (protoFiles.length > 0) {
    process.stdout.write(chalk`\n{green.bold Protobuf}\n`);

    // Substitution classes for protobuf parsing.
    const file = join(project.packageRoot, config.protobuf.substitutions);
    const substitutions = fs.existsSync(file) ? join(file) : undefined;

    await execTool('build-protobuf', [
      '-o', join(project.packageRoot, config.protobuf.output),
      ...(substitutions ? ['-s', substitutions] : []),
      ...protoFiles
    ]);
  }
};

/**
 * Builds the current package with protobuf definitoins (optional) and typescript.
 */
export const execBuild = async (config: Config, options: BuildOptions = {}) => {
  const project = Project.load(config);

  try {
    fs.rmSync(join(project.packageRoot, config.protobuf.output), { recursive: true, force: true });
    fs.rmSync(join(project.packageRoot, config.tsc.output), { recursive: true, force: true });
  } catch (err: any) {
    err(err.message);
  }

  if (options.verbose) {
    process.stdout.write(`Config = ${JSON.stringify(config, undefined, 2)}\n`);
  }

  await buildProto(config, project);
  process.stdout.write(chalk`\n{green.bold Typescript}\n`);
  await execTool('tsc', options.watch ? ['--watch'] : []);
};

export interface BundleOptions {
  polyfill?: boolean
}

export const execLibraryBundle = async (config: Config, options: BundleOptions = {}) => {
  const project = Project.load(config);
  const outdir = 'dist';
  const bundlePackages = project.toolchainConfig.bundlePackages ?? [];

  fs.rmSync(join(project.packageRoot, outdir), { recursive: true, force: true });

  await buildProto(config, project);
  await execTool('tsc', ['--emitDeclarationOnly']);

  const esbuildConfig: EsbuildOptions = {
    entryPoints: ['src/index.ts'],
    format: 'cjs',
    write: true,
    bundle: true,
    // https://esbuild.github.io/api/#log-override
    logOverride: {
      // @polkadot/api/augment/rpc was generating this warning.
      // It is specifically type related and has no effect on the final bundle behavior.
      'ignored-bare-import': 'info'
    },
    plugins: [
      nodeExternalsPlugin({ allowList: bundlePackages })
    ]
  };

  await build({
    ...esbuildConfig,
    outfile: `${outdir}/browser.js`,
    plugins: [
      ...esbuildConfig.plugins!,
      FixMemdownPlugin(),
      NodeModulesPlugin(),
      ...(options.polyfill ? [NodeGlobalsPolyfillPlugin()] : [])
    ]
  });

  await build({
    ...esbuildConfig,
    outdir,
    platform: 'node'
  });
};

/**
 * Creates a bundled build of the current package.
 */
export const execBuildBundle = async (config: Config, options: BuildOptions = {}) => {
  const project = Project.load(config);
  const outdir = project.esbuildConfig.outdir ?? defaults.esbuild.outdir;

  fs.rmSync(join(project.packageRoot, outdir), { recursive: true, force: true });

  await execTool('tsc', ['--noEmit']);
  await execTool('esbuild-server', ['build']);

  // TODO(burdon): Test terser vs esbuild --minify?

  if (options.minify) {
    const filename = project.entryPoint.split('/').slice(-1)[0];
    const name = filename.split('.')[0];

    fs.renameSync(join(outdir, name + '.js'), join(outdir, name + '.orig.js'));
    await execTool('terser', [join(outdir, name + '.orig.js'), '-o', join(outdir, name + '.js')]);
  }
};

/**
 * Creates a static build of the storybook for the current package.
 */
export const execBuildBook = async (config: Config, options: BuildOptions = {}) => {
  const project = Project.load(config);
  const outdir = project.esbuildConfig.book?.outdir ?? defaults.esbuild.book.outdir;

  fs.rmSync(join(project.packageRoot, outdir), { recursive: true, force: true });

  await execTool('tsc', ['--noEmit']);
  await execTool('esbuild-server', ['book', '--build']);

  if (options.minify) {
    const name = 'index';

    fs.renameSync(join(outdir, name + '.js'), join(outdir, name + '.orig.js'));
    await execTool('terser', [join(outdir, name + '.orig.js'), '-o', join(outdir, name + '.js')]);
  }
};

/**
 * Runs the storybook for the current package.
 */
export const execBook = async (userArgs?: string[]) => {
  await execTool('esbuild-server', ['book', ...userArgs ?? []]);
};

/**
 * Runs a dev server for the current package.
 */
export const execStart = async (userArgs?: string[]) => {
  // TODO(burdon): esbuild-server should warn if local public/html files (staticDir) are missing.
  await execTool('esbuild-server', ['dev', ...userArgs ?? []]);
};

/**
 * Mocha/Jest tests.
 */
export const execTest = async (config: Config, userArgs?: string[]) => {
  const project = Project.load(config);
  if (project.packageJsonContents.jest) {
    err(chalk`{yellow warn}: jest config in package.json is ignored.\n`);
  }

  const forceClose = project.toolchainConfig.forceCloseTests ?? false;
  const jsdom = project.toolchainConfig.jsdom ?? false;

  if (project.toolchainConfig.testingFramework === 'mocha') {
    process.stdout.write(chalk`\n{green.bold Mocha Tests}\n`);
    await execMocha({ userArgs, forceClose, jsdom, config: defaults });
  } else {
    process.stdout.write(chalk`\n{green.bold Jest Tests}\n`);
    await execJest({ project, userArgs, forceClose });
  }
};

/**
 * Builds core yargs commands for toolchain.
 * Returns yargs so it can be chained with custom commands.
 */
export const setupCoreCommands = (yargs: Argv) => (
  yargs
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      default: false
    })

  //
  // Build
  //

    .command<{ verbose?: boolean, watch?: boolean }>(
      'build',
      'Build the package.',
      yargs => yargs
        .option('watch', {
          alias: 'w',
          type: 'boolean',
          default: false
        })
        .strict(),
      async (argv) => {
        await execBuild(defaults, { verbose: argv.verbose, watch: argv.watch });
      }
    )

    .command(
      'bundle:library',
      'Build the library package.',
      yargs => yargs
        .option('polyfill', {
          type: 'boolean',
          default: false
        })
        .strict(),
      handler<{ polyfill: boolean }>('Bundle', async (argv) => {
        await execLibraryBundle(defaults, { polyfill: argv.polyfill });
      })
    )

    .command(
      'bundle:app',
      'Bundle the app package.',
      yargs => yargs
        .option('minify', {
          type: 'boolean',
          default: false
        })
        .strict(),
      handler<{ minify: boolean }>('Bundle', async (argv) => {
        await execBuildBundle(defaults, { minify: argv.minify });
      })
    )

    .command(
      'build:test',
      'build, lint, and test the package',
      yargs => yargs
        .option('bundle', {
          type: 'boolean',
          default: false
        })
        .option('polyfill', {
          type: 'boolean',
          default: false
        })
        .strict(),
      handler<{ bundle: boolean, polyfill: boolean }>('Tests', async (argv) => {
        const project = Project.load(defaults);
        argv.bundle
          ? await execLibraryBundle(defaults, { polyfill: argv.polyfill })
          : await execBuild(defaults);
        await execLint(project); // TODO(burdon): Make optional.
        await execTest(defaults);

        // Additional test steps execution placed here to allow to run tests without additional steps.
        // Additional test steps are executed by default only when build:test is run.
        for (const step of project.toolchainConfig.additionalTestSteps ?? []) {
          log(chalk`\n{green.bold ${step}}`);
          await execScript(project, step, []);
        }
      }, true)
    )

  //
  // ESBuild server/book
  // TODO(burdon): Out directory's index.html overwritten build build:bundle
  //

    .command(
      'build:book',
      'Build the storybook for the package.',
      yargs => yargs
        .option('minify', {
          type: 'boolean',
          default: false
        })
        .strict(),
      handler<{ minify: boolean }>('Build book', async (argv) => {
        await execBuildBook(defaults, { minify: argv.minify });
      })
    )

    .command(
      'book',
      'Run the storybook for the package.',
      yargs => yargs.parserConfiguration({ 'unknown-options-as-args': true }),
      async ({ _ }) => {
        await execBook(_.slice(1).map(String));
      }
    )

    .command(
      'start',
      'Run a dev server for the package.',
      yargs => yargs
        .strict(),
      async ({ _ }) => {
        await execStart(_.slice(1).map(String));
      }
    )

  //
  // Testing
  //

    .command(
      'test',
      'run tests',
      yargs => yargs.parserConfiguration({ 'unknown-options-as-args': true }),
      handler('Tests', async ({ _ }) => {
        await execTest(defaults, _.slice(1).map(String));
      }, true)
    )

  //
  // Lint
  //

    .command(
      'lint',
      'run linter',
      yargs => yargs.parserConfiguration({ 'unknown-options-as-args': true }),
      async ({ _ }) => {
        const project = Project.load(defaults);
        await execLint(project, _.slice(1).map(String));
      }
    )

  //
  // Run scripts.
  //

    .command<{ command: string }>(
      ['* <command>', 'run <command>'],
      'run script or a tool',
      yargs => yargs.parserConfiguration({ 'unknown-options-as-args': true }),
      async ({ command, _ }) => {
        const project = Project.load(defaults);
        if (project.packageJsonContents.scripts?.[command]) {
          await execCommand(project.packageJsonContents.scripts?.[command], _.map(String));
        } else {
          await execCommand(command, _.map(String));
        }
      }
    )
);
