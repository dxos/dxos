//
// Copyright 2023 DXOS.org
//

import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import util from 'node:util';

import pkgUp from 'pkg-up';

import { raise } from '@dxos/debug';

import { type ProcessInfo } from '../../daemon';

import { type Runner, type RunnerStartOptions } from './runner';

const SYSTEMD_TEMPLATE_FILE = 'templates/dxos-agent.service.template';

const execPromise = util.promisify(exec);

export class SystemctlRunner implements Runner {
  async start({ profile, logFile, errFile, daemonOptions }: RunnerStartOptions): Promise<void> {
    try {
      const defaultTemplatePath = path.join(
        path.dirname(pkgUp.sync({ cwd: __dirname }) ?? raise(new Error('Could not find package.json'))),
        SYSTEMD_TEMPLATE_FILE,
      );

      const systemdTemplate = await readFile(defaultTemplatePath, 'utf-8');

      const service = this._getServiceName(profile);
      const systemdPath = await this._getSystemdPath(service);

      const options = [];
      if (daemonOptions?.metrics) {
        options.push('--metrics');
      }
      if (daemonOptions?.ws) {
        options.push(`--ws=${daemonOptions.ws}`);
      }
      if (daemonOptions?.config) {
        options.push(`--config=${daemonOptions.config}`);
      }

      const systemdContent = systemdTemplate
        .replace(/{{PROFILE}}/g, profile)
        .replace(/{{DX_PATH}}/g, process.argv[1])
        .replace(/{{NODE_PATH}}/g, process.execPath)
        .replace(/{{ERROR_LOG}}/g, errFile)
        .replace(/{{OUT_LOG}}/g, logFile)
        .replace(/{{NODE_ARGS}}/g, '')
        .replace(/{{OPTIONS}}/g, options.join(' '));

      await writeFile(systemdPath, systemdContent, 'utf-8');

      // Reload systemd manager configuration.
      await execPromise('systemctl --user daemon-reload');

      // Enable the systemd service.
      await execPromise(`systemctl --user enable ${service}`);

      // Start the systemd service.
      await execPromise(`systemctl --user start ${service}`);
    } catch (err: any) {
      throw new Error(`Failed to start system service: ${err.message}`);
    }
  }

  async stop(profile: string, force: boolean = false): Promise<void> {
    try {
      const service = this._getServiceName(profile);
      const systemdPath = await this._getSystemdPath(service);

      // Stop the systemd service.
      await execPromise(`systemctl --user stop ${service}`);

      // Disable the systemd service.
      await execPromise(`systemctl --user disable ${service}`);

      // Remove the systemd service file.
      await unlink(systemdPath);
    } catch (err: any) {
      throw new Error(`Failed to stop system service: ${err.message}`);
    }
  }

  async isRunning(profile: string): Promise<boolean> {
    try {
      const service = this._getServiceName(profile);
      const { stdout } = await execPromise(`systemctl --user is-active ${service} || true`);
      return (stdout ?? '').trim() === 'active';
    } catch (err: any) {
      throw new Error(`Failed to check if the service is running: ${err.message}`);
    }
  }

  async info(profile: string): Promise<ProcessInfo> {
    const result: ProcessInfo = {};
    try {
      const service = this._getServiceName(profile);
      const { stdout: statusOutput } = await execPromise(`systemctl --user status -n 0 ${service}`);
      if (statusOutput) {
        const pidMatch = /Main PID:\s*(\d+)/.exec(statusOutput);
        if (pidMatch) {
          const pid = parseInt(pidMatch[1]);
          if (!isNaN(pid)) {
            result.pid = pid;
            const { stdout: psOutput } = await execPromise(`ps -o lstart= -p ${pid}`);
            if (psOutput) {
              result.started = new Date(psOutput).getTime();
            }
          }
        }
      }
    } catch (err: any) {}

    return result;
  }

  private _getServiceName(profile: string): string {
    return `dxos-agent-${profile}.service`;
  }

  private async _getSystemdPath(service: string): Promise<string> {
    const systemdPath = path.join(os.homedir(), '.config', 'systemd', 'user');
    if (!existsSync(systemdPath)) {
      await mkdir(systemdPath, { recursive: true });
    }
    return path.join(systemdPath, service);
  }
}
