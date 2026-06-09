//
// Copyright 2026 DXOS.org
//

import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export function lineSpacing(verticalPadding = 2): Extension {
  return EditorView.theme({
    '.cm-line': {
      paddingTop: `${verticalPadding}px`,
      paddingBottom: `${verticalPadding}px`,
    },
  });
}
