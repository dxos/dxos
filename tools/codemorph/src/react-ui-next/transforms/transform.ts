//
// Copyright 2026 DXOS.org
//

import { type CodeFile } from '../code-file.ts';

/** One codemod: it edits and reports through the `CodeFile`, never writing to disk itself. */
export type Transform = {
  name: string;
  description: string;
  /** Cheap text test; files that fail it are not parsed. */
  applies?: (text: string) => boolean;
  run: (file: CodeFile) => void;
};
