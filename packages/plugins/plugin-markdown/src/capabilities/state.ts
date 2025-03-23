//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { type EditorViewMode, createEditorStateStore, createFoldStateStore } from '@dxos/react-ui-editor';

import { MarkdownCapabilities } from './capabilities';
import { MARKDOWN_PLUGIN } from '../meta';
import { type MarkdownPluginState, type MarkdownSettingsProps } from '../types';

export default (context: PluginsContext) => {
  const state = new LocalStorageStore<MarkdownPluginState>(MARKDOWN_PLUGIN, { extensionProviders: [], viewMode: {} });

  state.prop({ key: 'viewMode', type: LocalStorageStore.json<{ [key: string]: EditorViewMode }>() });

  // TODO(wittjosiah): Fold into state.
  const editorState = createEditorStateStore(`${MARKDOWN_PLUGIN}/editor`);
  const foldState = createFoldStateStore(`${MARKDOWN_PLUGIN}/fold`);

  const getViewMode = (id: string) => {
    const defaultViewMode = context
      .requestCapability(Capabilities.SettingsStore)
      .getStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN)!.value.defaultViewMode;
    return (id && state.values.viewMode[id]) || defaultViewMode;
  };

  const setViewMode = (id: string, viewMode: EditorViewMode) => (state.values.viewMode[id] = viewMode);

  return contributes(MarkdownCapabilities.State, {
    state: state.values,
    editorState,
    foldState,
    getViewMode,
    setViewMode,
  });
};
