//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type EditorStateStore, type EditorViewMode } from '@dxos/react-ui-editor';

import { meta } from '../meta';
import { type MarkdownExtensionProvider, type MarkdownPluginState } from '../types';

export namespace MarkdownCapabilities {
  export const State = defineCapability<{
    state: MarkdownPluginState;
    editorState: EditorStateStore;
    getViewMode: (id: string) => EditorViewMode;
    // TODO(burdon): Event object.
    setViewMode: (id: string, viewMode: EditorViewMode) => void;
  }>(`${meta.id}/capability/state`);

  // TODO(burdon): Move to ./types (external API)?
  export const Extensions = defineCapability<MarkdownExtensionProvider[]>(`${meta.id}/capability/extensions`);
}
