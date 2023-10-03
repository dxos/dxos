//
// Copyright 2023 DXOS.org
//

import { existsSync, mkdirSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { waitForCondition } from '@dxos/async';
import { log } from '@dxos/log';

import { LaunchctlRunner } from './launchctl-runner';
import { Daemon, ProcessInfo, StartOptions, StopOptions } from '../daemon';
import { CHECK_INTERVAL, DAEMON_STOP_TIMEOUT } from '../defs';
import { AgentWaitTimeoutError } from '../errors';
import { lockFilePath, removeLockFile, removeSocketFile, waitForAgentToStart } from '../util';

/**
 * Manager of system daemon processes using launchctl on macOS.
 */
export class LaunchctlDaemon implements Daemon {
  private readonly _launchctlRunner = new LaunchctlRunner();

  constructor(private readonly _rootDir: string) {
    const dir = path.join(this._rootDir, 'profile');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async connect(): Promise<void> {
    // no-op.
  }

  async disconnect() {
    // no-op.
  }

  async isRunning(profile: string): Promise<boolean> {
    const { isLocked } = await import('@dxos/client-services');
    // TODO(egorgripasov): Better compatibility with Phoenix daemon.
    // Support of existing locks?
    return (await isLocked(lockFilePath(profile))) || this._launchctlRunner.isRunning(`org.dxos.agent.${profile}`);
  }

  async list(): Promise<ProcessInfo[]> {
    const profiles = (await readdir(path.join(this._rootDir, 'profile'))).filter((uid) => !uid.startsWith('.'));

    return Promise.all(
      profiles.map(async (profile) => {
        return { profile, running: await this.isRunning(profile) };
      }),
    );
  }

  async start(profile: string, options?: StartOptions): Promise<ProcessInfo> {
    if (!(await this.isRunning(profile))) {
      const profileDir = path.join(this._rootDir, 'profile', profile);

      const logDir = path.join(profileDir, 'logs');
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }

      log('starting...', { profile, logDir });

      // Clear staled files.
      removeSocketFile(profile);
      removeLockFile(profile);

      const logFile = path.join(logDir, 'daemon.log');
      const errFile = path.join(logDir, 'err.log');

      // TODO(egorgripasov): Pass options to the agent start command.
      const plist = plistTemplate
        .replace('{{PROFILE}}', profile)
        // TODO(egorgripasov): Make it work for standalone installation.
        .replace('{{DX_PATH}}', process.argv[1])
        .replace('{{NODE_PATH}}', path.dirname(process.execPath))
        .replace('{{ERROR_LOG}}', errFile)
        .replace('{{OUT_LOG}}', logFile);

      await this._launchctlRunner.load(`org.dxos.agent.${profile}`, plist);

      try {
        await waitForAgentToStart(profile);
      } catch (err) {
        log.warn('Failed to start daemon.');
        await this.stop(profile);
        throw err;
      }
    }

    return { profile, running: true };
  }

  async stop(profile: string, { force = false }: StopOptions = {}): Promise<ProcessInfo | undefined> {
    if (await this.isRunning(profile)) {
      log('stopping...', { profile });

      // Use your LaunchctlRunner to unload the .plist file.
      await this._launchctlRunner.unload(`org.dxos.agent.${profile}`, force);

      await waitForCondition({
        condition: async () => !(await this.isRunning(profile)),
        timeout: DAEMON_STOP_TIMEOUT,
        interval: CHECK_INTERVAL,
        error: new AgentWaitTimeoutError(),
      });
    }

    return { profile, running: false };
  }

  async restart(profile: string, options?: StartOptions & StopOptions): Promise<ProcessInfo> {
    await this.stop(profile, options);
    return this.start(profile, options);
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
