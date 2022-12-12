//
// Copyright 2022 DXOS.org
//

import { loadConfig } from './config.js';
import { generateApiDocs } from './generateApiDocs.js';
import { remarkDocumentation } from './remarkDocumentation.js';
import { exec } from 'child_process';

const isGitClean = async () => {
  const cmd = `git status --porcelain`;
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(err);
      if (stderr) reject(stderr);
      resolve(stdout === 'clean');
    });
  });
};

const main = async () => {
  if (!await isGitClean()) {
    console.error('git repository not clean prior to regenerating docs, bailing.');
    process.exit(1);
  }
  const config = await loadConfig();
  const flags = process.argv.slice(2);
  const tasks = {
    apidoc: generateApiDocs,
    remark: remarkDocumentation
  };
  const plan = flags?.length ? flags : Object.keys(tasks);
  await Promise.all(plan.map((step: string) => (step in tasks ? tasks[step as keyof typeof tasks]?.(config) : null)));
};

void main();
