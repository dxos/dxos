//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AttentionCapabilities } from '@dxos/plugin-attention';

import { MarkdownCapabilities } from '#types';

import { createEditorViewStateStore } from './editor-view-state';

const createEditorViewRegistry = (): MarkdownCapabilities.EditorViewRegistry => {
  const views = new Map<string, MarkdownCapabilities.EditorViewEntry>();
  return {
    register: (attendableId, view, documentId) => {
      views.set(attendableId, { view, documentId });
    },
    unregister: (attendableId) => {
      views.delete(attendableId);
    },
    get: (attendableId) => views.get(attendableId),
    getByDocumentId: (documentId) => {
      for (const entry of views.values()) {
        if (entry.documentId === documentId) {
          return entry;
        }
      }
      return undefined;
    },
  };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Resolve ViewStateManager contributed by plugin-attention (guaranteed available because this
    // module activates only after AttentionEvents.AttentionReady fires — see MarkdownPlugin.tsx).
    const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
    const editorState = createEditorViewStateStore(viewState);

    const editorViews = createEditorViewRegistry();

    return [
      Capability.contributes(MarkdownCapabilities.EditorState, editorState),
      Capability.contributes(MarkdownCapabilities.EditorViews, editorViews),
    ];
  }),
);
