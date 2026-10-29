//
// Copyright 2026 DXOS.org
//

// Word-level text diff with no CodeMirror dependency, for operation handlers that run on a server.
export { type Hunk, cherryPickHunk, computeWordHunks, revertHunk } from './extensions/review/hunks.ts';
