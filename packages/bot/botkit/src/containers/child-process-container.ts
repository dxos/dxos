//
// Copyright 2020 DXOS.org
//

import { spawn, SpawnOptions, ChildProcess } from 'child_process';
import fs from 'fs-extra';
import kill from 'tree-kill';

import { Event } from '@dxos/async';
import { keyToString } from '@dxos/crypto';
import { SpawnOptions as BotSpawnOptions } from '@dxos/protocol-plugin-bot';

import { BotId, BotInfo } from '../bot-manager';
import { log, logBot } from '../log';
import { BotContainer, BotExitEventArgs, ContainerStartOptions } from './common';

export interface CommandInfo {
  command: string
  args: string[]
  env?: Record<string, string>
}

interface RunningBot {
  process: ChildProcess
}

/**
 * Bot Container; Used for running bot instanced inside specific compute service.
 */
export abstract class ChildProcessContainer implements BotContainer {
  readonly botExit = new Event<BotExitEventArgs>();

  private readonly _bots = new Map<BotId, RunningBot>() ;

  private _controlTopic?: any;

  /**
   * Get process command (to spawn).
   */
  protected abstract _getCommand (installDirectory: string, spawnOptions: BotSpawnOptions): CommandInfo;

  async start ({ controlTopic }: ContainerStartOptions) {
    this._controlTopic = controlTopic;
  }

  async stop () {

  }

  /**
   * Start bot instance.
   */
  async startBot (botInfo: BotInfo) {
    const { botId, name, installDirectory, storageDirectory, spawnOptions } = botInfo;
    await fs.ensureDir(storageDirectory);

    const { command, args, env: childEnv } = this._getCommand(installDirectory, spawnOptions);

    const dxEnv = {
      DX_BOT_CONTROL_TOPIC: keyToString(this._controlTopic),
      DX_BOT_UID: botId,
      DX_BOT_NAME: name,
      DX_BOT_CWD: storageDirectory,
      DX_BOT_RESTARTED: 'false' // TODO(marik-d): Remove.
    };

    const childOptions: SpawnOptions = {
      env: {
        ...process.env,
        NODE_OPTIONS: '',
        ...childEnv,
        ...dxEnv
      },

      cwd: storageDirectory,

      // https://nodejs.org/api/child_process.html#child_process_options_detached
      detached: false
    };

    const botProcess = spawn(command, args, childOptions);

    // TODO(marik-d): Fix this.
    // TODO(marik-d): Causes leaks.
    // const timeState = {
    //   started: moment.utc(),
    //   lastActive: moment.utc()
    // };
    // const watcher = watch(storageDirectory, { recursive: true }, () => {
    //   timeState.lastActive = moment.utc();
    // });

    log(`Spawned bot: ${JSON.stringify({ pid: botProcess.pid, command, args, dxEnv, cwd: storageDirectory })}`);

    botProcess.stdout!.on('data', (data) => {
      if (botProcess.pid) {
        logBot[botProcess.pid](`${data}`);
      }
    });

    botProcess.stderr!.on('data', (data) => {
      if (botProcess.pid) {
        logBot[botProcess.pid](`${data}`);
      }
    });

    botProcess.on('close', exitCode => {
      this.botExit.emit({ botId, exitCode: exitCode || 0 });
      log(`Bot pid: ${botProcess.pid} exited with code ${exitCode}.`);
    });

    botProcess.on('error', (err) => {
      if (botProcess.pid) {
        logBot[botProcess.pid](`Error: ${err}`);
      }
    });

    this._bots.set(botId, {
      process: botProcess
    });
  }

  async stopBot (botInfo: BotInfo): Promise<void> {
    if (!this._bots.has(botInfo.botId)) {
      return;
    }
    const { process } = this._bots.get(botInfo.botId)!;

    return new Promise(resolve => {
      if (process.pid) {
        kill(process.pid, 'SIGKILL', () => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
