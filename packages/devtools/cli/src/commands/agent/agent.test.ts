//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import yaml from 'js-yaml';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Trigger, asyncTimeout } from '@dxos/async';
import { log } from '@dxos/log';
import { afterAll, beforeAll, describe, test } from '@dxos/test';

import { BIN_PATH, runCommand } from '../../util';

describe('agent', () => {
  const TEST_FOLDER = '/tmp/dxos/testing/cli';
  const HOST_CONFIG_PATH = join(TEST_FOLDER, 'config-host.yml');
  const GUEST_CONFIG_PATH = join(TEST_FOLDER, 'config-guest.yml');

  beforeAll(async () => {
    // Create config files.
    [
      [HOST_CONFIG_PATH, join(TEST_FOLDER, 'host')],
      [GUEST_CONFIG_PATH, join(TEST_FOLDER, 'guest')],
    ].forEach(([configPath, storagePath]) => {
      mkdirSync(dirname(configPath), { recursive: true });
      writeFileSync(
        configPath,
        yaml.dump({
          version: 1,
          runtime: {
            client: {
              storage: {
                persistent: true,
                path: storagePath,
              },
            },
            services: {
              signaling: [
                {
                  server: 'wss://dev.kube.dxos.org/.well-known/dx/signal',
                },
                {
                  server: 'wss://kube.dxos.org/.well-known/dx/signal',
                },
              ],
              ice: [
                {
                  urls: 'stun:kube.dxos.org:3478',
                },
                {
                  urls: 'turn:kube.dxos.org:3478',
                  username: 'dxos',
                  credential: 'dxos',
                },
              ],
            },
          },
        }),
      );
    });
  });

  afterAll(async () => {
    // Cleanup.
    rmSync(TEST_FOLDER, { recursive: true, force: true });
  });

  test('join two agent profiles', async () => {
    const haloName = 'TEST_NAME';

    const host = 'test-profile-1';
    const guest = 'test-profile-2';

    {
      log.info('Starting first test profile agent.');
      await runCommand(`agent start --profile=${host} --config=${HOST_CONFIG_PATH}`, __dirname);
      log.info('Creating halo identity.');
      await runCommand(`halo create ${haloName} --profile=${host} --config=${HOST_CONFIG_PATH}`, __dirname);
    }

    {
      log.info('Starting second test profile agent.');
      await runCommand(`agent start --profile=${guest} --config=${GUEST_CONFIG_PATH}`, __dirname);
    }

    {
      log.info('Inviting second profile to join first profile halo.');
      await performHaloCLIInvitation({
        host: { profile: host, config: HOST_CONFIG_PATH },
        guest: { profile: guest, config: GUEST_CONFIG_PATH },
      });
      log.info('Invitation successful.');
    }

    {
      // TODO(mykola): Remove fancy colorful output from the CLI.
      const firstIdentity = await runCommand(`halo --profile=${host} --json --config=${HOST_CONFIG_PATH}`, __dirname);
      const secondIdentity = await runCommand(
        `halo --profile=${guest} --json --config=${GUEST_CONFIG_PATH}`,
        __dirname,
      );
      expect(secondIdentity).to.equal(firstIdentity);
    }

    {
      await runCommand(`agent stop --profile=${host} --config=${HOST_CONFIG_PATH}`, __dirname);
      await runCommand(`agent stop --profile=${guest} --config=${GUEST_CONFIG_PATH}`, __dirname);
    }
  }).timeout(120_000).tag('flaky');
});

type AgentDescription = {
  profile: string;
  config: string;
};

const performHaloCLIInvitation = async ({ host, guest }: { host: AgentDescription; guest: AgentDescription }) => {
  const invitation = new Trigger<string>();
  const secret = new Trigger<string>();
  const hostClosed = new Trigger();
  const hostProcess = spawn(BIN_PATH, ['halo', 'share', `--profile=${host.profile}`, `--config=${host.config}`], {
    shell: true,
    cwd: __dirname,
  });

  {
    const handleHost = (data: Buffer) => {
      data
        .toString()
        .split('\n')
        .forEach((line: string) => {
          if (line.includes('Invitation')) {
            log('Invitation:', line.split(': ')[1]);
            invitation.wake(line.split(': ')[1]);
          }
          if (line.includes('Secret')) {
            log('Secret:', line.split(': ')[1]);
            secret.wake(line.split(': ')[1]);
          }
          // });
        });
    };
    hostProcess.stdout.on('data', handleHost);
    hostProcess.stderr.on('data', handleHost);
    hostProcess.on('error', (err) => {
      throw err;
    });

    hostProcess.on('exit', (code) => {
      if (code !== 0) {
        throw new Error(`Host process exited with code ${code}`);
      }
      hostClosed.wake();
    });
  }

  const guestReadyForInvitation = new Trigger();
  const guestReadyForSecret = new Trigger();
  const guestProcess = spawn(BIN_PATH, ['halo', 'join', `--profile=${guest.profile}`, `--config=${guest.config}`], {
    shell: true,
    cwd: __dirname,
  });

  {
    const handleGuest = (data: Buffer) => {
      data
        .toString()
        .split('\n')
        .forEach((line: string) => {
          if (line.includes('Invitation')) {
            log('Ready for invitation');
            guestReadyForInvitation.wake();
          }
          if (line.includes('Invitation code')) {
            log('Ready for secret');
            guestReadyForSecret.wake();
          }
        });
    };

    guestProcess.stdout.on('data', handleGuest);

    guestProcess.stderr.on('data', handleGuest);
    guestProcess.on('error', (err) => {
      throw err;
    });
  }

  await asyncTimeout(guestReadyForInvitation.wait(), 10_000);
  guestProcess.stdin.write(`${await invitation.wait()}\n`);
  await asyncTimeout(guestReadyForSecret.wait(), 10_000);
  guestProcess.stdin!.write(`${await secret.wait()}\n`);

  await asyncTimeout(hostClosed.wait(), 10_000);
  hostProcess.kill();
  guestProcess.kill();
};
