//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { spawn } from 'node:child_process';

import { Trigger, asyncTimeout } from '@dxos/async';
import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

import { BIN_PATH, runCommand } from '../../util';

describe('agent', () => {
  test('join two agent profiles', async () => {
    const haloName = 'TEST_NAME';

    const firstProfile = 'test-profile-1';
    const secondProfile = 'test-profile-2';

    {
      log.info('Starting first test profile agent.');
      await runCommand(`reset --profile=${firstProfile} --force`, __dirname);
      log.info('Creating halo identity.');
      await runCommand(`halo create ${haloName} --profile=${firstProfile}`, __dirname);
    }

    {
      log.info('Starting second test profile agent.');
      await runCommand(`reset --profile=${secondProfile} --force`, __dirname);
    }

    {
      log.info('Inviting second profile to join first profile halo.');
      await performHaloCLIInvitation(firstProfile, secondProfile);
      log.info('Invitation successful.');
    }

    {
      // TODO(mykola): Remove fancy colorful output from the CLI.
      const firstIdentity = await runCommand(`halo --profile=${firstProfile} --json`, __dirname);
      const secondIdentity = await runCommand(`halo --profile=${secondProfile} --json`, __dirname);
      expect(secondIdentity).to.equal(firstIdentity);
    }

    {
      await runCommand(`agent stop --profile=${firstProfile}`, __dirname);
      await runCommand(`agent stop --profile=${secondProfile}`, __dirname);
    }
  }).timeout(120_000);
});

const performHaloCLIInvitation = async (hostProfile: string, guestProfile: string) => {
  const invitation = new Trigger<string>();
  const secret = new Trigger<string>();
  const hostClosed = new Trigger();
  const host = spawn(BIN_PATH, ['halo', 'share', `--profile=${hostProfile}`], { shell: true });

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
    host.stdout.on('data', handleHost);
    host.stderr.on('data', handleHost);
    host.on('error', (err) => {
      throw err;
    });

    host.on('exit', (code) => {
      if (code !== 0) {
        throw new Error(`Host process exited with code ${code}`);
      }
      hostClosed.wake();
    });
  }

  const guestReadyForInvitation = new Trigger();
  const guestReadyForSecret = new Trigger();
  const guest = spawn(BIN_PATH, ['halo', 'join', `--profile=${guestProfile}`], { shell: true });

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

    guest.stdout.on('data', handleGuest);

    guest.stderr.on('data', handleGuest);
    guest.on('error', (err) => {
      throw err;
    });
  }

  await asyncTimeout(guestReadyForInvitation.wait(), 10_000);
  guest.stdin.write(`${await invitation.wait()}\n`);
  await asyncTimeout(guestReadyForSecret.wait(), 10_000);
  guest.stdin!.write(`${await secret.wait()}\n`);

  await asyncTimeout(hostClosed.wait(), 10_000);
  host.kill();
  guest.kill();
};
