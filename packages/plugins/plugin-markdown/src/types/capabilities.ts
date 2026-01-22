//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type EditorStateStore, type EditorViewMode } from '@dxos/ui-editor';

import { meta } from '../meta';

import { type MarkdownExtensionProvider, type MarkdownPluginState } from './types';

export namespace MarkdownCapabilities {
  export const State = Capability.make<{
    state: MarkdownPluginState;
    editorState: EditorStateStore;
    getViewMode: (id: string) => EditorViewMode;
    // TODO(burdon): Event object.
    setViewMode: (id: string, viewMode: EditorViewMode) => void;
  }>(`${meta.id}/capability/state`);

  // TODO(burdon): Move to ./types (external API)?
  export const Extensions = Capability.make<MarkdownExtensionProvider[]>(`${meta.id}/capability/extensions`);
}
