//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

// TODO(wittjosiah): This pulls in UI code into the types entrypoint.
import { type Extension, EditorInputMode, EditorViewMode } from '@dxos/react-ui-editor';

import { DocumentType } from './schema';
import { MARKDOWN_PLUGIN } from '../meta';

const MARKDOWN_ACTION = `${MARKDOWN_PLUGIN}/action`;

export namespace MarkdownAction {
  export class Create extends Schema.TaggedClass<Create>()(MARKDOWN_ACTION, {
    input: Schema.Struct({
      spaceId: Schema.String,
      name: Schema.optional(Schema.String),
      content: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: DocumentType,
    }),
  }) {}

  export class SetViewMode extends Schema.TaggedClass<SetViewMode>()(`${MARKDOWN_ACTION}/set-view-mode`, {
    input: Schema.Struct({
      id: Schema.String,
      viewMode: EditorViewMode,
    }),
    output: Schema.Void,
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

export const MarkdownSettingsSchema = Schema.mutable(
  Schema.Struct({
    defaultViewMode: EditorViewMode,
    editorInputMode: Schema.optional(EditorInputMode),
    experimental: Schema.optional(Schema.Boolean),
    debug: Schema.optional(Schema.Boolean),
    toolbar: Schema.optional(Schema.Boolean),
    typewriter: Schema.optional(Schema.String),
    // TODO(burdon): Per document settings.
    numberedHeadings: Schema.optional(Schema.Boolean),
    folding: Schema.optional(Schema.Boolean),
  }),
);

export type MarkdownSettingsProps = Schema.Schema.Type<typeof MarkdownSettingsSchema>;
