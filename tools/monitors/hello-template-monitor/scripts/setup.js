//
// Copyright 2023 DXOS.org
//

const { exec: execCb } = require('node:child_process');
const { rm, readFile, writeFile } = require('node:fs/promises');
const { promisify } = require('node:util');

const exec = promisify(execCb);

const setup = async () => {
  console.log('Cleaning up...');
  await rm('tmp', { recursive: true });

  console.log('Installing dependencies...');
  await exec('npm install --no-package-lock');

  console.log('Creating app...');
  await exec('dx app create tmp');

  console.log('Installing app dependencies...');
  // TODO(wittjosiah): Remove this.
  await writeFile('tmp/package.json', (await readFile('tmp/package.json', 'utf-8')).replaceAll('workspace:*', 'main'));
  await exec('npm install --no-package-lock', {
    cwd: 'tmp',
  });
};

void setup();
