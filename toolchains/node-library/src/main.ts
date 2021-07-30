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

function execBuild () {
  const project = Project.load();

  if (project.packageJsonContents.jest) {
    process.stderr.write(chalk`{yellow warn}: jest config in package.json is ignored\n`);
  }

  if (project.packageJsonContents.eslintConfig) {
    process.stderr.write(chalk`{yellow warn}: eslint config in package.json is ignored\n`);
  }

  const protoFiles = glob('src/proto/**/*.proto', { cwd: project.packageRoot });
  if (protoFiles.length > 0) {
    console.log(chalk.bold`\nprotobuf`);
    const substitutions = fs.existsSync(join(project.packageRoot, 'src/proto/substitutions.ts')) ? join(project.packageRoot, 'src/proto/substitutions.ts') : undefined;

    execTool('build-protobuf', [
      '-o',
      join(project.packageRoot, 'src/proto/gen'),
      ...(substitutions ? ['-s', substitutions] : []),
      ...protoFiles
    ]);
  }

  console.log(chalk.bold`\ntypescript`);
  execTool('tsc');
}

function execTest (additionalArgs?: string[]) {
  const project = Project.load();

  if (project.toolchainConfig.testingFramework === 'mocha') {
    console.log(chalk.bold`\nmocha`);
    execMocha(additionalArgs);
  } else {
    console.log(chalk.bold`\njest`);
    execJest(project, additionalArgs);
  }
}

// eslint-disable-next-line no-unused-expressions
yargs(process.argv.slice(2))
  .command(
    'build',
    'Build the package.',
    yargs => yargs
      .strict(),
    () => {
      const before = Date.now();
      execBuild();
      console.log(chalk`\n{green.bold BUILD COMPLETE} in {bold ${Date.now() - before}} ms`);
    }
  )
  .command(
    'build:test',
    'build, lint, and test the package',
    yargs => yargs
      .strict(),
    () => {
      const project = Project.load();

      const before = Date.now();
      execBuild();

      console.log(chalk.bold`\neslint`);
      execLint(project);

      execTest();

      console.log(chalk`\n{green.bold CHECK COMPLETE} in {bold ${Date.now() - before}} ms`);
    }
  )
  .command(
    'lint',
    'run linter',
    yargs => yargs.parserConfiguration({ 'unknown-options-as-args': true }),
    ({ _ }) => {
      const project = Project.load();
      execLint(project, _.slice(1).map(String));
    }
  )
  .command(
    'test',
    'run tests',
    yargs => yargs.parserConfiguration({ 'unknown-options-as-args': true }),
    ({ _ }) => {
      execTest(_.slice(1).map(String));
    }
  )
  .command<{ command: string }>(
    ['* <command>', 'run <command>'],
    'run script or a tool',
    yargs => yargs.parserConfiguration({ 'unknown-options-as-args': true }),
    ({ command, _ }) => {
      const project = Project.load();

      if (project.packageJsonContents.scripts?.[command]) {
        execCommand(project.packageJsonContents.scripts?.[command], _.map(String));
      } else {
        execCommand(command, _.map(String));
      }
    }
  )
  .argv;
