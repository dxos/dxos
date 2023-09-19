//
// Copyright 2023 DXOS.org
//

const { exec: execCb } = require('node:child_process');
const { existsSync } = require('node:fs');
const { rm } = require('node:fs/promises');
const { promisify } = require('node:util');

const exec = promisify(execCb);

const setup = async () => {
  if (existsSync('tmp')) {
    console.log('Cleaning up...');
    await rm('tmp', { recursive: true });
  }

  console.log('Installing dependencies...');
  await exec('npm install --no-package-lock');
  await exec('npm exec playwright install');

  console.log('Creating app...');
  await exec('npm exec dx app create tmp -- --template bare');

  console.log('Installing app dependencies...');
  await exec('npm install --no-package-lock', {
    cwd: 'tmp',
  });
};

void setup();
