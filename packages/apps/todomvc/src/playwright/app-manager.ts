//
// Copyright 2023 DXOS.org
//

import type { Context as MochaContext } from 'mocha';
import type { ConsoleMessage, Page } from 'playwright';

import { sleep, Trigger } from '@dxos/async';
import { ShellManager } from '@dxos/halo-app';
import { setupPage } from '@dxos/test';

import { FILTER } from '../constants';

export class AppManager {
  page!: Page;
  shell!: ShellManager;

  private _initialized = false;
  private _invitationCode = new Trigger<string>();

  constructor(private readonly mochaContext: MochaContext) {}

  async init() {
    if (this._initialized) {
      return;
    }

    const { page } = await setupPage(this.mochaContext, {
      url: mochaExecutor.executorResult.baseUrl,
      waitFor: async (page) => page.getByTestId('todo-placeholder').isVisible()
    });
    this.page = page;
    this.page.on('console', (message) => this._onConsoleMessage(message));
    this.shell = new ShellManager(this.page);
    this._initialized = true;
  }

  // Getters

  async isPlaceholderVisible() {
    return await this.page.getByTestId('todo-placeholder').isVisible();
  }

  async isNewTodoVisible() {
    return await this.page.getByTestId('new-todo').isVisible();
  }

  async textIsVisible(text: string) {
    return await this.page.isVisible(`:has-text("${text}")`);
  }

  async todoIsVisible(title: string) {
    return await this.page.getByTestId('todo').locator(`:text("${title}")`).isVisible();
  }

  async todoIsCompleted(title: string) {
    return await this.page.getByTestId('todo').locator(`:has-text("${title}")`).getByTestId('todo-toggle').isChecked();
  }

  async todoCount() {
    try {
      const countString = await this.page.getByTestId('todo-count').innerText({ timeout: 100 });
      return parseInt(countString.split(' ')[0]);
    } catch (e) {
      return null;
    }
  }

  // Actions

  async createTodo(title: string) {
    await this.page.keyboard.type(title);
    await this.page.keyboard.press('Enter');
  }

  async focusNewTodo() {
    await this.page.getByTestId('new-todo').click();
  }

  async toggleTodo(title: string) {
    await this.page.getByTestId('todo').locator(`:has-text("${title}")`).getByTestId('todo-toggle').click();
  }

  async setTodoEditing(title: string) {
    await this.page.getByTestId('todo').locator(`:text("${title}")`).dblclick();
  }

  async submitTodoEdits() {
    await this.page.keyboard.press('Enter');
  }

  async cancelTodoEditing() {
    await this.page.keyboard.press('Escape');
  }

  async deleteTodo(title: string) {
    await this.page.getByTestId('todo').locator(`:has-text("${title}")`).getByTestId('destroy-button').click();
  }

  async toggleAll() {
    // NOTE: This input behaves weirdly so eval is necessary to toggle it.
    await this.page.$eval('data-testid=toggle-all', (elem: HTMLLabelElement) => elem.click());
    // Allow some time for the page to update when actioning the whole list.
    await sleep(10);
  }

  async clearCompleted() {
    await this.page.getByTestId('clear-button').click();
    // Allow some time for the page to update when actioning the whole list.
    await sleep(10);
  }

  async filterTodos(filter: FILTER) {
    await this.page.getByTestId(`${filter}-filter`).click();
  }

  private async _onConsoleMessage(message: ConsoleMessage) {
    try {
      const json = JSON.parse(message.text());
      if (json.invitationCode) {
        this._invitationCode.wake(json.invitationCode);
      }
    } catch {}
  }
}
