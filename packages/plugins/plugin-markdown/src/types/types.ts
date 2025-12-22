//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@dxos/react-ui-editor';
import { type EditorViewMode } from '@dxos/ui-editor/types';

import { type Document } from './Markdown';

// TODO(burdon): Remove these from ./types since not part of plugin-markdown API?
// TODO(wittjosiah): MarkdownExtensionProvider is a part of the MarkdownCapabilities api which should be in ./types.

// TODO(burdon): Async?
export type MarkdownExtensionProvider = (props: { document?: Document }) => Extension | undefined;

export type MarkdownPluginState = {
  // Codemirror extensions provided by other plugins.
  extensionProviders?: MarkdownExtensionProvider[];

  // TODO(burdon): Extend view mode per document to include scroll position, etc.
  // View mode per document.
  viewMode: Record<string, EditorViewMode>;
};
