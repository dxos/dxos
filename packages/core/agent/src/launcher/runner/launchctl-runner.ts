//
// Copyright 2023 DXOS.org
//

import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { unlink, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import util from 'node:util';

import { Runner, type StartOptions } from './runner';

const execPromise = util.promisify(exec);

export class LaunchctlRunner implements Runner {
  async start({ profile, logFile, errFile }: StartOptions): Promise<void> {
    try {
      const service = this._getServiceName(profile);
      const plistPath = await this._getPlistPath(service);

      // TODO(egorgripasov): Pass options to the agent start command.
      const plistContent = plistTemplate
        .replace('{{PROFILE}}', profile)
        // TODO(egorgripasov): Make it work for standalone installation.
        .replace('{{DX_PATH}}', process.argv[1])
        .replace('{{NODE_PATH}}', path.dirname(process.execPath))
        .replace('{{ERROR_LOG}}', errFile)
        .replace('{{OUT_LOG}}', logFile);

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

  private async _getPlistPath(service: string): Promise<string> {
    const agentsPath = `${os.homedir()}/Library/LaunchAgents`;
    if (!existsSync(agentsPath)) {
      await mkdir(agentsPath, { recursive: true });
    }
    return `${agentsPath}/${service}.plist`;
  }

  private _getServiceName(profile: string): string {
    return `org.dxos.agent.${profile}`;
  }
}

// TODO(egorgripasov): Read from template file.
const plistTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
    <dict>
    <key>Label</key>
    <string>org.dxos.agent.{{PROFILE}}</string>
    <key>KeepAlive</key>
    <true/>
    <key>ProgramArguments</key>
    <array>
      <string>{{DX_PATH}}</string>
      <string>agent</string>
      <string>start</string>
      <string>--foreground</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
      <key>Crashed</key>
      <true/>
    </dict>
    <key>EnvironmentVariables</key>
    <dict>
      <key>PATH</key>
      <string>{{NODE_PATH}}</string>
      <key>LOG_FILTER</key>
      <string>info</string>
    </dict>
    <key>StandardErrorPath</key>
    <string>{{ERROR_LOG}}</string>
    <key>StandardOutPath</key>
    <string>{{OUT_LOG}}</string>
  </dict>
</plist>
`;
