//
// Copyright 2020 DXOS.org
//

import path from 'path';

import { CommandInfo, ChildProcessContainer } from './child-process-container';

// Binary file inside downloaded bot package to run.
const NATIVE_BOT_MAIN_FILE = 'main.bin';

/**
 * Native Bot Container; Used for spawning bots as native binaries.
 */
export class NativeBotContainer extends ChildProcessContainer {
  /**
   * Get process command (to spawn).
   */
  protected _getCommand (installDirectory: string): CommandInfo {
    return {
      command: path.join(installDirectory, NATIVE_BOT_MAIN_FILE),
      args: []
    };
  }
}
