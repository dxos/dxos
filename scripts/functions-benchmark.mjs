#!/usr/bin/env node

import { $ } from 'zx';
import { hideBin } from 'yargs/helpers';
import path from 'node:path';
import yargs from 'yargs';

//
// Run `node ./scripts/functions-benchmark.mjs` from the root of the project.
//
const {
  build = true, //
  deploy = false,
  profile = 'functions-benchmark',
  functionId,
} = yargs(hideBin(process.argv)).argv;

if (build) {
  await $({ stdio: 'inherit' })`pnpm -w nx build cli`;
}

// Start agent.
// TODO(mykola): Use `dx` command from package.json 'bin' section.
const dx = path.join(import.meta.dirname, '..', 'packages', 'devtools', 'cli', 'bin', 'dx.js');
const flags = `--profile=${profile} --no-agent --json`;

const exec = (cmd) => $({ stdio: 'inherit' })`${dx} ${cmd} ${flags}`.json();

// Create halo identity.
const existingIdentity = await exec(`halo identity`);
if (!existingIdentity.identityKey) {
  await exec(`halo create TEST`);
}

if (deploy) {
  const scriptPath = path.join(
    import.meta.dirname,
    '..',
    'packages',
    'plugins',
    'plugin-script',
    'src',
    'templates',
    'data-generator.ts',
  );
  const result = await exec(`function upload ${scriptPath}`);
  functionId = result.functionId;
}
