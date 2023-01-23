//
// Copyright 2023 DXOS.org
//

import type { Context as MochaContext } from 'mocha';
import type { Page } from 'playwright';

import { sleep, synchronized } from '@dxos/async';
import { setupPage } from '@dxos/test';

import { FILTER } from '../constants';

// TODO(wittjosiah): Get this from executor.
const BASE_URL = 'http://localhost:4200';

export class AppManager {
  page!: Page;

  private initialized = false;

  constructor(private readonly mochaContext: MochaContext) {}

  // Getters

  async textIsVisible(text: string) {
    await this._init();
    return await this.page.isVisible(`:has-text("${text}")`);
  }

  async todoIsVisible(title: string) {
    await this._init();
    return await this.page.locator('data-test=todo').locator(`:text("${title}")`).isVisible();
  }

  async todoIsCompleted(title: string) {
    await this._init();

    return await this.page
      .locator('data-test=todo')
      .locator(`:has-text("${title}")`)
      .locator('data-test=todo-toggle')
      .isChecked();
  }

  async todoCount() {
    await this._init();

    try {
      const countString = await this.page.innerText('data-testid=todo-count', { timeout: 100 });
      return parseInt(countString.split(' ')[0]);
    } catch (e) {
      return null;
    }
  }

  // Actions

  async shareList() {
    await this._init();
    await this.page.locator('data-testid=share-button').click();
    await sleep(5); // Wait for invitation to be written to clipboard.
    return await this.page.evaluate(() => navigator.clipboard.readText());
  }

  async joinList(invitationCode: string) {
    await this._init();
    await this.page.locator('data-testid=open-button').click();
    await this.page.locator('data-testid=invitation-input').fill(invitationCode);
    await this.page.locator('data-testid=join-button').click();
  }

  async createTodo(title: string) {
    await this._init();
    await this.page.keyboard.type(title);
    await this.page.keyboard.press('Enter');
  }

  async focusNewTodo() {
    await this._init();
    await this.page.locator('data-testid=new-todo').click();
  }

  async toggleTodo(title: string) {
    await this._init();
    await this.page
      ?.locator('data-test=todo')
      .locator(`:has-text("${title}")`)
      .locator('data-test=todo-toggle')
      .click();
  }

  async setTodoEditing(title: string) {
    await this._init();
    await this.page.locator('data-test=todo').locator(`:text("${title}")`).dblclick();
  }

  async submitTodoEdits() {
    await this._init();
    await this.page.keyboard.press('Enter');
  }

  async cancelTodoEditing() {
    await this._init();
    await this.page.keyboard.press('Escape');
  }

  async deleteTodo(title: string) {
    await this._init();
    await this.page
      ?.locator('data-test=todo')
      .locator(`:has-text("${title}")`)
      .locator('data-test=destroy-button')
      .click();
  }

  async toggleAll() {
    await this._init();
    // NOTE: This input behaves weirdly so eval is necessary to toggle it.
    await this.page.$eval('data-testid=toggle-all', (elem: HTMLLabelElement) => elem.click());
  }

  async clearCompleted() {
    await this._init();
    await this.page.locator('data-testid=clear-button').click();
  }

  async filterTodos(filter: FILTER) {
    await this._init();
    await this.page.locator(`data-testid=${filter}-filter`).click();
  }

  @synchronized
  private async _init() {
    if (this.initialized) {
      return;
    }

    const { page } = await setupPage(this.mochaContext, BASE_URL, (page) => page.isVisible(':has-text("todos")'));
    this.page = page;
    this.initialized = true;
  }
}
