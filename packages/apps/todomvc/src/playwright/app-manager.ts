//
// Copyright 2023 DXOS.org
//

import { type Browser, type ConsoleMessage, type Locator, type Page } from '@playwright/test';

import { Trigger, sleep } from '@dxos/async';
import { ShellManager } from '@dxos/shell/testing';
import { setupPage } from '@dxos/test-utils/playwright';

import { type FILTER } from '../constants.ts';

// 127.0.0.1, not localhost: localhost resolves to ::1 first, and Firefox fails ICE outright on a page
// served over IPv6 loopback, which strands every invitation.
export const INITIAL_URL = 'http://127.0.0.1:9006/';

export class AppManager {
  page!: Page;
  shell!: ShellManager;

  private _initialized = false;
  private _close?: () => Promise<void>;
  private _invitationCode = new Trigger<string>();

  constructor(private readonly _browser: Browser) {}

  async init(): Promise<void> {
    if (this._initialized) {
      return;
    }

    const { page, close } = await setupPage(this._browser, { url: INITIAL_URL });
    this.page = page;
    this._close = close;
    this.page.on('console', (message) => this._onConsoleMessage(message));
    this.shell = new ShellManager(this.page);
    await this._waitForBoot(this.newTodo());
    await this._waitForBoot(this.page.getByTestId('list'));
    this._initialized = true;
  }

  /** Waits for `locator` or the root error element, which replaces the whole app; a boot failure throws its text. */
  private async _waitForBoot(locator: Locator): Promise<void> {
    await locator.or(this.appError()).waitFor({ state: 'visible' });
    if (await this.appError().isVisible()) {
      throw new Error(`todomvc failed to boot: ${await this.appError().innerText()}`);
    }
  }

  async close(): Promise<void> {
    await this._close?.();
  }

  // Getters

  appError() {
    return this.page.getByTestId('app-error');
  }

  newTodo() {
    return this.page.getByTestId('new-todo');
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
