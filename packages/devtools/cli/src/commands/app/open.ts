//
// Copyright 2022 DXOS.org
//

import { Args, Flags, ux } from '@oclif/core';
import { chromium } from '@playwright/test';
import chalk from 'chalk';

import { Client } from '@dxos/client';
import { Invitation, InvitationEncoder } from '@dxos/client/invitations';
import { range } from '@dxos/util';

import { BaseCommand } from '../../base-command';
import { hostInvitation } from '../../util';

export default class Open extends BaseCommand<typeof Open> {
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
    instances: Flags.integer({
      description: 'Amount of test instances.',
      default: 1,
    }),
    invite: Flags.boolean({
      description: 'If `true` proceed device invitation for all instances.',
      default: true,
    }),
  };

  async run(): Promise<any> {
    await this.execWithClient(async (client: Client) => {
      if (!client.halo.identity.get()) {
        this.log(chalk`{red Profile not initialized.}`);
        return {};
      }

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      // const { chromium } = require('playwright');

      const browser = await chromium.launch({ headless: false });
      const pages = await Promise.all(
        range(this.flags.instances).map(async () => {
          const context = await browser.newContext();
          return await context.newPage();
        }),
      );

      if (this.flags.invite) {
        const observable = client.halo.createInvitation({
          type: Invitation.Type.MULTIUSE,
          authMethod: Invitation.AuthMethod.NONE,
        });

        const invitationSuccess = hostInvitation({
          observable,
          callbacks: {
            onConnecting: async () => {
              const invitationCode = InvitationEncoder.encode(observable.get());
              pages.forEach(async (page) => {
                const url = new URL(this.args.url);
                url.searchParams.append('deviceInvitationCode', invitationCode);
                await page.goto(url.href);
              });

              this.log(chalk`\n{blue Invitation}: ${invitationCode}`);
            },
          },
          peersNumber: this.flags.instances,
        });

        ux.action.start('Waiting for peers to connect');
        await invitationSuccess;
        ux.action.stop();
      } else {
        pages.forEach(async (page) => await page.goto(this.args.url));
      }
    });
  }
}
