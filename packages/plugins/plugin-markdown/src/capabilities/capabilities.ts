//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type EditorViewMode, type EditorStateStore } from '@dxos/react-ui-editor';

import { meta } from '../meta';
import { type MarkdownExtensionProvider, type MarkdownPluginState } from '../types';

export namespace MarkdownCapabilities {
  export const State = defineCapability<{
    state: MarkdownPluginState;
    editorState: EditorStateStore;
    getViewMode: (id: string) => EditorViewMode;
    setViewMode: (id: string, viewMode: EditorViewMode) => void;
  }>(`${meta.id}/capability/state`);

  export const Extensions = defineCapability<MarkdownExtensionProvider[]>(`${meta.id}/capability/extensions`);
}
