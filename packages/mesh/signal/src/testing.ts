//
// Copyright 2021 DXOS.org
//

import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { debug } from 'debug';
import * as process from 'process';

import { randomInt } from '@dxos/util';

const log = debug('dxos:mesh:signal:testing');

export class TestBroker {
  private readonly port: number;
  private serverProcess: ChildProcessWithoutNullStreams;

  constructor (port = 8080) {
    this.port = port;
    this.serverProcess = this.startProcess();
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

    const server = spawn(`signal-test-${os}-${arch} -port ${this.port} server`, [], {});

    server.stdout.on('data', (data) => {
      log(`TestServer: ${data}`);
    });

    server.on('error', (err) => {
      log(`TestServer ERROR: ${err}`);
    });

    return server;
  }

  public stop (): void {
    this.serverProcess.kill('SIGINT');
  }

  public url (): string {
    return `wss://localhost:${this.port}/ws`;
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
