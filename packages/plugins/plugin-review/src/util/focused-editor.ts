//
// Copyright 2026 DXOS.org
//

import { type ReviewCapabilities } from '#types';

/**
 * The comment-taking editor the reader focused last, when its threads anchor to one of `uris`; with `selected`, only
 * while it holds a non-empty selection, which a caret alone does not make a choice of text.
 */
export const getFocusedEditor = (
  state: ReviewCapabilities.CommentState,
  uris: readonly string[],
  { selected = false }: { selected?: boolean } = {},
) => {
  const { focused } = state;
  return focused && uris.includes(focused.subject) && (!selected || !focused.view.state.selection.main.empty)
    ? focused.view
    : undefined;
};
