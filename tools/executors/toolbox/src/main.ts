//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import path from 'path';

import { Command, ToolkitOptions } from './command.js';
import { ConfigCommand, InfoCommand } from './commands';
import { loadJson } from './util';
import { Workspace } from './workspace';

// TODO(burdon): Run via executor or walk workspace.json config?
// TODO(burdon): Enable sorting of root-level config files via CLI (e.g., nx.json, workspace.json).

// Next:
// TODO(burdon): Migrate protobuf typedef generator from protocols (see NX code generators).
//  https://nx.dev/plugin-features/use-code-generators
// TODO(burdon): X tools (e.g., deps check).
// TODO(burdon): Migrate Beast.
//  https://nx.dev/plugin-features/create-your-own-plugin
// TODO(burdon): Migrate Ridoculous.

/**
 * Main toolbox executor.
 * https://nx.dev/plugin-features/use-task-executors
 */
export default async (options: ToolkitOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing toolbox...');
  if (context.isVerbose) {
    console.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  const { _ } = options;
  const [, cmd] = _;

  console.log(context.workspace);
  process.exit();

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

    case 'info': {
      command = new InfoCommand(config, options, context, workspace);
      break;
    }

    default: {
      console.error(`Invalid command: ${cmd}`);
      return {
        success: false
      };
    }
  }

  try {
    await command.exec();
    return { success: true };
  } catch (err) {
    console.error('Command failed:', err);
    return { success: false };
  }
};
