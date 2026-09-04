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
  // TODO(wittjosiah): STRICTLY temporary, remove when DX-1152 lands. Every test here runs a two-peer
  //   invitation in `beforeEach`, and a controlled comparison measured this suite failing at the same
  //   rate as composer's collaboration tests with the same signature (the shell's auth-code input
  //   disabled at `connectingSpaceInvitation`) — the production-edge stall, not this app. Trunk still
  //   records every first-attempt failure. Do not copy this pattern without a tracked issue.
  test.describe.configure({ retries: 2 });

  let host: AppManager;
  let guest: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser);

    await host.init();
    guest = new AppManager(browser);
    await guest.init();
    await host.openShareSpace();
    const invitationCode = await host.shell.createSpaceInvitation();
    const authCode = await host.shell.getAuthCode();

    await guest.openJoinSpace();
    await guest.shell.acceptSpaceInvitation(invitationCode);
    await guest.shell.authenticate(authCode);
    await host.shell.closeShell();

    await guest.page.waitForURL(await host.page.url());
  });

  test.afterEach(async () => {
    await host.close();
    await guest.close();
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

    test('delete a task', async () => {
      await host.createTodo(Groceries.Eggnog);

      await expect(guest.todo(Groceries.Eggnog)).toBeVisible();
      expect(await guest.todoCount()).toEqual(1);

      await host.deleteTodo(Groceries.Eggnog);

      await expect(guest.todo(Groceries.Eggnog)).toHaveCount(0);
    });

    test('filter active tasks', async () => {
      await host.createTodo(Groceries.Eggs);
      await host.createTodo(Groceries.Milk);
      await host.createTodo(Groceries.Butter);
      await host.createTodo(Groceries.Flour);

      await host.toggleTodo(Groceries.Milk);
      await host.toggleTodo(Groceries.Butter);
      await guest.filterTodos(FILTER.ACTIVE);

      await expect(guest.todo(Groceries.Milk)).toHaveCount(0);
      await expect(guest.todo(Groceries.Butter)).toHaveCount(0);
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

      await expect(guest.todo(Groceries.Eggs)).toHaveCount(0);
      await expect(guest.todo(Groceries.Flour)).toHaveCount(0);
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

      await expect(guest.todo(Groceries.Eggs)).toHaveCount(0);
      await expect(guest.todo(Groceries.Milk)).toHaveCount(0);
      await expect(guest.todo(Groceries.Butter)).toHaveCount(0);
      await expect(guest.todo(Groceries.Flour)).toHaveCount(0);
    });
  });
});
