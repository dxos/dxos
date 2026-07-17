//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';
import { AttentionCapabilities } from '@dxos/plugin-attention';

import { meta } from '#meta';
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
  };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Persisted state using KVS store.
    const stateAtom = createKvsStore({
      key: `${meta.profile.key}.state`,
      schema: MarkdownCapabilities.StateSchema,
      defaultValue: () => ({ viewMode: {} }),
    });

    // Resolve ViewStateManager contributed by plugin-attention (declared in `requires` so this
    // module activates only once it lands — see MarkdownPlugin.tsx).
    const viewState = yield* AttentionCapabilities.ViewState;
    const editorState = createEditorViewStateStore(viewState);

    const editorViews = createEditorViewRegistry();

    return [
      Capability.provide(MarkdownCapabilities.State, stateAtom),
      Capability.provide(MarkdownCapabilities.EditorState, editorState),
      Capability.provide(MarkdownCapabilities.EditorViews, editorViews),
    ];
  }),
);
