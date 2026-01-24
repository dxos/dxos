//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type EditorStateStore, type EditorViewMode } from '@dxos/ui-editor';

import { meta } from '../meta';

import type * as Markdown from './Markdown';
import { type MarkdownExtensionProvider } from './types';

/** Schema for persisted markdown state. */
export const MarkdownStateSchema = Schema.mutable(
  Schema.Struct({
    viewMode: Schema.Record({ key: Schema.String, value: Schema.String }),
  }),
);

export type MarkdownState = {
  viewMode: Record<string, EditorViewMode>;
};

export namespace MarkdownCapabilities {
  export const Settings = Capability.make<Atom.Writable<Markdown.Settings>>(`${meta.id}/capability/settings`);

  /** Persisted state atom for view mode per document. */
  export const State = Capability.make<Atom.Writable<MarkdownState>>(`${meta.id}/capability/state`);

  /** Editor state store for cursor positions, scroll state, etc. */
  export const EditorState = Capability.make<EditorStateStore>(`${meta.id}/capability/editor-state`);

  // TODO(burdon): Move to ./types (external API)?
  export const Extensions = Capability.make<MarkdownExtensionProvider[]>(`${meta.id}/capability/extensions`);
}
