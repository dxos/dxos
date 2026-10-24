//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { Cursor, awarenessProvider } from '@dxos/ui-editor';

/**
 * Presence for an actor whose editor never has focus: every actor shares one page, where only one
 * editor can be focused, and the awareness extension publishes a selection only while focused.
 * This publishes the selection regardless and draws the actor's own caret, steady (no blink, so a
 * frame-by-frame render is the same every run) and in the actor's hue.
 */
export const actorPresence = (hue: string): Extension => [
  ViewPlugin.define((view) => {
    const publish = () => {
      const provider = view.state.facet(awarenessProvider);
      const converter = view.state.facet(Cursor.converter);
      const { anchor, head } = view.state.selection.main;
      provider.update({ anchor: converter.toCursor(anchor), head: converter.toCursor(head, -1) });
    };

    // After the first render pass, so the awareness extension's own initial (empty) publish lands first.
    queueMicrotask(publish);
    return {
      update: (update: ViewUpdate) => {
        if (update.selectionSet || update.docChanged) {
          publish();
        }
      },
    };
  }),
  // Shows the selection and caret as a focused editor does.
  EditorView.editorAttributes.of({ class: 'cm-focused' }),
  EditorView.theme({
    '.cm-cursorLayer': { animation: 'none !important' },
    '.cm-cursor': { borderLeftWidth: '2px', borderLeftColor: `var(--color-${hue}-border)` },
  }),
];
