//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { Page } from 'playwright';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { beforeAll, describe, setupPage, test } from '@dxos/test';

// TODO(wittjosiah): Get this from executor.
const BASE_URL = 'http://localhost:4200';

describe('Basic test', () => {
  let page: Page;
  let guestPage: Page;

  beforeAll(async function () {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
    if (mochaExecutor.environment === 'firefox') {
      return;
    }

    const isLoaded = async (page: Page) => {
      return await page.isVisible(':has-text("todos")');
    };

    page = (await setupPage(this, BASE_URL, isLoaded)).page;
    guestPage = (await setupPage(this, BASE_URL, isLoaded)).page;
  });

  describe('Default space', () => {
    test('create a task', async () => {
      // Should be autofocused into new task input.
      await page.keyboard.type('eggs');
      await page.keyboard.press('Enter');

      expect(await page.locator('data-test=todo').locator(':text("eggs")').isVisible()).to.be.true;
      expect(await page.innerText('data-testid=todo-count')).to.eq('1 item left');
    }).skipEnvironments('firefox');

    test('invite guest', async () => {
      await page.locator('data-testid=share-button').click();
      await sleep(5); // Wait for invitation to be written to clipboard.
      const invitationCode = await page.evaluate(() => navigator.clipboard.readText());

      await guestPage.locator('data-testid=open-button').click();
      await guestPage.locator('data-testid=invitation-input').fill(invitationCode);
      await guestPage.locator('data-testid=join-button').click();

      // Wait for redirect.
      await waitForExpect(async () => {
        expect(await page.url()).to.equal(await guestPage.url());
        expect(await guestPage.locator('data-test=todo').locator(':text("eggs")').isVisible()).to.be.true;
      }, 1000);
    }).skipEnvironments('firefox');

    test('toggle a task', async () => {
      await page.locator('data-test=todo').locator(':has-text("eggs")').locator('data-test=todo-toggle').click();

      // Wait for sync.
      await waitForExpect(async () => {
        expect(
          await guestPage
            .locator('data-test=todo')
            .locator(':has-text("eggs")')
            .locator('data-test=todo-toggle')
            .isChecked()
        ).to.be.true;
        expect(await guestPage.innerText('data-testid=todo-count')).to.eq('0 items left');
      }, 10);
    }).skipEnvironments('firefox');

    test('untoggle a task', async () => {
      await page.locator('label:has-text("eggs")').locator('..').locator('data-test=todo-toggle').click();

      // Wait for sync.
      await waitForExpect(async () => {
        expect(
          await guestPage
            .locator('data-test=todo')
            .locator(':has-text("eggs")')
            .locator('data-test=todo-toggle')
            .isChecked()
        ).to.be.false;
        expect(await guestPage.innerText('data-testid=todo-count')).to.eq('1 item left');
      }, 10);
    }).skipEnvironments('firefox');

    test('edit a task', async () => {
      await page.locator('data-test=todo').locator(':text("eggs")').dblclick();

      await page.keyboard.press('Backspace');
      await page.keyboard.type('nog');
      await page.keyboard.press('Enter');

      // Wait for sync.
      await waitForExpect(async () => {
        expect(await guestPage.locator('data-test=todo').locator(':text("eggnog")').isVisible()).to.be.true;
        expect(await guestPage.innerText('data-testid=todo-count')).to.eq('1 item left');
      }, 10);
    }).skipEnvironments('firefox');

    test('cancel editing a task', async () => {
      await page.locator('data-test=todo').locator(':text("eggnog")').dblclick();

      await page.keyboard.press('Escape');

      expect(await page.locator('data-test=todo').locator(':text("eggnog")').isVisible()).to.be.true;
      expect(await page.innerText('data-testid=todo-count')).to.eq('1 item left');
    }).skipEnvironments('firefox');

    test('delete a task', async () => {
      await page.locator('data-test=todo').locator(':has-text("eggnog")').locator('data-test=destroy-button').click();

      // Wait for sync.
      await waitForExpect(async () => {
        expect(await guestPage.isVisible(':has-text("eggnog")')).to.be.false;
      }, 10);
    }).skipEnvironments('firefox');

    test('filter active tasks', async () => {
      await page.locator('data-testid=new-todo').click();

      await page.keyboard.type('eggs');
      await page.keyboard.press('Enter');
      await page.keyboard.type('milk');
      await page.keyboard.press('Enter');
      await page.keyboard.type('butter');
      await page.keyboard.press('Enter');
      await page.keyboard.type('flour');
      await page.keyboard.press('Enter');

      await page.locator('data-test=todo').locator(':has-text("milk")').locator('data-test=todo-toggle').click();
      await page.locator('data-test=todo').locator(':has-text("butter")').locator('data-test=todo-toggle').click();

      await page.locator('data-testid=active-filter').click();

      expect(await page.isVisible(':has-text("milk")')).to.be.false;
      expect(await page.isVisible(':has-text("butter")')).to.be.false;
      expect(await page.locator('data-test=todo').locator(':text("eggs")').isVisible()).to.be.true;
      expect(await page.locator('data-test=todo').locator(':text("flour")').isVisible()).to.be.true;
      expect(await page.innerText('data-testid=todo-count')).to.eq('2 items left');
    }).skipEnvironments('firefox');

    test('filter completed tasks', async () => {
      await page.locator('data-testid=completed-filter').click();

      expect(await page.isVisible(':has-text("eggs")')).to.be.false;
      expect(await page.isVisible(':has-text("flour")')).to.be.false;
      expect(await page.locator('data-test=todo').locator(':text("milk")').isVisible()).to.be.true;
      expect(await page.locator('data-test=todo').locator(':text("butter")').isVisible()).to.be.true;
    }).skipEnvironments('firefox');

    test('toggle all tasks', async () => {
      await page.locator('data-testid=all-filter').click();
      // NOTE: This input behaves weirdly so eval is necessary to toggle it.
      await page.$eval('data-testid=toggle-all', (elem: HTMLLabelElement) => elem.click());

      expect(await page.locator('data-test=todo').locator(':text("eggs")').isVisible()).to.be.true;
      expect(await page.locator('data-test=todo').locator(':text("milk")').isVisible()).to.be.true;
      expect(await page.locator('data-test=todo').locator(':text("butter")').isVisible()).to.be.true;
      expect(await page.locator('data-test=todo').locator(':text("flour")').isVisible()).to.be.true;
      expect(await page.innerText('data-testid=todo-count')).to.eq('0 items left');
    }).skipEnvironments('firefox');

    test('clear completed tasks', async () => {
      await page.locator('data-testid=clear-button').click();

      expect(await page.isVisible(':has-text("eggs")')).to.be.false;
      expect(await page.isVisible(':has-text("milk")')).to.be.false;
      expect(await page.isVisible(':has-text("butter")')).to.be.false;
      expect(await page.isVisible(':has-text("flour")')).to.be.false;
    }).skipEnvironments('firefox');
  });
});
