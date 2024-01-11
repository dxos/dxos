//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { type Tree } from '@braneframe/types';

import { parseOutline } from '../../utils';

export type PasteExtensionProps = {
  onPaste?: (items: Tree.Item[]) => void;
};

export const pasteExtension = ({ onPaste }: PasteExtensionProps): Extension => {
  return EditorView.domEventHandlers({
    paste: (event, view) => {
      const text = event.clipboardData?.getData('text/plain');
      if (!text) {
        return;
      }

      const outline = parseOutline(text);
      if (!outline || outline.length === 0) {
        return;
      }

      event.preventDefault();
      onPaste?.(outline);
    },
  });
};
