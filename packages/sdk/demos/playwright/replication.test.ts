/* eslint-disable jest/expect-expect */
//
// Copyright 2020 DXOS.org
//

import { firefox, chromium, Page, webkit, _electron } from 'playwright';
import expect from 'expect'
import ScreenSizeDetector from 'screen-size-detector';
import robot from 'robotjs'

import { Browser } from './utils';
import { Client } from '@dxos/client';
import { Party } from '@dxos/echo-db';
import { ONLINE_CONFIG } from './utils';
import { createKeyPair } from '@dxos/crypto';

// Skipped - it is supposed to be run locally manually for visual demos.
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
    const rows = 2
    const columns = 4
    const clientWidth = screenWidth / columns
    const clientHeight = screenHeight / rows
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
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
