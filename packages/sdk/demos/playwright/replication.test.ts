/* eslint-disable jest/expect-expect */
//
// Copyright 2020 DXOS.org
//

import { firefox, chromium, Page } from 'playwright';
import expect from 'expect'
import ScreenSizeDetector from 'screen-size-detector';
import robot from 'robotjs'

import { Browser } from './utils';

describe('Replication in a grid', () => {
  const primaryUrl = 'http://google.com'
  let alice: Browser;
  let bob: Browser;
  const screenWidth = robot.getScreenSize().width;
  const screenHeight = robot.getScreenSize().height;

  before(async function () {
    this.timeout(30000);
    this.retries(1);
    alice = new Browser();
    bob = new Browser();
    // await alice.launchApp(primaryUrl);
    // await bob.launchApp(primaryUrl);
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
        await (new Browser()).launchApp(primaryUrl, {args: [
          `--window-position=${clientWidth*col},${clientHeight*row}`,
          `--window-size=${clientWidth},${clientHeight}`
        ]})
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
