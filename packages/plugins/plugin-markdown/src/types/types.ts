//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';

import { type Text } from '@dxos/schema';
import { type EditorViewMode } from '@dxos/ui-editor/types';

import { type Document } from './Markdown';

export type MarkdownExtensionProvider = (props: {
  document?: Document;
  viewMode?: EditorViewMode;
  /** The core branch the editor is currently showing (the branch under review); undefined = main. */
  reviewBranch?: string;
  /**
   * The branch content Text the editor is bound to when editing a branch directly (Branch view);
   * undefined on main or in the diff/suggest overlay. Anchors (e.g. comment cursors) resolve
   * against it so they match the document the editor produced them from.
   */
  branchText?: Text.Text;
  /** True when the active branch is a per-user suggestion branch (comment creation is prohibited). */
  suggestionBranch?: boolean;
  /**
   * Whether comment affordances should render, per the active review policy (see
   * `VersioningCapabilities.ReviewRenderPolicy`). Defaults to `true`; a policy override may hide comments
   * (e.g. a distraction-free reading mode) without changing the default Viewing behaviour.
   */
  showComments?: boolean;
}) => Extension | undefined;

export type MarkdownPluginState = {
  /** Codemirror extensions provided by other plugins. */
  extensionProviders?: MarkdownExtensionProvider[];

  /** View mode per document. */
  viewMode: Record<string, EditorViewMode>;
};
