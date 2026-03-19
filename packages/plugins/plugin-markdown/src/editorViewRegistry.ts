//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

/**
 * Module-level registry for EditorView instances.
 * Components register on mount and unregister on unmount.
 * Used by metadata scrollToCursor to find the right editor at invocation time.
 */
type EditorViewEntry = { view: EditorView; documentId: string };

const views = new Map<string, EditorViewEntry>();

export const editorViewRegistry = {
  register: (attendableId: string, view: EditorView, documentId: string) => {
    views.set(attendableId, { view, documentId });
  },
  unregister: (attendableId: string) => {
    views.delete(attendableId);
  },
  get: (attendableId: string) => views.get(attendableId),
};
