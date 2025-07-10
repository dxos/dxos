//
// Copyright 2023 DXOS.org
//

import { type Browser, type ConsoleMessage, type Page } from '@playwright/test';

import { sleep, Trigger } from '@dxos/async';
import { ShellManager } from '@dxos/shell/testing';
import { setupPage } from '@dxos/test-utils/playwright';

import { type FILTER } from '../constants';

export const INITIAL_URL = 'http://localhost:4173/';

export class AppManager {
  page!: Page;
  shell!: ShellManager;

  private _initialized = false;
  private _invitationCode = new Trigger<string>();

  constructor(private readonly _browser: Browser) {}

  async init(): Promise<void> {
    if (this._initialized) {
      return;
    }

    const { page } = await setupPage(this._browser, { url: INITIAL_URL });
    this.page = page;
    this.page.on('console', (message) => this._onConsoleMessage(message));
    this.shell = new ShellManager(this.page);
    await this.newTodo().waitFor({ state: 'visible' });
    await this.page.getByTestId('placeholder').waitFor({ state: 'hidden' });
    this._initialized = true;
  }

  // Getters

  newTodo() {
    return this.page.getByTestId('new-todo');
  }

  hasText(text: string) {
    return this.page.locator(`:has-text("${text}")`);
  }

  todo(title: string) {
    return this.page.getByTestId('todo').locator(`:text("${title}")`);
  }

  todoToggle(title: string) {
    return this.page.getByTestId('todo').locator(`:has-text("${title}")`).getByTestId('todo-toggle');
  }

  async todoCount(): Promise<number | null> {
    try {
      const countString = await this.page.getByTestId('todo-count').innerText({ timeout: 100 });
      return parseInt(countString.split(' ')[0]);
    } catch (e) {
      return null;
    }
  }

  // Actions

  async createSpace(): Promise<void> {
    await this.page.getByTestId('add-button').click();
  }

  async openShareSpace(): Promise<void> {
    await this.page.getByTestId('share-button').click();
  }

  async openJoinSpace(): Promise<void> {
    await this.page.getByTestId('join-button').click();
  }

  async createTodo(title: string): Promise<void> {
    await this.page.getByTestId('new-todo').fill(title);
    await this.page.keyboard.press('Enter');
  }

  async toggleTodo(title: string): Promise<void> {
    await this.todoToggle(title).click();
  }

  async setTodoEditing(title: string): Promise<void> {
    await this.page.getByTestId('todo').locator(`:text("${title}")`).dblclick();
  }

  async submitTodoEdits(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async cancelTodoEditing(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async deleteTodo(title: string): Promise<void> {
    await this.todo(title).hover();
    const destroy = this.page.getByTestId('todo').locator(`:has-text("${title}")`).getByTestId('destroy-button');
    // NOTE: This input behaves weirdly so eval is necessary to toggle it.
    await destroy.evaluate((elem: HTMLButtonElement) => elem.click());
  }

  async toggleAll(): Promise<void> {
    // NOTE: This input behaves weirdly so eval is necessary to toggle it.
    await this.page.$eval('data-testid=toggle-all', (elem: HTMLLabelElement) => elem.click());
    // Allow some time for the page to update when actioning the whole list.
    await sleep(500);
  }

  async clearCompleted(): Promise<void> {
    await this.page.getByTestId('clear-button').click();
    // Allow some time for the page to update when actioning the whole list.
    await sleep(500);
  }

  async filterTodos(filter: FILTER): Promise<void> {
    await this.page.getByTestId(`${filter}-filter`).click();
  }

  private async _onConsoleMessage(message: ConsoleMessage): Promise<void> {
    try {
      const json = JSON.parse(message.text());
      if (json.invitationCode) {
        this._invitationCode.wake(json.invitationCode);
      }
    } catch {}
  }
}
