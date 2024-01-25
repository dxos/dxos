//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type ObjectMeta } from '@dxos/react-client/echo';
import { type EditorMode, type Extension } from '@dxos/react-ui-editor';

import { MARKDOWN_PLUGIN } from './meta';

const MARKDOWN_ACTION = `${MARKDOWN_PLUGIN}/action`;

export enum MarkdownAction {
  CREATE = `${MARKDOWN_ACTION}/create`,
  TOGGLE_VIEW = `${MARKDOWN_ACTION}/toggle-view`,
}

// TODO(burdon): Remove?
export type MarkdownProperties = {
  title: string;

  // TODO(burdon): Since this is always very precisely an ECHO object why obfuscate it?
  __meta: ObjectMeta;
  readonly?: boolean;
};

export type ExtensionsProvider = () => Extension[];
export type OnChange = (text: string) => void;

export type MarkdownProvides = {
  markdown: {
    extensions?: ExtensionsProvider;

    // TODO(burdon): Replace with `listener` extension?
    onChange?: OnChange;
  };
};

// TODO(wittjosiah): Factor out to graph plugin?
type StackProvides = {
  stack: {
    creators?: Record<string, any>[];
  };
};

export type MarkdownSettingsProps = {
  viewMode: { [key: string]: boolean };
  editorMode?: EditorMode;
  experimental?: boolean;
  debug?: boolean;
  typewriter?: string;
};

export type MarkdownPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  SettingsProvides<MarkdownSettingsProps> &
  TranslationsProvides &
  StackProvides;
