//
// Copyright 2023 DXOS.org
//

import minimist from 'minimist';
import { exec } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import template from '@dxos/hello-template';

void (async () => {
  const args = minimist(process.argv.slice(2), {
    boolean: ['interactive', 'verbose', 'monorepo'],
  });

  const currentDir = path.basename(process.cwd());
  const target = args._[0];
  if (target) {
    await mkdir(target);
    process.chdir(target);
  }

  const name = target ?? currentDir;
  const { monorepo, interactive, verbose } = {
    interactive: false,
    verbose: false,
    monorepo: false,
    ...args,
  };

  const result = await template.apply({
    verbose,
    input: interactive
      ? { monorepo }
      : { name, pwa: true, dxosUi: true, tailwind: true, react: true, monorepo, storybook: false },
  });
  await result.apply();

  // TODO(wittjosiah): Move this functionality into plate.
  console.log('Installing dependencies...');
  await exec('npm install');
})();
