//
// Copyright 2021 DXOS.org
//

import chalk from 'chalk';
import { readFileSync, readdirSync } from 'fs';
import { extname, join } from 'path';

async function main () {
  console.log(chalk`{bold ${process.cwd()}/package.json}:\n`);

  const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

  const allDeps = Object.keys({
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
    ...(packageJson.peerDependencies ?? {})
  });

  const sourceFiles = Array.from(getAllSourceFiles());
  const sourceFilesContent = await readFiles(sourceFiles);

  for (const dep of allDeps) {
    if (IGNORE_PACKAGES.includes(dep)) {
      continue;
    }

    const searchStrings = [dep];
    if (dep.startsWith('@types/')) {
      searchStrings.push(dep.slice('@types/'.length));
    }

    const depExists = Object.values(sourceFilesContent).some(content => searchStrings.some(ss => content.includes(ss)));
    if (!depExists) {
      console.log(chalk`{blue ${dep}} is not used in the code.`);
    }
  }
}

const IGNORE_PACKAGES = [
  '@types/node',
  '@dxos/toolchain-node-library'
];

const ALLOWED_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx'
];

const BLACKLISTED_NAMES = [
  'node_modules',
  'build',
  '.rush',
  'temp',
  'dist'
];

function * getAllSourceFiles (dir: string = process.cwd()): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (BLACKLISTED_NAMES.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      yield * getAllSourceFiles(join(dir, entry.name));
    } else if (entry.isFile()) {
      if (ALLOWED_EXTENSIONS.includes(extname(entry.name))) {
        yield join(dir, entry.name);
      }
    }
  }
}

async function readFiles (files: string[]): Promise<Record<string, string>> {
  const res: Record<string, string> = {};
  await Promise.all(files.map(async (file) => {
    res[file] = await readFileSync(file, 'utf8');
  }));
  return res;
}

void main();
