//
// Copyright 2024 DXOS.org
//

import { type Page } from '@playwright/test';

export const Table = {
  getNameInput: (page: Page) => page.getByTestId('table.settings.name'),
  getContinueButton: (page: Page) => page.getByTestId('table.settings.continue'),
  getHeaderCell: (page: Page) => page.getByTestId('table.header-cell'),
  getDataRow: (page: Page) => page.getByTestId('table.data-row'),
  createTable: async (page: Page, title: string) => {
    await Table.getNameInput(page).fill(title);
    await Table.getContinueButton(page).click();
  },
  getAddColumnButton: (page: Page) => page.getByTestId('table.new-column'),
  getDeleteRowButton: (page: Page) => page.getByTestId('table.delete-row'),
  getColumnMenu: (page: Page) => page.getByTestId('table.column-menu'),
  getOpenColumnSettings: (page: Page) => page.getByTestId('table.open-column-settings'),
  getColumnSettingsLabel: (page: Page) => page.getByTestId('table.column-settings.label'),
  getColumnSettingsDelete: (page: Page) => page.getByTestId('table.column-settings.delete'),
  getColumnSettingsSave: (page: Page) => page.getByTestId('table.column-settings.save'),
} as const;
