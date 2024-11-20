//
// Copyright 2024 DXOS.org
//

import { type Page } from '@playwright/test';

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
  constructor(private readonly page: Page) {}

  public async deleteColumn(index: number): Promise<void> {
    await this.page.getByTestId(TABLE_SELECTORS.columnSettingsButton).nth(index).click();
    await this.page.getByTestId(TABLE_SELECTORS.columnDelete).click();
  }

  public async deleteRow(index: number): Promise<void> {
    await this.page.getByTestId(TABLE_SELECTORS.rowMenuButton).nth(index).click();
    await this.page.getByTestId(TABLE_SELECTORS.rowDelete).click();
  }

  public async toggleSelectAll(): Promise<void> {
    await this.page.getByTestId(TABLE_SELECTORS.selection).nth(0).click();
  }

  public async sortColumn(index: number, direction: 'ascending' | 'descending'): Promise<void> {
    await this.page.getByTestId(TABLE_SELECTORS.columnSettingsButton).nth(index).click();
    await this.page.getByTestId(TABLE_SELECTORS.columnSort[direction]).click();
  }
}
