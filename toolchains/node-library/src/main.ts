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

function execLint (additionalArgs: string[] = []) {
  const packageJson = JSON.parse(fs.readFileSync(join(getPackageDir(), 'package.json'), 'utf-8'));
  const isReactLib = !!(packageJson.dependencies?.react ?? packageJson.devDependencies?.react ?? packageJson.peerDependencies?.react);
  const config = isReactLib ? join(selfDir, '.eslintrc.react.js') : join(selfDir, '.eslintrc.js');
  execTool('eslint', ['--config', config, '{src,test,stories,playwright}/**/*.{js,ts,jsx,tsx}', ...additionalArgs]);
}

function execJest (pkgDir: string, additionalArgs: string[] = []) {
  const packageJson = JSON.parse(fs.readFileSync(join(pkgDir, 'package.json'), 'utf-8'));
  const isReactLib = !!(
    packageJson.dependencies?.['@testing-library/react'] ??
    packageJson.devDependencies?.['@testing-library/react'] ??
    packageJson.peerDependencies?.['@testing-library/react']
  );
  const config = isReactLib ? join(selfDir, 'jest.config.react.json') : join(selfDir, 'jest.config.json');
  execTool('jest', ['--config', config, '--passWithNoTests', '--rootDir', pkgDir, ...additionalArgs], {
    stdio: ['inherit', 'inherit', process.stdout] // Redirect stderr > stdout.
  });
}

function execMocha (additionalArgs: string[] = []) {
  execTool('mocha', ['-r', 'ts-node/register/transpile-only', '--exit', '-t', '15000', 'src/**/*.test.ts', ...additionalArgs], {
    stdio: ['inherit', 'inherit', process.stdout] // Redirect stderr > stdout.
  });
}

function execBuild () {
  const { packageDir, packageJson } = getPackage();

  if (packageJson.jest) {
    process.stderr.write(chalk`{yellow warn}: jest config in package.json is ignored\n`);
  }

  if (packageJson.eslintConfig) {
    process.stderr.write(chalk`{yellow warn}: eslint config in package.json is ignored\n`);
  }

  const protoFiles = glob('src/proto/**/*.proto', { cwd: packageDir });
  if (protoFiles.length > 0) {
    console.log(chalk.bold`\nprotobuf`);
    const substitutions = fs.existsSync(join(packageDir, 'src/proto/substitutions.ts')) ? join(packageDir, 'src/proto/substitutions.ts') : undefined;

    execTool('build-protobuf', [
      '-o',
      join(packageDir, 'src/proto/gen'),
      // eslint-disable-next-line @typescript-eslint/no-extra-parens
      ...(substitutions ? ['-s', substitutions] : []),
      ...protoFiles
    ]);
  }

  console.log(chalk.bold`\ntypescript`);
  execTool('tsc');
}

function execTest (additionalArgs?: string[]) {
  const { packageDir, packageJson } = getPackage();

  if (packageJson.toolchain?.testingFramework === 'mocha') {
    console.log(chalk.bold`\nmocha`);
    execMocha(additionalArgs);
  } else {
    console.log(chalk.bold`\njest`);
    execJest(packageDir, additionalArgs);
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
      const before = Date.now();
      execBuild();

      console.log(chalk.bold`\neslint`);
      execLint();

      execTest();

      console.log(chalk`\n{green.bold CHECK COMPLETE} in {bold ${Date.now() - before}} ms`);
    }
  )
  .command(
    'lint',
    'run linter',
    yargs => yargs.parserConfiguration({ 'unknown-options-as-args': true }),
    ({ _ }) => {
      execLint(_.slice(1).map(String));
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
      const packageJson = getPackageJson();

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

function getPackageJson () {
  return JSON.parse(fs.readFileSync(join(getPackageDir(), 'package.json'), 'utf-8'));
}

function getPackage () {
  return {
    packageDir: getPackageDir(),
    packageJson: getPackageJson()
  };
}
