/* eslint-disable jest/expect-expect */
//
// Copyright 2020 DXOS.org
//

import { chromium } from 'playwright';
import robot from 'robotjs';

import { Client } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';

import { Browser, ONLINE_CONFIG } from '../playwright/utils';

const ROWS = parseInt(process.env.GRID_DEMO_ROWS ?? '2');
const COLUMNS = parseInt(process.env.GRID_DEMO_COLUMS ?? '4');

describe('Replication in a grid', function () {
  this.timeout(0);

  const primaryUrl = 'http://localhost:9001/iframe.html?id=demo--replication-grid&viewMode=story';

  const marginX = 16;
  const marginY = 36;
  const screenWidth = robot.getScreenSize().width;
  const screenHeight = robot.getScreenSize().height;
  const clientWidth = Math.round((screenWidth - (COLUMNS - 1) * marginX) / COLUMNS);
  const clientHeight = Math.round((screenHeight - (ROWS - 1) * marginY) / ROWS);

  let inviter: Client;
  let party: Party;
 
  const createInvitation = async () => {
    const invitationDescriptor = await party.createInvitation({
      secretProvider: async () => Buffer.from('0000'),
      secretValidator: async () => true
    });
    return JSON.stringify(invitationDescriptor.toQueryParameters());
  };

  before(async function () {
    inviter = new Client(ONLINE_CONFIG);
    await inviter.initialize();
    await inviter.halo.createProfile({ ...createKeyPair(), username: 'inviter' });
    party = await inviter.echo.createParty();
  });

  const createGrid = async (): Promise<Browser[]> => {
    const result: Browser[] = [];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        const gridUser = new Browser();
        await gridUser.launchBrowser(chromium, primaryUrl, {
          args: [
            `--window-position=${(clientWidth + marginX) * col},${(clientHeight + marginY) * row}`,
            `--window-size=${clientWidth},${clientHeight}`
          ]
        });
        await gridUser.page!.fill('#start-dialog-invitation-input', await createInvitation());
        gridUser.page!.click('//span[text()=\'Join Party\']'); // no await, go to next client
        result.push(gridUser);
      }
    }

    return result;
  };

  after(async () => {
    // Close the browsers manually...
  });

  it('Opens 8 clients', async () => {
    await createGrid();
  });
});
