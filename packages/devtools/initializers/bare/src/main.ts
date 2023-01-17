//
// Copyright 2023 DXOS.org
//
import minimist from 'minimist';

import template from '@dxos/bare-template';

void (async () => {
  const args = minimist(process.argv.slice(2), {
    boolean: ['interactive', 'verbose', 'monorepo']
  });
  const { monorepo, interactive, verbose } = { interactive: false, verbose: false, monorepo: false, ...args };
  const files = await template.execute({
    verbose,
    input: interactive
      ? { monorepo }
      : { pwa: true, dxosUi: true, tailwind: true, react: true, monorepo, storybook: false }
  });
  await Promise.all(files.map((file) => file.save()));
})();
