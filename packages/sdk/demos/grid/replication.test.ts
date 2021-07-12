/* eslint-disable jest/expect-expect */
//
// Copyright 2020 DXOS.org
//

import { chromium } from 'playwright';
import robot from 'robotjs'

import { Browser, ONLINE_CONFIG} from '../playwright/utils';
import { Client } from '@dxos/client';
import { Party } from '@dxos/echo-db';
import { createKeyPair } from '@dxos/crypto';

const ROWS = parseInt(process.env.GRID_DEMO_ROWS ?? '2')
const COLUMNS = parseInt(process.env.GRID_DEMO_COLUMS ?? '4')

describe('Replication in a grid', function () {
  this.timeout(0);
  const primaryUrl = 'http://localhost:9001/iframe.html?id=demo--replication-grid&viewMode=story'
  const screenWidth = robot.getScreenSize().width;
  const screenHeight = robot.getScreenSize().height;
  let inviter: Client;
  let party: Party;

  before(async function () {
    inviter = new Client(ONLINE_CONFIG);
    await inviter.initialize();
    await inviter.createProfile({ ...createKeyPair(), username: 'inviter' });
    party = await inviter.echo.createParty();
  });

  after(async () => {
    // Close the browsers manually...
  });

  it('Opens 8 clients', async () => {
    const clientWidth = screenWidth / COLUMNS
    const clientHeight = screenHeight / ROWS
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        const invitation = await party.createInvitation({
          secretProvider: async () => Buffer.from('0000'),
          secretValidator: async () => true
        });
        const invitationText = JSON.stringify(invitation.toQueryParameters());
        const gridUser = new Browser()
        await gridUser.launchBrowser(chromium, primaryUrl, {args: [
          `--window-position=${clientWidth*col},${clientHeight*row}`,
          `--window-size=${clientWidth},${clientHeight}`
        ]})
        await gridUser.page!.fill('#start-dialog-invitation-input', invitationText)
        gridUser.page!.click('//span[text()=\'Join Party\']') // no await, go to next client
      }
    }
  })
});
