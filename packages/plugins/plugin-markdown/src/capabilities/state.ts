//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { type EditorSelectionState, type FoldState, type EditorViewMode } from '@dxos/react-ui-editor';

import { MarkdownCapabilities } from './capabilities';
import { MARKDOWN_PLUGIN } from '../meta';
import { type MarkdownPluginState, type MarkdownSettingsProps } from '../types';

export default (context: PluginsContext) => {
  const state = new LocalStorageStore<MarkdownPluginState>(MARKDOWN_PLUGIN, {
    extensionProviders: [],
    viewMode: {},
    selectionState: {},
    foldState: {},
  });

  state
    .prop({ key: 'viewMode', type: LocalStorageStore.json<{ [key: string]: EditorViewMode }>() })
    .prop({ key: 'selectionState', type: LocalStorageStore.json<{ [key: string]: EditorSelectionState }>() })
    .prop({ key: 'foldState', type: LocalStorageStore.json<{ [key: string]: FoldState }>() });

  const getViewMode = (id: string) => {
    const defaultViewMode = context
      .requestCapability(Capabilities.SettingsStore)
      .getStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN)!.value.defaultViewMode;
    return (id && state.values.viewMode[id]) || defaultViewMode;
  };

  const setViewMode = (id: string, viewMode: EditorViewMode) => (state.values.viewMode[id] = viewMode);

  return contributes(MarkdownCapabilities.State, {
    state: state.values,
    getViewMode,
    setViewMode,
  });
};
