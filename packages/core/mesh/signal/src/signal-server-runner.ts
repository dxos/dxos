//
// Copyright 2021 DXOS.org
//

import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import fs from 'node:fs';
import path, { dirname } from 'node:path';

import find from 'find-process';
import fetch from 'node-fetch';
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
  killExisting?: boolean;
  onError?: (err: any) => void;

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
  private readonly _killExisting: boolean;
  private readonly onError?: (err: any) => void;

  private _startRetries = 0;
  private readonly _retriesLimit = 3;
  private _port: number | undefined;
  private readonly _timeout: number;
  private _serverProcess: ChildProcessWithoutNullStreams | undefined;

  constructor({
    binCommand,
    signalArguments,
    cwd,
    port,
    timeout = 60_000,
    env = {},
    shell = false,
    killExisting = false,
    onError,
  }: TestBrokerOptions) {
    this._binCommand = binCommand;
    this._signalArguments = signalArguments;
    this._cwd = cwd;
    this._port = port;
    this._timeout = timeout;
    this._env = env;
    this._shell = shell;
    this._killExisting = killExisting;
    this.onError = onError;
  }

  public async startProcess(): Promise<ChildProcessWithoutNullStreams> {
    if (this._cwd && !fs.existsSync(this._cwd)) {
      throw new Error(`CWD not exists: ${this._cwd}`);
    }
    if (!this._port) {
      // find a port that does not have another process listening on it.
      while (true) {
        this._port = randomInt(10000, 50000);
        const pid = await checkPort(this._port);

        if (pid.length === 0) {
          break;
        }
      }
    } else {
      const pid = await checkPort(this._port);
      if (pid.length > 0) {
        if (this._killExisting) {
          log.warn(`Port ${this._port} is already in use by process ${pid}, killing it`);
          // TODO(nf): verify the process is actually a signal server
          process.kill(-Number(pid), 'SIGINT');
        } else {
          throw new Error(`Port ${this._port} is already in use by process ${pid}`);
        }
      }
    }

    log('starting', {
      binCommand: this._binCommand,
      signalArguments: this._signalArguments,
      cwd: this._cwd,
      port: this._port,
    });

    const server = spawn(this._binCommand, [...this._signalArguments, '--port', this._port.toString()], {
      cwd: this._cwd,
      shell: this._shell,
      env: {
        ...process.env,
        ...this._env,
      },
      // Force creation of process group to ensure all child processes are killed.
      // https://nodejs.org/api/child_process.html#optionsdetached
      detached: true,
    });

    server.stdout.on('data', (data) => {
      log(`TestServer stdout: ${data}`);
    });

    server.stderr.on('data', (data) => {
      log.info(`TestServer stderr: ${data}`);
    });

    server.on('error', (err) => {
      log.error(`TestServer ERROR: ${err}`);
      this.onError?.(err);
    });

    server.on('close', (code) => {
      if ((code! -= 0)) {
        if (this.onError) {
          this.onError?.(new Error(`TestServer exited with code ${code}`));
        } else {
          throw new Error(`TestServer exited with code ${code}`);
        }
      } else {
        log.info(`TestServer exited with code ${code}`);
      }
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
      await this.stop();
      await this.startProcess();
      this._startRetries++;
      if (this._startRetries > this._retriesLimit) {
        throw new Error(`Test Signal server was not started in ${this._retriesLimit} retries`);
      }

      return await this.waitUntilStarted();
    }
  }

  public async stop(): Promise<void> {
    const pid = this._serverProcess?.pid;
    if (!pid) {
      log.warn('pid not found');
      return;
    }
    log.info(`sending SIGINT to process group ${pid}`);
    // kill process group so that all child processes can be killed, e.g. https://github.com/golang/go/issues/40467
    try {
      const delivered = process.kill(-pid, 'SIGINT');
      if (!delivered) {
        log.warn('kill signal was not delivered to child process');
      }
    } catch (err: any) {
      log.warn('kill error', { err });
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
  mode = 'server',
  killExisting = false,
}: {
  port?: number;

  /**
   * Signal binary mode, `server` is in memory implementation.
   * @see https://github.com/dxos/kube
   */
  mode?: 'client' | 'server' | 'p2pserver' | 'keypair' | 'pubsubserver';
  killExisting?: boolean;
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
    port,
    killExisting,
  });
  await server.startProcess();
  await server.waitUntilStarted();
  return server;
};

export const checkPort = async (port: number) => {
  let pid = '';
  try {
    const list = await find('port', port);
    if (list.length > 0) {
      pid = list[0].pid.toString();
    }
  } catch (err) {
    if (typeof err === 'object' && err !== null) {
      // lsof responds with status 1 if pattern does match, along with other errors :(, so this is the best we can do
      if ((err as Record<string, unknown>).status !== 1) {
        throw err;
      }
    } else {
      throw err;
    }
  }
  return pid;
};
