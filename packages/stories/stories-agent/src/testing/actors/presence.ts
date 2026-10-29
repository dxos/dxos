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

    // Silent until the actor first places its caret, so idle actors show no caret parked at the start.
    let placed = false;
    return {
      update: (update: ViewUpdate) => {
        placed ||= update.transactions.some((tr) => tr.isUserEvent('select') || tr.isUserEvent('input'));
        if (placed && (update.selectionSet || update.docChanged)) {
          publish();
        }
      },
    };
  }),
  // Shows the selection and caret as a focused editor does.
  EditorView.editorAttributes.of({ class: 'cm-focused' }),
  // ...but not the caret of an actor yet to place one, which would sit at the document start.
  EditorView.editorAttributes.compute(['selection'], (state) => ({
    class: state.selection.main.head === 0 ? 'actor-idle' : '',
  })),
  EditorView.theme({
    '.cm-cursorLayer': { animation: 'none !important' },
    '&.actor-idle .cm-cursorLayer': { display: 'none' },
    '.cm-cursor': { borderLeftWidth: '2px', borderLeftColor: `var(--color-${hue}-border)` },
  }),
];
