//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { AppManager } from './app-manager';
import { FILTER } from '../constants';

// TODO(burdon): ???
enum Groceries {
  Eggs = 'eggs',
  Eggnog = 'eggnog',
  Milk = 'milk',
  Butter = 'butter',
  Flour = 'flour',
}

test.describe('Basic test', () => {
  let host: AppManager;
  let guest: AppManager;

  test.beforeAll(async ({ browser, browserName }) => {
    host = new AppManager(browser);

    await host.init();
    // TODO(wittjosiah): WebRTC only available in chromium browser for testing currently.
    //  https://github.com/microsoft/playwright/issues/2973
    guest = browserName === 'chromium' ? new AppManager(browser) : host;
    if (browserName === 'chromium') {
      await guest.init();
    }
  });

  test.describe('Default space', () => {
    test('create a task', async () => {
      await host.createTodo(Groceries.Eggs);

      expect(await host.todoIsVisible(Groceries.Eggs)).to.be.true;
      expect(await host.todoCount()).to.equal(1);
    });

    test('invite guest', async ({ browserName }) => {
      if (browserName !== 'chromium') {
        return;
      }

      const invitationCode = await host.shell.createSpaceInvitation();
      const authCode = await host.shell.getAuthCode();

      await guest.openJoinSpace();
      await guest.shell.acceptSpaceInvitation(invitationCode);
      await guest.shell.authenticate(authCode);
      await host.shell.closeShell();

      // Wait for redirect.
      await waitForExpect(async () => {
        expect(await host.page.url()).to.equal(await guest.page.url());
        expect(await guest.todoIsVisible(Groceries.Eggs)).to.be.true;
      });
    });

    test('toggle a task', async () => {
      await host.toggleTodo(Groceries.Eggs);

      // Wait for sync.
      await waitForExpect(async () => {
        expect(await guest.todoIsCompleted(Groceries.Eggs)).to.be.true;
        expect(await guest.todoCount()).to.equal(0);
      }, 10);
    });

    test('untoggle a task', async () => {
      await host.toggleTodo(Groceries.Eggs);

      // Wait for sync.
      await waitForExpect(async () => {
        expect(await guest.todoIsCompleted(Groceries.Eggs)).to.be.false;
        expect(await guest.todoCount()).to.equal(1);
      }, 10);
    });

    test('edit a task', async () => {
      await host.setTodoEditing(Groceries.Eggs);
      await host.page.keyboard.press('Backspace');
      await host.page.keyboard.type('nog');
      await host.submitTodoEdits();

      // Wait for sync.
      await waitForExpect(async () => {
        expect(await guest.todoIsVisible(Groceries.Eggnog)).to.be.true;
        expect(await guest.todoCount()).to.equal(1);
      }, 10);
    });

    test('cancel editing a task', async () => {
      await host.setTodoEditing(Groceries.Eggnog);
      await host.cancelTodoEditing();

      expect(await host.todoIsVisible(Groceries.Eggnog)).to.be.true;
      expect(await host.todoCount()).to.equal(1);
    });

    test('delete a task', async () => {
      await host.deleteTodo(Groceries.Eggnog);

      // Wait for sync.
      await waitForExpect(async () => {
        expect(await guest.textIsVisible(Groceries.Eggnog)).to.be.false;
      }, 10);
    });

    test('filter active tasks', async () => {
      await host.createTodo(Groceries.Eggs);
      await host.createTodo(Groceries.Milk);
      await host.createTodo(Groceries.Butter);
      await host.createTodo(Groceries.Flour);

      await host.toggleTodo(Groceries.Milk);
      await host.toggleTodo(Groceries.Butter);
      await host.filterTodos(FILTER.ACTIVE);

      // Wait for render.
      await waitForExpect(async () => {
        expect(await host.textIsVisible(Groceries.Milk)).to.be.false;
        expect(await host.textIsVisible(Groceries.Butter)).to.be.false;
        expect(await host.todoIsVisible(Groceries.Eggs)).to.be.true;
        expect(await host.todoIsVisible(Groceries.Flour)).to.be.true;
        expect(await host.todoCount()).to.equal(2);
      }, 10);
    });

    test('filter completed tasks', async () => {
      await host.filterTodos(FILTER.COMPLETED);

      expect(await host.textIsVisible(Groceries.Eggs)).to.be.false;
      expect(await host.textIsVisible(Groceries.Flour)).to.be.false;
      expect(await host.todoIsVisible(Groceries.Milk)).to.be.true;
      expect(await host.todoIsVisible(Groceries.Butter)).to.be.true;
    });

    test('toggle all tasks', async () => {
      await host.filterTodos(FILTER.ALL);
      await host.toggleAll();

      expect(await host.todoIsCompleted(Groceries.Eggs)).to.be.true;
      expect(await host.todoIsCompleted(Groceries.Milk)).to.be.true;
      expect(await host.todoIsCompleted(Groceries.Butter)).to.be.true;
      expect(await host.todoIsCompleted(Groceries.Flour)).to.be.true;
      expect(await host.todoCount()).to.equal(0);
    });

    test('clear completed tasks', async () => {
      await host.clearCompleted();

      expect(await host.textIsVisible(Groceries.Eggs)).to.be.false;
      expect(await host.textIsVisible(Groceries.Milk)).to.be.false;
      expect(await host.textIsVisible(Groceries.Butter)).to.be.false;
      expect(await host.textIsVisible(Groceries.Flour)).to.be.false;
    });
  });
});
