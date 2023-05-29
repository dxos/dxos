//
// Copyright 2022 DXOS.org
//

import { Args, ux } from '@oclif/core';
import chalk from 'chalk';
import { chromium } from 'playwright';

import { Client, Invitation, InvitationEncoder } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { hostInvitation } from '../../util';

export default class Open extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Opens app with provided url and process device invitation.';

  static override args = {
    ...super.args,
    url: Args.string({
      description: 'App URL.',
      required: true,
    }),
  };

  static override flags = {
    ...super.flags,
    
  }

  async run(): Promise<any> {
    await this.execWithClient(async (client: Client) => {
      if (!client.halo.identity.get()) {
        this.log(chalk`{red Profile not initialized.}`);
        return {};
      }
      const { args } = await this.parse(Open);
      const url = new URL(args.url);
      const browser = await chromium.launch({ headless: false });
      const page = await browser.newPage();

      const observable = client.halo.createInvitation({
        authMethod: Invitation.AuthMethod.NONE,
      });
      const invitationSuccess = hostInvitation(observable, {
        onConnecting: async () => {
          const invitationCode = InvitationEncoder.encode(observable.get());
          url.searchParams.append('deviceInvitationCode', invitationCode);
          await page.goto(url.href);

          this.log(chalk`\n{blue Invitation}: ${invitationCode}`);
        },
      });

      ux.action.start('Waiting for peer to connect');
      await invitationSuccess;
      ux.action.stop();
    });
  }
}
