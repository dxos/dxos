//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginContext } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { type EditorViewMode, createEditorStateStore } from '@dxos/react-ui-editor';

import { MarkdownCapabilities } from './capabilities';
import { MARKDOWN_PLUGIN } from '../meta';
import { type MarkdownPluginState, type MarkdownSettingsProps } from '../types';

export default (context: PluginContext) => {
  const state = new LocalStorageStore<MarkdownPluginState>(MARKDOWN_PLUGIN, { extensionProviders: [], viewMode: {} });
  state.prop({ key: 'viewMode', type: LocalStorageStore.json<{ [key: string]: EditorViewMode }>() });

  // TODO(wittjosiah): Fold into state.
  const editorState = createEditorStateStore(`${MARKDOWN_PLUGIN}/editor`);

  const getViewMode = (id: string) => {
    const defaultViewMode = context
      .getCapability(Capabilities.SettingsStore)
      .getStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN)!.value.defaultViewMode;
    return (id && state.values.viewMode[id]) || defaultViewMode;
  };

  const setViewMode = (id: string, viewMode: EditorViewMode) => (state.values.viewMode[id] = viewMode);

  // Return object with methods.
  return contributes(MarkdownCapabilities.State, { state: state.values, editorState, getViewMode, setViewMode });
};
