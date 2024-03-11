//
// Copyright 2024 DXOS.org
//

// Based upon @acheronfail’s implementation, fetched 16 Feb 2024
// https://discuss.codemirror.net/t/cursorscrollmargin-for-v6/7448/5

import { type EditorState, type Extension, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { log } from '@dxos/log';

const annotation = 'cursorLineMargin';
const lineAtPos = (s: EditorState, pos: number) => s.doc.lineAt(pos).number;

type Options = {
  lines?: number;
};

// TODO(burdon): Remove. Buggy and creates scrolling problems. Find better (more general) way to deal with HALO notch.
export const cursorLineMargin = (options: Options = { lines: 3 }): Extension => {
  const { lines } = options;
  if (!lines || lines <= 0) {
    return [];
  }

  return EditorView.updateListener.of(({ transactions, state, selectionSet, startState, view }) => {
    // make sure we don't trigger an infinite loop and ignore our own changes
    if (transactions.length < 1 || transactions.some((tr) => tr.isUserEvent(annotation))) {
      return;
    }

    const s = state;
    const { main } = s.selection;

    // editor rect
    const rect = view.dom.getBoundingClientRect();
    // top and bottom pixel positions of the visible region of the editor
    const viewportTop = rect.top - view.documentTop;
    const viewportBottom = rect.bottom - view.documentTop;

    // line with main selection
    const mainLine = lineAtPos(s, main.head);
    // top most visible line
    const _visTopLine = lineAtPos(s, view.lineBlockAtHeight(viewportTop).from);

    // bottom most visible line
    // NOTE: calculating this is slightly more complex - if the editor is
    // larger than all the lines in it, and the `scrollPastEnd()` extension is
    // enabled, then we need to calculate where the bottom most visible line
    // should be if it extended all the way to the bottom of the editor
    const botLineBlk = view.lineBlockAtHeight(viewportBottom);
    const visBotLineDoc = lineAtPos(s, Math.min(botLineBlk.to, s.doc.length));
    const visBotLine =
      botLineBlk.bottom >= viewportBottom
        ? visBotLineDoc
        : visBotLineDoc + Math.floor((viewportBottom - botLineBlk.bottom) / view.defaultLineHeight);

    // const needsScrollTop = mainLine <= visTopLine + cursorLineMargin;
    const needsScrollTop = false;
    const needsScrollBot = mainLine >= visBotLine - lines;

    // the scroll margins are overlapping
    if (needsScrollTop && needsScrollBot) {
      log.warn('is cursorScrollMargin too large for the editor size?');
      return;
    }

    // no need to scroll, we're in between scroll regions
    if (!needsScrollTop && !needsScrollBot) {
      return;
    }

    // if we're within the margin, but moving the other way, then don't scroll
    if (selectionSet) {
      const { head } = startState.selection.main;
      const oldMainLine = lineAtPos(startState, head);
      if (needsScrollTop && oldMainLine < mainLine) {
        return;
      }
      if (needsScrollBot && oldMainLine > mainLine) {
        return;
      }
    }

    view.dispatch({
      annotations: Transaction.userEvent.of(annotation),
      effects: EditorView.scrollIntoView(s.selection.main.head, {
        y: needsScrollTop ? 'start' : 'end',
        yMargin: view.defaultLineHeight * lines,
      }),
    });
  });
};
