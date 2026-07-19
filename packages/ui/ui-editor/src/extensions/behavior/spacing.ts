//
// Copyright 2026 DXOS.org
//

import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Adds vertical padding to each `.cm-line`.
 */
export function lineSpacing(verticalPadding = 2): Extension {
  return lineSpacingTheme(verticalPadding);
}

const lineSpacingTheme = (verticalPadding: number): Extension =>
  EditorView.theme({
    '.cm-line': {
      paddingTop: `${verticalPadding}px`,
      paddingBottom: `${verticalPadding}px`,
    },
  });
