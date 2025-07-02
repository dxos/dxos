#!/usr/bin/env node

import { $ } from 'zx';
import { hideBin } from 'yargs/helpers';
import path from 'node:path';
import yargs from 'yargs';

//
// Run `node ./scripts/functions-benchmark.mjs` from the root of the project.
//
const {
  _: [script = './packages/plugins/plugin-script/src/templates/data-generator.ts'],
  trigger = '*/30 * * * * *',
  build = true,
  profile = 'functions-benchmark',
  upload = true,
} = yargs(hideBin(process.argv)).argv;

if (build) {
  await $({ stdio: 'inherit' })`pnpm -w nx build cli`;
}

// Start agent.
// TODO(mykola): Use `dx` command from package.json 'bin' section.
const cliBin = path.join(import.meta.dirname, '..', 'packages', 'devtools', 'cli', 'bin', 'dx.js');
const dx = `${cliBin}`;

await $({ stdio: 'inherit' })`export DX_PROFILE=${profile}`;
await $({ stdio: 'inherit' })`${dx} agent start`;

// Create halo identity.
const existingIdentity = await $`${dx} halo identity`;
if (!existingIdentity.stdout.trim().includes('Identity not initialized.')) {
  await $({ stdio: 'inherit' })`${dx} halo identity TEST`;
}

// Upload functions.
if (upload) {
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
  await $({ stdio: 'inherit' })`${dx} function upload ${scriptPath}`;
}
