//
// Copyright 2023 DXOS.org
//

import { type SchemaProvides } from '@braneframe/plugin-client';
import { type DocumentType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type Extension, type EditorMode } from '@dxos/react-ui-editor';

import { MARKDOWN_PLUGIN } from './meta';

const MARKDOWN_ACTION = `${MARKDOWN_PLUGIN}/action`;

export enum MarkdownAction {
  CREATE = `${MARKDOWN_ACTION}/create`,
  TOGGLE_READONLY = `${MARKDOWN_ACTION}/toggle-readonly`,
}

// TODO(burdon): Remove?
export type MarkdownProperties = Record<string, any>;

export type ExtensionsProvider = (props: { document?: DocumentType }) => Extension[];

export type OnChange = (text: string) => void;

export type MarkdownExtensionProvides = {
  markdown: {
    extensions: ExtensionsProvider;
  };
};

// TODO(wittjosiah): Factor out to graph plugin?
type StackProvides = {
  stack: {
    creators?: Record<string, any>[];
  };
};

// TODO(burdon): Extend view mode per document to include scroll position, etc.
type EditorState = {
  readonly?: boolean;
};

export type MarkdownSettingsProps = {
  state: { [key: string]: EditorState };
  editorMode?: EditorMode;
  experimental?: boolean;
  debug?: boolean;
  toolbar?: boolean;
  typewriter?: string;
};

export type MarkdownPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  SettingsProvides<MarkdownSettingsProps> &
  TranslationsProvides &
  SchemaProvides &
  StackProvides;
