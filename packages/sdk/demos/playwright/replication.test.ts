/* eslint-disable jest/expect-expect */
//
// Copyright 2020 DXOS.org
//

import { firefox, chromium, Page } from 'playwright';
import expect from 'expect'
import ScreenSizeDetector from 'screen-size-detector';
import robot from 'robotjs'

import { Browser } from './utils';
import { Client } from '@dxos/client';
import { Party } from '@dxos/echo-db';
import { ONLINE_CONFIG } from '../src';

describe('Replication in a grid', () => {
  const primaryUrl = 'http://localhost:9001/iframe.html?id=demo--replication-grid&viewMode=story'
  let alice: Browser;
  let bob: Browser;
  const screenWidth = robot.getScreenSize().width;
  const screenHeight = robot.getScreenSize().height;
  let inviter: Client;
  let party: Party;

  before(async function () {
    this.timeout(30000);
    this.retries(1);
    alice = new Browser();
    bob = new Browser();
    // await alice.launchApp(primaryUrl);
    // await bob.launchApp(primaryUrl);
    inviter = new Client(ONLINE_CONFIG);
    party = await inviter.echo.createParty();
  });

  after(async () => {
    // await alice.closeBrowser();
  });

  it.only('Opens 2 clients', async () => {
    const rows = 1
    const columns = 2
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
        await gridUser.launchApp(primaryUrl, {args: [
          `--window-position=${clientWidth*col},${clientHeight*row}`,
          `--window-size=${clientWidth},${clientHeight}`
        ]})
        await gridUser.page!.fill('#start-dialog-invitation-input', invitationText)
        await gridUser.page!.click('//span[text()=\'Join Party\']')
      }
    }
  })

  it('Opens 8 clients', async () => {
    const rows = 2
    const columns = 4
    const clientWidth = screenWidth / columns
    const clientHeight = screenHeight / rows
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        await (new Browser()).launchApp(primaryUrl, {args: [
          `--window-position=${clientWidth*col},${clientHeight*row}`,
          `--window-size=${clientWidth},${clientHeight}`
        ]})
      }
    }
  })
});
