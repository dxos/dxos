//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import path from 'path';

import { Command, ToolkitOptions } from './command.js';
import { ConfigCommand } from './commands';
import { loadJson } from './util';
import { Workspace } from './workspace';

// TODO(burdon): Run via executor or walk workspace.json config?
// TODO(burdon): Enable sorting of root-level config files via CLI.

// TODO(burdon): Deps check.
// TODO(burdon): Protobuf typedef generator (from protocols).
// TODO(burdon): X tools.

export default async (options: ToolkitOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing toolbox...');
  if (context.isVerbose) {
    console.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  const { _ } = options;
  const [, cmd] = _;

  // TODO(burdon): Caching?
  const workspace = new Workspace(context.root, context.workspace);

  // Load config.
  const configPath = path.join(context.root, 'toolbox.json');
  const config = loadJson(configPath) ?? {};

  let command: Command;
  switch (cmd) {
    case 'config': {
      command = new ConfigCommand(config, options, context, workspace);
      break;
    }

    default: {
      return {
        success: false
      };
    }
  }

  await command.exec();

  return { success: true };
};
