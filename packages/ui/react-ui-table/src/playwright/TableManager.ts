//
// Copyright 2024 DXOS.org
//

import { type Locator, type Page } from '@playwright/test';

import { DxGridManager } from '@dxos/lit-grid/testing';

const TABLE_SELECTORS = {
  columnSettingsButton: 'table-column-settings-button',
  rowMenuButton: 'table-row-menu-button',
  newColumnButton: 'table-new-column-button',
  selection: 'table-selection',
  columnSort: {
    ascending: 'column-sort-ascending',
    descending: 'column-sort-descending',
  },
  columnDelete: 'column-delete',
  rowDelete: 'row-menu-delete',
} as const;

export class TableManager {
  private readonly _grid: DxGridManager;

  constructor(private readonly page: Page) {
    this._grid = new DxGridManager(page);
  }

  public get grid(): DxGridManager {
    return this._grid;
  }

  public async deleteColumn(index: number): Promise<void> {
    await this.page.getByTestId(TABLE_SELECTORS.columnSettingsButton).nth(index).click();
    await this.page.getByTestId(TABLE_SELECTORS.columnDelete).click();
  }

  public async deleteRow(index = 0): Promise<void> {
    await this.page.getByTestId(TABLE_SELECTORS.rowMenuButton).nth(index).click();
    await this.page.getByTestId(TABLE_SELECTORS.rowDelete).click();
  }

  public async toggleSelectAll(): Promise<void> {
    await this.page.getByTestId(TABLE_SELECTORS.selection).nth(0).click();
  }

  public selection(index: number): Locator {
    return this.page.getByTestId(TABLE_SELECTORS.selection).nth(index + 1);
  }

  public async sortColumn(index: number, direction: 'ascending' | 'descending'): Promise<void> {
    await this.page.getByTestId(TABLE_SELECTORS.columnSettingsButton).nth(index).click();
    await this.page.getByTestId(TABLE_SELECTORS.columnSort[direction]).click();
  }

  public async addColumn({ label, format }: { label: string; format: 'number' }): Promise<void> {
    await this.page.getByTestId(TABLE_SELECTORS.newColumnButton).click();
    await this.page.getByRole('combobox').click();
    await this.page.getByLabel(`format ${format}`).click();
    await this.page.getByPlaceholder('Property label.').click();
    await this.page.getByPlaceholder('Property label.').fill(label);
    await this.page.getByRole('button', { name: 'save button' }).click();
  }
}
