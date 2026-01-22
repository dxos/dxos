//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type EditorStateStore, type EditorViewMode } from '@dxos/ui-editor';

import { meta } from '../meta';

import type * as Markdown from './Markdown';
import { type MarkdownExtensionProvider, type MarkdownPluginState } from './types';

export namespace MarkdownCapabilities {
  export const Settings = Capability.make<Atom.Writable<Markdown.Settings>>(`${meta.id}/capability/settings`);

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
