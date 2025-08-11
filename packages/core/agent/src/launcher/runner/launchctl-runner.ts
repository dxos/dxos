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

const PLIST_TEMPLATE_FILE = 'templates/org.dxos.agent.plist.template';
const AGENT_PLIST_PREFIX = 'org.dxos.agent';

const execPromise = util.promisify(exec);

export class LaunchctlRunner implements Runner {
  async start({ profile, logFile, errFile, daemonOptions }: RunnerStartOptions): Promise<void> {
    try {
      const defaultTemplatePath = path.join(
        path.dirname(pkgUp.sync({ cwd: __dirname }) ?? raise(new Error('Could not find package.json'))),
        PLIST_TEMPLATE_FILE,
      );

      const plistTemplate = await readFile(defaultTemplatePath, 'utf-8');

      const service = this._getServiceName(profile);
      const plistPath = await this._getPlistPath(service);

      const options = [''];
      if (daemonOptions?.metrics) {
        options.push('<string>--metrics</string>');
      }
      if (daemonOptions?.ws) {
        options.push(`<string>--ws=${daemonOptions.ws}</string>`);
      }
      if (daemonOptions?.config) {
        options.push(`<string>--config=${daemonOptions.config}</string>`);
      }

      const plistContent = plistTemplate
        .replace(/{{PROFILE}}/g, profile)
        .replace(/{{DX_PATH}}/g, process.argv[1])
        .replace(/{{NODE_PATH}}/g, path.dirname(process.execPath))
        .replace(/{{ERROR_LOG}}/g, errFile)
        .replace(/{{OUT_LOG}}/g, logFile)
        .replace(/{{OPTIONS}}/g, options.length > 1 ? options.join('\n') : '');

      // Write the plist content to the file.
      await writeFile(plistPath, plistContent, 'utf-8');

      // Load the plist file using launchctl.
      await execPromise(`launchctl load ${plistPath}`);

      // Ensure the service is started.
      await execPromise(`launchctl start ${service}`);
    } catch (err: any) {
      throw new Error(`Failed to load plist: ${err.message}`);
    }
  }

  async stop(profile: string, force: boolean = false): Promise<void> {
    try {
      const service = this._getServiceName(profile);
      const plistPath = await this._getPlistPath(service);

      // Unload the plist file using launchctl.
      await execPromise(`launchctl unload ${plistPath}`);

      // Remove the plist file.
      await unlink(plistPath);
    } catch (err: any) {
      throw new Error(`Failed to unload plist: ${err.message}`);
    }
  }

  async isRunning(profile: string): Promise<boolean> {
    try {
      const service = this._getServiceName(profile);
      const { stdout } = await execPromise('launchctl list');
      return stdout.includes(service);
    } catch (err: any) {
      throw new Error(`Failed to check if the service is running: ${err.message}`);
    }
  }

  async info(profile: string): Promise<ProcessInfo> {
    const result: ProcessInfo = {};
    try {
      const service = this._getServiceName(profile);
      const { stdout: pidOutput } = await execPromise(`launchctl list | grep "${service}" | awk '{print $1}'`);

      const pid = parseInt(pidOutput);
      if (!isNaN(pid)) {
        result.pid = pid;
        const { stdout: psOutput } = await execPromise(`ps -p ${pid} -o lstart=`);
        if (psOutput) {
          result.started = new Date(psOutput).getTime();
        }
      }
    } catch (err: any) {}

    return result;
  }

  private async _getPlistPath(service: string): Promise<string> {
    const agentsPath = path.join(os.homedir(), 'Library', 'LaunchAgents');
    if (!existsSync(agentsPath)) {
      await mkdir(agentsPath, { recursive: true });
    }
    return `${agentsPath}/${service}.plist`;
  }

  private _getServiceName(profile: string): string {
    return `${AGENT_PLIST_PREFIX}.${profile}`;
  }
}
