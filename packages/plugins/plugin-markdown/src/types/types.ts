//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { type Extension, EditorInputMode, EditorViewMode } from '@dxos/react-ui-editor';

import { DocumentType } from './schema';
import { MARKDOWN_PLUGIN } from '../meta';

const MARKDOWN_ACTION = `${MARKDOWN_PLUGIN}/action`;

export namespace MarkdownAction {
  export class Create extends S.TaggedClass<Create>()(MARKDOWN_ACTION, {
    input: S.Struct({
      name: S.optional(S.String),
      content: S.optional(S.String),
    }),
    output: S.Struct({
      object: DocumentType,
    }),
  }) {}

  export class SetViewMode extends S.TaggedClass<SetViewMode>()(`${MARKDOWN_ACTION}/set-view-mode`, {
    input: S.Struct({
      id: S.String,
      viewMode: EditorViewMode,
    }),
    output: S.Void,
  }) {}
}

export type MarkdownProperties = Record<string, any>;

// TODO(burdon): Async.
export type MarkdownExtensionProvider = (props: { document?: DocumentType }) => Extension | undefined;

export type OnChange = (text: string) => void;

export type MarkdownPluginState = {
  // Codemirror extensions provided by other plugins.
  extensionProviders?: MarkdownExtensionProvider[];

  // TODO(burdon): Extend view mode per document to include scroll position, etc.
  // View mode per document.
  viewMode: Record<string, EditorViewMode>;
};

export const MarkdownSettingsSchema = S.mutable(
  S.Struct({
    defaultViewMode: EditorViewMode,
    editorInputMode: S.optional(EditorInputMode),
    experimental: S.optional(S.Boolean),
    debug: S.optional(S.Boolean),
    toolbar: S.optional(S.Boolean),
    typewriter: S.optional(S.String),
    // TODO(burdon): Per document settings.
    numberedHeadings: S.optional(S.Boolean),
    folding: S.optional(S.Boolean),
  }),
);

export type MarkdownSettingsProps = S.Schema.Type<typeof MarkdownSettingsSchema>;
