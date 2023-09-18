//
// Copyright 2023 DXOS.org
//

import minimist from 'minimist';
import { mkdir } from 'node:fs/promises';

import template from '@dxos/tasks-template';

void (async () => {
  const args = minimist(process.argv.slice(2), {
    boolean: ['interactive', 'verbose', 'monorepo'],
  });

  const name = args._[0];
  if (name) {
    await mkdir(name);
    process.chdir(name);
  }

  const { monorepo, interactive, verbose } = {
    interactive: !name,
    verbose: false,
    monorepo: false,
    ...args,
  };

  const result = await template.apply({
    verbose,
    interactive,
    input: interactive
      ? { monorepo }
      : { name, createFolder: false, dxosUi: true, tailwind: true, react: true, monorepo, storybook: false },
  });
  await result.apply();
})();
