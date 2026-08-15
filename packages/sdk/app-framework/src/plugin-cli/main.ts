//
// Copyright 2026 DXOS.org
//

import path from 'node:path';

import { generate } from './generate';

// TODO(wittjosiah): Roll into dx cli? Once we stop shipping non-core plugins bundled into the cli
//  it might be light weight enough to support this use case.
const USAGE = `dx-plugin — plugin-authoring toolchain shipped with @dxos/app-framework.

Usage: dx-plugin <command>

Commands:
  prebuild [--dir <path>]  Generate the headless #capabilities barrels (src/capabilities/gen/)
                           from the canonical barrel's environments annotations, and sync the
                           package.json #capabilities condition map.`;

const prebuild = (args: string[]): void => {
  const dirFlagIndex = args.indexOf('--dir');
  const pluginDir = path.resolve(dirFlagIndex === -1 ? process.cwd() : args[dirFlagIndex + 1]);
  const result = generate(pluginDir);
  if (result.environments.length === 0) {
    // eslint-disable-next-line no-console
    console.log('dx-plugin prebuild: no environments annotations found; nothing generated.');
    return;
  }
  for (const file of result.files) {
    // eslint-disable-next-line no-console
    console.log(
      `dx-plugin prebuild: ${path.relative(pluginDir, file.path)} (${file.included} modules, ${file.stubbed} stubs${file.overridden ? `, ${file.overridden} overrides` : ''})`,
    );
  }
};

const main = (): void => {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case 'prebuild': {
      prebuild(args);
      break;
    }
    default: {
      // eslint-disable-next-line no-console
      console.error(USAGE);
      process.exitCode = command === undefined || command === '--help' ? 0 : 1;
    }
  }
};

main();
