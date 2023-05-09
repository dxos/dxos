//
// Copyright 2021 DXOS.org
//

import fs from 'fs';
import fetch from 'node-fetch';
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import path, { dirname } from 'node:path';
import pkgUp from 'pkg-up';

import { sleep } from '@dxos/async';
import { log } from '@dxos/log';
import { randomInt } from '@dxos/util';

interface TestBrokerOptions {
  binCommand: string;
  signalArguments: string[];
  cwd?: string;
  port?: number;
  timeout?: number;
  env?: Record<string, string>;

  /**
   * Allows arbitrary commands. WARNING: It stalls on Linux machine if `true`.
   */
  shell?: boolean;
}

// TODO(burdon): Convert to TestBuilder pattern.
export class SignalServerRunner {
  private readonly _binCommand: string;
  private readonly _signalArguments: string[];
  private readonly _cwd?: string;
  private readonly _env: Record<string, string>;
  private readonly _shell: boolean;

  private _startRetries = 0;
  private readonly _retriesLimit = 3;
  private readonly _port: number;
  private readonly _timeout: number;
  private _serverProcess: ChildProcessWithoutNullStreams;

  constructor({
    binCommand,
    signalArguments,
    cwd,
    port = 8080,
    timeout = 5_000,
    env = {},
    shell = false
  }: TestBrokerOptions) {
    this._binCommand = binCommand;
    this._signalArguments = signalArguments;
    this._cwd = cwd;
    this._port = port;
    this._timeout = timeout;
    this._env = env;
    this._shell = shell;

    this._serverProcess = this.startProcess();
  }

  public startProcess(): ChildProcessWithoutNullStreams {
    log('starting', {
      binCommand: this._binCommand,
      signalArguments: this._signalArguments,
      cwd: this._cwd,
      port: this._port
    });
    if (this._cwd && !fs.existsSync(this._cwd)) {
      throw new Error(`CWD not exists: ${this._cwd}`);
    }
    const server = spawn(this._binCommand, [...this._signalArguments, '--port', this._port.toString()], {
      cwd: this._cwd,
      shell: this._shell,
      env: {
        ...process.env,
        ...this._env
      }
    });

    server.stdout.on('data', (data) => {
      log.info(`TestServer stdout: ${data}`);
    });

    server.stderr.on('data', (data) => {
      log.warn(`TestServer stderr: ${data}`);
    });

    server.on('error', (err) => {
      log.error(`TestServer ERROR: ${err}`);
    });

    server.on('close', (code) => {
      log.info(`TestServer exited with code ${code}`);
    });

    this._serverProcess = server;
    return server;
  }

  public async waitUntilStarted(): Promise<void> {
    let waited = 0;
    const waitInc = 20;
    while (waited < this._timeout) {
      try {
        const response = await fetch(`http://localhost:${this._port}/.well-known/dx/signal`);
        log(`Fetching broker. Response=${JSON.stringify(response)}`);
        return;
      } catch (err) {
        await sleep(waitInc);
        waited = waited + waitInc;
      }
    }

    if (waited >= this._timeout) {
      this.stop();
      this._serverProcess = this.startProcess();
      this._startRetries++;
      if (this._startRetries > this._retriesLimit) {
        throw new Error('Test Signal server was not started');
      }

      return await this.waitUntilStarted();
    }
  }

  public stop(): void {
    const delivered = this._serverProcess.kill('SIGINT');
    if (!delivered) {
      log.warn('kill signal was not delivered to child process');
    }
  }

  public url(): string {
    return `ws://localhost:${this._port}/.well-known/dx/signal`;
  }
}
const ARCH = ['x64', 'amd64', 'ppc64'].includes(process.arch)
  ? 'amd64'
  : ['arm64'].includes(process.arch)
  ? 'arm64'
  : '32';

const OS = process.platform;

/**
 * Creates a test instance of the signal server with swarming disabled and starts it.
 *
 * @param port Port to start the signal server on, random by default.
 */
// TODO(burdon): Convert to TestBuilder pattern.
export const runTestSignalServer = async ({
  port,
  mode = 'server'
}: {
  port?: number;

  /**
   * Signal binary mode, `server` is in memory implementation.
   * @see https://github.com/dxos/kube
   */
  mode?: 'client' | 'server' | 'p2pserver' | 'keypair' | 'pubsubserver';
} = {}): Promise<SignalServerRunner> => {
  if (ARCH === '32') {
    throw new Error('32 bit architecture not supported');
  }

  if (!['darwin', 'linux'].includes(OS)) {
    throw new Error(`Unsupported platform: ${OS}`);
  }
  const binPath = `./signal-test-${OS}-${ARCH}`;

  const server = new SignalServerRunner({
    binCommand: binPath,
    signalArguments: [mode],
    cwd: path.join(dirname(pkgUp.sync({ cwd: __dirname })!), 'bin'),
    port: port ?? randomInt(10000, 50000)
  });
  await server.waitUntilStarted();
  return server;
};
