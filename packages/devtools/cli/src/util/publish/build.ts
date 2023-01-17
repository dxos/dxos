//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import { spawnSync } from 'child_process';

import type { PackageModule, Logger } from './common';

export interface BuildParams {
  log: Logger;
  module: PackageModule;
}

interface BuildArgs {
  verbose?: boolean;
}

export const build = ({ verbose }: BuildArgs, { log, module }: BuildParams) => {
  log(`Building module ${chalk.bold(module.name)} ...`);

  const [command, ...args] = module.build!.command!.split(' ');

  // Build with configuration.
  const { status, error } = spawnSync(command, args, {
    env: {
      ...process.env,
      CONFIG_DYNAMIC: 'true'
    },
    stdio: verbose ? 'inherit' : undefined
  });

  if (error || status !== 0) {
    log(
      `Module ${chalk.bold(module.name)} build failed${
        verbose ? ` with status: ${status}.${error ? '\n' + error : ''}` : '. Re-run with --verbose for more details.'
      }`
    );
    process.exit(status === null ? 1 : status);
  }

  log(`Module build ${chalk.bold(module.name)} succeeded.`);
};
