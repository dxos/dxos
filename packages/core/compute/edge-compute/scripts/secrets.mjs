#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

import { writeFileSync } from 'node:fs';
import { chalk, $ } from 'zx';

// Each `.env` name and the 1Password reference that holds it.
const REFS = {
  R2_ACCESS_KEY_ID: 'op://eng-ops/com.cloudflare/SCRIPT_VENDOR_R2_ACCESS_KEY_ID',
  R2_SECRET_ACCESS_KEY: 'op://eng-ops/com.cloudflare/SCRIPT_VENDOR_R2_SECRET_ACCESS_KEY',
};

console.log(chalk.blue('Fetching secrets from 1Password'));

const env = [];
for (const [name, ref] of Object.entries(REFS)) {
  const value = (await $`op read ${ref}`).stdout.trim();
  console.log(chalk.cyan(`  ${name}`));
  env.push(`${name}=${value}`);
}

writeFileSync('.env', env.join('\n') + '\n');
console.log(chalk.green(`Wrote ${env.length} secrets to .env`));
