//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';
import chalk from 'chalk';

import { Trigger } from '@dxos/async';
import { Client, Invitation, InvitationEncoder } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Share extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Create HALO (device) invitation.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const identity = client.halo.identity;
      if (!identity) {
        this.log(chalk`{red Profile not initialized.}`);
        return {};
      } else {
        const observable = await client.halo.createInvitation();

        const connecting = new Trigger<Invitation>();
        const done = new Trigger<Invitation>();

        observable.subscribe(
          (invitation) => {
            switch (invitation.state) {
              case Invitation.State.CONNECTING: {
                connecting.wake(invitation);
                break;
              }

              case Invitation.State.SUCCESS: {
                done.wake(invitation);
                break;
              }
            }
          },
          (err) => {
            throw err;
          },
        );

        await connecting.wait();

        const invitationCode = InvitationEncoder.encode(observable.get());

        this.log(chalk`\n{blue Invitation}: ${invitationCode}`);
        this.log(chalk`\n{red Secret}: ${observable.get().authCode}\n`);

        ux.action.start('Waiting for peer to connect');
        await done.wait();
        ux.action.stop();
      }
    });
  }
}
