//
// Copyright 2023 DXOS.org
//

import { expect, test } from '@playwright/test';

import { FILTER } from '../constants';

import { AppManager } from './app-manager';

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

  test.beforeEach(async ({ browser, browserName }) => {
    host = new AppManager(browser);

    await host.init();
    // TODO(wittjosiah): WebRTC only available in chromium browser for testing currently.
    //  https://github.com/microsoft/playwright/issues/2973
    guest = browserName === 'chromium' ? new AppManager(browser) : host;
    if (browserName === 'chromium') {
      await guest.init();
      await host.openShareSpace();
      const invitationCode = await host.shell.createSpaceInvitation();
      const authCode = await host.shell.getAuthCode();

      await guest.openJoinSpace();
      await guest.shell.acceptSpaceInvitation(invitationCode);
      await guest.shell.authenticate(authCode);
      await host.shell.closeShell();

      await guest.page.waitForURL(await host.page.url());
    }
  });

  test.afterEach(async () => {
    await host.page.close();
    await guest.page.close();
  });

  test.describe('Default space', () => {
    test('create a task', async () => {
      await host.createTodo(Groceries.Eggs);

      await expect(guest.todo(Groceries.Eggs)).toBeVisible();
      expect(await guest.todoCount()).toEqual(1);
    });

    test('toggle a task', async () => {
      await host.createTodo(Groceries.Eggs);
      await host.toggleTodo(Groceries.Eggs);

      await expect(guest.todoToggle(Groceries.Eggs)).toBeChecked();
      expect(await guest.todoCount()).toEqual(0);

      await host.toggleTodo(Groceries.Eggs);

      await expect(guest.todoToggle(Groceries.Eggs)).not.toBeChecked();
      expect(await guest.todoCount()).toEqual(1);
    });

    test('edit a task', async () => {
      await host.createTodo(Groceries.Eggs);
      await host.setTodoEditing(Groceries.Eggs);
      await host.page.keyboard.press('Backspace');
      await host.page.keyboard.type('nog');
      await host.submitTodoEdits();

      await expect(guest.todo(Groceries.Eggnog)).toBeVisible();
      expect(await guest.todoCount()).toEqual(1);
    });

    test('cancel editing a task', async () => {
      await host.createTodo(Groceries.Eggnog);
      await host.setTodoEditing(Groceries.Eggnog);
      await host.cancelTodoEditing();

      await expect(guest.todo(Groceries.Eggnog)).toBeVisible();
      expect(await guest.todoCount()).toEqual(1);
    });

    // TODO(wittjosiah): Flaky.
    test.skip('delete a task', async () => {
      await host.createTodo(Groceries.Eggnog);

      await expect(guest.todo(Groceries.Eggnog)).toBeVisible();

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
      await guest.filterTodos(FILTER.ACTIVE);

      await expect(guest.hasText(Groceries.Milk)).not.toBeVisible();
      await expect(guest.hasText(Groceries.Butter)).not.toBeVisible();
      await expect(guest.todo(Groceries.Eggs)).toBeVisible();
      await expect(guest.todo(Groceries.Flour)).toBeVisible();
      expect(await guest.todoCount()).toEqual(2);
    });

    test('filter completed tasks', async () => {
      await host.createTodo(Groceries.Eggs);
      await host.createTodo(Groceries.Milk);
      await host.createTodo(Groceries.Butter);
      await host.createTodo(Groceries.Flour);

      await host.toggleTodo(Groceries.Milk);
      await host.toggleTodo(Groceries.Butter);
      await guest.filterTodos(FILTER.COMPLETED);

      await expect(guest.hasText(Groceries.Eggs)).not.toBeVisible();
      await expect(guest.hasText(Groceries.Flour)).not.toBeVisible();
      await expect(guest.todo(Groceries.Milk)).toBeVisible();
      await expect(guest.todo(Groceries.Butter)).toBeVisible();
      expect(await guest.todoCount()).toEqual(2);
    });

    test('toggle all tasks & clear completed', async () => {
      await host.createTodo(Groceries.Eggs);
      await host.createTodo(Groceries.Milk);
      await host.createTodo(Groceries.Butter);
      await host.createTodo(Groceries.Flour);
      await host.toggleAll();

      await expect(guest.todoToggle(Groceries.Eggs)).toBeChecked();
      await expect(guest.todoToggle(Groceries.Milk)).toBeChecked();
      await expect(guest.todoToggle(Groceries.Butter)).toBeChecked();
      await expect(guest.todoToggle(Groceries.Flour)).toBeChecked();
      expect(await guest.todoCount()).toEqual(0);

      await host.clearCompleted();

      await expect(guest.hasText(Groceries.Eggs)).not.toBeVisible();
      await expect(guest.hasText(Groceries.Milk)).not.toBeVisible();
      await expect(guest.hasText(Groceries.Butter)).not.toBeVisible();
      await expect(guest.hasText(Groceries.Flour)).not.toBeVisible();
    });
  });
});
