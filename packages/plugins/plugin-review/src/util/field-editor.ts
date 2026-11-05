//
// Copyright 2026 DXOS.org
//

import { Attention } from '@dxos/react-ui-attention/types';
import { commentsState, documentId } from '@dxos/ui-editor/headless';

/** The `.cm-editor` element holding the page's selection, or only a non-empty one when `collapsed` is false. */
const getSelectionEditor = ({ collapsed }: { collapsed: boolean }): HTMLElement | undefined => {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const selection = document.getSelection();
  const node = selection && (collapsed || !selection.isCollapsed) ? selection.anchorNode : null;
  return node
    ? ((node instanceof Element ? node : node.parentElement)?.closest<HTMLElement>('.cm-editor') ?? undefined)
    : undefined;
};

/**
 * The editor holding the page's text selection, when it edits the text of one of `uris`: live-bound editors (a
 * feature's fields, a spec's document) take their subject's URI as their document id. A blurred editor keeps its last
 * selection in its state, so only the selection on the page says what the reader has selected now.
 */
export const findFieldEditor = async (uris: readonly string[]) => {
  const element = getSelectionEditor({ collapsed: false });
  if (!element) {
    return undefined;
  }
  const { EditorView } = await import('@codemirror/view');
  const view = EditorView.findFromDOM(element);
  return view && uris.includes(view.state.facet(documentId)) && !view.state.selection.main.empty ? view : undefined;
};

/**
 * The editor holding the page's caret inside the plank `attendableId` names, when it takes comments: the text of a
 * document, or a field drawn in it, such as a feature embedded in a spec.
 */
export const findCommentEditor = async (attendableId: string) => {
  const element = getSelectionEditor({ collapsed: true });
  if (!element || !Attention.getAttendables(Attention.ATTENDABLE_SELECTOR, element).includes(attendableId)) {
    return undefined;
  }
  const { EditorView } = await import('@codemirror/view');
  const view = EditorView.findFromDOM(element);
  return view?.state.field(commentsState, false) ? view : undefined;
};
