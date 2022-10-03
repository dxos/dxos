
//
// Copyright 2022 DXOS.org
//

import { expect, Page, test } from '@playwright/test';
import waitForExpect from 'wait-for-expect';

import { createTestBroker, TestBroker } from '@dxos/signal';

import workerConfig from '../../src/worker-config';

const config = {
  baseUrl: 'http://127.0.0.1:5173'
};

test.describe('WebRTC ', () => {
  let pageA: Page;
  let pageB: Page;
  let broker: TestBroker;

  test.beforeAll(async ({ browser }) => {
    broker = await createTestBroker(workerConfig.signalPort);

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    pageA = await contextA.newPage();
    pageB = await contextB.newPage();
    await pageB.goto(`${config.baseUrl}/worker.html?peer=2`);
    await pageA.goto(`${config.baseUrl}/worker.html?peer=1`);
  });

  test.afterAll(() => {
    broker.stop();
  });

  test('Establish webRTC connection.', async () => {
    console.log(1);
    // await waitForExpect(async () => {
    //   {
    //     // const isVisible = await pageA.isVisible(':has-text("Hello message")');
    //     // expect(isVisible).toBeTruthy();
    //     // const isClosed = await pageA.frameLocator('#test-iframe').locator('p:right-of(:text("closed"), 10)').textContent();
    //     // expect(isClosed).toEqual('false');
    //   }

    //   {
    //     // const isVisible = await pageB.isVisible(':has-text("Hello message")');
    //     // expect(isVisible).toBeTruthy();
    //     const isClosed = await pageB.frameLocator('#test-iframe').locator('p:right-of(:text("closed"), 10)').textContent();
    //     // expect(isClosed).toEqual('false');
    //   }
    // });
  });
});
