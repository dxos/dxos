//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { type EditorViewMode, createEditorStateStore } from '@dxos/ui-editor';

import { meta } from '../../meta';
import { type Markdown, MarkdownCapabilities, type MarkdownPluginState } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    const store = new LocalStorageStore<MarkdownPluginState>(meta.id, { extensionProviders: [], viewMode: {} });
    store.prop({ key: 'viewMode', type: LocalStorageStore.json<{ [key: string]: EditorViewMode }>() });

    // TODO(wittjosiah): Fold into state.
    const editorState = createEditorStateStore(`${meta.id}/editor`);

    const getViewMode = (id: string) => {
      const registry = capabilities.get(Common.Capability.AtomRegistry);
      const settingsAtom = capabilities.get(MarkdownCapabilities.Settings);
      const settings = registry.get(settingsAtom);
      return (id && store.values.viewMode[id]) || settings?.defaultViewMode;
    };

    const setViewMode = (id: string, viewMode: EditorViewMode) => {
      store.update((current) => ({
        ...current,
        viewMode: { ...current.viewMode, [id]: viewMode },
      }));
    };

    // Return object with methods.
    return Capability.contributes(MarkdownCapabilities.State, {
      state: store.values,
      editorState,
      getViewMode,
      setViewMode,
    });
  }),
);
