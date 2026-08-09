//
// Copyright 2024 DXOS.org
//

import { type Locator, type Page } from '@playwright/test';

// TODO(wittjosiah): If others find this useful, factor out the markdown plugin.
export const Markdown = {
  select: async (locator: Locator, text: string) => {
    // TODO(wittjosiah): If selection happens too fast, the comment button is not enabled.
    //   This likely has to do with refactoring selection to use global selection state,
    //   and comment action being driven via the app graph.
    await locator.page().waitForTimeout(1_000);

    // `fill()` resolves once the DOM write lands, which can precede the editor state holding the
    // text, so the offset has to be waited for. Resolve and dispatch it in ONE evaluate: as two
    // calls, `composer.editorView` could change between them (it names whichever editor mounted
    // last, and a second plank's editor is smaller), and the offset from the first call then pointed
    // past the end of the document the second call dispatched against — `RangeError: Selection
    // points outside of document`. Bounded so a document that never receives the text fails here by
    // name rather than consuming the test's whole budget.
    await locator.evaluate(async (_element, text) => {
      const deadline = performance.now() + 15_000;
      for (;;) {
        const editorView = globalThis.composer?.editorView;
        // `doc.toString()`, not `doc.text.join('\n')`: `text` is only present on a leaf node, so the
        // latter reads undefined once the document is large enough for CodeMirror to build a tree.
        const pos = editorView ? editorView.state.doc.toString().indexOf(text) : -1;
        if (editorView && pos >= 0) {
          editorView.dispatch({ selection: { anchor: pos, head: pos + text.length } });
          return;
        }
        if (performance.now() > deadline) {
          throw new Error(`editor never received the selection text: ${text}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }, text);
  },

  getDocumentTitleInput: (page: Page) => page.getByTestId('composer.documentTitle'),

  /**
   * @deprecated This method is deprecated. Try to use the plank scoped version instead.
   */
  getMarkdownTextbox: (page: Page) => page.getByTestId('composer.markdownRoot').getByRole('textbox'),

  getMarkdownTextboxWithLocator: (locator: Locator) =>
    locator.getByTestId('composer.markdownRoot').getByRole('textbox'),

  waitForMarkdownTextbox: (page: Page) => Markdown.getMarkdownTextbox(page).waitFor(),
  waitForMarkdownTextboxWithLocator: (locator: Locator) => Markdown.getMarkdownTextboxWithLocator(locator).waitFor(),

  getCollaboratorCursors: (page: Page) => page.locator('.cm-collab-selectionInfo'),
  getCollaboratorCursorsWithLocator: (locator: Locator) => locator.locator('.cm-collab-selectionInfo'),

  getMarkdownLineText: (page: Page) =>
    Markdown.getMarkdownTextbox(page)
      // NOTE(thure): There will be two `span`s in the one `.cm-line`, and one of them is the selection caret containing
      // the peer’s name; we instead want the in-flow text content which is an unadorned `span`.
      .locator('.cm-line > span:not([class=cm-collab-selectionCaret])')
      .first()
      .textContent(),
};
