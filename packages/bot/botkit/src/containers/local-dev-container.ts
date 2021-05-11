//
// Copyright 2020 DXOS.org
//

import { SpawnOptions } from '@dxos/protocol-plugin-bot';

import { LOCAL_BOT_MAIN_FILE } from '../source-manager';
import { CommandInfo, ChildProcessContainer } from './child-process-container';

// Command to spawn to run a bot in local development mode.
const LOCAL_BOT_RUN_COMMAND = 'npx';

// Fixed arguments to pass to LOCAL_BOT_RUN_COMMAND.
const LOCAL_BOT_RUN_ARGS = ['ts-node'];

/**
 * Local Bot Container; Used for running bots locally as a node process.
 */
export class LocalDevBotContainer extends ChildProcessContainer {
  constructor (
    private readonly _nodePath: string
  ) {
    super();
  }

  /**
   * Get process command (to spawn).
   */
  protected _getCommand (installDirectory: string, spawnOptions: SpawnOptions): CommandInfo {
    const { botPath } = spawnOptions;
    return {
      command: LOCAL_BOT_RUN_COMMAND,
      args: LOCAL_BOT_RUN_ARGS.concat([botPath || LOCAL_BOT_MAIN_FILE]),
      env: {
        NODE_PATH: this._nodePath
      }
    };
  }
}
