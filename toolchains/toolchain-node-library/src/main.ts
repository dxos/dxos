//
// Copyright 2021 DXOS.org
//

import chalk from 'chalk';
import * as fs from 'fs';
import { sync as glob } from 'glob';
import { join } from 'path';
import yargs, { Arguments } from 'yargs';

import { Config, defaults } from './config';
import { Project } from './project';
import { execCommand, execJest, execTool, execLint, execMocha, execScript } from './tools';

const PACKAGE_TIMEOUT = 10 * 60 * 1000;

// TODO(burdon): Replace console.log with process.stdout.write.

type Handler <T> = (argv: Arguments<T>) => Promise<void>;

/**
 * Wraps yargs handler.
 * @param title
 * @param handler
 * @param timeout
 * @param verbose
 */
function handler <T> (title: string, handler: Handler<T>, timeout = false, verbose = true): Handler<T> {
  return async function (argv: Arguments<T>) {
    const t = timeout && setTimeout(() => {
      process.stderr.write(chalk`{red error}: Timed out in ${PACKAGE_TIMEOUT / 1000}s\n`);
      process.exit(1);
    }, PACKAGE_TIMEOUT);

    const start = Date.now();
    verbose && console.log(chalk`\n{green.bold ${title} started}`);
    await handler(argv);
    verbose && console.log(chalk`\n{green.bold ${title} complete} in {bold ${Date.now() - start}} ms`);

    t && clearTimeout(t);
  };
}

interface BuildOptions {
  minify?: boolean
  verbose?: boolean
  watch?: boolean
}

/**
 * Builds the current package with protobuf definitoins (optional) and typescript.
 */
async function execBuild (config: Config, options: BuildOptions = {}) {
  const project = Project.load(config);

  if (project.packageJsonContents.eslintConfig && !project.packageJsonContents.toolchain?.allowExtendedEslintConfig) {
    process.stderr.write(chalk`{yellow warn}: eslint config in package.json is ignored.\n`);
  }

  try {
    fs.rmSync(join(project.packageRoot, config.protobuf.output), { recursive: true, force: true });
    fs.rmSync(join(project.packageRoot, config.tsc.output), { recursive: true, force: true });
  } catch (err: any) {
    process.stderr.write(err.message);
  }

  if (options.verbose) {
    process.stdout.write(`Config = ${JSON.stringify(config, undefined, 2)}\n`);
  }

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

  process.stdout.write(chalk`\n{green.bold Typescript}\n`);
  await execTool('tsc', options.watch ? ['--watch'] : []);
}

/**
 * Creates a bundled build of the current package.
 */
async function execBuildBundle (config: Config, options: BuildOptions = {}) {
  const project = Project.load(config);
  const { outdir } = project.esbuildConfig;

  fs.rmSync(join(project.packageRoot, outdir), { recursive: true, force: true });

  await execTool('tsc', ['--noEmit']);
  await execTool('esbuild-server', ['build']);

  if (options.minify) {
    const filename = project.entryPoint.split('/').slice(-1)[0];
    const name = filename.split('.')[0];

    fs.renameSync(join(outdir, name + '.js'), join(outdir, name + '.orig.js'));
    await execTool('terser', [join(outdir, name + '.orig.js'), '-o', join(outdir, name + '.js')]);
  }
}

/**
 * Creates a static build of the storybook for the current package.
 */
async function execBuildBook (config: Config, options: BuildOptions = {}) {
  const project = Project.load(config);
  const { outdir } = project.esbuildConfig;

  fs.rmSync(join(project.packageRoot, outdir), { recursive: true, force: true });

  await execTool('tsc', ['--noEmit']);
  await execTool('esbuild-server', ['book', '--build']);

  if (options.minify) {
    const name = 'index';

    fs.renameSync(join(outdir, name + '.js'), join(outdir, name + '.orig.js'));
    await execTool('terser', [join(outdir, name + '.orig.js'), '-o', join(outdir, name + '.js')]);
  }
}

/**
 * Runs the storybook for the current package.
 */
async function execBook () {
  await execTool('esbuild-server', ['book']);
}

/**
 * Runs a dev server for the current package.
 */
async function execStart () {
  // TODO(burdon): esbuild-server should warn if local public/html files (staticDir) are missing.
  await execTool('esbuild-server', ['dev']);
}

/**
 * Mocha/Jest tests.
 * @param config
 * @param userArgs
 */
async function execTest (config: Config, userArgs?: string[]) {
  const project = Project.load(config);

  if (project.packageJsonContents.jest) {
    process.stderr.write(chalk`{yellow warn}: jest config in package.json is ignored.\n`);
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
}

/**
 * Main yargs entry-point.
 */
// eslint-disable-next-line no-unused-expressions
yargs(process.argv.slice(2))

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
    'build:bundle',
    'Build a bundle for the package.',
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
      .strict(),
    handler('Tests', async () => {
      const project = Project.load(defaults);
      await execBuild(defaults);
      await execLint(project);
      await execTest(defaults);

      // Additional test steps execution placed here to allow to run tests without additional steps.
      // Additional test steps are executed by default only when build:test is run.
      for (const step of project.toolchainConfig.additionalTestSteps ?? []) {
        console.log(chalk`\n{green.bold ${step}}`);
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
    yargs => yargs
      .strict(),
    async () => {
      await execBook();
    }
  )

  .command(
    'start',
    'Run a dev server for the package.',
    yargs => yargs
      .strict(),
    async () => {
      await execStart();
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

  .argv;
