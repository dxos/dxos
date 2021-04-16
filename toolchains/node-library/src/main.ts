//
// Copyright 2021 DXOS.org
//

import chalk from 'chalk';
import { spawnSync, SpawnSyncOptionsWithBufferEncoding } from 'child_process';
import * as fs from 'fs';
import { sync as glob } from 'glob';
import { join } from 'path';
import { sync as pkgDir } from 'pkg-dir';
import yargs from 'yargs';

const selfDir = pkgDir(__dirname)!;

function execTool (name: string, args: string[] = [], opts?: SpawnSyncOptionsWithBufferEncoding) {
  const before = Date.now();

  const child = spawnSync(`${selfDir}/node_modules/.bin/${name}`, args, { stdio: 'inherit', ...opts });
  if (child.status !== 0) {
    process.stderr.write(chalk`{red error}: ${name} exited with code ${child.status}\n`);
    process.exit(child.status ?? 1);
  } else {
    console.log(chalk`{green.bold OK} in {bold ${Date.now() - before}} ms`);
  }
}

function execCommand (command: string, args: string[]) {
  const before = Date.now();

  const child = spawnSync(command, args, {
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: `${selfDir}/node_modules/.bin:${process.cwd()}/node_modules/.bin:${process.env.PATH}`
    }
  });
  if (child.status !== 0) {
    process.stderr.write(chalk`{red error}: ${command} exited with code ${child.status}\n`);
    process.exit(child.status ?? 1);
  } else {
    console.log(chalk`{green.bold OK} in {bold ${Date.now() - before}} ms`);
  }
}

// eslint-disable-next-line no-unused-expressions
yargs(process.argv.slice(2))
  .command<{ light?: boolean }>(
    'build [--light]',
    'build, lint, and test the package',
    yargs => yargs
      .strict()
      .option('light', { type: 'boolean', description: 'don\'t run lint or test' }),
    ({ light }) => {
      const before = Date.now();

      const pkgDir = getPackageDir();

      const packageJson = JSON.parse(fs.readFileSync(join(getPackageDir(), 'package.json'), 'utf-8'));

      if (packageJson.jest) {
        process.stderr.write(chalk`{yellow warn}: jest config in package.json is ignored\n`);
      }

      if (packageJson.eslintConfig) {
        process.stderr.write(chalk`{yellow warn}: eslint config in package.json is ignored\n`);
      }

      const protoFiles = glob('src/proto/**/*.proto', { cwd: pkgDir });
      if (protoFiles.length > 0) {
        console.log(chalk.bold`\nprotobuf`);
        const substitutions = fs.existsSync(join(pkgDir, 'src/proto/substitutions.ts')) ? join(pkgDir, 'src/proto/substitutions.ts') : undefined;

        execTool('build-protobuf', [
          '-o',
          join(pkgDir, 'src/proto/gen'),
          ...(substitutions ? ['-s', substitutions] : []),
          ...protoFiles
        ]);
      }

      console.log(chalk.bold`\ntypescript`);
      execTool('tsc');

      if (!light) {
        console.log(chalk.bold`\neslint`);
        execTool('eslint', ['--config', join(selfDir, '.eslintrc.js'), '{src,test}/**/*.{js,ts,jsx,tsx}']);

        console.log(chalk.bold`\jest`);
        execTool('jest', ['--config', join(selfDir, 'jest.config.json'), '--passWithNoTests', '--rootDir', pkgDir], {
          stdio: ['inherit', 'inherit', process.stdout]
        });
      }

      console.log(chalk`\n{green.bold BUILD COMPLETE} in {bold ${Date.now() - before}} ms`);
    }
  )
  .command(
    'lint',
    'run linter',
    yargs => yargs.parserConfiguration({ 'unknown-options-as-args': true }),
    ({ _ }) => {
      execTool('eslint', ['--config', join(selfDir, '.eslintrc.js'), '{src,test}/**/*.{js,ts,jsx,tsx}', ..._.slice(1).map(String)]);
    }
  )
  .command(
    'test',
    'run tests',
    yargs => yargs.parserConfiguration({ 'unknown-options-as-args': true }),
    ({ _ }) => {
      const pkgDir = getPackageDir();
      execTool('jest', ['--config', join(selfDir, 'jest.config.json'), '--passWithNoTests', '--rootDir', pkgDir, ..._.slice(1).map(String)]);
    }
  )
  .command<{ command: string }>(
    ['* <command>', 'run <command>'],
    'run script or a tool',
    yargs => yargs.parserConfiguration({ 'unknown-options-as-args': true }),
    ({ command, _ }) => {
      const packageJson = JSON.parse(fs.readFileSync(join(getPackageDir(), 'package.json'), 'utf-8'));

      if (packageJson.scripts?.[command]) {
        execCommand(packageJson.scripts?.[command], _.map(String));
      } else {
        execCommand(command, _.map(String));
      }
    }
  )
  .argv;

function getPackageDir () {
  const packageDir = pkgDir(process.cwd());
  if (!packageDir) {
    process.stderr.write(chalk`{red error}: must be executed inside a package\n`);
    process.exit(-1);
  }
  return packageDir;
}
