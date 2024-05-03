//
// Copyright 2024 DXOS.org
//

import { type Page } from '@playwright/test';

// TODO(wittjosiah): If others find this useful, factor out the markdown plugin.
export const Markdown = {
  select: (page: Page, text: string) =>
    page.evaluate((text) => {
      const composer = (window as any).composer;
      const doc = composer.editorView.state.doc.text.join('\n');
      const pos = doc.indexOf(text);
      composer.editorView.dispatch({ selection: { anchor: pos, head: pos + text.length } });
    }, text),

  getDocumentTitleInput: (page: Page) => page.getByTestId('composer.documentTitle'),

  getMarkdownTextbox: (page: Page) => page.getByTestId('composer.markdownRoot').getByRole('textbox'),

  waitForMarkdownTextbox: (page: Page) => Markdown.getMarkdownTextbox(page).waitFor(),

  getCollaboratorCursors: (page: Page) => page.locator('.cm-collab-selectionInfo'),

  getMarkdownLineText: (page: Page) =>
    Markdown.getMarkdownTextbox(page)
      // NOTE(thure): There will be two `span`s in the one `.cm-line`, and one of them is the selection caret containing
      // the peer’s name; we instead want the in-flow text content which is an unadorned `span`.
      .locator('.cm-line > span:not([class=cm-collab-selectionCaret])')
      .first()
      .textContent(),
};
