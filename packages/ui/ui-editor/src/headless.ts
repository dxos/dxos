//
// Copyright 2026 DXOS.org
//

// A UI-free entrypoint. The root barrel pulls every editor extension, `@dxos/ui` and `@dxos/lit-ui`,
// so operation handlers running under node or bun cannot import from it — these helpers only need
// CodeMirror state. Re-exported from the modules that own them rather than moved, so the editor
// keeps a single definition.
// TODO(wittjosiah): Factor these out into a package that does not carry a UI dependency at all.

export { cherryPickHunk, revertHunk } from './extensions/review/diff.ts';
export { createComment, isRangeVisible, scrollCommentIntoView } from './extensions/review/comments.ts';
export { Cursor } from './util/cursor.ts';
