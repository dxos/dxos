//
// Copyright 2026 DXOS.org
//

import { documentId } from '@dxos/ui-editor/headless';

/**
 * The editor holding the page's text selection, when it edits the text of one of `uris`: live-bound editors (a
 * feature's fields, a spec's document) take their subject's URI as their document id. A blurred editor keeps its last
 * selection in its state, so only the selection on the page says what the reader has selected now.
 */
export const findFieldEditor = async (uris: readonly string[]) => {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const selection = document.getSelection();
  const node = selection && !selection.isCollapsed ? selection.anchorNode : null;
  const element = node && (node instanceof Element ? node : node.parentElement)?.closest<HTMLElement>('.cm-editor');
  if (!element) {
    return undefined;
  }
  const { EditorView } = await import('@codemirror/view');
  const view = EditorView.findFromDOM(element);
  return view && uris.includes(view.state.facet(documentId)) && !view.state.selection.main.empty ? view : undefined;
};
