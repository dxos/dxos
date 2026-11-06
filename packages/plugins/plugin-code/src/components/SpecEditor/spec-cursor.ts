//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { ViewPlugin } from '@codemirror/view';
import * as Atom from 'effect/reactivity/Atom';

/** Where the cursor is in each session's spec editor. Kept alive since the editor writes it before a view reads it. */
export const specCursor = Atom.family((id: string) => Atom.make<number | undefined>(undefined).pipe(Atom.keepAlive));

/** Reports the editor's cursor offset when the editor opens and whenever the cursor or the text moves. */
export const trackCursor = (onCursor: (offset: number) => void): Extension =>
  ViewPlugin.define((view) => {
    onCursor(view.state.selection.main.head);
    return {
      update: (update) => {
        if (update.selectionSet || update.docChanged) {
          onCursor(update.state.selection.main.head);
        }
      },
    };
  });
