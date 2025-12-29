//
// Copyright 2025 DXOS.org
//

import { Capability, Common } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { type EditorViewMode, createEditorStateStore } from '@dxos/ui-editor';

import { meta } from '../meta';
import { type Markdown, MarkdownCapabilities, type MarkdownPluginState } from '../types';

export default Capability.makeModule((context) => {
  const state = new LocalStorageStore<MarkdownPluginState>(meta.id, { extensionProviders: [], viewMode: {} });
  state.prop({ key: 'viewMode', type: LocalStorageStore.json<{ [key: string]: EditorViewMode }>() });

  // TODO(wittjosiah): Fold into state.
  const editorState = createEditorStateStore(`${meta.id}/editor`);

  const getViewMode = (id: string) => {
    const defaultViewMode = context.getCapability(Common.Capability.SettingsStore).getStore<Markdown.Settings>(meta.id)!
      .value.defaultViewMode;
    return (id && state.values.viewMode[id]) || defaultViewMode;
  };

  const setViewMode = (id: string, viewMode: EditorViewMode) => (state.values.viewMode[id] = viewMode);

  // Return object with methods.
  return Capability.contributes(MarkdownCapabilities.State, {
    state: state.values,
    editorState,
    getViewMode,
    setViewMode,
  });
});
