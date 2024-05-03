//
// Copyright 2023 DXOS.org
//

import minimist from 'minimist';
import { mkdir } from 'node:fs/promises';

import template from '@dxos/plugin-template';

void (async () => {
  const args = minimist(process.argv.slice(2), {
    boolean: ['interactive', 'verbose'],
  });

  const name = args._[0];
  if (name) {
    await mkdir(name);
    process.chdir(name);
  }

  const interactive = !name || args.interactive;
  const { verbose } = {
    verbose: false,
    ...args,
  };

  const result = await template.apply({
    verbose,
    interactive,
    input: interactive
      ? { name }
      : {
          name,
          defaultPlugins: true,
        },
  });
  await result.apply();
})();
