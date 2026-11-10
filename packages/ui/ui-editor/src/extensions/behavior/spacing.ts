//
// Copyright 2026 DXOS.org
//

import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Adds vertical padding to each `.cm-line`.
 */
export function lineSpacing(verticalPadding = 2): Extension {
  let theme = lineSpacingThemes.get(verticalPadding);
  if (!theme) {
    theme = lineSpacingTheme(verticalPadding);
    lineSpacingThemes.set(verticalPadding, theme);
  }
  return theme;
}

// One per padding: every `EditorView.theme` call mints a new stylesheet, which restyles the whole document.
const lineSpacingThemes = new Map<number, Extension>();

const lineSpacingTheme = (verticalPadding: number): Extension =>
  EditorView.theme({
    '.cm-line': {
      paddingTop: `${verticalPadding}px`,
      paddingBottom: `${verticalPadding}px`,
    },
  });
