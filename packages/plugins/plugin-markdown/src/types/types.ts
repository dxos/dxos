//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';

import { type EditorViewMode } from '@dxos/ui-editor/types';

import { type Document } from './Markdown';

export type MarkdownExtensionProvider = (props: {
  document?: Document;
  viewMode?: EditorViewMode;
  /** The core branch the editor is currently showing (the branch under review); undefined = main. */
  reviewBranch?: string;
}) => Extension | undefined;

export type MarkdownPluginState = {
  /** Codemirror extensions provided by other plugins. */
  extensionProviders?: MarkdownExtensionProvider[];

  /** View mode per document. */
  viewMode: Record<string, EditorViewMode>;
};
