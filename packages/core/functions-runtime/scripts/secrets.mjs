#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

import { writeFileSync } from 'node:fs';
import { $, chalk } from 'zx';

const ITEM = 'plugin-script.r2.vendor';

console.log(chalk.blue(`Fetching secrets from 1Password item: ${ITEM}`));

const { fields } = await $`op item get ${ITEM} --format json`.json();
const secrets = fields.filter((field) => field.type === 'CONCEALED' && field.value !== undefined);

if (secrets.length === 0) {
  console.error(chalk.red(`No secrets found in 1Password item: ${ITEM}`));
  process.exit(1);
}

const env = secrets.map((field) => {
  console.log(chalk.cyan(`  ${field.label}`));
  return `${field.label}=${field.value}`;
});

writeFileSync('.env', env.join('\n') + '\n');
console.log(chalk.green(`Wrote ${secrets.length} secrets to .env`));
