//
// Copyright 2021 DXOS.org
//

import chalk from 'chalk';
import * as fs from 'fs';
import { sync as glob } from 'glob';
import { join } from 'path';
import yargs from 'yargs';

import { Project } from './project';
import { execCommand, execTool } from './tools/common';
import { execJest } from './tools/jest';
import { execLint } from './tools/lint';
import { execMocha } from './tools/mocha';
import { execPackageScript } from './tools/packageScript';

const PACKAGE_TIMEOUT = 10 * 60 * 1000;

interface BuildOptions {
  watch?: boolean
}

/**
 * Builds the current package with protobuf definitoins (optional) and typescript.
 *
 * @param opts.watch Keep tsc running in watch mode.
 */
async function execBuild (opts: BuildOptions = {}) {
  const project = Project.load();

  if (project.packageJsonContents.jest) {
    process.stderr.write(chalk`{yellow warn}: jest config in package.json is ignored\n`);
  }

  if (project.packageJsonContents.eslintConfig && !project.packageJsonContents.toolchain?.allowExtendedEslintConfig) {
    process.stderr.write(chalk`{yellow warn}: eslint config in package.json is ignored\n`);
  }

  try {
    fs.rmSync(join(project.packageRoot, 'src/proto/gen'), { recursive: true, force: true });
  } catch (err: any) {
    console.log(err.message);
  }

  try {
    fs.rmSync(join(project.packageRoot, 'dist'), { recursive: true, force: true });
  } catch (err: any) {
    console.log(err.message);
  }

  // Compile protocol buffer definitions.
  const protoFiles = glob('src/proto/**/*.proto', { cwd: project.packageRoot });
  if (protoFiles.length > 0) {
    console.log(chalk.bold`\nprotobuf`);

    // TODO(burdon): Document this.
    const substitutions = fs.existsSync(join(project.packageRoot, 'src/proto/substitutions.ts'))
      ? join(project.packageRoot, 'src/proto/substitutions.ts')
      : undefined;

    await execTool('build-protobuf', [
      '-o',
      join(project.packageRoot, 'src/proto/gen'),
      ...(substitutions ? ['-s', substitutions] : []),
      ...protoFiles
    ]);
  }

  console.log(chalk.bold`\ntypescript`);
  await execTool('tsc', opts.watch ? ['--watch'] : []);
}

async function execTest (userArgs?: string[]) {
  const project = Project.load();
  const forceClose = project.toolchainConfig.forceCloseTests ?? false;
  const jsdom = project.toolchainConfig.jsdom ?? false;

  if (project.toolchainConfig.testingFramework === 'mocha') {
    console.log(chalk.bold`\nmocha`);
    await execMocha({ userArgs, forceClose, jsdom });
  } else {
    console.log(chalk.bold`\njest`);
    await execJest({ project, userArgs, forceClose });
  }
}

/**
 * Creates a bundled build of the current package.
 */
async function execBuildBundle () {
  await execTool('tsc', ['--noEmit']);
  await execTool('esbuild-server', ['build']);
}

/**
 * Creates a static build of the storybook for the current package.
 */
async function execBuildBook () {
  await execTool('tsc', ['--noEmit']);
  await execTool('esbuild-server', ['book', '--build']);
}

/**
 * Runs the storybook for the current package.
 */
async function execBook () {
  await execTool('esbuild-server', ['book']);
}

function setPackageTimeout () {
  const id = setTimeout(() => {
    process.stderr.write(chalk`{red error}: Timed out in ${PACKAGE_TIMEOUT / 1000}s\n`);
    process.exit(1);
  }, PACKAGE_TIMEOUT);

  return () => clearTimeout(id);
}

// eslint-disable-next-line no-unused-expressions
yargs(process.argv.slice(2))
  .command<{ watch?: boolean }>(
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
      const before = Date.now();
      await execBuild({ watch: argv.watch });
      console.log(chalk`\n{green.bold BUILD COMPLETE} in {bold ${Date.now() - before}} ms`);
    }
  )
  .command(
    'build:test',
    'build, lint, and test the package',
    yargs => yargs
      .strict(),
    async () => {
      const project = Project.load();

      const clear = setPackageTimeout();

      const before = Date.now();
      await execBuild();

      console.log(chalk.bold`\neslint`);
      await execLint(project);

      await execTest();

      // Additional test steps execution placed here to allow to run tests without additional steps.
      // Additional test steps are executed by default only when build:test is run.
      for (const step of project.toolchainConfig.additionalTestSteps ?? []) {
        console.log(chalk.bold`\n${step}`);
        await execPackageScript(project, step, []);
      }

      console.log(chalk`\n{green.bold CHECK COMPLETE} in {bold ${Date.now() - before}} ms`);
      clear();
    }
  )
  .command(
    'build:bundle',
    'Build a bundle for the package.',
    yargs => yargs
      .strict(),
    async () => {
      const before = Date.now();
      await execBuildBundle();
      console.log(chalk`\n{green.bold BUILD COMPLETE} in {bold ${Date.now() - before}} ms`);
    }
  )
  .command(
    'build:book',
    'Build the storybook for the package.',
    yargs => yargs
      .strict(),
    async () => {
      const before = Date.now();
      await execBuildBook();
      console.log(chalk`\n{green.bold BUILD COMPLETE} in {bold ${Date.now() - before}} ms`);
    }
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
    'lint',
    'run linter',
    yargs => yargs.parserConfiguration({ 'unknown-options-as-args': true }),
    async ({ _ }) => {
      const project = Project.load();
      await execLint(project, _.slice(1).map(String));
    }
  )
  .command(
    'test',
    'run tests',
    yargs => yargs.parserConfiguration({ 'unknown-options-as-args': true }),
    async ({ _ }) => {
      const clear = setPackageTimeout();

      await execTest(_.slice(1).map(String));
      clear();
    }
  )
  .command<{ command: string }>(
    ['* <command>', 'run <command>'],
    'run script or a tool',
    yargs => yargs.parserConfiguration({ 'unknown-options-as-args': true }),
    async ({ command, _ }) => {
      const project = Project.load();

      if (project.packageJsonContents.scripts?.[command]) {
        await execCommand(project.packageJsonContents.scripts?.[command], _.map(String));
      } else {
        await execCommand(command, _.map(String));
      }
    }
  )
  .argv;
