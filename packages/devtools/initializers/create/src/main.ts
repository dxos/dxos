//
// Copyright 2023 DXOS.org
//

import minimist from 'minimist';

import template from '@dxos/hello-template';
import { type InputOf } from '@dxos/plate';

void (async () => {
  const args = minimist(process.argv.slice(2));

  const { monorepo, verbose, interactive, name } = {
    verbose: false,
    monorepo: false,
    interactive: undefined,
    name: args._[0],
    ...args,
  };

  const defaults: Partial<InputOf<typeof template>> = {
    monorepo,
    react: true,
    dxosUi: true,
    tailwind: true,
    storybook: false,
    pwa: false,
    schema: false,
    ...(name ? { name, createFolder: true } : {}),
  };

  const result = await template.apply({
    verbose,
    interactive: interactive !== false,
    input: interactive ? { monorepo } : defaults,
  });
  await result.apply();
})();
