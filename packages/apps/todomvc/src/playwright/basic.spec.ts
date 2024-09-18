//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager';
import { FILTER } from '../constants';

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

      await expect(host.todo(Groceries.Eggs)).toBeVisible();
      expect(await host.todoCount()).toEqual(1);
    });

    test('invite guest', async ({ browserName }) => {
      if (browserName !== 'chromium') {
        return;
      }

      await host.openShareSpace();
      const invitationCode = await host.shell.createSpaceInvitation();
      const authCode = await host.shell.getAuthCode();

      await guest.openJoinSpace();
      await guest.shell.acceptSpaceInvitation(invitationCode);
      await guest.shell.authenticate(authCode);
      await host.shell.closeShell();

      await guest.page.waitForURL(await host.page.url());
      await expect(guest.todo(Groceries.Eggs)).toBeVisible();
    });

    test('toggle a task', async () => {
      await host.toggleTodo(Groceries.Eggs);

      await expect(guest.todoToggle(Groceries.Eggs)).toBeChecked();
      expect(await guest.todoCount()).toEqual(0);
    });

    test('untoggle a task', async () => {
      await host.toggleTodo(Groceries.Eggs);

      await expect(guest.todoToggle(Groceries.Eggs)).not.toBeChecked();
      expect(await guest.todoCount()).toEqual(1);
    });

    test('edit a task', async () => {
      await host.setTodoEditing(Groceries.Eggs);
      await host.page.keyboard.press('Backspace');
      await host.page.keyboard.type('nog');
      await host.submitTodoEdits();

      await expect(guest.todo(Groceries.Eggnog)).toBeVisible;
      expect(await guest.todoCount()).toEqual(1);
    });

    test('cancel editing a task', async () => {
      await host.setTodoEditing(Groceries.Eggnog);
      await host.cancelTodoEditing();

      await expect(host.todo(Groceries.Eggnog)).toBeVisible();
      expect(await host.todoCount()).toEqual(1);
    });

    test('delete a task', async () => {
      await host.deleteTodo(Groceries.Eggnog);

      await expect(guest.hasText(Groceries.Eggnog)).not.toBeVisible();
    });

    test('filter active tasks', async () => {
      await host.createTodo(Groceries.Eggs);
      await host.createTodo(Groceries.Milk);
      await host.createTodo(Groceries.Butter);
      await host.createTodo(Groceries.Flour);

      await host.toggleTodo(Groceries.Milk);
      await host.toggleTodo(Groceries.Butter);
      await host.filterTodos(FILTER.ACTIVE);

      await expect(host.hasText(Groceries.Milk)).not.toBeVisible();
      await expect(host.hasText(Groceries.Butter)).not.toBeVisible();
      await expect(host.todo(Groceries.Eggs)).toBeVisible();
      await expect(host.todo(Groceries.Flour)).toBeVisible();
      expect(await host.todoCount()).toEqual(2);
    });

    test('filter completed tasks', async () => {
      await host.filterTodos(FILTER.COMPLETED);

      await expect(host.hasText(Groceries.Eggs)).not.toBeVisible();
      await expect(host.hasText(Groceries.Flour)).not.toBeVisible();
      await expect(host.todo(Groceries.Milk)).toBeVisible();
      await expect(host.todo(Groceries.Butter)).toBeVisible();
    });

    test('toggle all tasks', async () => {
      await host.filterTodos(FILTER.ALL);
      await host.toggleAll();

      await expect(host.todoToggle(Groceries.Eggs)).toBeChecked();
      await expect(host.todoToggle(Groceries.Milk)).toBeChecked();
      await expect(host.todoToggle(Groceries.Butter)).toBeChecked();
      await expect(host.todoToggle(Groceries.Flour)).toBeChecked();
      expect(await host.todoCount()).toEqual(0);
    });

    test('clear completed tasks', async () => {
      await host.clearCompleted();

      await expect(host.hasText(Groceries.Eggs)).not.toBeVisible();
      await expect(host.hasText(Groceries.Milk)).not.toBeVisible();
      await expect(host.hasText(Groceries.Butter)).not.toBeVisible();
      await expect(host.hasText(Groceries.Flour)).not.toBeVisible();
    });
  });
});
