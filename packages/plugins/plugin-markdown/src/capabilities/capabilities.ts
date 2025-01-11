//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework/next';
import { type EditorViewMode, type EditorStateStore } from '@dxos/react-ui-editor';

import { MARKDOWN_PLUGIN } from '../meta';
import { type MarkdownExtensionProvider, type MarkdownPluginState } from '../types';

export namespace MarkdownCapabilities {
  export const State = defineCapability<{
    state: MarkdownPluginState;
    editorState: EditorStateStore;
    getViewMode: (id: string) => EditorViewMode;
    setViewMode: (id: string, viewMode: EditorViewMode) => void;
  }>(`${MARKDOWN_PLUGIN}/capabilities/state`);

  export const Extensions = defineCapability<MarkdownExtensionProvider>(`${MARKDOWN_PLUGIN}/capabilities/extensions`);
}
