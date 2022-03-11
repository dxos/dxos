//
// Copyright 2022 DXOS.org
//

import yargs from 'yargs';

import { setupCoreCommands } from '@dxos/toolchain-node-library';

/**
 * Main yargs entry-point.
 */
setupCoreCommands(yargs(process.argv.slice(2))).argv;
