//
// Copyright 2021 DXOS.org
//

import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { debug } from 'debug';
import * as process from 'process';
import pkgUp from 'pkg-up';

import { randomInt } from '@dxos/util';
import path, { dirname } from 'path';

const log = debug('dxos:signal:testing');

export class TestBroker {
  private readonly _binPath = path.join(dirname(pkgUp.sync({ cwd: __dirname })!), 'bin'); 
  private readonly _port: number;
  private _serverProcess: ChildProcessWithoutNullStreams;

  constructor (port = 8080) {
    this._port = port;
    this._serverProcess = this.startProcess();
  }

  public startProcess (): ChildProcessWithoutNullStreams {
    const arch = ['x64', 'amd64', 'ppc64'].includes(process.arch) ? 'amd64' : ['arm64'].includes(process.arch) ? 'arm64' : '32';
    if (arch === '32') {
      throw new Error('32 bit architecture not supported');
    }

    const os = process.platform;
    if (!['darwin', 'linux'].includes(os)) {
      throw new Error(`Unsupported platform: ${os}`);
    }

    // const server = spawn(`./signal-test-${os}-${arch} -port ${this._port} server`, [], {cwd: this._binPath});
    log(`Starting signal-test-${os}-${arch} in ${this._binPath}`);
    const server = spawn(
      `./signal-test-${os}-${arch}`, 
      [`-port`, this._port.toString(), `server`], 
      { cwd: this._binPath }
    );

    server.stdout.on('data', (data) => {
      log(`TestServer stdout: ${data}`);
    });

    server.stderr.on('data', (data) => {
      log(`TestServer stderr: ${data}`);
    })

    server.on('error', (err) => {
      log(`TestServer ERROR: ${err}`);
    });

    server.on('close', (code) => {
      log(`TestServer exited with code ${code}`);
    });

    return server;
  }

  public stop (): void {
    this._serverProcess.kill('SIGINT');
  }

  public url (): string {
    // console.log(this._serverProcess.st)
    return `ws://localhost:${this._port}/ws`;
  }
}

/**
 * Creates a test instance of the signal server with swarming disabled and starts it.
 *
 * @param port Port to start the signal server on, random by default.
 */
export const createTestBroker = (port?: number): TestBroker => {
  const server = new TestBroker(port ?? randomInt(10000, 50000));
  return server;
};
