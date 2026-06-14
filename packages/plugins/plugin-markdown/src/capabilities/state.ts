//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';
import { createEditorStateStore } from '@dxos/ui-editor';

import { meta } from '#meta';
import { MarkdownCapabilities } from '#types';

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
    // Persisted state using KVS store.
    const stateAtom = createKvsStore({
      key: `${meta.id}.state`,
      schema: MarkdownCapabilities.StateSchema,
      defaultValue: () => ({ viewMode: {} }),
    });

    // TODO(wittjosiah): Fold into state.
    const editorState = createEditorStateStore(`${meta.id}.editor`);

    const editorViews = createEditorViewRegistry();

    return [
      Capability.contributes(MarkdownCapabilities.State, stateAtom),
      Capability.contributes(MarkdownCapabilities.EditorState, editorState),
      Capability.contributes(MarkdownCapabilities.EditorViews, editorViews),
    ];
  }),
);
