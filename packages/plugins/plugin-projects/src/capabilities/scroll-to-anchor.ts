//
// Copyright 2026 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Attention } from '@dxos/react-ui-attention/types';
import { Cursor, isRangeVisible, scrollCommentIntoView } from '@dxos/ui-editor/headless';
import { isNonNullable } from '@dxos/util';

import { ProjectOperation } from '#types';

const SCROLL_OPTIONS = { y: 'start', yMargin: 96 } as const;

/** The editors shown under an attendable, one per text field. */
const getEditorViews = (subject: string): EditorView[] => {
  const root = document.querySelector(`[${Attention.ATTENDABLE_ATTRIBUTE}="${CSS.escape(subject)}"]`);
  return [...(root?.querySelectorAll<HTMLElement>('.cm-editor') ?? [])]
    .map((editor) => EditorView.findFromDOM(editor))
    .filter(isNonNullable);
};

// Each text field is its own editor, so the thread's comment mark, or the text an anchor's cursor resolves in, finds
// the editor that shows it.
const handler: Operation.WithHandler<typeof ProjectOperation.ScrollToAnchor> = ProjectOperation.ScrollToAnchor.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, anchor, thread: threadRef }) {
      if (typeof document === 'undefined') {
        return;
      }

      if (threadRef) {
        const thread = yield* Effect.promise(() => threadRef.load());
        const mark = document.querySelector(`[data-comment-id="${CSS.escape(thread.id)}"]`);
        const editor = mark?.closest<HTMLElement>('.cm-editor');
        const view = editor && EditorView.findFromDOM(editor);
        if (view) {
          scrollCommentIntoView(view, thread.id);
        }
        return;
      }

      // A cursor resolves only in the text it was taken from.
      for (const view of getEditorViews(subject)) {
        const range = Cursor.getRangeFromCursor(view.state, anchor);
        if (range) {
          view.dispatch({
            selection: { anchor: range.from, head: range.to },
            ...(isRangeVisible(view, range) ? {} : { effects: EditorView.scrollIntoView(range.from, SCROLL_OPTIONS) }),
          });
          return;
        }
      }
    }),
  ),
);

export default handler;
