//
// Copyright 2024 DXOS.org
//

import { type Locator, type Page } from '@playwright/test';

// TODO(wittjosiah): If others find this useful, factor out the markdown plugin.
export const Markdown = {
  select: async (locator: Locator, text: string) => {
    // Resolve the offset and dispatch the selection in ONE evaluate: across two calls
    // `composer.editorView` can name a different editor, invalidating the offset. Polling because
    // `fill()` can resolve before the editor state holds the text; bounded so it fails by name.
    await locator.evaluate(async (_element, text) => {
      const deadline = performance.now() + 15_000;
      for (;;) {
        // `doc.toString()`, not `doc.text.join('\n')`: `text` is only present on a leaf node, so the
        // latter reads undefined once the document is large enough for CodeMirror to build a tree.
        const editorView = globalThis.composer?.editorView;
        const pos = editorView?.state.doc.toString().indexOf(text) ?? -1;
        if (editorView && pos >= 0) {
          editorView.dispatch({ selection: { anchor: pos, head: pos + text.length } });
          return;
        }
        if (performance.now() > deadline) {
          // Two distinct bugs land here — the editor state lagging the DOM write, and
          // `composer.editorView` naming a different editor than the one filled (it points at
          // whichever mounted last) — and only the actual document content tells them apart.
          const doc = editorView?.state.doc.toString();
          const state =
            doc != null ? `editor doc (${doc.length} chars): ${JSON.stringify(doc.slice(0, 80))}` : 'no editorView';
          throw new Error(`editor never received the selection text: ${text} — ${state}`);
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
