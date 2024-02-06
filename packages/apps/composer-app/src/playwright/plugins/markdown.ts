//
// Copyright 2024 DXOS.org
//

import { type Page } from '@playwright/test';

// TODO(wittjosiah): If others find this useful, factor out the markdown plugin.
export const Markdown = {
  getDocumentTitleInput: (page: Page) => page.getByTestId('composer.documentTitle'),
  getMarkdownTextbox: (page: Page) => page.getByTestId('composer.markdownRoot').getByRole('textbox'),
  waitForMarkdownTextbox: (page: Page) => Markdown.getMarkdownTextbox(page).waitFor(),
  getCollaboratorCursors: (page: Page) => page.locator('.cm-collab-selectionInfo'),
  getMarkdownActiveLineText: (page: Page) =>
    Markdown.getMarkdownTextbox(page)
      .locator('.cm-activeLine > span:not([class=cm-collab-selectionCaret])')
      .first()
      .textContent(),
};
