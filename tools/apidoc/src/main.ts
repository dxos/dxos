//
// Copyright 2022 DXOS.org
//

import { exec } from 'child_process';

import { loadConfig } from './config.js';
import { generateApiDocs } from './generateApiDocs.js';
import { err } from './log.js';
import { remarkDocumentation } from './remarkDocumentation.js';

const isGitClean = async () => {
  const cmd = 'git status --porcelain';
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }
      if (stderr) {
        reject(stderr);
      }
      resolve(!stdout.trim().length);
    });
  });
};

const main = async () => {
  if (!(process.env.CI || process.env.DIRTY_OK) && !(await isGitClean())) {
    err('\ngit repository not clean prior to regenerating docs, bailing.\n');
    process.exit(1);
  }
  const config = await loadConfig();
  const flags = process.argv.slice(2);
  const tasks = {
    apidoc: generateApiDocs,
    remark: remarkDocumentation,
  };
  const plan = flags?.length ? flags : Object.keys(tasks);
  await Promise.all(plan.map((step: string) => (step in tasks ? tasks[step as keyof typeof tasks]?.(config) : null)));
};

void main();
