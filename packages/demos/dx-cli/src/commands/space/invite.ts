//
// Copyright 2022 DXOS.org
//

import { CliUx } from '@oclif/core';
import chalk from 'chalk';

import { latch } from '@dxos/async';
import { Client, Party } from '@dxos/client';
import { truncateKey } from '@dxos/debug';

import { BaseCommand } from '../../base-command';

// TODO(burdon): Factor out.
const selectParty = async (parties: Party[]) => {
  // eslint-disable-next-line no-eval
  const inquirer = (await eval('import("inquirer")')).default;
  const { key } = await inquirer.prompt([{
    name: 'key',
    type: 'list',
    message: 'Select a space:',
    choices: parties.map(party => ({
      name: `[${truncateKey(party.key, 8)}] ${party.getProperty('name')}`,
      value: party.key
    }))
  }]);

  return key;
};

export default class Invite extends BaseCommand {
  static override description = 'Create space invitation.';
  static override args = [
    {
      name: 'key'
    }
  ];

  async run (): Promise<any> {
    const { args, flags } = await this.parse(Invite);
    let { key } = args;
    const { timeout } = flags;

    return await this.execWithClient(async (client: Client) => {
      const { value: parties = [] } = await client.echo.queryParties();
      if (!key) {
        key = await selectParty(parties);
      }

      const party = parties.find(party => party.key.toHex().startsWith(key));
      if (!party) {
        this.log('Invalid key');
        return;
      }

      const invitation = await party.createInvitation();
      const descriptor = invitation.descriptor.encode();
      const secret = invitation.secret.toString();

      this.log(chalk`\n{blue Invitation}: ${descriptor}`);
      this.log(chalk`\n{red Secret}: ${secret}\n`);

      const [promise, resolve, reject] = latch({ timeout: timeout * 1000 });

      // TODO(burdon): Async error handling (see kodama).
      invitation.canceled.on(resolve);
      invitation.finished.on(resolve);
      invitation.error.on(reject);

      try {
        CliUx.ux.action.start('Waiting for peer to connect');
        await promise;
        CliUx.ux.action.stop();
        // TODO(burdon): Ends with abort.
        const { value } = party.queryMembers();
        console.log(value);
      } catch (err: any) {
        invitation.cancel();
        CliUx.ux.action.stop(String(err));
      }
    });
  }
}
