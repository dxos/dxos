//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework/next';
import { LocalStorageStore } from '@dxos/local-storage';
import { type EditorViewMode, createEditorStateStore } from '@dxos/react-ui-editor';

import { MarkdownCapabilities } from './capabilities';
import { MARKDOWN_PLUGIN } from '../meta';
import { type MarkdownPluginState, type MarkdownSettingsProps } from '../types';

export default (context: PluginsContext) => {
  const state = new LocalStorageStore<MarkdownPluginState>(MARKDOWN_PLUGIN, { extensionProviders: [], viewMode: {} });

  state.prop({ key: 'viewMode', type: LocalStorageStore.json<{ [key: string]: EditorViewMode }>() });

  // TODO(wittjosiah): Fold into state.
  const editorState = createEditorStateStore(`${MARKDOWN_PLUGIN}/editor`);

  const getViewMode = (id: string) => {
    const defaultViewMode = context
      .requestCapability(Capabilities.SettingsStore)
      .getStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN)!.value.defaultViewMode;
    return (id && state.values.viewMode[id]) || defaultViewMode;
  };

  const setViewMode = (id: string, viewMode: EditorViewMode) => (state.values.viewMode[id] = viewMode);

  // TODO(wittjosiah): Defer this until when first editor opens.
  const extensions = context.requestCapabilities(MarkdownCapabilities.Extensions);
  state.values.extensionProviders = extensions;

  return contributes(MarkdownCapabilities.State, { state: state.values, editorState, getViewMode, setViewMode });
};
