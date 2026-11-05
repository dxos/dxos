//
// Copyright 2026 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { scrollCommentIntoView } from '@dxos/ui-editor/headless';

import { ProjectOperation } from '#types';

// Each text field is its own editor, so the thread's comment mark finds the editor that shows it.
const handler: Operation.WithHandler<typeof ProjectOperation.ScrollToAnchor> = ProjectOperation.ScrollToAnchor.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id }) {
      if (!id || typeof document === 'undefined') {
        return;
      }
      const thread = yield* Effect.promise(() => id.load());
      const mark = document.querySelector(`[data-comment-id="${CSS.escape(thread.id)}"]`);
      const editor = mark?.closest<HTMLElement>('.cm-editor');
      const view = editor && EditorView.findFromDOM(editor);
      if (view) {
        scrollCommentIntoView(view, thread.id);
      }
    }),
  ),
);

export default handler;
