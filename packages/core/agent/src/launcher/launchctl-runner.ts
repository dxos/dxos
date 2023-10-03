//
// Copyright 2023 DXOS.org
//

import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { unlink, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import util from 'node:util';

const execPromise = util.promisify(exec);

export class LaunchctlRunner {
  async load(service: string, plistContent: string): Promise<void> {
    try {
      const plistPath = await this._getPlistPath(service);

      // Write the plist content to the file.
      await this.writeFile(plistPath, plistContent);

      // Load the plist file using launchctl.
      await execPromise(`launchctl load ${plistPath}`);

      // Ensure the service is started.
      await execPromise(`launchctl start ${service}`);
    } catch (err: any) {
      throw new Error(`Failed to load plist: ${err.message}`);
    }
  }

  async unload(service: string, force: boolean = false): Promise<void> {
    try {
      const plistPath = await this._getPlistPath(service);

      // Unload the plist file using launchctl.
      await execPromise(`launchctl unload ${plistPath}`);

      // Remove the plist file.
      await unlink(plistPath);
    } catch (err: any) {
      throw new Error(`Failed to unload plist: ${err.message}`);
    }
  }

  async isRunning(service: string): Promise<boolean> {
    try {
      const { stdout } = await execPromise('launchctl list');
      return stdout.includes(service);
    } catch (err: any) {
      throw new Error(`Failed to check if the service is running: ${err.message}`);
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await writeFile(filePath, content, 'utf-8');
    } catch (err: any) {
      throw new Error(`Failed to write file: ${err.message}`);
    }
  }

  private async _getPlistPath(service: string): Promise<string> {
    const agentsPath = `${os.homedir()}/Library/LaunchAgents`;
    if (!existsSync(agentsPath)) {
      await mkdir(agentsPath, { recursive: true });
    }
    return `${agentsPath}/${service}.plist`;
  }
}
