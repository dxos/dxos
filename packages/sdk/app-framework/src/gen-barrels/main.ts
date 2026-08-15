//
// Copyright 2026 DXOS.org
//

import path from 'node:path';

import { generate } from './generate';

const main = (): void => {
  const dirFlagIndex = process.argv.indexOf('--dir');
  const pluginDir = path.resolve(dirFlagIndex === -1 ? process.cwd() : process.argv[dirFlagIndex + 1]);
  const result = generate(pluginDir);
  if (result.environments.length === 0) {
    // eslint-disable-next-line no-console
    console.log('dx-gen-barrels: no environments annotations found; nothing generated.');
    return;
  }
  for (const file of result.files) {
    // eslint-disable-next-line no-console
    console.log(
      `dx-gen-barrels: ${path.relative(pluginDir, file.path)} (${file.included} modules, ${file.stubbed} stubs${file.overridden ? `, ${file.overridden} overrides` : ''})`,
    );
  }
};

main();
